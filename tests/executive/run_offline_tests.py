#!/usr/bin/env python3
"""Run Executive Command Center offline validation suite."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    script = ROOT / "tests/executive/test_executive_command_center.py"
    print(f"=== ECC offline runner ===\n{script}")
    proc = subprocess.run([sys.executable, str(script)], cwd=str(ROOT))
    return proc.returncode


if __name__ == "__main__":
    sys.exit(main())
