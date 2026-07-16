$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Repo = (Resolve-Path (Join-Path $ScriptDir '../../..')).Path
$cfg = Get-Content "$Repo/config/environments/development.json" -Raw | ConvertFrom-Json
Import-Module PnP.PowerShell
Connect-PnPOnline -Url $cfg.sites.commandCenter.url -Interactive -ClientId $cfg.authentication.pnpEntraAppClientId

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$steps = New-Object System.Collections.Generic.List[object]
function Add-Step([string]$suite, [string]$n, [bool]$ok, [string]$d) {
    $steps.Add([pscustomobject]@{ suite = $suite; name = $n; ok = $ok; detail = $d }) | Out-Null
    Write-Host ((@('PASS', 'FAIL')[-not $ok]) + " [$suite] $n — $d")
}

$lqPath = "$Repo/deployment/reports/checkpoints/crm-smoke-leadqualified-final.json"
$lq = $null
$lqPassed = $false
if (Test-Path $lqPath) {
    $lq = Get-Content $lqPath -Raw | ConvertFrom-Json
    $lqPassed = [bool]$lq.passed
    Add-Step 'LeadQualified' 'prior_smoke_passed' $lqPassed "lead=$($lq.leadId) fails=$($lq.failureCount)"
} else {
    Add-Step 'LeadQualified' 'prior_smoke_passed' $false "missing $lqPath — run Invoke-CrmLeadQualifiedSmoke.ps1 first"
}

# Stage: use Negotiation on a dedicated opp so new idempotency key
$opp = Add-PnPListItem -List HVCG_Opportunities -Values @{
    Title = "CRM-STAGE2-$stamp"; Stage = 'Discovery'; WinLossStatus = 'Open'
    ForecastCategory = 'Pipeline'; CapitalHandoffStatus = 'NotApplicable'; Probability = 30
    OwnerEmail = 'manny@highvaluecapitalgroup.com'; SalesOwnerEmail = 'manny@highvaluecapitalgroup.com'
    HVCG_IdempotencyKey = "smoke-stage2|$stamp"
}
Set-PnPListItem -List HVCG_Opportunities -Identity $opp.Id -Values @{ Stage = 'Negotiation' } | Out-Null
Add-Step 'Stage' 'prepare_opp' $true "OppId=$($opp.Id) Stage=Negotiation"

# Won: dedicated opp
$wonOpp = Add-PnPListItem -List HVCG_Opportunities -Values @{
    Title = "CRM-WON2-$stamp"; Stage = 'Proposal'; WinLossStatus = 'Open'
    ForecastCategory = 'Pipeline'; CapitalHandoffStatus = 'NotApplicable'; Probability = 70
    OwnerEmail = 'manny@highvaluecapitalgroup.com'; SalesOwnerEmail = 'manny@highvaluecapitalgroup.com'
    HVCG_IdempotencyKey = "smoke-won2|$stamp"
}
Set-PnPListItem -List HVCG_Opportunities -Identity $wonOpp.Id -Values @{ Stage = 'Won'; WinLossStatus = 'Won' } | Out-Null
Add-Step 'Won' 'prepare_opp' $true "OppId=$($wonOpp.Id)"

# Capital: dedicated
$cap = Add-PnPListItem -List HVCG_CapitalOpportunities -Values @{
    Title = "CRM-CAP2-$stamp"; FundingStatus = 'Identified'
    OwnerEmail = 'manny@highvaluecapitalgroup.com'; HVCG_IdempotencyKey = "smoke-cap2|$stamp"
}
Set-PnPListItem -List HVCG_CapitalOpportunities -Identity $cap.Id -Values @{ FundingStatus = 'Committed' } | Out-Null
Add-Step 'Capital' 'prepare_cap' $true "CapId=$($cap.Id) FundingStatus=Committed"

Write-Host 'Waiting for WO7b recurrence...'
Start-Sleep 75

$deadline = (Get-Date).AddMinutes(5)
$stageOk = $false; $wonOk = $false; $capOk = $false
$stageAct = $null; $wonAct = $null; $capAct = $null
while ((Get-Date) -lt $deadline) {
    $stageAct = @(Get-PnPListItem -List HVCG_OpportunityActivities -PageSize 400 | Where-Object {
            $_.FieldValues.HVCG_IdempotencyKey -eq "opp-stage|$($opp.Id)|Negotiation"
        }) | Select-Object -First 1
    $stageLog = @(Get-PnPListItem -List HVCG_AutomationLogs -PageSize 400 | Where-Object {
            $_.FieldValues.FlowName -eq 'HVCG_OpportunityStageChangedNotify' -and "$($_.FieldValues.Status)" -eq 'Succeeded' -and $_.FieldValues.RelatedItemId -eq $opp.Id
        }) | Select-Object -First 1
    $wonAct = @(Get-PnPListItem -List HVCG_OpportunityActivities -PageSize 400 | Where-Object {
            $_.FieldValues.HVCG_IdempotencyKey -eq "act-opp-won|$($wonOpp.Id)"
        }) | Select-Object -First 1
    $wonLog = @(Get-PnPListItem -List HVCG_AutomationLogs -PageSize 400 | Where-Object {
            $_.FieldValues.FlowName -eq 'HVCG_OpportunityWonCloseout' -and "$($_.FieldValues.Status)" -eq 'Succeeded' -and $_.FieldValues.RelatedItemId -eq $wonOpp.Id
        }) | Select-Object -First 1
    $capAct = @(Get-PnPListItem -List HVCG_OpportunityActivities -PageSize 400 | Where-Object {
            $_.FieldValues.HVCG_IdempotencyKey -eq "cap-status|$($cap.Id)|Committed"
        }) | Select-Object -First 1
    $capLog = @(Get-PnPListItem -List HVCG_AutomationLogs -PageSize 400 | Where-Object {
            $_.FieldValues.FlowName -eq 'HVCG_CapitalFundingStatusNotify' -and "$($_.FieldValues.Status)" -eq 'Succeeded' -and $_.FieldValues.RelatedItemId -eq $cap.Id
        }) | Select-Object -First 1
    $stageOk = [bool]($stageAct -and $stageLog)
    $wonOk = [bool]($wonAct -and $wonLog)
    $capOk = [bool]($capAct -and $capLog)
    Write-Host ("… stage={0} won={1} cap={2}" -f $stageOk, $wonOk, $capOk)
    if ($stageOk -and $wonOk -and $capOk) { break }
    Start-Sleep 20
}

Add-Step 'Stage' 'activity_and_success' $stageOk $(if ($stageOk) { "Act=$($stageAct.Id) Log=$($stageLog.Id)" } else { 'missing' })
Add-Step 'Won' 'activity_and_success' $wonOk $(if ($wonOk) { "Act=$($wonAct.Id) Log=$($wonLog.Id)" } else { 'missing' })
Add-Step 'Capital' 'activity_and_success' $capOk $(if ($capOk) { "Act=$($capAct.Id) Log=$($capLog.Id)" } else { 'missing' })

$fail = ($steps | Where-Object { -not $_.ok }).Count
$report = [ordered]@{
    generated    = (Get-Date).ToString('o')
    stamp        = $stamp
    passed       = ($fail -eq 0)
    failureCount = $fail
    suites       = @{
        LeadQualified = $lqPassed
        Stage         = $stageOk
        Won           = $wonOk
        Capital       = $capOk
    }
    steps        = $steps
}
$out = "$Repo/deployment/reports/checkpoints/crm-smoke-all-final.json"
$report | ConvertTo-Json -Depth 8 | Set-Content $out
Write-Host "CRM_SMOKE_FAILS=$fail PASSED=$($report.passed)"
Disconnect-PnPOnline
exit $fail
