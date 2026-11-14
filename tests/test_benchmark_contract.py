"""Validate runner correctness checks with ASGI; this is not performance evidence."""
import asyncio
import hashlib

import httpx
import pytest

from scripts.benchmark import load, seed


def test_benchmark_workload_and_monitoring_contract(app):
    async def scenario():
        # Use a separate freshly seeded file, because seed expects an empty schema.
        seed(app.state.db.path, 100)
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as c:
            warm = await c.get('/api/reports/sales')
            assert warm.status_code == 200
            assert sum(row['order_count'] for row in warm.json()) == 100
            expected = hashlib.sha256(warm.content).hexdigest()
        result = await load('http://test', 20, 4, expected, transport=transport)
        assert result['errors'] == 0
        assert result['monitored_requests'] == 21
        assert result['cache_hits'] > 0
        assert result['decisions']
    asyncio.run(scenario())


def test_benchmark_rejects_incorrect_data(app):
    async def scenario():
        with pytest.raises(RuntimeError, match='correctness'):
            await load('http://test', 2, 1, 'wrong-hash', transport=httpx.ASGITransport(app=app))
    asyncio.run(scenario())
