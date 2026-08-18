#Requires -Version 7.0
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.ClientWorkspace.psm1') -Force

$failed = 0
function Assert-HVCG {
  param([string]$Name, [bool]$Condition, [string]$Detail = '')
  if ($Condition) { Write-Host "PASS $Name" }
  else { Write-Host "FAIL $Name $Detail"; $script:failed++ }
}

$findEntra = {
  param($Name)
  $map = @{
    'HVCG-Client-SYN01' = [pscustomobject]@{ id = 'a8e9b1e2-b69d-4170-b0cd-6604d34884a1'; displayName = 'HVCG-Client-SYN01'; groupTypes = @() }
    'HVCG Clients Hub Owners' = [pscustomobject]@{ id = 'a524406d-7a4d-4f1c-9ccc-a32a199cd9b8'; displayName = 'HVCG Clients Hub Owners'; groupTypes = @('Unified') }
  }
  if ($map.ContainsKey($Name)) { return $map[$Name] }
  return $null
}
$findSite = {
  param($Name)
  if ($Name -eq 'HVCG Clients Hub Members') {
    return [pscustomobject]@{ Id = 5; Title = 'HVCG Clients Hub Members' }
  }
  return $null
}

# Principal kinds
$entra = Resolve-HVCGSharePointPrincipal -Name 'HVCG-Client-SYN01' -FindEntraGroup $findEntra -FindSiteGroup $findSite -Required $true
Assert-HVCG 'Entra security group uses tenant claims' ($entra.Kind -eq 'EntraSecurityGroup' -and $entra.LoginName -eq 'c:0t.c|tenant|a8e9b1e2-b69d-4170-b0cd-6604d34884a1') $entra.LoginName

$m365 = Resolve-HVCGSharePointPrincipal -Name 'HVCG Clients Hub Owners' -FindEntraGroup $findEntra -FindSiteGroup $findSite
Assert-HVCG 'M365 group uses federated claims' ($m365.Kind -eq 'Microsoft365Group' -and $m365.LoginName -like 'c:0o.c|federateddirectoryclaimprovider|*_o') $m365.LoginName

$site = Resolve-HVCGSharePointPrincipal -Name 'HVCG Clients Hub Members' -FindEntraGroup $findEntra -FindSiteGroup $findSite
Assert-HVCG 'SharePoint site group resolved' ($site.Kind -eq 'SharePointSiteGroup') $site.Kind

$missing = Resolve-HVCGSharePointPrincipal -Name 'HVCG-Role-Owner' -FindEntraGroup $findEntra -FindSiteGroup $findSite -Required $false
Assert-HVCG 'Missing optional role is Missing not site-group' ($missing.Kind -eq 'Missing' -and -not $missing.Required) $missing.Kind

$malformed = Resolve-HVCGSharePointPrincipal -Name '   ' -FindEntraGroup $findEntra -FindSiteGroup $findSite -Required $true
Assert-HVCG 'Malformed empty principal' ($malformed.Kind -eq 'Malformed' -and $malformed.Required) $malformed.Kind

$claims = Resolve-HVCGSharePointPrincipal -Name 'c:0t.c|tenant|a8e9b1e2-b69d-4170-b0cd-6604d34884a1' -FindEntraGroup $findEntra -FindSiteGroup $findSite -Required $true
Assert-HVCG 'Pre-formed claims login accepted' ($claims.Kind -eq 'Claims') $claims.Kind

Assert-HVCG 'Already granted' ((Resolve-HVCGExistingGrantAction -ExistingRoles @('Contribute') -NeededRole 'Contribute') -eq 'AlreadyGranted')
Assert-HVCG 'Owner covers Contribute' ((Resolve-HVCGExistingGrantAction -ExistingRoles @('Full Control') -NeededRole 'Contribute') -eq 'AlreadyGranted')
Assert-HVCG 'Read is insufficient for Contribute' ((Resolve-HVCGExistingGrantAction -ExistingRoles @('Read') -NeededRole 'Contribute') -eq 'Upgrade')
Assert-HVCG 'No grant yet' ((Resolve-HVCGExistingGrantAction -ExistingRoles @() -NeededRole 'Contribute') -eq 'Grant')

# WHATIF zero writes
$exec = New-HVCGInMemoryWorkspaceExecutor
$whatIf = Invoke-HVCGClientWorkspaceRepair -Executor $exec -LibraryTitle 'HVCG_SYN01' -Folders @('00 - Engagement Administration') -Principals @($entra)
Assert-HVCG 'WHATIF library create = 0' ($whatIf.Log.LibraryCreate -eq 0)
Assert-HVCG 'WHATIF folder create = 0' ($whatIf.Log.FolderCreate -eq 0)
Assert-HVCG 'WHATIF inheritance change = 0' ($whatIf.Log.InheritanceChange -eq 0)
Assert-HVCG 'WHATIF ACL writes = 0' ($whatIf.Log.AclWrite -eq 0)
Assert-HVCG 'WHATIF does not print ready' ($whatIf.Messages -notcontains 'Client workspace ready: HVCG_SYN01' -and $whatIf.WhatIf)
Assert-HVCG 'WHATIF banner' ($whatIf.Messages -contains 'MODE: WHATIF — ZERO MUTATIONS PERMITTED')

# Partial repair: existing library, some folders, missing ACL
$partialState = @{
  HVCG_SYN01 = [pscustomobject]@{
    Exists = $true
    HasUniqueRoleAssignments = $true
    Folders = [System.Collections.Generic.List[string]]::new()
    Acl = @{}
  }
}
[void]$partialState.HVCG_SYN01.Folders.Add('00 - Engagement Administration')
$partialExec = New-HVCGInMemoryWorkspaceExecutor -Libraries $partialState
$repair = Invoke-HVCGClientWorkspaceRepair -Apply -Executor $partialExec -LibraryTitle 'HVCG_SYN01' -Folders @(
  '00 - Engagement Administration',
  '01 - Corporate Documents'
) -Principals @($entra) -NeededRole Contribute
Assert-HVCG 'Partial: no library create' ($repair.Log.LibraryCreate -eq 0)
Assert-HVCG 'Partial: one missing folder' ($repair.Log.FolderCreate -eq 1)
Assert-HVCG 'Partial: no inheritance change' ($repair.Log.InheritanceChange -eq 0)
Assert-HVCG 'Partial: one ACL write' ($repair.Log.AclWrite -eq 1)
Assert-HVCG 'Partial ready' ($repair.Ready)

# Idempotent second run
$replay = Invoke-HVCGClientWorkspaceRepair -Apply -Executor $partialExec -LibraryTitle 'HVCG_SYN01' -Folders @(
  '00 - Engagement Administration',
  '01 - Corporate Documents'
) -Principals @($entra) -NeededRole Contribute
Assert-HVCG 'Replay library create = 0' ($replay.Log.LibraryCreate -eq 0)
Assert-HVCG 'Replay folder create = 0' ($replay.Log.FolderCreate -eq 0)
Assert-HVCG 'Replay ACL writes = 0' ($replay.Log.AclWrite -eq 0)
Assert-HVCG 'Replay still ready' ($replay.Ready)

# Failed required ACL must not print ready
$failState = @{
  HVCG_SYN01 = [pscustomobject]@{
    Exists = $true
    HasUniqueRoleAssignments = $true
    Folders = [System.Collections.Generic.List[string]]::new()
    Acl = @{}
  }
}
$failExec = New-HVCGInMemoryWorkspaceExecutor -Libraries $failState -GrantOverride {
  param($Title, $Principal, $Role)
  throw 'Site group not found'
}
$failedAcl = Invoke-HVCGClientWorkspaceRepair -Apply -Executor $failExec -LibraryTitle 'HVCG_SYN01' -Folders @('00 - Engagement Administration') -Principals @($entra) -NeededRole Contribute
Assert-HVCG 'Failed ACL not ready' (-not $failedAcl.Ready)
$readyBanners = @($failedAcl.Messages | Where-Object { $_ -like 'Client workspace ready:*' })
Assert-HVCG 'Failed ACL no ready banner' ($readyBanners.Count -eq 0) ($readyBanners -join '; ')
Assert-HVCG 'Failed ACL required failure' ($failedAcl.RequiredFailures.Count -ge 1)

# Missing required principal fail-closed
$missingRequired = Resolve-HVCGSharePointPrincipal -Name 'HVCG-Client-NOPE' -FindEntraGroup $findEntra -FindSiteGroup $findSite -Required $true
$missingExec = New-HVCGInMemoryWorkspaceExecutor -Libraries $partialState
$missingRun = Invoke-HVCGClientWorkspaceRepair -Apply -Executor $missingExec -LibraryTitle 'HVCG_SYN01' -Folders @() -Principals @($missingRequired)
Assert-HVCG 'Missing client group fail-closed' (-not $missingRun.Ready -and $missingRun.RequiredFailures.Count -ge 1)

# Optional missing role is warning only
$optMissing = Resolve-HVCGSharePointPrincipal -Name 'HVCG-Role-Owner' -FindEntraGroup $findEntra -FindSiteGroup $findSite -Required $false
$optExec = New-HVCGInMemoryWorkspaceExecutor -Libraries @{
  HVCG_SYN01 = [pscustomobject]@{
    Exists = $true
    HasUniqueRoleAssignments = $true
    Folders = [System.Collections.Generic.List[string]]::new()
    Acl = @{ 'c:0t.c|tenant|a8e9b1e2-b69d-4170-b0cd-6604d34884a1' = @('Contribute') }
  }
}
$optRun = Invoke-HVCGClientWorkspaceRepair -Apply -Executor $optExec -LibraryTitle 'HVCG_SYN01' -Folders @() -Principals @($optMissing, $entra)
Assert-HVCG 'Optional missing role still ready' ($optRun.Ready)
Assert-HVCG 'Optional missing role warning' ($optRun.OptionalWarnings.Count -ge 1)

# Forbidden Hub MI
Assert-HVCG 'Hub MI forbidden' (Test-HVCGForbiddenPnPClientId -ClientId '2b9ca61d-2396-4caa-95cd-30200d2ff36a')
Assert-HVCG 'Capital PnP allowed' (-not (Test-HVCGForbiddenPnPClientId -ClientId '6672e28b-0b90-426c-a64c-3afbc0d13495'))
Assert-HVCG 'Legacy PnP allowed' (-not (Test-HVCGForbiddenPnPClientId -ClientId '836fb743-6439-4836-b1f2-4a144ce2f762'))

# Live WHATIF of the actual script (no mutation)
$scriptPath = Join-Path $RepoRoot 'deployment/scripts/New-HVCGClientWorkspace.ps1'
$out = pwsh -NoProfile -File $scriptPath -ClientsSiteUrl 'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients' -ClientCode SYN01 -ClientDisplayName 'SYNTHETIC QA — Atlas Capital Operations' 2>&1 | Out-String
Assert-HVCG 'Script WHATIF banner' ($out -match 'MODE: WHATIF — ZERO MUTATIONS PERMITTED')
Assert-HVCG 'Script WHATIF prints path' ($out -match 'SCRIPT PATH:')
Assert-HVCG 'Script WHATIF prints SHA' ($out -match 'COMMIT SHA:')
Assert-HVCG 'Script WHATIF prints PnP Client ID' ($out -match 'PNP CLIENT ID:')
Assert-HVCG 'Script WHATIF no ready' ($out -notmatch 'Client workspace ready:')
Assert-HVCG 'Script WHATIF zsh one-liner' ($out -match 'cd "/Volumes/MacMiniPro2TB/HVCG Project Management System/.worktrees/atlas-capital-operations" && pwsh -File')
Assert-HVCG 'Script WHATIF no backtick continuation' ($out -notmatch '`\r?\n')

if ($failed -gt 0) {
  Write-Host "FAILED $failed"
  exit 1
}
Write-Host 'ALL PASS'
exit 0
