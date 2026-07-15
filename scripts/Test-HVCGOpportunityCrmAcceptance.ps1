#Requires -Version 7.0
<#
.SYNOPSIS
  Offline (default) acceptance checks for the HVCG Opportunity CRM module.

.DESCRIPTION
  Validates schema bridge artifacts, CRM flow packages + Teams policy, Power Apps
  formula tokens, permissions mentions, lifecycle unit tests, and smoke helpers.
  Does not connect to SharePoint or deploy anything.

.PARAMETER Offline
  Run offline artifact checks only (default: true). Kept as an explicit switch for CI clarity.

.PARAMETER RepoRoot
  Repository root. Defaults to parent of /scripts.

.PARAMETER JsonOut
  Optional path for a JSON summary report.
#>
[CmdletBinding()]
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [switch]$Offline = $true,
  [string]$JsonOut = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Write-Host "=== HVCG Opportunity CRM Acceptance ===" -ForegroundColor Cyan
Write-Host "RepoRoot: $RepoRoot"
Write-Host "Mode: $(if ($Offline) { 'Offline' } else { 'Offline (forced — live mode not implemented in this package)' })"

$failures = 0
$results = [ordered]@{
  started = (Get-Date).ToString('o')
  mode    = 'Offline'
  checks  = @()
}

function Add-Check {
  param([string]$Name, [bool]$Passed, [string]$Detail)
  $script:results.checks += [pscustomobject]@{ name = $Name; passed = $Passed; detail = $Detail }
  if ($Passed) {
    Write-Host "PASS  $Name — $Detail" -ForegroundColor Green
  }
  else {
    Write-Host "FAIL  $Name — $Detail" -ForegroundColor Red
    $script:failures++
  }
}

$py = Get-Command python3 -ErrorAction SilentlyContinue
if (-not $py) { $py = Get-Command python -ErrorAction SilentlyContinue }
Add-Check 'python_available' ($null -ne $py) $(if ($py) { $py.Source } else { 'python3/python not found' })

# Required artifact presence
$required = @(
  'src/sharepoint/lists/HVCG_Opportunities.json',
  'src/sharepoint/lists/HVCG_OpportunityActivities.json',
  'src/sharepoint/lists/HVCG_CapitalOpportunities.json',
  'src/sharepoint/lists/HVCG_Leads.json',
  'src/power-automate/flows/HVCG_LeadQualifiedCreateOpportunity.json',
  'src/power-automate/flows/HVCG_OpportunityStageChangedNotify.json',
  'src/power-automate/flows/HVCG_OpportunityWonCloseout.json',
  'src/power-automate/flows/HVCG_CapitalFundingStatusNotify.json',
  'src/power-apps/formulas/NamedFormulas.fx',
  'src/power-apps/screens/scrCRM.md',
  'src/power-apps/screens/scrOpportunityDetail.md',
  'docs/crm/OPPORTUNITY_MANAGEMENT.md',
  'docs/crm/SMOKE_TEST_CHECKLIST.md',
  'PERMISSIONS_MATRIX.md',
  'releases/migrations/20260715_001_opportunity_crm_module.json',
  'releases/migrations/diffs/opportunity_crm_v1.json',
  'tests/unit/test_opportunity_lifecycle.py',
  'tests/unit/test_opportunity_crm.py',
  'tests/crm/smoke_helpers.py',
  'sample-data/demo-pack.json'
)
foreach ($rel in $required) {
  $p = Join-Path $RepoRoot $rel
  Add-Check "artifact:$rel" (Test-Path -LiteralPath $p) $p
}

# Parse this acceptance script
try {
  $tokens = $null
  $errors = $null
  $null = [System.Management.Automation.Language.Parser]::ParseFile($PSCommandPath, [ref]$tokens, [ref]$errors)
  $ok = ($null -eq $errors -or $errors.Count -eq 0)
  $detail = if ($ok) { 'parsed OK' } else { ($errors | ForEach-Object { $_.ToString() }) -join '; ' }
  Add-Check 'ps_parse:acceptance' $ok $detail
}
catch {
  Add-Check 'ps_parse:acceptance' $false $_.Exception.Message
}

if ($py) {
  & $py.Source (Join-Path $RepoRoot 'tests/crm/smoke_helpers.py')
  Add-Check 'crm_smoke_helpers' ($LASTEXITCODE -eq 0) 'tests/crm/smoke_helpers.py'

  & $py.Source (Join-Path $RepoRoot 'tests/unit/test_opportunity_lifecycle.py')
  Add-Check 'opportunity_lifecycle' ($LASTEXITCODE -eq 0) 'test_opportunity_lifecycle.py'

  & $py.Source (Join-Path $RepoRoot 'tests/unit/test_opportunity_crm.py')
  Add-Check 'opportunity_crm_module' ($LASTEXITCODE -eq 0) 'test_opportunity_crm.py'
}
else {
  Add-Check 'crm_smoke_helpers' $false 'python unavailable'
  Add-Check 'opportunity_lifecycle' $false 'python unavailable'
  Add-Check 'opportunity_crm_module' $false 'python unavailable'
}

# Quick Teams policy + formula token scan (PowerShell mirror of Python gates)
$crmFlows = @(
  'HVCG_LeadQualifiedCreateOpportunity',
  'HVCG_OpportunityStageChangedNotify',
  'HVCG_OpportunityWonCloseout',
  'HVCG_CapitalFundingStatusNotify'
)
foreach ($fn in $crmFlows) {
  $fp = Join-Path $RepoRoot "src/power-automate/flows/$fn.json"
  if (-not (Test-Path $fp)) {
    Add-Check "teams_policy:$fn" $false 'file missing'
    continue
  }
  $meta = Get-Content -LiteralPath $fp -Raw | ConvertFrom-Json
  $hasTeams = @($meta.connections) -contains 'Teams'
  $hasBlock = $null -ne $meta.PSObject.Properties['teamsIntegration']
  Add-Check "teams_policy:$fn" ($hasTeams -and $hasBlock) "Teams=$hasTeams teamsIntegration=$hasBlock"
}

$fxPath = Join-Path $RepoRoot 'src/power-apps/formulas/NamedFormulas.fx'
if (Test-Path $fxPath) {
  $fx = Get-Content -LiteralPath $fxPath -Raw
  foreach ($token in @('nfOpenPipeline', 'nfQualifiedLeads', 'nfCapitalHandoffsReady', 'nfMyOpportunities')) {
    Add-Check "formula:$token" ($fx -match [regex]::Escape($token)) $token
  }
}

$perm = Join-Path $RepoRoot 'PERMISSIONS_MATRIX.md'
if (Test-Path $perm) {
  $pt = Get-Content -LiteralPath $perm -Raw
  Add-Check 'permissions_leads_opportunities' ($pt -match 'HVCG_Leads / Opportunities') 'PERMISSIONS_MATRIX row present'
  Add-Check 'permissions_crm_domain' ($pt -match 'CRM / Proposals') 'CRM domain row present'
}

$results.finished = (Get-Date).ToString('o')
$results.passed = ($failures -eq 0)
$results.failureCount = $failures

$out = if ($JsonOut) { $JsonOut } else { Join-Path $RepoRoot 'deployment/reports/opportunity-crm-acceptance-latest.json' }
New-Item -ItemType Directory -Force -Path (Split-Path $out) | Out-Null
($results | ConvertTo-Json -Depth 6) | Set-Content -Path $out -Encoding UTF8
Write-Host "Report: $out"

if ($failures -gt 0) {
  Write-Host "RESULT: FAIL ($failures checks)" -ForegroundColor Red
  exit 1
}
Write-Host "RESULT: PASS" -ForegroundColor Green
exit 0
