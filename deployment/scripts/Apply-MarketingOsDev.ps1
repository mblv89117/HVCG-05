#Requires -Version 7.0
<#
.SYNOPSIS
  Idempotent Dev-only apply of Marketing OS list migration (ApplyListDiff).
.NOTES
  Development Command Center ONLY. No Production. Additive only. No deletes.
#>
[CmdletBinding()]
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path,
  [string]$ConfigPath = '',
  [switch]$WhatIf
)

$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.Deployment.psm1') -Force
Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.Release.psm1') -Force

if (-not $ConfigPath) {
  $ConfigPath = Join-Path $RepoRoot 'config/environments/development.json'
}
$Config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
$siteUrl = [string]$Config.sites.commandCenter.url

if ($siteUrl -notmatch 'CommandCenter-Dev') {
  throw "Refusing to run: site URL must be Dev Command Center. Got: $siteUrl"
}
if ($siteUrl -match 'HVCG-CommandCenter(?!-Dev)') {
  # allow only -Dev; bare CommandCenter is Prod
  if ($siteUrl -notmatch 'CommandCenter-Dev') {
    throw "Refusing Production Command Center URL: $siteUrl"
  }
}

$Report = New-HVCGDeploymentReport -Environment 'marketing-os-dev' -RepoRoot $RepoRoot
Write-HVCGLog -Level STEP -Message "Marketing OS Dev provision → $siteUrl" -Report $Report

$null = Initialize-HVCGPnPAuth -Config $Config -Report $Report
Connect-HVCGPnPOnline -Url $siteUrl -Config $Config -Report $Report

$migrationPath = Join-Path $RepoRoot 'releases/migrations/20260719_001_marketing_os_module.json'
$migration = Get-Content $migrationPath -Raw | ConvertFrom-Json

if ($WhatIf) {
  Write-HVCGLog -Level INFO -Message "WhatIf: would ApplyListDiff $($migration.steps[0].diffFile)" -Report $Report
} else {
  Invoke-HVCGMigration -Migration $migration -Config $Config -RepoRoot $RepoRoot -Report $Report
}

# Evidence dump
$evidenceDir = Join-Path $RepoRoot 'deployment/reports'
New-Item -ItemType Directory -Force -Path $evidenceDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$evidence = [ordered]@{
  appliedAt = (Get-Date).ToString('o')
  environment = 'development'
  siteUrl = $siteUrl
  migrationId = $migration.id
  whatIf = [bool]$WhatIf
  lists = @()
  leadColumns = @()
}

$expectedLists = @(
  'HVCG_MarketingCampaigns',
  'HVCG_MarketingContentAssets',
  'HVCG_MarketingTasks',
  'HVCG_MarketingExperiments',
  'HVCG_MarketingPerformanceSnapshots',
  'HVCG_MarketingChannelRegistry'
)
foreach ($ln in $expectedLists) {
  $list = Get-PnPList -Identity $ln -ErrorAction SilentlyContinue
  $fields = @()
  if ($list) {
    $fields = @(Get-PnPField -List $ln | Where-Object { -not $_.Hidden -and -not $_.FromBaseType } | Select-Object -ExpandProperty InternalName)
  }
  $evidence.lists += [ordered]@{
    title = $ln
    exists = [bool]$list
    fieldCount = $fields.Count
    fields = $fields
  }
}

$leadExpected = @(
  'MarketingCampaignId','FirstTouchCampaignId','LatestTouchCampaignId','ConsentStatus','ConsentTimestamp',
  'ConsentVersion','OptOutStatus','NurtureSegment','QualificationStatus','Urgency','BudgetReadiness',
  'DecisionAuthority','PainPoints','DoNotContact'
)
foreach ($c in $leadExpected) {
  $f = Get-PnPField -List 'HVCG_Leads' -Identity $c -ErrorAction SilentlyContinue
  $evidence.leadColumns += [ordered]@{
    internalName = $c
    exists = [bool]$f
  }
}

$outPath = Join-Path $evidenceDir "MarketingOs-Dev-Provision-$stamp.json"
($evidence | ConvertTo-Json -Depth 8) | Set-Content -Path $outPath -Encoding UTF8
Save-HVCGDeploymentReport -Report $Report -RepoRoot $RepoRoot | Out-Null
Write-Host "Evidence: $outPath"
Write-Host "Lists present: $((@($evidence.lists | Where-Object { $_.exists })).Count)/6"
Write-Host "Lead cols present: $((@($evidence.leadColumns | Where-Object { $_.exists })).Count)/14"
