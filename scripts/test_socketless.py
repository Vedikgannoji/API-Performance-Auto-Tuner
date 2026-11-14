"""Run in-process tests when a Windows sandbox blocks asyncio's TCP self-pipe.

This runner replaces only event-loop wakeups with a short polling interval.
It cannot run network tests or provide real HTTP benchmark evidence.
Normal development and CI should use `python -m pytest` instead.
"""
import asyncio
from pathlib import Path
import selectors
import sys
import time

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


class PollSelector(selectors.SelectSelector):
    def select(self, timeout=None):
        timeout = min(timeout if timeout is not None else .01, .01)
        if not self.get_map():
            time.sleep(timeout)
            return []
        return super().select(timeout)


class SocketlessLoop(asyncio.SelectorEventLoop):
    def __init__(self):
        super().__init__(PollSelector())

    def _make_self_pipe(self):
        pass

    def _close_self_pipe(self):
        pass

    def _write_to_self(self):
        pass


class Policy(asyncio.DefaultEventLoopPolicy):
    def new_event_loop(self):
        return SocketlessLoop()


if __name__ == '__main__':
    asyncio.set_event_loop_policy(Policy())
    raise SystemExit(pytest.main(sys.argv[1:]))
