#Requires -Version 7.0
<#
.SYNOPSIS
  EVA Dev smoke — Runbook Path A (Development SharePoint only; no Production changes).

.DESCRIPTION
  1) Offline fixture validation (score_eva_json.py --crm)
  2) Optional HTTP POST when -FlowHttpUrl or config evaFlowHttpUrl is set
  3) Dev CRM verification via PnP on HVCG-CommandCenter-Dev (primary path when flow not yet imported)

  Does NOT modify Production Power Platform or Production SharePoint sites.
#>
[CmdletBinding()]
param(
    [string]$PassFixture,
    [string]$LegacyFixture,
    [string]$FlowHttpUrl,
    [switch]$SkipHttp,
    [switch]$SkipCrmVerify,
    [switch]$QualifyAfterCreate
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Repo = (Resolve-Path (Join-Path $ScriptDir '../../..')).Path
$BizLaunch = Join-Path $Repo '.worktrees/master-pm-orchestrator/docs/business-launch'

if (-not (Test-Path $BizLaunch)) {
    $BizLaunch = Join-Path $Repo 'docs/business-launch'
}

$PassFixture = if ($PassFixture) { $PassFixture } else { Join-Path $BizLaunch 'funnel/fixtures/eva_smoke_pass.json' }
$LegacyFixture = if ($LegacyFixture) { $LegacyFixture } else { Join-Path $BizLaunch 'funnel/fixtures/eva_smoke_legacy_block.json' }
$ScoreScript = Join-Path $BizLaunch 'sales/score_eva_json.py'

Set-Location $Repo
$cfg = Get-Content "$Repo/config/environments/development.json" -Raw | ConvertFrom-Json
if (-not $FlowHttpUrl -and $cfg.evaFlowHttpUrl) { $FlowHttpUrl = $cfg.evaFlowHttpUrl }

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$steps = New-Object System.Collections.Generic.List[object]
function Add-Step([string]$n, [bool]$ok, [string]$d) {
    $steps.Add([pscustomobject]@{ name = $n; ok = $ok; detail = $d }) | Out-Null
    Write-Host ((@('PASS', 'FAIL')[-not $ok]) + " $n — $d")
}

# --- Phase 0: offline ---
if (-not (Test-Path $ScoreScript)) { throw "Missing score script: $ScoreScript" }
$passCrmJson = & python3 $ScoreScript $PassFixture --crm | ConvertFrom-Json
$legacyCrmJson = & python3 $ScoreScript $LegacyFixture --crm | ConvertFrom-Json
Add-Step 'offline_pass_create_allowed' ($passCrmJson._meta.create_allowed -eq $true) "legacy=$($passCrmJson._meta.legacy_guard) score=$($passCrmJson.LeadScore)"
Add-Step 'offline_legacy_blocked' ($legacyCrmJson._meta.create_allowed -eq $false) "legacy=$($legacyCrmJson._meta.legacy_guard)"

$passPayload = Get-Content $PassFixture -Raw | ConvertFrom-Json
$legacyPayload = Get-Content $LegacyFixture -Raw | ConvertFrom-Json

# Unique session for this run (avoid colliding with prior smoke rows)
$runSession = "smoke-eva-$stamp"
$passPayload.sessionId = $runSession
$tmpPass = [System.IO.Path]::GetTempFileName()
($passPayload | ConvertTo-Json -Depth 10) | Set-Content $tmpPass
$passCrmJson = & python3 $ScoreScript $tmpPass --crm | ConvertFrom-Json
Remove-Item $tmpPass -Force

# --- Phase 1: optional HTTP ---
$httpStatus = $null
if (-not $SkipHttp -and $FlowHttpUrl) {
    try {
        $body = ($passPayload | ConvertTo-Json -Depth 10 -Compress)
        $httpStatus = Invoke-RestMethod -Method Post -Uri $FlowHttpUrl -Body $body -ContentType 'application/json' -TimeoutSec 120
        Add-Step 'http_post_pass' $true "response=$($httpStatus | ConvertTo-Json -Compress -Depth 4)"
    }
    catch {
        Add-Step 'http_post_pass' $false $_.Exception.Message
    }
}
elseif (-not $SkipHttp) {
    Add-Step 'http_post_pass' $true 'SKIPPED — flow URL not configured (import HVCG_EvaFormCreateLead to HVCG Development first)'
}

if ($SkipCrmVerify) {
    $report = [ordered]@{
        generated    = (Get-Date).ToString('o')
        stamp        = $stamp
        sessionId    = $runSession
        passed       = (($steps | Where-Object { -not $_.ok }).Count -eq 0)
        failureCount = ($steps | Where-Object { -not $_.ok }).Count
        steps        = $steps
        note         = 'CRM verify skipped'
    }
    $out = "$Repo/deployment/reports/checkpoints/eva-dev-smoke-$stamp.json"
    New-Item -ItemType Directory -Force -Path (Split-Path $out) | Out-Null
    $report | ConvertTo-Json -Depth 8 | Set-Content $out
    Write-Host "FILE=$out PASSED=$($report.passed)"
    exit $(if ($report.passed) { 0 } else { 1 })
}

# --- Phase 2: Dev CRM via PnP (validates list + idempotency; mirrors flow field map) ---
Import-Module PnP.PowerShell
Connect-PnPOnline -Url $cfg.sites.commandCenter.url -Interactive -ClientId $cfg.authentication.pnpEntraAppClientId

function Get-LeadByKey([string]$key) {
    @(Get-PnPListItem -List HVCG_Leads -PageSize 500 | Where-Object {
            "$($_.FieldValues.HVCG_IdempotencyKey)" -eq $key
        }) | Select-Object -First 1
}

function New-EvaLeadFromRow($row, [string]$label) {
    $values = @{
        Title                 = $row.Title
        ContactName           = $row.ContactName
        Email                 = $row.Email
        Phone                 = $row.Phone
        Source                = $row.Source
        LeadStatus            = 'New'
        ServiceInterest       = $row.ServiceInterest
        LeadScore             = [double]$row.LeadScore
        Notes                 = $row.Notes
        HVCG_IdempotencyKey   = $row.HVCG_IdempotencyKey
        LeadSourceDetail      = "$($row.LeadSourceDetail)|$label"
        IsReferral            = [bool]$row.IsReferral
        OwnerEmail            = $cfg.identities.executiveUpn
    }
    Add-PnPListItem -List HVCG_Leads -Values $values
}

$idKey = "eva|$runSession"
$existing = Get-LeadByKey $idKey
if ($existing) {
    Add-Step 'crm_precheck_clean' $false "Prior row exists Id=$($existing.Id) — use fresh session"
}
else {
    Add-Step 'crm_precheck_clean' $true 'no existing idempotency row'
}

$passCrmJson.HVCG_IdempotencyKey = $idKey
$lead = New-EvaLeadFromRow $passCrmJson 'path-a-smoke'
Add-Step 'crm_create_pass' ($null -ne $lead) "LeadId=$($lead.Id) Key=$idKey"

Start-Sleep -Seconds 2
$fresh = Get-PnPListItem -List HVCG_Leads -Id $lead.Id
$ls = "$($fresh.FieldValues.LeadStatus)"
$src = "$($fresh.FieldValues.Source)"
$score = [int]$fresh.FieldValues.LeadScore
Add-Step 'crm_lead_status_new' ($ls -eq 'New') "LeadStatus=$ls"
Add-Step 'crm_source_website_eva' ($src -eq 'Website-EVA') "Source=$src"
Add-Step 'crm_lead_score' ($score -ge 40) "LeadScore=$score"
Add-Step 'crm_notes_json' ($fresh.FieldValues.Notes -like '*eva_summary*') 'Notes contains eva_summary'

$dup = Get-LeadByKey $idKey
Add-Step 'crm_idempotency_single_row' (@(Get-PnPListItem -List HVCG_Leads -PageSize 500 | Where-Object { "$($_.FieldValues.HVCG_IdempotencyKey)" -eq $idKey }).Count -eq 1) 'one row per key'

# Legacy guard — must not create when BLOCK
$legacyKey = "eva|legacy-$stamp"
$legacyCrmJson.HVCG_IdempotencyKey = $legacyKey
if ($legacyCrmJson._meta.create_allowed -eq $false) {
    Add-Step 'crm_legacy_skip' $true 'create_allowed=false — no legacy lead written'
}
else {
    $legacyLead = New-EvaLeadFromRow $legacyCrmJson 'legacy-should-not'
    Add-Step 'crm_legacy_skip' ($null -eq $legacyLead) 'unexpected legacy create'
}

# Optional qualify → opportunity (Dev flow must be On in tenant pointing at Dev site)
if ($QualifyAfterCreate -and $lead) {
    Set-PnPListItem -List HVCG_Leads -Identity $lead.Id -Values @{ LeadStatus = 'Qualified' } | Out-Null
    Add-Step 'qualify_lead' $true 'LeadStatus=Qualified'
    $opp = $null
    $deadline = (Get-Date).AddMinutes(5)
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Seconds 15
        $opp = @(Get-PnPListItem -List HVCG_Opportunities -PageSize 400 | Where-Object {
                $_.FieldValues.HVCG_IdempotencyKey -eq "opp-from-lead|$($lead.Id)"
            }) | Select-Object -First 1
        if ($opp) { break }
    }
    Add-Step 'qualified_creates_opportunity' ([bool]$opp) $(if ($opp) { "OppId=$($opp.Id)" } else { 'LeadQualified flow not evidenced in 5m — check Dev/Prod flow activation' })
}

Disconnect-PnPOnline

$fail = ($steps | Where-Object { -not $_.ok }).Count
$report = [ordered]@{
    generated     = (Get-Date).ToString('o')
    stamp         = $stamp
    sessionId     = $runSession
    leadId        = $(if ($lead) { $lead.Id })
    idempotencyKey = $idKey
    devSite       = $cfg.sites.commandCenter.url
    flowHttpUrl   = $(if ($FlowHttpUrl) { $FlowHttpUrl } else { $null })
    passed        = ($fail -eq 0)
    failureCount  = $fail
    steps         = $steps
}
$out = "$Repo/deployment/reports/checkpoints/eva-dev-smoke-$stamp.json"
New-Item -ItemType Directory -Force -Path (Split-Path $out) | Out-Null
$report | ConvertTo-Json -Depth 8 | Set-Content $out
Write-Host "SMOKE_FAILS=$fail PASSED=$($report.passed) FILE=$out"
exit $fail
