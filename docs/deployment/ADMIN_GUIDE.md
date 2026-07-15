# ADMIN GUIDE

## Daily / weekly duties

| Cadence | Task |
|---------|------|
| Daily | Check `HVCG_AutomationLogs` for Failed |
| Daily | Clear truly resolved `RequiresExecutiveAttention` flags |
| Weekly | Review guest users on HVCG-Clients |
| Weekly | Confirm renewal tasks created |
| Monthly | Access review vs ROLE_ROSTER |
| Quarterly | Contractor expiration sweep |

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
