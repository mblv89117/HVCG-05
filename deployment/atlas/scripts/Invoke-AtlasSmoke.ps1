<#
.SYNOPSIS
  Atlas smoke wrapper. Defaults to dry-run. Use -Execute for Dev CRM smoke only.
#>
[CmdletBinding()]
param(
    [ValidateSet('development', 'testing', 'staging', 'production')]
    [string]$Environment = 'development',
    [ValidateSet('LeadQualified', 'All')]
    [string]$Suite = 'LeadQualified',
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
    Write-Error "Atlas smoke only supports development execution in 0.1.0-dev."
    exit 3
}

# Hard refuse Prod smoke script path
$prodSmoke = Join-Path $RepoRoot 'deployment/release-ops/Invoke-ProdLeadQualifiedSmoke.ps1'
if ($Execute -and (Test-Path $prodSmoke) -and $Suite) {
    Write-Host "NOTE: Prod smoke script exists but Atlas will not call it."
}

$outDir = Join-Path $AtlasRoot 'reports'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$out = Join-Path $outDir "smoke-$stamp.json"

if (-not $Execute) {
    @{
        generated   = (Get-Date).ToString('o')
        environment = $Environment
        suite       = $Suite
        mode        = 'dry-run'
        passed      = $false
        failureCount = 0
        evidencePath = ''
        notes       = 'Pass -Execute after QA approval to run Dev CRM smoke.'
    } | ConvertTo-Json -Depth 5 | Set-Content $out
    Write-Host "SMOKE dry-run FILE=$out"
    exit 0
}

$script = if ($Suite -eq 'All') {
    Join-Path $RepoRoot 'deployment/scripts/crm/Invoke-CrmAllSmoke.ps1'
} else {
    Join-Path $RepoRoot 'deployment/scripts/crm/Invoke-CrmLeadQualifiedSmoke.ps1'
}
if (-not (Test-Path $script)) { throw "Missing $script" }
& $script
$code = $LASTEXITCODE
@{
    generated    = (Get-Date).ToString('o')
    environment  = $Environment
    suite        = $Suite
    mode         = 'execute'
    passed       = ($code -eq 0)
    failureCount = $code
    evidencePath = $script
    notes        = 'Dev CRM smoke via Atlas wrapper'
} | ConvertTo-Json -Depth 5 | Set-Content $out
Write-Host "SMOKE execute exit=$code FILE=$out"
exit $code
