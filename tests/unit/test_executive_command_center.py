#!/usr/bin/env python3
"""Unit suite entry — mirrors tests/executive/test_executive_command_center.py (Option A)."""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

TARGET = Path(__file__).resolve().parents[1] / "executive" / "test_executive_command_center.py"


def main() -> int:
    spec = importlib.util.spec_from_file_location("test_executive_command_center", TARGET)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return int(mod.main())


if __name__ == "__main__":
    sys.exit(main())
