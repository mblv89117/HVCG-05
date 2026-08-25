#Requires -Version 7.0
<#
.SYNOPSIS
  Production SharePoint schema repair + client import (HVCG tenant).

.DESCRIPTION
  Idempotent. Does NOT touch HVS OneDrive. Never seeds sample data into production.
  Uses PnP DeviceLogin (one MFA) — no certificate required for this gate.

.EXAMPLE
  pwsh -File ./deployment/Deploy-HVCGProduction.ps1 -DeviceLogin
#>
[CmdletBinding()]
param(
  [string]$RepoRoot = '',
  [switch]$DeviceLogin,
  [switch]$SkipClientImport,
  [switch]$WhatIf
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (-not $RepoRoot) {
  $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
}

Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.Deployment.psm1') -Force
Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.Release.psm1') -Force

$Report = New-HVCGDeploymentReport -Environment 'production' -RepoRoot $RepoRoot

try {
  $Config = Get-HVCGOSConfig -RepoRoot $RepoRoot -Environment production
  Assert-HVCGConfig -Config $Config -Report $Report
  Install-HVCGModules -Report $Report

  if ($WhatIf) {
    Write-HVCGLog -Level WARN -Message 'WhatIf: would repair production schema + import clients' -Report $Report
    $Report.Success = $true
    Save-HVCGDeploymentReport -Report $Report -RepoRoot $RepoRoot | Out-Null
    exit 0
  }

  $expectedCid = '836fb743-6439-4836-b1f2-4a144ce2f762'
  $cid = [string](Get-HVCGPropertyValue -Object $Config.authentication -Name 'pnpEntraAppClientId' -Default '')
  if ($cid -ne $expectedCid) {
    throw "Refuse production deploy: pnpEntraAppClientId must be $expectedCid (got '$cid')"
  }
  $null = Initialize-HVCGPnPAuth -Config $Config -Report $Report

  $siteUrl = [string]$Config.sites.commandCenter.url
  Write-HVCGLog -Level STEP -Message "Connecting to PRODUCTION $siteUrl (DeviceLogin=$DeviceLogin)" -Report $Report
  if ($DeviceLogin) {
    Connect-PnPOnline -Url $siteUrl -DeviceLogin -ClientId $cid -ErrorAction Stop | Out-Null
  }
  else {
    Connect-HVCGPnPOnline -Url $siteUrl -Config $Config -Report $Report
  }

  Write-HVCGLog -Level STEP -Message "Repairing PRODUCTION schema on $siteUrl (no deletes)" -Report $Report
  Install-HVCGListsFromSchema -SiteUrl $siteUrl -RepoRoot $RepoRoot -Report $Report
  Install-HVCGViews -SiteUrl $siteUrl -RepoRoot $RepoRoot -Report $Report
  Assert-HVCGSharePointSchemaCompliance -SiteUrl $siteUrl -RepoRoot $RepoRoot -Report $Report -Phase 'post-repair-production'

  if (-not $SkipClientImport) {
    Write-HVCGLog -Level STEP -Message 'Importing canonical clients into production HVCG_Clients' -Report $Report
    & (Join-Path $RepoRoot 'deployment/scripts/Import-HVCGClientsFromAtlas.ps1') `
      -RepoRoot $RepoRoot `
      -Environment production `
      -DeviceLogin:$DeviceLogin
  }

  $Report.Success = ($Report.Errors.Count -eq 0)
  $Report.NextStep = "Open $siteUrl and Elite http://127.0.0.1:5180/clients"
  Write-HVCGLog -Level SUCCESS -Message "Production deploy success=$($Report.Success)" -Report $Report
}
catch {
  Write-HVCGLog -Level ERROR -Message $_.Exception.Message -Report $Report
  $Report.Success = $false
  $Report.NextStep = 'Re-run: pwsh -File ./deployment/Deploy-HVCGProduction.ps1 -DeviceLogin'
  exit 1
}
finally {
  $path = Save-HVCGDeploymentReport -Report $Report -RepoRoot $RepoRoot
  Write-Host "Production report: $path"
  try { Disconnect-PnPOnline -ErrorAction SilentlyContinue } catch {}
}
if (-not $Report.Success) { exit 1 }
exit 0
