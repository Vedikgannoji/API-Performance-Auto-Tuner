"""Reproduce a clean wheel install in an owned venv, outside the repository import path."""
import argparse
from pathlib import Path
import subprocess
import tempfile
import venv


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('wheel',type=Path)
    args=parser.parse_args();wheel=args.wheel.resolve(strict=True)
    with tempfile.TemporaryDirectory(prefix='autotuner-clean-install-') as temporary:
        root=Path(temporary);venv.create(root/'venv',with_pip=True)
        python=root/'venv'/('Scripts/python.exe' if __import__('os').name=='nt' else 'bin/python')
        def run(*arguments):subprocess.run([str(python),*arguments],cwd=root,check=True,timeout=180)
        run('-m','pip','install',str(wheel))
        run('-I','-m','autotuner','--version')
        run('-I','-m','autotuner','init','--config',str(root/'config.json'),'--json')
        run('-I','-m','autotuner','serve','--config',str(root/'config.json'),'--check','--json')
        run('-I','-m','autotuner','benchmark','--help')
        run('-I','-c',"from importlib.resources import files; import autotuner; print(autotuner.__file__); "
            "assert all(files('autotuner').joinpath(p).is_file() for p in ('product_dashboard.html','product.css','product_ui.js','scenario_presets.json','benchmarking.py','qualification_server.py'))")


if __name__=='__main__':main()
