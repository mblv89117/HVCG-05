# ADR-0005 — Data Engineering Agent Registration (Orchestration)

| Field | Value |
|-------|--------|
| ID | ADR-0005 |
| Title | Register Data Engineering on Atlas Engineering Orchestration Platform |
| Status | Accepted (registration verified); parent task ATLAS-T-1202 still Waiting Review |
| Date | 2026-07-20 |
| Decision owner | system-architect (architecture review) |
| Related task | ATLAS-T-1202 (assignedAgent: master-pm) |

## Context

Sprint 12 stands up `PROJECT_ATLAS/ORCHESTRATION/` as the work SoR. All specialist roles must be registered with `ownedPaths`, capabilities, and escalation before claiming Ready work. Data Engineering is required for schema, ETL/sample data, migrations, and Dataverse model support for Elite OS / Atlas.

## Problem

Confirm whether `data-engineering` is correctly registered for Microsoft-native Atlas operations without path collisions or over-broad ownership.

## Options considered

1. Omit Data Engineering until Sprint 13  
2. Register with broad ownership (`docs/data-model/`, `src/sharepoint/lists/`, Dataverse solution folders)  
3. Register with least-privilege paths (`sample-data/`, `releases/migrations/`) + Dataverse model capability; shared contracts remain under system-architect / power-platform  

## Decision

**Option 3 — verified present in orchestration registry.**

Canonical entry (`registry/agents.json`):

| Field | Value |
|-------|--------|
| agentId | `data-engineering` |
| displayName / role | Data Engineering |
| status | `active` |
| capabilities | `schema`, `etl`, `sample-data`, `dataverse-model` |
| ownedPaths | `sample-data/`, `releases/migrations/` |
| defaultBranchPrefix | `cursor/data-` |
| commsAgentId | `null` |
| escalatesTo | `master-pm` |

Mirrored in `registry/ownership.json` pathOwners. Idle heartbeat published by agent.

## Rationale

- Least-privilege ownership avoids colliding with `system-architect` (`docs/architecture/`) and `power-platform` (Dataverse/solution packages).  
- Capabilities declare Dataverse modeling intent; **shared entity contracts still require architecture review** before changing cross-module schemas.  
- Matches Constitution: Microsoft-native; claim-before-edit; orchestration as work SoR.  
- Meets ATLAS-T-1202 acceptance slice for this role (part of ≥18 registered agents).

## Consequences

- Data Engineering may claim Ready tasks assigned to `data-engineering` only.  
- Changes to shared list/Dataverse contracts → architecture review (not unilateral DE commits).  
- Optional future additive: knowledge-graph node for DE; branch entry when first worktree is created; `commsAgentId` if bus bridge is required (communications owns that).  

## Microsoft-native / security / scalability / coupling

| Lens | Assessment |
|------|------------|
| Microsoft-native | Compliant (Dataverse/SharePoint/sample packs; no competing datastore) |
| Security | Least-privilege paths; no Production env ownership |
| Scalability | Migrations + sample-data ownership supports controlled growth |
| Coupling | Low path coupling; capability coupling to power-platform for live table deploy |
| Data ownership | Clear: DE owns sample/migration artifacts; SoR tables remain platform-owned |
| SaaS readiness | Compatible; migrations pattern reusable |

## Migration / testing / rollback

- No runtime migration. Registration is metadata-only.  
- Rollback: set `status=retired` (do not reuse agentId).  
- Parent pack ATLAS-T-1202 still requires QA then Architecture Review gate for the full 18-agent set.

## Related files

- `PROJECT_ATLAS/ORCHESTRATION/registry/agents.json`  
- `PROJECT_ATLAS/ORCHESTRATION/registry/ownership.json`  
- `PROJECT_ATLAS/ORCHESTRATION/queue/tasks/ATLAS-T-1202.json`  
- `PROJECT_ATLAS/ORCHESTRATION/heartbeats/agents/data-engineering.json`  
