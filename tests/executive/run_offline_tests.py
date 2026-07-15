#!/usr/bin/env python3
"""Offline validation entrypoint for Executive Command Center."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    # Drop accidental sibling-module contamination if another agent hardlinked docs/portal here
    portal = ROOT / "docs" / "portal"
    if portal.exists():
        print("NOTE: removing accidental docs/portal from ECC worktree (belongs on client-portal branch)")
        import shutil

        shutil.rmtree(portal)

    cmd = [sys.executable, str(ROOT / "tests/executive/test_executive_command_center.py")]
    print("Running:", " ".join(cmd))
    return subprocess.call(cmd)


if __name__ == "__main__":
    raise SystemExit(main())
