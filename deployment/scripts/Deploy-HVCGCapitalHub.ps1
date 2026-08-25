#Requires -Version 7.0
<#
.SYNOPSIS
  Bundle atlas-integration-api to server.js and deploy to app-atlas-integration-hub.

.DESCRIPTION
  Idempotent archive of the currently deployed server.js before overwrite.
  Default is WhatIf. Does not set INTEGRATION_CAPITAL_* App Settings.

.EXAMPLE
  pwsh -File ./deployment/scripts/Deploy-HVCGCapitalHub.ps1
  pwsh -File ./deployment/scripts/Deploy-HVCGCapitalHub.ps1 -Apply
#>
[CmdletBinding()]
param(
  [switch]$Apply,
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path,
  [string]$ResourceGroup = 'rg-atlas-prod',
  [string]$AppName = 'app-atlas-integration-hub',
  [string]$HubBase = 'https://app-atlas-integration-hub.azurewebsites.net'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ExpectedTenantId = '3df46563-86f3-4414-87fd-84ba967741ef'
$ExpectedSubscriptionId = 'ebc84d85-b5ff-4c4b-add1-b0a8de31b319'

$acct = az account show | ConvertFrom-Json
if ($acct.tenantId -ne $ExpectedTenantId) { throw "Wrong tenant $($acct.tenantId)" }
if ($acct.id -ne $ExpectedSubscriptionId) { throw "Wrong subscription $($acct.id)" }

Push-Location $RepoRoot
try {
  $sha = (git rev-parse HEAD).Trim()
  $branch = (git branch --show-current).Trim()
} finally {
  Pop-Location
}

$artifactRoot = Join-Path $RepoRoot 'deployment/artifacts'
$buildDir = Join-Path $artifactRoot 'hub-build'
$rollbackDir = Join-Path $artifactRoot 'hub-rollback'
New-Item -ItemType Directory -Force -Path $buildDir, $rollbackDir | Out-Null

$outfile = Join-Path $buildDir 'server.js'
$entry = Join-Path $RepoRoot 'apps/atlas-integration-api/src/index.ts'
function Resolve-HVCGEsbuild {
  $candidates = @(
    (Join-Path $RepoRoot 'node_modules/.bin/esbuild'),
    (Join-Path $RepoRoot 'node_modules/esbuild/bin/esbuild'),
    (Join-Path $RepoRoot 'node_modules/tsx/node_modules/esbuild/bin/esbuild'),
    (Join-Path $RepoRoot 'apps/atlas-integration-api/node_modules/esbuild/bin/esbuild')
  )
  foreach ($c in $candidates) {
    if (Test-Path -LiteralPath $c) { return $c }
  }
  $cmd = Get-Command esbuild -ErrorAction SilentlyContinue
  if ($cmd -and $cmd.Source) { return [string]$cmd.Source }
  return $null
}
$esbuildBin = Resolve-HVCGEsbuild
Write-Host "Bundling $entry -> $outfile (commit $sha)"
Push-Location $RepoRoot
try {
  if ($esbuildBin) {
    Write-Host "esbuild: $esbuildBin"
    & node $esbuildBin $entry --bundle --platform=node --format=esm --outfile=$outfile --legal-comments=none
  } else {
    npx --yes --package esbuild -- esbuild $entry --bundle --platform=node --format=esm --outfile=$outfile --legal-comments=none
  }
  if ($LASTEXITCODE -ne 0) { throw 'esbuild failed' }
  if (-not (Test-Path -LiteralPath $outfile)) { throw 'esbuild did not write server.js' }
} finally {
  Pop-Location
}

$pkg = @{ name = 'atlas-integration-hub'; private = $true; type = 'module'; main = 'server.js' } | ConvertTo-Json
Set-Content -Path (Join-Path $buildDir 'package.json') -Value $pkg -Encoding utf8
$marker = @{ gitSha = $sha; branch = $branch; builtAt = (Get-Date).ToUniversalTime().ToString('o') } | ConvertTo-Json
Set-Content -Path (Join-Path $buildDir 'hub-build.json') -Value $marker -Encoding utf8
Set-Content -Path (Join-Path $buildDir 'ATLAS_HUB_COMMIT.txt') -Value $sha -Encoding utf8

$zipPath = Join-Path $artifactRoot "hub-$sha.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Push-Location $buildDir
try {
  Compress-Archive -Path @('server.js', 'package.json', 'hub-build.json', 'ATLAS_HUB_COMMIT.txt') -DestinationPath $zipPath
} finally {
  Pop-Location
}
Write-Host "Artifact: $zipPath"

function Get-HVCGCapitalBackendMode($Health) {
  $prop = $Health.PSObject.Properties['capitalBackend']
  if (-not $prop -or $null -eq $prop.Value) { return 'absent' }
  $mode = $prop.Value.PSObject.Properties['mode']
  if (-not $mode -or $null -eq $mode.Value) { return 'absent' }
  return [string]$mode.Value
}

$health = Invoke-RestMethod -Method GET -Uri "$HubBase/health"
Write-Host "Current Hub health ok=$($health.ok) pmBackend=$($health.pmBackend.mode) capitalBackend=$(Get-HVCGCapitalBackendMode $health)"

Write-Host "Mode: $(if ($Apply) { 'APPLY az webapp deploy' } else { 'WHATIF (bundle only)' })"
Write-Host "Target: $AppName / $ResourceGroup"
Write-Host "Will NOT: set INTEGRATION_CAPITAL_* , grant Graph roles, or mutate SharePoint."

if (-not $Apply) {
  Write-Host 'Re-run with -Apply only after restacking onto canonical workflow templates lineage (ecc3571+).'
  return
}

throw @"
BLOCKED: Direct Hub production deploy from cursor/atlas-project-related-capital-001 is disabled.
This branch diverges from canonical production (Workflow Center + Templates at ecc357159277bccd76900961fd8e35ed1e7a4df0).
Restack Capital work onto cursor/atlas-workflow-templates-6efb and deploy via scripts/deploy-hub-guarded.sh only.
"@
