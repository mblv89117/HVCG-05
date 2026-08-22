#Requires -Version 7.0
<#
.SYNOPSIS
  Creates or repairs a client document library with standard HVCG folders and least-privilege ACL.

.DESCRIPTION
  Default is WhatIf: print identity + plan, perform no SharePoint writes, no MFA.
  Only -Apply may create a library, create folders, break inheritance, or grant/revoke permissions.

  Canonical copy:
  /Volumes/MacMiniPro2TB/HVCG Project Management System/.worktrees/atlas-capital-operations/deployment/scripts/New-HVCGClientWorkspace.ps1

  Entra security groups are granted as claims principals (c:0t.c|tenant|{object-id}).
  They are not SharePoint site groups. Do not use Set-PnPGroupPermissions for them.

.EXAMPLE
  cd "/Volumes/MacMiniPro2TB/HVCG Project Management System/.worktrees/atlas-capital-operations" && pwsh -File ./deployment/scripts/New-HVCGClientWorkspace.ps1 -ClientsSiteUrl "https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients" -ClientCode SYN01 -ClientDisplayName "SYNTHETIC QA — Atlas Capital Operations"

.EXAMPLE
  cd "/Volumes/MacMiniPro2TB/HVCG Project Management System/.worktrees/atlas-capital-operations" && pwsh -File ./deployment/scripts/New-HVCGClientWorkspace.ps1 -ClientsSiteUrl "https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients" -ClientCode SYN01 -ClientDisplayName "SYNTHETIC QA — Atlas Capital Operations" -Apply
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$ClientsSiteUrl,
  [Parameter(Mandatory = $true)][string]$ClientCode,
  [Parameter(Mandatory = $true)][string]$ClientDisplayName,
  [Parameter(Mandatory = $false)][string]$ClientSecurityGroupName = "HVCG-Client-$ClientCode",
  [Parameter(Mandatory = $false)][string]$ConfigPath = (Join-Path $PSScriptRoot '../../config/hvcg.config.json'),
  [switch]$Apply
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.ClientWorkspace.psm1') -Force

$code = $ClientCode.Trim().ToUpperInvariant()
if ($code -cne $ClientCode.Trim()) {
  throw "ClientCode must be canonical uppercase (got '$ClientCode')."
}
if ($code -notmatch '^[A-Z][A-Z0-9]{2,15}$') {
  throw "ClientCode '$ClientCode' is not a canonical HVCG ClientCode."
}

$libraryTitle = "HVCG_$code"
$envConfigPath = Join-Path $RepoRoot 'config/environments/development.json'
$pnpClientId = Get-HVCGPnPClientIdFromConfigFile -ConfigPath $envConfigPath
$tenant = ''
$siteFromCfg = ''
if (Test-Path -LiteralPath $envConfigPath) {
  $envCfgPreview = Get-Content -LiteralPath $envConfigPath -Raw | ConvertFrom-Json
  $tenant = [string]$envCfgPreview.tenant.tenantId
  if ([string]::IsNullOrWhiteSpace($tenant)) { $tenant = [string]$envCfgPreview.tenant.domain }
}

$identity = Get-HVCGRepoIdentity -RepoRoot $RepoRoot -ScriptPath $PSCommandPath
$modeLabel = if ($Apply) { 'MODE: APPLY — PRODUCTION MUTATION ENABLED' } else { 'MODE: WHATIF — ZERO MUTATIONS PERMITTED' }

Write-Host "SCRIPT PATH: $($identity.ScriptPath)"
Write-Host "REPOSITORY ROOT: $($identity.RepositoryRoot)"
Write-Host "BRANCH: $($identity.Branch)"
Write-Host "COMMIT SHA: $($identity.CommitSha)"
Write-Host $modeLabel
Write-Host "TENANT: $tenant"
Write-Host "SITE: $ClientsSiteUrl"
Write-Host "CLIENT CODE: $code"
Write-Host "PNP CLIENT ID: $(if ($pnpClientId) { $pnpClientId } else { '(unresolved)' })"
Write-Host "DISPLAY NAME: $ClientDisplayName"
Write-Host "CANONICAL REPO: $(Get-HVCGCanonicalRepoRoot)"

if (Test-HVCGForbiddenPnPClientId -ClientId $pnpClientId) {
  throw "Refuse: PnP Client ID resolved to Hub identity id-atlas-prod. Use HVCG-PnP-PowerShell or HVCG-PnP-Capital-Provisioning."
}

$config = Get-Content (Resolve-Path $ConfigPath) -Raw | ConvertFrom-Json
$folders = @($config.documentFolderStructure)

$optionalRoleNames = @(
  'HVCG-Role-Owner',
  'HVCG-Role-Administrator',
  'HVCG-Role-OperationsManager'
)

Write-Host 'PLAN:'
Write-Host "  Library: $libraryTitle"
Write-Host "  Folders: $($folders.Count) (00–23)"
Write-Host '  Inheritance: unique (break if still inherited; do not copy Members/Visitors)'
Write-Host "  REQUIRED principal: $ClientSecurityGroupName (Entra security group claims, Contribute)"
Write-Host '  OPTIONAL principals (warn if missing; do not fail closed):'
foreach ($n in $optionalRoleNames) { Write-Host "    $n" }
Write-Host '  Will NOT: create a site, create/rotate Entra apps, touch other HVCG_* libraries, change id-atlas-prod, change Hub App Settings, grant Everyone, or restore site Members.'

if (-not (Test-HVCGCanonicalProvisioningTree -RepoRoot $RepoRoot)) {
  Write-Warning "This copy is not the canonical provisioning tree ($RepoRoot). APPLY is refused unless HVCG_ALLOW_NONCANONICAL_TREE=1. Use: $(Get-HVCGCanonicalRepoRoot)"
}

$applyLine = "cd `"$(Get-HVCGCanonicalRepoRoot)`" && pwsh -File ./deployment/scripts/New-HVCGClientWorkspace.ps1 -ClientsSiteUrl `"$ClientsSiteUrl`" -ClientCode $code -ClientDisplayName `"$ClientDisplayName`" -Apply"

if (-not $Apply) {
  Write-Host 'WHATIF complete. Zero SharePoint mutations. No MFA.'
  Write-Host "Owner APPLY (zsh, one line): $applyLine"
  exit 0
}

if (-not (Test-HVCGCanonicalProvisioningTree -RepoRoot $RepoRoot)) {
  throw "Refuse APPLY from unexpected repository context: $RepoRoot. Canonical: $(Get-HVCGCanonicalRepoRoot). Re-run from that path, or set HVCG_ALLOW_NONCANONICAL_TREE=1."
}

Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.Deployment.psm1') -Force
$Report = New-HVCGDeploymentReport -Environment 'adhoc-client-ws' -RepoRoot $RepoRoot
$envCfg = Get-Content -LiteralPath $envConfigPath -Raw | ConvertFrom-Json
$null = Initialize-HVCGPnPAuth -Config $envCfg -Report $Report
Write-Host "PNP CLIENT ID (resolved): $(Resolve-HVCGPnPClientId -Config $envCfg)"
Connect-HVCGPnPOnline -Url $ClientsSiteUrl -Config $envCfg -Report $Report

$findEntra = {
  param($Name)
  if ($Name -notmatch '^HVCG[-A-Za-z0-9 ]+$') { return $null }
  try {
    $g = Get-PnPAzureADGroup -Identity $Name -ErrorAction Stop
    if ($g) { return $g }
  } catch { }
  try {
    $url = "https://graph.microsoft.com/v1.0/groups?`$filter=displayName eq '$Name'&`$select=id,displayName,groupTypes,securityEnabled"
    $raw = az rest --method GET --url $url -o json 2>$null
    if ($raw) {
      $parsed = $raw | ConvertFrom-Json
      $hit = @($parsed.value) | Where-Object { $_.displayName -eq $Name } | Select-Object -First 1
      if ($hit) { return $hit }
    }
  } catch { }
  return $null
}

$findSite = {
  param($Name)
  try {
    return Get-PnPGroup -Identity $Name -ErrorAction Stop
  } catch {
    return $null
  }
}

$principals = @()
foreach ($n in $optionalRoleNames) {
  $principals += Resolve-HVCGSharePointPrincipal -Name $n -FindEntraGroup $findEntra -FindSiteGroup $findSite -Required $false
}
$principals += Resolve-HVCGSharePointPrincipal -Name $ClientSecurityGroupName -FindEntraGroup $findEntra -FindSiteGroup $findSite -Required $true

$executor = [pscustomobject]@{
  GetLibraryState = {
    param($Title)
    $list = Get-PnPList -Identity $Title -ErrorAction SilentlyContinue
    if (-not $list) {
      return [pscustomobject]@{ Exists = $false; HasUniqueRoleAssignments = $false }
    }
    $full = Get-PnPList -Identity $Title -Includes HasUniqueRoleAssignments
    return [pscustomobject]@{ Exists = $true; HasUniqueRoleAssignments = [bool]$full.HasUniqueRoleAssignments }
  }
  CreateLibrary = {
    param($Title)
    New-PnPList -Title $Title -Template DocumentLibrary | Out-Null
  }
  FolderExists = {
    param($Title, $Folder)
    $item = Get-PnPFolder -Url "$Title/$Folder" -ErrorAction SilentlyContinue
    return [bool]$item
  }
  CreateFolder = {
    param($Title, $Folder)
    Resolve-PnPFolder -SiteRelativePath "$Title/$Folder" | Out-Null
  }
  BreakInheritance = {
    param($Title)
    $list = Get-PnPList -Identity $Title
    $list.BreakRoleInheritance($false, $false)
    Invoke-PnPQuery
  }
  GetPrincipalRoles = {
    param($Title, $Principal)
    $list = Get-PnPList -Identity $Title -Includes RoleAssignments
    foreach ($ra in @($list.RoleAssignments)) {
      Get-PnPProperty -ClientObject $ra -Property Member, RoleDefinitionBindings | Out-Null
      $login = [string]$ra.Member.LoginName
      $titleMatch = [string]$ra.Member.Title
      if ($login -eq $Principal.LoginName -or $titleMatch -eq $Principal.DisplayName) {
        return @($ra.RoleDefinitionBindings | ForEach-Object { [string]$_.Name })
      }
    }
    return @()
  }
  GrantPrincipal = {
    param($Title, $Principal, $Role)
    if ($Principal.Kind -eq 'SharePointSiteGroup') {
      Set-PnPListPermission -Identity $Title -Group $Principal.DisplayName -AddRole $Role
    } else {
      Set-PnPListPermission -Identity $Title -User $Principal.LoginName -AddRole $Role
    }
  }
}

$result = Invoke-HVCGClientWorkspaceRepair -Apply -Executor $executor -LibraryTitle $libraryTitle -Folders $folders -Principals $principals -NeededRole Contribute

foreach ($m in $result.Messages) { Write-Host $m }
foreach ($w in $result.OptionalWarnings) { Write-Warning $w }

Disconnect-PnPOnline -ErrorAction SilentlyContinue

if (-not $result.Ready) {
  foreach ($f in $result.RequiredFailures) { Write-Error $f }
  Write-Host 'FAIL CLOSED. Client workspace is not ready.'
  exit 1
}

exit 0
