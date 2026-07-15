#!/usr/bin/env python3
"""Opportunity CRM module — schema bridge, flows, views, docs, sample data."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
errors: list[str] = []


def load(p: Path):
    return json.loads(p.read_text(encoding="utf-8"))


def fail(msg: str) -> None:
    errors.append(msg)


def col_names(schema: dict) -> set[str]:
    return {c["internalName"] for c in schema["columns"]}


def main() -> int:
    index = load(ROOT / "src/sharepoint/lists/_index.json")
    indexed = {i["name"] for i in index["lists"]}
    if "HVCG_OpportunityActivities" not in indexed:
        fail("OpportunityActivities missing from _index.json")
    if index.get("version") != "2.3":
        fail("_index.json version should be 2.3 for Opportunity CRM")

    opp = load(ROOT / "src/sharepoint/lists/HVCG_Opportunities.json")
    onames = col_names(opp)
    for req in [
        "Stage",
        "WinLossStatus",
        "CapitalOpportunityId",
        "CapitalHandoffStatus",
        "NextActionDate",
        "CopilotSummary",
        "CopilotKeywords",
        "TeamsThreadUrl",
        "HVCG_IdempotencyKey",
    ]:
        if req not in onames:
            fail(f"Opportunities missing {req}")

    cap = load(ROOT / "src/sharepoint/lists/HVCG_CapitalOpportunities.json")
    cnames = col_names(cap)
    for req in ["OpportunityId", "HandoffSource", "FundingStatus"]:
        if req not in cnames:
            fail(f"CapitalOpportunities missing {req}")

    act = load(ROOT / "src/sharepoint/lists/HVCG_OpportunityActivities.json")
    anames = col_names(act)
    for req in ["ActivityType", "ActivityDate", "OpportunityId", "LeadId"]:
        if req not in anames:
            fail(f"OpportunityActivities missing {req}")

    # Bridge lookup targets
    cap_lookup = next(c for c in opp["columns"] if c["internalName"] == "CapitalOpportunityId")
    if cap_lookup.get("lookupList") != "HVCG_CapitalOpportunities":
        fail("CapitalOpportunityId must lookup HVCG_CapitalOpportunities")
    opp_lookup = next(c for c in cap["columns"] if c["internalName"] == "OpportunityId")
    if opp_lookup.get("lookupList") != "HVCG_Opportunities":
        fail("OpportunityId on capital book must lookup HVCG_Opportunities")

    views = load(ROOT / "src/sharepoint/views/command-center-views.json")["views"]
    titles = {(v["list"], v["title"]) for v in views}
    for need in [
        ("HVCG_Leads", "Open Leads"),
        ("HVCG_Leads", "Qualified Leads"),
        ("HVCG_Opportunities", "Open Pipeline"),
        ("HVCG_Opportunities", "Commit Forecast"),
        ("HVCG_Opportunities", "Capital Handoffs Ready"),
        ("HVCG_OpportunityActivities", "Recent Activities"),
    ]:
        if need not in titles:
            fail(f"Missing view {need}")

    # View fields exist on target list schemas
    schemas = {
        p.stem: load(p)
        for p in (ROOT / "src/sharepoint/lists").glob("HVCG_*.json")
    }
    for v in views:
        if v["list"] not in ("HVCG_Opportunities", "HVCG_Leads", "HVCG_OpportunityActivities", "HVCG_CapitalOpportunities"):
            continue
        fields = col_names(schemas[v["list"]]) | {"Title"}
        for f in v["fields"]:
            if f not in fields:
                fail(f"View {v['list']}/{v['title']} unknown field {f}")

    flow_index = load(ROOT / "src/power-automate/flows/_index.json")
    flow_names = {f["flowName"] for f in flow_index["flows"]}
    for fn in [
        "HVCG_LeadQualifiedCreateOpportunity",
        "HVCG_OpportunityWonCloseout",
        "HVCG_OpportunityStageChangedNotify",
        "HVCG_CapitalFundingStatusNotify",
    ]:
        if fn not in flow_names:
            fail(f"Flow missing from index: {fn}")
        fp = ROOT / f"src/power-automate/flows/{fn}.json"
        if not fp.exists():
            fail(f"Flow file missing: {fp}")
        meta = load(fp)
        if "Teams" not in meta.get("connections", []):
            fail(f"{fn} should declare Teams connection")
        if "teamsIntegration" not in meta and fn.startswith("HVCG_"):
            # all four have teamsIntegration
            if "teamsIntegration" not in meta:
                fail(f"{fn} missing teamsIntegration block")

    def_index = load(ROOT / "src/power-automate/definitions/_index.json")
    if def_index.get("count") != len(def_index.get("flows", [])):
        fail("definitions/_index.json count mismatch")
    if def_index["count"] < 15:
        fail("Expected >=15 flow definitions after Opportunity CRM")

    for rel in [
        "docs/crm/OPPORTUNITY_MANAGEMENT.md",
        "docs/crm/COPILOT_OPPORTUNITY.md",
        "src/power-apps/screens/scrCRM.md",
        "src/power-apps/screens/scrOpportunityDetail.md",
        "releases/migrations/20260715_001_opportunity_crm_module.json",
        "releases/migrations/diffs/opportunity_crm_v1.json",
    ]:
        if not (ROOT / rel).exists():
            fail(f"Missing {rel}")

    fx = (ROOT / "src/power-apps/formulas/NamedFormulas.fx").read_text(encoding="utf-8")
    for token in ["nfOpenPipeline", "nfQualifiedLeads", "nfCapitalHandoffsReady", "nfMyOpportunities"]:
        if token not in fx:
            fail(f"NamedFormulas missing {token}")

    demo = load(ROOT / "sample-data/demo-pack.json")
    if not demo.get("leads"):
        fail("demo-pack missing leads")
    if not demo.get("opportunities"):
        fail("demo-pack missing opportunities")
    if not any(o.get("ForecastCategory") == "Commit" for o in demo["opportunities"]):
        fail("demo-pack should include a Commit forecast opportunity")

    mig = load(ROOT / "releases/migrations/20260715_001_opportunity_crm_module.json")
    if not mig.get("additiveOnly"):
        fail("opportunity CRM migration must be additiveOnly")

    # Ensure we did not invent deployment script changes requirement — migration uses ApplyListDiff
    if mig["steps"][0]["action"] != "ApplyListDiff":
        fail("migration should ApplyListDiff")

    if errors:
        print("FAIL opportunity CRM")
        for e in errors:
            print(" -", e)
        return 1
    print("PASS opportunity CRM module checks")
    print(f" lists_indexed={len(index['lists'])} flows={len(flow_names)} crm_views_ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
