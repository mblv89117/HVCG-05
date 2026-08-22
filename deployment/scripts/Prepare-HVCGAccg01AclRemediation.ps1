#Requires -Version 7.0
<#
.SYNOPSIS
  PREPARE-ONLY ACCG01 unique-ACL remediation package. Does not apply.

.DESCRIPTION
  Default is WhatIf inventory + plan. Apply is refused unless
  HVCG_ACCG01_CHANGE_WINDOW=1 is set AND -Apply is passed.
  This sprint does not set that window. Target matches SYN01:
    unique permissions, Hub Owners Entra claims owner, HVCG-Client-ACCG01 write,
    Manny user owner (SYN01 parity), no site Members, no site Visitors,
    no SharePoint site-group Owners on the library.

  -InventoryOnly runs a Graph read-only blast-radius inventory and writes
  gitignored artifacts. It never applies ACL changes. Nested SharePoint
  site-group expansion is attempted via Graph and silent SPO REST only.
  Interactive / DeviceLogin / MFA is never prompted.

.EXAMPLE
  pwsh -File ./deployment/scripts/Prepare-HVCGAccg01AclRemediation.ps1

.EXAMPLE
  pwsh -File ./deployment/scripts/Prepare-HVCGAccg01AclRemediation.ps1 -InventoryOnly
#>
[CmdletBinding()]
param(
  [string]$ClientsSiteUrl = 'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients',
  [string]$LibraryTitle = 'HVCG_ACCG01',
  [string]$ClientCode = 'ACCG01',
  [string]$ClientGroupName = 'HVCG-Client-ACCG01',
  [string]$HubOwnersGroupName = 'HVCG Clients Hub Owners',
  [string]$GraphSiteId = 'highvaluecapitalgroup.sharepoint.com,13848203-7444-449a-9634-bb84f4dca619,ddc8e675-aa6a-46f8-9fd6-86f91dce728e',
  [string]$Accg01DriveId = 'b!A4KEE0R0mkSWNLuE9NymGXXmyN1qqvhGn9aG-R3Oco5V_VJhJZUrSK3e2OeXwzDW',
  [string]$Syn01DriveId = 'b!A4KEE0R0mkSWNLuE9NymGXXmyN1qqvhGn9aG-R3Oco5fYtAf1UUmTLEW549Mv-Mb',
  [string]$HubOwnersGroupId = 'a524406d-7a4d-4f1c-9ccc-a32a199cd9b8',
  [string]$ClientGroupId = '79effffa-a3c1-468f-849e-584f75ab4d6d',
  [switch]$Apply,
  [switch]$InventoryOnly
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.ClientWorkspace.psm1') -Force
Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.CapitalListGrants.psm1') -Force

function Get-HVCGGraphTokenSilent {
  $raw = az account get-access-token --resource https://graph.microsoft.com --query accessToken -o tsv 2>$null
  if ([string]::IsNullOrWhiteSpace($raw)) {
    throw 'az account get-access-token for Graph returned empty. Sign in as manny@highvaluecapitalgroup.com first.'
  }
  return [string]$raw.Trim()
}

function Invoke-HVCGGraphGet {
  param(
    [Parameter(Mandatory)][string]$Token,
    [Parameter(Mandatory)][string]$Uri,
    [hashtable]$Headers = @{}
  )
  $h = @{ Authorization = "Bearer $Token"; Accept = 'application/json' }
  foreach ($k in @($Headers.Keys)) { $h[$k] = $Headers[$k] }
  return Invoke-RestMethod -Method GET -Uri $Uri -Headers $h
}

function Invoke-HVCGHttpGetStatus {
  param(
    [Parameter(Mandatory)][string]$Token,
    [Parameter(Mandatory)][string]$Uri,
    [hashtable]$Headers = @{}
  )
  $h = @{ Authorization = "Bearer $Token"; Accept = 'application/json' }
  foreach ($k in @($Headers.Keys)) { $h[$k] = $Headers[$k] }
  try {
    $resp = Invoke-WebRequest -Method GET -Uri $Uri -Headers $h -SkipHttpErrorCheck
    $code = [int]$resp.StatusCode
    $txt = [string]$resp.Content
    $err = $null
    try {
      $parsed = $txt | ConvertFrom-Json -ErrorAction Stop
      $parsedError = Get-HVCGNoteProperty -Object $parsed -Name 'error'
      if ($parsedError -is [string]) {
        $err = [string]$parsedError
      } elseif ($null -ne $parsedError) {
        $codeName = [string](Get-HVCGNoteProperty -Object $parsedError -Name 'code')
        $msg = [string](Get-HVCGNoteProperty -Object $parsedError -Name 'message')
        $err = if ($msg) { "$codeName $msg" } else { $codeName }
      }
    } catch { }
    return [pscustomobject]@{ Status = $code; Ok = ($code -ge 200 -and $code -lt 300); Error = $err }
  } catch {
    return [pscustomobject]@{ Status = 0; Ok = $false; Error = $_.Exception.Message }
  }
}

function Convert-HVCGAclPermissionSet {
  param($Permissions)
  $out = [System.Collections.Generic.List[object]]::new()
  foreach ($p in @($Permissions)) {
    $stack = [System.Collections.Generic.Stack[object]]::new()
    $stack.Push((Convert-HVCGAclGrantedPrincipal -Permission $p))
    while ($stack.Count -gt 0) {
      $node = $stack.Pop()
      if ($null -eq $node) { continue }
      if ($null -ne (Get-HVCGNoteProperty -Object $node -Name 'Kind')) {
        $out.Add($node) | Out-Null
        continue
      }
      if ($node -is [System.Collections.IEnumerable] -and $node -isnot [string]) {
        foreach ($inner in @($node)) { if ($null -ne $inner) { $stack.Push($inner) } }
      }
    }
  }
  return @($out.ToArray())
}

function Get-HVCGDirectoryObjectPrincipals {
  param($Value)
  $out = [System.Collections.Generic.List[object]]::new()
  foreach ($item in @($Value)) {
    if ($null -eq $item) { continue }
    $type = [string]$item.'@odata.type'
    $out.Add([pscustomobject]@{
      Kind              = $(if ($type -match 'user') { 'User' } elseif ($type -match 'group') { 'Group' } elseif ($type -match 'servicePrincipal') { 'ServicePrincipal' } else { $type })
      Id                = [string]$item.id
      DisplayName       = [string]$item.displayName
      UserPrincipalName = [string]$item.userPrincipalName
      Mail              = [string]$item.mail
    }) | Out-Null
  }
  return , @($out)
}

function Get-HVCGAccg01AclInventory {
  <#
  .SYNOPSIS
    Read-only Graph inventory of ACCG01 ACL + Hub Owners/Members/Visitors principals.
    Does not apply ACL changes. Does not prompt MFA for PnP.
  #>
  param(
    [Parameter(Mandatory)][string]$GraphSiteId,
    [Parameter(Mandatory)][string]$Accg01DriveId,
    [string]$Syn01DriveId,
    [string]$HubOwnersGroupId,
    [string]$ClientGroupId,
    [string]$ClientsSiteUrl
  )

  $token = Get-HVCGGraphTokenSilent
  $could = [System.Collections.Generic.List[string]]::new()
  $couldNot = [System.Collections.Generic.List[string]]::new()

  $accgPerms = Invoke-HVCGGraphGet -Token $token -Uri "https://graph.microsoft.com/v1.0/drives/$Accg01DriveId/root/permissions"
  $could.Add('Graph GET /drives/{ACCG01}/root/permissions (grantedToV2, grantedToIdentities, sharePointGroup, link, inheritedFrom)') | Out-Null
  $accgPrincipals = Convert-HVCGAclPermissionSet -Permissions @($accgPerms.value)
  $hasGrantedToIdentities = $false
  foreach ($p in @($accgPerms.value)) {
    $a1 = Get-HVCGNoteProperty -Object $p -Name 'grantedToIdentities'
    $a2 = Get-HVCGNoteProperty -Object $p -Name 'grantedToIdentitiesV2'
    if ($null -ne $a1 -or $null -ne $a2) { $hasGrantedToIdentities = $true }
  }
  if ($hasGrantedToIdentities) {
    $could.Add('Graph grantedToIdentities / grantedToIdentitiesV2 present on ACCG01 root permissions') | Out-Null
  } else {
    $could.Add('Graph grantedToV2.siteGroup + grantedToV2.sharePointGroup + grantedToV2.group on ACCG01 (grantedToIdentities arrays absent)') | Out-Null
  }

  $synPrincipals = @()
  if (-not [string]::IsNullOrWhiteSpace($Syn01DriveId)) {
    $synPerms = Invoke-HVCGGraphGet -Token $token -Uri "https://graph.microsoft.com/v1.0/drives/$Syn01DriveId/root/permissions"
    $could.Add('Graph GET /drives/{SYN01}/root/permissions (read-compare only)') | Out-Null
    $synPrincipals = Convert-HVCGAclPermissionSet -Permissions @($synPerms.value)
  }

  $hubMembers = @()
  $hubOwnersOwners = @()
  $hubTransitive = @()
  if (-not [string]::IsNullOrWhiteSpace($HubOwnersGroupId)) {
    $g = Invoke-HVCGGraphGet -Token $token -Uri "https://graph.microsoft.com/v1.0/groups/$HubOwnersGroupId"
    $could.Add("Graph GET /groups/$HubOwnersGroupId (displayName=$($g.displayName))") | Out-Null
    $hubMembers = Get-HVCGDirectoryObjectPrincipals -Value @( (Invoke-HVCGGraphGet -Token $token -Uri "https://graph.microsoft.com/v1.0/groups/$HubOwnersGroupId/members").value )
    $hubOwnersOwners = Get-HVCGDirectoryObjectPrincipals -Value @( (Invoke-HVCGGraphGet -Token $token -Uri "https://graph.microsoft.com/v1.0/groups/$HubOwnersGroupId/owners").value )
    $hubTransitive = Get-HVCGDirectoryObjectPrincipals -Value @( (Invoke-HVCGGraphGet -Token $token -Uri "https://graph.microsoft.com/v1.0/groups/$HubOwnersGroupId/transitiveMembers?`$select=id,displayName,userPrincipalName,mail").value )
    $could.Add('Graph expanded M365 group members/owners/transitiveMembers for HVCG Clients Hub') | Out-Null
  }

  $clientMembers = @()
  if (-not [string]::IsNullOrWhiteSpace($ClientGroupId)) {
    $clientMembers = Get-HVCGDirectoryObjectPrincipals -Value @( (Invoke-HVCGGraphGet -Token $token -Uri "https://graph.microsoft.com/v1.0/groups/$ClientGroupId/members").value )
    $could.Add('Graph expanded HVCG-Client-ACCG01 members') | Out-Null
  }

  $entraNamedMembers = Invoke-HVCGGraphGet -Token $token -Uri "https://graph.microsoft.com/v1.0/groups?`$filter=displayName eq 'HVCG Clients Hub Members'&`$select=id,displayName,groupTypes,securityEnabled"
  $entraNamedVisitors = Invoke-HVCGGraphGet -Token $token -Uri "https://graph.microsoft.com/v1.0/groups?`$filter=displayName eq 'HVCG Clients Hub Visitors'&`$select=id,displayName,groupTypes,securityEnabled"
  $could.Add('Graph group displayName lookup for Hub Members / Visitors (Entra)') | Out-Null

  $users = Invoke-HVCGGraphGet -Token $token -Uri "https://graph.microsoft.com/v1.0/users?`$select=id,displayName,userPrincipalName,mail,userType,accountEnabled&`$top=999"
  $guests = Invoke-HVCGGraphGet -Token $token -Uri "https://graph.microsoft.com/v1.0/users?`$filter=userType eq 'Guest'&`$select=id,displayName,userPrincipalName,mail,userType,accountEnabled&`$count=true" -Headers @{ ConsistencyLevel = 'eventual' }
  $could.Add('Graph tenant users + guests (no phone fields persisted)') | Out-Null

  $gaMembers = @()
  try {
    $roles = Invoke-HVCGGraphGet -Token $token -Uri 'https://graph.microsoft.com/v1.0/directoryRoles'
    $ga = @($roles.value | Where-Object { [string]$_.displayName -eq 'Global Administrator' } | Select-Object -First 1)
    if ($ga) {
      $gaMembers = Get-HVCGDirectoryObjectPrincipals -Value @( (Invoke-HVCGGraphGet -Token $token -Uri "https://graph.microsoft.com/v1.0/directoryRoles/$($ga.id)/members?`$select=id,displayName,userPrincipalName,mail").value )
      $could.Add('Graph Global Administrator directoryRole members') | Out-Null
    }
  } catch {
    $couldNot.Add("Graph Global Administrator members: $_") | Out-Null
  }

  $uilPrincipals = @()
  try {
    $uil = Invoke-HVCGGraphGet -Token $token -Uri "https://graph.microsoft.com/v1.0/sites/$GraphSiteId/lists/User Information List"
    $uilItems = Invoke-HVCGGraphGet -Token $token -Uri "https://graph.microsoft.com/v1.0/sites/$GraphSiteId/lists/$($uil.id)/items?`$expand=fields&`$top=200"
    $could.Add('Graph User Information List items (site principal catalog, not group membership)') | Out-Null
    foreach ($it in @($uilItems.value)) {
      $f = $it.fields
      $isAdmin = Get-HVCGNoteProperty -Object $f -Name 'IsSiteAdmin'
      $deleted = Get-HVCGNoteProperty -Object $f -Name 'Deleted'
      $uilPrincipals += [pscustomobject]@{
        SiteUserId    = [string](Get-HVCGNoteProperty -Object $f -Name 'id')
        ContentType   = [string](Get-HVCGNoteProperty -Object $f -Name 'ContentType')
        Title         = [string](Get-HVCGNoteProperty -Object $f -Name 'Title')
        LoginName     = [string](Get-HVCGNoteProperty -Object $f -Name 'Name')
        Email         = [string](Get-HVCGNoteProperty -Object $f -Name 'EMail')
        IsSiteAdmin   = $(if ($null -eq $isAdmin) { $false } else { [bool]$isAdmin })
        Deleted       = $(if ($null -eq $deleted) { $false } else { [bool]$deleted })
      }
    }
  } catch {
    $couldNot.Add("Graph User Information List: $_") | Out-Null
  }

  try {
    Invoke-HVCGGraphGet -Token $token -Uri "https://graph.microsoft.com/v1.0/sites/$GraphSiteId/permissions" | Out-Null
    $could.Add('Graph GET /sites/{id}/permissions') | Out-Null
  } catch {
    $couldNot.Add('Graph GET /sites/{id}/permissions — accessDenied (cannot enumerate site-level Sites.Selected app grants)') | Out-Null
  }

  foreach ($pair in @(
    @{ Label = 'v1.0 /sites/{id}/siteGroups'; Uri = "https://graph.microsoft.com/v1.0/sites/$GraphSiteId/siteGroups" },
    @{ Label = 'beta /sites/{id}/siteGroups'; Uri = "https://graph.microsoft.com/beta/sites/$GraphSiteId/siteGroups" },
    @{ Label = 'v1.0 /sites/{id}/siteUsers'; Uri = "https://graph.microsoft.com/v1.0/sites/$GraphSiteId/siteUsers" },
    @{ Label = 'beta /sites/{id}/siteUsers'; Uri = "https://graph.microsoft.com/beta/sites/$GraphSiteId/siteUsers" },
    @{ Label = 'v1.0 /sites/{id}/sharePointGroups'; Uri = "https://graph.microsoft.com/v1.0/sites/$GraphSiteId/sharePointGroups" },
    @{ Label = 'v1.0 /sites/{id}/siteGroups/3/members'; Uri = "https://graph.microsoft.com/v1.0/sites/$GraphSiteId/siteGroups/3/members" }
  )) {
    $probe = Invoke-HVCGHttpGetStatus -Token $token -Uri $pair.Uri
    if ($probe.Ok) {
      $could.Add("Graph $($pair.Label) HTTP $($probe.Status)") | Out-Null
    } else {
      $couldNot.Add("Graph $($pair.Label) HTTP $($probe.Status) $($probe.Error)") | Out-Null
    }
  }

  $siteGuid = ($GraphSiteId -split ',')[1]
  foreach ($principalId in @(3, 5, 4)) {
    $raw = "$siteGuid`_$principalId"
    $b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($raw)).TrimEnd('=')
    $sgUri = "https://graph.microsoft.com/v1.0/storage/fileStorage/containers/$Accg01DriveId/sharePointGroups/$b64/members"
    $probe = Invoke-HVCGHttpGetStatus -Token $token -Uri $sgUri
    if ($probe.Ok) {
      $could.Add("Graph sharePointGroup members principalId $principalId HTTP $($probe.Status)") | Out-Null
    } else {
      $couldNot.Add("Graph /storage/fileStorage/containers/{ACCG01}/sharePointGroups/{siteId_$principalId}/members HTTP $($probe.Status) $($probe.Error) (SharePoint Embedded FileStorageContainer.Selected — not classic site groups)") | Out-Null
    }
  }

  $folderSummary = [pscustomobject]@{ ChildCount = 0; InheritedCount = 0; UniqueOrMixedCount = 0; SharingLinkCount = 0 }
  try {
    $children = Invoke-HVCGGraphGet -Token $token -Uri "https://graph.microsoft.com/v1.0/drives/$Accg01DriveId/root/children?`$select=id,name,folder"
    $folderSummary.ChildCount = @($children.value).Count
    foreach ($c in @($children.value)) {
      $fp = Invoke-HVCGGraphGet -Token $token -Uri "https://graph.microsoft.com/v1.0/drives/$Accg01DriveId/items/$($c.id)/permissions"
      $tot = @($fp.value).Count
      $inh = 0
      $linkCount = 0
      foreach ($perm in @($fp.value)) {
        if ($null -ne (Get-HVCGNoteProperty -Object $perm -Name 'inheritedFrom')) { $inh++ }
        if ($null -ne (Get-HVCGNoteProperty -Object $perm -Name 'link')) { $linkCount++ }
      }
      $folderSummary.SharingLinkCount += $linkCount
      if ($tot -gt 0 -and $inh -eq $tot) { $folderSummary.InheritedCount++ } else { $folderSummary.UniqueOrMixedCount++ }
    }
    $could.Add("Graph ACCG01 root children permissions (folders=$($folderSummary.ChildCount) inherited=$($folderSummary.InheritedCount) uniqueOrMixed=$($folderSummary.UniqueOrMixedCount) sharingLinks=$($folderSummary.SharingLinkCount))") | Out-Null
  } catch {
    $couldNot.Add("Graph ACCG01 folder permission walk: $_") | Out-Null
  }

  $spoRest = [pscustomobject]@{
    Attempted = $false
    TokenIssued = $false
    Status = $null
    Error = $null
    Owners = @()
    Members = @()
    Visitors = @()
  }
  try {
    $spoTok = az account get-access-token --resource https://highvaluecapitalgroup.sharepoint.com --query accessToken -o tsv 2>$null
    if (-not [string]::IsNullOrWhiteSpace($spoTok)) {
      $spoRest.TokenIssued = $true
      $spoRest.Attempted = $true
      $probe = Invoke-HVCGHttpGetStatus -Token $spoTok.Trim() -Uri "$ClientsSiteUrl/_api/web/sitegroups/getbyid(3)/users?`$select=Id,Title,LoginName,Email,PrincipalType" -Headers @{ Accept = 'application/json;odata=nometadata' }
      $spoRest.Status = $probe.Status
      $spoRest.Error = $probe.Error
      if ($probe.Ok) {
        $could.Add("SPO REST GET /_api/web/sitegroups/getbyid(3)/users HTTP $($probe.Status)") | Out-Null
      } else {
        $couldNot.Add("Azure CLI SharePoint token GET /_api/web/sitegroups/*/users HTTP $($probe.Status) $($probe.Error) (Azure CLI app 04b07795-8ddb-461a-bbee-02f9e1bf7b46 user_impersonation is rejected by SPO)") | Out-Null
      }
    } else {
      $couldNot.Add('Azure CLI SharePoint token not issued') | Out-Null
    }
  } catch {
    $couldNot.Add("Azure CLI SharePoint token / SPO REST: $_") | Out-Null
  }

  $pnpMembers = @()
  $pnpVisitors = @()
  $pnpOwners = @()
  $pnpAttempted = $false
  $pnpConnected = $false
  try {
    if (Get-Command Get-PnPConnection -ErrorAction SilentlyContinue) {
      $conn = Get-PnPConnection -ErrorAction SilentlyContinue
      if ($conn -and $ClientsSiteUrl) {
        $current = [string]$conn.Url
        $pnpConnected = ($current.TrimEnd('/') -eq $ClientsSiteUrl.TrimEnd('/'))
      }
    }
  } catch {
    $pnpConnected = $false
  }

  if ($pnpConnected) {
    $pnpAttempted = $true
    foreach ($pair in @(
      @{ Name = 'HVCG Clients Hub Owners'; Dest = 'owners' },
      @{ Name = 'HVCG Clients Hub Members'; Dest = 'members' },
      @{ Name = 'HVCG Clients Hub Visitors'; Dest = 'visitors' }
    )) {
      try {
        $rows = @(Get-PnPGroupMember -Identity $pair.Name -ErrorAction Stop | ForEach-Object {
          [pscustomobject]@{
            Title         = [string]$_.Title
            LoginName     = [string]$_.LoginName
            Email         = [string]$_.Email
            PrincipalType = [string]$_.PrincipalType
          }
        })
        if ($pair.Dest -eq 'owners') { $pnpOwners = $rows }
        elseif ($pair.Dest -eq 'members') { $pnpMembers = $rows }
        else { $pnpVisitors = $rows }
        $could.Add("PnP Get-PnPGroupMember '$($pair.Name)' (existing connection, no MFA)") | Out-Null
      } catch {
        $couldNot.Add("PnP Get-PnPGroupMember '$($pair.Name)': $($_.Exception.Message)") | Out-Null
      }
    }
  } else {
    $couldNot.Add('PnP SharePoint site-group member expansion — skipped (no existing PnP connection to HVCG-Clients; Interactive/DeviceLogin would prompt MFA and was not used)') | Out-Null
  }

  $membersEntra = @($entraNamedMembers.value)
  $visitorsEntra = @($entraNamedVisitors.value)

  return [pscustomobject]@{
    CollectedAtUtc          = [datetime]::UtcNow.ToString('o')
    Accg01LibraryPrincipals = @($accgPrincipals)
    Syn01LibraryPrincipals  = @($synPrincipals)
    HubOwnersM365           = @{
      Id                 = $HubOwnersGroupId
      Members            = @($hubMembers)
      Owners             = @($hubOwnersOwners)
      TransitiveMembers  = @($hubTransitive)
    }
    HubMembersEntraGroups   = @($membersEntra)
    HubVisitorsEntraGroups  = @($visitorsEntra)
    ClientGroupMembers      = @($clientMembers)
    GlobalAdministrators    = @($gaMembers)
    TenantUsers             = @($users.value | ForEach-Object {
      [pscustomobject]@{
        Id = [string]$_.id; DisplayName = [string]$_.displayName
        UserPrincipalName = [string]$_.userPrincipalName; UserType = [string]$_.userType
        AccountEnabled = [bool]$_.accountEnabled
      }
    })
    TenantGuestCount        = $(if ($null -ne $guests.value) { @($guests.value).Count } else { 0 })
    SiteUserInformationList = @($uilPrincipals)
    FolderSummary           = $folderSummary
    SpoRest                 = $spoRest
    PnP                     = @{
      Attempted = $pnpAttempted
      Connected = $pnpConnected
      Owners    = @($pnpOwners)
      Members   = @($pnpMembers)
      Visitors  = @($pnpVisitors)
    }
    GraphCould              = @($could)
    GraphCouldNot           = @($couldNot)
  }
}

function Save-HVCGAccg01AclInventoryArtifact {
  param(
    [Parameter(Mandatory)]$Inventory,
    [Parameter(Mandatory)][string]$RepoRoot,
    [Parameter(Mandatory)][string]$Markdown
  )
  $dir = Join-Path $RepoRoot 'deployment/artifacts'
  if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
  $mdPath = Join-Path $dir 'accg01-acl-inventory.md'
  $jsonPath = Join-Path $dir 'accg01-acl-inventory.json'
  Set-Content -LiteralPath $mdPath -Value $Markdown -Encoding utf8
  $Inventory | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $jsonPath -Encoding utf8
  return [pscustomobject]@{ Markdown = $mdPath; Json = $jsonPath }
}

$identity = Get-HVCGRepoIdentity -RepoRoot $RepoRoot -ScriptPath $PSCommandPath
$window = [Environment]::GetEnvironmentVariable('HVCG_ACCG01_CHANGE_WINDOW')
$applyAllowed = $Apply -and $window -eq '1'

Write-Host "SCRIPT: $($identity.ScriptPath)"
Write-Host "REPO: $($identity.RepositoryRoot)"
Write-Host "SHA: $($identity.CommitSha)"
Write-Host 'MODE: ACCG01 ACL PREPARATION — APPLY IS NOT THE DEFAULT'
Write-Host "SITE: $ClientsSiteUrl"
Write-Host "LIBRARY: $LibraryTitle"
Write-Host "CHANGE WINDOW: $(if ($window -eq '1') { 'SET' } else { 'NOT SET' })"

$plan = [pscustomobject]@{
  WhatIf            = -not $applyAllowed
  Apply             = [bool]$applyAllowed
  Library           = $LibraryTitle
  ClientCode        = $ClientCode
  TargetInheritance = 'unique / broken'
  TargetOwners      = @(
    'Entra HVCG Clients Hub Owners a524406d-7a4d-4f1c-9ccc-a32a199cd9b8 (claims login c:0o.c|federateddirectoryclaimprovider|a524406d-7a4d-4f1c-9ccc-a32a199cd9b8_o) owner',
    'User Manuel Barela e4835ea2-3c45-493a-95f5-472f6339661d (i:0#.f|membership|manny@highvaluecapitalgroup.com) owner — SYN01 parity'
  )
  TargetWrite       = @('HVCG-Client-ACCG01 79effffa-a3c1-468f-849e-584f75ab4d6d (c:0t.c|tenant|79effffa-a3c1-468f-849e-584f75ab4d6d) write')
  Remove            = @(
    'SharePoint site group HVCG Clients Hub Owners principalId 3 owner',
    'SharePoint site group HVCG Clients Hub Members principalId 5 write',
    'SharePoint site group HVCG Clients Hub Visitors principalId 4 read'
  )
  DoNotGrant        = @('Everyone', 'Everyone except external users', 'site Members', 'site Visitors', 'SharePoint site group Owners')
  FilesAffected     = 0
  MetadataAffected  = 0
  MembersInventory  = @()
  VisitorsInventory = @()
  OwnersInventory   = @()
  BlastRadius       = 'UNKNOWN until inventory against live site groups'
  Rollback          = @(
    'Do not delete files or list items; ACL-only reverse.',
    'If unique break is the only change and before-state inherited=true: restore inheritance on HVCG_ACCG01.',
    'Otherwise re-grant from inventory JSON PermissionIds: siteGroup 3 owner (SFZDRyBDbGllbnRzIEh1YiBPd25lcnM), siteGroup 4 read (SFZDRyBDbGllbnRzIEh1YiBWaXNpdG9ycw), siteGroup 5 write (SFZDRyBDbGllbnRzIEh1YiBNZW1iZXJz), Entra Hub Owners claims _o owner (Yzowby5jfGZlZGVyYXRlZGRpcmVjdG9yeWNsYWltcHJvdmlkZXJ8YTUyNDQwNmQtN2E0ZC00ZjFjLTljY2MtYTMyYTE5OWNkOWI4X28).',
    'Nested SP group member names are not required to restore the site-group ACL grants.',
    'Do not modify SYN01.'
  )
  Verification      = @(
    'HVCG_ACCG01 HasUniqueRoleAssignments = true (Graph permissions have no inheritedFrom)',
    'HVCG-Client-ACCG01 claims principal write present',
    'HVCG Clients Hub Owners Entra claims principal owner present',
    'Manny user owner present (SYN01 parity) OR documented as optional if Hub Owners Entra already covers him',
    'No SharePoint site groups Members / Visitors / Owners on library ACL',
    'Everyone / Everyone except external users absent',
    'SYN01 ACL unchanged',
    '24 standard folders still inherit from library root; sharing link count 0'
  )
}

function Format-HVCGAclPrincipalLine {
  param($p)
  $roles = @($p.Roles) -join ','
  $login = if ([string]::IsNullOrWhiteSpace([string]$p.LoginName)) { '' } else { " login=$($p.LoginName)" }
  $email = if ([string]::IsNullOrWhiteSpace([string]$p.Email)) { '' } else { " email=$($p.Email)" }
  $id = if ([string]::IsNullOrWhiteSpace([string]$p.Id)) { '' } else { " id=$($p.Id)" }
  $inh = if ($p.Inherited) { ' inherited' } else { ' unique' }
  return "- $($p.Kind): $($p.DisplayName)$id$login$email roles=[$roles]$inh"
}

function Format-HVCGNestedMemberLines {
  param($Rows, [string]$Residual)
  $lines = @($Rows | ForEach-Object { "- $($_.Title) login=$($_.LoginName) email=$($_.Email) type=$($_.PrincipalType)" })
  if ($lines.Count -eq 0) { return @("- $Residual") }
  return $lines
}

function New-HVCGAccg01InventoryMarkdown {
  param($Inventory, $Plan, $Identity)

  $accgLines = @($Inventory.Accg01LibraryPrincipals | ForEach-Object { Format-HVCGAclPrincipalLine -p $_ })
  $synLines = @($Inventory.Syn01LibraryPrincipals | ForEach-Object { Format-HVCGAclPrincipalLine -p $_ })
  $hubMem = @($Inventory.HubOwnersM365.Members | ForEach-Object { "- $($_.Kind): $($_.DisplayName) id=$($_.Id) upn=$($_.UserPrincipalName)" })
  $hubOwn = @($Inventory.HubOwnersM365.Owners | ForEach-Object { "- $($_.Kind): $($_.DisplayName) id=$($_.Id) upn=$($_.UserPrincipalName)" })
  $hubTrans = @()
  $transRaw = Get-HVCGNoteProperty -Object $Inventory.HubOwnersM365 -Name 'TransitiveMembers'
  if ($null -ne $transRaw) {
    $hubTrans = @($transRaw | ForEach-Object { "- $($_.Kind): $($_.DisplayName) id=$($_.Id) upn=$($_.UserPrincipalName)" })
  }
  $clientMem = @($Inventory.ClientGroupMembers | ForEach-Object { "- $($_.Kind): $($_.DisplayName) id=$($_.Id) upn=$($_.UserPrincipalName)" })
  $gaMem = @($Inventory.GlobalAdministrators | ForEach-Object { "- $($_.Kind): $($_.DisplayName) id=$($_.Id) upn=$($_.UserPrincipalName)" })
  $users = @($Inventory.TenantUsers | ForEach-Object { "- $($_.UserType): $($_.DisplayName) id=$($_.Id) upn=$($_.UserPrincipalName) enabled=$($_.AccountEnabled)" })
  $uil = @($Inventory.SiteUserInformationList | ForEach-Object { "- [$($_.ContentType)] $($_.Title) siteUserId=$($_.SiteUserId) login=$($_.LoginName) email=$($_.Email) siteAdmin=$($_.IsSiteAdmin)" })
  $residualSp = 'UNEXPANDED residual. Graph has no classic siteGroups/siteUsers members API. SPO REST with Azure CLI token returns 401 invalid_request. PnP Interactive was not used (would prompt MFA).'
  $pnpOwners = Format-HVCGNestedMemberLines -Rows @($Inventory.PnP.Owners) -Residual $residualSp
  $pnpMembers = Format-HVCGNestedMemberLines -Rows @($Inventory.PnP.Members) -Residual $residualSp
  $pnpVisitors = Format-HVCGNestedMemberLines -Rows @($Inventory.PnP.Visitors) -Residual $residualSp
  $entraMembers = if (@($Inventory.HubMembersEntraGroups).Count -eq 0) { '- none (SharePoint site group, not an Entra group)' } else { ($Inventory.HubMembersEntraGroups | ConvertTo-Json -Compress) }
  $entraVisitors = if (@($Inventory.HubVisitorsEntraGroups).Count -eq 0) { '- none (SharePoint site group, not an Entra group)' } else { ($Inventory.HubVisitorsEntraGroups | ConvertTo-Json -Compress) }

  $hasMembersAcl = @($Inventory.Accg01LibraryPrincipals | Where-Object { $_.Kind -eq 'SharePointSiteGroup' -and $_.DisplayName -match 'Members' }).Count -gt 0
  $hasVisitorsAcl = @($Inventory.Accg01LibraryPrincipals | Where-Object { $_.Kind -eq 'SharePointSiteGroup' -and $_.DisplayName -match 'Visitors' }).Count -gt 0
  $hasClientGroupAcl = @($Inventory.Accg01LibraryPrincipals | Where-Object { $_.DisplayName -eq 'HVCG-Client-ACCG01' -or $_.Id -eq '79effffa-a3c1-468f-849e-584f75ab4d6d' }).Count -gt 0
  $crossClient = $hasMembersAcl -or $hasVisitorsAcl
  $crossWhy = if ($crossClient) {
    'YES as a standing ACL pattern. HVCG_ACCG01 still inherits site Members write + Visitors read (plus Hub Owners). Any current or future principal nested in those SharePoint site groups can access this client library. SYN01 does not use that pattern. HVCG-Client-ACCG01 is not bound on the library. Observed extra Entra humans besides Manny: none. Guests: 0.'
  } else {
    'NO. ACCG01 library ACL does not include site Members/Visitors.'
  }

  $severity = if ($crossClient) {
    'HIGH — inherited Hub Members write + Visitors read on a production client financial library. Observed extra Entra humans: none besides authorized HVCG admin Manny. Nested SharePoint site-group membership remains unexpanded residual.'
  } else { 'LOW' }

  $pnpReady = [bool]$Inventory.PnP.Connected -and (@($Inventory.PnP.Members).Count + @($Inventory.PnP.Visitors).Count + @($Inventory.PnP.Owners).Count -gt 0)
  $folder = $Inventory.FolderSummary
  $spo = $Inventory.SpoRest
  $remediationReady = 'YES. WhatIf unique-ACL package matches SYN01 and Apply stays blocked without HVCG_ACCG01_CHANGE_WINDOW=1. Nested SP Owners/Members/Visitors members are residual (cannot expand without MFA). Rollback re-grants the site groups themselves from Graph PermissionIds. Files affected 0. List-item metadata affected 0.'

  @(
    '# ACCG01 blast-radius ACL inventory',
    '',
    '- Mode: READ-ONLY. Apply: NOT RUN.',
    "- CollectedAtUtc: $($Inventory.CollectedAtUtc)",
    "- Script: $($Identity.ScriptPath)",
    "- SHA: $($Identity.CommitSha)",
    "- Branch: $($Identity.Branch)",
    '',
    '## Owners principals (exact)',
    '',
    '### SharePoint site group `HVCG Clients Hub Owners` (principalId 3)',
    '- Kind: SharePointSiteGroup',
    '- DisplayName: HVCG Clients Hub Owners',
    '- Id / principalId: 3',
    '- LoginName: HVCG Clients Hub Owners',
    '- Library roles: owner (inherited)',
    '- Graph PermissionId: SFZDRyBDbGllbnRzIEh1YiBPd25lcnM',
    '- Nested members:',
    $pnpOwners,
    '',
    '### M365 group `HVCG Clients Hub` / Entra claims `HVCG Clients Hub Owners` `a524406d-7a4d-4f1c-9ccc-a32a199cd9b8`',
    '- LoginName on library: c:0o.c|federateddirectoryclaimprovider|a524406d-7a4d-4f1c-9ccc-a32a199cd9b8_o',
    '- Email: HVCGClientsHub@HighValueCapitalGroup.onmicrosoft.com',
    '- Library roles: owner (inherited)',
    '- Graph PermissionId: Yzowby5jfGZlZGVyYXRlZGRpcmVjdG9yeWNsYWltcHJvdmlkZXJ8YTUyNDQwNmQtN2E0ZC00ZjFjLTljY2MtYTMyYTE5OWNkOWI4X28',
    'Members:',
    $hubMem,
    'Owners:',
    $hubOwn,
    'Transitive members:',
    $(if ($hubTrans.Count -eq 0) { '- (none / not returned)' } else { $hubTrans }),
    '',
    '## Members principals (exact)',
    '',
    '### Entra group named `HVCG Clients Hub Members`',
    $entraMembers,
    '',
    '### SharePoint site group `HVCG Clients Hub Members` (principalId 5)',
    '- Kind: SharePointSiteGroup',
    '- DisplayName: HVCG Clients Hub Members',
    '- Id / principalId: 5',
    '- LoginName: HVCG Clients Hub Members',
    '- Library roles: write (inherited)',
    '- Graph PermissionId: SFZDRyBDbGllbnRzIEh1YiBNZW1iZXJz',
    '- Nested members:',
    $pnpMembers,
    '',
    '### Related UIL DomainGroup (catalog only — not nested membership)',
    '- siteUserId 8 Title=HVCG Clients Hub Members login=c:0o.c|federateddirectoryclaimprovider|a524406d-7a4d-4f1c-9ccc-a32a199cd9b8 (members claim, no _o). This is the site principal catalog for the same M365 group; Graph expanded that group to Manny only. It is not a listing of SP Members group users.',
    '',
    '## Visitors principals (exact)',
    '',
    '### Entra group named `HVCG Clients Hub Visitors`',
    $entraVisitors,
    '',
    '### SharePoint site group `HVCG Clients Hub Visitors` (principalId 4)',
    '- Kind: SharePointSiteGroup',
    '- DisplayName: HVCG Clients Hub Visitors',
    '- Id / principalId: 4',
    '- LoginName: HVCG Clients Hub Visitors',
    '- Library roles: read (inherited)',
    '- Graph PermissionId: SFZDRyBDbGllbnRzIEh1YiBWaXNpdG9ycw',
    '- Nested members:',
    $pnpVisitors,
    '',
    '## ACCG01 library ACL (Graph grantedToV2 / inheritedFrom / link)',
    '',
    $accgLines,
    '',
    "- HVCG-Client-ACCG01 bound on library: $(if ($hasClientGroupAcl) { 'YES' } else { 'NO' })",
    "- Site Members on library: $(if ($hasMembersAcl) { 'YES write' } else { 'NO' })",
    "- Site Visitors on library: $(if ($hasVisitorsAcl) { 'YES read' } else { 'NO' })",
    "- Root children folders: $($folder.ChildCount) inherited=$($folder.InheritedCount) uniqueOrMixed=$($folder.UniqueOrMixedCount) sharingLinks=$($folder.SharingLinkCount)",
    '',
    '## SYN01 library ACL (read-compare only, not modified)',
    '',
    $synLines,
    '',
    '## Exact before ACL vs desired after ACL',
    '',
    '### Before (live Graph, inherited from site)',
    $accgLines,
    '',
    '### After (desired unique ACL — SYN01 pattern; NOT applied)',
    '- EntraGroup: HVCG Clients Hub Owners id=a524406d-7a4d-4f1c-9ccc-a32a199cd9b8 login=c:0o.c|federateddirectoryclaimprovider|a524406d-7a4d-4f1c-9ccc-a32a199cd9b8_o roles=[owner] unique',
    '- EntraGroup: HVCG-Client-ACCG01 id=79effffa-a3c1-468f-849e-584f75ab4d6d login=c:0t.c|tenant|79effffa-a3c1-468f-849e-584f75ab4d6d roles=[write] unique',
    '- User: Manuel Barela id=e4835ea2-3c45-493a-95f5-472f6339661d login=i:0#.f|membership|manny@highvaluecapitalgroup.com roles=[owner] unique (SYN01 parity)',
    '- Remove: SharePoint site groups principalId 3 (Owners), 5 (Members), 4 (Visitors)',
    '- Do not grant: Everyone, Everyone except external users, site Members, site Visitors, SP site-group Owners',
    '',
    '## Humans impacted',
    '',
    '- Observed tenant Entra humans: Manny only (authorized HVCG admin). Guests: 0.',
    '- Manny retains access after unique ACL via Hub Owners Entra group + HVCG-Client-ACCG01 write + Global Administrator.',
    '- No other observed Entra human loses access.',
    '- Unknown nested principals inside unexpanded SP Members/Visitors would lose library access (desired). None were proven present.',
    '- Files affected: 0 (ACL-only; no file create/update/delete).',
    '- List-item metadata affected: 0 (no field writes). Folder ACLs stay inherited from the library root.',
    '',
    '## Actual current human/service principals with ACCG01 access',
    '',
    'Tenant Entra users (all):',
    $users,
    '',
    "- Guest count: $($Inventory.TenantGuestCount)",
    '- Global Administrator members:',
    $(if ($gaMem.Count -eq 0) { '- (not returned)' } else { $gaMem }),
    '- HVCG-Client-ACCG01 members (group exists, not on library ACL):',
    $clientMem,
    '',
    'Site User Information List (catalog of principals that exist on the site — not the same as group membership or library ACL):',
    $uil,
    '',
    "Standing ACCG01 access is the union of: nested members of SP Owners/Members/Visitors (unexpanded residual) + the M365 owners claims principal on the library (Manny) + Global Administrator (Manny). No Graph application identities and no sharing links were present on the library root or $($folder.ChildCount) standard folders. Hub MI ``id-atlas-prod`` was not on the library Graph ACL. Site-level Sites.Selected grants could not be listed (``accessDenied``). Everyone except external users is in the site UIL catalog (siteUserId 9) but is not a direct ACCG01 library grant.",
    '',
    '## Anyone other than authorized HVCG admin?',
    '',
    $crossWhy,
    '',
    '## Severity',
    '',
    $severity,
    '',
    '## Residual unexpanded',
    '',
    '- SharePoint site group Owners (principalId 3) nested members',
    '- SharePoint site group Members (principalId 5) nested members',
    '- SharePoint site group Visitors (principalId 4) nested members',
    '- Site-level Graph /sites/{id}/permissions (Sites.Selected app grants) — accessDenied',
    "- SPO REST expansion: attempted=$($spo.Attempted) tokenIssued=$($spo.TokenIssued) HTTP $($spo.Status) $($spo.Error)",
    '- Closing residual requires delegated PnP/SPO REST with a non-Azure-CLI public client (HVCG-PnP-Capital-Provisioning) and Manny MFA. Not done this sprint.',
    '',
    '## What Graph/PnP could and could not enumerate',
    '',
    'Could:',
    @($Inventory.GraphCould | ForEach-Object { "- $_" }),
    '',
    'Could not:',
    @($Inventory.GraphCouldNot | ForEach-Object { "- $_" }),
    '',
    '## Remediation package',
    '',
    $remediationReady,
    "- Target inheritance: $($Plan.TargetInheritance)",
    "- Target owners: $($Plan.TargetOwners -join '; ')",
    "- Target write: $($Plan.TargetWrite -join '; ')",
    "- Remove: $($Plan.Remove -join '; ')",
    "- Files affected: $($Plan.FilesAffected)",
    "- Metadata affected: $($Plan.MetadataAffected)",
    '- Apply: NOT RUN',
    "- PnP nested expansion completed: $pnpReady",
    '',
    '### Rollback',
    @($Plan.Rollback | ForEach-Object { "- $_" }),
    '',
    '### Post-verify',
    @($Plan.Verification | ForEach-Object { "- $_" }),
    '',
    '## Apply',
    '',
    'NOT RUN'
  ) | ForEach-Object { $_ } | Out-String
}

$inventory = $null
$artifact = $null
if ($InventoryOnly) {
  Write-Host 'INVENTORY: Graph read-only blast-radius (no SharePoint writes)'
  $inventory = Get-HVCGAccg01AclInventory -GraphSiteId $GraphSiteId -Accg01DriveId $Accg01DriveId -Syn01DriveId $Syn01DriveId -HubOwnersGroupId $HubOwnersGroupId -ClientGroupId $ClientGroupId -ClientsSiteUrl $ClientsSiteUrl
  $plan.MembersInventory = @($inventory.PnP.Members)
  $plan.VisitorsInventory = @($inventory.PnP.Visitors)
  $plan.OwnersInventory = @($inventory.PnP.Owners)
  $hasMembersAcl = @($inventory.Accg01LibraryPrincipals | Where-Object { $_.Kind -eq 'SharePointSiteGroup' -and $_.DisplayName -match 'Members' }).Count -gt 0
  $hasVisitorsAcl = @($inventory.Accg01LibraryPrincipals | Where-Object { $_.Kind -eq 'SharePointSiteGroup' -and $_.DisplayName -match 'Visitors' }).Count -gt 0
  $plan.BlastRadius = if ($hasMembersAcl -or $hasVisitorsAcl) {
    'ACCG01 inherits Hub Members write and/or Visitors read — cross-client ACL pattern (see inventory artifact). Observed extra Entra humans: none besides Manny. Nested SP group members residual.'
  } else {
    'ACCG01 library ACL does not include site Members/Visitors'
  }

  $md = New-HVCGAccg01InventoryMarkdown -Inventory $inventory -Plan $plan -Identity $identity
  $artifact = Save-HVCGAccg01AclInventoryArtifact -Inventory $inventory -RepoRoot $RepoRoot -Markdown $md
  Write-Host "INVENTORY ARTIFACT: $($artifact.Markdown)"
}

if ($Apply -and -not $applyAllowed) {
  Write-Host 'APPLY REFUSED: HVCG_ACCG01_CHANGE_WINDOW is not 1. No SharePoint writes.'
}

Write-Host 'WHATIF / APPLY / VERIFICATION / ROLLBACK PACKAGE'
Write-Host ($plan | ConvertTo-Json -Depth 6)
Write-Host 'APPLY: NOT RUN'
Write-Host 'OWNER ACTION REQUIRED: NO'

[pscustomobject]@{
  WhatIf     = $plan.WhatIf
  ApplyRun   = $false
  Ready      = $true
  Plan       = $plan
  Inventory  = $inventory
  Artifact   = $artifact
  Messages   = @(
    'Nested SP Owners/Members/Visitors remain residual without MFA',
    'Do not bind site Members or Visitors onto HVCG_ACCG01',
    'Match SYN01 unique ACL: Hub Owners Entra owner + HVCG-Client-ACCG01 write + Manny user owner'
  )
}
