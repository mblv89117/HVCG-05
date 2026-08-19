# 06 — Migration Plan

**Pack id:** `20260720_001_atlas_data_foundation_v1`  
**Type:** Additive only  
**fromVersion:** `1.1.0`  
**toVersion:** `1.2.0-draft` (semver bump **requires** Architecture + QA approval — not self-approved)

## Goals

1. Introduce Organization / Workspace isolation without breaking existing ClientCode joins.
2. Add missing foundation entities (Notes, Periods, KPIs, Forecasts header, FinancingConditions, EV, ValueDrivers, AIInsights, Roles).
3. Harden key columns (ClientCode on Opportunities/Budgets; AuditEvent org/workspace).
4. Preserve all customer data; no destructive renames.

## Phases

### Phase A — Schema additive (Dev only)

1. Snapshot lists (`New-HVCGSchemaSnapshot.py` or equivalent).
2. Apply `releases/migrations/diffs/atlas_data_foundation_v1.json` via Repair/ApplyListDiff.
3. Validate column presence with schema tests.
4. **Rollback:** delete new empty lists; remove additive columns only if unused (SharePoint columns generally remain unused). Restore from snapshot if provisioner supports it.

### Phase B — Backfill keys (Dev)

1. Create ORG-HVCG, ORG-CCB, workspaces from seed manifest (`sample` provenance).
2. Backfill `OrganizationId`/`WorkspaceId` on Clients:
   - HVCG internal demo clients → ORG-HVCG / WS-HVCG-INTERNAL (or per-client workspace when dedicated).
   - Colorado Craft Beef → ORG-CCB / WS-CCB.
3. Backfill `ClientCode` on Opportunities and Budgets from ClientId lookup.
4. **Validation:** zero Opportunities without ClientCode; every Client has Organization + Workspace.

### Phase C — Dual-write / dual-read

1. Apps write Notes to `HVCG_Notes` (stop creating free-floating note-only activities for non-CRM).
2. KPI refresh job writes `HVCG_KpiRecords` with `calculated` or `imported` provenance.
3. EV UI writes Assessments/Drivers; Client.EnterpriseValueRange becomes display-only deprecated.
4. **Rollback:** feature-flag off; lists retained.

### Phase D — Analytics cutover

1. Extend Power BI model with DimOrganization, DimWorkspace, DimPeriod, FactKpi.
2. Point Executive Dashboard KPI tiles at KpiRecords where available.
3. **Rollback:** measures fall back to live list calculations.

### Phase E — Dataverse alignment (future; gated)

1. Publish `hvcg_atlas*` tables matching logical names (Power Platform owns publish).
2. Migration pack maps SharePoint business keys → Dataverse GUIDs.
3. Owner gate for Production; **Data Engineering does not self-approve**.

## Schema impact summary

| Change | Impact |
|--------|--------|
| +11 lists | Provisioning time; permission matrix update (Security) |
| +columns on existing | Non-breaking; flows may ignore until updated |
| Deprecated Client.EnterpriseValueRange | Soft; keep column |
| Product version | 1.2.0 only after approval |

## Downstream dependencies

| Team | Action required |
|------|-----------------|
| Power Platform | Apply diff in Dev; update forms/views |
| Security | Role × list ACL for new lists; workspace isolation |
| Analytics | Semantic model extension |
| Finance Intelligence | EV + KPI verified promotion rules |
| Elite UI / frontend | Adopt contracts |
| QA | Schema + seed + isolation tests |

## Validation gates (must pass before Waiting Review → Approved)

- [ ] Diff applies cleanly on empty Dev site
- [ ] Seed manifest loads with provenance=`sample`
- [ ] No `verified` financial amounts in sample packs
- [ ] ClientCode backfill script report = 0 gaps (or documented exceptions)
- [ ] Isolation test: CCB workspace query excludes other clients
- [ ] Architecture review of SoR language (SharePoint V1 vs Dataverse target)
