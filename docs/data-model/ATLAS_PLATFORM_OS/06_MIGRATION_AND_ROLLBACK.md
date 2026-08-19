# 06 — Versioned Migration & Rollback

## Version chain

| Migration id | From | To | Layer | Status |
|--------------|------|----|-------|--------|
| `20260714_001_baseline_v1_0_0` | — | 1.0.0 | Product V1 | Active |
| `20260714_002_intelligence_ai_backup_v1_1_0` | 1.0.0 | 1.1.0 | Product | Active |
| `20260715_001_opportunity_crm_module` | 1.1.0 | 1.1.0 | Product CRM | Active |
| `20260720_001_atlas_data_foundation_v1` | 1.1.0 | 1.2.0-draft | Product foundation | Draft |
| **`20260720_002_atlas_platform_os_v1`** | **1.2.0-draft** | **platform-os-1.0.0-draft** | **Platform OS** | **Draft** |

Apply order: baseline → … → `001` foundation (org/workspace/metric seeds) → **`002` platform OS**.

`002` depends on Organizations/Workspaces/Roles from `001` where overlapping; `002` adds remaining platform entities and TenantId hardening.

## Migration pack requirements (every platform change)

1. Unique version id + from/to  
2. `additiveOnly` preferred  
3. `rollbackSteps` explicit  
4. `requiresApprovalFrom` includes Architecture, Power Platform, Knowledge Platform, AI Governance, Master PM (+ Security/QA/owner for Prod)  
5. `selfApprovalForbidden: true`  
6. Schema snapshot before apply  
7. Downstream dependency list  

## Rollback pattern

| Change type | Rollback |
|-------------|----------|
| New empty lists | Remove in Dev after backup; leave in Prod unused if already created |
| Additive columns | Leave unused; feature-flag consumers off |
| Dual-write cutover | Re-enable legacy writers; stop canonical writes |
| Dataverse publish | Solution uninstall / unmanaged layer remove per PP runbook — **owner gated** |

## Schema impact log (002)

| Impact | Detail |
|--------|--------|
| New lists | Identities, Teams, Permissions, Workflows, Queues, Automations, Timeline, Documents, Artifacts, Dashboards, Widgets, Events, Integrations |
| Canonical aliases | User←TeamMembers, Agent←AIWorkers, Metric←KpiRecords |
| Columns | `TenantId`, `SchemaVersion` on platform + key product lists |
| Product lists | Unchanged except TenantId/SchemaVersion additives |

## Downstream

Power Platform forms · Security ACLs · Knowledge graph nodes · AI Governance agent registry alignment · Elite UI contracts · Analytics dims
