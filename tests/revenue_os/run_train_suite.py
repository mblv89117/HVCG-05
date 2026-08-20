#!/usr/bin/env python3
"""Revenue OS train automated suite.

Runs existing BA conversion/commercial tests plus new catalog/pricing/proposal
/idempotency/compatibility/synthetic journey tests.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def run(label: str, args: list[str]) -> int:
    print(f"\n=== {label} ===", flush=True)
    proc = subprocess.run([sys.executable, *args], cwd=ROOT)
    print(f"=== {label} exit {proc.returncode} ===", flush=True)
    return proc.returncode


def main() -> int:
    commands = [
        ("BA commercial sprint 2", ["-m", "unittest", "tests.unit.business.test_commercial_sprint2"]),
        ("BA revenue sprint 3", ["-m", "unittest", "tests.unit.business.test_revenue_sprint3"]),
        ("BA revenue sprint 4", ["-m", "unittest", "tests.unit.business.test_revenue_sprint4_integration"]),
        ("Integration SoT harness", [str(ROOT / "tests/integrations/run_integration_contracts.py")]),
        ("Revenue OS suite", [str(ROOT / "tests/revenue_os/run_revenue_os_suite.py")]),
    ]
    failed = []
    for label, args in commands:
        if run(label, args) != 0:
            failed.append(label)
    if failed:
        print("FAILED:", ", ".join(failed))
        return 1
    print("TRAIN SUITE OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
