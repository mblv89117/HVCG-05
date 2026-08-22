#!/usr/bin/env python3
"""Inventory HVCG client knowledge and write the ledger. Never prints secrets."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from knowledge.operationalize import run_cycle, write_report  # noqa: E402

DEFAULT_AGENT = "bc-135772fd-035e-4ea0-8858-b47a1921fb7a"
DEFAULT_HUB_SHA = "46dc70ef121b1b38c7036e60069801204ce38f64"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--agent-id", default=DEFAULT_AGENT)
    parser.add_argument("--hub-sha", default=DEFAULT_HUB_SHA)
    parser.add_argument(
        "--out",
        default=str(ROOT / "docs/knowledge/CLIENT_KNOWLEDGE_LEDGER.md"),
    )
    parser.add_argument("--approved-accg-window", action="store_true", default=False)
    args = parser.parse_args()
    result = run_cycle(
        agent_id=args.agent_id,
        hub_sha=args.hub_sha,
        approved_accg_window=args.approved_accg_window,
    )
    write_report(args.out, result)
    print(f"HVS_DATA_ACCESS={result['hvs_data_access']}")
    print(f"CAN_PASS={result['can_pass']}")
    print(f"LIVE_HUB_CODES={result['live_hub_codes']}")
    print(f"LEDGER={args.out}")
    return 0 if result["can_pass"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
