#!/usr/bin/env python3
"""Validate Atlas Agentic Operations schema and UI contracts."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LISTS = ROOT / "src/sharepoint/lists"

PERMISSION_CLASSES = {
    "READ_AUTO",
    "PROPOSE_AUTO",
    "SAFE_INTERNAL_WRITE",
    "GOVERNED_TECHNICAL_WRITE",
    "OWNER_GATED",
}

EVIDENCE_CLASSES = {
    "CONFIRMED",
    "LIKELY",
    "PROPOSED",
    "STALE_OR_UNCERTAIN",
    "COMPLETE",
}

errors: list[str] = []


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def fail(message: str) -> None:
    errors.append(message)


def columns(schema_name: str) -> dict[str, dict]:
    data = load(LISTS / f"{schema_name}.json")
    return {column["internalName"]: column for column in data["columns"]}


def require_fields(schema_name: str, required: set[str]) -> dict[str, dict]:
    cols = columns(schema_name)
    missing = sorted(required - set(cols))
    if missing:
        fail(f"{schema_name} missing fields: {', '.join(missing)}")
    return cols


def require_choices(schema_name: str, field: str, expected: set[str]) -> None:
    cols = columns(schema_name)
    choices = set(cols.get(field, {}).get("choices") or [])
    missing = sorted(expected - choices)
    if missing:
        fail(f"{schema_name}.{field} missing choices: {', '.join(missing)}")


def main() -> int:
    index = load(LISTS / "_index.json")
    indexed = {item["name"]: item for item in index["lists"]}

    for schema_name in [
        "HVCG_AskAtlasSessions",
        "HVCG_AgentEvents",
        "HVCG_AgentActivity",
        "HVCG_EngineeringMissions",
    ]:
        if schema_name not in indexed:
            fail(f"{schema_name} not registered in _index.json")
        if not (LISTS / f"{schema_name}.json").exists():
            fail(f"{schema_name}.json missing")

    ask = require_fields(
        "HVCG_AskAtlasSessions",
        {
            "SessionId",
            "OperatorEmail",
            "OperatorRole",
            "ClientCode",
            "ConversationScope",
            "Question",
            "ResolvedIntent",
            "ResponseSummary",
            "EvidenceReferences",
            "OutputClassification",
            "PolicyDecision",
            "SessionStatus",
            "RelatedActivityId",
            "HVCG_IdempotencyKey",
        },
    )
    if not ask.get("ClientCode", {}).get("indexed"):
        fail("AskAtlasSessions.ClientCode must be indexed for isolation filtering")
    require_choices("HVCG_AskAtlasSessions", "OutputClassification", EVIDENCE_CLASSES)

    events = require_fields(
        "HVCG_AgentEvents",
        {
            "EventId",
            "EventType",
            "SourceSystem",
            "SourceRecordType",
            "SourceRecordId",
            "ClientCode",
            "PayloadSummary",
            "EvidenceReferences",
            "DataClassification",
            "RequiredPermissionClass",
            "EventStatus",
            "DetectedDate",
            "Priority",
            "RoutedWorkerKey",
            "HVCG_IdempotencyKey",
        },
    )
    if not events.get("ClientCode", {}).get("indexed"):
        fail("AgentEvents.ClientCode must be indexed for fail-closed routing")
    require_choices("HVCG_AgentEvents", "RequiredPermissionClass", PERMISSION_CLASSES)

    activity = require_fields(
        "HVCG_AgentActivity",
        {
            "ActivityId",
            "AgentKey",
            "AgentVersion",
            "MissionKey",
            "EventOrQuestion",
            "ActivityType",
            "ActorEmail",
            "ClientCode",
            "AffectedEntityType",
            "AffectedEntityKey",
            "ToolsCalled",
            "DataSources",
            "EvidenceReferences",
            "OutputClassification",
            "PermissionClass",
            "PolicyDecision",
            "WriteScope",
            "ApprovalState",
            "Outcome",
            "OutcomeSummary",
            "ErrorOrRetry",
            "RelatedEngineeringMission",
            "RelatedJobId",
            "ActivityDate",
            "HVCG_IdempotencyKey",
        },
    )
    if activity.get("WriteScope", {}).get("default") != "NoWrite":
        fail("AgentActivity.WriteScope must default to NoWrite")
    require_choices("HVCG_AgentActivity", "PermissionClass", PERMISSION_CLASSES)
    require_choices("HVCG_AgentActivity", "OutputClassification", EVIDENCE_CLASSES)

    missions = require_fields(
        "HVCG_EngineeringMissions",
        {
            "MissionKey",
            "OriginSignal",
            "Problem",
            "BusinessImpact",
            "AffectedSurface",
            "EvidenceReferences",
            "AcceptanceCriteria",
            "RiskLevel",
            "AffectedRepo",
            "AffectedSystem",
            "PermissionClass",
            "OwnerGatedStatus",
            "MissionStatus",
            "CreatedByAgent",
            "CreatedDate",
            "ResultSummary",
            "RollbackExpectation",
            "RelatedActivityId",
            "HVCG_IdempotencyKey",
        },
    )
    if missions.get("AffectedRepo", {}).get("default") != "mblv89117/HVCG-05":
        fail("EngineeringMissions.AffectedRepo should default to HVCG-05")
    require_choices("HVCG_EngineeringMissions", "PermissionClass", PERMISSION_CLASSES)

    tools = require_fields(
        "HVCG_AIToolRegistry",
        {
            "ToolKey",
            "ToolCategory",
            "IsEnabled",
            "PermissionClass",
            "ToolInputScope",
            "RequiresApproval",
            "AllowedWorkerKeys",
            "ProhibitedActions",
            "PolicyNotes",
        },
    )
    require_choices("HVCG_AIToolRegistry", "PermissionClass", PERMISSION_CLASSES)
    if tools.get("PermissionClass", {}).get("default") != "READ_AUTO":
        fail("ToolRegistry.PermissionClass must default to READ_AUTO")

    migration = load(ROOT / "releases/migrations/20260822_001_atlas_agentic_ops_v1_1_0.json")
    if migration.get("destructive") is not False or migration.get("preservesCustomerData") is not True:
        fail("Atlas agentic migration must be non-destructive and preserve customer data")
    diff = load(ROOT / "releases/migrations/diffs/atlas_agentic_ops_v1.json")
    destructive_keys = {"removeLists", "removeColumns", "renameLists", "renameColumns", "deleteData"}
    if destructive_keys & set(diff):
        fail("Atlas agentic diff contains destructive operations")

    for rel in [
        "docs/ai/ATLAS_AGENTIC_OPERATIONS.md",
        "src/power-apps/screens/scrAskAtlas.md",
        "src/power-apps/screens/scrAgentCenter.md",
    ]:
        if not (ROOT / rel).exists():
            fail(f"Missing {rel}")

    ask_spec = read(ROOT / "src/power-apps/screens/scrAskAtlas.md")
    for token in ["ClientCode", "EvidenceReferences", "OutputClassification", "Owner-gated", "HVCG_AgentActivity"]:
        if token.lower() not in ask_spec.lower():
            fail(f"Ask Atlas spec missing {token}")

    ops_doc = read(ROOT / "docs/ai/ATLAS_AGENTIC_OPERATIONS.md")
    for token in ["Ask Atlas", "HVCG_AgentActivity", "create_engineering_mission", "OWNER_GATED", "Client A data"]:
        if token not in ops_doc:
            fail(f"Atlas agentic operations doc missing {token}")

    if errors:
        print("FAIL")
        for error in errors:
            print(" -", error)
        return 1

    print("PASS atlas agentic operations contracts")
    print(f" lists_total_index={len(index['lists'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
