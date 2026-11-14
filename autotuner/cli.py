"""Installable observation-proxy command interface."""
import argparse
import json
import logging
import os
from pathlib import Path
import socket
import sys
from urllib.parse import urlsplit
import urllib.request

from pydantic import ValidationError

from .product_config import ProductConfig
from .session import ControlSession

VERSION = '2.0.0'


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args):
        return None


def parser():
    root = argparse.ArgumentParser(prog='autotuner', description='Local API observation proxy. Shared response caching is not enabled.')
    root.add_argument('--version', action='version', version='autotuner ' + VERSION)
    commands = root.add_subparsers(dest='command', required=True)
    init = commands.add_parser('init', help='Create an observe-mode JSON configuration')
    init.add_argument('--config', default=None)
    init.add_argument('--force', action='store_true')
    init.add_argument('--upstream', default=None)
    init.add_argument('--json', action='store_true')
    config = commands.add_parser('config', help='Validate resolved configuration')
    checks = config.add_subparsers(dest='config_command', required=True)
    check = checks.add_parser('check')
    serve = commands.add_parser('serve', help='Run the loopback observation proxy')
    serve.add_argument('--check', action='store_true', help='Validate without opening a listener')
    serve.add_argument('--shutdown-timeout', type=int, default=5)
    doctor = commands.add_parser('doctor', help='Offline checks; optional explicit TCP connectivity check')
    doctor.add_argument('--connect', action='store_true')
    status = commands.add_parser('status', help='Query an already running local control session')
    endpoints = commands.add_parser('endpoints', help='Query observed route metrics')
    endpoints.add_argument('--window', type=int, default=60)
    for sub in (check, serve, doctor, status, endpoints):
        sub.add_argument('--config', default=None)
        sub.add_argument('--upstream', default=None)
        sub.add_argument('--listen', default=None)
        sub.add_argument('--mode', choices=['observe', 'recommend', 'adaptive'], default=None)
        sub.add_argument('--json', action='store_true')
    return root


def config_path(args):
    return Path(args.config or os.environ.get('AUTOTUNER_CONFIG', 'autotuner.json'))


def resolved_config(args):
    data = json.loads(config_path(args).read_text(encoding='utf-8'))
    if not isinstance(data, dict):
        raise ValueError('Configuration must be a JSON object')
    for name in ('upstream', 'listen', 'mode'):
        value = getattr(args, name, None)
        if value is None:
            value = os.environ.get('AUTOTUNER_' + name.upper())
        if value is not None:
            data[name] = value
    return ProductConfig.model_validate(data)


def emit(value, as_json):
    print(json.dumps(value, indent=2) if as_json else '\n'.join(f'{key}: {item}' for key, item in value.items()))


def main(argv=None):
    args = parser().parse_args(argv)
    try:
        if args.command == 'init':
            config = ProductConfig(upstream=args.upstream or os.environ.get('AUTOTUNER_UPSTREAM', 'http://127.0.0.1:3000'))
            path = config_path(args)
            with path.open('w' if args.force else 'x', encoding='utf-8') as file:
                file.write(config.model_dump_json(indent=2) + '\n')
            emit({'schema_version': 1, 'created': str(path), 'mode': 'observe'}, args.json)
            return 0
        config = resolved_config(args)
        if args.command == 'config':
            emit({'schema_version': 1, 'valid': True, 'config': config.model_dump()}, args.json)
        elif args.command == 'doctor':
            result = {'schema_version': 1, 'config_valid': True, 'python': sys.version.split()[0],
                      'forwarding_available': True, 'upstream_check': 'not_requested'}
            if args.connect:
                upstream = urlsplit(config.upstream)
                with socket.create_connection((upstream.hostname, upstream.port or (443 if upstream.scheme == 'https' else 80)), timeout=2):
                    pass
                result['upstream_check'] = 'tcp_reachable_tls_not_tested'
            emit(result, args.json)
        elif args.command in ('status', 'endpoints'):
            opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
            endpoint = '/_autotuner/status'
            if args.command == 'endpoints':
                if not 1 <= args.window <= 3600:
                    raise ValueError('Invalid metrics window')
                endpoint = '/_autotuner/metrics?window=' + str(args.window)
            with opener.open('http://' + config.listen + endpoint, timeout=2) as response:
                try:
                    data = json.load(response)
                except ValueError as exc:
                    raise OSError('Invalid local session response') from exc
            if (not isinstance(data, dict) or data.get('schema_version') != 1 or
                not isinstance(data.get('session_id'), str) or
                (args.command == 'status' and data.get('phase') not in (3, 4)) or
                (args.command == 'endpoints' and not isinstance(data.get('routes'), dict))):
                raise OSError('Listener did not return a compatible control session')
            emit(data, args.json)
        else:
            if args.shutdown_timeout < 1:
                raise ValueError('Shutdown timeout must be positive')
            if args.check:
                emit({'schema_version': 1, 'valid': True, 'forwarding_enabled': False, 'forwarding_available': True, 'config': config.model_dump()}, args.json)
                return 0
            if args.json:
                raise ValueError('Use serve --check --json or status --json; foreground serve emits diagnostics on stderr')
            import uvicorn
            host, port = config.listen.rsplit(':', 1)
            print('Observation proxy enabled; shared cache serving is disabled until its dedicated phase.', file=sys.stderr)
            logging.basicConfig(level=logging.INFO, stream=sys.stderr)
            logging.getLogger('httpx').setLevel(logging.WARNING)
            logging.getLogger('httpcore').setLevel(logging.WARNING)
            uvicorn.run(ControlSession(config), host=host.strip('[]'), port=int(port),
                        log_config=None, access_log=False, timeout_graceful_shutdown=args.shutdown_timeout)
        return 0
    except ValidationError as exc:
        locations = ['.'.join(map(str, item['loc'])) or 'configuration' for item in exc.errors(include_input=False)]
        print('Invalid configuration fields: ' + ', '.join(locations), file=sys.stderr)
        return 2
    except (ValueError, FileExistsError, FileNotFoundError, UnicodeError):
        print('Invalid configuration or path; check the file, arguments and overwrite option.', file=sys.stderr)
        return 2
    except KeyboardInterrupt:
        return 0
    except OSError:
        print('Operation failed: check permissions, upstream connectivity or the running local session.', file=sys.stderr)
        return 1


def entrypoint():
    raise SystemExit(main())
