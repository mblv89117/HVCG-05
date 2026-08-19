<#
.SYNOPSIS
  Generate Atlas release notes from template.
#>
[CmdletBinding()]
param(
    [ValidateSet('development', 'testing', 'staging', 'production')]
    [string]$Environment = 'development',
    [string]$Version = '0.1.0-dev',
    [string]$Summary = 'Atlas framework update',
    [string]$Preflight = 'NOT_RUN',
    [string]$Health = 'NOT_RUN',
    [string]$Smoke = 'NOT_RUN',
    [string]$PostDeploy = 'NOT_RUN'
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AtlasRoot = Split-Path -Parent $ScriptDir

if ($Environment -eq 'production') {
    Write-Error 'ATLAS: refusing release notes generation targeted at production execution context.'
    exit 2
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$tpl = Get-Content (Join-Path $AtlasRoot 'templates/release-notes.md') -Raw
$body = $tpl.
    Replace('{{VERSION}}', $Version).
    Replace('{{ENVIRONMENT}}', $Environment).
    Replace('{{GENERATED}}', (Get-Date).ToString('o')).
    Replace('{{FRAMEWORK_VERSION}}', '0.1.0-dev').
    Replace('{{SUMMARY}}', $Summary).
    Replace('{{PREFLIGHT}}', $Preflight).
    Replace('{{HEALTH}}', $Health).
    Replace('{{SMOKE}}', $Smoke).
    Replace('{{POSTDEPLOY}}', $PostDeploy)

$outDir = Join-Path $AtlasRoot 'reports'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$out = Join-Path $outDir "release-notes-$stamp.md"
Set-Content -Path $out -Value $body
Write-Host "RELEASE_NOTES FILE=$out"
exit 0
