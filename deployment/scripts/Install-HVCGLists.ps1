#Requires -Version 7.0
<#
.SYNOPSIS
  Thin wrapper — prefer deployment/Deploy-HVCGDevelopment.ps1 for full Dev deploy.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$SiteUrl,
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path,
  [switch]$WhatIf
)
Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.Deployment.psm1') -Force
$Report = New-HVCGDeploymentReport -Environment 'adhoc-lists' -RepoRoot $RepoRoot
Install-HVCGModules -Report $Report -WhatIf:$WhatIf
if (-not $WhatIf) {
  Connect-PnPOnline -Url $SiteUrl -Interactive
}
Install-HVCGListsFromSchema -SiteUrl $SiteUrl -RepoRoot $RepoRoot -Report $Report -WhatIf:$WhatIf
Save-HVCGDeploymentReport -Report $Report -RepoRoot $RepoRoot | Out-Null
Write-Host "Done. Prefer Deploy-HVCGDevelopment.ps1 for full orchestration."
