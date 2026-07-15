# DISASTER RECOVERY — HVCG OS

## Recovery objectives (guidance)

| Metric | Development | Test | Production (target) |
|--------|-------------|------|---------------------|
| **RPO** | 24h | 24h | **≤ 24h** (prefer nightly backup) |
| **RTO** | 8h | 8h | **≤ 8h** for Command Center lists; 24h for full libraries |

Tune after first production capacity review.

## Recovery priorities

1. Identity / Entra groups + site access  
2. `HVCG_SystemInfo` + list schemas  
3. Clients, Engagements, Projects, Tasks, DocumentRequests  
4. Capital + Finance ops lists  
5. Relationships + AI orchestration (jobs can be re-queued)  
6. Knowledge templates / SOPs  
7. Client document libraries  
8. Power Platform apps/flows (managed solution)

## Backup schedule & retention

| Env | Schedule | Retention |
|-----|----------|-----------|
| Dev | Weekly config+data | 30 days |
| Test | Weekly | 30 days |
| Prod | **Nightly Full**; weekly with `-IncludeDocuments` inventory | 90 days manifests; 30 days full data exports |

```powershell
pwsh -File ./deployment/backup/Backup-HVCGOS.ps1 -Environment production -Mode Full
```

## Restore order

1. Recreate sites if missing (`Install-HVCGOS` / deploy sites)  
2. `Restore-HVCGOS.ps1` WhatIf → additive schema via Upgrade  
3. Templates  
4. List data (`-RestoreData`)  
5. Permissions review  
6. Managed solution import  
7. Health + post-deploy validation  
8. Spot-check client libraries  

## Scenarios

| Scenario | Response |
|----------|----------|
| Tenant loss | New tenant; rebuild Entra; Install → Restore data from latest backup; reconsent connectors |
| Site deletion | Recreate site URL; Upgrade schema; RestoreData; re-attach libraries from recycle bin if available |
| Accidental item deletion | SharePoint recycle bin first; else restore single list JSON from backup |
| Automation corruption | Disable flows; re-import definitions/managed solution; keep list data |
| Power Apps failure | Redeploy from build sheet / managed solution; data unaffected |
| Power Automate failure | Fix connections; reimport; AutomationLogs triage |
| Credential compromise | Rotate secrets; disable Worker; revoke shares; audit AIAuditLog + Purview |

## Validation checklist after restoration

- [ ] Health script Healthy  
- [ ] Post-deploy PASS  
- [ ] InstalledVersion matches package  
- [ ] Sample critical client record present  
- [ ] No anon sharing on Clients hub  
- [ ] AI ExternalSendBlocked still true  
- [ ] Backup job succeeds again  

## Owner actions

- Approve Production restore  
- Provide admin auth  
- Confirm backup storage location outside the failed site  
