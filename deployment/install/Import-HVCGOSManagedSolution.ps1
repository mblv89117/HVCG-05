#Requires -Version 7.0
<#
.SYNOPSIS
  Import managed HVCG OS Power Platform solution into Test/Production after SharePoint upgrade.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('test', 'production')]
  [string]$Environment,
  [string]$Version = '',
  [string]$RepoRoot = '',
  [string]$EnvironmentUrl = '',
  [switch]$WhatIf
)

$ErrorActionPreference = 'Stop'
if (-not $RepoRoot) { $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path }
if (-not $Version) { $Version = (Get-Content (Join-Path $RepoRoot 'VERSION') -Raw).Trim() }

$zip = Join-Path $RepoRoot "releases/v$Version/artifacts/HVCGOS_managed_$Version.zip"
if (-not (Test-Path $zip)) {
  throw "Managed solution not found: $zip. Author in Dev then run Pack-HVCGOSRelease.ps1 / pac export."
}

$pac = Get-Command pac -ErrorAction SilentlyContinue
if (-not $pac) { throw 'Power Platform CLI (pac) is required for managed solution import.' }

Write-Host "Importing managed solution $zip into $Environment ..." -ForegroundColor Cyan
if ($WhatIf) {
  Write-Host "WhatIf: pac solution import --path $zip"
  exit 0
}

if ($EnvironmentUrl) {
  & pac org select --environment $EnvironmentUrl
}

& pac solution import --path $zip --force-overwrite false --publish-changes true
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host 'Managed solution import complete. Re-bind connection references if prompted.' -ForegroundColor Green
exit 0
