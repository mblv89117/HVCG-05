# PROJECT STATUS

**Last updated:** 2026-07-15  
**Product:** HVCG OS  
**Version:** **1.1.0** (`VERSION` / `version.json`)  
**Branch (docs workstream):** `agent/crm-docs-owner` (base `4a8f25d` / `cursor/v1.1.0-intelligence-ai-ops`)  
**Tag:** `v1.1.0-dev-sharepoint-baseline`  
**Overall status:** **Opportunity CRM apply-in-progress** — Dev infrastructure frozen; CRM module **repo-ready**; live Dev tenant CRM schema **pending owner repair**

## Verdict

HVCG OS **v1.1.0** Development SharePoint infrastructure remains complete and frozen on `HVCG-CommandCenter-Dev`:

| Checkpoint | Result |
|------------|--------|
| Schema fields compliant (baseline) | **1,147** |
| Schema drift (baseline) | **Zero** |
| Repair exit code (baseline) | **0** |
| Opportunity CRM list/column package | **In repo** — not yet repaired onto live Dev |
| CRM flows / canvas / Teams-Copilot specs | **Packaging via parallel agents** — Maker import/publish **owner-gated** |

Pre-deployment critical tests: **PASS** on last baseline. No infrastructure engine changes required for CRM (additive repair only).

v1.0.0 artifacts remain immutable at `releases/v1.0.0/`.

## Opportunity CRM (current)

| Area | Status |
|------|--------|
| Module design + migration pack | **Repo-ready** (`fd5a9b9`) |
| Parallel agent finish (flows, apps, Teams, tests, docs) | **In progress** — see `docs/crm/PARALLEL_AGENT_MAP.md` |
| Live Dev schema apply | **Pending owner** — `Repair-HVCGOSSharePointSchema.ps1` |
| Flow import / activation | **Pending owner** (after repair) |
| Canvas publish | **Pending owner** (after lists exist) |
| Acceptance | Template ready — `docs/crm/ACCEPTANCE_REPORT.md` |

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
