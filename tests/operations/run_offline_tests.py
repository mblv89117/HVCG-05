#!/usr/bin/env python3
"""Offline validation entrypoint for Operations Hub."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    cmd = [sys.executable, str(ROOT / "tests/operations/test_operations_hub.py")]
    print("Running:", " ".join(cmd))
    return subprocess.call(cmd)


if __name__ == "__main__":
    raise SystemExit(main())
