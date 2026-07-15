#!/usr/bin/env python3
"""Offline smoke helpers for Opportunity CRM acceptance and unit checks."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

CRM_FLOWS = (
    "HVCG_LeadQualifiedCreateOpportunity",
    "HVCG_OpportunityStageChangedNotify",
    "HVCG_OpportunityWonCloseout",
    "HVCG_CapitalFundingStatusNotify",
)

CRM_LISTS = (
    "HVCG_Leads",
    "HVCG_Opportunities",
    "HVCG_OpportunityActivities",
    "HVCG_Proposals",
    "HVCG_WinLossAnalyses",
    "HVCG_CapitalOpportunities",
)

CRM_SCREEN_SPECS = (
    "src/power-apps/screens/scrCRM.md",
    "src/power-apps/screens/scrOpportunityDetail.md",
)

CRM_DOCS = (
    "docs/crm/OPPORTUNITY_MANAGEMENT.md",
    "docs/crm/COPILOT_OPPORTUNITY.md",
    "docs/crm/SMOKE_TEST_CHECKLIST.md",
)

FORMULA_TOKENS = (
    "nfOpenPipeline",
    "nfQualifiedLeads",
    "nfCapitalHandoffsReady",
    "nfMyOpportunities",
)


def repo_root_from_here() -> Path:
    return Path(__file__).resolve().parents[2]


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def artifact_paths(root: Path | None = None) -> dict[str, Path]:
    root = root or repo_root_from_here()
    paths: dict[str, Path] = {
        "list_index": root / "src/sharepoint/lists/_index.json",
        "flow_index": root / "src/power-automate/flows/_index.json",
        "definition_index": root / "src/power-automate/definitions/_index.json",
        "named_formulas": root / "src/power-apps/formulas/NamedFormulas.fx",
        "permissions": root / "PERMISSIONS_MATRIX.md",
        "migration": root / "releases/migrations/20260715_001_opportunity_crm_module.json",
        "diff": root / "releases/migrations/diffs/opportunity_crm_v1.json",
        "demo_pack": root / "sample-data/demo-pack.json",
        "lifecycle_test": root / "tests/unit/test_opportunity_lifecycle.py",
        "module_test": root / "tests/unit/test_opportunity_crm.py",
        "acceptance_script": root / "scripts/Test-HVCGOpportunityCrmAcceptance.ps1",
        "smoke_checklist": root / "docs/crm/SMOKE_TEST_CHECKLIST.md",
    }
    for name in CRM_LISTS:
        paths[f"list:{name}"] = root / f"src/sharepoint/lists/{name}.json"
    for name in CRM_FLOWS:
        paths[f"flow:{name}"] = root / f"src/power-automate/flows/{name}.json"
        paths[f"definition:{name}"] = (
            root / f"src/power-automate/definitions/{name}.definition.json"
        )
    for rel in CRM_SCREEN_SPECS + CRM_DOCS:
        paths[rel] = root / rel
    return paths


def missing_required_artifacts(root: Path | None = None) -> list[str]:
    missing: list[str] = []
    for label, path in artifact_paths(root).items():
        if not path.exists():
            missing.append(f"{label} → {path}")
    return missing


def assert_teams_policy(flow_meta: dict) -> list[str]:
    issues: list[str] = []
    conns = set(flow_meta.get("connections") or [])
    if "Teams" not in conns:
        issues.append("missing Teams connection")
    if "teamsIntegration" not in flow_meta:
        issues.append("missing teamsIntegration")
    elif not (flow_meta.get("teamsIntegration") or {}).get("purpose"):
        issues.append("teamsIntegration.purpose empty")
    return issues


def formula_tokens_present(fx_text: str, tokens: tuple[str, ...] = FORMULA_TOKENS) -> list[str]:
    return [t for t in tokens if t not in fx_text]


if __name__ == "__main__":
    miss = missing_required_artifacts()
    if miss:
        print("MISSING")
        for m in miss:
            print(" -", m)
        raise SystemExit(1)
    print("PASS crm smoke helpers — all required artifacts present")
    raise SystemExit(0)
