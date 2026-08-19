<#
.SYNOPSIS
  Atlas health-check wrapper. Defaults to dry-run. Use -Execute to call existing health scripts (Dev only).
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
$RepoRoot = Split-Path -Parent (Split-Path -Parent $AtlasRoot)
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'

& (Join-Path $ScriptDir 'Test-AtlasEnvironmentGuard.ps1') -Environment $Environment
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
if ($Environment -ne 'development') {
    Write-Error "Atlas health wrapper only executes for development in 0.1.0-dev (requested=$Environment)."
    exit 3
}

$outDir = Join-Path $AtlasRoot 'reports'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$out = Join-Path $outDir "health-$stamp.json"

if (-not $Execute) {
    $report = [ordered]@{
        generated   = (Get-Date).ToString('o')
        environment = $Environment
        mode        = 'dry-run'
        overall     = 'NOT_RUN'
        note        = 'Pass -Execute after QA approval to invoke deployment/health scripts.'
    }
    $report | ConvertTo-Json -Depth 5 | Set-Content $out
    Write-Host "HEALTH dry-run FILE=$out"
    exit 0
}

$health = Join-Path $RepoRoot 'deployment/health/Test-HVCGOSHealth.ps1'
if (-not (Test-Path $health)) {
    Write-Error "Missing $health"
    exit 4
}
& $health -Environment $Environment
$code = $LASTEXITCODE
@{
    generated   = (Get-Date).ToString('o')
    environment = $Environment
    mode        = 'execute'
    overall     = $(if ($code -eq 0) { 'PASS' } else { 'FAIL' })
    exitCode    = $code
    script      = $health
} | ConvertTo-Json -Depth 5 | Set-Content $out
Write-Host "HEALTH execute exit=$code FILE=$out"
exit $code
