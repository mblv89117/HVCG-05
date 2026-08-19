<#
.SYNOPSIS
  Atlas post-deploy validation orchestrator (Dev). Dry-run by default.
#>
[CmdletBinding()]
param(
    [ValidateSet('development', 'testing', 'staging', 'production')]
    [string]$Environment = 'development',
    [switch]$Execute
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AtlasRoot = Split-Path -Parent $ScriptDir
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'

& (Join-Path $ScriptDir 'Test-AtlasEnvironmentGuard.ps1') -Environment $Environment
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$outDir = Join-Path $AtlasRoot 'reports'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$out = Join-Path $outDir "postdeploy-$stamp.json"

if (-not $Execute) {
    @{
        generated   = (Get-Date).ToString('o')
        environment = $Environment
        mode        = 'dry-run'
        overall     = 'NOT_RUN'
        steps       = @('guard', 'health', 'smoke', 'flags')
        note        = 'Pass -Execute after QA approval.'
    } | ConvertTo-Json -Depth 5 | Set-Content $out
    Write-Host "POSTDEPLOY dry-run FILE=$out"
    exit 0
}

& (Join-Path $ScriptDir 'Invoke-AtlasHealthChecks.ps1') -Environment $Environment -Execute
$h = $LASTEXITCODE
& (Join-Path $ScriptDir 'Invoke-AtlasSmoke.ps1') -Environment $Environment -Suite LeadQualified -Execute
$s = $LASTEXITCODE
$flags = Get-Content (Join-Path $AtlasRoot "flags/feature-flags.$Environment.json") -Raw | ConvertFrom-Json
$flagsOk = ($flags.flags.CrmEnableTeamsNotify -eq $false -and $flags.flags.EnableClientEmails -eq $false)

$overallFail = ($h -ne 0) -or ($s -ne 0) -or (-not $flagsOk)
@{
    generated   = (Get-Date).ToString('o')
    environment = $Environment
    mode        = 'execute'
    overall     = $(if ($overallFail) { 'FAIL' } else { 'PASS' })
    healthExit  = $h
    smokeExit   = $s
    flagsOk     = $flagsOk
} | ConvertTo-Json -Depth 5 | Set-Content $out
Write-Host "POSTDEPLOY overall FILE=$out"
exit $(if ($overallFail) { 1 } else { 0 })
