# HVCG Capital list-permission grant parser.
# Safe under Set-StrictMode. Does not print secrets.
# Runtime Hub app id is compared as a Graph application identity only.

Set-StrictMode -Version Latest

$script:HVCGKnownIdentitySetKeys = @(
  'application',
  'device',
  'user',
  'group',
  'siteUser',
  'siteGroup',
  'sharePointGroup',
  'servicePrincipal'
)

function Get-HVCGNoteProperty {
  param($Object, [string]$Name)
  if ($null -eq $Object) { return $null }
  if ($Object -is [System.Collections.IDictionary]) {
    if ($Object.Contains($Name)) { return $Object[$Name] }
    foreach ($key in @($Object.Keys)) {
      if ([string]$key -eq $Name) { return $Object[$key] }
    }
    return $null
  }
  $prop = $Object.PSObject.Properties[$Name]
  if ($prop) { return $prop.Value }
  return $null
}

function Get-HVCGPropertyNames {
  param($Object)
  $names = [System.Collections.Generic.List[string]]::new()
  if ($null -eq $Object) { return $names }
  if ($Object -is [System.Collections.IDictionary]) {
    foreach ($key in @($Object.Keys)) { $names.Add([string]$key) | Out-Null }
    return , $names
  }
  foreach ($name in @($Object.PSObject.Properties.Name)) {
    $names.Add([string]$name) | Out-Null
  }
  return , $names
}

function Test-HVCGKnownIdentitySet {
  param($Identity)
  if ($null -eq $Identity) { return $true }
  if ($Identity -is [string] -or $Identity -is [ValueType]) { return $false }
  $names = Get-HVCGPropertyNames -Object $Identity
  if ($names.Count -eq 0) { return $true }
  foreach ($name in $names) {
    if ($script:HVCGKnownIdentitySetKeys -notcontains $name) { return $false }
  }
  return $true
}

function Get-HVCGApplicationIdsFromIdentitySet {
  param($Identity)
  $ids = [System.Collections.Generic.List[string]]::new()
  if ($null -eq $Identity) { return , $ids }
  $app = Get-HVCGNoteProperty -Object $Identity -Name 'application'
  $id = Get-HVCGNoteProperty -Object $app -Name 'id'
  if ($id) { $ids.Add([string]$id) | Out-Null }
  $sp = Get-HVCGNoteProperty -Object $Identity -Name 'servicePrincipal'
  $spId = Get-HVCGNoteProperty -Object $sp -Name 'id'
  if ($spId) { $ids.Add([string]$spId) | Out-Null }
  $appId = Get-HVCGNoteProperty -Object $sp -Name 'appId'
  if ($appId) { $ids.Add([string]$appId) | Out-Null }
  return , $ids
}

function Convert-HVCGListPermission {
  <#
  .SYNOPSIS
    Normalize one Graph list permission into application IDs + roles, or UNKNOWN.
  #>
  param($Permission)

  $empty = [pscustomobject]@{
    Interpretable = $false
    ApplicationIds = @()
    Roles = @()
    Diagnostic = 'permission object was null'
  }
  if ($null -eq $Permission) { return $empty }

  $rolesRaw = Get-HVCGNoteProperty -Object $Permission -Name 'roles'
  $roles = @()
  if ($null -ne $rolesRaw) { $roles = @($rolesRaw | ForEach-Object { [string]$_ }) }

  $identityBags = [System.Collections.Generic.List[object]]::new()
  foreach ($name in @('grantedToV2', 'grantedTo')) {
    $bag = Get-HVCGNoteProperty -Object $Permission -Name $name
    if ($null -ne $bag) { $identityBags.Add($bag) | Out-Null }
  }
  foreach ($name in @('grantedToIdentitiesV2', 'grantedToIdentities')) {
    $arr = Get-HVCGNoteProperty -Object $Permission -Name $name
    if ($null -eq $arr) { continue }
    foreach ($item in @($arr)) {
      if ($null -ne $item) { $identityBags.Add($item) | Out-Null }
    }
  }

  $permKeys = Get-HVCGPropertyNames -Object $Permission
  $hasIdentityField = $false
  foreach ($k in $permKeys) {
    if ($k -in @('grantedTo', 'grantedToV2', 'grantedToIdentities', 'grantedToIdentitiesV2')) {
      $hasIdentityField = $true
    }
  }
  if (-not $hasIdentityField -or $identityBags.Count -eq 0) {
    return [pscustomobject]@{
      Interpretable = $false
      ApplicationIds = @()
      Roles = $roles
      Diagnostic = "unrecognized permission keys: $($permKeys -join ',')"
    }
  }

  $ids = [System.Collections.Generic.List[string]]::new()
  foreach ($bag in $identityBags) {
    if (-not (Test-HVCGKnownIdentitySet -Identity $bag)) {
      $bagKeys = Get-HVCGPropertyNames -Object $bag
      return [pscustomobject]@{
        Interpretable = $false
        ApplicationIds = @()
        Roles = $roles
        Diagnostic = "unrecognized identity keys: $($bagKeys -join ',')"
      }
    }
    foreach ($appId in @(Get-HVCGApplicationIdsFromIdentitySet -Identity $bag)) {
      if ($appId) { $ids.Add($appId) | Out-Null }
    }
  }

  return [pscustomobject]@{
    Interpretable = $true
    ApplicationIds = @($ids | Select-Object -Unique)
    Roles = $roles
    Diagnostic = $null
  }
}

function Resolve-HVCGSelectedWriteGrant {
  <#
  .OUTPUTS
    State: EXISTS | MISSING | INSUFFICIENT | UNKNOWN
  #>
  param(
    $Permissions,
    [Parameter(Mandatory)][string]$TargetAppId
  )

  $diagnostics = [System.Collections.Generic.List[string]]::new()
  $matchedWrite = $false
  $matchedReadOnly = $false
  $unparseable = $false

  foreach ($perm in @($Permissions)) {
    $parsed = Convert-HVCGListPermission -Permission $perm
    if (-not $parsed.Interpretable) {
      $unparseable = $true
      if ($parsed.Diagnostic) { $diagnostics.Add([string]$parsed.Diagnostic) | Out-Null }
      continue
    }
    $hit = $false
    foreach ($id in @($parsed.ApplicationIds)) {
      if ([string]$id -eq $TargetAppId) { $hit = $true }
    }
    if (-not $hit) { continue }
    if ($parsed.Roles -contains 'write' -or $parsed.Roles -contains 'owner') {
      $matchedWrite = $true
    } else {
      $matchedReadOnly = $true
    }
  }

  if ($unparseable -and -not $matchedWrite) {
    return [pscustomobject]@{
      State = 'UNKNOWN'
      Diagnostic = ($diagnostics | Select-Object -Unique) -join '; '
    }
  }
  if ($matchedWrite) {
    return [pscustomobject]@{ State = 'EXISTS'; Diagnostic = $null }
  }
  if ($matchedReadOnly) {
    return [pscustomobject]@{ State = 'INSUFFICIENT'; Diagnostic = 'target application has a Selected grant without write/owner' }
  }
  return [pscustomobject]@{ State = 'MISSING'; Diagnostic = $null }
}

Export-ModuleMember -Function @(
  'Get-HVCGNoteProperty',
  'Convert-HVCGListPermission',
  'Resolve-HVCGSelectedWriteGrant'
)
