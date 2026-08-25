#Requires -Version 7.0
<#
.SYNOPSIS
  Registers a single-tenant public Entra app for PnP.PowerShell interactive admin login.

.DESCRIPTION
  ADMINISTRATION / PROVISIONING TOOL ONLY.
  Not Atlas/Hub runtime. Not id-atlas-prod. No client secret. No certificate.
  Interactive Manny + MFA. Default is review (no Entra mutation).

  Capital min-slice default permissions (this script's default):
    SharePoint delegated: AllSites.Manage
    Graph delegated:      User.Read
    Application:          none

  Entra group create and Graph list-permission grants are done by Azure CLI as the
  signed-in operator, not by this app.

.EXAMPLE
  pwsh -File ./deployment/scripts/Register-HVCGPnPEntraApp.ps1
  pwsh -File ./deployment/scripts/Register-HVCGPnPEntraApp.ps1 -Apply -UpdateConfig
#>
[CmdletBinding()]
param(
  [string]$ApplicationName = 'HVCG-PnP-Capital-Provisioning',
  [string]$Tenant = 'highvaluecapitalgroup.onmicrosoft.com',
  [ValidateSet('development', 'test', 'production')]
  [string]$Environment = 'development',
  [string]$RepoRoot = '',
  [switch]$DeviceLogin,
  [switch]$UpdateConfig,
  [switch]$Apply,
  [switch]$FullOsDeploy
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (-not $RepoRoot) {
  $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
}

$ExpectedTenantId = '3df46563-86f3-4414-87fd-84ba967741ef'
$ForbiddenNames = @('id-atlas-prod', 'app-atlas-integration-hub', 'atlas-integration-hub')
$HubAppId = '2b9ca61d-2396-4caa-95cd-30200d2ff36a'

if ($ForbiddenNames -contains $ApplicationName) {
  throw "Refusing to register ApplicationName '$ApplicationName'. That identity is Hub runtime, not PnP provisioning."
}

$acctRaw = az account show -o json 2>$null
if ($acctRaw) {
  $acct = $acctRaw | ConvertFrom-Json
  if ($acct.tenantId -and $acct.tenantId -ne $ExpectedTenantId) {
    throw "Wrong tenant $($acct.tenantId). Expected HVCG Production $ExpectedTenantId."
  }
}

if ($FullOsDeploy) {
  $spDelegate = @('AllSites.FullControl', 'User.Read.All')
  $graphDelegate = @('User.Read', 'Group.ReadWrite.All', 'Directory.Read.All', 'Sites.FullControl.All')
  if ($ApplicationName -eq 'HVCG-PnP-Capital-Provisioning') {
    $ApplicationName = 'HVCG-PnP-PowerShell'
  }
  Write-Host 'WARNING: -FullOsDeploy requests tenant-wide SharePoint FullControl and Graph group/site scopes.' -ForegroundColor Yellow
  Write-Host 'Do not use that switch for Atlas Capital min-slice enablement.' -ForegroundColor Yellow
} else {
  $spDelegate = @('AllSites.Manage')
  $graphDelegate = @('User.Read')
}

Write-Host ''
Write-Host 'HVCG PnP provisioning app — REVIEW' -ForegroundColor Cyan
Write-Host "  Mode              : $(if ($Apply) { 'APPLY (creates/reuses Entra app)' } else { 'WHATIF (no Entra mutation)' })"
Write-Host "  ApplicationName   : $ApplicationName"
Write-Host '  Sign-in audience  : AzureADMyOrg (single tenant)'
Write-Host "  Tenant domain     : $Tenant"
Write-Host "  Tenant ID (pin)   : $ExpectedTenantId"
Write-Host '  Redirect URI      : http://localhost (public client / mobile+desktop)'
Write-Host '  Authentication    : Interactive (or DeviceLogin) + MFA. No secret. No certificate.'
Write-Host '  Runtime           : NOT Hub / NOT id-atlas-prod / NOT unattended'
Write-Host "  UpdateConfig      : $UpdateConfig (writes Client ID only into gitignored $Environment.json)"
Write-Host ''
Write-Host 'Delegated permissions this registration will request:'
Write-Host "  SharePoint : $($spDelegate -join ', ')"
Write-Host "  Graph      : $($graphDelegate -join ', ')"
Write-Host '  Application permissions: none'
Write-Host ''
Write-Host 'Not requested (capital min-slice does not need them on this app):'
Write-Host '  SharePoint AllSites.FullControl, User.Read.All'
Write-Host '  Graph Sites.FullControl.All, Group.ReadWrite.All, Directory.Read.All, User.Read.All'
Write-Host '  Any application (app-only) role'
Write-Host ''
Write-Host 'Why AllSites.Manage: PnP Add-PnPField/Set-PnPField need Manage Lists. AllSites.Write is item-only and cannot add columns.'
Write-Host 'Why User.Read: sign-in identity for the public client. Harmless delegated Graph scope.'
Write-Host 'List-level Selected write to id-atlas-prod and HVCG-Client-SYN01 use Azure CLI as Manny, not this app.'
Write-Host ''

if (-not $Apply) {
  Write-Host 'No Entra app was created. To register after this review:' -ForegroundColor Yellow
  Write-Host "  pwsh -File ./deployment/scripts/Register-HVCGPnPEntraApp.ps1 -Apply -UpdateConfig"
  Write-Host ''
  Write-Host 'Removal/rollback: Entra admin center → App registrations → delete this app. Then remove authentication.pnpEntraAppClientId from local config. Does not affect id-atlas-prod.'
  return
}

Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.Deployment.psm1') -Force
$Report = New-HVCGDeploymentReport -Environment "pnp-register-$Environment" -RepoRoot $RepoRoot
Install-HVCGModules -Report $Report | Out-Null

$configPath = Join-Path $RepoRoot "config/environments/$Environment.json"
$config = $null
if (Test-Path $configPath) {
  $config = Get-Content $configPath -Raw | ConvertFrom-Json
}

$existingApps = az ad app list --display-name $ApplicationName -o json | ConvertFrom-Json
$existing = @($existingApps) | Select-Object -First 1
if ($existing -and $existing.appId) {
  if ($existing.appId -eq $HubAppId) {
    throw 'Matched Hub runtime app id-atlas-prod. Aborting. Provisioning app must be a separate registration.'
  }
  $clientId = [string]$existing.appId
  Write-Host "Reusing existing app $ApplicationName Client ID $clientId (no second registration created)." -ForegroundColor Green
} else {
  if (-not (Get-Command Register-PnPEntraIDAppForInteractiveLogin -ErrorAction SilentlyContinue)) {
    throw 'Register-PnPEntraIDAppForInteractiveLogin not found. Update PnP.PowerShell to 2.12+ / 3.x.'
  }
  Write-Host 'Sign in as manny@highvaluecapitalgroup.com and grant admin consent when prompted.' -ForegroundColor Yellow
  $regParams = @{
    ApplicationName              = $ApplicationName
    Tenant                       = $Tenant
    SignInAudience               = 'AzureADMyOrg'
    SharePointDelegatePermissions = $spDelegate
    GraphDelegatePermissions     = $graphDelegate
  }
  if ($DeviceLogin) { $regParams.DeviceLogin = $true }
  $result = Register-PnPEntraIDAppForInteractiveLogin @regParams
  $clientId = $null
  if ($result -is [string] -and $result -match '^[0-9a-fA-F-]{36}$') {
    $clientId = $result
  } elseif ($null -ne $result) {
    foreach ($prop in @('ClientId', 'AppId', 'ApplicationId', 'Id', 'AzureAppId')) {
      if ($result.PSObject.Properties[$prop] -and $result.$prop) {
        $candidate = [string]$result.$prop
        if ($candidate -match '^[0-9a-fA-F-]{36}$') { $clientId = $candidate; break }
        if (-not $clientId) { $clientId = $candidate }
      }
    }
    if (-not $clientId) {
      $asText = [string]$result
      if ($asText -match '([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})') {
        $clientId = $Matches[1]
      }
    }
  }
  if (-not $clientId) {
    Write-Host 'Registration cmdlet returned no clear Client ID. Full result:' -ForegroundColor Yellow
    if ($result) { $result | Format-List * | Out-String | Write-Host }
    throw "Look up Entra → App registrations → $ApplicationName → Application (client) ID, then set authentication.pnpEntraAppClientId locally."
  }
  if ($clientId -eq $HubAppId) {
    throw 'Registration resolved to id-atlas-prod. Aborting. Do not use Hub runtime as the PnP app.'
  }
}

Write-Host ''
Write-Host "Application (client) ID: $clientId" -ForegroundColor Green
Write-Host 'No client secret or certificate was created by this script.'
Write-Host 'This app cannot authenticate unattended unless someone later adds a secret/cert in Entra — do not do that.'

if ($UpdateConfig) {
  if (-not (Test-Path $configPath)) {
    $example = Join-Path $RepoRoot "config/environments/$Environment.example.json"
    if (-not (Test-Path $example)) { throw "Missing $configPath and example $example" }
    Copy-Item $example $configPath
    $config = Get-Content $configPath -Raw | ConvertFrom-Json
  }
  Set-HVCGPnPClientIdInConfig -ConfigPath $configPath -ClientId $clientId -DisplayName $ApplicationName -Report $Report
  Write-Host "Wrote authentication.pnpEntraAppClientId (Client ID only) → $configPath" -ForegroundColor Green
  Write-Host 'That file is gitignored. No secret was written.'
} else {
  Write-Host ''
  Write-Host "In $configPath set only:"
  Write-Host @"
  "authentication": {
    "pnpEntraAppClientId": "$clientId",
    "pnpEntraAppDisplayName": "$ApplicationName"
  }
"@
}

Write-Host ''
Write-Host 'Next: rerun Capital enablement in WHATIF (no -Apply):'
Write-Host '  pwsh -File ./deployment/scripts/Enable-HVCGCapitalMinSlice.ps1'
Write-Host ''
Write-Host 'Removal/rollback: delete Entra app' $ApplicationName 'then remove pnpEntraAppClientId from local config. Hub identity id-atlas-prod is unchanged.'
Save-HVCGDeploymentReport -Report $Report -RepoRoot $RepoRoot | Out-Null
