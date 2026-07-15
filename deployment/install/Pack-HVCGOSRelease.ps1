#Requires -Version 7.0
<#
.SYNOPSIS
  Packs a release folder for HVCG OS (checksums, schema snapshot, optional pac managed export).

.EXAMPLE
  pwsh -File ./deployment/install/Pack-HVCGOSRelease.ps1 -Version 1.0.0
#>
[CmdletBinding()]
param(
  [string]$Version = '',
  [string]$RepoRoot = '',
  [switch]$SkipPac,
  [switch]$WhatIf
)

$ErrorActionPreference = 'Stop'
if (-not $RepoRoot) { $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path }
if (-not $Version) { $Version = (Get-Content (Join-Path $RepoRoot 'VERSION') -Raw).Trim() }

$releaseDir = Join-Path $RepoRoot "releases/v$Version"
$artifacts = Join-Path $releaseDir 'artifacts'
New-Item -ItemType Directory -Force -Path $artifacts, (Join-Path $releaseDir 'checksums') | Out-Null

Write-Host "Packing release v$Version ..." -ForegroundColor Cyan

# Refresh schema snapshot
& python3 (Join-Path $RepoRoot 'deployment/install/New-HVCGSchemaSnapshot.py') --version $Version --repo $RepoRoot
if ($LASTEXITCODE -ne 0) { throw 'Schema snapshot failed' }

# Stage installer pointers
$bundle = @{
  version = $Version
  packedAt = (Get-Date).ToString('o')
  install = 'deployment/install/Install-HVCGOS.ps1'
  upgrade = 'deployment/upgrade/Upgrade-HVCGOS.ps1'
  rollback = 'deployment/rollback/Rollback-HVCGOS.ps1'
  health = 'deployment/health/Test-HVCGOSHealth.ps1'
  postDeploy = 'deployment/health/Test-HVCGOSPostDeploy.ps1'
  migrations = 'releases/migrations'
  managedSolution = "releases/v$Version/artifacts/HVCGOS_managed_$Version.zip"
}
($bundle | ConvertTo-Json -Depth 4) | Set-Content (Join-Path $artifacts 'release-bundle.json') -Encoding UTF8

if (-not $SkipPac) {
  $pac = Get-Command pac -ErrorAction SilentlyContinue
  if ($pac -and -not $WhatIf) {
    Write-Host 'pac detected — attempt managed export if solution exists in default auth...' -ForegroundColor Yellow
    $zip = Join-Path $artifacts "HVCGOS_managed_$Version.zip"
    try {
      & pac solution export --name HVCGOS --managed true --path $zip
      Write-Host "Managed solution exported: $zip" -ForegroundColor Green
    }
    catch {
      Write-Host "pac export skipped/failed (expected until solution authored in tenant): $($_.Exception.Message)" -ForegroundColor Yellow
      @"
# Managed solution placeholder
Place HVCGOS_managed_$Version.zip here after:
  pac solution export --name HVCGOS --managed true --path ./releases/v$Version/artifacts/HVCGOS_managed_$Version.zip
"@ | Set-Content (Join-Path $artifacts "HVCGOS_managed_$Version.README.txt")
    }
  }
  else {
    @"
Place managed solution zip here after Dev authoring:
pac solution export --name HVCGOS --managed true --path ./releases/v$Version/artifacts/HVCGOS_managed_$Version.zip
"@ | Set-Content (Join-Path $artifacts "HVCGOS_managed_$Version.README.txt")
  }
}

Write-Host "Release pack complete: $releaseDir" -ForegroundColor Green
