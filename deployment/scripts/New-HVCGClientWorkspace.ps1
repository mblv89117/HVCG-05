#Requires -Version 7.0
<#
.SYNOPSIS
  Creates a client document library with standard HVCG folder structure and broken inheritance.

.DESCRIPTION
  Default is WhatIf (print plan, no SharePoint mutation, no MFA).
  -Apply uses HVCG-PnP-Capital-Provisioning interactive login (no secret).
  Targets only HVCG_{ClientCode} on the supplied Clients site.

.EXAMPLE
  pwsh -File ./deployment/scripts/New-HVCGClientWorkspace.ps1 -ClientsSiteUrl 'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients' -ClientCode SYN01 -ClientDisplayName 'SYNTHETIC QA — Atlas Capital Operations'
  pwsh -File ./deployment/scripts/New-HVCGClientWorkspace.ps1 -ClientsSiteUrl 'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients' -ClientCode SYN01 -ClientDisplayName 'SYNTHETIC QA — Atlas Capital Operations' -Apply
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$ClientsSiteUrl,
  [Parameter(Mandatory = $true)][string]$ClientCode,
  [Parameter(Mandatory = $true)][string]$ClientDisplayName,
  [Parameter(Mandatory = $false)][string]$ClientSecurityGroupName = "HVCG-Client-$ClientCode",
  [Parameter(Mandatory = $false)][string]$ConfigPath = (Join-Path $PSScriptRoot "../../config/hvcg.config.json"),
  [switch]$Apply
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.Deployment.psm1') -Force
$Report = New-HVCGDeploymentReport -Environment 'adhoc-client-ws' -RepoRoot $RepoRoot
$config = Get-Content (Resolve-Path $ConfigPath) -Raw | ConvertFrom-Json
$libraryTitle = "HVCG_$ClientCode"
$code = $ClientCode.Trim().ToUpperInvariant()
if ($code -cne $ClientCode.Trim()) {
  throw "ClientCode must be canonical uppercase (got '$ClientCode')."
}
if ($code -notmatch '^[A-Z][A-Z0-9]{2,15}$') {
  throw "ClientCode '$ClientCode' is not a canonical HVCG ClientCode."
}

Write-Host "Mode: $(if ($Apply) { 'APPLY (interactive PnP MFA)' } else { 'WHATIF (no mutation, no MFA)' })"
Write-Host "Site: $ClientsSiteUrl"
Write-Host "Library: $libraryTitle"
Write-Host "Display name (not written as Title unless creating the library): $ClientDisplayName"
Write-Host "Entra/site group grants (Contribute) if present:"
Write-Host "  HVCG-Role-Owner"
Write-Host "  HVCG-Role-Administrator"
Write-Host "  HVCG-Role-OperationsManager"
Write-Host "  $ClientSecurityGroupName"
Write-Host "Folders ($($config.documentFolderStructure.Count)):"
foreach ($folder in $config.documentFolderStructure) {
  Write-Host "  $libraryTitle/$folder"
}
Write-Host "Will NOT: create a site, create an Entra app, touch other HVCG_* libraries, change id-atlas-prod, change Hub App Settings, or send mail."
Write-Host "Will NOT write HVCG_Clients.SharePointLibraryUrl (Power Automate flow does that for live clients)."

if (-not $Apply) {
  Write-Host "Re-run with -Apply after this plan. Interactive MFA uses HVCG-PnP-Capital-Provisioning (Client ID in config/environments/development.json). No secret."
  return
}

$envCfg = Get-Content (Join-Path $RepoRoot 'config/environments/development.json') -Raw | ConvertFrom-Json
$null = Initialize-HVCGPnPAuth -Config $envCfg -Report $Report
Connect-HVCGPnPOnline -Url $ClientsSiteUrl -Config $envCfg -Report $Report

$existing = Get-PnPList -Identity $libraryTitle -ErrorAction SilentlyContinue
if (-not $existing) {
  New-PnPList -Title $libraryTitle -Template DocumentLibrary | Out-Null
  Write-Host "Created library $libraryTitle"
}
else {
  Write-Host "Library $libraryTitle already exists — folders/permissions only."
}

foreach ($folder in $config.documentFolderStructure) {
  Resolve-PnPFolder -SiteRelativePath "$libraryTitle/$folder" | Out-Null
}

$list = Get-PnPList -Identity $libraryTitle
if (-not $list.HasUniqueRoleAssignments) {
  $list.BreakRoleInheritance($false, $false)
  Invoke-PnPQuery
}

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
