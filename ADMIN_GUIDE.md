# ADMIN GUIDE

## Daily / weekly duties

| Cadence | Task |
|---------|------|
| Daily | Check `HVCG_AutomationLogs` for Failed |
| Daily | Run `Invoke-HVCGOSOperationalHealth.ps1`; review `HVCG_OperationalAlerts` |
| Daily | Clear truly resolved `RequiresExecutiveAttention` flags |
| Daily | Review `HVCG_AIApprovals` queue for pending human reviews |
| Weekly | Review guest users on HVCG-Clients |
| Weekly | Confirm renewal tasks created |
| Weekly | Run `Backup-HVCGOS.ps1` (Dev/Test); verify backup manifest |
| Monthly | Access review vs ROLE_ROSTER |
| Monthly | Review `HVCG_AICostTracking` for budget adherence |
| Quarterly | Contractor expiration sweep |

## Operational health (v1.1.0)

```powershell
pwsh -File ./deployment/health/Invoke-HVCGOSOperationalHealth.ps1 -Environment development
```

The script checks:
- Required v1.1.0 lists present (Relationships, AIJobs, AIContext, OperationalAlerts, SystemInfo)
- Stale workflows, orphaned lookups, permission drift
- AI job backlog and cost thresholds
- Onboarding completeness

Failures write rows to `HVCG_OperationalAlerts`. Critical alerts email Ops; Owner escalation per executive rules only.

Dashboard spec: `docs/reporting/SYSTEM_HEALTH_DASHBOARD.md`

## Intelligence Layer — Relationships (v1.1.0)

- Relationships are **created by flows and apps**, not manually in bulk.
- Each edge has `ClientCode` for isolation; `IsCrossClient=true` only for Owner/Admin-approved cross-client links.
- Query patterns: `docs/intelligence/INTELLIGENCE_QUERY_CATALOG.md`
- Do not delete relationship rows without understanding downstream graph impact; prefer `Status=Inactive`.
- Archive inactive edges quarterly to keep list under 5,000 active rows.

## AI approval queue (v1.1.0)

- All AI outputs requiring human review appear in `HVCG_AIApprovals` and/or specialized `HVCG_AI_*` queues.
- **Never approve** draft emails or external communications without reading the full output.
- `ExternalSendBlocked=true` on all jobs — approving an output does **not** auto-send; a separate authorized action is required.
- Rejected outputs: record feedback in `HVCG_AIFeedback`; job status returns to Failed or AwaitingRevision.
- Review `HVCG_AIAuditLog` after any security concern.
- Cost review: `HVCG_AICostTracking` monthly; alert thresholds in OperationalAlerts.

Governance docs: `docs/ai/AI_APPROVAL_MATRIX.md`, `AI_CONTEXT_POLICY.md`, `AI_SECURITY_MODEL.md`

## Backup schedule (v1.1.0)

| Environment | Schedule | Command |
|-------------|----------|---------|
| Development | Weekly | `Backup-HVCGOS.ps1 -Environment development` |
| Test | Weekly | `Backup-HVCGOS.ps1 -Environment test` |
| Production | **Nightly** list data; weekly Full with documents | `Backup-HVCGOS.ps1 -Environment production -Mode Full` |

Retention: 30 days Dev/Test; 90 days Prod manifests. See `DISASTER_RECOVERY.md`.

Restore is additive by default. Destructive overwrite requires explicit `-ConfirmDestructive`.

## Add a new staff member

1. License in M365  
2. Add to correct `HVCG-Role-*` group  
3. Add row in `HVCG_TeamMembers`  
4. Share Power App if not group-shared  

## Remove / offboard

1. Remove from all HVCG groups  
2. Remove client groups  
3. Disable guest invites  
4. Reassign open tasks  
5. Disable any `HVCG_AIWorkers` entries assigned to departing user  

## Add a new client (happy path)

1. Create client in app (or list)  
2. Set owners, fees, ClientCode  
3. Set stage to **Active Client** (triggers onboarding)  
4. Verify library URL populated  
5. Confirm document requests + project tasks exist  

If flow fails: run `New-HVCGClientWorkspace.ps1` + `New-HVCGProjectFromTemplate.ps1`, log incident.

## Modify a project template

1. Edit JSON in repo `templates/projects/`  
2. Upload to Knowledge `/ProjectTemplates/`  
3. Update `HVCG_Templates` path/version notes  
4. Existing projects are **not** retroactively changed  

## Troubleshoot automations

1. Open flow run history  
2. Match RunId to AutomationLogs  
3. Common issues: missing connection, missing ClientCode, template key typo, permission on Clients site  
4. Fix data; use idempotency to re-run safely  

## Permissions

See `PERMISSIONS_MATRIX.md` and `docs/security/SECURITY_MODEL.md`.

## Environments

Never point prod flows at Dev sites. Keep connection references environment-specific.
