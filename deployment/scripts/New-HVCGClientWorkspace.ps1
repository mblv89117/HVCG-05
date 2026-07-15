#Requires -Version 7.0
<#
.SYNOPSIS
  Creates a client document library with standard HVCG folder structure and broken inheritance.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$ClientsSiteUrl,
  [Parameter(Mandatory = $true)][string]$ClientCode,
  [Parameter(Mandatory = $true)][string]$ClientDisplayName,
  [Parameter(Mandatory = $false)][string]$ClientSecurityGroupName = "HVCG-Client-$ClientCode",
  [Parameter(Mandatory = $false)][string]$ConfigPath = (Join-Path $PSScriptRoot "../../config/hvcg.config.json")
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.Deployment.psm1') -Force
$Report = New-HVCGDeploymentReport -Environment 'adhoc-client-ws' -RepoRoot $RepoRoot
$envCfg = Get-Content (Join-Path $RepoRoot 'config/environments/development.json') -Raw | ConvertFrom-Json
$null = Initialize-HVCGPnPAuth -Config $envCfg -Report $Report
$config = Get-Content (Resolve-Path $ConfigPath) -Raw | ConvertFrom-Json
$libraryTitle = "HVCG_$ClientCode"

Connect-HVCGPnPOnline -Url $ClientsSiteUrl -Config $envCfg -Report $Report

$existing = Get-PnPList -Identity $libraryTitle -ErrorAction SilentlyContinue
if (-not $existing) {
  New-PnPList -Title $libraryTitle -Template DocumentLibrary | Out-Null
  Write-Host "Created library $libraryTitle"
}

# Ensure folders
foreach ($folder in $config.documentFolderStructure) {
  Resolve-PnPFolder -SiteRelativePath "$libraryTitle/$folder" | Out-Null
}

# Break inheritance
$list = Get-PnPList -Identity $libraryTitle
if (-not $list.HasUniqueRoleAssignments) {
  $list.BreakRoleInheritance($false, $false)
  Invoke-PnPQuery
}

# Grant groups (must exist in Entra / site)
$roleEdit = "Contribute"
foreach ($principal in @(
    "HVCG-Role-Owner",
    "HVCG-Role-Administrator",
    "HVCG-Role-OperationsManager",
    $ClientSecurityGroupName
  )) {
  try {
    Set-PnPGroupPermissions -Identity $principal -List $libraryTitle -AddRole $roleEdit -ErrorAction Stop
  }
  catch {
    Write-Warning "Could not grant $principal on $libraryTitle : $_"
  }
}

$url = (Get-PnPList -Identity $libraryTitle).RootFolder.ServerRelativeUrl
Write-Host "Client workspace ready: $url"
Disconnect-PnPOnline
