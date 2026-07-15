#Requires -Version 7.0
<#
.SYNOPSIS
  Registers an Entra ID application for PnP.PowerShell interactive authentication.

.DESCRIPTION
  PnP.PowerShell 3.x requires Connect-PnPOnline -Interactive -ClientId <your-app-id>.
  This script creates that app (SharePoint + Graph delegated permissions for HVCG deploy)
  and can write the Client ID into your local environment JSON.

.EXAMPLE
  pwsh -File ./deployment/scripts/Register-HVCGPnPEntraApp.ps1 -UpdateConfig

.EXAMPLE
  pwsh -File ./deployment/scripts/Register-HVCGPnPEntraApp.ps1 -Tenant highvaluecapitalgroup.onmicrosoft.com -DeviceLogin
#>
[CmdletBinding()]
param(
  [string]$ApplicationName = 'HVCG-PnP-PowerShell',
  [string]$Tenant = '',
  [ValidateSet('development', 'test', 'production')]
  [string]$Environment = 'development',
  [string]$RepoRoot = '',
  [switch]$DeviceLogin,
  [switch]$UpdateConfig,
  [switch]$SkipPermissionDefaults
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (-not $RepoRoot) {
  $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
}

Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.Deployment.psm1') -Force
$Report = New-HVCGDeploymentReport -Environment "pnp-register-$Environment" -RepoRoot $RepoRoot
Install-HVCGModules -Report $Report | Out-Null

$configPath = Join-Path $RepoRoot "config/environments/$Environment.json"
$config = $null
if (Test-Path $configPath) {
  $config = Get-Content $configPath -Raw | ConvertFrom-Json
}

function Resolve-HVCGEntraTenantDomain {
  param($Config, [string]$ExplicitTenant)
  if (-not [string]::IsNullOrWhiteSpace($ExplicitTenant)) { return $ExplicitTenant.Trim() }

  # Prefer Graph initial .onmicrosoft.com domain (what PnP registration expects)
  try {
    Write-HVCGLog -Level STEP -Message 'Resolving initial .onmicrosoft.com domain via Microsoft Graph...' -Report $Report
    Connect-MgGraph -Scopes @('Organization.Read.All', 'Directory.Read.All') -NoWelcome | Out-Null
    $org = Get-MgOrganization | Select-Object -First 1
    $initial = @($org.VerifiedDomains) | Where-Object { $_.IsInitial -eq $true } | Select-Object -First 1
    if ($initial -and $initial.Name) { return [string]$initial.Name }
    $onmicrosoft = @($org.VerifiedDomains) | Where-Object { $_.Name -like '*.onmicrosoft.com' } | Select-Object -First 1
    if ($onmicrosoft -and $onmicrosoft.Name) { return [string]$onmicrosoft.Name }
  }
  catch {
    Write-HVCGLog -Level WARN -Message "Graph tenant-domain resolve failed: $($_.Exception.Message)" -Report $Report
  }

  if ($null -ne $Config -and $Config.tenant.domain -match '\.onmicrosoft\.com$') {
    return [string]$Config.tenant.domain
  }

  # Last resort: SharePoint hostname often matches the onmicrosoft prefix (not always)
  if ($null -ne $Config -and $Config.tenant.sharePointRoot -match 'https://([^.]+)\.sharepoint\.com') {
    $hint = "$($Matches[1]).onmicrosoft.com"
    Write-HVCGLog -Level WARN -Message "Using SharePoint host hint as tenant domain: $hint (override with -Tenant if wrong)" -Report $Report
    return $hint
  }

  throw 'Cannot resolve Entra tenant domain. Pass -Tenant yourtenant.onmicrosoft.com'
}

$Tenant = Resolve-HVCGEntraTenantDomain -Config $config -ExplicitTenant $Tenant

# SharePoint *delegated* scopes use AllSites.* names (not Graph Sites.*.All).
# ValidateSet for SharePointDelegatePermissions: AllSites.FullControl, AllSites.Manage, …
$spDelegate = @(
  'AllSites.FullControl',
  'User.Read.All'
)
# Microsoft Graph *delegated* scopes (Sites.FullControl.All is valid here, not under SharePointDelegatePermissions).
$graphDelegate = @(
  'User.Read',
  'Group.ReadWrite.All',
  'Directory.Read.All',
  'Sites.FullControl.All'
)

Write-Host ""
Write-Host "HVCG PnP Entra app registration" -ForegroundColor Cyan
Write-Host "  ApplicationName : $ApplicationName"
Write-Host "  Tenant          : $Tenant"
Write-Host "  Environment     : $Environment"
Write-Host "  UpdateConfig    : $UpdateConfig"
Write-Host "Sign in / device-login when prompted, then grant admin consent." -ForegroundColor Yellow
Write-Host ""

if (-not (Get-Command Register-PnPEntraIDAppForInteractiveLogin -ErrorAction SilentlyContinue)) {
  throw 'Register-PnPEntraIDAppForInteractiveLogin not found. Update PnP.PowerShell to 2.12+ / 3.x.'
}

$regParams = @{
  ApplicationName = $ApplicationName
  Tenant          = $Tenant
}
if ($DeviceLogin) { $regParams.DeviceLogin = $true }
if (-not $SkipPermissionDefaults) {
  $regParams.SharePointDelegatePermissions = $spDelegate
  $regParams.GraphDelegatePermissions = $graphDelegate
}

$result = Register-PnPEntraIDAppForInteractiveLogin @regParams

$clientId = $null
if ($result -is [string] -and $result -match '^[0-9a-fA-F-]{36}$') {
  $clientId = $result
}
elseif ($null -ne $result) {
  foreach ($prop in @('ClientId', 'AppId', 'ApplicationId', 'Id', 'AzureAppId')) {
    if ($result.PSObject.Properties[$prop] -and $result.$prop) {
      $candidate = [string]$result.$prop
      if ($candidate -match '^[0-9a-fA-F-]{36}$') { $clientId = $candidate; break }
      if (-not $clientId) { $clientId = $candidate }
    }
  }
  # Some builds return the GUID via ToString()
  if (-not $clientId) {
    $asText = [string]$result
    if ($asText -match '([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})') {
      $clientId = $Matches[1]
    }
  }
}

if (-not $clientId) {
  Write-Host "Registration cmdlet returned no clear Client ID. Full result:" -ForegroundColor Yellow
  if ($result) { $result | Format-List * | Out-String | Write-Host }
  Write-Host "Look up: Entra admin center → App registrations → $ApplicationName → Application (client) ID" -ForegroundColor Yellow
  exit 2
}

Write-Host ""
Write-Host "Application (client) ID: $clientId" -ForegroundColor Green

if ($UpdateConfig) {
  if (-not (Test-Path $configPath)) {
    $example = Join-Path $RepoRoot "config/environments/$Environment.example.json"
    if (-not (Test-Path $example)) { throw "Missing $configPath and example $example" }
    Copy-Item $example $configPath
    $config = Get-Content $configPath -Raw | ConvertFrom-Json
  }
  Set-HVCGPnPClientIdInConfig -ConfigPath $configPath -ClientId $clientId -DisplayName $ApplicationName -Report $Report
  Write-Host "Wrote authentication.pnpEntraAppClientId → $configPath" -ForegroundColor Green
}
else {
  Write-Host ""
  Write-Host "Next (or re-run with -UpdateConfig):" -ForegroundColor Cyan
  Write-Host @"
In $configPath set:

  "authentication": {
    "pnpEntraAppClientId": "$clientId",
    "pnpEntraAppDisplayName": "$ApplicationName"
  }
"@
}

Write-Host ""
Write-Host "Then deploy:" -ForegroundColor Cyan
Write-Host "  pwsh -File ./deployment/Deploy-HVCGDevelopment.ps1"
Save-HVCGDeploymentReport -Report $Report -RepoRoot $RepoRoot | Out-Null
