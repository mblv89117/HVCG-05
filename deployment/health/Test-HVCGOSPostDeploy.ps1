#Requires -Version 7.0
<#
.SYNOPSIS
  Post-deployment validation for HVCG OS (functional smoke checks).
#>
[CmdletBinding()]
param(
  [ValidateSet('development', 'test', 'production')]
  [string]$Environment = 'development',
  [string]$ConfigPath = '',
  [string]$RepoRoot = ''
)

$ErrorActionPreference = 'Stop'
if (-not $RepoRoot) { $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path }
Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.Deployment.psm1') -Force
Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.Release.psm1') -Force

$fails = 0
function Ok($n, $p, $d) {
  if ($p) { Write-Host "PASS  $n — $d" -ForegroundColor Green }
  else { Write-Host "FAIL  $n — $d" -ForegroundColor Red; $script:fails++ }
}

$Config = Get-HVCGOSConfig -RepoRoot $RepoRoot -Environment $Environment -ConfigPath $ConfigPath
$report = New-HVCGDeploymentReport -Environment "$Environment-postdeploy" -RepoRoot $RepoRoot
Install-HVCGModules -Report $report
$null = Connect-HVCGGraphInteractive -Report $report
$siteUrl = $Config.sites.commandCenter.url
Connect-PnPOnline -Url $siteUrl -Interactive

$ver = Get-HVCGInstalledVersion -SiteUrl $siteUrl
$expected = (Get-Content (Join-Path $RepoRoot 'VERSION') -Raw).Trim()
Ok 'installed_version_semver' ($ver -match '^\d+\.\d+\.\d+$') "InstalledVersion=$ver"
Ok 'version_matches_package_or_older_minor' (
  (Compare-HVCGSemVer -Left $ver -Right '1.0.0' -Op GE) -and (Compare-HVCGSemVer -Left $ver -Right $expected -Op LE)
) "installed=$ver package=$expected"

# Idempotency: SystemInfo single item
$sysItems = @(Get-PnPListItem -List 'HVCG_SystemInfo' -PageSize 20)
Ok 'systeminfo_single_row' ($sysItems.Count -le 1) "count=$($sysItems.Count)"

# Critical lists create access
foreach ($name in @('HVCG_Clients','HVCG_Projects','HVCG_Tasks','HVCG_CapitalOpportunities','HVCG_AI_DraftEmails')) {
  $list = Get-PnPList -Identity $name -ErrorAction SilentlyContinue
  Ok "list_$name" ($null -ne $list) $(if ($list) { 'exists' } else { 'missing' })
}

# AI safety: HumanApprovalRequired field exists on draft emails
$f = Get-PnPField -List 'HVCG_AI_DraftEmails' -Identity 'HumanApprovalRequired' -ErrorAction SilentlyContinue
Ok 'ai_draft_requires_approval_column' ($null -ne $f) 'HumanApprovalRequired'

# Folder structure config still 24
$cfg = Get-Content (Join-Path $RepoRoot 'config/hvcg.config.json') -Raw | ConvertFrom-Json
Ok 'folder_structure_24' ($cfg.documentFolderStructure.Count -eq 24) "count=$($cfg.documentFolderStructure.Count)"

# Write postdeploy report
$result = [ordered]@{
  environment = $Environment
  installedVersion = $ver
  packageVersion = $expected
  failed = $fails
  passed = ($fails -eq 0)
  finished = (Get-Date).ToString('o')
}
$out = Join-Path $RepoRoot 'deployment/reports/postdeploy-latest.json'
($result | ConvertTo-Json -Depth 4) | Set-Content $out -Encoding UTF8
Write-Host "Post-deploy report: $out"

try { Disconnect-PnPOnline -ErrorAction SilentlyContinue } catch {}
if ($fails -gt 0) { Write-Host "RESULT: FAIL ($fails)" -ForegroundColor Red; exit 1 }
Write-Host 'RESULT: PASS' -ForegroundColor Green
exit 0
