# ADR-0001 — SharePoint Lists as Version 1 System of Record

| Field | Value |
|-------|--------|
| ID | ADR-0001 |
| Title | SharePoint Lists as Version 1 System of Record |
| Status | Accepted |
| Date | 2026-07-15 |
| Decision owner | architect (codifying embedded repo decision) |

## Context

HVCG OS v1.1.0 is implemented on Microsoft 365 with Power Apps / Automate / BI. Root `ARCHITECTURE.md` and list schemas under `src/sharepoint/lists/` already treat SharePoint as SoR.

## Problem

Need a single authoritative store for CRM, delivery, finance ops, AI queues, and portal prep without a premature Dataverse migration.

## Options considered

1. SharePoint lists/libraries as SoR (current)
2. Dataverse-first for all entities
3. Hybrid split by domain in v1

## Decision

**Option 1.** SharePoint lists remain the Version 1 system of record. Dataverse reserved for later graph/RLS/scale needs (`HVCG_Relationships` migration path documented).

## Rationale

Matches deployed provisioning scripts, existing 80+ list schemas, connection reference model, and licensing posture. Additive V1.1 features already assume SharePoint.

## Consequences

- Cross-module contracts = list schemas + business keys (`ClientCode`, `JobId`, …)
- Lookup depth and list view thresholds must be governed
- Architect review required for shared schema changes

## Affected modules

All modules.

## Migration impact

V2+ may migrate selected entities (especially Relationships) to Dataverse/Graph; preserve business keys.

## Security impact

SharePoint permissions + client isolation flags (`IsCrossClient`, portal ACLs) remain critical controls.

## Testing impact

Schema drift tests / acceptance scripts must hash or column-diff shared lists.

## Rollback considerations

N/A (baseline). New lists should be additive and idempotently provisioned.

## Related files and branches

- `ARCHITECTURE.md`, `docs/data-model/*`, `src/sharepoint/lists/*`
- Branches: all `cursor/*` module tips
