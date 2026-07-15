#Requires -Version 7.0
<#
.SYNOPSIS
  Operational health check for HVCG OS (beyond basic list presence).
.EXAMPLE
  pwsh -File ./deployment/health/Invoke-HVCGOSOperationalHealth.ps1 -Environment development
#>
[CmdletBinding()]
param(
  [ValidateSet('development', 'test', 'production')]
  [string]$Environment = 'development',
  [string]$ConfigPath = '',
  [string]$RepoRoot = '',
  [switch]$WhatIf
)

$ErrorActionPreference = 'Stop'
if (-not $RepoRoot) { $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path }
Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.Deployment.psm1') -Force
Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.Release.psm1') -Force

New-Item -ItemType Directory -Force -Path (Join-Path $RepoRoot 'deployment/reports/health') | Out-Null
$out = Join-Path $RepoRoot "deployment/reports/health/operational-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
$latest = Join-Path $RepoRoot 'deployment/reports/health/operational-latest.json'

$result = [ordered]@{
  started = (Get-Date).ToString('o')
  environment = $Environment
  overallStatus = 'Unknown'
  criticalFailures = [System.Collections.Generic.List[string]]::new()
  warnings = [System.Collections.Generic.List[string]]::new()
  siteAvailability = $null
  listAvailability = $null
  schemaDrift = [System.Collections.Generic.List[string]]::new()
  permissionDrift = [System.Collections.Generic.List[string]]::new()
  automationHealth = $null
  backupStatus = $null
  powerPlatformStatus = $null
  aiQueueHealth = $null
  dataQualityIssues = [System.Collections.Generic.List[string]]::new()
  recommendedActions = [System.Collections.Generic.List[string]]::new()
}

function Crit($m) { $result.criticalFailures.Add($m); Write-Host "CRITICAL: $m" -ForegroundColor Red }
function Warn($m) { $result.warnings.Add($m); Write-Host "WARN: $m" -ForegroundColor Yellow }

try {
  if ($WhatIf) {
    $result.overallStatus = 'Healthy'
    $result.recommendedActions.Add('Re-run without -WhatIf against tenant')
  }
  else {
    $Config = Get-HVCGOSConfig -RepoRoot $RepoRoot -Environment $Environment -ConfigPath $ConfigPath
    $report = New-HVCGDeploymentReport -Environment 'ophealth' -RepoRoot $RepoRoot
    Install-HVCGModules -Report $report
    $null = Connect-HVCGGraphInteractive -Report $report
    $null = Initialize-HVCGPnPAuth -Config $Config -Report $report
    $siteUrl = $Config.sites.commandCenter.url
    try {
      Connect-HVCGPnPOnline -Url $siteUrl -Config $Config -Report $report
      $result.siteAvailability = 'Available'
    }
    catch {
      Crit "Site unavailable: $siteUrl"
      $result.siteAvailability = 'Unavailable'
    }

    if ($result.siteAvailability -eq 'Available') {
      $idx = Get-Content (Join-Path $RepoRoot 'src/sharepoint/lists/_index.json') -Raw | ConvertFrom-Json
      $missing = @()
      foreach ($l in $idx.lists) {
        if (-not (Get-PnPList -Identity $l.name -ErrorAction SilentlyContinue)) { $missing += $l.name }
      }
      $result.listAvailability = @{ expected = $idx.lists.Count; missing = $missing }
      if ($missing.Count) { Crit "Missing lists: $($missing -join ', ')" }

      # Schema drift: required intelligence lists
      foreach ($req in @('HVCG_Relationships','HVCG_AIJobs','HVCG_AIContext','HVCG_OperationalAlerts','HVCG_SystemInfo')) {
        if ($missing -contains $req) { $result.schemaDrift.Add($req) }
      }

      $ver = Get-HVCGInstalledVersion -SiteUrl $siteUrl
      $pkg = (Get-Content (Join-Path $RepoRoot 'VERSION') -Raw).Trim()
      if ($ver -eq '0.0.0') { Crit 'InstalledVersion not set' }
      elseif ($ver -ne $pkg) { Warn "Installed $ver differs from package $pkg" }

      # External sharing
      try {
        $site = Get-PnPSite -Includes SharingCapability
        if ([string]$site.SharingCapability -notin @('Disabled','ExistingExternalUserSharingOnly')) {
          Warn "SharingCapability=$($site.SharingCapability)"
          $result.permissionDrift.Add("SharingCapability=$($site.SharingCapability)")
        }
      }
      catch { Warn "Could not read SharingCapability" }

      # Automation health
      if (Get-PnPList -Identity 'HVCG_AutomationLogs' -ErrorAction SilentlyContinue) {
        $fails = Get-PnPListItem -List 'HVCG_AutomationLogs' -PageSize 100 | Where-Object { $_.FieldValues['Status'] -eq 'Failed' }
        $result.automationHealth = @{ recentFailedSample = @($fails).Count }
        if (@($fails).Count -gt 5) { Warn 'More than 5 failed automation log items in sample page' }
      }

      # AI queue health
      if (Get-PnPList -Identity 'HVCG_AIJobs' -ErrorAction SilentlyContinue) {
        $jobs = Get-PnPListItem -List 'HVCG_AIJobs' -PageSize 200
        $await = @($jobs | Where-Object { $_.FieldValues['JobStatus'] -eq 'AwaitingReview' }).Count
        $failed = @($jobs | Where-Object { $_.FieldValues['JobStatus'] -eq 'Failed' }).Count
        $result.aiQueueHealth = @{ awaitingReview = $await; failed = $failed }
        if ($failed -gt 0) { Warn "AI jobs failed=$failed" }
        if ($await -gt 20) { Warn "AI jobs awaiting review=$await" }
      }
      else {
        Warn 'HVCG_AIJobs not present — run upgrade to 1.1.0'
      }

      # Data quality samples
      if (Get-PnPList -Identity 'HVCG_Clients' -ErrorAction SilentlyContinue) {
        $clients = Get-PnPListItem -List 'HVCG_Clients' -PageSize 100
        $noCode = @($clients | Where-Object { [string]::IsNullOrWhiteSpace([string]$_.FieldValues['ClientCode']) }).Count
        if ($noCode) { $result.dataQualityIssues.Add("Clients missing ClientCode: $noCode"); Warn $result.dataQualityIssues[-1] }
      }

      # Backup status
      $latestBak = Join-Path $RepoRoot "backups/$Environment/latest.txt"
      if (Test-Path $latestBak) {
        $bakPath = Get-Content $latestBak -Raw
        $result.backupStatus = @{ latestPointer = $bakPath.Trim(); exists = (Test-Path $bakPath.Trim()) }
        if (-not (Test-Path $bakPath.Trim())) { Warn 'Backup latest pointer invalid' }
      }
      else {
        Warn 'No backup pointer found — run Backup-HVCGOS.ps1'
        $result.backupStatus = @{ latestPointer = $null }
        $result.recommendedActions.Add('pwsh -File ./deployment/backup/Backup-HVCGOS.ps1 -Environment ' + $Environment)
      }

      $pac = Get-Command pac -ErrorAction SilentlyContinue
      $result.powerPlatformStatus = if ($pac) { 'pac CLI available' } else { 'pac not installed (optional)' }
    }

    if ($result.criticalFailures.Count -gt 0) {
      $result.overallStatus = 'Unhealthy'
      $result.recommendedActions.Add('Resolve critical failures then re-run operational health')
    }
    elseif ($result.warnings.Count -gt 0) {
      $result.overallStatus = 'Degraded'
      $result.recommendedActions.Add('Triage warnings; schedule backup if missing')
    }
    else {
      $result.overallStatus = 'Healthy'
    }

    # Stamp SystemInfo if possible
    try {
      if (Get-PnPList -Identity 'HVCG_SystemInfo' -ErrorAction SilentlyContinue) {
        $items = @(Get-PnPListItem -List 'HVCG_SystemInfo' -PageSize 5)
        if ($items.Count -gt 0) {
          Set-PnPListItem -List 'HVCG_SystemInfo' -Identity $items[0].Id -Values @{
            LastHealthCheckUtc = (Get-Date).ToUniversalTime()
            LastHealthStatus = $result.overallStatus
          } | Out-Null
        }
      }
    }
    catch {}
  }
}
catch {
  Crit $_.Exception.Message
  $result.overallStatus = 'Unhealthy'
}

$result.finished = (Get-Date).ToString('o')
$json = ($result | ConvertTo-Json -Depth 8)
Set-Content $out -Value $json -Encoding UTF8
Set-Content $latest -Value $json -Encoding UTF8
Write-Host "Operational health: $latest ($($result.overallStatus))"
try { Disconnect-PnPOnline -ErrorAction SilentlyContinue } catch {}
if ($result.overallStatus -eq 'Unhealthy') { exit 1 }
exit 0
