#!/usr/bin/env python3
"""Mirror runner for Finance Operations offline package checks."""
from __future__ import annotations

import runpy
import sys
from pathlib import Path

TARGET = Path(__file__).resolve().parents[1] / "unit" / "test_finance_operations.py"


def main() -> int:
    if not TARGET.exists():
        print(f"FAIL missing {TARGET}")
        return 1
    sys.argv = [str(TARGET)]
    try:
        runpy.run_path(str(TARGET), run_name="__main__")
    except SystemExit as e:
        code = e.code
        return int(code) if isinstance(code, int) else (1 if code else 0)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
