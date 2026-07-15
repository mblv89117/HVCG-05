#!/usr/bin/env python3
"""Opportunity CRM lifecycle — offline schema bridge, flows, formulas, permissions, E2E path."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
errors: list[str] = []

CRM_FLOWS = (
    "HVCG_LeadQualifiedCreateOpportunity",
    "HVCG_OpportunityStageChangedNotify",
    "HVCG_OpportunityWonCloseout",
    "HVCG_CapitalFundingStatusNotify",
)

EXPECTED_STAGES = (
    "Discovery",
    "Assessment",
    "Proposal",
    "Negotiation",
    "Won",
    "Lost",
)

LIFECYCLE_PATH = (
    "New",
    "Qualified",
    "Discovery",
    "Assessment",
    "Proposal",
    "Negotiation",
    "Won",
    "HandedOff",
    "InFunding",
    "Funded",
)

FORMULA_TOKENS = (
    "nfOpenPipeline",
    "nfQualifiedLeads",
    "nfCapitalHandoffsReady",
    "nfMyOpportunities",
    "nfOpenLeads",
    "nfPipelineWeightedValue",
    "nfCommitForecastValue",
)


def load(p: Path):
    return json.loads(p.read_text(encoding="utf-8"))


def fail(msg: str) -> None:
    errors.append(msg)


def col_names(schema: dict) -> set[str]:
    return {c["internalName"] for c in schema["columns"]}


def choice_values(schema: dict, internal: str) -> list[str]:
    col = next(c for c in schema["columns"] if c["internalName"] == internal)
    return list(col.get("choices") or [])


def test_schema_bridge() -> None:
    opp = load(ROOT / "src/sharepoint/lists/HVCG_Opportunities.json")
    cap = load(ROOT / "src/sharepoint/lists/HVCG_CapitalOpportunities.json")
    act = load(ROOT / "src/sharepoint/lists/HVCG_OpportunityActivities.json")
    leads = load(ROOT / "src/sharepoint/lists/HVCG_Leads.json")

    onames = col_names(opp)
    for req in (
        "Stage",
        "WinLossStatus",
        "CapitalOpportunityId",
        "CapitalHandoffStatus",
        "NextActionDate",
        "HVCG_IdempotencyKey",
        "TeamsThreadUrl",
        "CopilotSummary",
    ):
        if req not in onames:
            fail(f"Opportunities missing bridge/lifecycle field {req}")

    stages = choice_values(opp, "Stage")
    for s in EXPECTED_STAGES:
        if s not in stages:
            fail(f"Stage choices missing {s}")

    handoff = choice_values(opp, "CapitalHandoffStatus")
    for h in ("NotApplicable", "Ready", "HandedOff", "InFunding", "Funded", "Declined"):
        if h not in handoff:
            fail(f"CapitalHandoffStatus missing {h}")

    cap_lookup = next(c for c in opp["columns"] if c["internalName"] == "CapitalOpportunityId")
    if cap_lookup.get("lookupList") != "HVCG_CapitalOpportunities":
        fail("CapitalOpportunityId must lookup HVCG_CapitalOpportunities")

    cnames = col_names(cap)
    for req in ("OpportunityId", "HandoffSource", "FundingStatus"):
        if req not in cnames:
            fail(f"CapitalOpportunities missing {req}")
    opp_lookup = next(c for c in cap["columns"] if c["internalName"] == "OpportunityId")
    if opp_lookup.get("lookupList") != "HVCG_Opportunities":
        fail("Capital OpportunityId must lookup HVCG_Opportunities")

    anames = col_names(act)
    for req in ("ActivityType", "ActivityDate", "OpportunityId", "LeadId", "PriorStage", "NewStage"):
        if req not in anames:
            fail(f"OpportunityActivities missing {req}")

    lnames = col_names(leads)
    if "ConvertedOpportunityId" not in lnames:
        fail("Leads missing ConvertedOpportunityId")
    if "Qualified" not in choice_values(leads, "LeadStatus"):
        fail("LeadStatus must include Qualified")

    index = load(ROOT / "src/sharepoint/lists/_index.json")
    indexed = {i["name"] for i in index["lists"]}
    if "HVCG_OpportunityActivities" not in indexed:
        fail("OpportunityActivities not in list index")

    diff = load(ROOT / "releases/migrations/diffs/opportunity_crm_v1.json")
    add_lists = {x.get("title") for x in diff.get("addLists", [])}
    if "HVCG_OpportunityActivities" not in add_lists:
        fail("Diff must add HVCG_OpportunityActivities")


def test_flow_package_and_teams_policy() -> None:
    flow_index = load(ROOT / "src/power-automate/flows/_index.json")
    indexed = {f["flowName"] for f in flow_index["flows"]}
    def_index = load(ROOT / "src/power-automate/definitions/_index.json")
    defined = {f["name"] for f in def_index["flows"]}

    for name in CRM_FLOWS:
        if name not in indexed:
            fail(f"Flow not in package index: {name}")
        pkg = ROOT / f"src/power-automate/flows/{name}.json"
        definition = ROOT / f"src/power-automate/definitions/{name}.definition.json"
        if not pkg.exists():
            fail(f"Missing flow package {pkg.name}")
            continue
        if not definition.exists():
            fail(f"Missing flow definition {definition.name}")
        if name not in defined:
            fail(f"Flow not in definitions index: {name}")

        meta = load(pkg)
        conns = set(meta.get("connections") or [])
        if "SharePoint" not in conns:
            fail(f"{name} must declare SharePoint connection")
        if "Teams" not in conns:
            fail(f"{name} must declare Teams connection (Teams policy)")
        if "teamsIntegration" not in meta:
            fail(f"{name} missing teamsIntegration policy block")
        ti = meta["teamsIntegration"]
        if not ti.get("purpose"):
            fail(f"{name} teamsIntegration.purpose required")

        env = set(meta.get("environmentVariables") or [])
        if name == "HVCG_CapitalFundingStatusNotify":
            if "HVCG_TEAMS_CAPITAL_CHANNEL_ID" not in env:
                fail(f"{name} must reference HVCG_TEAMS_CAPITAL_CHANNEL_ID")
        else:
            if "HVCG_TEAMS_CRM_CHANNEL_ID" not in env:
                fail(f"{name} must reference HVCG_TEAMS_CRM_CHANNEL_ID")

        body = json.dumps(meta)
        if "TeamsPostMessage" not in body and "teams" not in body.lower():
            fail(f"{name} should include a Teams post step")

    # Qualifying flow must open Discovery opportunity
    lead_flow = load(ROOT / "src/power-automate/flows/HVCG_LeadQualifiedCreateOpportunity.json")
    create_step = next(
        (s for s in lead_flow["steps"] if s.get("action") == "FindOrCreateOpportunity"),
        None,
    )
    if not create_step:
        fail("LeadQualified flow missing FindOrCreateOpportunity")
    else:
        params = create_step.get("params") or {}
        if params.get("Stage") != "Discovery":
            fail("Qualified lead must create Discovery-stage opportunity")
        if params.get("WinLossStatus") != "Open":
            fail("New opportunity must be WinLossStatus=Open")

    won = load(ROOT / "src/power-automate/flows/HVCG_OpportunityWonCloseout.json")
    if "FindOrCreateCapitalOpportunity" not in json.dumps(won):
        fail("Won closeout must hand off capital opportunities for Capital Raise/Hybrid")


def test_power_apps_formula_tokens() -> None:
    fx = (ROOT / "src/power-apps/formulas/NamedFormulas.fx").read_text(encoding="utf-8")
    for token in FORMULA_TOKENS:
        if token not in fx:
            fail(f"NamedFormulas missing {token}")

    for rel in (
        "src/power-apps/screens/scrCRM.md",
        "src/power-apps/screens/scrOpportunityDetail.md",
    ):
        text = (ROOT / rel).read_text(encoding="utf-8")
        if "HVCG_Opportunities" not in text:
            fail(f"{rel} should reference HVCG_Opportunities")
        if "Stage" not in text:
            fail(f"{rel} should describe Stage lifecycle")


def test_permissions_mentions() -> None:
    matrix = (ROOT / "PERMISSIONS_MATRIX.md").read_text(encoding="utf-8")
    if "HVCG_Leads / Opportunities" not in matrix and "Opportunities" not in matrix:
        fail("PERMISSIONS_MATRIX must mention Leads/Opportunities access")
    if "CRM" not in matrix and "Capital" not in matrix:
        fail("PERMISSIONS_MATRIX must mention CRM or Capital domain access")

    # PM + Capital Advisor edit path on leads/opportunities row
    lead_row = next(
        (line for line in matrix.splitlines() if "HVCG_Leads / Opportunities" in line),
        "",
    )
    if not lead_row:
        fail("Missing HVCG_Leads / Opportunities permissions row")
    else:
        # Columns after resource: Owner Admin OpsMgr PM CapitalAdv ... — expect Edit for PM/Capital
        cells = [c.strip() for c in lead_row.strip("|").split("|")]
        if len(cells) < 6:
            fail("Leads/Opportunities permissions row truncated")
        else:
            # index: 0 resource, 1 Owner, 2 Admin, 3 Ops, 4 PM, 5 Capital Adv
            if cells[4] != "E":
                fail("Project Manager should have Edit on Leads/Opportunities")
            if cells[5] != "E":
                fail("Capital Advisor should have Edit on Leads/Opportunities")

    crm_doc = (ROOT / "docs/crm/OPPORTUNITY_MANAGEMENT.md").read_text(encoding="utf-8")
    if "PERMISSIONS_MATRIX" not in crm_doc:
        fail("OPPORTUNITY_MANAGEMENT.md should point at PERMISSIONS_MATRIX")
    if "CapitalAdvisor" not in crm_doc and "Capital" not in crm_doc:
        fail("CRM docs should mention Capital Advisor / capital roles")


def simulate_lifecycle_path() -> list[str]:
    """Offline E2E path: lead → qualify → stages → win → capital handoff → funded."""
    trail: list[str] = []
    status = "New"
    trail.append(status)

    # Qualify → flow creates Discovery opportunity
    status = "Qualified"
    trail.append(status)
    stage = "Discovery"
    trail.append(stage)
    handoff = "NotApplicable"

    for stage in ("Assessment", "Proposal", "Negotiation"):
        trail.append(stage)

    # Win closeout
    stage = "Won"
    trail.append(stage)
    win_loss = "Won"
    opportunity_type = "Capital Raise"
    if opportunity_type in ("Capital Raise", "Hybrid") or handoff == "Ready":
        handoff = "HandedOff"
        trail.append(handoff)
        funding = "Identified"
        # Diligence advances bridge
        for funding, mapped in (
            ("Term Sheet", "InFunding"),
            ("Closed", "Funded"),
        ):
            handoff = mapped
            if handoff not in trail:
                trail.append(handoff)

    # Validate invariant against demo pack shapes
    demo = load(ROOT / "sample-data/demo-pack.json")
    if not any(l.get("LeadStatus") == "Qualified" for l in demo.get("leads", [])):
        fail("Demo pack needs a Qualified lead for lifecycle smoke")
    if not any(o.get("Stage") == "Discovery" for o in demo.get("opportunities", [])):
        fail("Demo pack needs a Discovery opportunity")
    if not any(o.get("ForecastCategory") == "Commit" for o in demo.get("opportunities", [])):
        fail("Demo pack needs a Commit forecast opportunity")

    # Trace must cover canonical LIFECYCLE_PATH milestones
    for milestone in LIFECYCLE_PATH:
        if milestone not in trail:
            fail(f"E2E lifecycle trail missing milestone {milestone} (got {trail})")

    # Schema alignment: every stage in trail that is an opportunity Stage must be valid
    opp = load(ROOT / "src/sharepoint/lists/HVCG_Opportunities.json")
    stages = set(choice_values(opp, "Stage"))
    handoffs = set(choice_values(opp, "CapitalHandoffStatus"))
    for item in trail:
        if item in ("New", "Qualified"):
            continue
        if item in stages or item in handoffs:
            continue
        fail(f"Lifecycle trail value {item} not a Stage or CapitalHandoffStatus choice")

    _ = win_loss  # documented close state
    return trail


def test_e2e_lifecycle_offline() -> None:
    trail = simulate_lifecycle_path()
    # Qualified create → Discovery only (no skip to Won without stages in path design)
    try:
        qi = trail.index("Qualified")
        di = trail.index("Discovery")
        if di != qi + 1:
            fail("Qualified must be immediately followed by Discovery in offline path")
    except ValueError:
        fail("Qualified/Discovery missing from trail")

    # Won precedes capital HandedOff
    if "Won" in trail and "HandedOff" in trail:
        if trail.index("Won") > trail.index("HandedOff"):
            fail("Won must precede capital HandedOff")

    # Screen acceptance tokens for kanban lifecycle
    crm = (ROOT / "src/power-apps/screens/scrCRM.md").read_text(encoding="utf-8")
    for token in ("Qualify lead", "Win", "capital"):
        if not re.search(token, crm, re.I):
            fail(f"scrCRM should mention action/path token: {token}")


def main() -> int:
    test_schema_bridge()
    test_flow_package_and_teams_policy()
    test_power_apps_formula_tokens()
    test_permissions_mentions()
    test_e2e_lifecycle_offline()

    if errors:
        print("FAIL opportunity CRM lifecycle")
        for e in errors:
            print(" -", e)
        return 1
    print("PASS opportunity CRM lifecycle checks")
    print(
        " bridge=ok flows=%d formulas=%d lifecycle_path=%s"
        % (len(CRM_FLOWS), len(FORMULA_TOKENS), "→".join(LIFECYCLE_PATH))
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
