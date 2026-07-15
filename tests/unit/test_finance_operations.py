#!/usr/bin/env python3
"""Finance Operations — offline packaging smoke (exclusive docs + schema presence)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
errors: list[str] = []


def fail(msg: str) -> None:
    errors.append(msg)


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    required_docs = [
        "docs/finance/ARCHITECTURE.md",
        "docs/finance/REQUIREMENTS.md",
        "docs/finance/DATA_MAP.md",
        "docs/finance/SHARED_FILE_RECOMMENDATIONS.md",
        "docs/finance/HANDOFF.md",
        "docs/finance/OWNER_ACTION_GUIDE.md",
    ]
    for rel in required_docs:
        path = ROOT / rel
        if not path.exists():
            fail(f"Missing {rel}")
        elif path.stat().st_size < 200:
            fail(f"Too small / empty: {rel}")

    for rel in ("PROJECT_STATUS.md", "NEXT_SESSION.md"):
        text = (ROOT / rel).read_text(encoding="utf-8")
        if "Finance" not in text and "finance" not in text.lower():
            fail(f"{rel} does not mention Finance")
        if rel == "PROJECT_STATUS.md" and "IN PROGRESS" not in text:
            fail("PROJECT_STATUS.md missing IN PROGRESS status")

    finance_lists = [
        "HVCG_Invoices",
        "HVCG_FinancialMilestones",
        "HVCG_CollectionsActivities",
        "HVCG_Budgets",
        "HVCG_ExpenseApprovals",
        "HVCG_RevenueForecastLines",
    ]
    lists_dir = ROOT / "src/sharepoint/lists"
    index = load(lists_dir / "_index.json")
    indexed = {item["name"] for item in index["lists"]}

    for name in finance_lists:
        if name not in indexed:
            fail(f"Finance list not in _index.json: {name}")
        schema_path = lists_dir / f"{name}.json"
        if not schema_path.exists():
            fail(f"Missing schema {schema_path}")
            continue
        data = load(schema_path)
        cols = {c["internalName"] for c in data.get("columns", [])}
        if "Title" not in cols:
            fail(f"{name}: missing Title column")

    # Must not require exclusive list stubs this sprint
    exclusive_stub = lists_dir / "HVCG_FinanceExclusiveStub.json"
    if exclusive_stub.exists():
        fail("Unexpected exclusive stub present; remove or document deliberately")

    locked = [
        "src/power-automate/flows/_index.json",
        "src/sharepoint/lists/_index.json",
        "src/power-apps/formulas/NamedFormulas.fx",
    ]
    for rel in locked:
        if not (ROOT / rel).exists():
            fail(f"Expected shared file present (read-only check): {rel}")

    if errors:
        print("FAIL finance operations package checks")
        for e in errors:
            print(" -", e)
        return 1

    print("PASS finance operations package checks")
    print(f" docs={len(required_docs)} finance_lists={len(finance_lists)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
