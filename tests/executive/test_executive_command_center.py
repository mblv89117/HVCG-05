#!/usr/bin/env python3
"""Executive Command Center — Option A offline packaging validation."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
errors: list[str] = []


def fail(msg: str) -> None:
    errors.append(msg)


def load(p: Path):
    return json.loads(p.read_text(encoding="utf-8"))


def main() -> int:
    # Docs (accept either naming from consolidated package)
    required_docs = [
        "docs/executive/ARCHITECTURE.md",
        "docs/executive/IMPLEMENTATION_PLAN.md",
        "docs/executive/SHARED_FILE_RECOMMENDATIONS.md",
        "docs/executive/KPI_CATALOG.md",
        "docs/executive/KPI_DEFINITIONS.md",
        "docs/executive/PERMISSIONS.md",
        "docs/executive/FLOW_INTEGRATION.md",
        "docs/executive/POWER_APPS_BUILD_GUIDE.md",
        "docs/executive/POWER_BI_CEO_COMMAND.md",
        "docs/executive/COPILOT_EXECUTIVE.md",
        "docs/executive/SMOKE_TEST_CHECKLIST.md",
        "docs/executive/OWNER_ACTION_GUIDE.md",
        "docs/executive/ACCEPTANCE_REPORT.md",
        "docs/executive/HANDOFF.md",
        "docs/executive/TEST_PLAN.md",
        "docs/executive/DASHBOARD_SPEC.md",
        "docs/executive/DATA_MAP.md",
        "docs/executive/SCREEN_SPECS.md",
    ]
    for rel in required_docs:
        if not (ROOT / rel).exists():
            fail(f"Missing {rel}")

    # Assets
    views_path = ROOT / "src/sharepoint/views/executive-views.json"
    if not views_path.exists():
        fail("Missing executive-views.json")
        views_pkg = {"views": []}
    else:
        views_pkg = load(views_path)
        mod = str(views_pkg.get("module", "")).lower().replace("_", "-")
        if "executive" not in mod:
            fail(f"executive-views.json unexpected module={views_pkg.get('module')}")
        if len(views_pkg.get("views", [])) < 12:
            fail("Expected >=12 executive views")

    index = load(ROOT / "src/sharepoint/lists/_index.json")
    indexed_lists = {i["name"] for i in index["lists"]}

    for v in views_pkg.get("views", []):
        if v["list"] not in indexed_lists:
            fail(f"View list not in _index.json: {v['list']}")
            continue
        schema_path = ROOT / "src/sharepoint/lists" / f"{v['list']}.json"
        cols = {c["internalName"] for c in load(schema_path)["columns"]} | {"Title"}
        for f in v["fields"]:
            if f not in cols:
                fail(f"View {v['list']}/{v['title']} unknown field {f}")

    # Canonical formulas path (shared recommendation target) + exclusive copy
    fx_candidates = [
        ROOT / "src/power-apps/formulas/ExecutiveNamedFormulas.fx",
        ROOT / "src/power-apps/executive/NamedFormulas.executive.fx",
    ]
    fx_text = ""
    if not any(p.exists() for p in fx_candidates):
        fail("Missing Executive NamedFormulas (.fx)")
    else:
        # Prefer formulas/ExecutiveNamedFormulas.fx as canonical
        primary = next(p for p in fx_candidates if p.exists())
        fx_text = primary.read_text(encoding="utf-8")
        for token in [
            "nfExecMRR",
            "nfExecPipelineWeighted",
            "nfExecDecisionQueue",
            "nfExecCapitalPipeline",
            "nfExecOutstandingAR",
        ]:
            # Allow aliases PipelineValue for PipelineWeighted if only one exists
            if token == "nfExecPipelineWeighted":
                if "nfExecPipelineWeighted" not in fx_text and "nfExecPipelineValue" not in fx_text:
                    fail("Formulas missing nfExecPipelineWeighted / nfExecPipelineValue")
            elif token == "nfExecOutstandingAR":
                if "nfExecOutstandingAR" not in fx_text and "nfExecAROutstanding" not in fx_text:
                    fail("Formulas missing nfExecOutstandingAR / nfExecAROutstanding")
            elif token not in fx_text:
                fail(f"Formulas missing {token}")

    # Screen + layout packaging
    for rel in [
        "src/power-apps/executive/scrHomeExec.md",
        "src/power-apps/executive/layout-desktop.md",
        "src/power-apps/executive/layout-phone.md",
        "src/power-apps/executive/COMPONENTS.md",
    ]:
        if not (ROOT / rel).exists():
            fail(f"Missing {rel}")

    # Power BI
    model_paths = [
        ROOT / "src/power-bi/executive/ceo-semantic-model.json",
        ROOT / "src/power-bi/executive/HVCG_CEO_Command.model.json",
    ]
    if not any(p.exists() for p in model_paths):
        fail("Missing CEO semantic model JSON")
    else:
        model = load(next(p for p in model_paths if p.exists()))
        name = model.get("modelName") or model.get("datasetName") or ""
        if "CEO" not in name and "Command" not in name:
            fail(f"Unexpected PBI model name {name}")

    measures = (ROOT / "src/power-bi/executive/measures.dax").read_text(encoding="utf-8")
    for m in ["Pipeline Value", "MRR", "Outstanding AR", "Capital Pipeline"]:
        if m not in measures:
            fail(f"measures.dax missing {m}")
    if "Executive Queue Count" not in measures and "Executive Open Decisions" not in measures:
        fail("measures.dax missing Executive Queue Count / Executive Open Decisions")

    # Weekly brief isolated Off
    brief_path = ROOT / "src/power-automate/executive/HVCG_ExecutiveWeeklyBrief.json"
    if brief_path.exists():
        brief = load(brief_path)
        if brief.get("defaultState") != "Off":
            fail("Weekly brief must default Off")
        flow_index = load(ROOT / "src/power-automate/flows/_index.json")
        indexed = {f["flowName"] for f in flow_index["flows"]}
        if "HVCG_ExecutiveWeeklyBrief" in indexed:
            fail("Weekly brief must not be in shared flows/_index.json (Option A)")
        if "HVCG_LeadQualifiedCreateOpportunity" not in indexed:
            fail("Baseline CRM flow missing from index")

    # Seed + KPI fixture arithmetic
    seed_path = ROOT / "sample-data/executive/executive-seed.json"
    if seed_path.exists():
        seed = load(seed_path)
        if not seed.get("decisions"):
            fail("executive-seed missing decisions")
    else:
        fail("Missing executive-seed.json")

    fixture_path = ROOT / "sample-data/executive/kpi-fixture.json"
    if fixture_path.exists():
        fx = load(fixture_path)
        clients = [c for c in fx["clients"] if c.get("ClientStage") == "Active Client" and c.get("IsActive")]
        mrr = sum(c["MonthlyRetainer"] for c in clients)
        pipeline = sum(
            o["WeightedValue"]
            for o in fx["opportunities"]
            if o.get("WinLossStatus") == "Open"
        )
        commit = sum(
            o["WeightedValue"]
            for o in fx["opportunities"]
            if o.get("WinLossStatus") == "Open" and o.get("ForecastCategory") == "Commit"
        )
        ar = sum(
            i["Amount"] - i.get("AmountCollected", 0)
            for i in fx["invoices"]
            if i.get("InvoiceStatus") in ("Sent", "Partial", "Past Due")
        )
        past_due = sum(
            i["Amount"] - i.get("AmountCollected", 0)
            for i in fx["invoices"]
            if i.get("InvoiceType") == "Retainer" and i.get("InvoiceStatus") == "Past Due"
        )
        capital = sum(
            c["WeightedValue"]
            for c in fx["capital"]
            if c.get("FundingStatus") not in ("Closed", "Declined", "Withdrawn")
        )
        exp = fx["expected"]
        checks = [
            ("mrr", mrr, exp["mrr"]),
            ("pipelineWeighted", pipeline, exp["pipelineWeighted"]),
            ("commitForecast", commit, exp["commitForecast"]),
            ("outstandingAR", ar, exp["outstandingAR"]),
            ("pastDueRetainerAR", past_due, exp["pastDueRetainerAR"]),
            ("capitalPipeline", capital, exp["capitalPipeline"]),
        ]
        for name, got, want in checks:
            if got != want:
                fail(f"kpi-fixture {name}: got {got} want {want}")
    else:
        fail("Missing kpi-fixture.json")

    # Isolation markers
    shared = (ROOT / "docs/executive/SHARED_FILE_RECOMMENDATIONS.md").read_text(encoding="utf-8")
    for path in ["command-center-views.json", "NamedFormulas", "Invoke-HVCGPreDeploymentTests"]:
        if path not in shared:
            fail(f"SHARED_FILE_RECOMMENDATIONS missing guidance for {path}")

    fi = (ROOT / "docs/executive/FLOW_INTEGRATION.md").read_text(encoding="utf-8")
    if "Must not modify" not in fi and "must not modify" not in fi.lower():
        fail("FLOW_INTEGRATION should declare must-not-modify CRM flows")

    # Portal contamination must not live under exclusive ECC package
    if (ROOT / "docs/portal").exists():
        fail("docs/portal present — belongs on client-portal branch, not ECC")

    if errors:
        print("FAIL executive command center")
        for e in errors:
            print(" -", e)
        return 1

    print("PASS executive command center module checks")
    print(f" views={len(views_pkg.get('views', []))} docs_checked={len(required_docs)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
