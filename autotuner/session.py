"""Phase 3 local control session. HTTP forwarding is deliberately absent."""
import json
import uuid


class ControlSession:
    def __init__(self, config):
        self.config = config
        self.session_id = str(uuid.uuid4())
        self.running = False

    def status(self):
        return dict(schema_version=1, session_id=self.session_id, phase=3,
                    mode=self.config.mode, running=self.running,
                    upstream=self.config.upstream, listen=self.config.listen,
                    forwarding_enabled=False, cache_serving_enabled=False,
                    storage={'persistent': False, 'state': 'not_implemented'},
                    limits=self.config.limits.model_dump())

    async def __call__(self, scope, receive, send):
        if scope['type'] == 'lifespan':
            while True:
                message = await receive()
                if message['type'] == 'lifespan.startup':
                    self.running = True
                    await send({'type': 'lifespan.startup.complete'})
                elif message['type'] == 'lifespan.shutdown':
                    self.running = False
                    await send({'type': 'lifespan.shutdown.complete'})
                    return
        elif scope['type'] == 'http':
            path = scope['path']
            if path in ('/_autotuner/status', '/_autotuner/health'):
                status, body = (200, self.status()) if scope['method'] == 'GET' else (405, {'detail': 'GET required'})
            else:
                status, body = 501, {'detail': 'Reverse proxy forwarding is Phase 4; this is a control-only session'}
            await send({'type': 'http.response.start', 'status': status,
                        'headers': [(b'content-type', b'application/json'), (b'cache-control', b'no-store')]})
            await send({'type': 'http.response.body', 'body': json.dumps(body).encode()})
