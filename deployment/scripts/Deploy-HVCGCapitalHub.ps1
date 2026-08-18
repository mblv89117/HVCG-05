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

$health = Invoke-RestMethod -Method GET -Uri "$HubBase/health"
Write-Host "Current Hub health ok=$($health.ok) pmBackend=$($health.pmBackend.mode) capitalBackend=$(if ($health.capitalBackend) { $health.capitalBackend.mode } else { 'absent' })"

Write-Host "Mode: $(if ($Apply) { 'APPLY az webapp deploy' } else { 'WHATIF (bundle only)' })"
Write-Host "Target: $AppName / $ResourceGroup"
Write-Host "Will NOT: set INTEGRATION_CAPITAL_* , grant Graph roles, or mutate SharePoint."

if (-not $Apply) {
  Write-Host 'Re-run with -Apply to archive current server.js and deploy this zip.'
  return
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$rollbackZip = Join-Path $rollbackDir "pre-$sha-$stamp.zip"
Write-Host "Archiving current wwwroot via zipdeploy pull is not available; capturing Kudu vfs server.js if possible."
try {
  $publish = az webapp deployment list-publishing-credentials -g $ResourceGroup -n $AppName -o json | ConvertFrom-Json
  $kuduUser = $publish.publishingUserName
  $kuduPass = $publish.publishingPassword
  $pair = "{0}:{1}" -f $kuduUser, $kuduPass
  $bytes = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pair))
  $kudu = "https://$AppName.scm.azurewebsites.net/api/vfs/site/wwwroot/server.js"
  $prev = Join-Path $rollbackDir "server.js.pre-$stamp"
  Invoke-WebRequest -Uri $kudu -Headers @{ Authorization = "Basic $bytes" } -OutFile $prev
  Compress-Archive -Path $prev -DestinationPath $rollbackZip -Force
  Write-Host "Rollback copy: $rollbackZip"
} catch {
  Write-Host "WARN: could not download current server.js for rollback: $($_.Exception.Message)"
  Write-Host 'Continue only if Azure deployment history can restore the previous zip.'
}

az webapp deploy -g $ResourceGroup -n $AppName --src-path $zipPath --type zip --async false --clean true
Write-Host 'Deploy submitted. Waiting for /health...'
$ok = $false
for ($i = 0; $i -lt 18; $i++) {
  Start-Sleep -Seconds 5
  try {
    $h = Invoke-RestMethod -Method GET -Uri "$HubBase/health"
    if ($h.ok) {
      Write-Host "Health ok. pmBackend=$($h.pmBackend.mode) capitalBackend=$(if ($h.capitalBackend) { $h.capitalBackend.mode } else { 'absent-until-app-settings' })"
      $ok = $true
      break
    }
  } catch {
    Write-Host "Health not ready ($($_.Exception.Message))"
  }
}
if (-not $ok) { throw 'Hub did not return /health ok after deploy.' }
Write-Host "Deployed commit $sha. Next: Set-HVCGCapitalHubAppSettings.ps1 -Apply"
