#!/usr/bin/env python3
"""Revenue OS train suite: catalogs, pricing, proposals, documents, compatibility, journey."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def suite() -> unittest.TestSuite:
    loader = unittest.defaultTestLoader
    return loader.discover(str(ROOT), pattern="test_*.py")


if __name__ == "__main__":
    result = unittest.TextTestRunner(verbosity=2).run(suite())
    sys.exit(0 if result.wasSuccessful() else 1)
