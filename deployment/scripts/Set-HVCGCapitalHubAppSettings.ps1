#Requires -Version 7.0
<#
.SYNOPSIS
  Set production Capital App Settings on app-atlas-integration-hub.

.DESCRIPTION
  Does not deploy code. Does not print secrets or the full entitlement map.
  Default is WhatIf. Only run AFTER the Hub build that contains capital Graph is deployed
  (GET /health must report capitalBackend).

  Appends HVCG-Client-SYN01 to INTEGRATION_CLIENT_ENTITLEMENT_GROUPS without
  duplicating ClientCodes (duplicate codes empty the entire map).

.EXAMPLE
  pwsh -File ./deployment/scripts/Set-HVCGCapitalHubAppSettings.ps1
  pwsh -File ./deployment/scripts/Set-HVCGCapitalHubAppSettings.ps1 -Apply
  pwsh -File ./deployment/scripts/Set-HVCGCapitalHubAppSettings.ps1 -Apply -AllowSyntheticGraph
#>
[CmdletBinding()]
param(
  [switch]$Apply,
  [switch]$AllowSyntheticGraph,
  [string]$ResourceGroup = 'rg-atlas-prod',
  [string]$AppName = 'app-atlas-integration-hub',
  [string]$Syn01GroupId = '',
  [string]$HubBase = 'https://app-atlas-integration-hub.azurewebsites.net'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ExpectedTenantId = '3df46563-86f3-4414-87fd-84ba967741ef'
$ExpectedSubscriptionId = 'ebc84d85-b5ff-4c4b-add1-b0a8de31b319'
$Syn01GroupName = 'HVCG-Client-SYN01'
$OptionalColumns = 'Stage,StageEnteredAt,NextAction,NextActionOwner,MannyStrategyApproval,MannyShortlistApproval,SubmissionStatus'

$acct = az account show | ConvertFrom-Json
if ($acct.tenantId -ne $ExpectedTenantId) { throw "Wrong tenant $($acct.tenantId)" }
if ($acct.id -ne $ExpectedSubscriptionId) { throw "Wrong subscription $($acct.id)" }

$healthRaw = Invoke-RestMethod -Method GET -Uri "$HubBase/health"
if (-not $healthRaw.ok) { throw 'Hub /health is not ok. Aborting App Settings change.' }
if (-not $healthRaw.capitalBackend) {
  throw 'Hub /health has no capitalBackend. Deploy the capital Hub build before App Settings.'
}

if (-not $Syn01GroupId) {
  $synGroup = az ad group list --filter "displayName eq '$Syn01GroupName'" -o json | ConvertFrom-Json
  $synGroupObj = @($synGroup) | Select-Object -First 1
  if (-not $synGroupObj) {
    throw "$Syn01GroupName not found. Run Enable-HVCGCapitalMinSlice.ps1 -Apply first."
  }
  $Syn01GroupId = [string]$synGroupObj.id
}

$currentSettings = az webapp config appsettings list -g $ResourceGroup -n $AppName -o json | ConvertFrom-Json
$currentMap = ''
foreach ($s in $currentSettings) {
  if ($s.name -eq 'INTEGRATION_CLIENT_ENTITLEMENT_GROUPS') { $currentMap = [string]$s.value }
}
$parts = @()
$hasSyn01 = $false
if ($currentMap) {
  foreach ($part in $currentMap.Split(',')) {
    $trimmed = $part.Trim()
    if (-not $trimmed) { continue }
    $colon = $trimmed.IndexOf(':')
    if ($colon -le 0) { throw 'INTEGRATION_CLIENT_ENTITLEMENT_GROUPS is malformed. Aborting to avoid emptying the map.' }
    $code = $trimmed.Substring($colon + 1).Trim()
    if ($code -eq 'SYN01') { $hasSyn01 = $true }
    $parts += $trimmed
  }
}
if (-not $hasSyn01) {
  $parts += "${Syn01GroupId}:SYN01"
}
$nextMap = ($parts -join ',')
if ($nextMap -notmatch 'SYN01') { throw 'Refusing to write entitlement map without SYN01.' }
if ($currentMap -and ($currentMap.Split(',').Count -gt 0) -and ($parts.Count -lt 2)) {
  throw 'Refusing to shrink INTEGRATION_CLIENT_ENTITLEMENT_GROUPS.'
}

$synthetic = if ($AllowSyntheticGraph) { 'true' } else { 'false' }
$settings = [ordered]@{
  INTEGRATION_CAPITAL_BACKEND = 'sharepoint'
  INTEGRATION_CAPITAL_OPPORTUNITIES_LIST_ID = '255763b8-7c44-446b-8290-adde5c3c6f66'
  INTEGRATION_CAPITAL_DOCUMENT_REQUESTS_LIST_ID = '89a421e9-3086-47ef-80c3-214500d3d92c'
  INTEGRATION_CAPITAL_LENDER_OUTREACH_LIST_ID = 'c49d02bb-eab5-44b5-8232-714e30867887'
  INTEGRATION_CAPITAL_LENDERS_LIST_ID = '6b759f97-d074-4cc0-b3c7-c62c947fb74e'
  INTEGRATION_CAPITAL_ALLOW_SYNTHETIC_GRAPH = $synthetic
  INTEGRATION_CAPITAL_OPTIONAL_COLUMNS = $OptionalColumns
}

Write-Host "App $AppName / $ResourceGroup"
Write-Host "Mode: $(if ($Apply) { 'APPLY (recycles app)' } else { 'WHATIF' })"
Write-Host "capitalBackend already present on /health: $($healthRaw.capitalBackend.mode)"
$settings.GetEnumerator() | ForEach-Object { Write-Host "  $($_.Name)=$($_.Value)" }
Write-Host "  INTEGRATION_CLIENT_ENTITLEMENT_GROUPS: SYN01 mapped=$(if ($hasSyn01) { 'already' } else { 'will append' }) groupId=$Syn01GroupId (full map not printed)"

if (-not $Apply) {
  Write-Host 'Re-run with -Apply after Hub code containing capital Graph is deployed.'
  return
}

$pairs = @($settings.GetEnumerator() | ForEach-Object { "$($_.Name)=$($_.Value)" })
$pairs += "INTEGRATION_CLIENT_ENTITLEMENT_GROUPS=$nextMap"
az webapp config appsettings set -g $ResourceGroup -n $AppName --settings @pairs --output none
Write-Host 'App Settings updated. App will recycle.'
Write-Host "Verify GET /health capitalBackend.mode=sharepoint and INTEGRATION_CAPITAL_ALLOW_SYNTHETIC_GRAPH=$synthetic"
