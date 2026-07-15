#Requires -Version 7.0
<#
.SYNOPSIS
  Thin wrapper — prefer deployment/Deploy-HVCGDevelopment.ps1 for full Dev deploy.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$SiteUrl,
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path,
  [string]$ConfigPath = '',
  [switch]$WhatIf
)
Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.Deployment.psm1') -Force
$Report = New-HVCGDeploymentReport -Environment 'adhoc-lists' -RepoRoot $RepoRoot
Install-HVCGModules -Report $Report -WhatIf:$WhatIf
if (-not $WhatIf) {
  $cfgPath = if ($ConfigPath) { $ConfigPath } else { Join-Path $RepoRoot 'config/environments/development.json' }
  $Config = Get-Content $cfgPath -Raw | ConvertFrom-Json
  $null = Initialize-HVCGPnPAuth -Config $Config -Report $Report
  Connect-HVCGPnPOnline -Url $SiteUrl -Config $Config -Report $Report
}
Install-HVCGListsFromSchema -SiteUrl $SiteUrl -RepoRoot $RepoRoot -Report $Report -WhatIf:$WhatIf
Save-HVCGDeploymentReport -Report $Report -RepoRoot $RepoRoot | Out-Null
Write-Host "Done. Prefer Deploy-HVCGDevelopment.ps1 for full orchestration."
