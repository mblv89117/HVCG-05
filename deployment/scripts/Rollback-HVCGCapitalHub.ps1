#Requires -Version 7.0
<#
.SYNOPSIS
  Restore the previous Hub server.js zip and remove INTEGRATION_CAPITAL_* settings together.

.DESCRIPTION
  Does not delete SharePoint columns or lists. Does not revoke list grants unless -RevokeGrants.
  Default is WhatIf.
#>
[CmdletBinding()]
param(
  [switch]$Apply,
  [switch]$RevokeGrants,
  [string]$RollbackZip = '',
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path,
  [string]$ResourceGroup = 'rg-atlas-prod',
  [string]$AppName = 'app-atlas-integration-hub'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ExpectedTenantId = '3df46563-86f3-4414-87fd-84ba967741ef'
$ExpectedSubscriptionId = 'ebc84d85-b5ff-4c4b-add1-b0a8de31b319'
$acct = az account show | ConvertFrom-Json
if ($acct.tenantId -ne $ExpectedTenantId) { throw "Wrong tenant $($acct.tenantId)" }
if ($acct.id -ne $ExpectedSubscriptionId) { throw "Wrong subscription $($acct.id)" }

if (-not $RollbackZip) {
  $dir = Join-Path $RepoRoot 'deployment/artifacts/hub-rollback'
  $latest = Get-ChildItem -Path $dir -Filter 'pre-*.zip' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $latest) { throw "No rollback zip under $dir. Pass -RollbackZip." }
  $RollbackZip = $latest.FullName
}
if (-not (Test-Path $RollbackZip)) { throw "Rollback zip not found: $RollbackZip" }

$capitalKeys = @(
  'INTEGRATION_CAPITAL_BACKEND',
  'INTEGRATION_CAPITAL_OPPORTUNITIES_LIST_ID',
  'INTEGRATION_CAPITAL_DOCUMENT_REQUESTS_LIST_ID',
  'INTEGRATION_CAPITAL_LENDER_OUTREACH_LIST_ID',
  'INTEGRATION_CAPITAL_LENDERS_LIST_ID',
  'INTEGRATION_CAPITAL_ALLOW_SYNTHETIC_GRAPH',
  'INTEGRATION_CAPITAL_OPTIONAL_COLUMNS',
  'INTEGRATION_CAPITAL_SHAREPOINT_SITE_ID',
  'INTEGRATION_CAPITAL_CLIENTS_LIST_ID'
)

Write-Host "Mode: $(if ($Apply) { 'APPLY' } else { 'WHATIF' })"
Write-Host "Redeploy $RollbackZip"
Write-Host "Delete these App Settings together: $($capitalKeys -join ', ')"
Write-Host 'Will NOT delete SharePoint columns, lists, SYN01 client, or HVCG-Client-SYN01.'
if ($RevokeGrants) { Write-Host 'Will also delete Hub list-level write grants on the three capital lists.' }

if (-not $Apply) { return }

az webapp deploy -g $ResourceGroup -n $AppName --src-path $RollbackZip --type zip --async false
az webapp config appsettings delete -g $ResourceGroup -n $AppName --setting-names @capitalKeys --output none
Write-Host 'Previous Hub zip restored. INTEGRATION_CAPITAL_* removed as a set (capital 503; PM should remain).'
Write-Host 'INTEGRATION_CLIENT_ENTITLEMENT_GROUPS is left intact so PM entitlements stay valid. Remove :SYN01 mapping separately if required.'
