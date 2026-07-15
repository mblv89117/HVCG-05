#Requires -Version 7.0
<#
.SYNOPSIS
  Soft-rollback HVCG OS version marker and automations. Does not delete customer list data.

.DESCRIPTION
  SharePoint columns/lists added by upgrades are retained (safe). Version marker rolls back
  so apps/flows targeting the prior schema remain coherent. Managed solution rollback uses pac.

.EXAMPLE
  pwsh -File ./deployment/rollback/Rollback-HVCGOS.ps1 -Environment development -TargetVersion 1.0.0
#>
[CmdletBinding()]
param(
  [ValidateSet('development', 'test', 'production')]
  [string]$Environment = 'development',
  [Parameter(Mandatory = $true)]
  [string]$TargetVersion,
  [string]$ConfigPath = '',
  [switch]$DisableFlows,
  [switch]$WhatIf,
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.Deployment.psm1') -Force
Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.Release.psm1') -Force

$Report = New-HVCGDeploymentReport -Environment "$Environment-rollback" -RepoRoot $RepoRoot

try {
  if ($Environment -eq 'production' -and -not $Force) {
    throw 'Production rollback requires -Force after explicit approval.'
  }

  $Config = Get-HVCGOSConfig -RepoRoot $RepoRoot -Environment $Environment -ConfigPath $ConfigPath
  if ($WhatIf) {
    Write-HVCGLog -Level WARN -Message "WhatIf: would set InstalledVersion=$TargetVersion; data retained." -Report $Report
    $Report.Success = $true
    Save-HVCGDeploymentReport -Report $Report -RepoRoot $RepoRoot | Out-Null
    exit 0
  }

  Install-HVCGModules -Report $Report
  $null = Connect-HVCGGraphInteractive -Report $Report
  $null = Initialize-HVCGPnPAuth -Config $Config -Report $Report
  $siteUrl = $Config.sites.commandCenter.url
  Connect-HVCGPnPOnline -Url $siteUrl -Config $Config -Report $Report

  $current = Get-HVCGInstalledVersion -SiteUrl $siteUrl
  Write-HVCGLog -Level INFO -Message "Current=$current → rollback marker to $TargetVersion" -Report $Report

  if (Compare-HVCGSemVer -Left $TargetVersion -Right $current -Op GT) {
    throw "Rollback target $TargetVersion is newer than installed $current."
  }

  Set-HVCGInstalledVersion -SiteUrl $siteUrl -Version $TargetVersion -EnvironmentName $Environment -Report $Report -Notes "Rollback from $current" -RepoRoot $RepoRoot

  if ($DisableFlows) {
    Write-HVCGLog -Level WARN -Message 'DisableFlows requested — turn off flows manually in Maker portal or pac (not auto-enumerated in v1.0.0).' -Report $Report
    $Report.OwnerActionsRemaining.Add('Disable HVCG_* flows in Power Automate for this environment.')
  }

  # Optional: pac solution rollback instructions
  $Report.OwnerActionsRemaining.Add('If a managed solution was imported, re-import prior managed zip from releases/vX.Y.Z/artifacts/')
  $Report.Success = $true
  $Report.NextStep = 'Run health check; confirm apps against rolled-back feature set.'
  Write-HVCGLog -Level SUCCESS -Message 'Soft rollback complete. Customer data lists were not deleted.' -Report $Report
}
catch {
  Write-HVCGLog -Level ERROR -Message $_.Exception.Message -Report $Report
  $Report.Success = $false
  exit 1
}
finally {
  Save-HVCGDeploymentReport -Report $Report -RepoRoot $RepoRoot | Out-Null
  try { Disconnect-PnPOnline -ErrorAction SilentlyContinue } catch {}
}

exit 0
