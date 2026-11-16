"""Capture passive evidence or run an explicitly approved read workload."""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import sys
from time import monotonic, sleep
import uuid

from ._version import __version__
from .core.metrics import percentile
from .scenarios import Scenario, path_check
from .storage import config_identity, source_digest


def plan(config, route, requests, delay_ms, timeout, environment, window):
    if not 1 <= window <= 3600:
        raise ValueError('Window must be 1-3600 seconds')
    if not route:
        return None
    # Only simple concrete paths. Credentials, query strings, and request bodies are outside this workload.
    if (len(route) > 1024 or not re.fullmatch(r'/(?:[A-Za-z0-9_.~-]+(?:/[A-Za-z0-9_.~-]+)*)?', route)
            or set(route.split('/')) & {'.', '..'}):
        raise ValueError('Use a concrete GET path without query, fragment or dot segments')
    path_check(route)
    parts = route.split('/')
    candidates = [operation.path for operation in config.operations if operation.method == 'GET'
                  and len(operation.path.split('/')) == len(parts)
                  and all(a == b or a == '*' for a, b in zip(operation.path.split('/'), parts))]
    if not candidates:
        raise ValueError('Select a path matching a configured GET operation')
    if config.mode not in ('observe', 'off') or environment not in ('local', 'staging'):
        raise ValueError('Active baseline requires observe/off mode and --environment local or staging')
    if not (1 <= requests <= 20 and 100 <= delay_ms <= 1000 and 1 <= timeout <= 5
            and requests * (timeout * 1000 + delay_ms) <= 90000):
        raise ValueError('Workload exceeds limits: 1-20 requests, 100-1000 ms delay, 1-5 s timeout, 90 s total')
    return dict(method='GET', operation=min(candidates, key=lambda value: value.count('*')), path=route,
                requests=requests, delay_ms=delay_ms, timeout_seconds=timeout, concurrency=1,
                environment=environment, expected_status=200)


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def snapshots(query, session, identity, window):
    metrics = query('GET', f'/_autotuner/metrics?window={window}')
    insights = query('GET', f'/_autotuner/insights?window={window}')
    status = query('GET', '/_autotuner/status')
    if (any(item.get('session_id') != session for item in (metrics, insights, status))
            or insights.get('config_digest') != identity or status.get('config_digest') != identity):
        raise ValueError('Proxy session or configuration changed during capture')
    return dict(metrics=metrics, insights=insights, resources={key: status.get(key) for key in
                ('runtime', 'cache', 'storage', 'limits', 'uptime_seconds')})


def run_workload(query, workload, session, identifier):
    scenario = Scenario.model_validate(dict(name='Read baseline', delay_ms=workload['delay_ms'], steps=[dict(
        name='Read', method='GET', path=workload['path'], repeat=workload['requests'],
        timeout_seconds=workload['timeout_seconds'], expect_status=workload['expected_status'])]))
    prefix = '/_autotuner/scenarios/'
    deadline = monotonic() + 100

    def poll(report):
        while report.get('state') == 'running' and monotonic() < deadline:
            sleep(.25)
            report = query('GET', prefix + 'jobs/' + identifier)
        return report

    def stop():
        return query('POST', prefix + 'stop', {'run_id': identifier})

    try:
        report = poll(query('POST', prefix + 'run', dict(scenario=scenario.model_dump(exclude_unset=True),
                            allow_writes=False, run_id=identifier, expected_session_id=session)))
        if report.get('state') == 'running':
            report = stop()
    except KeyboardInterrupt:
        report = poll(stop())
    if report.get('run_id') != identifier or report.get('state') not in (
            'completed', 'failed', 'stopped', 'interrupted', 'runtime_limit', 'running'):
        raise ValueError('Unexpected workload report')
    rows = [{key: row.get(key) for key in ('status', 'duration_ms', 'passed', 'reason')}
            for row in report['results']]
    durations = [row['duration_ms'] for row in rows if row['duration_ms'] is not None]
    elapsed = report['finished_at'] - report['started_at'] if report['finished_at'] is not None else None
    return dict(state='stop_requested' if report['state'] == 'running' else report['state'], samples=rows,
                completed=len(rows), errors=sum(not row['passed'] for row in rows),
                mean_ms=sum(durations) / len(durations) if durations else None,
                p50_ms=percentile(durations, .5), p95_ms=percentile(durations, .95), p99_ms=percentile(durations, .99),
                elapsed_seconds=elapsed, requests_per_second=len(rows) / elapsed if elapsed and elapsed > 0 else None)


def capture(args, config, query):
    identity, redacted = config_identity(config)
    workload = plan(config, args.get, args.requests, args.delay_ms, args.timeout, args.environment, args.window)
    if args.apply is not None and workload is None:
        raise ValueError('--apply requires an active GET workload')
    if workload:
        token = digest([identity, workload, args.window, str(Path(args.output).resolve())])
        if args.apply is None:
            return dict(schema_version=1, written=False, proxy=config.listen, upstream=config.upstream,
                        workload=workload, review_token=token), 0
        if args.apply != token:
            raise ValueError('Baseline preview changed. Review it again before applying')
    status = query('GET', '/_autotuner/status')
    session = status.get('session_id')
    if not status.get('running') or not session or status.get('config_digest') != identity:
        raise ValueError('Start the proxy with the same selected configuration before capturing a baseline')
    identifier = str(uuid.uuid4())
    record = dict(schema_version=1, baseline_id=identifier, session_id=session, config_digest=identity,
                  config=redacted, tool_version=__version__, proxy_version=status.get('tool_version'),
                  client_source_sha256=source_digest(), captured_at=datetime.now(timezone.utc).isoformat(),
                  kind='active' if workload else 'passive', window_seconds=args.window, state='incomplete',
                  sampling_note='Proxy metrics and insights are separate rolling snapshots and may include other traffic. '
                                'Workload timings measure only the explicit scenario at the proxy boundary.')
    with Path(args.output).open('x', encoding='utf-8') as file:
        if workload:
            record['workload'] = {key: value for key, value in workload.items() if key != 'path'}
            record['workload_digest'] = digest(workload)
        file.write(json.dumps(record, indent=2) + '\n')
        file.flush()
        try:
            if workload:
                print(f'Baseline run {identifier}. Stop with Ctrl+C.', file=sys.stderr)
                record['active_result'] = run_workload(query, workload, session, identifier)
            record.update(snapshots(query, session, identity, args.window))
            record['state'] = record.get('active_result', {}).get('state', 'completed')
        finally:
            file.seek(0)
            file.write(json.dumps(record, indent=2) + '\n')
            file.truncate()
    return dict(schema_version=1, written=True, output=args.output, baseline_id=identifier,
                state=record['state'], findings=len(record['insights']['findings'])), (0 if record['state'] == 'completed' else 3)
