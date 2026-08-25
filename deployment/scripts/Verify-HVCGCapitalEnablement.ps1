#Requires -Version 7.0
<#
.SYNOPSIS
  Read-only verification for Atlas Capital Hub least-privilege enablement.

.DESCRIPTION
  This script is source-controlled so fresh clones can verify the release gate
  without relying on generated deployment artifacts. It does not grant roles,
  mutate SharePoint, deploy Hub code, or set App Settings.

  BANNED ROLE: Sites.Manage.All
#>
[CmdletBinding()]
param(
  [string]$ExpectedTenantId = '3df46563-86f3-4414-87fd-84ba967741ef',
  [string]$ExpectedSubscriptionId = 'ebc84d85-b5ff-4c4b-add1-b0a8de31b319',
  [string]$HubIdentityName = 'id-atlas-prod',
  [string]$HubResourceGroup = 'rg-atlas-shared',
  [string]$HubAppId = '2b9ca61d-2396-4caa-95cd-30200d2ff36a',
  [string]$HubPrincipalId = '6fbaf3e8-1baf-4391-b832-973c8964ad7d'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$AllowedGraphAppRoles = @(
  'Sites.Selected',
  'Sites.Read.All'
)

function Assert-HVCGNoBannedGraphRole {
  param([array]$AppRoles)

  foreach ($role in @($AppRoles)) {
    $value = if ($role -is [string]) {
      $role
    } elseif ($null -ne $role -and $null -ne $role.PSObject.Properties['value']) {
      [string]$role.value
    } else {
      [string]$role
    }
    if ($value -eq 'Sites.Manage.All') {
      throw 'BANNED ROLE: Sites.Manage.All must never be granted to the Atlas Hub runtime identity.'
    }
    if ($value -like 'Sites.*' -and $AllowedGraphAppRoles -notcontains $value) {
      throw "BANNED ROLE: unexpected Graph site role '$value' on the Atlas Hub runtime identity."
    }
  }
}

$acctRaw = az account show -o json
if (-not $acctRaw) { throw 'az account show failed. Sign in with az login first.' }
$acct = $acctRaw | ConvertFrom-Json
if ($acct.tenantId -ne $ExpectedTenantId) {
  throw "Wrong tenant $($acct.tenantId). Expected $ExpectedTenantId."
}
if ($acct.id -ne $ExpectedSubscriptionId) {
  throw "Wrong subscription $($acct.id). Expected $ExpectedSubscriptionId."
}

$identity = az identity show -g $HubResourceGroup -n $HubIdentityName -o json | ConvertFrom-Json
if ($identity.clientId -ne $HubAppId) {
  throw "$HubIdentityName clientId $($identity.clientId) does not match expected $HubAppId."
}
if ($identity.principalId -ne $HubPrincipalId) {
  throw "$HubIdentityName principalId $($identity.principalId) does not match expected $HubPrincipalId."
}

$sp = az ad sp show --id $HubAppId -o json | ConvertFrom-Json
Assert-HVCGNoBannedGraphRole -AppRoles @($sp.appRoles)

Write-Host 'Atlas Capital Hub runtime identity verified read-only: Sites.Selected + Sites.Read.All only; no Sites.Manage.All.'
