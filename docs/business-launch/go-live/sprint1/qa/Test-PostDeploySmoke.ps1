# Run AFTER Prod import (Owner-approved). Requires pac auth on HVCG Production.
param([string]$EnvironmentUrl)
if (-not $EnvironmentUrl) { Write-Error "Pass -EnvironmentUrl https://ORG.crm.dynamics.com/"; exit 1 }
$ErrorActionPreference = "Stop"
pac org select --environment $EnvironmentUrl
pac solution list
Write-Host "CHECK: HVCGCommandCenterDev present and Managed=true"
Write-Host "CHECK: hvcg_CrmEnableTeamsNotify = false"
Write-Host "CHECK: hvcg_EnableClientEmails = false"
Write-Host "CHECK: Connection refs bound (SharePoint/Outlook/Teams/Approvals)"
Write-Host "CHECK: No client notification sent (AutomationLog)"
Write-Host "MANUAL: Open CRM lists — Clients/Contacts/Engagements empty or pilot-only"
