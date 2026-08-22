#Requires -Version 7.0
<#
.SYNOPSIS
  Repair partially provisioned HVCG SharePoint lists/fields without deleting sites or data.

.DESCRIPTION
  Idempotent: retains existing lists, adds missing fields, skips correct fields,
  reports incorrect type mismatches, then provisions views/seed only if schema is compliant.

.EXAMPLE
  pwsh -File ./deployment/repair/Repair-HVCGOSSharePointSchema.ps1 -Environment development
#>
[CmdletBinding()]
param(
  [ValidateSet('development', 'test', 'production')]
  [string]$Environment = 'development',
  [string]$ConfigPath = '',
  [string]$RepoRoot = '',
  [switch]$SkipViews,
  [switch]$SkipSeed,
  [switch]$WhatIf
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (-not $RepoRoot) {
  $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
}

Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.Deployment.psm1') -Force
Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.Release.psm1') -Force

$Report = New-HVCGDeploymentReport -Environment "$Environment-repair-schema" -RepoRoot $RepoRoot

try {
  $Config = Get-HVCGOSConfig -RepoRoot $RepoRoot -Environment $Environment -ConfigPath $ConfigPath
  Assert-HVCGConfig -Config $Config -Report $Report
  Install-HVCGModules -Report $Report
  if ($WhatIf) {
    Write-HVCGLog -Level WARN -Message 'WhatIf: would repair lists/fields then validate' -Report $Report
    $Report.Success = $true
    Save-HVCGDeploymentReport -Report $Report -RepoRoot $RepoRoot | Out-Null
    exit 0
  }

  $null = Connect-HVCGGraphInteractive -Report $Report
  $null = Initialize-HVCGPnPAuth -Config $Config -Report $Report

  $siteUrl = $Config.sites.commandCenter.url
  Write-HVCGLog -Level STEP -Message "Repairing schema on $siteUrl (no site/list deletion)" -Report $Report

  # Additive field repair — same engine as fresh install
  Install-HVCGListsFromSchema -SiteUrl $siteUrl -RepoRoot $RepoRoot -Report $Report

  if (-not $SkipViews) {
    Install-HVCGViews -SiteUrl $siteUrl -RepoRoot $RepoRoot -Report $Report
  }

  if (-not $SkipSeed -and $Config.deployment.seedSampleData) {
    Install-HVCGSeedData -SiteUrl $siteUrl -RepoRoot $RepoRoot -Report $Report
  }

  # Final drift gate — missing / extra / mismatched fails repair
  Assert-HVCGSharePointSchemaCompliance -SiteUrl $siteUrl -RepoRoot $RepoRoot -Report $Report -Phase 'post-repair'

  $Report.Success = ($Report.Errors.Count -eq 0)
  $Report.NextStep = "Schema validation report: $($Report.SchemaValidationPath). Validate UI at $siteUrl then continue Power Platform packaging."
  Write-HVCGLog -Level SUCCESS -Message "Schema repair finished success=$($Report.Success)" -Report $Report
}
catch {
  Write-HVCGLog -Level ERROR -Message $_.Exception.Message -Report $Report
  $Report.Success = $false
  $Report.NextStep = 'Fix errors and re-run Repair-HVCGOSSharePointSchema.ps1 (safe/idempotent).'
  exit 1
}
finally {
  $path = Save-HVCGDeploymentReport -Report $Report -RepoRoot $RepoRoot
  Write-Host "Repair report: $path"
  try { Disconnect-PnPOnline -ErrorAction SilentlyContinue } catch {}
}
if (-not $Report.Success) { exit 1 }
exit 0
