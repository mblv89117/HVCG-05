# Atlas Data Foundation

**Owner:** Data Engineering (`data-engineering`)  
**Version:** 1.0.0-draft  
**Updated:** 2026-07-20  
**Status:** Design complete — **not** production-promoted (requires Architecture + Power Platform + Security + QA + owner gate)

> **Platform-first:** Canonical OS entities live in [`../ATLAS_PLATFORM_OS/`](../ATLAS_PLATFORM_OS/).  
> This pack is the **product extension** layer (CRM, capital, EV, finance). Do not redefine User, Task, Approval, Metric, etc. here.

## Purpose

A single normalized, secure, reusable data foundation for Project Atlas that supports HVCG internal operations and client workspaces (HVCG workspace, Colorado Craft Beef workspace, future clients) **without** cloning schemas per module.

## Deliverables in this pack

| # | Deliverable | Path |
|---|-------------|------|
| 1 | Data inventory | [01_DATA_INVENTORY.md](01_DATA_INVENTORY.md) |
| 2 | Normalized schema | [02_NORMALIZED_SCHEMA.md](02_NORMALIZED_SCHEMA.md) |
| 3 | Relationship diagram | [03_RELATIONSHIPS.md](03_RELATIONSHIPS.md) |
| 4 | Field definitions | [04_FIELD_DEFINITIONS.md](04_FIELD_DEFINITIONS.md) |
| 5 | Data-source mapping | [05_DATA_SOURCE_MAPPING.md](05_DATA_SOURCE_MAPPING.md) |
| 6 | Migration plan | [06_MIGRATION_PLAN.md](06_MIGRATION_PLAN.md) |
| 7 | Seed-data strategy | [07_SEED_DATA_STRATEGY.md](07_SEED_DATA_STRATEGY.md) |
| 8 | Validation rules | [08_VALIDATION_RULES.md](08_VALIDATION_RULES.md) |
| 9 | Refresh metadata | [09_REFRESH_METADATA.md](09_REFRESH_METADATA.md) |
| 10 | Frontend data contracts | [10_FRONTEND_DATA_CONTRACTS.md](10_FRONTEND_DATA_CONTRACTS.md) + [`../contracts/`](../contracts/) |
| 11 | Analytics model support | [11_ANALYTICS_MODEL.md](11_ANALYTICS_MODEL.md) |
| 12 | Production-readiness status | [12_PRODUCTION_READINESS.md](12_PRODUCTION_READINESS.md) |

## Machine-readable artifacts

- Entity catalog: `docs/data-model/contracts/atlas-core.entities.json`
- Migration pack: `releases/migrations/20260720_001_atlas_data_foundation_v1.json`
- Schema diff: `releases/migrations/diffs/atlas_data_foundation_v1.json`
- Seed manifest: `sample-data/atlas-foundation/seed-manifest.json`

## Non-negotiable rules

1. Do **not** invent financial data labeled `verified`.
2. Label every row/file as `sample` | `test` | `imported` | `calculated` | `verified`.
3. Record `SourceSystem` and `LastRefreshedAt` on analytical snapshots.
4. Preserve audit history (append-only `AuditEvent` / AI audit).
5. Stable business keys: `OrganizationCode`, `WorkspaceCode`, `ClientCode`.
6. SharePoint stores **documents**; lists/Dataverse store **structured** ops records — no duplication of structured SoR into libraries.
7. Dataverse remains the **target** operational SoR for Atlas ops entities (`hvcg_atlas*`); V1.x shipping SoR remains SharePoint Lists until Architecture approves cutover.
8. **Do not self-approve schema promotion** to Production.

## Coordination

| Partner | Topic |
|---------|--------|
| Architecture | SoR cutover ADR, multi-org tenancy |
| Power Platform | List provisioning, Dataverse table publish |
| Knowledge Platform | Canonical entity names in knowledge graph |
| AI Governance | Agent/Queue/Approval human gates |
| Master PM | Promotion scheduling |
| Finance Intelligence | EV / KPI / forecast field semantics |
| Analytics | Semantic model dims/facts |
| Security | RLS / client isolation / classification |
| QA | Validation suites, seed vs prod gates |
