#Requires -Version 7.0
<#
.SYNOPSIS
  Dev-only CRUD / relationship / idempotency / SQL-alert validation for Marketing OS.
  No live email. No Production.
#>
[CmdletBinding()]
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
)

$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.Deployment.psm1') -Force

$Config = Get-Content (Join-Path $RepoRoot 'config/environments/development.json') -Raw | ConvertFrom-Json
$siteUrl = [string]$Config.sites.commandCenter.url
if ($siteUrl -notmatch 'CommandCenter-Dev') { throw "Dev only. Got $siteUrl" }

$Report = New-HVCGDeploymentReport -Environment 'marketing-os-dev-validate' -RepoRoot $RepoRoot
$null = Initialize-HVCGPnPAuth -Config $Config -Report $Report
Connect-HVCGPnPOnline -Url $siteUrl -Config $Config -Report $Report

$stamp = Get-Date -Format 'yyyyMMddHHmmss'
$sessionId = "test-e2e-dev-$stamp"
$idemLead = "eva|$sessionId"
$evidence = [ordered]@{
  testedAt = (Get-Date).ToString('o')
  siteUrl = $siteUrl
  environment = 'development'
  liveEmailSent = $false
  prodWrites = $false
  steps = [System.Collections.Generic.List[object]]::new()
}

function Find-ByField([string]$ListName, [string]$FieldName, [string]$FieldValue) {
  $items = @(Get-PnPListItem -List $ListName -Fields 'ID', $FieldName)
  foreach ($it in $items) {
    if ([string]$it.FieldValues[$FieldName] -eq $FieldValue) { return $it }
  }
  return $null
}

# Schema check first
$listsOk = $true
foreach ($ln in @(
    'HVCG_MarketingCampaigns', 'HVCG_MarketingContentAssets', 'HVCG_MarketingTasks',
    'HVCG_MarketingExperiments', 'HVCG_MarketingPerformanceSnapshots', 'HVCG_MarketingChannelRegistry'
  )) {
  if (-not (Get-PnPList -Identity $ln -ErrorAction SilentlyContinue)) { $listsOk = $false; Write-Host "MISSING LIST $ln" }
}
$colsOk = $true
$missingCols = @()
foreach ($c in @(
    'MarketingCampaignId', 'FirstTouchCampaignId', 'LatestTouchCampaignId', 'ConsentStatus', 'ConsentTimestamp',
    'ConsentVersion', 'OptOutStatus', 'NurtureSegment', 'QualificationStatus', 'Urgency', 'BudgetReadiness',
    'DecisionAuthority', 'PainPoints', 'DoNotContact'
  )) {
  if (-not (Get-PnPField -List 'HVCG_Leads' -Identity $c -ErrorAction SilentlyContinue)) {
    $colsOk = $false
    $missingCols += $c
  }
}
$evidence.steps.Add([ordered]@{ name = 'schema_validate'; lists_6_of_6 = $listsOk; lead_cols_14_of_14 = $colsOk; missingCols = $missingCols })

# Campaign upsert by CampaignId
$campValues = @{
  Title               = 'Business Readiness Barriers — EVA Launch'
  CampaignId          = 'MKT-CAMP-202607-001'
  Objective           = 'Generate qualified EVA completions'
  FunnelStage         = 'Conversion'
  PrimaryOffer        = 'Free EVA'
  Status              = 'Active'
  OwnerAgent          = 'Marketing Orchestrator'
  Channels            = 'Website;LinkedIn;Email(draft)'
  RiskLevel           = 'R1'
  ApprovalRequirement = 'L2'
}
$campExisting = Find-ByField -ListName 'HVCG_MarketingCampaigns' -FieldName 'CampaignId' -FieldValue 'MKT-CAMP-202607-001'
if ($null -eq $campExisting) {
  $campItem = Add-PnPListItem -List 'HVCG_MarketingCampaigns' -Values $campValues
  $campId = [int]$campItem.Id
  $evidence.steps.Add([ordered]@{ name = 'create_campaign'; created = $true; id = $campId })
} else {
  $campId = [int]$campExisting.Id
  Set-PnPListItem -List 'HVCG_MarketingCampaigns' -Identity $campId -Values $campValues | Out-Null
  $evidence.steps.Add([ordered]@{ name = 'create_campaign'; created = $false; id = $campId; updated = $true })
}
Set-PnPListItem -List 'HVCG_MarketingCampaigns' -Identity $campId -Values @{ Results = "Validated $stamp" } | Out-Null
$campCount = @(Get-PnPListItem -List 'HVCG_MarketingCampaigns' -Fields 'ID', 'CampaignId' | Where-Object { $_.FieldValues['CampaignId'] -eq 'MKT-CAMP-202607-001' }).Count
$evidence.steps.Add([ordered]@{ name = 'duplicate_prevention_campaign'; count = $campCount; pass = ($campCount -eq 1) })

# Assets
foreach ($a in @(
    @{ AssetId = 'MKT-AST-20260719-001'; Title = 'EVA Landing Page'; AssetType = 'Landing'; Channel = 'Website' },
    @{ AssetId = 'MKT-AST-20260719-010'; Title = 'PILLAR-001'; AssetType = 'Pillar'; Channel = 'Website' },
    @{ AssetId = 'MKT-AST-20260719-011'; Title = 'SOC-001'; AssetType = 'SocialPost'; Channel = 'LinkedIn' }
  )) {
  $vals = @{
    Title                = $a.Title
    AssetId              = $a.AssetId
    CampaignId           = 'MKT-CAMP-202607-001'
    AssetType            = $a.AssetType
    Channel              = $a.Channel
    FunnelStage          = 'Awareness'
    ApprovalStatus       = 'Approved'
    RiskClassification   = 'R0'
    CallToAction         = 'Complete Free EVA'
    TrackingId           = "utm_campaign=eva_launch_202607&utm_content=$($a.AssetId)"
    CreatedByAgent       = 'Content Production'
  }
  $ex = Find-ByField -ListName 'HVCG_MarketingContentAssets' -FieldName 'AssetId' -FieldValue $a.AssetId
  if ($null -eq $ex) {
    Add-PnPListItem -List 'HVCG_MarketingContentAssets' -Values $vals | Out-Null
  } else {
    Set-PnPListItem -List 'HVCG_MarketingContentAssets' -Identity ([int]$ex.Id) -Values $vals | Out-Null
  }
}
$relatedCount = @(Get-PnPListItem -List 'HVCG_MarketingContentAssets' -Fields 'ID', 'CampaignId' | Where-Object { $_.FieldValues['CampaignId'] -eq 'MKT-CAMP-202607-001' }).Count
$evidence.steps.Add([ordered]@{ name = 'content_assets_related'; count = $relatedCount; pass = ($relatedCount -ge 3) })

# Lead
$leadValues = @{
  Title                 = 'Example Growth Services LLC'
  ContactName           = 'Test Operator'
  Email                 = "test.operator+dev$stamp@example.com"
  Source                = 'Website-EVA'
  LeadSourceDetail      = "campaign=MKT-CAMP-202607-001|fixture=dev-crud|$stamp"
  LeadStatus            = 'New'
  LeadScore             = 92
  ServiceInterest       = 'Capital Advisory'
  MarketingCampaignId   = 'MKT-CAMP-202607-001'
  FirstTouchCampaignId  = 'MKT-CAMP-202607-001'
  LatestTouchCampaignId = 'MKT-CAMP-202607-001'
  ConsentStatus         = 'Granted'
  ConsentTimestamp      = (Get-Date)
  ConsentVersion        = 'eva-disclaimer-2026-07'
  OptOutStatus          = $false
  DoNotContact          = $false
  NurtureSegment        = 'Immediate advisory need'
  QualificationStatus   = 'SQL'
  Urgency               = '90d'
  BudgetReadiness       = 'Medium'
  DecisionAuthority     = 'Owner'
  PainPoints            = 'Need growth facility but operations and reporting are inconsistent'
  Notes                 = '{"marketing":{"escalate_sql":true,"temperature":"Hot"},"email_policy":"NO_LIVE_SEND"}'
  HVCG_IdempotencyKey   = $idemLead
}
$leadEx = Find-ByField -ListName 'HVCG_Leads' -FieldName 'HVCG_IdempotencyKey' -FieldValue $idemLead
if ($null -eq $leadEx) {
  $leadItem = Add-PnPListItem -List 'HVCG_Leads' -Values $leadValues
  $leadId = [int]$leadItem.Id
  $leadCreated = $true
} else {
  $leadId = [int]$leadEx.Id
  Set-PnPListItem -List 'HVCG_Leads' -Identity $leadId -Values $leadValues | Out-Null
  $leadCreated = $false
}
Set-PnPListItem -List 'HVCG_Leads' -Identity $leadId -Values @{ LeadStatus = 'Contacted' } | Out-Null
$leadDupCount = @(Get-PnPListItem -List 'HVCG_Leads' -Fields 'ID', 'HVCG_IdempotencyKey' | Where-Object { $_.FieldValues['HVCG_IdempotencyKey'] -eq $idemLead }).Count
$leadRead = Get-PnPListItem -List 'HVCG_Leads' -Id $leadId -Fields 'ID', 'LeadScore', 'QualificationStatus', 'NurtureSegment', 'LeadStatus', 'HVCG_IdempotencyKey'
$evidence.steps.Add([ordered]@{
    name                 = 'lead_score_segment_crud'
    leadId               = $leadId
    created              = $leadCreated
    LeadScore            = [int]$leadRead.FieldValues['LeadScore']
    QualificationStatus  = [string]$leadRead.FieldValues['QualificationStatus']
    NurtureSegment       = [string]$leadRead.FieldValues['NurtureSegment']
    LeadStatus           = [string]$leadRead.FieldValues['LeadStatus']
    duplicateCount       = $leadDupCount
    pass                 = ($leadDupCount -eq 1 -and [int]$leadRead.FieldValues['LeadScore'] -eq 92 -and [string]$leadRead.FieldValues['QualificationStatus'] -eq 'SQL')
  })

# SQL alert — MarketingTask (always available) + Notifications if present
$task = Add-PnPListItem -List 'HVCG_MarketingTasks' -Values @{
  Title               = "SQL Hot Lead Alert — $sessionId"
  TaskId              = "MKT-TSK-$stamp-SQL"
  CampaignId          = 'MKT-CAMP-202607-001'
  TaskType            = 'Escalation'
  AssignedAgent       = 'Lead Capture and Qualification'
  Priority            = 'P0'
  Status              = 'Queued'
  RequiredInput       = "LeadId=$leadId; EmailSendAttempted=false; key=alert|sql|$sessionId"
  CompletionEvidence  = 'Alert recorded without live email'
}
$evidence.steps.Add([ordered]@{
    name      = 'sql_alert_no_email'
    list      = 'HVCG_MarketingTasks'
    id        = [int]$task.Id
    emailSent = $false
    pass      = $true
  })

if (Get-PnPList -Identity 'HVCG_Notifications' -ErrorAction SilentlyContinue) {
  try {
    $n = Add-PnPListItem -List 'HVCG_Notifications' -Values @{
      Title = "SQL Hot Lead — Example Growth Services LLC ($stamp)"
    }
    $evidence.steps.Add([ordered]@{ name = 'sql_alert_notification'; id = [int]$n.Id; emailSent = $false; pass = $true })
  } catch {
    $evidence.steps.Add([ordered]@{ name = 'sql_alert_notification'; pass = $false; error = $_.Exception.Message })
  }
}

$evidence.schema = @{ lists_6_of_6 = $listsOk; lead_cols_14_of_14 = $colsOk; missingCols = $missingCols }
$evidence.assertions_passed = [bool]($listsOk -and $colsOk -and ($campCount -eq 1) -and ($leadDupCount -eq 1) -and ($relatedCount -ge 3))

$outPath = Join-Path $RepoRoot "deployment/reports/MarketingOs-Dev-Validate-$stamp.json"
($evidence | ConvertTo-Json -Depth 8) | Set-Content $outPath -Encoding UTF8
Write-Host "Evidence: $outPath"
Write-Host "assertions_passed=$($evidence.assertions_passed)"
Save-HVCGDeploymentReport -Report $Report -RepoRoot $RepoRoot | Out-Null
if (-not $evidence.assertions_passed) { exit 1 }
