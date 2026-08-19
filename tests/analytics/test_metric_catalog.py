#!/usr/bin/env python3
"""Atlas Analytics — metric catalog + SAMPLE fixture validation."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
errors: list[str] = []

REQUIRED_IDS = [f"ATLAS-M-{i:03d}" for i in range(1, 17)]
REQUIRED_FIELDS = [
    "name",
    "businessMeaning",
    "formula",
    "dataSources",
    "refreshFrequency",
    "reportingPeriod",
    "owner",
    "limitations",
]


def fail(msg: str) -> None:
    errors.append(msg)


def main() -> int:
    catalog_path = ROOT / "docs/analytics/metric-catalog.json"
    if not catalog_path.exists():
        fail("Missing docs/analytics/metric-catalog.json")
        _report()
        return 1

    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    metrics = catalog.get("metrics") or []
    by_id = {m.get("id"): m for m in metrics}

    for mid in REQUIRED_IDS:
        if mid not in by_id:
            fail(f"Missing required metric {mid}")

    for m in metrics:
        mid = m.get("id", "?")
        for field in REQUIRED_FIELDS:
            if field not in m or m[field] in (None, "", []):
                fail(f"{mid} missing lineage field: {field}")
        for alias in m.get("aliases") or []:
            owners = [x["id"] for x in metrics if alias in (x.get("aliases") or [])]
            if len(owners) > 1:
                fail(f"Alias {alias} claimed by multiple metrics: {owners}")

    # Docs package
    for rel in [
        "docs/analytics/README.md",
        "docs/analytics/METRIC_CATALOG.md",
        "docs/analytics/SEMANTIC_MODEL.md",
        "docs/analytics/SOURCE_MAPPINGS.md",
        "docs/analytics/REFRESH_STRATEGY.md",
        "docs/analytics/DASHBOARDS.md",
        "docs/analytics/PERFORMANCE_REVIEW.md",
        "docs/analytics/QA_EVIDENCE.md",
        "docs/analytics/USER_GUIDE.md",
        "src/power-bi/analytics/atlas-analytics-semantic-model.json",
        "src/power-bi/analytics/measures.dax",
        "src/power-apps/executive/components/cmpExecMetricMeta.md",
        "src/power-apps/executive/components/cmpExecOpsSignalRow.md",
    ]:
        if not (ROOT / rel).exists():
            fail(f"Missing deliverable {rel}")

    fx = (ROOT / "src/power-apps/formulas/ExecutiveNamedFormulas.fx").read_text(encoding="utf-8")
    for token in [
        "nfExecConversionRate90d",
        "nfExecEngagementRevenue",
        "nfExecConcentrationTop3",
        "nfExecOverdueTaskRate",
        "nfExecDocCompletionCritical",
        "nfExecCapitalReadiness",
        "nfExecEVProgress",
        "nfExecActiveUsers7d",
        "nfExecWorkflowFailures7d",
    ]:
        if token not in fx:
            fail(f"Named formula missing: {token}")

    # SAMPLE fixture arithmetic (explicitly not production)
    fixture_path = ROOT / "sample-data/analytics/metric-fixture.json"
    if not fixture_path.exists():
        fail("Missing sample-data/analytics/metric-fixture.json")
    else:
        fix = json.loads(fixture_path.read_text(encoding="utf-8"))
        if fix.get("dataProvenance") != "sample":
            fail("Fixture must declare dataProvenance=sample")
        exp = fix["expected"]

        open_pipe = sum(
            o["WeightedValue"] for o in fix["opportunities"] if o["WinLossStatus"] == "Open"
        )
        if open_pipe != exp["weightedPipeline"]:
            fail(f"pipeline expected {exp['weightedPipeline']} got {open_pipe}")

        won = sum(1 for o in fix["opportunities"] if o["WinLossStatus"] == "Won")
        lost = sum(1 for o in fix["opportunities"] if o["WinLossStatus"] == "Lost")
        conv = won / (won + lost)
        if abs(conv - exp["conversionRate90d"]) > 1e-9:
            fail(f"conversion expected {exp['conversionRate90d']} got {conv}")

        eng = sum(
            (e.get("MonthlyRetainer") or 0) + (e.get("EngagementValue") or 0)
            for e in fix["engagements"]
            if e["EngagementStatus"] in {"Active", "In Progress", "On Track"}
        )
        if eng != exp["engagementRevenue"]:
            fail(f"engagementRevenue expected {exp['engagementRevenue']} got {eng}")

        active = [
            c
            for c in fix["clients"]
            if c["IsActive"] and c["ClientStage"] == "Active Client"
        ]
        mrr = sum(c["MonthlyRetainer"] for c in active)
        if mrr != exp["mrrActive"]:
            fail(f"mrrActive expected {exp['mrrActive']} got {mrr}")
        top3 = sum(
            c["MonthlyRetainer"]
            for c in sorted(active, key=lambda x: x["MonthlyRetainer"], reverse=True)[:3]
        )
        conc = top3 / mrr if mrr else None
        if conc is None or abs(conc - exp["concentrationTop3"]) > 1e-9:
            fail(f"concentrationTop3 expected {exp['concentrationTop3']} got {conc}")

        red = sum(1 for c in active if c["OverallHealth"] == "Red")
        if red != exp["clientHealthRed"]:
            fail(f"clientHealthRed expected {exp['clientHealthRed']} got {red}")

        open_hi = [
            t
            for t in fix["tasks"]
            if t["Priority"] in {"High", "Critical"}
            and t["TaskStatus"] not in {"Done", "Cancelled", "Completed"}
        ]
        overdue_rate = sum(1 for t in open_hi if t["IsOverdue"]) / len(open_hi)
        if abs(overdue_rate - exp["overdueTaskRateHighCrit"]) > 1e-9:
            fail(f"overdue rate expected {exp['overdueTaskRateHighCrit']} got {overdue_rate}")

        crit_docs = [
            d
            for d in fix["documentRequests"]
            if d["IsCritical"] and d["RequestStatus"] != "Cancelled"
        ]
        doc_rate = sum(
            1 for d in crit_docs if d["RequestStatus"] in {"Accepted", "Waived"}
        ) / len(crit_docs)
        if abs(doc_rate - exp["docCompletionCritical"]) > 1e-6:
            fail(f"docCompletionCritical expected {exp['docCompletionCritical']} got {doc_rate}")

        crit_ms = [m for m in fix["fundingMilestones"] if m["IsCritical"]]
        ready = sum(
            1
            for m in crit_ms
            if m["Status"] in {"Completed", "Complete", "Satisfied", "Waived"}
        ) / len(crit_ms)
        if abs(ready - exp["capitalReadiness"]) > 1e-9:
            fail(f"capitalReadiness expected {exp['capitalReadiness']} got {ready}")

        fin = sum(
            c["WeightedValue"]
            for c in fix["capital"]
            if c["FundingStatus"] not in {"Closed", "Declined", "Withdrawn"}
        )
        if fin != exp["activeFinancingPipeline"]:
            fail(f"activeFinancingPipeline expected {exp['activeFinancingPipeline']} got {fin}")

        ev = [
            e
            for e in fix["enterpriseValue"]
            if e["Status"] != "Superseded"
            and e["DataProvenance"] not in {"sample", "test"}
            and e["Status"] in {"Draft", "In Review", "Accepted"}
        ]
        ev_prog = sum(1 for e in ev if e["Status"] == "Accepted") / len(ev)
        if abs(ev_prog - exp["evProgressExcludingSample"]) > 1e-9:
            fail(f"evProgress expected {exp['evProgressExcludingSample']} got {ev_prog}")

        fails = sum(
            1 for a in fix["automationLogs"] if a["Status"] == "Failed" and a["daysAgo"] <= 7
        )
        if fails != exp["workflowFailures7d"]:
            fail(f"workflowFailures7d expected {exp['workflowFailures7d']} got {fails}")

    _report()
    return 1 if errors else 0


def _report() -> None:
    if errors:
        print("FAIL")
        for e in errors:
            print(f"  - {e}")
    else:
        print("PASS analytics metric catalog + SAMPLE fixture")


if __name__ == "__main__":
    sys.exit(main())
