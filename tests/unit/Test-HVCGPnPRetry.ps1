#Requires -Version 7.0
<#
.SYNOPSIS
  Unit tests for Invoke-HVCGPnPWithRetry, backoff, and field propagation wait.
#>
[CmdletBinding()]
param(
  [string]$RepoRoot = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not $RepoRoot) {
  $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
}

Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.Deployment.psm1') -Force

$failures = [System.Collections.Generic.List[string]]::new()
function Assert-True {
  param([bool]$Condition, [string]$Name)
  if ($Condition) {
    Write-Host "  PASS: $Name" -ForegroundColor Green
  }
  else {
    Write-Host "  FAIL: $Name" -ForegroundColor Red
    $failures.Add($Name)
  }
}

Write-Host '=== HVCG PnP retry layer ==='

# --- simulated 429 -----------------------------------------------------------
$script:attempts429 = 0
$result429 = Invoke-HVCGPnPWithRetry -OperationName 'sim-429' -MaxAttempts 5 -DisableSleep -ScriptBlock {
  $script:attempts429++
  if ($script:attempts429 -lt 3) {
    throw 'HTTP 429 Too Many Requests — SharePoint Online throttling'
  }
  'ok-after-429'
}
Assert-True ($result429 -eq 'ok-after-429') 'simulated 429 recovers'
Assert-True ($script:attempts429 -eq 3) 'simulated 429 attempt count'

# --- Retry-After header parsing ---------------------------------------------
$ra = Get-HVCGRetryAfterSeconds -Message 'Throttled. Retry-After: 12'
Assert-True ($ra -eq 12) 'Retry-After header parsed from message'

$err = [System.Management.Automation.ErrorRecord]::new(
  [Exception]::new('Request failed with status 429'),
  'Throttle',
  [System.Management.Automation.ErrorCategory]::OperationStopped,
  $null
)
Assert-True (Test-HVCGIsRetriableSharePointError -ErrorRecord $err -Message '429 Too Many Requests') '429 classified retriable'
Assert-True (Test-HVCGIsRetriableSharePointError -Message 'HTTP 503 Service Unavailable') '503 classified retriable'
Assert-True (Test-HVCGIsRetriableSharePointError -Message 'SharePoint Online throttling — Server busy') 'throttling classified retriable'
Assert-True (Test-HVCGIsRetriableSharePointError -Message 'An existing connection was forcibly closed by the remote host') 'transient network classified retriable'
Assert-True (-not (Test-HVCGIsRetriableSharePointError -Message 'Field type mismatch on Email')) 'non-retriable not retried'

# --- backoff schedule + Retry-After precedence / cap -----------------------
$d0 = Get-HVCGRetryDelaySeconds -AttemptIndex 0 -NoJitter
$d1 = Get-HVCGRetryDelaySeconds -AttemptIndex 1 -NoJitter
$d2 = Get-HVCGRetryDelaySeconds -AttemptIndex 2 -NoJitter
$d3 = Get-HVCGRetryDelaySeconds -AttemptIndex 3 -NoJitter
$d4 = Get-HVCGRetryDelaySeconds -AttemptIndex 4 -NoJitter
$d5 = Get-HVCGRetryDelaySeconds -AttemptIndex 5 -NoJitter
Assert-True ($d0 -eq 2 -and $d1 -eq 4 -and $d2 -eq 8 -and $d3 -eq 16 -and $d4 -eq 30 -and $d5 -eq 30) 'exponential backoff 2/4/8/16/30'

$dRa = Get-HVCGRetryDelaySeconds -AttemptIndex 0 -RetryAfterSeconds 10 -NoJitter
Assert-True ($dRa -eq 10) 'Retry-After elevates delay over base schedule'
$dCap = Get-HVCGRetryDelaySeconds -AttemptIndex 0 -RetryAfterSeconds 90 -NoJitter
Assert-True ($dCap -eq 30) 'delay capped at 30s maximum'

# --- transient failures then success ----------------------------------------
$script:attemptsTransient = 0
$resultT = Invoke-HVCGPnPWithRetry -OperationName 'sim-transient' -MaxAttempts 4 -DisableSleep -ScriptBlock {
  $script:attemptsTransient++
  if ($script:attemptsTransient -eq 1) { throw 'The remote name could not be resolved' }
  if ($script:attemptsTransient -eq 2) { throw 'HttpRequestException: connection reset' }
  'recovered'
}
Assert-True ($resultT -eq 'recovered') 'transient failures recover'
Assert-True ($script:attemptsTransient -eq 3) 'transient attempt count'

# --- Retry-After drives retry path ------------------------------------------
$script:attemptsRa = 0
$resultRa = Invoke-HVCGPnPWithRetry -OperationName 'sim-retry-after' -MaxAttempts 4 -DisableSleep -ScriptBlock {
  $script:attemptsRa++
  if ($script:attemptsRa -eq 1) {
    throw 'HTTP 429 Too Many Requests Retry-After: 5'
  }
  'ok-retry-after'
}
Assert-True ($resultRa -eq 'ok-retry-after') 'Retry-After path recovers'
Assert-True ($script:attemptsRa -eq 2) 'Retry-After attempt count'

# --- delayed field propagation ---------------------------------------------
$script:fieldPolls = 0
$field = Wait-HVCGPnPFieldVisible -ListTitle 'HVCG_Clients' -InternalName 'ClientCode' -TimeoutSeconds 10 -PollSeconds 2 -DisableSleep -FieldGetter {
  param($List, $Name)
  $script:fieldPolls++
  if ($script:fieldPolls -lt 3) { return $null }
  return [pscustomobject]@{ InternalName = $Name; TypeAsString = 'Text' }
}
Assert-True ($null -ne $field -and $field.InternalName -eq 'ClientCode') 'delayed field propagation succeeds'
Assert-True ($script:fieldPolls -ge 3) 'delayed field propagation poll count'

# --- successful recovery (no error) ----------------------------------------
$direct = Invoke-HVCGPnPWithRetry -OperationName 'sim-ok' -DisableSleep -ScriptBlock { 42 }
Assert-True ($direct -eq 42) 'successful recovery first attempt'

# --- idempotent: non-retriable fails fast ----------------------------------
$script:attemptsIdem = 0
$threw = $false
try {
  Invoke-HVCGPnPWithRetry -OperationName 'sim-fatal' -MaxAttempts 5 -DisableSleep -ScriptBlock {
    $script:attemptsIdem++
    throw 'Field type mismatch schema=Text sharepoint=Number'
  } | Out-Null
}
catch {
  $threw = $true
}
Assert-True $threw 'non-retriable throws'
Assert-True ($script:attemptsIdem -eq 1) 'idempotent layer does not retry fatal errors'

Write-Host ''
if ($failures.Count -gt 0) {
  Write-Host "RESULT: FAIL ($($failures.Count))" -ForegroundColor Red
  $failures | ForEach-Object { Write-Host " - $_" }
  exit 1
}
Write-Host 'RESULT: PASS' -ForegroundColor Green
exit 0
