# HVCG OS v1.1.0 Release Notes

**Product:** HVCG OS  
**Version:** 1.1.0  
**Release date:** 2026-07-14  
**Previous release:** 1.0.0 (immutable)  
**Type:** Minor — additive, backward compatible

## Summary

v1.1.0 adds the **Intelligence Layer**, **AI orchestration foundation**, **backup/restore/DR**, and **operational monitoring** without changing the meaning of v1.0.0 or requiring destructive data migrations.

## Added

### Intelligence Layer
- `HVCG_Relationships` — normalized cross-domain relationship graph edges (people, clients, capital parties, opportunities, projects, documents, meetings, tasks, decisions, risks, funding milestones, etc.)
- Indexed fields for SharePoint-scale filtering (`RelationshipId`, entity types, ClientCode, `IsCrossClient`, status, dates)
- Query catalog: `docs/intelligence/INTELLIGENCE_QUERY_CATALOG.md`
- Migration guidance for future Dataverse / Microsoft Graph / Cosmos DB / dedicated graph DB

### AI Orchestration Foundation
- Lists: `HVCG_AIWorkers`, `HVCG_AIJobs`, `HVCG_AIJobSteps`, `HVCG_AIContext`, `HVCG_AIPrompts`, `HVCG_AIToolRegistry`, `HVCG_AIOutputs`, `HVCG_AIApprovals`, `HVCG_AIFeedback`, `HVCG_AIAuditLog`, `HVCG_AICostTracking`
- Existing specialized `HVCG_AI_*` queues retained and linkable via `JobId`
- Human approval defaults on; `ExternalSendBlocked=true` — **no autonomous external communications**
- Governance: `docs/ai/AI_CONTEXT_POLICY.md`, `AI_GOVERNANCE.md`, `AI_APPROVAL_MATRIX.md`, `AI_SECURITY_MODEL.md`

### Backup & Disaster Recovery
- `deployment/backup/Backup-HVCGOS.ps1`
- `deployment/restore/Restore-HVCGOS.ps1` (additive default; destructive overwrite requires explicit confirmation)
- `DISASTER_RECOVERY.md`

### Monitoring & Health
- `MONITORING.md`
- `deployment/health/Invoke-HVCGOSOperationalHealth.ps1`
- `HVCG_OperationalAlerts`
- `docs/reporting/SYSTEM_HEALTH_DASHBOARD.md`

### Development SharePoint provisioning hardening (baseline)
- **PnP authentication** — Interactive login requires Entra app Client ID (`authentication.pnpEntraAppClientId`); `deployment/scripts/Register-HVCGPnPEntraApp.ps1`; `docs/deployment/PNP_AUTHENTICATION.md`
- **StrictMode-safe field provisioning** — `Get-HVCGColumnSchemaFacade` / `Add-HVCGFieldFromSchema` (no unsafe `$col.choices` truthiness)
- **Lookup fields** — `Add-PnPFieldFromXml` + CAML (PnP.PowerShell 3.3 has no `Add-PnPField -Values` / `-LookupList`)
- **Retry / backoff** — `Invoke-HVCGPnPWithRetry` for HTTP 429, Retry-After, 503, SharePoint throttling, and transient network errors; exponential backoff 2s→30s with jitter; post-create field visibility polling
- **Schema repair** — idempotent `deployment/repair/Repair-HVCGOSSharePointSchema.ps1` (no site/list deletion)
- **Drift validation** — compare every configured list/column; report missing / extra / mismatched; fail deploy & repair when drift exists
- **Seed-data StrictMode fix** — `ConvertTo-HVCGSeedClientValues` (avoids PowerShell treating `-and` as a cmdlet parameter)

## Upgrade

From an installed **1.0.0** tenant:

```powershell
pwsh -File ./deployment/upgrade/Upgrade-HVCGOS.ps1 -Environment development -TargetVersion 1.1.0
```

Fresh install uses package version from `VERSION` (1.1.0):

```powershell
pwsh -File ./deployment/install/Install-HVCGOS.ps1 -Environment development
```

Migration pack: `releases/migrations/20260714_002_intelligence_ai_backup_v1_1_0.json`  
Diff: `releases/migrations/diffs/v1.0.0_to_v1.1.0.json`

Customer data is preserved (additive lists/columns only). Soft rollback resets `InstalledVersion` to 1.0.0; new schema remains (unused by v1.0.0 apps).

## Compatibility

| Rule | Status |
|------|--------|
| Breaking schema changes | None |
| Customer data rebuild | Never |
| v1.0.0 release artifacts | Unchanged / immutable |
| Power Platform solution version | 1.1.0.0 |

## Verification

```powershell
pwsh -File ./tests/Invoke-HVCGPreDeploymentTests.ps1
pwsh -File ./deployment/health/Test-HVCGOSHealth.ps1 -Environment development
pwsh -File ./deployment/health/Invoke-HVCGOSOperationalHealth.ps1 -Environment development
pwsh -File ./deployment/backup/Backup-HVCGOS.ps1 -Environment development
```

### Development tenant baseline (2026-07-14)

Command Center Dev repaired successfully (`exit 0`): **1,147** fields compliant, **zero** schema drift, lookups/views/seed succeeded. Git tag: `v1.1.0-dev-sharepoint-baseline`.