"""Observation-only HTTP/1.1 data plane. No response cache or retry policy."""
import asyncio
from http.cookiejar import CookieJar, DefaultCookiePolicy
import json
from time import perf_counter

import httpx

from .core import Metrics

HOP_HEADERS = {b'connection', b'keep-alive', b'proxy-connection', b'proxy-authenticate',
               b'proxy-authorization', b'te', b'trailer', b'transfer-encoding', b'upgrade'}
METHODS = {'GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'}


class IncompleteResponse(RuntimeError):
    """Sanitized post-header failure; no second HTTP response can be sent."""


class RejectCookies(DefaultCookiePolicy):
    def set_ok(self, cookie, request):
        return False


def filtered_headers(headers, *, request=False):
    named = {token.strip().lower() for key, value in headers if key.lower() == b'connection'
             for token in value.split(b',')}
    excluded = HOP_HEADERS | named
    if request:
        excluded |= {b'host', b'content-length', b'forwarded', b'x-real-ip'}
    return [(key.lower(), value) for key, value in headers
            if key.lower() not in excluded and not (request and key.lower().startswith(b'x-forwarded-'))]


async def json_response(send, status, data):
    body = json.dumps(data).encode()
    await send({'type': 'http.response.start', 'status': status,
                'headers': [(b'content-type', b'application/json'), (b'cache-control', b'no-store')]})
    await send({'type': 'http.response.body', 'body': body})


class ObservationProxy:
    def __init__(self, config, session_id, *, transport=None):
        self.config, self.session_id = config, session_id
        self.base = httpx.URL(config.upstream)
        self.metrics = Metrics(capacity=config.metrics.raw_capacity)
        self.upstream_metrics = Metrics(capacity=config.metrics.raw_capacity)
        self.slots = asyncio.Semaphore(config.limits.upstream_concurrency)
        self.in_flight = 0
        self.client = httpx.AsyncClient(
            transport=transport, trust_env=False, follow_redirects=False, verify=True,
            cookies=CookieJar(policy=RejectCookies()),
            timeout=httpx.Timeout(config.limits.read_timeout_seconds, connect=config.limits.connect_timeout_seconds),
            limits=httpx.Limits(max_connections=config.limits.upstream_concurrency,
                               max_keepalive_connections=config.limits.upstream_concurrency))
        self.counters = dict(upstream_requests=0, completed_requests=0, failed_requests=0,
                             incomplete_responses=0, cancelled_requests=0, overload_rejections=0, queue_ms=0.0, upstream_ms=0.0)

    def operation(self, path, method):
        parts = path.split('/')
        matches = [op.path for op in self.config.operations if op.method == method
                   and len(op.path.split('/')) == len(parts)
                   and all(a == b or a == '*' for a, b in zip(op.path.split('/'), parts))]
        if matches:
            return min(matches, key=lambda value: value.count('*'))
        matches = [route.match for route in self.config.cache.routes
                   if len(route.match.split('/')) == len(parts)
                   and all(a == b or a == '*' for a, b in zip(route.match.split('/'), parts))]
        return min(matches, key=lambda value: value.count('*')) if matches else '/{unmatched}'

    async def close(self):
        await self.client.aclose()

    async def __call__(self, scope, receive, send):
        start, response_started, completed, status = perf_counter(), False, False, 500
        upstream_complete = False
        upstream_start = None
        upstream_elapsed = 0.0
        admitted = acquired = False
        response = None
        method = scope['method']
        stage = 'request'
        queued = None
        async def downstream(message):
            await asyncio.wait_for(send(message), self.config.limits.read_timeout_seconds)
        async def reject(code, detail):
            nonlocal completed, status, response_started
            status = code
            response_started = True
            await json_response(downstream, code, {'detail': detail})
            completed = True
        try:
            headers = scope.get('headers', [])
            if sum(len(k) + len(v) + 4 for k, v in headers) > self.config.limits.header_bytes:
                return await reject(431, 'Request headers exceed configured limit')
            values = {}
            for key, value in headers:
                values.setdefault(key.lower(), []).append(value)
            if scope.get('http_version', '1.1') not in ('1.0', '1.1'):
                return await reject(505, 'Only HTTP/1.x downstream requests are supported')
            if method not in METHODS or b'upgrade' in values or any(b'text/event-stream' in v.lower() for v in values.get(b'accept', [])):
                return await reject(501, 'Method, upgrade or event-stream traffic is unsupported')
            hops = b','.join(values.get(b'x-autotuner-proxy', [])).split(b',')
            if self.session_id.encode() in [hop.strip() for hop in hops]:
                return await reject(508, 'Proxy forwarding loop detected')
            lengths = values.get(b'content-length', [])
            transfer = values.get(b'transfer-encoding', [])
            if (len(lengths) > 1 or len(values.get(b'host', [])) > 1 or
                (lengths and transfer) or (lengths and (not lengths[0].isdigit() or len(lengths[0]) > 20)) or
                (transfer and transfer != [b'chunked'])):
                return await reject(400, 'Ambiguous or invalid request framing')
            if lengths and int(lengths[0]) > self.config.limits.request_body_bytes:
                return await reject(413, 'Request body exceeds configured limit')
            if self.in_flight >= self.config.limits.upstream_concurrency + self.config.limits.queue_capacity:
                self.counters['overload_rejections'] += 1
                return await reject(503, 'Proxy admission capacity exceeded')
            self.in_flight += 1
            admitted = True
            queued = perf_counter()
            stage = 'queue'
            await asyncio.wait_for(self.slots.acquire(), self.config.limits.connect_timeout_seconds)
            acquired = True
            self.counters['queue_ms'] += (perf_counter() - queued) * 1000
            stage = 'request'
            body_deadline = perf_counter() + self.config.limits.read_timeout_seconds
            body = bytearray()
            while True:
                message = await asyncio.wait_for(receive(), max(0, body_deadline - perf_counter()))
                if message['type'] == 'http.disconnect':
                    self.counters['cancelled_requests'] += 1
                    return
                body.extend(message.get('body', b''))
                if len(body) > self.config.limits.request_body_bytes:
                    return await reject(413, 'Request body exceeds configured limit')
                if not message.get('more_body'):
                    break
            if lengths and int(lengths[0]) != len(body):
                return await reject(400, 'Request length does not match body')
            raw_path = scope.get('raw_path', scope['path'].encode()).split(b'?', 1)[0]
            if not raw_path.startswith(b'/'):
                return await reject(400, 'An origin-form request path is required')
            try:
                target = self.base.copy_with(raw_path=raw_path + (b'?' + scope['query_string'] if scope.get('query_string') else b''))
            except httpx.InvalidURL:
                return await reject(400, 'Invalid request target')
            outgoing = filtered_headers(headers, request=True)
            outgoing = [(k, v) for k, v in outgoing if k != b'x-autotuner-proxy']
            outgoing.append((b'x-autotuner-proxy', b', '.join([h.strip() for h in hops if h.strip()] + [self.session_id.encode()])))
            request = httpx.Request(method, target, headers=outgoing, content=bytes(body))
            # Direct Request construction avoids merging shared client cookies.
            request.extensions['timeout'] = self.client.timeout.as_dict()
            upstream_start = perf_counter()
            stage = 'upstream'
            self.counters['upstream_requests'] += 1
            response_deadline = perf_counter() + self.config.limits.response_timeout_seconds
            response = await asyncio.wait_for(self.client.send(request, stream=True), max(0, response_deadline - perf_counter()))
            upstream_elapsed += perf_counter() - upstream_start
            upstream_start = None
            raw_headers = response.headers.raw
            if sum(len(k) + len(v) + 4 for k, v in raw_headers) > self.config.limits.header_bytes:
                return await reject(502, 'Upstream headers exceed configured limit')
            upstream_lengths = response.headers.get_list('content-length')
            if len(upstream_lengths) > 1 or (upstream_lengths and 'transfer-encoding' in response.headers):
                return await reject(502, 'Ambiguous upstream response framing')
            if response.status_code == 101 or response.headers.get('content-type', '').lower().split(';')[0].strip() == 'text/event-stream':
                return await reject(502, 'Upstream returned an unsupported upgrade or event stream')
            status = response.status_code
            response_started = True
            await downstream({'type': 'http.response.start', 'status': status,
                        'headers': filtered_headers(raw_headers)})
            if method != 'HEAD' and status not in (204, 304):
                chunks = response.aiter_raw(chunk_size=65536).__aiter__()
                while True:
                    upstream_start = perf_counter()
                    try:
                        chunk = await asyncio.wait_for(anext(chunks), max(0, response_deadline - perf_counter()))
                    except StopAsyncIteration:
                        break
                    finally:
                        upstream_elapsed += perf_counter() - upstream_start
                        upstream_start = None
                    await downstream({'type': 'http.response.body', 'body': chunk, 'more_body': True})
            upstream_complete = True
            await downstream({'type': 'http.response.body', 'body': b'', 'more_body': False})
            completed = True
        except (httpx.TimeoutException, asyncio.TimeoutError):
            self.counters['failed_requests'] += 1
            if response_started:
                raise IncompleteResponse('Response interrupted after headers') from None
            if stage == 'queue':
                self.counters['overload_rejections'] += 1
                self.counters['queue_ms'] += (perf_counter() - queued) * 1000
            await reject(408 if stage == 'request' else 503 if stage == 'queue' else 504,
                         'Request body timed out' if stage == 'request' else
                         'Proxy admission timed out' if stage == 'queue' else 'Upstream timed out')
        except (httpx.HTTPError, OSError):
            self.counters['failed_requests'] += 1
            if response_started:
                raise IncompleteResponse('Response interrupted after headers') from None
            await reject(502, 'Upstream request failed')
        except asyncio.CancelledError:
            self.counters['cancelled_requests'] += 1
            raise
        finally:
            if upstream_start is not None:
                upstream_elapsed += perf_counter() - upstream_start
            self.counters['upstream_ms'] += upstream_elapsed * 1000
            if acquired:
                self.slots.release()
            if admitted:
                self.in_flight -= 1
            if response is not None:
                await response.aclose()
            if upstream_complete:
                self.upstream_metrics.record(method, self.operation(scope['path'], method), response.status_code,
                                             upstream_elapsed * 1000, 'BYPASS')
            if response_started and not completed:
                self.counters['incomplete_responses'] += 1
            if completed:
                self.counters['completed_requests'] += 1
                self.metrics.record(method, self.operation(scope['path'], method), status,
                                    (perf_counter() - start) * 1000, 'BYPASS')
