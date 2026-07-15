#Requires -Version 7.0
<#
.SYNOPSIS
  HVCG OS health checks against a deployed environment.
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

$results = [ordered]@{
  started = (Get-Date).ToString('o')
  environment = $Environment
  checks = @()
  healthy = $false
}

function Add-Health($Name, $Passed, $Detail, [ValidateSet('critical','warning')]$Severity = 'critical') {
  $script:results.checks += [pscustomobject]@{ name = $Name; passed = $Passed; detail = $Detail; severity = $Severity }
  $color = if ($Passed) { 'Green' } else { if ($Severity -eq 'warning') { 'Yellow' } else { 'Red' } }
  Write-Host "$(if($Passed){'PASS'}else{'FAIL'}) $Name — $Detail" -ForegroundColor $color
}

try {
  $Config = Get-HVCGOSConfig -RepoRoot $RepoRoot -Environment $Environment -ConfigPath $ConfigPath
  $expectedVersion = (Get-Content (Join-Path $RepoRoot 'VERSION') -Raw).Trim()

  if ($WhatIf) {
    Add-Health 'whatif' $true 'Skipped live checks'
    $results.healthy = $true
  }
  else {
    $nullReport = New-HVCGDeploymentReport -Environment 'health' -RepoRoot $RepoRoot
    Install-HVCGModules -Report $nullReport
    $null = Connect-HVCGGraphInteractive -Report $nullReport
    $null = Initialize-HVCGPnPAuth -Config $Config -Report $nullReport
    $siteUrl = $Config.sites.commandCenter.url
    Connect-HVCGPnPOnline -Url $siteUrl -Config $Config -Report $nullReport

    Add-Health 'site_reachable' $true $siteUrl

    $installed = Get-HVCGInstalledVersion -SiteUrl $siteUrl
    Add-Health 'version_marker' ($installed -ne '0.0.0') "InstalledVersion=$installed"

    $idx = Get-Content (Join-Path $RepoRoot 'src/sharepoint/lists/_index.json') -Raw | ConvertFrom-Json
    $missing = @()
    foreach ($l in $idx.lists) {
      if (-not (Get-PnPList -Identity $l.name -ErrorAction SilentlyContinue)) { $missing += $l.name }
    }
    Add-Health 'all_lists_present' ($missing.Count -eq 0) $(if ($missing.Count -eq 0) { "$($idx.lists.Count) lists OK" } else { "Missing: $($missing -join ', ')" })

    $sys = Get-PnPList -Identity 'HVCG_SystemInfo' -ErrorAction SilentlyContinue
    Add-Health 'systeminfo_list' ($null -ne $sys) 'HVCG_SystemInfo'

    $clients = Get-PnPList -Identity 'HVCG_Clients' -ErrorAction SilentlyContinue
    Add-Health 'clients_list' ($null -ne $clients) 'HVCG_Clients'

    # Update health stamp
    try {
      $items = @(Get-PnPListItem -List 'HVCG_SystemInfo' -PageSize 5)
      $status = if (($results.checks | Where-Object { -not $_.passed -and $_.severity -eq 'critical' }).Count -eq 0) { 'Healthy' } else { 'Unhealthy' }
      if ($items.Count -gt 0) {
        Set-PnPListItem -List 'HVCG_SystemInfo' -Identity $items[0].Id -Values @{
          LastHealthCheckUtc = (Get-Date).ToUniversalTime()
          LastHealthStatus   = $status
        } | Out-Null
      }
      Add-Health 'health_stamp' $true $status 'warning'
    }
    catch {
      Add-Health 'health_stamp' $false $_.Exception.Message 'warning'
    }
  }
}
catch {
  Add-Health 'health_engine' $false $_.Exception.Message
}

$criticalFails = @($results.checks | Where-Object { -not $_.passed -and $_.severity -eq 'critical' })
$results.healthy = ($criticalFails.Count -eq 0)
$results.finished = (Get-Date).ToString('o')
$out = Join-Path $RepoRoot 'deployment/reports/health-latest.json'
($results | ConvertTo-Json -Depth 6) | Set-Content $out -Encoding UTF8
Write-Host "Health report: $out"
if (-not $results.healthy) { exit 1 }
Write-Host 'RESULT: HEALTHY' -ForegroundColor Green
exit 0
