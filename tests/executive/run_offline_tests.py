#!/usr/bin/env python3
"""Offline runner for Executive Command Center module tests."""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent


def main() -> int:
    spec = importlib.util.spec_from_file_location(
        "test_executive_command_center", HERE / "test_executive_command_center.py"
    )
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return int(mod.main())


if __name__ == "__main__":
    sys.exit(main())
