"""Small, line-oriented terminal workspace; all actions use explicit argv lists."""
from dataclasses import dataclass
import json
import os
from pathlib import Path
import sys

from ._version import __version__

MAX_INPUT=4096
PLANNED=('Guided baseline and optimization sessions',
         'Live terminal monitoring and matched comparisons')


class InputTooLong(Exception):
    """Abort instead of interpreting the rest of an oversized line as commands."""


@dataclass(frozen=True)
class Action:
    key: str
    label: str
    command: tuple[str,...]
    effect: str
    prompt: str=''


GROUPS={
    '1':('Setup and configuration',(
        Action('1','Validate selected configuration',('config','check'),'read_local'),
        Action('2','Create observe configuration',('init',),'write_config','create'),
        Action('3','Run proxy in this terminal',('serve',),'listen','serve'),
        Action('4','Offline diagnostics',('doctor',),'read_local'),
        Action('5','Check upstream TCP connectivity',('doctor','--connect'),'connect_upstream'),
        Action('6','Discover project API operations',('discover',),'read_local','discover'),
    )),
    '2':('Session and insights',(
        Action('1','Current session status',('status',),'query_proxy'),
        Action('2','Endpoint metrics',('endpoints',),'query_proxy'),
        Action('3','Performance insights',('insights',),'query_proxy'),
    )),
    '3':('Cache and policies',(
        Action('1','Explain a route policy',('cache','explain'),'query_proxy','route'),
        Action('2','Clear stored responses',('cache','clear'),'clear_cache','clear'),
    )),
    '4':('Reports and history',(
        Action('1','List stored sessions',('sessions',),'read_local'),
        Action('2','Show stored telemetry JSON',('report','--format','json'),'read_local'),
        Action('3','Export stored telemetry JSON',('report','--format','json'),'write_export','export'),
        Action('4','Export live telemetry JSON',('report','--live','--format','json'),'query_proxy_and_export','export'),
    )),
}


def display(value):
    """Keep project-controlled text from inserting terminal control sequences."""
    return ''.join(c if c.isprintable() else ' ' for c in str(value))[:1024]


def selected_path(value,root):
    if not value or len(value)>MAX_INPUT or any(not c.isprintable() for c in value):
        raise ValueError('Invalid path')
    path=Path(value).expanduser()
    return (path if path.is_absolute() else root/path).resolve()


def manifest(project,config):
    return dict(schema_version=1,tool_version=__version__,interactive=False,
        project=str(project),config=str(config),read_only_on_entry=True,
        groups=[dict(key=key,label=label,actions=[dict(key=a.key,label=a.label,command=list(a.command),effect=a.effect)
            for a in actions]) for key,(label,actions) in GROUPS.items()],planned_features=list(PLANNED))


class Workspace:
    def __init__(self,project,config,invoke,stdin,stdout):
        self.project,self.config,self.invoke=project,config,invoke
        self.stdin,self.stdout=stdin,stdout

    def say(self,text=''):
        print(text,file=self.stdout)

    def ask(self,prompt):
        self.stdout.write(prompt);self.stdout.flush()
        line=self.stdin.readline(MAX_INPUT+1)
        if not line:raise EOFError()
        if len(line)>MAX_INPUT:raise InputTooLong()
        return line.strip()

    def confirm(self,prompt):
        return self.ask(prompt+' [y/N]: ').lower() in ('y','yes')

    def help(self):
        self.say('Select a number or letter, then press Enter. b returns; q exits; Ctrl+C exits.')
        self.say('Entry is offline. Session actions query a proxy already running with the selected config.')
        self.say('Create config, then run autotuner serve --config YOUR_CONFIG in another terminal for session actions.')
        self.say('The proxy routes traffic to your upstream; installing Autotuner alone does not connect your API.')
        self.say('Fast origins can correctly remain uncached. Cache rules and invalidation need explicit configuration.')
        self.say('Planned: '+ '; '.join(PLANNED)+'.')

    def execute(self,action):
        if action.prompt == 'discover':
            code = self.invoke(['--no-input', 'discover', '--project', str(self.project)])
            if code == 0:
                self.say('To preview an observe config for these operations, run autotuner setup --help.')
            else:
                self.say(f'Action did not complete (exit {code}). Check the diagnostic above.')
            return
        args=[*action.command,'--config',str(self.config)]
        if action.prompt=='create':
            upstream=self.ask('Upstream URL [http://127.0.0.1:3000] (b cancels): ')
            if upstream.lower()=='b':return
            args+=['--upstream='+ (upstream or 'http://127.0.0.1:3000')]
            if not self.confirm('Create an observe configuration at '+display(self.config)+' without overwriting?'):return
        elif action.prompt=='serve':
            if not self.confirm('Run the proxy here using the selected config? Ctrl+C stops it and returns'):return
        elif action.prompt=='clear':
            if not self.confirm('Remove stored cache responses? Configured rules are retained'):return
        elif action.prompt=='route':
            route=self.ask('Route path, for example /api/products (b cancels): ')
            if route.lower()=='b':return
            if (not route.startswith('/') or len(route)>1024 or any(c in route for c in ('?','#'))
                    or any(not c.isprintable() for c in route)):
                self.say('Enter a route path without a query, fragment or control characters.');return
            args.append(route)
        elif action.prompt=='export':
            target=self.ask('Export file path (b cancels): ')
            if not target or target.lower()=='b':return
            args+=['--output',str(selected_path(target,self.project))]
        code=self.invoke(['--no-input',*args])
        self.say('Action completed.' if code==0 else f'Action did not complete (exit {code}). Check the diagnostic above.')

    def loop(self):
        group=None
        self.say('Autotuner '+__version__+' | Terminal workspace')
        self.say('No project scanning, API traffic or configuration changes occur on entry.')
        while True:
            self.say('\nProject: '+display(self.project)+'\nConfig: '+display(self.config))
            if group is None:
                for key,(label,_) in GROUPS.items():self.say(key+'. '+label)
                self.say('p. Select project   c. Select config   h. Quick start   q. Quit')
            else:
                label,actions=GROUPS[group];self.say(label)
                for action in actions:self.say(action.key+'. '+action.label)
                self.say('b. Back   h. Help   q. Quit')
            choice=self.ask('Select: ').lower()
            if choice in ('q','quit','exit'):return 0
            if choice in ('h','?'):self.help();continue
            if choice in ('b','0'):
                if group is None:return 0
                group=None;continue
            if group is None:
                if choice in GROUPS:group=choice;continue
                if choice in ('p','c'):
                    value=self.ask('Project directory (b cancels): ' if choice=='p' else 'Config path (b cancels): ')
                    if not value or value.lower()=='b':continue
                    try:
                        target=selected_path(value,self.project)
                        if choice=='p':
                            if not target.is_dir():raise ValueError()
                            self.project=target;self.config=target/'autotuner.json'
                        else:self.config=target
                    except (OSError,ValueError):self.say('Cannot select that path. Check the directory or file name.')
                    continue
            else:
                action=next((a for a in GROUPS[group][1] if a.key==choice),None)
                if action is not None:
                    try:self.execute(action)
                    except (OSError,ValueError):self.say('Cannot use that input or path. No automatic retry was made.')
                    continue
            self.say('Choose a listed key. Use h for help.')


def run(*,invoke,project='.',config=None,as_json=False,no_input=False,stdin=None,stdout=None,stderr=None):
    stdin=sys.stdin if stdin is None else stdin
    stdout=sys.stdout if stdout is None else stdout
    stderr=sys.stderr if stderr is None else stderr
    try:
        root=selected_path(str(project),Path.cwd())
        if not root.is_dir():raise ValueError()
        path=selected_path(str(config or os.environ.get('AUTOTUNER_CONFIG') or 'autotuner.json'),root)
        if as_json:
            print(json.dumps(manifest(root,path),indent=2),file=stdout);return 0
        if no_input or not (stdin.isatty() and stdout.isatty()):
            print('Interactive menu requires terminal input and output. Use autotuner menu --json or autotuner --help.',file=stderr)
            return 2
        return Workspace(root,path,invoke,stdin,stdout).loop()
    except EOFError:
        print('\nTerminal workspace closed.',file=stdout);return 0
    except KeyboardInterrupt:
        print('\nTerminal workspace cancelled.',file=stderr);return 130
    except (OSError,ValueError,InputTooLong):
        print('Cannot open the selected project or terminal input. Check the path and input length.',file=stderr);return 2
