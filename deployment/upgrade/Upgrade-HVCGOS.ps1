#Requires -Version 7.0
<#
.SYNOPSIS
  Upgrade HVCG OS from the installed version to a target semantic version without rebuilding customer data.

.DESCRIPTION
  Reads migration packs from releases/migrations/, applies additive schema changes,
  updates HVCG_SystemInfo.InstalledVersion. Safe to re-run.

.EXAMPLE
  pwsh -File ./deployment/upgrade/Upgrade-HVCGOS.ps1 -Environment development -TargetVersion 1.0.0
#>
[CmdletBinding()]
param(
  [ValidateSet('development', 'test', 'production')]
  [string]$Environment = 'development',
  [string]$TargetVersion = '',
  [string]$ConfigPath = '',
  [string]$RepoRoot = '',
  [switch]$SkipPreTests,
  [switch]$WhatIf
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not $RepoRoot) {
  $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
}
if (-not $TargetVersion) {
  $TargetVersion = (Get-Content (Join-Path $RepoRoot 'VERSION') -Raw).Trim()
}

Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.Deployment.psm1') -Force
Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.Release.psm1') -Force

$Report = New-HVCGDeploymentReport -Environment $Environment -RepoRoot $RepoRoot
$Report.Log.Add("Upgrade target=$TargetVersion")

try {
  if (-not $SkipPreTests) {
    Write-HVCGLog -Level STEP -Message 'Pre-upgrade validation...' -Report $Report
    & (Join-Path $RepoRoot 'tests/Invoke-HVCGPreDeploymentTests.ps1') -RepoRoot $RepoRoot
    if ($LASTEXITCODE -ne 0) { throw 'Pre-upgrade tests failed.' }
  }

  $Config = Get-HVCGOSConfig -RepoRoot $RepoRoot -Environment $Environment -ConfigPath $ConfigPath
  $Config = Invoke-HVCGConfigMigration -Config $Config -RepoRoot $RepoRoot -Report $Report
  Assert-HVCGConfig -Config $Config -Report $Report

  if ($WhatIf) {
    $installed = '0.0.0 (WhatIf assumes unknown)'
    Write-HVCGLog -Level WARN -Message "WhatIf: would upgrade installed → $TargetVersion" -Report $Report
    $plan = Get-HVCGMigrationPlan -RepoRoot $RepoRoot -FromVersion '0.0.0' -ToVersion $TargetVersion
    foreach ($m in $plan) {
      Write-HVCGLog -Level INFO -Message "WhatIf migration: $($m.id) $($m.fromVersion) → $($m.toVersion)" -Report $Report
    }
    $Report.Success = $true
    $Report.NextStep = 'Re-run without -WhatIf'
    Save-HVCGDeploymentReport -Report $Report -RepoRoot $RepoRoot | Out-Null
    exit 0
  }

  Install-HVCGModules -Report $Report
  $null = Connect-HVCGGraphInteractive -Report $Report

  $siteUrl = $Config.sites.commandCenter.url
  Connect-PnPOnline -Url $siteUrl -Interactive -ErrorAction Stop

  Ensure-HVCGSystemInfoList -SiteUrl $siteUrl -RepoRoot $RepoRoot -Report $Report
  $installed = Get-HVCGInstalledVersion -SiteUrl $siteUrl
  Write-HVCGLog -Level INFO -Message "Installed version: $installed" -Report $Report

  if (Compare-HVCGSemVer -Left $installed -Right $TargetVersion -Op GE) {
    if ($installed -eq $TargetVersion) {
      Write-HVCGLog -Level SUCCESS -Message "Already at $TargetVersion — nothing to upgrade." -Report $Report
      $Report.Success = $true
      $Report.NextStep = 'Run health checks if desired.'
      Save-HVCGDeploymentReport -Report $Report -RepoRoot $RepoRoot | Out-Null
      exit 0
    }
    throw "Installed $installed is newer than target $TargetVersion. Use rollback only with care."
  }

  if ($Environment -eq 'production') {
    Write-HVCGLog -Level WARN -Message 'PRODUCTION upgrade — ensure backup/export completed.' -Report $Report
  }

  $plan = Get-HVCGMigrationPlan -RepoRoot $RepoRoot -FromVersion $installed -ToVersion $TargetVersion
  if ($plan.Count -eq 0) {
    throw "No migration path from $installed to $TargetVersion. Add packs under releases/migrations/."
  }

  foreach ($mig in $plan) {
    if ($mig.status -eq 'planned' -or $mig.status -eq 'superseded' -or $mig.id -like 'PLACEHOLDER*') {
      throw "Migration $($mig.id) is a placeholder/superseded pack and cannot be applied."
    }
    Write-HVCGLog -Level STEP -Message "Applying $($mig.id): $($mig.fromVersion) → $($mig.toVersion)" -Report $Report
    Invoke-HVCGMigration -Migration $mig -Config $Config -RepoRoot $RepoRoot -Report $Report
  }

  Set-HVCGInstalledVersion -SiteUrl $siteUrl -Version $TargetVersion -EnvironmentName $Environment -Report $Report -RepoRoot $RepoRoot
  $Report.Success = $true
  $Report.NextStep = "Run: pwsh -File ./deployment/health/Test-HVCGOSHealth.ps1 -Environment $Environment"
  Write-HVCGLog -Level SUCCESS -Message "Upgrade to $TargetVersion complete. Customer data preserved." -Report $Report
}
catch {
  Write-HVCGLog -Level ERROR -Message $_.Exception.Message -Report $Report
  $Report.Success = $false
  $Report.NextStep = 'Fix error and re-run Upgrade-HVCGOS.ps1 (idempotent).'
  exit 1
}
finally {
  $path = Save-HVCGDeploymentReport -Report $Report -RepoRoot $RepoRoot
  Write-Host "Report: $path"
  try { Disconnect-PnPOnline -ErrorAction SilentlyContinue } catch {}
  try { Disconnect-MgGraph -ErrorAction SilentlyContinue } catch {}
}

exit 0
