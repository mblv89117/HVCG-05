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

function Convert-HVCGAclGrantedPrincipal {
  <#
  .SYNOPSIS
    Normalize one Graph drive/list permission into readable ACL principal records.
    Read-only parser. Does not call Graph or mutate SharePoint.
  #>
  param($Permission)

  $empty = [pscustomobject]@{
    Kind            = 'Unknown'
    DisplayName     = $null
    Id              = $null
    LoginName       = $null
    Email           = $null
    Roles           = @()
    Inherited       = $false
    InheritedFrom   = $null
    Link            = $null
    PermissionId    = $null
    Diagnostic      = 'permission object was null'
  }
  if ($null -eq $Permission) { return , @($empty) }

  $rolesRaw = Get-HVCGNoteProperty -Object $Permission -Name 'roles'
  $roles = @()
  if ($null -ne $rolesRaw) { $roles = @($rolesRaw | ForEach-Object { [string]$_ }) }

  $permId = Get-HVCGNoteProperty -Object $Permission -Name 'id'
  $inheritedFrom = Get-HVCGNoteProperty -Object $Permission -Name 'inheritedFrom'
  $inherited = $null -ne $inheritedFrom
  $link = Get-HVCGNoteProperty -Object $Permission -Name 'link'

  $records = [System.Collections.Generic.List[object]]::new()

  if ($null -ne $link) {
    $records.Add([pscustomobject]@{
      Kind          = 'SharingLink'
      DisplayName   = [string](Get-HVCGNoteProperty -Object $link -Name 'scope')
      Id            = [string](Get-HVCGNoteProperty -Object $link -Name 'webUrl')
      LoginName     = $null
      Email         = $null
      Roles         = $roles
      Inherited     = $inherited
      InheritedFrom = $inheritedFrom
      Link          = $link
      PermissionId  = [string]$permId
      Diagnostic    = $null
    }) | Out-Null
  }

  $bags = [System.Collections.Generic.List[object]]::new()
  $v2 = Get-HVCGNoteProperty -Object $Permission -Name 'grantedToV2'
  $v1 = Get-HVCGNoteProperty -Object $Permission -Name 'grantedTo'
  if ($null -ne $v2) { $bags.Add($v2) | Out-Null }
  elseif ($null -ne $v1) { $bags.Add($v1) | Out-Null }
  foreach ($name in @('grantedToIdentitiesV2', 'grantedToIdentities')) {
    $arr = Get-HVCGNoteProperty -Object $Permission -Name $name
    if ($null -eq $arr) { continue }
    foreach ($item in @($arr)) {
      if ($null -ne $item) { $bags.Add($item) | Out-Null }
    }
  }

  foreach ($bag in $bags) {
    $siteGroup = Get-HVCGNoteProperty -Object $bag -Name 'siteGroup'
    $spGroup = Get-HVCGNoteProperty -Object $bag -Name 'sharePointGroup'
    $group = Get-HVCGNoteProperty -Object $bag -Name 'group'
    $user = Get-HVCGNoteProperty -Object $bag -Name 'user'
    $siteUser = Get-HVCGNoteProperty -Object $bag -Name 'siteUser'
    $app = Get-HVCGNoteProperty -Object $bag -Name 'application'
    $spn = Get-HVCGNoteProperty -Object $bag -Name 'servicePrincipal'

    if ($null -ne $siteGroup -or $null -ne $spGroup) {
      $src = if ($null -ne $siteGroup) { $siteGroup } else { $spGroup }
      $records.Add([pscustomobject]@{
        Kind          = 'SharePointSiteGroup'
        DisplayName   = [string]((Get-HVCGNoteProperty -Object $src -Name 'displayName') ?? (Get-HVCGNoteProperty -Object $src -Name 'title') ?? (Get-HVCGNoteProperty -Object $src -Name 'loginName'))
        Id            = [string]((Get-HVCGNoteProperty -Object $src -Name 'id') ?? (Get-HVCGNoteProperty -Object $src -Name 'principalId'))
        LoginName     = [string](Get-HVCGNoteProperty -Object $src -Name 'loginName')
        Email         = $null
        Roles         = $roles
        Inherited     = $inherited
        InheritedFrom = $inheritedFrom
        Link          = $link
        PermissionId  = [string]$permId
        Diagnostic    = $null
      }) | Out-Null
      continue
    }
    if ($null -ne $group) {
      $login = Get-HVCGNoteProperty -Object $siteUser -Name 'loginName'
      $records.Add([pscustomobject]@{
        Kind          = 'EntraGroup'
        DisplayName   = [string](Get-HVCGNoteProperty -Object $group -Name 'displayName')
        Id            = [string](Get-HVCGNoteProperty -Object $group -Name 'id')
        LoginName     = [string]$login
        Email         = [string](Get-HVCGNoteProperty -Object $group -Name 'email')
        Roles         = $roles
        Inherited     = $inherited
        InheritedFrom = $inheritedFrom
        Link          = $link
        PermissionId  = [string]$permId
        Diagnostic    = $null
      }) | Out-Null
      continue
    }
    if ($null -ne $app -or $null -ne $spn) {
      $src = if ($null -ne $app) { $app } else { $spn }
      $records.Add([pscustomobject]@{
        Kind          = 'Application'
        DisplayName   = [string](Get-HVCGNoteProperty -Object $src -Name 'displayName')
        Id            = [string]((Get-HVCGNoteProperty -Object $src -Name 'appId') ?? (Get-HVCGNoteProperty -Object $src -Name 'id'))
        LoginName     = $null
        Email         = $null
        Roles         = $roles
        Inherited     = $inherited
        InheritedFrom = $inheritedFrom
        Link          = $link
        PermissionId  = [string]$permId
        Diagnostic    = $null
      }) | Out-Null
      continue
    }
    if ($null -ne $user -or $null -ne $siteUser) {
      $src = if ($null -ne $user -and (Get-HVCGNoteProperty -Object $user -Name 'id')) { $user } else { if ($null -ne $siteUser) { $siteUser } else { $user } }
      $records.Add([pscustomobject]@{
        Kind          = 'User'
        DisplayName   = [string](Get-HVCGNoteProperty -Object $src -Name 'displayName')
        Id            = [string](Get-HVCGNoteProperty -Object $src -Name 'id')
        LoginName     = [string](Get-HVCGNoteProperty -Object $siteUser -Name 'loginName')
        Email         = [string]((Get-HVCGNoteProperty -Object $src -Name 'email') ?? (Get-HVCGNoteProperty -Object $src -Name 'userPrincipalName'))
        Roles         = $roles
        Inherited     = $inherited
        InheritedFrom = $inheritedFrom
        Link          = $link
        PermissionId  = [string]$permId
        Diagnostic    = $null
      }) | Out-Null
    }
  }

  if ($records.Count -eq 0) {
    $records.Add([pscustomobject]@{
      Kind          = 'Unknown'
      DisplayName   = $null
      Id            = $null
      LoginName     = $null
      Email         = $null
      Roles         = $roles
      Inherited     = $inherited
      InheritedFrom = $inheritedFrom
      Link          = $link
      PermissionId  = [string]$permId
      Diagnostic    = 'no grantedTo/link identity decoded'
    }) | Out-Null
  }

  return , @($records)
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
  'Convert-HVCGAclGrantedPrincipal',
  'Convert-HVCGListPermission',
  'Resolve-HVCGSelectedWriteGrant'
)
