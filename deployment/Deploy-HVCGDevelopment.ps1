#Requires -Version 7.0
<#
.SYNOPSIS
  Single entry point: deploy HVCG Command Center Development environment to Microsoft 365.

.DESCRIPTION
  Orchestrates prerequisite checks, Entra groups, SharePoint Dev sites, lists, views,
  Knowledge templates, seed data, sample client workspace, and validation reporting.

  You only need to sign in when prompted and approve consent. Do not deploy Production with this script.

.EXAMPLE
  pwsh -File ./deployment/Deploy-HVCGDevelopment.ps1

.EXAMPLE
  pwsh -File ./deployment/Deploy-HVCGDevelopment.ps1 -WhatIf

.EXAMPLE
  pwsh -File ./deployment/Deploy-HVCGDevelopment.ps1 -TenantDomain 'contoso.onmicrosoft.com' -ExecutiveUpn 'manny@contoso.com'
#>
[CmdletBinding()]
param(
  [string]$ConfigPath = '',
  [string]$TenantDomain = '',
  [string]$SharePointRoot = '',
  [string]$ExecutiveUpn = '',
  [string]$OperationsManagerUpn = '',
  [switch]$SkipPreDeploymentTests,
  [switch]$SkipPowerPlatform,
  [switch]$NonInteractive,
  [switch]$WhatIf
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.Deployment.psm1') -Force

$Report = New-HVCGDeploymentReport -Environment 'development' -RepoRoot $RepoRoot
$criticalFailure = $false

try {
  Write-HVCGLog -Level STEP -Message "HVCG Development deployment starting. Repo=$RepoRoot" -Report $Report

  # --- 1. Pre-deployment tests (critical gate) ---
  if (-not $SkipPreDeploymentTests) {
    Write-HVCGLog -Level STEP -Message "Running pre-deployment tests..." -Report $Report
    $testScript = Join-Path $RepoRoot 'tests/Invoke-HVCGPreDeploymentTests.ps1'
    $testResultPath = Join-Path $RepoRoot 'deployment/reports/predeploy-tests-latest.json'
    & $testScript -RepoRoot $RepoRoot -JsonOut $testResultPath
    if ($LASTEXITCODE -ne 0) {
      throw "Critical pre-deployment tests failed. Fix errors before deploying. See $testResultPath"
    }
    if (Test-Path $testResultPath) {
      $Report.TestResults = Get-Content $testResultPath -Raw | ConvertFrom-Json
    }
    Write-HVCGLog -Level SUCCESS -Message "Pre-deployment tests passed." -Report $Report
  }

  # --- 2. Config ---
  $overrides = @{}
  if ($TenantDomain) { $overrides.TenantDomain = $TenantDomain }
  if ($SharePointRoot) { $overrides.SharePointRoot = $SharePointRoot }
  if ($ExecutiveUpn) { $overrides.ExecutiveUpn = $ExecutiveUpn }
  if ($OperationsManagerUpn) { $overrides.OperationsManagerUpn = $OperationsManagerUpn }

  if ($ConfigPath -and (Test-Path $ConfigPath)) {
    $Config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
  }
  else {
    $Config = Initialize-HVCGDevConfig -RepoRoot $RepoRoot -Overrides $overrides -NonInteractive:$NonInteractive
  }
  Assert-HVCGConfig -Config $Config -Report $Report
  $Report.Tenant = $Config.tenant.domain

  # --- 3. Modules ---
  Install-HVCGModules -Report $Report -WhatIf:$WhatIf

  if ($WhatIf) {
    Write-HVCGLog -Level WARN -Message "WhatIf mode: authentication and tenant mutations skipped after module check / config validation." -Report $Report
    $Report.OwnerActionsRemaining.Add('Run without -WhatIf and complete interactive Microsoft sign-in / consent.')
    $Report.NextStep = 'Re-run: pwsh -File ./deployment/Deploy-HVCGDevelopment.ps1'
    $Report.Success = $true
    $path = Save-HVCGDeploymentReport -Report $Report -RepoRoot $RepoRoot
    Write-HVCGLog -Level SUCCESS -Message "WhatIf report written: $path" -Report $Report
    return
  }

  # --- 4. Authenticate Graph ---
  $ctx = Connect-HVCGGraphInteractive -Report $Report

  # Resolve tenant id into config file for later
  $devConfigPath = Join-Path $RepoRoot 'config/environments/development.json'
  try {
    $cfgFile = Get-Content $devConfigPath -Raw | ConvertFrom-Json
    $cfgFile.tenant.tenantId = $ctx.TenantId
    ($cfgFile | ConvertTo-Json -Depth 12) | Set-Content $devConfigPath -Encoding UTF8
  }
  catch {
    Write-HVCGLog -Level WARN -Message "Could not persist tenantId to development.json" -Report $Report
  }

  # --- 5. Entra groups ---
  Ensure-HVCGEntraGroups -Config $Config -Report $Report

  # --- 5b. PnP Entra app Client ID (required for SharePoint interactive auth) ---
  $null = Initialize-HVCGPnPAuth -Config $Config -Report $Report

  # --- 6. Sites (security-critical for Command Center) ---
  $owner = $Config.identities.siteOwnerUpn
  $adminUrl = $Config.tenant.sharePointAdminUrl

  $ccUrl = Ensure-HVCGSite -SiteCfg $Config.sites.commandCenter -OwnerUpn $owner -AdminUrl $adminUrl -Report $Report -Config $Config -SecurityCritical
  $knowUrl = Ensure-HVCGSite -SiteCfg $Config.sites.knowledgeCenter -OwnerUpn $owner -AdminUrl $adminUrl -Report $Report -Config $Config -SecurityCritical
  $clientsUrl = Ensure-HVCGSite -SiteCfg $Config.sites.clientsHub -OwnerUpn $owner -AdminUrl $adminUrl -Report $Report -Config $Config -SecurityCritical

  $secureDataRooms = Get-HVCGPropertyValue -Object $Config.sites -Name 'secureDataRooms' -Default $null
  $secureDataRoomsEnabled = [bool](Get-HVCGPropertyValue -Object $secureDataRooms -Name 'enabled' -Default $false)
  if ($secureDataRoomsEnabled) {
    Ensure-HVCGSite -SiteCfg $secureDataRooms -OwnerUpn $owner -AdminUrl $adminUrl -Report $Report -Config $Config
  }
  else {
    Write-HVCGLog -Level INFO -Message "Secure Data Rooms site skipped (V1 default enabled=false)." -Report $Report
    $Report.ResourcesSkipped.Add('Site:HVCG-DataRooms-Dev:disabled-by-config')
  }

  if (-not $ccUrl) { throw "Command Center site URL unavailable — cannot continue." }

  # --- 7. Lists, columns, lookups, indexes ---
  Install-HVCGListsFromSchema -SiteUrl $Config.sites.commandCenter.url -RepoRoot $RepoRoot -Report $Report

  # --- 8. Views ---
  Install-HVCGViews -SiteUrl $Config.sites.commandCenter.url -RepoRoot $RepoRoot -Report $Report

  # --- 9. Knowledge templates ---
  if ($Config.deployment.uploadProjectTemplates -and $knowUrl) {
    Install-HVCGKnowledgeTemplates -KnowledgeUrl $Config.sites.knowledgeCenter.url -RepoRoot $RepoRoot -Report $Report
  }

  # --- 10. Seed data ---
  if ($Config.deployment.seedSampleData) {
    Install-HVCGSeedData -SiteUrl $Config.sites.commandCenter.url -RepoRoot $RepoRoot -Report $Report
  }

  # --- 10b. Final schema drift gate (missing / extra / mismatched) ---
  Assert-HVCGSharePointSchemaCompliance -SiteUrl $Config.sites.commandCenter.url -RepoRoot $RepoRoot -Report $Report -Phase 'post-deploy'

  # --- 11. Sample client workspace folders ---
  if ($Config.deployment.createSampleClientWorkspace -and $clientsUrl) {
    Install-HVCGSampleClientWorkspace -ClientsUrl $Config.sites.clientsHub.url -ClientCode $Config.deployment.sampleClientCode -RepoRoot $RepoRoot -Report $Report
  }

  # --- 12. Site permissions for Dev role groups (best effort) ---
  Write-HVCGLog -Level STEP -Message "Applying Dev site group permissions (best effort)" -Report $Report
  try {
    Connect-HVCGPnPOnline -Url $Config.sites.commandCenter.url -Config $Config -Report $Report
    foreach ($gName in $Config.groups.roleGroups) {
      try {
        # Ensure SharePoint group mapping via Entra security group - grant Contribute on webs when resolvable
        Set-PnPWebPermission -User $gName -AddRole 'Contribute' -ErrorAction SilentlyContinue
        $Report.ResourcesUpdated.Add("WebPermission:$gName")
      }
      catch {
        Write-HVCGLog -Level WARN -Message "Permission grant skipped for $gName (resolve after sync): $($_.Exception.Message)" -Report $Report
      }
    }
  }
  catch {
    Write-HVCGLog -Level WARN -Message "Site permission pass incomplete: $($_.Exception.Message)" -Report $Report
  }

  # --- 13. Power Platform ---
  if (-not $SkipPowerPlatform -and $Config.deployment.provisionPowerPlatformSolution) {
    Write-HVCGLog -Level STEP -Message "Power Platform solution packaging phase" -Report $Report
    $pac = Get-Command pac -ErrorAction SilentlyContinue
    if ($pac) {
      Write-HVCGLog -Level INFO -Message "pac CLI detected. See src/power-platform/PACKAGING.md for import commands." -Report $Report
      $Report.OwnerActionsRemaining.Add('Run pac solution import / create connections per src/power-platform/PACKAGING.md (auth already established in pac if configured).')
    }
    else {
      Write-HVCGLog -Level WARN -Message "Power Platform CLI (pac) not installed. Flow definition packages are ready under src/power-automate/definitions; import using PACKAGING.md after installing pac OR create flows from definitions in maker portal." -Report $Report
      $Report.OwnerActionsRemaining.Add('Install Power Platform CLI (optional) OR create flows from src/power-automate/definitions in Power Automate using the build sheet.')
      $Report.OwnerActionsRemaining.Add('Build/share canvas app using src/power-apps/BUILD_SHEET.md after lists exist.')
    }
  }

  # Remaining true owner actions
  $Report.OwnerActionsRemaining.Add('Authorize SharePoint/Outlook/Teams connections when enabling each flow (one-time per connection).')
  $Report.OwnerActionsRemaining.Add('Production go-live later: requires explicit approval (never use this Dev script for prod).')

  if ($Report.Errors.Count -eq 0) {
    $Report.Success = $true
    $Report.NextStep = "Open $($Config.sites.commandCenter.url) and verify lists + sample clients. Then create/import flows per src/power-platform/PACKAGING.md."
    Write-HVCGLog -Level SUCCESS -Message "Development deployment completed with success=$($Report.Success)." -Report $Report
  }
  else {
    $Report.Success = $false
    $Report.NextStep = 'Review errors in deployment report, fix, and re-run (safe/idempotent).'
    Write-HVCGLog -Level ERROR -Message "Deployment finished with errors." -Report $Report
  }
}
catch {
  $criticalFailure = $true
  Write-HVCGLog -Level ERROR -Message $_.Exception.Message -Report $Report
  $Report.Success = $false
  $Report.NextStep = 'Resolve the critical error above, then re-run the same command (idempotent).'
}
finally {
  $reportPath = Save-HVCGDeploymentReport -Report $Report -RepoRoot $RepoRoot
  Write-Host ""
  Write-Host "========================================" -ForegroundColor Cyan
  Write-Host " Deployment report: $reportPath"
  Write-Host " Latest markdown:   $(Join-Path $RepoRoot 'deployment/reports/HVCG-Dev-Deploy-latest.md')"
  Write-Host "========================================" -ForegroundColor Cyan
  try { Disconnect-PnPOnline -ErrorAction SilentlyContinue } catch {}
  try { Disconnect-MgGraph -ErrorAction SilentlyContinue } catch {}
}

if ($criticalFailure -or -not $Report.Success) {
  exit 1
}
exit 0
