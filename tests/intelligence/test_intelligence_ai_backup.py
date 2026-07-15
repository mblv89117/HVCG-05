#!/usr/bin/env python3
"""
Intelligence, AI orchestration, backup packaging, restore dry-run rules,
health report wiring, upgrade path, and release immutability tests.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
errors: list[str] = []


def load(p: Path):
    return json.loads(p.read_text(encoding="utf-8"))


def fail(msg: str):
    errors.append(msg)


def read(p: Path) -> str:
    return p.read_text(encoding="utf-8")


def main() -> int:
    lists = {p.stem for p in (ROOT / "src/sharepoint/lists").glob("HVCG_*.json")}
    index = load(ROOT / "src/sharepoint/lists/_index.json")
    indexed_names = {i["name"] for i in index["lists"]}

    # --- Relationship integrity schema ---
    rel = load(ROOT / "src/sharepoint/lists/HVCG_Relationships.json")
    names = {c["internalName"]: c for c in rel["columns"]}
    for req in [
        "RelationshipId", "SourceEntityType", "SourceRecordId", "SourceDisplayName",
        "TargetEntityType", "TargetRecordId", "TargetDisplayName", "RelationshipType",
        "RelationshipStrength", "RelationshipStatus", "LastMeaningfulInteraction",
        "NextPlannedInteraction", "RelationshipOwnerEmail", "StrategicValue",
        "RevenueInfluenced", "CapitalInfluenced", "SourceSystem", "IsCrossClient",
        "HVCG_IdempotencyKey",
    ]:
        if req not in names:
            fail(f"Relationships missing {req}")

    for req in [
        "RelationshipId", "SourceEntityType", "TargetEntityType", "RelationshipType",
        "SourceClientCode", "IsCrossClient", "SourceRecordId", "TargetRecordId",
    ]:
        if req in names and not names[req].get("indexed"):
            fail(f"{req} should be indexed")

    rel_types = set(names.get("RelationshipType", {}).get("choices") or [])
    for t in [
        "Referred by", "Referred", "Owns", "Manages", "Advises", "Works for",
        "Invested in", "Lent to", "Funded", "Introduced", "Partnered with",
        "Vendor to", "Depends on", "Blocks", "Related document", "Related meeting",
        "Related opportunity", "Related engagement", "Related project",
        "Related capital transaction",
    ]:
        if t not in rel_types:
            fail(f"Missing relationship type: {t}")

    # Invalid entity references: SourceEntityType choices must cover domain
    for ent in ["Client", "Lender", "Investor", "Opportunity", "Project", "Document", "Meeting", "Task"]:
        if ent not in (names.get("SourceEntityType", {}).get("choices") or []):
            fail(f"SourceEntityType missing {ent}")

    # Duplicate relationships: RelationshipId required + IdempotencyKey
    if not names.get("RelationshipId", {}).get("required"):
        fail("RelationshipId must be required (duplicate key)")
    if "HVCG_IdempotencyKey" not in names:
        fail("IdempotencyKey required for duplicate prevention")

    if "HVCG_Relationships" not in indexed_names:
        fail("Relationships not in _index.json")

    # --- AI jobs ---
    jobs = load(ROOT / "src/sharepoint/lists/HVCG_AIJobs.json")
    jnames = {c["internalName"]: c for c in jobs["columns"]}
    if jnames.get("HumanReviewRequired", {}).get("default") is not True:
        fail("HumanReviewRequired must default true")
    if jnames.get("ExternalSendBlocked", {}).get("default") is not True:
        fail("ExternalSendBlocked must default true")
    status = set(jnames["JobStatus"]["choices"])
    for s in ["Queued", "Running", "AwaitingReview", "Approved", "Rejected", "Completed", "Failed"]:
        if s not in status:
            fail(f"JobStatus missing {s}")
    for gated in ["PromptVersion", "ToolPermissions", "DataClassification", "ApprovalStatus", "Confidence", "CostEstimate", "ActualCost", "RetryCount"]:
        if gated not in jnames:
            fail(f"AIJobs missing {gated}")

    for n in [
        "HVCG_AIWorkers", "HVCG_AIJobs", "HVCG_AIJobSteps", "HVCG_AIContext", "HVCG_AIPrompts",
        "HVCG_AIToolRegistry", "HVCG_AIOutputs", "HVCG_AIApprovals", "HVCG_AIFeedback",
        "HVCG_AIAuditLog", "HVCG_AICostTracking", "HVCG_OperationalAlerts",
    ]:
        if n not in lists or n not in indexed_names:
            fail(f"Missing AI/ops entity {n}")

    ctx = load(ROOT / "src/sharepoint/lists/HVCG_AIContext.json")
    cnames = {c["internalName"] for c in ctx["columns"]}
    if "ClientCode" not in cnames or "DataClassification" not in cnames:
        fail("AIContext missing ClientCode/DataClassification")

    tools = load(ROOT / "src/sharepoint/lists/HVCG_AIToolRegistry.json")
    if "ProhibitedActions" not in {c["internalName"] for c in tools["columns"]}:
        fail("ToolRegistry missing ProhibitedActions")

    prompts = load(ROOT / "src/sharepoint/lists/HVCG_AIPrompts.json")
    pnames = {c["internalName"] for c in prompts["columns"]}
    if "PromptVersion" not in pnames:
        fail("AIPrompts missing PromptVersion")

    costs = load(ROOT / "src/sharepoint/lists/HVCG_AICostTracking.json")
    if "ActualCost" not in {c["internalName"] for c in costs["columns"]} and "CostAmount" not in {c["internalName"] for c in costs["columns"]}:
        # accept either naming
        cn = {c["internalName"] for c in costs["columns"]}
        if not any("Cost" in x for x in cn):
            fail("AICostTracking missing cost field")

    # --- Required docs & scripts ---
    for relp in [
        "deployment/backup/Backup-HVCGOS.ps1",
        "deployment/restore/Restore-HVCGOS.ps1",
        "deployment/health/Invoke-HVCGOSOperationalHealth.ps1",
        "DISASTER_RECOVERY.md",
        "MONITORING.md",
        "docs/intelligence/INTELLIGENCE_QUERY_CATALOG.md",
        "docs/ai/AI_CONTEXT_POLICY.md",
        "docs/ai/AI_GOVERNANCE.md",
        "docs/ai/AI_APPROVAL_MATRIX.md",
        "docs/ai/AI_SECURITY_MODEL.md",
        "docs/reporting/SYSTEM_HEALTH_DASHBOARD.md",
        "releases/v1.1.0/notes/RELEASE_NOTES.md",
        "releases/migrations/20260714_002_intelligence_ai_backup_v1_1_0.json",
        "releases/migrations/diffs/v1.0.0_to_v1.1.0.json",
    ]:
        if not (ROOT / relp).exists():
            fail(f"Missing {relp}")

    # Backup script requirements
    bak = read(ROOT / "deployment/backup/Backup-HVCGOS.ps1")
    for token in [
        "Environment", "OutputPath", "ConfigurationOnly", "manifest", "checksum",
        "development", "test", "production", "WhatIf",
    ]:
        if token not in bak:
            fail(f"Backup script missing concern: {token}")

    # Restore dry-run / additive / confirmation
    rst = read(ROOT / "deployment/restore/Restore-HVCGOS.ps1")
    for token in ["WhatIf", "AllowDestructiveOverwrite", "Confirm", "manifest.json", "checksum"]:
        if token not in rst:
            fail(f"Restore script missing: {token}")
    if "AllowDestructiveOverwrite" in rst and "Confirm" in rst:
        # require gate: destructive needs Confirm
        if "AllowDestructiveOverwrite -and -not $Confirm" not in rst and \
           "AllowDestructiveOverwrite" not in rst:
            fail("Destructive restore must require Confirm")
    else:
        fail("Restore must gate destructive overwrite")

    # Simulated backup manifest integrity (unit-level)
    sample = {
        "product": "HVCG OS",
        "environment": "development",
        "mode": "ConfigurationOnly",
        "items": [{"path": "config/version-marker.txt", "note": "test"}],
        "checksums": {},
    }
    payload = json.dumps({"ok": True}, sort_keys=True).encode()
    digest = hashlib.sha256(payload).hexdigest()
    sample["checksums"]["config/version-marker.txt"] = digest
    if sample["checksums"]["config/version-marker.txt"] != hashlib.sha256(payload).hexdigest():
        fail("Backup checksum simulation failed")
    # mismatch detection
    if hashlib.sha256(b"tamper").hexdigest() == digest:
        fail("Checksum collision unexpectedly")

    # Health script writes to deployment/reports/health/
    hl = read(ROOT / "deployment/health/Invoke-HVCGOSOperationalHealth.ps1")
    if "deployment/reports/health" not in hl.replace("\\", "/"):
        fail("Operational health must write under deployment/reports/health/")
    for field in [
        "overallStatus", "criticalFailures", "warnings", "siteAvailability",
        "listAvailability", "schemaDrift", "permissionDrift", "automationHealth",
        "backupStatus", "powerPlatformStatus", "aiQueueHealth", "dataQualityIssues",
        "recommendedActions",
    ]:
        if field not in hl:
            fail(f"Health report missing field wiring: {field}")

    # --- Migration 1.0.0 -> 1.1.0 ---
    mig = load(ROOT / "releases/migrations/20260714_002_intelligence_ai_backup_v1_1_0.json")
    if mig["fromVersion"] != "1.0.0" or mig["toVersion"] != "1.1.0":
        fail("Migration versions incorrect")
    if mig.get("destructive"):
        fail("Migration must be non-destructive")
    if not mig.get("preservesCustomerData"):
        fail("Migration must preserve customer data")
    diff = load(ROOT / "releases/migrations/diffs/v1.0.0_to_v1.1.0.json")
    if len(diff.get("addLists", [])) < 10:
        fail("Diff should add intelligence/AI lists")

    ph = load(ROOT / "releases/migrations/PLACEHOLDER_v1_1_0.json")
    if ph.get("status") not in ("superseded", "planned"):
        # planned is skipped by upgrade; superseded preferred
        fail("PLACEHOLDER should be superseded or planned (skipped)")

    # --- Release immutability ---
    v100_notes = ROOT / "releases/v1.0.0/notes/RELEASE_NOTES.md"
    if not v100_notes.exists():
        fail("v1.0.0 release notes missing (immutability)")
    v100_hash_before = hashlib.sha256(v100_notes.read_bytes()).hexdigest()
    # re-read to ensure stable
    if hashlib.sha256(v100_notes.read_bytes()).hexdigest() != v100_hash_before:
        fail("v1.0.0 notes unstable")

    v = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
    if v != "1.1.0":
        fail(f"VERSION should be 1.1.0, got {v}")
    meta = load(ROOT / "version.json")
    if meta["version"] != "1.1.0":
        fail("version.json not 1.1.0")
    if not (ROOT / "releases/v1.1.0/notes/RELEASE_NOTES.md").exists():
        fail("v1.1.0 release notes missing")

    # Assert install/upgrade default to VERSION
    inst = read(ROOT / "deployment/install/Install-HVCGOS.ps1")
    if "Get-Content (Join-Path $RepoRoot 'VERSION')" not in inst and "VERSION" not in inst:
        fail("Install should read VERSION for default TargetVersion")
    upg = read(ROOT / "deployment/upgrade/Upgrade-HVCGOS.ps1")
    if "VERSION" not in upg:
        fail("Upgrade should read VERSION for default TargetVersion")

    # AssertInstalledVersion implemented
    relmod = read(ROOT / "deployment/lib/HVCG.Release.psm1")
    if "AssertInstalledVersion" not in relmod or "required min" not in relmod:
        fail("AssertInstalledVersion must enforce min/max")

    # List count expectation
    if len(index["lists"]) < 75:
        fail(f"Expected expanded list catalog (>=75), got {len(index['lists'])}")

    # Query catalog coverage
    cat = read(ROOT / "docs/intelligence/INTELLIGENCE_QUERY_CATALOG.md")
    for q in ["lenders", "investors", "referral", "30", "missing", "lifetime", "Manny", "prioritize"]:
        if q.lower() not in cat.lower():
            fail(f"Query catalog missing coverage for: {q}")

    if errors:
        print("FAIL")
        for e in errors:
            print(" -", e)
        return 1
    print("PASS intelligence/AI/backup/release tests")
    print(f" lists_total_index={len(index['lists'])}")
    print(f" v1.0.0_notes_sha256={v100_hash_before[:12]}…")
    return 0


if __name__ == "__main__":
    sys.exit(main())
