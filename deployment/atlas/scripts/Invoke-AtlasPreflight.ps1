<#
.SYNOPSIS
  Atlas pre-flight validation (offline checks). Refuses Production.
#>
[CmdletBinding()]
param(
    [ValidateSet('development', 'testing', 'staging', 'production')]
    [string]$Environment = 'development'
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AtlasRoot = Split-Path -Parent $ScriptDir
$RepoRoot = Split-Path -Parent (Split-Path -Parent $AtlasRoot)
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$checks = New-Object System.Collections.Generic.List[object]

function Add-Check($id, $name, $ok, $detail) {
    $checks.Add([pscustomobject]@{ id = $id; name = $name; ok = [bool]$ok; detail = $detail }) | Out-Null
    Write-Host (("{0} {1} — {2}" -f $(if ($ok) { 'PASS' } else { 'FAIL' }), $id, $detail))
}

& (Join-Path $ScriptDir 'Test-AtlasEnvironmentGuard.ps1') -Environment $Environment
$guardOk = ($LASTEXITCODE -eq 0)
Add-Check 'PF-01' 'environment_guard' $guardOk "exit=$LASTEXITCODE"

$manifest = Join-Path $AtlasRoot 'ATLAS_MANIFEST.json'
Add-Check 'PF-02' 'manifest' (Test-Path $manifest) $manifest

$def = Join-Path $AtlasRoot "environments/$Environment.json"
Add-Check 'PF-03' 'environment_definition' (Test-Path $def) $def

$flags = Join-Path $AtlasRoot "flags/feature-flags.$Environment.json"
$flagsOk = $false
$flagDetail = 'missing'
if (Test-Path $flags) {
    $f = Get-Content $flags -Raw | ConvertFrom-Json
    $flagsOk = ($f.flags.CrmEnableTeamsNotify -eq $false -and $f.flags.EnableClientEmails -eq $false -and $f.flags.AtlasAllowProduction -eq $false)
    $flagDetail = "Teams=$($f.flags.CrmEnableTeamsNotify); Email=$($f.flags.EnableClientEmails); AllowProd=$($f.flags.AtlasAllowProduction)"
}
Add-Check 'PF-04' 'feature_flags_safe' $flagsOk $flagDetail

$predeploy = Join-Path $RepoRoot 'tests/Invoke-HVCGPreDeploymentTests.ps1'
Add-Check 'PF-05' 'predeploy_tests_present' (Test-Path $predeploy) $predeploy

$track1 = Join-Path $RepoRoot 'releases/Track-1-Live-Internal'
Add-Check 'PF-06' 'track1_freeze_untouched_notice' $true "Reference only: $track1 (Atlas must not modify)"

$fail = @($checks | Where-Object { -not $_.ok }).Count
$report = [ordered]@{
    generated         = (Get-Date).ToString('o')
    environment       = $Environment
    overall           = $(if ($fail -eq 0) { 'PASS' } else { 'FAIL' })
    checks            = $checks
    productionBlocked = $true
}
$outDir = Join-Path $AtlasRoot 'reports'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$out = Join-Path $outDir "preflight-$stamp.json"
$report | ConvertTo-Json -Depth 6 | Set-Content $out
Write-Host "PREFLIGHT overall=$($report.overall) FILE=$out"
exit $fail
