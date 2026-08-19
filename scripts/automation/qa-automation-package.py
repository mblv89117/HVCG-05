#!/usr/bin/env python3
"""Structural QA for Automation Product package (Executive Dashboard release set)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def load(p: Path):
    return json.loads(p.read_text())


def main() -> int:
    errors = []
    inv = load(ROOT / "src/power-automate/inventory/automation-inventory.json")
    flows_idx = load(ROOT / "src/power-automate/flows/_index.json")
    defs_idx = load(ROOT / "src/power-automate/definitions/_index.json")
    seed = load(ROOT / "src/power-automate/inventory/automation-registry-seed.json")

    if inv["count"] != len(inv["automations"]):
        errors.append("inventory count mismatch")
    if flows_idx["count"] != len(flows_idx["flows"]):
        errors.append("flows index count mismatch")
    if defs_idx["count"] != len(defs_idx["flows"]):
        errors.append("defs index count mismatch")
    if seed["count"] != inv["count"]:
        errors.append("seed count != inventory")

    names = {a["automationName"] for a in inv["automations"]}
    required = [
        "HVCG_TaskDueSoonReminders",
        "HVCG_ApprovalOutcomeNotify",
        "HVCG_ChangeRequestIntake",
        "HVCG_ProjectStatusReminder",
        "HVCG_AutomationFailureDigest",
        "HVCG_PaymentPastDueAlert",
        "HVCG_ExecutiveWeeklyBrief",
        "HVCG_OverdueTaskEscalation",
        "HVCG_DeliverableApproval",
        "HVCG_MissingDocumentReminders",
        "HVCG_CreateDocumentRequests",
        "HVCG_UpdateProjectHealth",
        "HVCG_WeeklyStatusSummary",
        "HVCG_ExecutiveDecisionEscalation",
    ]
    for r in required:
        if r not in names:
            errors.append(f"missing {r}")

    archived = [
        "HVCG_StaleOpportunityAlert",
        "HVCG_MeetingPrepAndFollowUp",
        "HVCG_CapitalReadinessAlert",
        "HVCG_ClientNotificationApproved",
    ]
    for a in archived:
        if a in names:
            errors.append(f"archived flow still active: {a}")
        arch = ROOT / "src/power-automate/archive/exec-dashboard-deferred" / f"{a}.json"
        if not arch.exists():
            errors.append(f"archive missing {a}")

    # Release candidates must meet repo production criteria
    for a in inv["automations"]:
        if a.get("releaseStatus") == "ReleaseCandidate" and not a.get("repoProductionCriteriaMet"):
            errors.append(f"release candidate criteria fail: {a['automationName']}")

    for rel in [
        "docs/automation/AUTOMATION_INVENTORY.md",
        "docs/automation/DUPLICATE_FLOW_FINDINGS.md",
        "docs/automation/AUTOMATION_CENTER.md",
        "docs/automation/MONITORING_AND_FAILURE_HANDLING.md",
        "docs/automation/QA_EVIDENCE.md",
        "docs/automation/PRODUCTION_READINESS.md",
        "docs/automation/AUTOMATION_HEALTH_REPORT.md",
        "src/power-apps/screens/scrAutomationCenter.md",
        "src/sharepoint/lists/HVCG_AutomationRegistry.json",
    ]:
        if not (ROOT / rel).exists():
            errors.append(f"missing file {rel}")

    if errors:
        print("FAIL")
        for e in errors:
            print(" -", e)
        return 1
    print(f"PASS — {inv['count']} active automations; release hygiene OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
