#Requires -Version 7.0
<#
.SYNOPSIS
  Additive min-slice schema + list-level Selected write grants for Atlas Capital.

.DESCRIPTION
  Idempotent. Additive only. Does not create lists. Does not grant Sites.Manage.All.
  Does not elevate id-atlas-prod. Does not set Hub App Settings or deploy Hub.
  Creates labeled SYN01 client and Entra HVCG-Client-SYN01 (Manny only) if missing.

  Default is WhatIf (report only). Pass -Apply after reviewing the printed plan.

.EXAMPLE
  pwsh -File ./deployment/scripts/Enable-HVCGCapitalMinSlice.ps1
  pwsh -File ./deployment/scripts/Enable-HVCGCapitalMinSlice.ps1 -Apply
#>
[CmdletBinding()]
param(
  [switch]$Apply,
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ExpectedTenantId = '3df46563-86f3-4414-87fd-84ba967741ef'
$ExpectedSubscriptionId = 'ebc84d85-b5ff-4c4b-add1-b0a8de31b319'
$SiteUrl = 'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter'
$SiteId = 'highvaluecapitalgroup.sharepoint.com,92b2d35f-6f09-4ec2-8cba-28469e3588d9,ddc8e675-aa6a-46f8-9fd6-86f91dce728e'
$HubAppId = '2b9ca61d-2396-4caa-95cd-30200d2ff36a'
$HubPrincipalId = '6fbaf3e8-1baf-4391-b832-973c8964ad7d'
$HubIdentityName = 'id-atlas-prod'

$Lists = @{
  HVCG_CapitalOpportunities = '255763b8-7c44-446b-8290-adde5c3c6f66'
  HVCG_DocumentRequests     = '89a421e9-3086-47ef-80c3-214500d3d92c'
  HVCG_LenderOutreach       = 'c49d02bb-eab5-44b5-8232-714e30867887'
}
$ClientsListId = 'f60a7d4e-74d9-4b57-8c98-1a7b75d76104'
$ExpectedOperatorUpn = 'manny@highvaluecapitalgroup.com'
$Syn01GroupName = 'HVCG-Client-SYN01'

$Stages = @(
  'NeedIdentified','InitialQualification','DocumentsRequested','DocumentsInProgress',
  'DocumentsComplete','FinancialUnderwritingReview','StrategyDrafted',
  'AwaitingMannyStrategyApproval','StrategyApproved','LenderVendorResearch',
  'AwaitingMannyShortlistApproval','ReadyForSubmission','Submitted',
  'AdditionalInformationRequested','Underwriting','TermSheetOfferReceived',
  'OfferComparison','ClientDecision','Closing','Funded','Declined','Withdrawn','ClosedArchived'
)
$Approvals = @('NOT_REQUIRED','PENDING','APPROVED','REJECTED','REVISE')
$SubmissionStatuses = @('draft','submitted','acknowledged','rfi','underwriting','offer','declined','withdrawn')

$Columns = @(
  @{ List = 'HVCG_CapitalOpportunities'; InternalName = 'Stage'; DisplayName = 'Stage'; Type = 'Choice'; Choices = $Stages; Default = 'NeedIdentified'; Indexed = $true }
  @{ List = 'HVCG_CapitalOpportunities'; InternalName = 'StageEnteredAt'; DisplayName = 'StageEnteredAt'; Type = 'DateTime'; Indexed = $false }
  @{ List = 'HVCG_CapitalOpportunities'; InternalName = 'NextAction'; DisplayName = 'NextAction'; Type = 'Note'; Indexed = $false }
  @{ List = 'HVCG_CapitalOpportunities'; InternalName = 'NextActionOwner'; DisplayName = 'NextActionOwner'; Type = 'Text'; Indexed = $true }
  @{ List = 'HVCG_CapitalOpportunities'; InternalName = 'MannyStrategyApproval'; DisplayName = 'MannyStrategyApproval'; Type = 'Choice'; Choices = $Approvals; Default = 'NOT_REQUIRED'; Indexed = $true }
  @{ List = 'HVCG_CapitalOpportunities'; InternalName = 'MannyShortlistApproval'; DisplayName = 'MannyShortlistApproval'; Type = 'Choice'; Choices = $Approvals; Default = 'NOT_REQUIRED'; Indexed = $false }
  @{ List = 'HVCG_LenderOutreach'; InternalName = 'SubmissionStatus'; DisplayName = 'SubmissionStatus'; Type = 'Choice'; Choices = $SubmissionStatuses; Default = 'draft'; Indexed = $true }
  @{ List = 'HVCG_LenderOutreach'; InternalName = 'HVCG_IdempotencyKey'; DisplayName = 'HVCG IdempotencyKey'; Type = 'Text'; Indexed = $true }
)

function Test-HVCGFieldExists {
  param([string]$ListTitle, [string]$InternalName)
  try {
    $null = Get-PnPField -List $ListTitle -Identity $InternalName -ErrorAction Stop
    return $true
  } catch {
    return $false
  }
}

$acctRaw = az account show -o json
if (-not $acctRaw) { throw 'az account show failed. Sign in with az login first.' }
$acct = $acctRaw | ConvertFrom-Json
if ($acct.tenantId -ne $ExpectedTenantId) {
  throw "Wrong tenant $($acct.tenantId). Expected $ExpectedTenantId."
}
if ($acct.id -ne $ExpectedSubscriptionId) {
  throw "Wrong subscription $($acct.id). Expected HVCG Production $ExpectedSubscriptionId."
}

Write-Host "Tenant OK: $($acct.user.name) / $($acct.name)"
if ($acct.user.name -ne $ExpectedOperatorUpn) {
  throw "Wrong operator $($acct.user.name). Expected $ExpectedOperatorUpn."
}
$mi = az identity show -g rg-atlas-shared -n $HubIdentityName -o json | ConvertFrom-Json
if ($mi.clientId -ne $HubAppId) {
  throw "id-atlas-prod clientId $($mi.clientId) does not match expected $HubAppId."
}
if ($mi.principalId -ne $HubPrincipalId) {
  throw "id-atlas-prod principalId $($mi.principalId) does not match expected $HubPrincipalId."
}
Write-Host "Mode: $(if ($Apply) { 'APPLY' } else { 'WHATIF (no writes)' })"
Write-Host "Site: $SiteUrl"
Write-Host "Hub MI appId=$HubAppId principalId=$HubPrincipalId ($HubIdentityName) verified live"
Write-Host "Will NOT: create lists, grant Sites.Manage.All, deploy Hub, or set App Settings."

Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.Deployment.psm1') -Force
$Report = New-HVCGDeploymentReport -Environment 'capital-min-slice' -RepoRoot $RepoRoot
$cfgPath = Join-Path $RepoRoot 'config/environments/development.json'
$Config = if (Test-Path $cfgPath) {
  Get-Content $cfgPath -Raw | ConvertFrom-Json
} else {
  [pscustomobject]@{ authentication = [pscustomobject]@{} }
}
$null = Initialize-HVCGPnPAuth -Config $Config -Report $Report
Connect-HVCGPnPOnline -Url $SiteUrl -Config $Config -Report $Report

$web = Get-PnPWeb
if ($web.Url -notlike '*HVCG-CommandCenter*') {
  throw "Connected to unexpected web $($web.Url)"
}

foreach ($name in $Lists.Keys) {
  $list = Get-PnPList -Identity $name -ErrorAction Stop
  $got = ([string]$list.Id).ToLowerInvariant()
  $want = $Lists[$name].ToLowerInvariant()
  if ($got -ne $want) {
    throw "List $name id $got does not match expected $want. Aborting to avoid wrong target."
  }
  Write-Host "List OK: $name $got"
}

$clientsList = Get-PnPList -Identity 'HVCG_Clients' -ErrorAction Stop
$clientsGot = ([string]$clientsList.Id).ToLowerInvariant()
if ($clientsGot -ne $ClientsListId) {
  throw "HVCG_Clients id $clientsGot does not match expected $ClientsListId. Aborting."
}
Write-Host "List OK: HVCG_Clients $clientsGot"

$made = [System.Collections.Generic.List[string]]::new()
$skipped = [System.Collections.Generic.List[string]]::new()

foreach ($col in $Columns) {
  $exists = Test-HVCGFieldExists -ListTitle $col.List -InternalName $col.InternalName
  if ($exists) {
    $skipped.Add("column $($col.List).$($col.InternalName) already exists") | Out-Null
    continue
  }
  $plan = "ADD $($col.Type) $($col.List).$($col.InternalName)"
  if (-not $Apply) {
    $skipped.Add("WHATIF $plan") | Out-Null
    Write-Host $plan
    continue
  }
  if ($col.Type -eq 'Choice') {
    Add-PnPField -List $col.List -Type Choice -InternalName $col.InternalName -DisplayName $col.DisplayName -Choices ([string[]]$col.Choices) -ErrorAction Stop | Out-Null
  } else {
    Add-PnPField -List $col.List -Type $col.Type -InternalName $col.InternalName -DisplayName $col.DisplayName -ErrorAction Stop | Out-Null
  }
  if ($col.ContainsKey('Default') -and $col.Default) {
    Set-PnPField -List $col.List -Identity $col.InternalName -Values @{ DefaultValue = $col.Default } -ErrorAction SilentlyContinue
  }
  if ($col.Indexed) {
    Set-PnPField -List $col.List -Identity $col.InternalName -Values @{ Indexed = $true } -ErrorAction SilentlyContinue
  }
  $made.Add($plan) | Out-Null
  Write-Host "CREATED $plan"
}

$graphToken = (az account get-access-token --resource https://graph.microsoft.com --query accessToken -o tsv)
if (-not $graphToken) { throw 'Could not acquire Graph token via az.' }
$headers = @{ Authorization = "Bearer $graphToken"; 'Content-Type' = 'application/json' }

foreach ($name in @('HVCG_CapitalOpportunities','HVCG_DocumentRequests','HVCG_LenderOutreach')) {
  $listId = $Lists[$name]
  $permUrl = "https://graph.microsoft.com/v1.0/sites/$SiteId/lists/$listId/permissions"
  $existing = Invoke-RestMethod -Method GET -Uri $permUrl -Headers $headers
  $already = $false
  foreach ($p in @($existing.value)) {
    $appId = $p.grantedToV2.application.id
    if (-not $appId) { $appId = $p.grantedTo.application.id }
    $roles = @($p.roles)
    if ($appId -eq $HubAppId -and ($roles -contains 'write' -or $roles -contains 'owner')) {
      $already = $true
    }
  }
  if ($already) {
    $skipped.Add("grant $name write already present for $HubIdentityName") | Out-Null
    Write-Host "GRANT already present: $name write -> $HubIdentityName"
    continue
  }
  $plan = "GRANT list-level write on $name to $HubIdentityName ($HubAppId)"
  if (-not $Apply) {
    $skipped.Add("WHATIF $plan") | Out-Null
    Write-Host $plan
    continue
  }
  $body = @{
    roles = @('write')
    grantedToV2 = @{ application = @{ id = $HubAppId } }
  } | ConvertTo-Json -Depth 5
  Invoke-RestMethod -Method POST -Uri $permUrl -Headers $headers -Body $body | Out-Null
  $made.Add($plan) | Out-Null
  Write-Host "CREATED $plan"
}

$synItems = Get-PnPListItem -List 'HVCG_Clients' -Query "<View><Query><Where><Eq><FieldRef Name='ClientCode'/><Value Type='Text'>SYN01</Value></Eq></Where></Query></View>"
if ($synItems) {
  $skipped.Add('SYN01 client already exists') | Out-Null
  Write-Host "SYN01 already present (item $($synItems[0].Id))"
} elseif (-not $Apply) {
  $skipped.Add('WHATIF create SYN01 labeled QA client') | Out-Null
  Write-Host 'WHATIF create HVCG_Clients SYN01 (SYNTHETIC QA — Atlas Capital Operations)'
} else {
  Add-PnPListItem -List 'HVCG_Clients' -Values @{
    Title = 'SYNTHETIC QA — Atlas Capital Operations'
    ClientCode = 'SYN01'
    ClientStage = 'Lead'
  } | Out-Null
  $made.Add('create SYN01 labeled QA client') | Out-Null
  Write-Host 'CREATED SYN01 labeled QA client'
}

$synGroup = az ad group list --filter "displayName eq '$Syn01GroupName'" -o json | ConvertFrom-Json
$synGroupObj = @($synGroup) | Select-Object -First 1
if ($synGroupObj) {
  $skipped.Add("Entra $Syn01GroupName already exists ($($synGroupObj.id))") | Out-Null
  Write-Host "Entra group OK: $Syn01GroupName $($synGroupObj.id)"
} elseif (-not $Apply) {
  $skipped.Add("WHATIF create Entra $Syn01GroupName and add $ExpectedOperatorUpn only") | Out-Null
  Write-Host "WHATIF create Entra $Syn01GroupName (Manny only)"
} else {
  $createdGroup = az ad group create --display-name $Syn01GroupName --mail-nickname HVCGClientSYN01 -o json | ConvertFrom-Json
  $synGroupObj = $createdGroup
  $made.Add("create Entra $Syn01GroupName $($createdGroup.id)") | Out-Null
  Write-Host "CREATED Entra $Syn01GroupName $($createdGroup.id)"
}

if ($synGroupObj) {
  $operatorId = az ad signed-in-user show --query id -o tsv
  $membersRaw = az ad group member list --group $synGroupObj.id -o json
  $members = if ($membersRaw) { $membersRaw | ConvertFrom-Json } else { @() }
  $memberIds = @($members | ForEach-Object { $_.id })
  $unexpected = @($memberIds | Where-Object { $_ -ne $operatorId })
  if ($unexpected.Count -gt 0) {
    throw "$Syn01GroupName has unexpected members. Expected Manny only. Aborting without adding more members."
  }
  if ($memberIds -contains $operatorId) {
    $skipped.Add("$ExpectedOperatorUpn already in $Syn01GroupName") | Out-Null
    Write-Host "Membership OK: $ExpectedOperatorUpn in $Syn01GroupName"
  } elseif (-not $Apply) {
    $skipped.Add("WHATIF add $ExpectedOperatorUpn to $Syn01GroupName") | Out-Null
    Write-Host "WHATIF add $ExpectedOperatorUpn to $Syn01GroupName"
  } else {
    az ad group member add --group $synGroupObj.id --member-id $operatorId | Out-Null
    $made.Add("add $ExpectedOperatorUpn to $Syn01GroupName") | Out-Null
    Write-Host "ADDED $ExpectedOperatorUpn to $Syn01GroupName"
  }
  Write-Host "SYN01_ENTRA_GROUP_ID=$($synGroupObj.id)"
  Write-Host "Append this mapping after Hub deploy: $($synGroupObj.id):SYN01"
}

Write-Host ''
Write-Host '=== SUMMARY ==='
Write-Host "Made: $($made.Count)"
$made | ForEach-Object { Write-Host "  + $_" }
Write-Host "Skipped/existing/whatif: $($skipped.Count)"
$skipped | ForEach-Object { Write-Host "  = $_" }
Write-Host 'Runtime Hub identity was not granted Sites.Manage.All.'
if (-not $Apply) {
  Write-Host 'Re-run with -Apply to execute the planned additive changes.'
}
