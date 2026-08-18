#Requires -Version 7.0
<#
.SYNOPSIS
  PREPARE-ONLY ACCG01 unique-ACL remediation package. Does not apply.

.DESCRIPTION
  Default is WhatIf inventory + plan. Apply is refused unless
  HVCG_ACCG01_CHANGE_WINDOW=1 is set AND -Apply is passed.
  This sprint does not set that window. Target matches SYN01:
  unique permissions, Hub Owners owner, HVCG-Client-ACCG01 write,
  no site Members, no site Visitors.

.EXAMPLE
  pwsh -File ./deployment/scripts/Prepare-HVCGAccg01AclRemediation.ps1
#>
[CmdletBinding()]
param(
  [string]$ClientsSiteUrl = 'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients',
  [string]$LibraryTitle = 'HVCG_ACCG01',
  [string]$ClientCode = 'ACCG01',
  [string]$ClientGroupName = 'HVCG-Client-ACCG01',
  [string]$HubOwnersGroupName = 'HVCG Clients Hub Owners',
  [switch]$Apply,
  [switch]$InventoryOnly
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.ClientWorkspace.psm1') -Force

$identity = Get-HVCGRepoIdentity -RepoRoot $RepoRoot -ScriptPath $PSCommandPath
$window = [Environment]::GetEnvironmentVariable('HVCG_ACCG01_CHANGE_WINDOW')
$applyAllowed = $Apply -and $window -eq '1'

Write-Host "SCRIPT: $($identity.ScriptPath)"
Write-Host "REPO: $($identity.RepositoryRoot)"
Write-Host "SHA: $($identity.CommitSha)"
Write-Host 'MODE: ACCG01 ACL PREPARATION — APPLY IS NOT THE DEFAULT'
Write-Host "SITE: $ClientsSiteUrl"
Write-Host "LIBRARY: $LibraryTitle"
Write-Host "CHANGE WINDOW: $(if ($window -eq '1') { 'SET' } else { 'NOT SET' })"

$plan = [pscustomobject]@{
  WhatIf            = -not $applyAllowed
  Apply             = [bool]$applyAllowed
  Library           = $LibraryTitle
  ClientCode        = $ClientCode
  TargetInheritance = 'unique / broken'
  TargetOwners      = @($HubOwnersGroupName)
  TargetWrite       = @($ClientGroupName)
  Remove            = @('Members', 'Visitors', 'site Members write', 'site Visitors read')
  DoNotGrant        = @('Everyone', 'Everyone except external users', 'site Members', 'site Visitors')
  MembersInventory  = @()
  VisitorsInventory = @()
  BlastRadius       = 'UNKNOWN until inventory against live site groups'
  Rollback          = 'Re-grant recorded Members/Visitors principals from inventory JSON; restore inherited if unique break is the only change and inventory says inherited=true'
  Verification      = @(
    'HVCG_ACCG01 HasUniqueRoleAssignments = true',
    'HVCG-Client-ACCG01 claims principal write present',
    'HVCG Clients Hub Owners owner present',
    'No Members / Visitors on library ACL',
    'SYN01 ACL unchanged'
  )
}

if ($Apply -and -not $applyAllowed) {
  Write-Host 'APPLY REFUSED: HVCG_ACCG01_CHANGE_WINDOW is not 1. No SharePoint writes.'
}

Write-Host 'WHATIF / APPLY / VERIFICATION / ROLLBACK PACKAGE'
Write-Host ($plan | ConvertTo-Json -Depth 6)
Write-Host 'APPLY: NOT RUN'
Write-Host 'OWNER ACTION REQUIRED: NO'

[pscustomobject]@{
  WhatIf     = $plan.WhatIf
  ApplyRun   = $false
  Ready      = $true
  Plan       = $plan
  Messages   = @(
    'Inventory Members/Visitors on HVCG-Clients before any apply window',
    'Do not bind site Members or Visitors onto HVCG_ACCG01',
    'Match SYN01 unique ACL'
  )
}
