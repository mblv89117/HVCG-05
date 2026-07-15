#Requires -Version 7.0
<#
.SYNOPSIS
  Thin wrapper — Entra groups are created by Deploy-HVCGDevelopment.ps1.
#>
[CmdletBinding()]
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path,
  [string]$ConfigPath = ''
)
Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.Deployment.psm1') -Force
$Report = New-HVCGDeploymentReport -Environment 'adhoc-groups' -RepoRoot $RepoRoot
Install-HVCGModules -Report $Report
if ($ConfigPath -and (Test-Path $ConfigPath)) {
  $Config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
}
else {
  $Config = Initialize-HVCGDevConfig -RepoRoot $RepoRoot
}
Connect-HVCGGraphInteractive -Report $Report | Out-Null
Ensure-HVCGEntraGroups -Config $Config -Report $Report
Save-HVCGDeploymentReport -Report $Report -RepoRoot $RepoRoot | Out-Null
