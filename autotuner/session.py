"""Phase 4 observation session and loopback control endpoints."""
import uuid
from urllib.parse import parse_qs

from .proxy import ObservationProxy, json_response


class ControlSession:
    def __init__(self, config, *, transport=None):
        self.config = config
        self.session_id = str(uuid.uuid4())
        self.running = False
        self.proxy = ObservationProxy(config, self.session_id, transport=transport)

    def status(self):
        return dict(schema_version=1, session_id=self.session_id, phase=4,
                    mode=self.config.mode, effective_mode='observe', running=self.running,
                    upstream=self.config.upstream, listen=self.config.listen,
                    forwarding_enabled=True, cache_serving_enabled=False,
                    storage={'persistent': False, 'state': 'not_implemented'},
                    limits=self.config.limits.model_dump(), transport=dict(self.proxy.counters))

    async def __call__(self, scope, receive, send):
        if scope['type'] == 'lifespan':
            while True:
                message = await receive()
                if message['type'] == 'lifespan.startup':
                    self.running = True
                    await send({'type': 'lifespan.startup.complete'})
                elif message['type'] == 'lifespan.shutdown':
                    self.running = False
                    await self.proxy.close()
                    await send({'type': 'lifespan.shutdown.complete'})
                    return
        elif scope['type'] == 'websocket':
            await send({'type': 'websocket.close', 'code': 1003})
        elif scope['type'] == 'http':
            path = scope['path']
            if path == '/_autotuner' or path.startswith('/_autotuner/'):
                if scope['method'] != 'GET':
                    return await json_response(send, 405, {'detail': 'GET required'})
                if path in ('/_autotuner/status', '/_autotuner/health'):
                    return await json_response(send, 200, self.status())
                if path == '/_autotuner/metrics':
                    try:
                        window = int(parse_qs(scope.get('query_string', b'').decode()).get('window', ['60'])[-1])
                        if not 1 <= window <= 3600:
                            raise ValueError()
                    except (ValueError, UnicodeError):
                        return await json_response(send, 400, {'detail': 'Window must be 1-3600 seconds'})
                    result = self.proxy.metrics.snapshot(window)
                    result.update(schema_version=1, session_id=self.session_id,
                                  duration_boundary='proxy handling through downstream completion',
                                  transport=dict(self.proxy.counters),
                                  upstream=self.proxy.upstream_metrics.snapshot(window),
                                  upstream_duration_boundary='active upstream I/O excluding admission and downstream send waits')
                    return await json_response(send, 200, result)
                return await json_response(send, 404, {'detail': 'Unknown local control endpoint'})
            return await self.proxy(scope, receive, send)
