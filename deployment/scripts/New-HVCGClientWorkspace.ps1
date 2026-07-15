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
$config = Get-Content (Resolve-Path $ConfigPath) -Raw | ConvertFrom-Json
$libraryTitle = "HVCG_$ClientCode"

Connect-PnPOnline -Url $ClientsSiteUrl -Interactive

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
