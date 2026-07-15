# PROJECT STATUS

**Last updated:** 2026-07-15 (~10:07 PT)  
**Product:** HVCG OS  
**Version:** **1.1.0** (`VERSION` / `version.json`)  
**Branch:** `cursor/v1.1.0-intelligence-ai-ops` @ `8635397` (tracks origin; CRM integration tip)  
**Tag:** `v1.1.0-dev-sharepoint-baseline` (pre-CRM freeze)  
**Overall status:** **Opportunity CRM repo-integration complete** — six workstreams merged; predeploy PASS; live Dev Repair **in progress** (leave alone); Maker import/publish **not done**

## Verdict

HVCG OS **v1.1.0** Opportunity CRM package is merged on `cursor/v1.1.0-intelligence-ai-ops` (`8635397`). Offline suite **PASS**. Live Dev schema apply was started (Repair terminal `573342` / `pwsh` still running at handoff) — CRM lists/fields/lookups and views advanced; process was in **pre-seed validation**. Do **not** start another Repair until that run completes or the owner confirms it is dead.

| Checkpoint | Result |
|------------|--------|
| Integration tip | **`8635397`** |
| Offline predeploy | **PASS** (2026-07-15) |
| Consolidated acceptance | `docs/crm/CONSOLIDATED_ACCEPTANCE_REPORT.md` |
| Live Dev CRM Repair | **IN PROGRESS** — leave alone; attest `hasDrift=false` after exit |
| Flow import / activation | **Pending owner** (Maker) |
| Canvas publish / Teams | **Pending owner** (Maker) |

Pre-CRM infrastructure baseline remains tagged `v1.1.0-dev-sharepoint-baseline`. Agents must not modify deployment engines or run concurrent repair/deploy/import/publish.

v1.0.0 artifacts remain immutable at `releases/v1.0.0/`.

## Opportunity CRM (current)

| Area | Status |
|------|--------|
| Module design + migration pack | **Repo-ready** |
| Parallel agent finish (flows, apps, Teams, tests, docs) | **COMPLETE** — merged at `8635397`; see `docs/crm/PARALLEL_AGENT_MAP.md` |
| Live Dev schema apply | **IN PROGRESS / attest after exit** — do not re-run while Repair alive |
| Flow import / activation | **Pending owner** (after schema attest) |
| Canvas publish | **Pending owner** (after lists exist) |
| Acceptance | Offline: `docs/crm/CONSOLIDATED_ACCEPTANCE_REPORT.md`; live: `docs/crm/ACCEPTANCE_REPORT.md` |

Owner stop points: `docs/crm/OWNER_ACTION_GUIDE.md` (OA-CRM-01…11).  
Module design: `docs/crm/OPPORTUNITY_MANAGEMENT.md`.

## Development infrastructure milestone (completed)

Delivered in this baseline (tenant unchanged after repair — docs/code only):

1. **PnP authentication** — Entra app Client ID required for Interactive; `Register-HVCGPnPEntraApp.ps1`; `Connect-HVCGPnPOnline`
2. **StrictMode-safe field provisioning** — `Get-HVCGColumnSchemaFacade` / `Add-HVCGFieldFromSchema`
3. **Lookup provisioning** — CAML `Add-PnPFieldFromXml` (PnP 3.3 has no `-Values` / `-LookupList` on `Add-PnPField`)
4. **Retry / backoff** — `Invoke-HVCGPnPWithRetry` (429, Retry-After, 503, throttle, transient); field visibility polling
5. **Schema repair** — `Repair-HVCGOSSharePointSchema.ps1` (idempotent, no site/list deletion)
6. **Drift validation** — missing / extra / mismatched gate; fails deploy/repair on drift; reports under `deployment/reports/schema/` (gitignored)
7. **Seed-data fix** — no cmdlet+`-and` parse bug; `ConvertTo-HVCGSeedClientValues`

## Install (Development)

```powershell
pwsh -File ./deployment/install/Install-HVCGOS.ps1 -Environment development
```

## Repair (idempotent schema)

```powershell
pwsh -File ./deployment/repair/Repair-HVCGOSSharePointSchema.ps1 -Environment development
```

## Upgrade from v1.0.0

```powershell
pwsh -File ./deployment/upgrade/Upgrade-HVCGOS.ps1 -Environment development -TargetVersion 1.1.0
```

Migration pack: `releases/migrations/20260714_002_intelligence_ai_backup_v1_1_0.json`

## Post-install / verify

```powershell
pwsh -File ./deployment/health/Test-HVCGOSHealth.ps1 -Environment development
pwsh -File ./deployment/health/Invoke-HVCGOSOperationalHealth.ps1 -Environment development
pwsh -File ./deployment/backup/Backup-HVCGOS.ps1 -Environment development
```

Manual Dev sites:

- Command Center: `https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter-Dev`
- Knowledge Center: `https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Knowledge-Dev`
- Clients Hub: `https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients-Dev`

## Release engineering

| Capability | Path |
|------------|------|
| Release notes | `releases/v1.1.0/notes/RELEASE_NOTES.md` |
| v1.0.0 (immutable) | `releases/v1.0.0/notes/RELEASE_NOTES.md` |
| Upgrade | `deployment/upgrade/Upgrade-HVCGOS.ps1` |
| Rollback | `deployment/rollback/Rollback-HVCGOS.ps1` |
| Health | `deployment/health/Test-HVCGOSHealth.ps1` |
| Operational health | `deployment/health/Invoke-HVCGOSOperationalHealth.ps1` |
| Backup / restore | `deployment/backup/Backup-HVCGOS.ps1`, `deployment/restore/Restore-HVCGOS.ps1` |
| Schema repair | `deployment/repair/Repair-HVCGOSSharePointSchema.ps1` |
| PnP auth | `docs/deployment/PNP_AUTHENTICATION.md` |
| Guide | `RELEASE.md` |
| GitHub Actions | `.github/workflows/hvcg-os-release.yml` |
| Azure Pipelines | `deployment/pipelines/azure-pipelines.yml` |

## v1.1.0 capabilities packaged

| Area | Status |
|------|--------|
| `HVCG_Relationships` + query catalog | Shipped |
| AI orchestration lists + governance docs | Shipped |
| Backup / restore / `DISASTER_RECOVERY.md` | Shipped |
| Operational monitoring + System Health dashboard spec | Shipped |
| Schema: 81 lists | Shipped |
| Dev SharePoint baseline (fields/lookups/views/seed) | **Complete** (frozen) |
| Opportunity CRM module (app layer) | **Repo-ready / apply-in-progress** — owner repair + Maker steps next |

## Next owner step

1. Wait for parent integration merge of CRM agent branches (or apply from designated integration SHA).  
2. Follow `docs/crm/OWNER_ACTION_GUIDE.md`: sign-in → consent → additive repair → connections → import/activate four CRM flows (test Teams channels only) → publish canvas CRM → fill `docs/crm/ACCEPTANCE_REPORT.md`.  
3. Do **not** promote CRM to Production without explicit written approval (OA-CRM-11).

Module doc: `docs/crm/OPPORTUNITY_MANAGEMENT.md`
