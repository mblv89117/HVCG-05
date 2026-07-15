#!/usr/bin/env python3
"""Opportunity CRM SharePoint migration pack — additive / idempotent contract tests."""
from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MIG_PATH = ROOT / "releases/migrations/20260715_001_opportunity_crm_module.json"
DIFF_PATH = ROOT / "releases/migrations/diffs/opportunity_crm_v1.json"
DESTRUCTIVE_KEYS = {
    "removeLists",
    "removeColumns",
    "deleteLists",
    "deleteColumns",
    "renameColumns",
    "modifyColumns",
    "updateColumns",
    "dropColumns",
    "alterColumns",
    "replaceColumns",
}
OPP_REQUIRED_ADD = {
    "CapitalOpportunityId",
    "CapitalHandoffStatus",
    "NextActionDate",
    "NextActionNotes",
    "CopilotKeywords",
    "CopilotSummary",
    "TeamsThreadUrl",
    "HVCG_IdempotencyKey",
}
CAP_REQUIRED_ADD = {"OpportunityId", "HandoffSource"}
ACT_REQUIRED = {
    "Title",
    "OpportunityId",
    "LeadId",
    "ClientId",
    "ActivityType",
    "ActivityDate",
    "OwnerEmail",
    "Outcome",
    "Notes",
    "PriorStage",
    "NewStage",
    "CopilotKeywords",
    "HVCG_IdempotencyKey",
}
CRM_VIEWS = {
    ("HVCG_Opportunities", "Open Pipeline"),
    ("HVCG_Opportunities", "Commit Forecast"),
    ("HVCG_Opportunities", "Capital Handoffs Ready"),
    ("HVCG_Leads", "Open Leads"),
    ("HVCG_Leads", "Qualified Leads"),
    ("HVCG_OpportunityActivities", "Recent Activities"),
    ("HVCG_CapitalOpportunities", "Active Capital Book"),
}

errors: list[str] = []


def load(p: Path):
    return json.loads(p.read_text(encoding="utf-8"))


def fail(msg: str) -> None:
    errors.append(msg)


def col_names(schema: dict) -> set[str]:
    return {c["internalName"] for c in schema.get("columns", [])}


def main() -> int:
    if not MIG_PATH.exists():
        fail(f"Missing migration pack {MIG_PATH.relative_to(ROOT)}")
    if not DIFF_PATH.exists():
        fail(f"Missing diff {DIFF_PATH.relative_to(ROOT)}")
    if errors:
        _print_and_exit()

    mig = load(MIG_PATH)
    diff = load(DIFF_PATH)

    # Pack contract
    if mig.get("id") != "20260715_001_opportunity_crm_module":
        fail("migration id mismatch")
    if not mig.get("additiveOnly"):
        fail("migration must set additiveOnly=true")
    if mig.get("status") != "Active":
        fail("migration status must be Active")
    if mig.get("fromVersion") != "1.1.0" or mig.get("toVersion") != "1.1.0":
        fail("Opportunity CRM pack is same-semver 1.1.0→1.1.0 (no product bump)")
    steps = mig.get("steps") or []
    if len(steps) != 1:
        fail("migration should have exactly one ApplyListDiff step")
    elif steps[0].get("action") != "ApplyListDiff":
        fail("migration step must be ApplyListDiff")
    elif steps[0].get("diffFile") != "releases/migrations/diffs/opportunity_crm_v1.json":
        fail("migration diffFile path incorrect")

    # Diff additive shape
    bad = DESTRUCTIVE_KEYS & set(diff.keys())
    if bad:
        fail(f"destructive diff keys present: {sorted(bad)}")
    allowed = {"description", "addLists", "addColumns"}
    extra = set(diff.keys()) - allowed
    if extra:
        fail(f"unexpected diff keys: {sorted(extra)}")
    if "addLists" not in diff or "addColumns" not in diff:
        fail("diff must include addLists and addColumns")

    add_lists = diff.get("addLists") or []
    if len(add_lists) != 1:
        fail("diff must add exactly one list (OpportunityActivities)")
    else:
        act = add_lists[0]
        if act.get("title") != "HVCG_OpportunityActivities":
            fail(f"unexpected addLists title: {act.get('title')}")
        if act.get("template") != "genericList":
            fail("OpportunityActivities must use genericList template")
        names = {c["internalName"] for c in act.get("columns", [])}
        missing = ACT_REQUIRED - names
        if missing:
            fail(f"OpportunityActivities diff missing columns: {sorted(missing)}")
        # Lookup targets on new list
        by_name = {c["internalName"]: c for c in act["columns"]}
        for field, target in [
            ("OpportunityId", "HVCG_Opportunities"),
            ("LeadId", "HVCG_Leads"),
            ("ClientId", "HVCG_Clients"),
        ]:
            col = by_name.get(field) or {}
            if col.get("type") != "Lookup":
                fail(f"{field} must be Lookup")
            if col.get("lookupList") != target:
                fail(f"{field} must lookup {target}")

    by_list: dict[str, list] = defaultdict(list)
    for item in diff.get("addColumns") or []:
        if "list" not in item or "column" not in item:
            fail("addColumns entry missing list/column")
            continue
        by_list[item["list"]].append(item["column"])

    if set(by_list.keys()) != {"HVCG_Opportunities", "HVCG_CapitalOpportunities"}:
        fail(f"addColumns lists unexpected: {sorted(by_list.keys())}")

    opp_adds = {c["internalName"] for c in by_list["HVCG_Opportunities"]}
    if opp_adds != OPP_REQUIRED_ADD:
        fail(
            "Opportunities addColumns mismatch "
            f"missing={sorted(OPP_REQUIRED_ADD - opp_adds)} "
            f"extra={sorted(opp_adds - OPP_REQUIRED_ADD)}"
        )
    cap_adds = {c["internalName"] for c in by_list["HVCG_CapitalOpportunities"]}
    if cap_adds != CAP_REQUIRED_ADD:
        fail(
            "Capital addColumns mismatch "
            f"missing={sorted(CAP_REQUIRED_ADD - cap_adds)} "
            f"extra={sorted(cap_adds - CAP_REQUIRED_ADD)}"
        )

    opp_by = {c["internalName"]: c for c in by_list["HVCG_Opportunities"]}
    if opp_by["CapitalOpportunityId"].get("lookupList") != "HVCG_CapitalOpportunities":
        fail("CapitalOpportunityId must lookup HVCG_CapitalOpportunities")
    if opp_by["CapitalHandoffStatus"].get("type") != "Choice":
        fail("CapitalHandoffStatus must be Choice")
    expected_handoff = {
        "NotApplicable",
        "Ready",
        "HandedOff",
        "InFunding",
        "Funded",
        "Declined",
    }
    if set(opp_by["CapitalHandoffStatus"].get("choices") or []) != expected_handoff:
        fail("CapitalHandoffStatus choices mismatch")

    cap_by = {c["internalName"]: c for c in by_list["HVCG_CapitalOpportunities"]}
    if cap_by["OpportunityId"].get("lookupList") != "HVCG_Opportunities":
        fail("Capital.OpportunityId must lookup HVCG_Opportunities")
    if cap_by["HandoffSource"].get("type") != "Choice":
        fail("HandoffSource must be Choice")

    # Diff must stay aligned with committed list schemas (idempotent SoT)
    opp_schema = load(ROOT / "src/sharepoint/lists/HVCG_Opportunities.json")
    cap_schema = load(ROOT / "src/sharepoint/lists/HVCG_CapitalOpportunities.json")
    act_schema = load(ROOT / "src/sharepoint/lists/HVCG_OpportunityActivities.json")
    if not OPP_REQUIRED_ADD.issubset(col_names(opp_schema)):
        fail("HVCG_Opportunities.json missing CRM bridge columns from diff")
    if not CAP_REQUIRED_ADD.issubset(col_names(cap_schema)):
        fail("HVCG_CapitalOpportunities.json missing CRM bridge columns from diff")
    if not ACT_REQUIRED.issubset(col_names(act_schema) | {"Title"}):
        fail("HVCG_OpportunityActivities.json missing columns from diff")

    index = load(ROOT / "src/sharepoint/lists/_index.json")
    indexed = {i["name"] for i in index["lists"]}
    if "HVCG_OpportunityActivities" not in indexed:
        fail("HVCG_OpportunityActivities missing from lists _index.json")

    views = load(ROOT / "src/sharepoint/views/command-center-views.json")["views"]
    titles = {(v["list"], v["title"]) for v in views}
    for need in CRM_VIEWS:
        if need not in titles:
            fail(f"Missing CRM view {need}")

    # Docs produced by migration audit
    for rel in [
        "docs/crm/MIGRATION_PLAN_DEV.md",
        "docs/crm/PHASE1_SAFETY_CHECK.md",
    ]:
        if not (ROOT / rel).exists():
            fail(f"Missing {rel}")

    _print_and_exit()


def _print_and_exit() -> int:
    if errors:
        print("FAIL opportunity CRM migration")
        for e in errors:
            print(" -", e)
        return 1
    print("PASS opportunity CRM migration (additive + aligned)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
