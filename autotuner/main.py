import asyncio
import os
import sqlite3
from pathlib import Path
from time import perf_counter

from fastapi import FastAPI, HTTPException, Query, Request, Response
from fastapi import Path as PathParam
from fastapi.responses import FileResponse, JSONResponse

from .cache import AdaptiveCache, CacheConfig
from .database import Database
from .metrics import Metrics
from .schemas import CacheMode, OrderCreate, OrderStatus, ProductCreate, ProductPatch, UserCreate, UserPatch


class Monitoring:
    """Pure ASGI wrapper includes exception handling, validation, and cache hits."""
    def __init__(self, app, metrics):
        self.app, self.metrics = app, metrics

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http' or not scope['path'].startswith('/api/'):
            return await self.app(scope, receive, send)
        start, status = perf_counter(), 500
        async def capture(message):
            nonlocal status
            if message['type'] == 'http.response.start':
                status = message['status']
            await send(message)
        try:
            await self.app(scope, receive, capture)
        finally:
            route = scope.get('route')
            self.metrics.record(scope['method'], route.path if route else '/api/{unmatched}',
                                status, (perf_counter() - start) * 1000,
                                scope.get('state', {}).get('cache', 'NONE'))


def create_app(db_path=None, cache_config=None):
    app = FastAPI(title='Self-Optimizing API Performance Monitor', version='2.0.0')
    db = Database(db_path or os.getenv('AUTOTUNER_DB', 'autotuner.sqlite3'))
    cache, metrics = AdaptiveCache(cache_config), Metrics()
    app.state.db, app.state.cache, app.state.metrics = db, cache, metrics
    app.add_middleware(Monitoring, metrics=metrics)

    @app.exception_handler(sqlite3.IntegrityError)
    async def integrity_error(request, exc):
        return JSONResponse(status_code=409, content={'detail': 'Duplicate value or invalid reference'})

    @app.exception_handler(sqlite3.OperationalError)
    async def database_error(request, exc):
        return JSONResponse(status_code=503, content={'detail': 'Database temporarily unavailable'})

    def found(value):
        if value is None:
            raise HTTPException(404, 'Resource not found')
        return value

    async def read(request, response, loader):
        # Only explicit public business reads call this helper. Authorization-bearing
        # requests bypass shared caching even if authentication is added later.
        if request.headers.get('authorization') or request.headers.get('cookie'):
            request.state.cache = 'BYPASS'
            response.headers['X-Cache'] = 'BYPASS'
            response.headers['X-Cache-Reason'] = 'request-credentials'
            response.headers['Cache-Control'] = 'no-store'
            return await cache.bypass(loader)
        # Preserve duplicate-value order: FastAPI uses the last scalar value.
        key = (request.url.path, tuple(sorted(request.query_params.multi_items(), key=lambda pair: pair[0])))
        value, outcome = await cache.read(request.scope['route'].path, key, loader)
        request.state.cache = outcome
        response.headers['X-Cache'] = outcome
        response.headers['X-Cache-Reason'] = ('cache-hit' if outcome == 'HIT' else
                                            'cache-disabled' if outcome == 'BYPASS' else 'origin-observation')
        response.headers['Cache-Control'] = 'no-store'
        return value

    async def mutate(loader, resources):
        # Invalidate at both boundaries; generations prevent stale in-flight fills.
        async with cache.lock:
            cache.invalidate(resources)
            work = asyncio.create_task(asyncio.to_thread(loader))
            try:
                value = found(await asyncio.shield(work))
            except asyncio.CancelledError:
                # Cancelling an await cannot stop a SQLite worker thread. Keep
                # coordination until it finishes and invalidate committed data.
                try:
                    await work
                finally:
                    cache.invalidate(resources)
                raise
            cache.invalidate(resources)
            return value

    @app.get('/health')
    async def health():
        return {'status': 'ok'}

    @app.get('/', include_in_schema=False)
    async def dashboard():
        return FileResponse(Path(__file__).with_name('dashboard.html'), headers={'Cache-Control': 'no-store'})

    @app.get('/assets/workflow.js', include_in_schema=False)
    async def workflow_asset():
        return FileResponse(Path(__file__).with_name('workflow.js'), media_type='application/javascript',
                            headers={'Cache-Control': 'no-store'})

    @app.get('/api/users')
    async def users(request: Request, response: Response, limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0, le=2147483647)):
        return await read(request, response, lambda: db.list('users', limit, offset))

    @app.post('/api/users', status_code=201)
    async def create_user(body: UserCreate):
        return await mutate(lambda: db.create('users', body.model_dump()), ('users',))

    @app.get('/api/users/{item_id}')
    async def user(request: Request, response: Response, item_id: int = PathParam(ge=1, le=9223372036854775807)):
        return await read(request, response, lambda: found(db.get('users', item_id)))

    @app.patch('/api/users/{item_id}')
    async def update_user(body: UserPatch, item_id: int = PathParam(ge=1, le=9223372036854775807)):
        return await mutate(lambda: db.update('users', item_id, body.model_dump(exclude_unset=True)), ('users',))

    @app.get('/api/products')
    async def products(request: Request, response: Response, limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0, le=2147483647)):
        return await read(request, response, lambda: db.list('products', limit, offset))

    @app.post('/api/products', status_code=201)
    async def create_product(body: ProductCreate):
        return await mutate(lambda: db.create('products', body.model_dump()), ('products', 'reports'))

    @app.get('/api/products/{item_id}')
    async def product(request: Request, response: Response, item_id: int = PathParam(ge=1, le=9223372036854775807)):
        return await read(request, response, lambda: found(db.get('products', item_id)))

    @app.patch('/api/products/{item_id}')
    async def update_product(body: ProductPatch, item_id: int = PathParam(ge=1, le=9223372036854775807)):
        return await mutate(lambda: db.update('products', item_id, body.model_dump(exclude_unset=True)), ('products', 'reports'))

    @app.get('/api/orders')
    async def orders(request: Request, response: Response, limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0, le=2147483647)):
        return await read(request, response, lambda: db.list('orders', limit, offset))

    @app.post('/api/orders', status_code=201)
    async def create_order(body: OrderCreate):
        return await mutate(lambda: db.create('orders', body.model_dump()), ('orders', 'reports'))

    @app.get('/api/orders/{item_id}')
    async def order(request: Request, response: Response, item_id: int = PathParam(ge=1, le=9223372036854775807)):
        return await read(request, response, lambda: found(db.get('orders', item_id)))

    @app.patch('/api/orders/{item_id}/status')
    async def update_order(body: OrderStatus, item_id: int = PathParam(ge=1, le=9223372036854775807)):
        def transition():
            current = found(db.get('orders', item_id))
            transitions = {'pending': {'paid', 'cancelled'}, 'paid': {'shipped', 'cancelled'}, 'shipped': set(), 'cancelled': set()}
            if body.status != current['status'] and body.status not in transitions[current['status']]:
                raise HTTPException(409, 'Invalid order status transition')
            return db.update('orders', item_id, body.model_dump())
        return await mutate(transition, ('orders', 'reports'))

    @app.get('/api/reports/sales')
    async def sales(request: Request, response: Response):
        return await read(request, response, db.report)

    @app.get('/metrics')
    async def summary(window: int = Query(60, ge=1, le=3600)):
        return metrics.snapshot(window)

    @app.get('/metrics/comparison')
    async def comparison():
        return metrics.comparison()

    @app.get('/analysis')
    async def analysis():
        bottlenecks = []
        for route, stats in metrics.snapshot()['routes'].items():
            if stats['count'] >= 5:
                if stats['p95_ms'] >= 50:
                    bottlenecks.append(dict(route=route, kind='high_latency', p95_ms=stats['p95_ms'],
                                            action='Inspect origin cost and cache reuse; compare client load results'))
                if stats['server_error_rate'] >= .05:
                    bottlenecks.append(dict(route=route, kind='server_errors',
                                            action='Inspect database availability and origin failures before caching'))
        return {'regressions': metrics.regressions(), 'bottlenecks': bottlenecks, 'cache': cache.status()}

    @app.put('/cache/mode')
    async def mode(body: CacheMode):
        cache.mode = body.mode
        cache.invalidate()
        return cache.status()

    @app.delete('/cache')
    async def clear():
        cache.invalidate()
        return {'cleared': True}

    return app
