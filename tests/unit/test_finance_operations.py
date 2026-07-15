#!/usr/bin/env python3
"""Finance Operations — offline packaging smoke (docs, exclusive stubs, app specs)."""
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
        if rel == "PROJECT_STATUS.md" and "IN PROGRESS" not in text and "READY FOR INTEGRATION" not in text:
            fail("PROJECT_STATUS.md missing IN PROGRESS or READY FOR INTEGRATION")

    # Existing indexed Finance SoR lists (must remain; do not require exclusive duplicates)
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

    # Exclusive net-new stubs (HVCG_Finance* only) — file present, not yet required in index
    exclusive_lists = [
        "HVCG_FinanceARSnapshots",
        "HVCG_FinanceCashReceipts",
        "HVCG_FinancePaymentPlans",
    ]
    for name in exclusive_lists:
        path = lists_dir / f"{name}.json"
        if not path.exists():
            fail(f"Missing exclusive stub {path}")
            continue
        data = load(path)
        if data.get("title") != name:
            fail(f"{name}: title mismatch")
        if not data.get("moduleExclusive"):
            fail(f"{name}: expected moduleExclusive true")
        cols = {c["internalName"] for c in data.get("columns", [])}
        if "Title" not in cols:
            fail(f"{name}: missing Title")
        # Must NOT already be in locked index (we do not edit index; stubs pending parent append)
        if name in indexed:
            fail(f"{name} unexpectedly already in _index.json — verify no accidental shared edit")
        for c in data.get("columns", []):
            if c["type"] == "Lookup":
                target = c.get("lookupList")
                if target and target not in indexed and target not in exclusive_lists:
                    fail(f"{name}.{c['internalName']}: bad lookup {target}")

    # No forbidden duplicate Finance* wrappers for existing SoR lists
    for banned in (
        "HVCG_FinanceInvoices",
        "HVCG_FinanceBudgets",
        "HVCG_FinanceCollections",
        "HVCG_FinanceExpenses",
    ):
        if (lists_dir / f"{banned}.json").exists():
            fail(f"Do not duplicate SoR as {banned}.json — use existing HVCG_* lists")

    # Power Apps exclusive package
    app_files = [
        "src/power-apps/finance/README.md",
        "src/power-apps/finance/BUILD.md",
        "src/power-apps/finance/scrFinance.md",
        "src/power-apps/finance/scrFinanceInvoiceDetail.md",
        "src/power-apps/finance/scrFinanceCollections.md",
        "src/power-apps/finance/scrFinanceBudgetsExpenses.md",
        "src/power-apps/finance/FinanceNamedFormulas.fx",
    ]
    for rel in app_files:
        path = ROOT / rel
        if not path.exists():
            fail(f"Missing {rel}")
        elif path.stat().st_size < 80:
            fail(f"Too small: {rel}")

    fx = (ROOT / "src/power-apps/finance/FinanceNamedFormulas.fx").read_text(encoding="utf-8")
    for token in (
        "nfFinanceOutstandingAR",
        "nfFinancePastDueCount",
        "nfFinancePendingExpenseCount",
        "nfFinanceCashCollectedMTD",
    ):
        if token not in fx:
            fail(f"FinanceNamedFormulas.fx missing {token}")

    handoff = (ROOT / "docs/finance/HANDOFF.md").read_text(encoding="utf-8")
    for needle in ("HVCG_FinanceARSnapshots", "src/power-apps/finance", "exclusive"):
        if needle not in handoff:
            fail(f"HANDOFF.md missing mention of {needle}")

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
    print(
        f" docs={len(required_docs)} finance_lists={len(finance_lists)} "
        f"exclusive_stubs={len(exclusive_lists)} app_files={len(app_files)}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
