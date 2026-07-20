#!/usr/bin/env python3
"""Bootstrap Atlas Engineering Orchestration Platform v1.0 (Sprint 12).

Generates purposeful registries, schemas, seeded tasks, memory, and dashboards.
Idempotent: re-running refreshes generated indexes without destroying claimed work.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ORCH = ROOT / "PROJECT_ATLAS" / "ORCHESTRATION"
NOW = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def write_json(path: Path, data: object, *, indent: int = 2) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=indent) + "\n", encoding="utf-8")


def write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text if text.endswith("\n") else text + "\n", encoding="utf-8")


TASK_STATES = [
    "Backlog",
    "Planned",
    "Ready",
    "Claimed",
    "In Progress",
    "Blocked",
    "Waiting Review",
    "QA",
    "Architecture Review",
    "Security Review",
    "Approved",
    "Merged",
    "Released",
    "Closed",
    "Cancelled",
]

AGENTS = [
    {
        "agentId": "master-pm",
        "displayName": "Master Project Manager",
        "role": "Master PM",
        "capabilities": ["orchestration", "routing", "escalation", "sprint-planning"],
        "ownedPaths": ["PROJECT_ATLAS/ORCHESTRATION/", "MASTER_*.md", "docs/agents/"],
        "defaultBranchPrefix": "cursor/master-pm-",
        "commsAgentId": "master-pm",
        "escalatesTo": "owner",
        "status": "active",
    },
    {
        "agentId": "system-architect",
        "displayName": "System Architect",
        "role": "System Architect",
        "capabilities": ["architecture-review", "adr", "scalability"],
        "ownedPaths": ["PROJECT_ATLAS/Architecture/", "docs/architecture/"],
        "defaultBranchPrefix": "cursor/system-architect-",
        "commsAgentId": None,
        "escalatesTo": "master-pm",
        "status": "active",
    },
    {
        "agentId": "deployment-manager",
        "displayName": "Deployment Manager",
        "role": "Deployment Manager",
        "capabilities": ["deploy", "pipelines", "environments"],
        "ownedPaths": ["deployment/", "infrastructure/", "scripts/deploy-*.sh"],
        "defaultBranchPrefix": "cursor/deployment-",
        "commsAgentId": None,
        "escalatesTo": "master-pm",
        "status": "active",
    },
    {
        "agentId": "qa-release",
        "displayName": "QA & Release",
        "role": "QA & Release",
        "capabilities": ["qa", "release-gate", "test-plans"],
        "ownedPaths": ["PROJECT_ATLAS/QA/", "tests/", "releases/"],
        "defaultBranchPrefix": "cursor/qa-",
        "commsAgentId": None,
        "escalatesTo": "master-pm",
        "status": "active",
    },
    {
        "agentId": "documentation",
        "displayName": "Documentation Manager",
        "role": "Documentation Manager",
        "capabilities": ["docs", "runbooks", "knowledge-index"],
        "ownedPaths": ["docs/", "PROJECT_ATLAS/**/*.md"],
        "defaultBranchPrefix": "cursor/docs-",
        "commsAgentId": None,
        "escalatesTo": "master-pm",
        "status": "active",
    },
    {
        "agentId": "ai-governance",
        "displayName": "AI Governance",
        "role": "AI Governance",
        "capabilities": ["ai-policy", "security-review-assist", "control-plane"],
        "ownedPaths": ["docs/ai/", "src/power-apps/ai/"],
        "defaultBranchPrefix": "cursor/ai-governance-",
        "commsAgentId": "ai-governance",
        "escalatesTo": "master-pm",
        "status": "active",
    },
    {
        "agentId": "elite-ui",
        "displayName": "Elite UI",
        "role": "Elite UI",
        "capabilities": ["react", "design-system", "swa"],
        "ownedPaths": ["apps/atlas-elite-os/", "packages/atlas-design-system/"],
        "defaultBranchPrefix": "cursor/elite-ui-",
        "commsAgentId": None,
        "escalatesTo": "master-pm",
        "status": "active",
    },
    {
        "agentId": "power-platform",
        "displayName": "Power Platform",
        "role": "Power Platform",
        "capabilities": ["dataverse", "power-apps", "power-automate"],
        "ownedPaths": ["src/power-platform/", "src/power-apps/", "ms-atlas-command-center/"],
        "defaultBranchPrefix": "cursor/power-platform-",
        "commsAgentId": "crm",
        "escalatesTo": "master-pm",
        "status": "active",
    },
    {
        "agentId": "azure-platform",
        "displayName": "Azure Platform",
        "role": "Azure Platform",
        "capabilities": ["azure", "bicep", "monitor", "keyvault"],
        "ownedPaths": ["infrastructure/azure/", "docs/deployment/AZURE_*.md"],
        "defaultBranchPrefix": "cursor/azure-",
        "commsAgentId": None,
        "escalatesTo": "master-pm",
        "status": "active",
    },
    {
        "agentId": "data-engineering",
        "displayName": "Data Engineering",
        "role": "Data Engineering",
        "capabilities": ["schema", "etl", "sample-data", "dataverse-model"],
        "ownedPaths": ["sample-data/", "releases/migrations/"],
        "defaultBranchPrefix": "cursor/data-",
        "commsAgentId": None,
        "escalatesTo": "master-pm",
        "status": "active",
    },
    {
        "agentId": "security",
        "displayName": "Security Engineering",
        "role": "Security Engineering",
        "capabilities": ["security-review", "rbac", "secrets", "compliance"],
        "ownedPaths": ["PROJECT_ATLAS/Architecture/Track10_Security_Matrix.md"],
        "defaultBranchPrefix": "cursor/security-",
        "commsAgentId": None,
        "escalatesTo": "master-pm",
        "status": "active",
    },
    {
        "agentId": "revenue-systems",
        "displayName": "Revenue Systems",
        "role": "Revenue Systems",
        "capabilities": ["revenue-os", "eva", "conversion"],
        "ownedPaths": ["docs/revenue/", ".worktrees/revenue-*/"],
        "defaultBranchPrefix": "cursor/revenue-",
        "commsAgentId": None,
        "escalatesTo": "master-pm",
        "status": "active",
    },
    {
        "agentId": "client-workspace",
        "displayName": "Client Workspace",
        "role": "Client Workspace",
        "capabilities": ["portal", "data-rooms", "client-sharepoint"],
        "ownedPaths": ["docs/portal/", "src/power-apps/portal/"],
        "defaultBranchPrefix": "cursor/client-",
        "commsAgentId": "client-portal",
        "escalatesTo": "master-pm",
        "status": "active",
    },
    {
        "agentId": "knowledge-platform",
        "displayName": "Knowledge Platform",
        "role": "Knowledge Platform",
        "capabilities": ["knowledge-graph", "search", "sop"],
        "ownedPaths": ["PROJECT_ATLAS/ORCHESTRATION/knowledge/", "docs/"],
        "defaultBranchPrefix": "cursor/knowledge-",
        "commsAgentId": None,
        "escalatesTo": "master-pm",
        "status": "active",
    },
    {
        "agentId": "communications",
        "displayName": "Communications",
        "role": "Communications",
        "capabilities": ["agent-comms", "inbox", "broadcast"],
        "ownedPaths": [".agent-comms/", "scripts/agent-comms/", "docs/agents/"],
        "defaultBranchPrefix": "cursor/comms-",
        "commsAgentId": "master-pm",
        "escalatesTo": "master-pm",
        "status": "active",
    },
    {
        "agentId": "analytics",
        "displayName": "Analytics",
        "role": "Analytics",
        "capabilities": ["metrics", "dashboards", "telemetry"],
        "ownedPaths": ["PROJECT_ATLAS/ORCHESTRATION/metrics/", "PROJECT_ATLAS/ORCHESTRATION/dashboards/"],
        "defaultBranchPrefix": "cursor/analytics-",
        "commsAgentId": None,
        "escalatesTo": "master-pm",
        "status": "active",
    },
    {
        "agentId": "automation",
        "displayName": "Automation",
        "role": "Automation",
        "capabilities": ["power-automate", "scripts", "ci-hooks"],
        "ownedPaths": ["src/power-automate/", "scripts/"],
        "defaultBranchPrefix": "cursor/automation-",
        "commsAgentId": None,
        "escalatesTo": "master-pm",
        "status": "active",
    },
    {
        "agentId": "administration",
        "displayName": "Administration",
        "role": "Administration",
        "capabilities": ["entra", "rbac", "tenant-admin-assist"],
        "ownedPaths": ["PROJECT_ATLAS/Architecture/Track10_Entra_App_Registration.md"],
        "defaultBranchPrefix": "cursor/admin-",
        "commsAgentId": None,
        "escalatesTo": "owner",
        "status": "active",
    },
]


def schemas() -> None:
    write_json(
        ORCH / "schemas" / "task.schema.json",
        {
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "$id": "https://atlas.hvcg/orchestration/task.schema.json",
            "title": "AtlasOrchestrationTask",
            "type": "object",
            "required": [
                "id",
                "sprint",
                "title",
                "description",
                "assignedAgent",
                "priority",
                "status",
                "acceptanceCriteria",
            ],
            "properties": {
                "id": {"type": "string", "pattern": "^ATLAS-T-[0-9]{4,}$"},
                "sprint": {"type": ["integer", "string"]},
                "epic": {"type": ["string", "null"]},
                "feature": {"type": ["string", "null"]},
                "title": {"type": "string"},
                "description": {"type": "string"},
                "assignedAgent": {"type": ["string", "null"]},
                "priority": {"enum": ["P0", "P1", "P2", "P3"]},
                "complexity": {"enum": ["XS", "S", "M", "L", "XL"]},
                "estimatedEffortHours": {"type": ["number", "null"]},
                "dependencies": {"type": "array", "items": {"type": "string"}},
                "blockedBy": {"type": "array", "items": {"type": "string"}},
                "status": {"enum": TASK_STATES},
                "acceptanceCriteria": {"type": "array", "items": {"type": "string"}},
                "requiredReviews": {
                    "type": "array",
                    "items": {
                        "enum": ["qa", "architecture", "security", "documentation", "owner"]
                    },
                },
                "branch": {"type": ["string", "null"]},
                "worktree": {"type": ["string", "null"]},
                "affectedPaths": {"type": "array", "items": {"type": "string"}},
                "requiredTests": {"type": "array", "items": {"type": "string"}},
                "validationResults": {"type": "object"},
                "artifacts": {"type": "array", "items": {"type": "string"}},
                "commitReferences": {"type": "array", "items": {"type": "string"}},
                "ownerDecisions": {"type": "array", "items": {"type": "string"}},
                "completionSummary": {"type": ["string", "null"]},
                "releaseVersion": {"type": ["string", "null"]},
                "createdAt": {"type": "string"},
                "updatedAt": {"type": "string"},
                "claimedBy": {"type": ["string", "null"]},
                "claimedAt": {"type": ["string", "null"]},
            },
            "additionalProperties": True,
        },
    )
    write_json(
        ORCH / "schemas" / "agent.schema.json",
        {
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "$id": "https://atlas.hvcg/orchestration/agent.schema.json",
            "title": "AtlasOrchestrationAgent",
            "type": "object",
            "required": ["agentId", "displayName", "role", "status"],
            "properties": {
                "agentId": {"type": "string"},
                "displayName": {"type": "string"},
                "role": {"type": "string"},
                "capabilities": {"type": "array", "items": {"type": "string"}},
                "ownedPaths": {"type": "array", "items": {"type": "string"}},
                "defaultBranchPrefix": {"type": "string"},
                "commsAgentId": {"type": ["string", "null"]},
                "escalatesTo": {"type": "string"},
                "status": {"enum": ["active", "paused", "retired"]},
            },
        },
    )
    write_json(
        ORCH / "schemas" / "lock.schema.json",
        {
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "title": "AtlasLock",
            "type": "object",
            "required": ["lockId", "type", "resource", "holder", "acquiredAt", "expiresAt"],
            "properties": {
                "lockId": {"type": "string"},
                "type": {"enum": ["file", "directory", "task", "worktree", "branch"]},
                "resource": {"type": "string"},
                "holder": {"type": "string"},
                "taskId": {"type": ["string", "null"]},
                "acquiredAt": {"type": "string"},
                "expiresAt": {"type": "string"},
                "heartbeatAt": {"type": ["string", "null"]},
                "ttlMinutes": {"type": "integer"},
            },
        },
    )
    write_json(
        ORCH / "schemas" / "heartbeat.schema.json",
        {
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "title": "AtlasHeartbeat",
            "type": "object",
            "required": ["agentId", "status", "heartbeatTime"],
            "properties": {
                "agentId": {"type": "string"},
                "currentTask": {"type": ["string", "null"]},
                "currentBranch": {"type": ["string", "null"]},
                "status": {
                    "enum": ["Idle", "In Progress", "Blocked", "Waiting Review", "Offline"]
                },
                "currentAction": {"type": ["string", "null"]},
                "progressPercent": {"type": ["number", "null"]},
                "lastActivity": {"type": ["string", "null"]},
                "estimatedCompletion": {"type": ["string", "null"]},
                "blockers": {"type": "array", "items": {"type": "string"}},
                "nextAction": {"type": ["string", "null"]},
                "heartbeatTime": {"type": "string"},
            },
        },
    )
    write_json(
        ORCH / "schemas" / "decision.schema.json",
        {
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "title": "AtlasDecision",
            "type": "object",
            "required": ["id", "type", "title", "status", "createdAt"],
            "properties": {
                "id": {"type": "string"},
                "type": {"enum": ["ADR", "Owner", "Rejected", "Lesson"]},
                "title": {"type": "string"},
                "status": {"enum": ["Proposed", "Accepted", "Rejected", "Superseded"]},
                "createdAt": {"type": "string"},
                "decidedBy": {"type": ["string", "null"]},
                "summary": {"type": "string"},
                "links": {"type": "array", "items": {"type": "string"}},
            },
        },
    )
    write_json(
        ORCH / "schemas" / "sprint.schema.json",
        {
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "title": "AtlasSprint",
            "type": "object",
            "required": ["number", "name", "goals", "status"],
            "properties": {
                "number": {"type": "integer"},
                "name": {"type": "string"},
                "goals": {"type": "array", "items": {"type": "string"}},
                "status": {"enum": ["Planned", "Active", "Closed"]},
                "capacityHours": {"type": "number"},
                "velocityTarget": {"type": "number"},
                "taskIds": {"type": "array", "items": {"type": "string"}},
            },
        },
    )
    write_json(
        ORCH / "schemas" / "release.schema.json",
        {
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "title": "AtlasRelease",
            "type": "object",
            "required": ["version", "stage", "taskIds"],
            "properties": {
                "version": {"type": "string"},
                "stage": {
                    "enum": [
                        "Implementation",
                        "QA",
                        "Architecture",
                        "Security",
                        "Documentation",
                        "Release",
                        "Owner Approval",
                        "Production",
                    ]
                },
                "taskIds": {"type": "array", "items": {"type": "string"}},
                "ownerApprovalRequired": {"type": "boolean"},
            },
        },
    )


def registries() -> None:
    write_json(
        ORCH / "registry" / "agents.json",
        {
            "version": "1.0",
            "updatedAt": NOW,
            "owner": "Manuel Barela",
            "registrationPolicy": "Append agent objects matching schemas/agent.schema.json; never reuse retired agentIds.",
            "agents": AGENTS,
        },
    )
    write_json(
        ORCH / "registry" / "environments.json",
        {
            "version": "1.0",
            "updatedAt": NOW,
            "environments": [
                {
                    "id": "local",
                    "platform": "developer-workstation",
                    "purpose": "Elite OS Vite + scripts",
                    "azureSubscription": None,
                },
                {
                    "id": "development",
                    "platform": "microsoft",
                    "purpose": "Dataverse Dev + SWA Dev",
                    "dataverse": "https://org1131a2b0.crm.dynamics.com",
                    "swa": "https://zealous-rock-0090c7e1e.7.azurestaticapps.net",
                    "azureSubscriptionId": "ebc84d85-b5ff-4c4b-add1-b0a8de31b319",
                    "azureSubscriptionName": "HVCG Production",
                    "note": "Azure sub hosts Dev SWA; PP env remains Development",
                },
                {
                    "id": "staging",
                    "platform": "microsoft",
                    "purpose": "Pre-prod validation",
                    "status": "planned",
                },
                {
                    "id": "production",
                    "platform": "microsoft",
                    "purpose": "Customer-facing / owner-gated",
                    "azureSubscriptionId": "ebc84d85-b5ff-4c4b-add1-b0a8de31b319",
                    "powerPlatform": "gated",
                    "status": "azure-foundations-ready",
                },
            ],
            "deprecatedAzureSubscriptionId": "866189c6-5aa0-4037-8094-05771caceb0d",
        },
    )
    write_json(
        ORCH / "registry" / "infrastructure.json",
        {
            "version": "1.0",
            "subscriptionId": "ebc84d85-b5ff-4c4b-add1-b0a8de31b319",
            "subscriptionName": "HVCG Production",
            "regionPrimary": "westus3",
            "resources": [
                {"name": "rg-atlas-dev", "type": "resourceGroup"},
                {"name": "rg-atlas-prod", "type": "resourceGroup"},
                {"name": "rg-atlas-shared", "type": "resourceGroup"},
                {"name": "rg-atlas-network", "type": "resourceGroup"},
                {"name": "rg-atlas-security", "type": "resourceGroup"},
                {"name": "rg-atlas-monitoring", "type": "resourceGroup"},
                {"name": "law-atlas-prod", "type": "logAnalytics", "rg": "rg-atlas-monitoring"},
                {"name": "appi-atlas-prod", "type": "appInsights", "rg": "rg-atlas-monitoring"},
                {"name": "kv-atlas-hvcg-ebc84d85", "type": "keyVault", "rg": "rg-atlas-security"},
                {"name": "id-atlas-prod", "type": "managedIdentity", "rg": "rg-atlas-shared"},
                {
                    "name": "swa-atlas-elite-os-dev",
                    "type": "staticWebApp",
                    "rg": "rg-atlas-dev",
                    "url": "https://zealous-rock-0090c7e1e.7.azurestaticapps.net",
                },
                {"name": "budget-atlas-100", "type": "budget"},
            ],
        },
    )
    write_json(
        ORCH / "registry" / "branches.json",
        {
            "version": "1.0",
            "updatedAt": NOW,
            "convention": "cursor/<agent-or-track>-<slug>",
            "protected": ["main", "cursor/agent-communications"],
            "active": [
                {
                    "branch": "cursor/sprint12-engineering-orchestration",
                    "ownerAgent": "master-pm",
                    "purpose": "Sprint 12 Orchestration Platform",
                    "worktree": ".worktrees/sprint12-engineering-orchestration",
                },
                {
                    "branch": "cursor/sprint11-azure-production-migration",
                    "ownerAgent": "azure-platform",
                    "purpose": "Sprint 11 Azure Production (complete)",
                    "worktree": ".worktrees/sprint11-azure-production-migration",
                },
                {
                    "branch": "cursor/track10-elite-ui",
                    "ownerAgent": "elite-ui",
                    "purpose": "Elite UI design system + dashboard",
                    "worktree": ".worktrees/track10-elite-ui",
                },
            ],
        },
    )
    write_json(
        ORCH / "registry" / "ownership.json",
        {
            "version": "1.0",
            "updatedAt": NOW,
            "rules": [
                "Path ownership from agents.json ownedPaths is authoritative for locks.",
                "ORCHESTRATION/ is owned by master-pm; specialists may write heartbeats/locks/tasks assigned to them.",
                "Never claim another agent's branch without Master PM reassignment.",
                "agent-comms remains the message bus; ORCHESTRATION is the work SoR.",
            ],
            "pathOwners": {a["agentId"]: a["ownedPaths"] for a in AGENTS},
        },
    )


def templates() -> None:
    base = {
        "id": "TEMPLATE",
        "sprint": None,
        "epic": None,
        "feature": None,
        "title": "",
        "description": "",
        "assignedAgent": None,
        "priority": "P2",
        "complexity": "M",
        "estimatedEffortHours": 4,
        "dependencies": [],
        "blockedBy": [],
        "status": "Backlog",
        "acceptanceCriteria": [],
        "requiredReviews": ["qa"],
        "branch": None,
        "worktree": None,
        "affectedPaths": [],
        "requiredTests": [],
        "validationResults": {},
        "artifacts": [],
        "commitReferences": [],
        "ownerDecisions": [],
        "completionSummary": None,
        "releaseVersion": None,
        "createdAt": NOW,
        "updatedAt": NOW,
        "claimedBy": None,
        "claimedAt": None,
    }
    variants = {
        "feature-implementation.json": {
            **base,
            "title": "Implement feature",
            "requiredReviews": ["qa", "architecture"],
            "complexity": "L",
        },
        "bugfix.json": {
            **base,
            "title": "Fix defect",
            "priority": "P1",
            "complexity": "S",
            "requiredReviews": ["qa"],
        },
        "documentation.json": {
            **base,
            "title": "Update documentation",
            "assignedAgent": "documentation",
            "requiredReviews": ["documentation"],
            "complexity": "S",
        },
        "infrastructure.json": {
            **base,
            "title": "Provision or change Azure infrastructure",
            "assignedAgent": "azure-platform",
            "requiredReviews": ["architecture", "security", "qa"],
            "complexity": "L",
        },
        "review.json": {
            **base,
            "title": "Perform review gate",
            "status": "Waiting Review",
            "requiredReviews": ["qa"],
            "complexity": "XS",
        },
        "release.json": {
            **base,
            "title": "Promote release",
            "assignedAgent": "qa-release",
            "requiredReviews": ["qa", "architecture", "security", "documentation", "owner"],
            "complexity": "M",
            "priority": "P1",
        },
    }
    for name, body in variants.items():
        write_json(ORCH / "queue" / "templates" / name, body)


def task(tid: str, **kwargs) -> dict:
    t = {
        "id": tid,
        "sprint": 12,
        "epic": "ORCH-PLATFORM",
        "feature": "orchestration-v1",
        "title": "",
        "description": "",
        "assignedAgent": "master-pm",
        "priority": "P0",
        "complexity": "M",
        "estimatedEffortHours": 4,
        "dependencies": [],
        "blockedBy": [],
        "status": "Ready",
        "acceptanceCriteria": [],
        "requiredReviews": ["qa", "architecture"],
        "branch": "cursor/sprint12-engineering-orchestration",
        "worktree": ".worktrees/sprint12-engineering-orchestration",
        "affectedPaths": ["PROJECT_ATLAS/ORCHESTRATION/"],
        "requiredTests": ["scripts/orchestration/tests/test_orch.py"],
        "validationResults": {},
        "artifacts": [],
        "commitReferences": [],
        "ownerDecisions": [],
        "completionSummary": None,
        "releaseVersion": "orch-1.0",
        "createdAt": NOW,
        "updatedAt": NOW,
        "claimedBy": None,
        "claimedAt": None,
    }
    t.update(kwargs)
    return t


def seed_tasks() -> list[dict]:
    tasks = [
        task(
            "ATLAS-T-1201",
            title="Stand up ORCHESTRATION directory and schemas",
            description="Create PROJECT_ATLAS/ORCHESTRATION with JSON schemas for task/agent/lock/heartbeat/decision/sprint/release.",
            assignedAgent="master-pm",
            status="In Progress",
            claimedBy="master-pm",
            claimedAt=NOW,
            acceptanceCriteria=[
                "schemas/*.json exist and validate sample objects",
                "README documents operating model",
            ],
            complexity="L",
            estimatedEffortHours=8,
        ),
        task(
            "ATLAS-T-1202",
            title="Register all engineering agents",
            description="Populate registry/agents.json with Master PM through Administration roles; document registration policy.",
            assignedAgent="master-pm",
            status="In Progress",
            claimedBy="master-pm",
            claimedAt=NOW,
            acceptanceCriteria=[
                "Minimum 18 roles registered",
                "ownedPaths and escalatesTo set",
            ],
            dependencies=["ATLAS-T-1201"],
        ),
        task(
            "ATLAS-T-1203",
            title="Implement task engine CLI (claim/list/complete)",
            description="Ship scripts/orchestration for discovering Ready tasks, claiming with locks, heartbeats, and completion.",
            assignedAgent="automation",
            status="In Progress",
            claimedBy="master-pm",
            claimedAt=NOW,
            acceptanceCriteria=[
                "atlas-orch.py supports list-ready, claim, heartbeat, complete, locks",
                "Unit tests pass",
            ],
            dependencies=["ATLAS-T-1201"],
            complexity="XL",
            estimatedEffortHours=12,
        ),
        task(
            "ATLAS-T-1204",
            title="Seed engineering memory, ADRs, knowledge graph",
            description="Create memory/, decisions/adr, knowledge graph linking Microsoft assets to Elite UI and Azure.",
            assignedAgent="knowledge-platform",
            status="In Progress",
            claimedBy="master-pm",
            claimedAt=NOW,
            acceptanceCriteria=[
                "ADR-0001 and ADR-0002 accepted",
                "knowledge/graph.json links React, Dataverse, Azure, Graph",
            ],
            dependencies=["ATLAS-T-1201"],
        ),
        task(
            "ATLAS-T-1205",
            title="Define review + release workflows and Sprint 13 backlog",
            description="Codify promotion pipeline and seed measurable Sprint 13 backlog tasks as Ready.",
            assignedAgent="qa-release",
            status="In Progress",
            claimedBy="master-pm",
            claimedAt=NOW,
            acceptanceCriteria=[
                "reviews/workflow.md and releases/pipeline.md exist",
                "Sprint 13 backlog has actionable Ready tasks",
            ],
            dependencies=["ATLAS-T-1201", "ATLAS-T-1202"],
        ),
        # Sprint 13 seeds (Ready for agents to discover)
        task(
            "ATLAS-T-1301",
            sprint=13,
            epic="ELITE-UI-UAT",
            feature="dataverse-cors-swa",
            title="Apply Dataverse CORS for Elite OS SWA origin",
            description="Allow https://zealous-rock-0090c7e1e.7.azurestaticapps.net (and localhost) in Dataverse CORS so signed-in dashboard works hosted.",
            assignedAgent="power-platform",
            priority="P0",
            status="Ready",
            claimedBy=None,
            claimedAt=None,
            requiredReviews=["qa", "security"],
            affectedPaths=["PROJECT_ATLAS/ORCHESTRATION/registry/environments.json"],
            acceptanceCriteria=[
                "CORS includes SWA + localhost origins",
                "Signed-in Elite OS loads Dataverse tracks on SWA URL",
            ],
            branch=None,
            worktree=None,
            complexity="M",
            estimatedEffortHours=3,
            ownerDecisions=[],
        ),
        task(
            "ATLAS-T-1302",
            sprint=13,
            epic="AZURE-HARDENING",
            feature="kv-purge-protection",
            title="Enable Key Vault purge protection",
            description="Enable purge protection on kv-atlas-hvcg-ebc84d85 before storing long-lived production secrets.",
            assignedAgent="azure-platform",
            priority="P1",
            status="Ready",
            claimedBy=None,
            claimedAt=None,
            requiredReviews=["security", "architecture"],
            acceptanceCriteria=["Purge protection enabled", "Inventory updated"],
            branch=None,
            worktree=None,
            complexity="S",
            estimatedEffortHours=1,
        ),
        task(
            "ATLAS-T-1303",
            sprint=13,
            epic="ELITE-UI-UAT",
            feature="app-insights-sdk",
            title="Wire Application Insights into Elite OS",
            description="Add App Insights JS SDK using appi-atlas-prod connection string from Key Vault / build secret — no secrets in git.",
            assignedAgent="elite-ui",
            priority="P1",
            status="Ready",
            claimedBy=None,
            claimedAt=None,
            requiredReviews=["qa", "security"],
            acceptanceCriteria=["Page views appear in App Insights", "No secrets committed"],
            affectedPaths=["apps/atlas-elite-os/"],
            branch=None,
            worktree=None,
            complexity="M",
            estimatedEffortHours=4,
            dependencies=["ATLAS-T-1302"],
        ),
        task(
            "ATLAS-T-1304",
            sprint=13,
            epic="ELITE-UI-UAT",
            feature="owner-uat-dashboard",
            title="Owner UAT: Design System + Executive Dashboard on SWA",
            description="Facilitate Manuel Barela UAT of Design System and Executive Dashboard on Microsoft-hosted URL; capture defects as tasks.",
            assignedAgent="qa-release",
            priority="P0",
            status="Ready",
            claimedBy=None,
            claimedAt=None,
            requiredReviews=["qa", "owner"],
            acceptanceCriteria=["UAT checklist completed", "Pass/fail recorded in task validationResults"],
            dependencies=["ATLAS-T-1301"],
            branch=None,
            worktree=None,
            complexity="M",
            estimatedEffortHours=4,
        ),
        task(
            "ATLAS-T-1305",
            sprint=13,
            epic="ORCH-ADOPTION",
            feature="agent-onboarding",
            title="Onboard specialist agents to discover Ready queue",
            description="Update agent handbooks and AGENT_ASSIGNMENTS so every agent starts by running orchestration list-ready + heartbeat.",
            assignedAgent="documentation",
            priority="P1",
            status="Ready",
            claimedBy=None,
            claimedAt=None,
            requiredReviews=["documentation", "qa"],
            acceptanceCriteria=[
                "AGENT_ASSIGNMENTS points to ORCHESTRATION",
                "At least 3 agent handbooks reference claim workflow",
            ],
            branch=None,
            worktree=None,
            complexity="S",
            estimatedEffortHours=3,
        ),
        task(
            "ATLAS-T-1306",
            sprint=13,
            epic="ORCH-ADOPTION",
            feature="comms-bridge",
            title="Bridge agent-comms status requests to orchestration heartbeats",
            description="When Master PM requests status, agents update ORCHESTRATION heartbeats and optionally ack via .agent-comms.",
            assignedAgent="communications",
            priority="P2",
            status="Ready",
            claimedBy=None,
            claimedAt=None,
            requiredReviews=["qa"],
            acceptanceCriteria=["Documented bridge procedure", "Sample heartbeat sync script"],
            branch=None,
            worktree=None,
            complexity="M",
            estimatedEffortHours=4,
        ),
    ]
    return tasks


def write_tasks(tasks: list[dict]) -> None:
    index = {"updatedAt": NOW, "tasks": []}
    for t in tasks:
        write_json(ORCH / "queue" / "tasks" / f"{t['id']}.json", t)
        index["tasks"].append(
            {
                "id": t["id"],
                "sprint": t["sprint"],
                "status": t["status"],
                "assignedAgent": t["assignedAgent"],
                "priority": t["priority"],
                "title": t["title"],
            }
        )
    write_json(ORCH / "queue" / "index.json", index)


def sprints(tasks: list[dict]) -> None:
    s12_ids = [t["id"] for t in tasks if t["sprint"] == 12]
    s13_ids = [t["id"] for t in tasks if t["sprint"] == 13]
    write_json(
        ORCH / "sprints" / "sprint-12.json",
        {
            "number": 12,
            "name": "Engineering Orchestration Platform",
            "status": "Active",
            "goals": [
                "Ship Atlas ORCHESTRATION as permanent engineering OS",
                "Register all specialist agents",
                "Provide claimable task queue + locks + heartbeats",
                "Seed Sprint 13 Ready backlog",
            ],
            "capacityHours": 40,
            "velocityTarget": 30,
            "taskIds": s12_ids,
            "riskSummary": "Adoption risk if agents ignore queue — mitigated by handbook updates in Sprint 13.",
            "executiveSummary": "Sprint 12 builds the coordination layer so Atlas scales beyond owner-prompted agents.",
            "releaseReadiness": "orch-1.0 ready when ATLAS-T-1201..1205 Closed",
        },
    )
    write_json(
        ORCH / "sprints" / "sprint-13-backlog.json",
        {
            "number": 13,
            "name": "Hosted Elite UAT + Orchestration Adoption",
            "status": "Planned",
            "goals": [
                "Dataverse CORS + signed-in SWA dashboard",
                "Owner UAT of Design System + Dashboard",
                "Azure hardening (KV purge protection, App Insights)",
                "All agents discover work from ORCHESTRATION",
            ],
            "capacityHours": 40,
            "velocityTarget": 28,
            "taskIds": s13_ids,
        },
    )
    write_json(
        ORCH / "sprints" / "current.json",
        {
            "sprint": 12,
            "ref": "sprints/sprint-12.json",
            "updatedAt": NOW,
            "nextSprint": 13,
            "nextSprintRef": "sprints/sprint-13-backlog.json",
        },
    )


def locks_heartbeats() -> None:
    write_json(
        ORCH / "locks" / "index.json",
        {
            "updatedAt": NOW,
            "policy": {
                "defaultTtlMinutes": 120,
                "heartbeatRenewMinutes": 30,
                "staleAfterMinutes": 45,
                "types": ["file", "directory", "task", "worktree", "branch"],
            },
            "activeLockIds": ["LOCK-ORCH-DIR-S12"],
        },
    )
    write_json(
        ORCH / "locks" / "active" / "LOCK-ORCH-DIR-S12.json",
        {
            "lockId": "LOCK-ORCH-DIR-S12",
            "type": "directory",
            "resource": "PROJECT_ATLAS/ORCHESTRATION/",
            "holder": "master-pm",
            "taskId": "ATLAS-T-1201",
            "acquiredAt": NOW,
            "expiresAt": "2099-01-01T00:00:00Z",
            "heartbeatAt": NOW,
            "ttlMinutes": 999999,
            "note": "Sprint 12 foundation lock; release when Sprint 12 tasks Closed",
        },
    )
    hb = {
        "agentId": "master-pm",
        "currentTask": "ATLAS-T-1201",
        "currentBranch": "cursor/sprint12-engineering-orchestration",
        "status": "In Progress",
        "currentAction": "Implementing Atlas Engineering Orchestration Platform v1.0",
        "progressPercent": 70,
        "lastActivity": NOW,
        "estimatedCompletion": NOW,
        "blockers": [],
        "nextAction": "Finalize scripts, tests, executive deliverables",
        "heartbeatTime": NOW,
    }
    write_json(ORCH / "heartbeats" / "agents" / "master-pm.json", hb)
    write_json(
        ORCH / "heartbeats" / "index.json",
        {"updatedAt": NOW, "agents": {"master-pm": "heartbeats/agents/master-pm.json"}},
    )


def decisions_memory() -> None:
    write_json(
        ORCH / "decisions" / "log.json",
        {
            "updatedAt": NOW,
            "entries": [
                {
                    "id": "ADR-0001",
                    "type": "ADR",
                    "title": "Repository-state orchestration as Atlas engineering OS",
                    "status": "Accepted",
                    "createdAt": NOW,
                    "decidedBy": "master-pm",
                    "summary": "All engineering work is coordinated via PROJECT_ATLAS/ORCHESTRATION shared repo state.",
                    "links": ["decisions/adr/ADR-0001-orchestration-platform.md"],
                },
                {
                    "id": "ADR-0002",
                    "type": "ADR",
                    "title": "No assumption of automatic multi-agent launch",
                    "status": "Accepted",
                    "createdAt": NOW,
                    "decidedBy": "master-pm",
                    "summary": "Agents discover Ready tasks from the queue; Cursor does not auto-spawn specialists.",
                    "links": ["decisions/adr/ADR-0002-repo-state-not-auto-launch.md"],
                },
                {
                    "id": "OD-S11-001",
                    "type": "Owner",
                    "title": "HVCG Production is permanent Azure subscription",
                    "status": "Accepted",
                    "createdAt": "2026-07-19T00:00:00Z",
                    "decidedBy": "Manuel Barela",
                    "summary": "Subscription ebc84d85-b5ff-4c4b-add1-b0a8de31b319; deprecate 866189c6 forever.",
                    "links": ["PROJECT_ATLAS/Sprints/Sprint11_Executive_Status_Report.md"],
                },
            ],
        },
    )
    write_text(
        ORCH / "decisions" / "adr" / "ADR-0001-orchestration-platform.md",
        """# ADR-0001 — Repository-state orchestration platform

## Status
Accepted — 2026-07-19

## Context
Atlas grew many Cursor agents and worktrees. Owner prompting does not scale. We need an enterprise coordination layer.

## Decision
`PROJECT_ATLAS/ORCHESTRATION/` is the system of record for tasks, locks, heartbeats, decisions, releases, and knowledge.

`.agent-comms/` remains the asynchronous message bus.

## Consequences
- Every Sprint 13+ task must exist as `queue/tasks/ATLAS-T-*.json`.
- Agents claim work via orchestration CLI before editing owned paths.
- Metrics and executive dashboards read from orchestration indexes.
""",
    )
    write_text(
        ORCH / "decisions" / "adr" / "ADR-0002-repo-state-not-auto-launch.md",
        """# ADR-0002 — Do not assume Cursor auto-launches agents

## Status
Accepted — 2026-07-19

## Context
Product Owner directed that orchestration must not depend on automatic multi-agent spawn.

## Decision
Specialists participate by reading shared repository state (Ready queue, heartbeats, locks). Discovery is pull-based.

## Consequences
- Master PM seeds Ready tasks; agents poll `list-ready`.
- Escalation to owner only for finance, permissions, legal, destructive actions, or multi-path business choices.
""",
    )
    write_text(
        ORCH / "decisions" / "rejected-ideas" / "RJ-001-external-jira-only.md",
        """# Rejected — Replace Atlas orchestration with external Jira-only

Rejected 2026-07-19. External trackers cannot bind git worktrees, path locks, and Microsoft asset graph without dual-entry. Atlas may *export* to Planner/ADO later; repo state remains SoR.
""",
    )
    write_text(
        ORCH / "memory" / "architecture.md",
        """# Architecture memory (living)

- Microsoft-native only: Entra, Dataverse, Power Apps/Automate, SharePoint, Teams, Graph, Azure, Outlook, OneDrive.
- Elite OS is MSAL SPA on Azure Static Web Apps; model-driven app remains admin SoR.
- Azure permanent sub: HVCG Production `ebc84d85-b5ff-4c4b-add1-b0a8de31b319`.
- Orchestration SoR: `PROJECT_ATLAS/ORCHESTRATION/`.
- Comms bus: `.agent-comms/`.
""",
    )
    write_text(
        ORCH / "memory" / "lessons-learned.md",
        """# Lessons learned

1. Disabled Azure subscriptions block SWA — validate `az account show` state early (Sprint 11).
2. Device-code auth expires mid-provision — refresh before long Dataverse/Azure jobs (Track 7).
3. Provider registration `--wait` can hang; register async then poll.
4. Free SWA regions ≠ resource group region (use westus2 for SWA).
5. Agents without a Ready queue stall on owner prompts — fixed by Sprint 12 orchestration.
""",
    )
    write_text(
        ORCH / "memory" / "standards" / "coding.md",
        """# Coding conventions

- Prefer focused diffs; no drive-by refactors.
- TypeScript/React: follow existing Vite + Fluent UI patterns in `packages/atlas-design-system`.
- PowerShell deploy scripts: environments development|test|production gates.
- Never commit `.env.local`, tokens, or connection strings.
- Task IDs in commit bodies when closing work: `Closes ATLAS-T-####`.
""",
    )
    write_text(
        ORCH / "memory" / "standards" / "ui.md",
        """# UI conventions

- Elite UI consumes design-system components only for new screens.
- HVCG brand first on promotional surfaces; Fluent tokens for app chrome.
- Development/UAT builds must set `VITE_BLOCK_LIVE_CLIENT_COMMS=true`.
- No live client communications from UI agents.
""",
    )
    write_text(
        ORCH / "memory" / "standards" / "microsoft-platform.md",
        """# Microsoft platform conventions

- Entra SPA for browser apps; managed identity for Azure-to-Azure.
- Dataverse tables prefixed `hvcg_atlas*` for Atlas ops entities.
- Key Vault RBAC (not access policies).
- Never target deprecated Azure subscription `866189c6-5aa0-4037-8094-05771caceb0d`.
- Production Power Platform cutover requires explicit owner gate.
""",
    )
    write_json(
        ORCH / "memory" / "technical-debt.json",
        {
            "updatedAt": NOW,
            "items": [
                {
                    "id": "TD-001",
                    "title": "Key Vault purge protection disabled",
                    "severity": "medium",
                    "ownerAgent": "azure-platform",
                    "relatedTask": "ATLAS-T-1302",
                },
                {
                    "id": "TD-002",
                    "title": "Elite OS bundle >500kB; needs code-splitting",
                    "severity": "low",
                    "ownerAgent": "elite-ui",
                },
                {
                    "id": "TD-003",
                    "title": "agent-comms registry worktree paths can go stale",
                    "severity": "medium",
                    "ownerAgent": "communications",
                    "relatedTask": "ATLAS-T-1306",
                },
            ],
        },
    )
    write_json(
        ORCH / "memory" / "risks.json",
        {
            "updatedAt": NOW,
            "items": [
                {
                    "id": "RISK-001",
                    "title": "Agents bypass orchestration and edit without locks",
                    "likelihood": "medium",
                    "impact": "high",
                    "mitigation": "Handbook mandate + CI check for Ready claim in Sprint 13",
                },
                {
                    "id": "RISK-002",
                    "title": "Dataverse CORS missing for SWA",
                    "likelihood": "high",
                    "impact": "medium",
                    "mitigation": "ATLAS-T-1301",
                },
            ],
        },
    )
    write_json(
        ORCH / "memory" / "opportunities.json",
        {
            "updatedAt": NOW,
            "items": [
                {
                    "id": "OPP-001",
                    "title": "Export orchestration board to Microsoft Planner",
                    "horizon": "6-12 months",
                },
                {
                    "id": "OPP-002",
                    "title": "Dataverse tables mirroring ORCHESTRATION tasks for Command Center",
                    "horizon": "1-2 sprints",
                },
                {
                    "id": "OPP-003",
                    "title": "Auto-generate knowledge graph edges from repo path analysis",
                    "horizon": "3-6 months",
                },
            ],
        },
    )


def knowledge() -> None:
    nodes = [
        {"id": "n-elite-os", "type": "react-app", "name": "Atlas Elite OS", "path": "apps/atlas-elite-os"},
        {"id": "n-design-system", "type": "component-library", "name": "Atlas Design System", "path": "packages/atlas-design-system"},
        {"id": "n-command-center", "type": "power-app", "name": "Atlas Command Center", "appId": "dea8a490-4b82-f111-ab0e-6045bd0193e8"},
        {"id": "n-dataverse-dev", "type": "dataverse", "name": "HVCG Development", "url": "https://org1131a2b0.crm.dynamics.com"},
        {"id": "n-swa-dev", "type": "azure-resource", "name": "swa-atlas-elite-os-dev", "url": "https://zealous-rock-0090c7e1e.7.azurestaticapps.net"},
        {"id": "n-kv", "type": "azure-resource", "name": "kv-atlas-hvcg-ebc84d85"},
        {"id": "n-appi", "type": "azure-resource", "name": "appi-atlas-prod"},
        {"id": "n-entra-spa", "type": "entra-app", "name": "HVCG-Atlas-Elite-OS-DEV", "clientId": "49d20328-fe3c-40ec-9d0e-99f57e4646e4"},
        {"id": "n-graph", "type": "api", "name": "Microsoft Graph"},
        {"id": "n-orch", "type": "platform", "name": "Engineering Orchestration", "path": "PROJECT_ATLAS/ORCHESTRATION"},
        {"id": "n-comms", "type": "platform", "name": "Agent Comms Bus", "path": ".agent-comms"},
    ]
    edges = [
        {"from": "n-elite-os", "to": "n-design-system", "rel": "uses"},
        {"from": "n-elite-os", "to": "n-entra-spa", "rel": "authenticates-via"},
        {"from": "n-elite-os", "to": "n-dataverse-dev", "rel": "reads"},
        {"from": "n-elite-os", "to": "n-graph", "rel": "calls"},
        {"from": "n-elite-os", "to": "n-swa-dev", "rel": "hosted-on"},
        {"from": "n-command-center", "to": "n-dataverse-dev", "rel": "bound-to"},
        {"from": "n-swa-dev", "to": "n-kv", "rel": "future-secrets-via-mi"},
        {"from": "n-elite-os", "to": "n-appi", "rel": "telemetry-planned"},
        {"from": "n-orch", "to": "n-comms", "rel": "complements"},
        {"from": "n-orch", "to": "n-elite-os", "rel": "coordinates-work-for"},
    ]
    write_json(ORCH / "knowledge" / "graph.json", {"updatedAt": NOW, "nodes": nodes, "edges": edges})
    write_json(
        ORCH / "knowledge" / "index.json",
        {
            "updatedAt": NOW,
            "strategy": "Manual curated graph + per-node notes; future agents append nodes/edges when shipping features.",
            "graph": "knowledge/graph.json",
            "nodeDir": "knowledge/nodes/",
            "coverage": [
                "React pages",
                "Power Apps",
                "Dataverse",
                "SharePoint (extend)",
                "Power Automate (extend)",
                "Azure resources",
                "APIs",
                "Components",
                "Design tokens (via design-system node)",
                "Workspaces",
                "Features",
                "Owners (via agent registry)",
            ],
        },
    )
    write_json(
        ORCH / "knowledge" / "nodes" / "n-elite-os.json",
        {
            "id": "n-elite-os",
            "summary": "React 19 + Vite Elite executive experience with MSAL and Dataverse adapters.",
            "owners": ["elite-ui"],
            "features": ["executive-dashboard", "design-system-consumption"],
        },
    )
    write_json(
        ORCH / "knowledge" / "nodes" / "n-orch.json",
        {
            "id": "n-orch",
            "summary": "Permanent engineering OS for tasks, locks, reviews, releases, memory.",
            "owners": ["master-pm"],
            "features": ["task-engine", "heartbeats", "knowledge-graph"],
        },
    )


def reviews_releases() -> None:
    write_text(
        ORCH / "reviews" / "workflow.md",
        """# Review workflow

## Gates (in order when requiredReviews lists them)

1. **Implementation complete** → status `Waiting Review`
2. **QA** → `QA` then pass/fail
3. **Architecture Review** → `Architecture Review`
4. **Security Review** → `Security Review`
5. **Documentation** → docs artifacts linked
6. **Approved** → ready for merge
7. **Merged** → commit SHAs recorded
8. **Released** / **Closed**

## Rules

- Reviewers claim the task (or a linked review task) before commenting.
- Failures return status to `In Progress` with `blockedBy` notes.
- Owner review only when `owner` in requiredReviews or escalation policy triggers.
""",
    )
    write_json(
        ORCH / "reviews" / "queue.json",
        {"updatedAt": NOW, "waiting": [], "policyRef": "reviews/workflow.md"},
    )
    write_text(
        ORCH / "releases" / "pipeline.md",
        """# Release promotion pipeline

```
Implementation → QA → Architecture → Security → Documentation → Release → Owner Approval (if required) → Production
```

## Mapping to task status

| Pipeline stage | Task status |
|----------------|-------------|
| Implementation | In Progress / Waiting Review |
| QA | QA |
| Architecture | Architecture Review |
| Security | Security Review |
| Documentation | Waiting Review (docs) / artifacts |
| Release | Approved → Merged |
| Owner Approval | status note + ownerDecisions[] |
| Production | Released |

## Environments

Use `registry/environments.json`. Production Power Platform remains owner-gated separately from Azure Production foundations.
""",
    )
    write_json(
        ORCH / "releases" / "board.json",
        {
            "updatedAt": NOW,
            "active": [
                {
                    "version": "orch-1.0",
                    "stage": "Implementation",
                    "taskIds": ["ATLAS-T-1201", "ATLAS-T-1202", "ATLAS-T-1203", "ATLAS-T-1204", "ATLAS-T-1205"],
                    "ownerApprovalRequired": False,
                }
            ],
            "upcoming": [{"version": "elite-os-dev-uat", "stage": "Implementation", "taskIds": ["ATLAS-T-1301", "ATLAS-T-1303", "ATLAS-T-1304"]}],
        },
    )
    write_json(
        ORCH / "releases" / "merge-queue.json",
        {
            "updatedAt": NOW,
            "policy": "One merge at a time into integration branches; path locks must be held by merger.",
            "queue": [],
        },
    )


def calendar_deps_metrics_dash() -> None:
    write_json(
        ORCH / "calendar" / "engineering-calendar.json",
        {
            "updatedAt": NOW,
            "events": [
                {
                    "id": "CAL-S12",
                    "title": "Sprint 12 — Orchestration Platform",
                    "start": "2026-07-19",
                    "end": "2026-07-19",
                    "type": "sprint",
                },
                {
                    "id": "CAL-S13",
                    "title": "Sprint 13 — Hosted UAT + Adoption",
                    "start": "2026-07-20",
                    "end": "2026-07-27",
                    "type": "sprint",
                },
            ],
        },
    )
    write_json(
        ORCH / "dependencies" / "graph.json",
        {
            "updatedAt": NOW,
            "edges": [
                {"from": "ATLAS-T-1202", "to": "ATLAS-T-1201", "type": "depends-on"},
                {"from": "ATLAS-T-1203", "to": "ATLAS-T-1201", "type": "depends-on"},
                {"from": "ATLAS-T-1204", "to": "ATLAS-T-1201", "type": "depends-on"},
                {"from": "ATLAS-T-1205", "to": "ATLAS-T-1201", "type": "depends-on"},
                {"from": "ATLAS-T-1303", "to": "ATLAS-T-1302", "type": "depends-on"},
                {"from": "ATLAS-T-1304", "to": "ATLAS-T-1301", "type": "depends-on"},
            ],
        },
    )
    write_json(
        ORCH / "metrics" / "engineering-metrics.json",
        {
            "updatedAt": NOW,
            "sprint": 12,
            "tasksTotal": 11,
            "tasksReady": 6,
            "tasksInProgress": 5,
            "agentsRegistered": len(AGENTS),
            "openRisks": 2,
            "openDebt": 3,
            "activeLocks": 1,
            "velocityNotes": "Baseline sprint for orchestration; measure claim-to-close from Sprint 13.",
        },
    )
    write_json(
        ORCH / "dashboards" / "executive.json",
        {
            "updatedAt": NOW,
            "headline": "Sprint 12: Engineering Orchestration Platform v1.0 in implementation",
            "azureProduction": "HVCG Production online",
            "eliteOsUrl": "https://zealous-rock-0090c7e1e.7.azurestaticapps.net",
            "orchestrationStatus": "active",
            "sprint": 12,
            "nextSprintGoals": [
                "CORS + signed-in SWA",
                "Owner UAT dashboard",
                "Agent adoption of Ready queue",
            ],
            "blockersRequiringOwner": [],
            "risks": ["RISK-001", "RISK-002"],
        },
    )
    write_json(
        ORCH / "dashboards" / "owner.json",
        {
            "updatedAt": NOW,
            "owner": "Manuel Barela",
            "escalateOnlyWhen": [
                "Financial approval",
                "Microsoft permission",
                "Legal/compliance",
                "Destructive action",
                "Multiple valid architectural paths needing business direction",
            ],
            "openOwnerDecisions": [],
            "playUrls": {
                "eliteOsDev": "https://zealous-rock-0090c7e1e.7.azurestaticapps.net",
                "commandCenterDev": "https://org1131a2b0.crm.dynamics.com/main.aspx?appid=dea8a490-4b82-f111-ab0e-6045bd0193e8",
            },
            "recommendedAttention": [
                "Optional: approve Dataverse CORS for SWA (ATLAS-T-1301) if Master PM lacks admin",
            ],
        },
    )


def main() -> None:
    schemas()
    registries()
    templates()
    tasks = seed_tasks()
    write_tasks(tasks)
    sprints(tasks)
    locks_heartbeats()
    decisions_memory()
    knowledge()
    reviews_releases()
    calendar_deps_metrics_dash()
    print(f"Bootstrapped ORCHESTRATION at {ORCH}")
    print(f"Agents: {len(AGENTS)} | Tasks: {len(tasks)}")


if __name__ == "__main__":
    main()
