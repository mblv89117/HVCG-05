#Requires -Version 7.0
<#
.SYNOPSIS
  Install HVCG OS v1.0.0 into an environment (development | test | production).

.DESCRIPTION
  Idempotent installer. Fresh tenants run baseline migration 0.0.0 → 1.0.0.
  Does not delete customer data. Prefer Upgrade-HVCGOS.ps1 when a version is already installed.

.EXAMPLE
  pwsh -File ./deployment/install/Install-HVCGOS.ps1 -Environment development

.EXAMPLE
  pwsh -File ./deployment/install/Install-HVCGOS.ps1 -Environment production -ConfigPath ./config/environments/production.json
#>
[CmdletBinding()]
param(
  [ValidateSet('development', 'test', 'production')]
  [string]$Environment = 'development',
  [string]$ConfigPath = '',
  [string]$TargetVersion = '',
  [switch]$SkipPreTests,
  [switch]$SkipHealthCheck,
  [switch]$WhatIf
)

$ErrorActionPreference = 'Stop'
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
if (-not $TargetVersion) {
  $TargetVersion = (Get-Content (Join-Path $RepoRoot 'VERSION') -Raw).Trim()
}

# Route development through existing orchestrator for parity
if ($Environment -eq 'development' -and -not $ConfigPath) {
  Write-Host "Delegating Development install to Deploy-HVCGDevelopment.ps1 then applying version marker..." -ForegroundColor Cyan
  $deployArgs = @('-File', (Join-Path $RepoRoot 'deployment/Deploy-HVCGDevelopment.ps1'))
  if ($WhatIf) { $deployArgs += '-WhatIf' }
  if ($SkipPreTests) { $deployArgs += '-SkipPreDeploymentTests' }
  & pwsh @deployArgs
  if ($LASTEXITCODE -ne 0 -and -not $WhatIf) { exit $LASTEXITCODE }
}

# Always prefer upgrade engine (handles 0.0.0 → target)
$upgrade = Join-Path $RepoRoot 'deployment/upgrade/Upgrade-HVCGOS.ps1'
$uArgs = @{
  Environment   = $Environment
  TargetVersion = $TargetVersion
  RepoRoot      = $RepoRoot
}
if ($ConfigPath) { $uArgs.ConfigPath = $ConfigPath }
if ($WhatIf) { $uArgs.WhatIf = $true }
if ($SkipPreTests) { $uArgs.SkipPreTests = $true }

& $upgrade @uArgs
$code = $LASTEXITCODE

if (-not $SkipHealthCheck -and -not $WhatIf -and $code -eq 0) {
  & (Join-Path $RepoRoot 'deployment/health/Test-HVCGOSHealth.ps1') -Environment $Environment -ConfigPath $ConfigPath
  $code = $LASTEXITCODE
  if ($code -eq 0) {
    & (Join-Path $RepoRoot 'deployment/health/Test-HVCGOSPostDeploy.ps1') -Environment $Environment -ConfigPath $ConfigPath
    $code = $LASTEXITCODE
  }
}

exit $code
