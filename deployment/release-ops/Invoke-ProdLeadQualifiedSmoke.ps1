$ErrorActionPreference = 'Stop'
# Prod-only LeadQualified functional smoke (deployment-engineer worktree)
$Repo = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Set-Location $Repo
$cfgPath = Join-Path $Repo 'deployment/release-ops/production.runtime.json'
$cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
Import-Module PnP.PowerShell
Connect-PnPOnline -Url $cfg.sites.commandCenter.url -Interactive -ClientId $cfg.authentication.pnpEntraAppClientId

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$outDir = Join-Path $Repo 'deployment/release-ops/evidence'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$steps = New-Object System.Collections.Generic.List[object]
function Add-Step([string]$n, [bool]$ok, [string]$d) {
    $steps.Add([pscustomobject]@{ name = $n; ok = $ok; detail = $d }) | Out-Null
    Write-Host ((@('PASS', 'FAIL')[-not $ok]) + " $n — $d")
}

$title = "CRM-PROD-LQ-$stamp"
$lead = Add-PnPListItem -List HVCG_Leads -Values @{
    Title          = $title
    LeadStatus     = 'New'
    OwnerEmail     = 'manny@highvaluecapitalgroup.com'
    EstimatedValue = 65000
}
Add-Step 'create_lead' $true "Id=$($lead.Id)"
Start-Sleep 5
Set-PnPListItem -List HVCG_Leads -Identity $lead.Id -Values @{ LeadStatus = 'Qualified' } | Out-Null
Add-Step 'qualify_lead' $true 'Qualified'

$opp = $null; $act = $null; $okLog = $null; $startLog = $null; $failLog = $null
$deadline = (Get-Date).AddMinutes(8)
while ((Get-Date) -lt $deadline) {
    Start-Sleep 20
    $opp = @(Get-PnPListItem -List HVCG_Opportunities -PageSize 400 | Where-Object {
            $_.FieldValues.HVCG_IdempotencyKey -eq "opp-from-lead|$($lead.Id)"
        }) | Select-Object -First 1
    $act = @(Get-PnPListItem -List HVCG_OpportunityActivities -PageSize 400 | Where-Object {
            $_.FieldValues.HVCG_IdempotencyKey -eq "act-lead-qualify|$($lead.Id)"
        }) | Select-Object -First 1
    $startLog = @(Get-PnPListItem -List HVCG_AutomationLogs -PageSize 400 | Where-Object {
            $_.FieldValues.FlowName -eq 'HVCG_LeadQualifiedCreateOpportunity' -and
            "$($_.FieldValues.Status)" -eq 'Started' -and
            $_.FieldValues.Message -like "Lead $($lead.Id) *"
        }) | Select-Object -First 1
    $okLog = @(Get-PnPListItem -List HVCG_AutomationLogs -PageSize 400 | Where-Object {
            $_.FieldValues.FlowName -eq 'HVCG_LeadQualifiedCreateOpportunity' -and
            "$($_.FieldValues.Status)" -eq 'Succeeded' -and
            $_.FieldValues.RelatedItemId -eq $lead.Id
        }) | Select-Object -First 1
    $failLog = @(Get-PnPListItem -List HVCG_AutomationLogs -PageSize 400 | Where-Object {
            $_.FieldValues.FlowName -eq 'HVCG_LeadQualifiedCreateOpportunity' -and
            "$($_.FieldValues.Status)" -eq 'Failed' -and
            $_.FieldValues.RelatedItemId -eq $lead.Id
        }) | Select-Object -First 1
    $actOpp = if ($act -and $act.FieldValues.OpportunityId) { $act.FieldValues.OpportunityId.LookupId } else { '-' }
    Write-Host ("… poll lead={0} start={1} opp={2} act={3} ok={4} fail={5} actOpp={6} okMsg={7}" -f `
            $lead.Id, [bool]$startLog, [bool]$opp, [bool]$act, [bool]$okLog, [bool]$failLog, $actOpp,
        $(if ($okLog) { $okLog.FieldValues.Message } elseif ($failLog) { $failLog.FieldValues.Message } else { '-' }))
    if (($opp -and $act -and $okLog) -or $failLog) { break }
}

Add-Step 'opportunity_creation' ([bool]$opp) $(if ($opp) { "OppId=$($opp.Id)" } else { 'missing' })
Add-Step 'activity_creation' ([bool]$act) $(if ($act) { "ActId=$($act.Id)" } else { 'missing' })
$lookupOk = $false
if ($opp -and $act -and $act.FieldValues.OpportunityId) {
    $lookupOk = ($act.FieldValues.OpportunityId.LookupId -eq $opp.Id)
}
Add-Step 'activity_opportunity_lookup' $lookupOk $(if ($act -and $act.FieldValues.OpportunityId) { "LookupId=$($act.FieldValues.OpportunityId.LookupId)" } else { 'missing lookup' })
$leadLookupOk = $false
if ($act -and $act.FieldValues.LeadId) {
    $leadLookupOk = ($act.FieldValues.LeadId.LookupId -eq $lead.Id)
}
Add-Step 'activity_lead_lookup' $leadLookupOk $(if ($act -and $act.FieldValues.LeadId) { "LookupId=$($act.FieldValues.LeadId.LookupId)" } else { 'missing' })
$leadFresh = Get-PnPListItem -List HVCG_Leads -Id $lead.Id
$convOk = $false
if ($opp -and $leadFresh.FieldValues.ConvertedOpportunityId) {
    $convOk = ($leadFresh.FieldValues.ConvertedOpportunityId.LookupId -eq $opp.Id)
}
Add-Step 'lead_converted_opportunity' $convOk $(if ($leadFresh.FieldValues.ConvertedOpportunityId) { "LookupId=$($leadFresh.FieldValues.ConvertedOpportunityId.LookupId)" } else { 'missing' })
Add-Step 'flow_success_log' ([bool]$okLog) $(if ($okLog) { "LogId=$($okLog.Id) Msg=$($okLog.FieldValues.Message)" } else { $(if ($failLog) { "FAIL Msg=$($failLog.FieldValues.Message)" } else { 'missing' }) })
Add-Step 'sharepoint_writes' ([bool]($opp -and $act -and $okLog)) 'opp+act+Succeeded log'
Add-Step 'notifications_prod' ([bool]$okLog) 'AutomationLogs Succeeded (Teams notify=false by policy)'
Add-Step 'flow_activation' ([bool]($startLog -or $okLog -or $opp)) 'evidenced by exact lead-id run artifacts'
if ($opp) {
    Set-PnPListItem -List HVCG_Opportunities -Identity $opp.Id -Values @{ NextActionNotes = "note-$stamp"; CopilotSummary = "sum-$stamp" } | Out-Null
    $chk = Get-PnPListItem -List HVCG_Opportunities -Id $opp.Id
    Add-Step 'sharepoint_field_persist' ($chk.FieldValues.CopilotSummary -eq "sum-$stamp") "CopilotSummary=$($chk.FieldValues.CopilotSummary)"
}
else {
    Add-Step 'sharepoint_field_persist' $false 'skipped'
}

$fail = ($steps | Where-Object { -not $_.ok }).Count
$report = [ordered]@{
    generated     = (Get-Date).ToString('o')
    environment   = 'HVCG Production'
    siteUrl       = $cfg.sites.commandCenter.url
    approval      = 'APPROVE DIAGNOSE AND RERUN PROD LEADQUALIFIED FUNCTIONAL SMOKE'
    stamp         = $stamp
    leadId        = $lead.Id
    opportunityId = $(if ($opp) { $opp.Id })
    activityId    = $(if ($act) { $act.Id })
    passed        = ($fail -eq 0)
    failureCount  = $fail
    steps         = $steps
}
$out = Join-Path $outDir "prod-smoke-leadqualified-$stamp.json"
$report | ConvertTo-Json -Depth 8 | Set-Content $out
Write-Host "SMOKE_FAILS=$fail PASSED=$($report.passed) FILE=$out"
# also write latest pointer
Copy-Item $out (Join-Path $outDir 'prod-smoke-leadqualified-latest.json') -Force
Disconnect-PnPOnline
exit $fail
