#Requires -Version 7.0
# Client workspace principal resolution + mutation accounting.
# Does not connect to SharePoint by itself. Callers must pass -Apply before any executor writes.

Set-StrictMode -Version Latest

$script:HVCGCanonicalRepoRoot = '/Volumes/MacMiniPro2TB/HVCG Project Management System/.worktrees/atlas-capital-operations'
$script:HVCGForbiddenPnPIds = @(
  '2b9ca61d-2396-4caa-95cd-30200d2ff36a'  # Hub MI / id-atlas-prod — never PnP
)
$script:HVCGRoleRank = @{
  'read'           = 1
  'view'           = 1
  'restricted read' = 1
  'write'          = 2
  'contribute'     = 2
  'edit'           = 2
  'owner'          = 3
  'full control'   = 3
  'fullcontrol'    = 3
}

function New-HVCGWorkspaceMutationLog {
  [pscustomobject]@{
    LibraryCreate      = 0
    FolderCreate       = 0
    InheritanceChange  = 0
    AclWrite           = 0
    Calls              = [System.Collections.Generic.List[string]]::new()
  }
}

function Get-HVCGRepoIdentity {
  param([Parameter(Mandatory)][string]$RepoRoot, [string]$ScriptPath = '')
  $branch = ''
  $sha = ''
  try { $branch = (git -C $RepoRoot rev-parse --abbrev-ref HEAD 2>$null | Select-Object -First 1) } catch { }
  try { $sha = (git -C $RepoRoot rev-parse HEAD 2>$null | Select-Object -First 1) } catch { }
  [pscustomobject]@{
    ScriptPath     = $ScriptPath
    RepositoryRoot = $RepoRoot
    Branch         = [string]$branch
    CommitSha      = [string]$sha
  }
}

function Get-HVCGPnPClientIdFromConfigFile {
  param([Parameter(Mandatory)][string]$ConfigPath)
  if (-not (Test-Path -LiteralPath $ConfigPath)) { return $null }
  $cfg = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
  $id = [string]$cfg.authentication.pnpEntraAppClientId
  if ([string]::IsNullOrWhiteSpace($id)) { return $null }
  return $id.Trim()
}

function Test-HVCGForbiddenPnPClientId {
  param([string]$ClientId)
  if ([string]::IsNullOrWhiteSpace($ClientId)) { return $false }
  return $script:HVCGForbiddenPnPIds -contains $ClientId.Trim().ToLowerInvariant()
}

function Get-HVCGCanonicalRepoRoot {
  $fromEnv = [Environment]::GetEnvironmentVariable('HVCG_CANONICAL_REPO_ROOT')
  if (-not [string]::IsNullOrWhiteSpace($fromEnv)) { return $fromEnv.Trim() }
  return $script:HVCGCanonicalRepoRoot
}

function Test-HVCGCanonicalProvisioningTree {
  param([Parameter(Mandatory)][string]$RepoRoot)
  if ([Environment]::GetEnvironmentVariable('HVCG_ALLOW_NONCANONICAL_TREE') -eq '1') { return $true }
  $canonical = [IO.Path]::GetFullPath((Get-HVCGCanonicalRepoRoot))
  $actual = [IO.Path]::GetFullPath($RepoRoot)
  return [string]::Equals($canonical, $actual, [StringComparison]::OrdinalIgnoreCase)
}

function Convert-HVCGEntraGroupToClaimsLogin {
  param([Parameter(Mandatory)][string]$ObjectId)
  $id = $ObjectId.Trim()
  if ($id -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') {
    throw "Malformed Entra object id: $ObjectId"
  }
  return "c:0t.c|tenant|$($id.ToLowerInvariant())"
}

function Convert-HVCGUnifiedGroupToClaimsLogin {
  param([Parameter(Mandatory)][string]$ObjectId)
  $id = $ObjectId.Trim().ToLowerInvariant()
  if ($id -notmatch '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') {
    throw "Malformed unified group object id: $ObjectId"
  }
  return "c:0o.c|federateddirectoryclaimprovider|${id}_o"
}

function Test-HVCGClaimsLoginName {
  param([string]$Name)
  if ([string]::IsNullOrWhiteSpace($Name)) { return $false }
  return $Name -match '^(c:0t\.c\|tenant\|[0-9a-fA-F-]{36}|c:0o\.c\|federateddirectoryclaimprovider\|[0-9a-fA-F-]{36}_o|i:0#\.f\|membership\|.+)$'
}

function Get-HVCGRoleRank {
  param([string]$Role)
  if ([string]::IsNullOrWhiteSpace($Role)) { return 0 }
  $key = $Role.Trim().ToLowerInvariant()
  if ($script:HVCGRoleRank.ContainsKey($key)) { return [int]$script:HVCGRoleRank[$key] }
  return 0
}

function Test-HVCGRoleSufficient {
  param([string[]]$ExistingRoles, [string]$NeededRole)
  $needed = Get-HVCGRoleRank -Role $NeededRole
  if ($needed -le 0) { return $false }
  foreach ($r in @($ExistingRoles)) {
    if ((Get-HVCGRoleRank -Role $r) -ge $needed) { return $true }
  }
  return $false
}

function Resolve-HVCGSharePointPrincipal {
  <#
  .SYNOPSIS
    Resolve a display name or claims login to the principal kind used on HVCG client libraries.
    Entra security groups are NOT SharePoint site groups.
  #>
  param(
    [string]$Name,
    [scriptblock]$FindEntraGroup,
    [scriptblock]$FindSiteGroup,
    [bool]$Required = $false
  )

  $display = if ($null -eq $Name) { '' } else { $Name.Trim() }
  if ([string]::IsNullOrWhiteSpace($display)) {
    return [pscustomobject]@{
      Kind = 'Malformed'
      DisplayName = $Name
      LoginName = $null
      ObjectId = $null
      Required = $Required
      Reason = 'empty or whitespace principal name'
    }
  }

  if (Test-HVCGClaimsLoginName -Name $display) {
    return [pscustomobject]@{
      Kind = 'Claims'
      DisplayName = $display
      LoginName = $display
      ObjectId = $null
      Required = $Required
      Reason = $null
    }
  }

  if ($display -match '[<>"|]' -or $display.Length -gt 256) {
    return [pscustomobject]@{
      Kind = 'Malformed'
      DisplayName = $display
      LoginName = $null
      ObjectId = $null
      Required = $Required
      Reason = 'malformed principal name'
    }
  }

  $entra = $null
  if ($FindEntraGroup) {
    $entra = & $FindEntraGroup $display
  }
  if ($entra) {
    $oid = [string]($entra.id)
    $types = @($entra.groupTypes)
    $unified = $types -contains 'Unified'
    $login = if ($unified) {
      Convert-HVCGUnifiedGroupToClaimsLogin -ObjectId $oid
    } else {
      Convert-HVCGEntraGroupToClaimsLogin -ObjectId $oid
    }
    return [pscustomobject]@{
      Kind = $(if ($unified) { 'Microsoft365Group' } else { 'EntraSecurityGroup' })
      DisplayName = [string]($entra.displayName)
      LoginName = $login
      ObjectId = $oid.ToLowerInvariant()
      Required = $Required
      Reason = $null
    }
  }

  $site = $null
  if ($FindSiteGroup) {
    $site = & $FindSiteGroup $display
  }
  if ($site) {
    return [pscustomobject]@{
      Kind = 'SharePointSiteGroup'
      DisplayName = $display
      LoginName = $display
      ObjectId = $null
      Required = $Required
      Reason = $null
    }
  }

  return [pscustomobject]@{
    Kind = 'Missing'
    DisplayName = $display
    LoginName = $null
    ObjectId = $null
    Required = $Required
    Reason = 'principal not found as Entra group or SharePoint site group'
  }
}

function Resolve-HVCGExistingGrantAction {
  param(
    [string[]]$ExistingRoles,
    [string]$NeededRole
  )
  if ($null -eq $ExistingRoles -or $ExistingRoles.Count -eq 0) {
    return 'Grant'
  }
  if (Test-HVCGRoleSufficient -ExistingRoles $ExistingRoles -NeededRole $NeededRole) {
    return 'AlreadyGranted'
  }
  return 'Upgrade'
}

function Invoke-HVCGClientWorkspaceRepair {
  <#
  .SYNOPSIS
    Idempotent library/folder/ACL repair. Zero writes unless -Apply.
  #>
  param(
    [switch]$Apply,
    $Executor,
    [string]$LibraryTitle,
    [string[]]$Folders,
    [object[]]$Principals,
    [string]$NeededRole = 'Contribute'
  )

  $log = New-HVCGWorkspaceMutationLog
  $ready = $false
  $requiredFailures = [System.Collections.Generic.List[string]]::new()
  $optionalWarnings = [System.Collections.Generic.List[string]]::new()
  $messages = [System.Collections.Generic.List[string]]::new()

  if (-not $Apply) {
    $messages.Add('MODE: WHATIF — ZERO MUTATIONS PERMITTED') | Out-Null
    return [pscustomobject]@{
      Ready             = $false
      WhatIf            = $true
      Log               = $log
      RequiredFailures  = @()
      OptionalWarnings  = @()
      Messages          = @($messages)
    }
  }

  $messages.Add('MODE: APPLY — PRODUCTION MUTATION ENABLED') | Out-Null
  $state = $Executor.GetLibraryState.Invoke($LibraryTitle)

  if (-not $state.Exists) {
    $Executor.CreateLibrary.Invoke($LibraryTitle) | Out-Null
    $log.LibraryCreate++
    $log.Calls.Add("New-PnPList:$LibraryTitle") | Out-Null
    $messages.Add("Created library $LibraryTitle") | Out-Null
    $state = $Executor.GetLibraryState.Invoke($LibraryTitle)
  } else {
    $messages.Add("Library $LibraryTitle already exists — folders/permissions only.") | Out-Null
  }

  foreach ($folder in @($Folders)) {
    $exists = $Executor.FolderExists.Invoke($LibraryTitle, $folder)
    if (-not $exists) {
      $Executor.CreateFolder.Invoke($LibraryTitle, $folder) | Out-Null
      $log.FolderCreate++
      $log.Calls.Add("Resolve-PnPFolder:$LibraryTitle/$folder") | Out-Null
    }
  }

  if (-not $state.HasUniqueRoleAssignments) {
    $Executor.BreakInheritance.Invoke($LibraryTitle) | Out-Null
    $log.InheritanceChange++
    $log.Calls.Add("BreakRoleInheritance:$LibraryTitle") | Out-Null
  }

  foreach ($principal in @($Principals)) {
    if ($principal.Kind -eq 'Malformed') {
      if ($principal.Required) {
        $requiredFailures.Add("REQUIRED SECURITY FAILURE: malformed principal '$($principal.DisplayName)'") | Out-Null
      } else {
        $optionalWarnings.Add("OPTIONAL WARNING: malformed principal '$($principal.DisplayName)' skipped") | Out-Null
      }
      continue
    }
    if ($principal.Kind -eq 'Missing') {
      if ($principal.Required) {
        $requiredFailures.Add("REQUIRED SECURITY FAILURE: missing principal '$($principal.DisplayName)'") | Out-Null
      } else {
        $optionalWarnings.Add("OPTIONAL WARNING: $($principal.DisplayName) not found (Entra or site group) — skipped") | Out-Null
      }
      continue
    }

    $existing = @($Executor.GetPrincipalRoles.Invoke($LibraryTitle, $principal))
    $action = Resolve-HVCGExistingGrantAction -ExistingRoles $existing -NeededRole $NeededRole
    if ($action -eq 'AlreadyGranted') {
      $messages.Add("ACL already sufficient for $($principal.DisplayName) ($($principal.Kind))") | Out-Null
      continue
    }

    try {
      $Executor.GrantPrincipal.Invoke($LibraryTitle, $principal, $NeededRole) | Out-Null
      $log.AclWrite++
      $log.Calls.Add("Set-PnPListPermission:$($principal.LoginName)") | Out-Null
      $messages.Add("Granted $NeededRole to $($principal.DisplayName) as $($principal.Kind)") | Out-Null
    } catch {
      $msg = "Could not grant $($principal.DisplayName) on $LibraryTitle : $_"
      if ($principal.Required) {
        $requiredFailures.Add("REQUIRED SECURITY FAILURE: $msg") | Out-Null
      } else {
        $optionalWarnings.Add("OPTIONAL WARNING: $msg") | Out-Null
      }
    }
  }

  $ready = ($requiredFailures.Count -eq 0)
  if ($ready) {
    $messages.Add("Client workspace ready: $LibraryTitle") | Out-Null
  } else {
    $messages.Add('Client workspace NOT ready — required ACL/principal failure (fail closed).') | Out-Null
  }

  return [pscustomobject]@{
    Ready            = $ready
    WhatIf           = $false
    Log              = $log
    RequiredFailures = @($requiredFailures)
    OptionalWarnings = @($optionalWarnings)
    Messages         = @($messages)
  }
}

function New-HVCGInMemoryWorkspaceExecutor {
  param(
    [hashtable]$Libraries = @{},
    [scriptblock]$GrantOverride
  )
  $state = $Libraries
  $self = [ordered]@{}
  $self.GetLibraryState = {
    param($Title)
    if (-not $state.ContainsKey($Title)) {
      return [pscustomobject]@{ Exists = $false; HasUniqueRoleAssignments = $false; Folders = @(); Acl = @{} }
    }
    return $state[$Title]
  }.GetNewClosure()
  $self.CreateLibrary = {
    param($Title)
    $state[$Title] = [pscustomobject]@{
      Exists = $true
      HasUniqueRoleAssignments = $false
      Folders = [System.Collections.Generic.List[string]]::new()
      Acl = @{}
    }
  }.GetNewClosure()
  $self.FolderExists = {
    param($Title, $Folder)
    if (-not $state.ContainsKey($Title)) { return $false }
    return @($state[$Title].Folders) -contains $Folder
  }.GetNewClosure()
  $self.CreateFolder = {
    param($Title, $Folder)
    if (-not $state.ContainsKey($Title)) { throw "library missing: $Title" }
    if (@($state[$Title].Folders) -notcontains $Folder) {
      $state[$Title].Folders.Add($Folder) | Out-Null
    }
  }.GetNewClosure()
  $self.BreakInheritance = {
    param($Title)
    $state[$Title].HasUniqueRoleAssignments = $true
    $state[$Title].Acl = @{}
  }.GetNewClosure()
  $self.GetPrincipalRoles = {
    param($Title, $Principal)
    if (-not $state.ContainsKey($Title)) { return @() }
    $key = [string]$Principal.LoginName
    if ($state[$Title].Acl.ContainsKey($key)) { return @($state[$Title].Acl[$key]) }
    return @()
  }.GetNewClosure()
  $self.GrantPrincipal = {
    param($Title, $Principal, $Role)
    if ($GrantOverride) { return & $GrantOverride $Title $Principal $Role }
    $state[$Title].Acl[[string]$Principal.LoginName] = @($Role)
  }.GetNewClosure()
  return [pscustomobject]$self
}

Export-ModuleMember -Function @(
  'New-HVCGWorkspaceMutationLog',
  'Get-HVCGRepoIdentity',
  'Get-HVCGPnPClientIdFromConfigFile',
  'Test-HVCGForbiddenPnPClientId',
  'Get-HVCGCanonicalRepoRoot',
  'Test-HVCGCanonicalProvisioningTree',
  'Convert-HVCGEntraGroupToClaimsLogin',
  'Convert-HVCGUnifiedGroupToClaimsLogin',
  'Test-HVCGClaimsLoginName',
  'Get-HVCGRoleRank',
  'Test-HVCGRoleSufficient',
  'Resolve-HVCGSharePointPrincipal',
  'Resolve-HVCGExistingGrantAction',
  'Invoke-HVCGClientWorkspaceRepair',
  'New-HVCGInMemoryWorkspaceExecutor'
)
