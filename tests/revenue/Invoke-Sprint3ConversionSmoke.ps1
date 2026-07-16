#Requires -Version 7.0
<#
.SYNOPSIS
  Sprint 3 Dev CRM smoke — write conversion Notes to Dev HVCG_Leads (no Prod).
#>
[CmdletBinding()]
param([switch]$SkipCrm)

$ErrorActionPreference = 'Stop'
$Repo = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$NodeTest = Join-Path $Repo 'tests/revenue/run_conversion_tests.js'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$outDir = Join-Path $Repo 'deployment/reports/checkpoints'
if (-not (Test-Path $outDir)) {
  $outDir = Join-Path '/Volumes/MacMiniPro2TB/HVCG Project Management System' 'deployment/reports/checkpoints'
}
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

Write-Host "Repo=$Repo"
Write-Host "Running conversion unit suite..."
Push-Location $Repo
& node $NodeTest
$testExit = $LASTEXITCODE
Pop-Location
if ($testExit -ne 0) { throw "Conversion tests failed" }

if ($SkipCrm) {
  Write-Host "CRM smoke skipped"
  exit 0
}

$mainCfg = '/Volumes/MacMiniPro2TB/HVCG Project Management System/config/environments/development.json'
$cfg = Get-Content $mainCfg -Raw | ConvertFrom-Json
Import-Module PnP.PowerShell
Connect-PnPOnline -Url $cfg.sites.commandCenter.url -Interactive -ClientId $cfg.authentication.pnpEntraAppClientId

$session = "sprint3-conv-$stamp"
$notesObj = [ordered]@{
  recommendation_version = 'HVCG-REC-2026-07-16-v1'
  assessment_version     = 'EVA-FREE-v2'
  pricing_version        = 'HVCG-PRICE-2026-07-15-v1'
  lead_temperature       = 'Warm'
  sales_priority         = 'Nurture'
  capital_path           = 'Line of credit'
  primary_service        = 'Capital Advisory — Core'
  cta_selected           = 'Schedule a Strategy Session'
  human_review           = $true
  auto_qualify           = $false
  environment            = 'Dev'
  smoke                  = $true
}
$notes = ($notesObj | ConvertTo-Json -Compress)

$values = @{
  Title               = "Sprint3 Conversion Smoke $stamp"
  ContactName         = "Sprint3 Tester"
  Email               = "sprint3.smoke.$stamp@example.com"
  Source              = "Website-EVA"
  LeadStatus          = "New"
  ServiceInterest     = "Capital Advisory"
  LeadScore           = 70
  Notes               = $notes
  HVCG_IdempotencyKey = "eva|$session"
  LeadSourceDetail    = "sprint3-conversion-smoke"
  OwnerEmail          = $cfg.identities.executiveUpn
}

$lead = Add-PnPListItem -List HVCG_Leads -Values $values
Write-Host "PASS crm_create LeadId=$($lead.Id) Key=eva|$session"

$dup = @(Get-PnPListItem -List HVCG_Leads -PageSize 400 | Where-Object { "$($_.FieldValues.HVCG_IdempotencyKey)" -eq "eva|$session" })
Write-Host "PASS idempotency_count=$($dup.Count)"

$report = [ordered]@{
  generated = (Get-Date).ToString('o')
  leadId    = $lead.Id
  sessionId = $session
  passed    = ($dup.Count -eq 1)
  site      = $cfg.sites.commandCenter.url
}
$path = Join-Path $outDir "eva-sprint3-conversion-smoke-$stamp.json"
$report | ConvertTo-Json | Set-Content $path
Write-Host "FILE=$path"
Disconnect-PnPOnline
exit $(if ($report.passed) { 0 } else { 1 })
