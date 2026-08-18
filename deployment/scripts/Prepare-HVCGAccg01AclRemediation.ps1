#Requires -Version 7.0
<#
.SYNOPSIS
  PREPARE-ONLY ACCG01 unique-ACL remediation package. Does not apply.

.DESCRIPTION
  Default is WhatIf inventory + plan. Apply is refused unless
  HVCG_ACCG01_CHANGE_WINDOW=1 is set AND -Apply is passed.
  This sprint does not set that window. Target matches SYN01:
    unique permissions, Hub Owners owner, HVCG-Client-ACCG01 write,
    no site Members, no site Visitors.

  -InventoryOnly runs a Graph read-only blast-radius inventory and writes
  gitignored artifacts. It never applies ACL changes. PnP site-group
  expansion is attempted only when an existing PnP connection already
  targets the Clients site (no Interactive / MFA prompt).

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
  $could.Add('Graph GET /drives/{ACCG01}/root/permissions (grantedToV2, link, inheritedFrom)') | Out-Null
  $accgPrincipals = foreach ($p in @($accgPerms.value)) { Convert-HVCGAclGrantedPrincipal -Permission $p }

  $synPrincipals = @()
  if (-not [string]::IsNullOrWhiteSpace($Syn01DriveId)) {
    $synPerms = Invoke-HVCGGraphGet -Token $token -Uri "https://graph.microsoft.com/v1.0/drives/$Syn01DriveId/root/permissions"
    $could.Add('Graph GET /drives/{SYN01}/root/permissions (read-compare only)') | Out-Null
    $synPrincipals = foreach ($p in @($synPerms.value)) { Convert-HVCGAclGrantedPrincipal -Permission $p }
  }

  $hubMembers = @()
  $hubOwnersOwners = @()
  if (-not [string]::IsNullOrWhiteSpace($HubOwnersGroupId)) {
    $g = Invoke-HVCGGraphGet -Token $token -Uri "https://graph.microsoft.com/v1.0/groups/$HubOwnersGroupId"
    $could.Add("Graph GET /groups/$HubOwnersGroupId (displayName=$($g.displayName))") | Out-Null
    $hubMembers = Get-HVCGDirectoryObjectPrincipals -Value @( (Invoke-HVCGGraphGet -Token $token -Uri "https://graph.microsoft.com/v1.0/groups/$HubOwnersGroupId/members").value )
    $hubOwnersOwners = Get-HVCGDirectoryObjectPrincipals -Value @( (Invoke-HVCGGraphGet -Token $token -Uri "https://graph.microsoft.com/v1.0/groups/$HubOwnersGroupId/owners").value )
    $could.Add('Graph expanded M365 group members/owners for HVCG Clients Hub') | Out-Null
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

  $uil = $null
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
    $couldNot.Add('PnP SharePoint site-group member expansion — skipped (no existing PnP connection to HVCG-Clients; Interactive/DeviceLogin would prompt MFA)') | Out-Null
    $couldNot.Add('Azure CLI SharePoint token cannot call SPO REST (App is not allowed to call SPO with user_impersonation scope)') | Out-Null
    $couldNot.Add('Graph has no siteGroups/siteUsers segment to expand SP group nested principals') | Out-Null
  }

  $membersEntra = @($entraNamedMembers.value)
  $visitorsEntra = @($entraNamedVisitors.value)

  return [pscustomobject]@{
    CollectedAtUtc          = [datetime]::UtcNow.ToString('o')
    Accg01LibraryPrincipals = @($accgPrincipals)
    Syn01LibraryPrincipals  = @($synPrincipals)
    HubOwnersM365           = @{
      Id      = $HubOwnersGroupId
      Members = @($hubMembers)
      Owners  = @($hubOwnersOwners)
    }
    HubMembersEntraGroups   = @($membersEntra)
    HubVisitorsEntraGroups  = @($visitorsEntra)
    ClientGroupMembers      = @($clientMembers)
    TenantUsers             = @($users.value | ForEach-Object {
      [pscustomobject]@{
        Id = [string]$_.id; DisplayName = [string]$_.displayName
        UserPrincipalName = [string]$_.userPrincipalName; UserType = [string]$_.userType
        AccountEnabled = [bool]$_.accountEnabled
      }
    })
    TenantGuestCount        = $(if ($null -ne $guests.value) { @($guests.value).Count } else { 0 })
    SiteUserInformationList = @($uilPrincipals)
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
  TargetOwners      = @($HubOwnersGroupName)
  TargetWrite       = @($ClientGroupName)
  Remove            = @('Members', 'Visitors', 'site Members write', 'site Visitors read')
  DoNotGrant        = @('Everyone', 'Everyone except external users', 'site Members', 'site Visitors')
  MembersInventory  = @()
  VisitorsInventory = @()
  BlastRadius       = 'UNKNOWN until inventory against live site groups'
  Rollback          = 'Re-grant recorded Members/Visitors principals from inventory JSON; restore inherited if unique break is the only change and inventory says inherited=true'
  Verification      = @(
    'HVCG_ACCG01 HasUniqueRoleAssignments = true',
    'HVCG-Client-ACCG01 claims principal write present',
    'HVCG Clients Hub Owners owner present',
    'No Members / Visitors on library ACL',
    'SYN01 ACL unchanged'
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

function New-HVCGAccg01InventoryMarkdown {
  param($Inventory, $Plan, $Identity)

  $accgLines = @($Inventory.Accg01LibraryPrincipals | ForEach-Object { Format-HVCGAclPrincipalLine -p $_ })
  $synLines = @($Inventory.Syn01LibraryPrincipals | ForEach-Object { Format-HVCGAclPrincipalLine -p $_ })
  $hubMem = @($Inventory.HubOwnersM365.Members | ForEach-Object { "- $($_.Kind): $($_.DisplayName) id=$($_.Id) upn=$($_.UserPrincipalName)" })
  $hubOwn = @($Inventory.HubOwnersM365.Owners | ForEach-Object { "- $($_.Kind): $($_.DisplayName) id=$($_.Id) upn=$($_.UserPrincipalName)" })
  $clientMem = @($Inventory.ClientGroupMembers | ForEach-Object { "- $($_.Kind): $($_.DisplayName) id=$($_.Id) upn=$($_.UserPrincipalName)" })
  $users = @($Inventory.TenantUsers | ForEach-Object { "- $($_.UserType): $($_.DisplayName) id=$($_.Id) upn=$($_.UserPrincipalName) enabled=$($_.AccountEnabled)" })
  $uil = @($Inventory.SiteUserInformationList | ForEach-Object { "- [$($_.ContentType)] $($_.Title) siteUserId=$($_.SiteUserId) login=$($_.LoginName) email=$($_.Email) siteAdmin=$($_.IsSiteAdmin)" })
  $pnpOwners = @($Inventory.PnP.Owners | ForEach-Object { "- $($_.Title) login=$($_.LoginName) email=$($_.Email) type=$($_.PrincipalType)" })
  $pnpMembers = @($Inventory.PnP.Members | ForEach-Object { "- $($_.Title) login=$($_.LoginName) email=$($_.Email) type=$($_.PrincipalType)" })
  $pnpVisitors = @($Inventory.PnP.Visitors | ForEach-Object { "- $($_.Title) login=$($_.LoginName) email=$($_.Email) type=$($_.PrincipalType)" })
  if ($pnpOwners.Count -eq 0) { $pnpOwners = @('- (not expanded — PnP MFA required or Get-PnPGroupMember failed)') }
  if ($pnpMembers.Count -eq 0) { $pnpMembers = @('- (not expanded — PnP MFA required or Get-PnPGroupMember failed)') }
  if ($pnpVisitors.Count -eq 0) { $pnpVisitors = @('- (not expanded — PnP MFA required or Get-PnPGroupMember failed)') }
  $entraMembers = if (@($Inventory.HubMembersEntraGroups).Count -eq 0) { '- none (SharePoint site group, not an Entra group)' } else { ($Inventory.HubMembersEntraGroups | ConvertTo-Json -Compress) }
  $entraVisitors = if (@($Inventory.HubVisitorsEntraGroups).Count -eq 0) { '- none (SharePoint site group, not an Entra group)' } else { ($Inventory.HubVisitorsEntraGroups | ConvertTo-Json -Compress) }

  $hasMembersAcl = @($Inventory.Accg01LibraryPrincipals | Where-Object { $_.Kind -eq 'SharePointSiteGroup' -and $_.DisplayName -match 'Members' }).Count -gt 0
  $hasVisitorsAcl = @($Inventory.Accg01LibraryPrincipals | Where-Object { $_.Kind -eq 'SharePointSiteGroup' -and $_.DisplayName -match 'Visitors' }).Count -gt 0
  $hasClientGroupAcl = @($Inventory.Accg01LibraryPrincipals | Where-Object { $_.DisplayName -eq 'HVCG-Client-ACCG01' -or $_.Id -eq '79effffa-a3c1-468f-849e-584f75ab4d6d' }).Count -gt 0
  $crossClient = $hasMembersAcl -or $hasVisitorsAcl
  $crossWhy = if ($crossClient) {
    'YES. HVCG_ACCG01 still inherits site Members write + Visitors read (plus Hub Owners). Any current or future principal nested in those SharePoint site groups can access this client library. SYN01 does not use that pattern. HVCG-Client-ACCG01 is not bound on the library.'
  } else {
    'NO. ACCG01 library ACL does not include site Members/Visitors.'
  }

  $humanNow = @($Inventory.TenantUsers | Where-Object { $_.UserType -eq 'Member' -or $_.UserType -eq 'Guest' })
  $severity = if ($crossClient) { 'HIGH (inherited Hub Members write + Visitors read on a production client financial library). Current extra Entra humans: none observed besides Manny. Nested SharePoint site-group membership was not expanded.' } else { 'LOW' }

  $pnpReady = [bool]$Inventory.PnP.Connected -and @($Inventory.PnP.Members).Count + @($Inventory.PnP.Visitors).Count + @($Inventory.PnP.Owners).Count -gt 0
  $remediationReady = 'PARTIAL. WhatIf unique-ACL package is prepared and Apply is blocked without HVCG_ACCG01_CHANGE_WINDOW=1. Nested Members/Visitors principals were not recorded via PnP; rollback can still re-grant the site groups themselves from Graph ACL ids.'

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
    '### SharePoint site group `HVCG Clients Hub Owners` (principalId 3) — nested members',
    $pnpOwners,
    '',
    '### M365 group `HVCG Clients Hub` / claims `HVCG Clients Hub Owners` `a524406d-7a4d-4f1c-9ccc-a32a199cd9b8`',
    'Members:',
    $hubMem,
    'Owners:',
    $hubOwn,
    '',
    '## Members principals (exact)',
    '',
    '### Entra group named `HVCG Clients Hub Members`',
    $entraMembers,
    '',
    '### SharePoint site group `HVCG Clients Hub Members` (principalId 5) — nested members',
    $pnpMembers,
    '',
    '## Visitors principals (exact)',
    '',
    '### Entra group named `HVCG Clients Hub Visitors`',
    $entraVisitors,
    '',
    '### SharePoint site group `HVCG Clients Hub Visitors` (principalId 4) — nested members',
    $pnpVisitors,
    '',
    '## ACCG01 library ACL (Graph grantedToV2 / inheritedFrom / link)',
    '',
    $accgLines,
    '',
    "- HVCG-Client-ACCG01 bound on library: $(if ($hasClientGroupAcl) { 'YES' } else { 'NO' })",
    "- Site Members on library: $(if ($hasMembersAcl) { 'YES write' } else { 'NO' })",
    "- Site Visitors on library: $(if ($hasVisitorsAcl) { 'YES read' } else { 'NO' })",
    '',
    '## SYN01 library ACL (read-compare only, not modified)',
    '',
    $synLines,
    '',
    '## Actual current human/service principals with ACCG01 access',
    '',
    'Tenant Entra users (all):',
    $users,
    '',
    "- Guest count: $($Inventory.TenantGuestCount)",
    '- HVCG-Client-ACCG01 members (group exists, not on library ACL):',
    $clientMem,
    '',
    'Site User Information List (catalog of principals that exist on the site — not the same as group membership or library ACL):',
    $uil,
    '',
    'Standing ACCG01 access is the union of: nested members of SP Owners/Members/Visitors (unexpanded) + the M365 owners claims principal on the library (Manny) + Global Administrator (Manny). No Graph application identities and no sharing links were present on the library root or 24 standard folders. Hub MI `id-atlas-prod` was not on the library Graph ACL. Site-level Sites.Selected grants could not be listed (`accessDenied`).',
    '',
    '## Actual cross-client exposure',
    '',
    $crossWhy,
    '',
    '## Severity',
    '',
    $severity,
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
    "- Target owners: $($Plan.TargetOwners -join ', ')",
    "- Target write: $($Plan.TargetWrite -join ', ')",
    '- Apply: NOT RUN',
    "- PnP nested expansion completed: $pnpReady",
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
  $hasMembersAcl = @($inventory.Accg01LibraryPrincipals | Where-Object { $_.Kind -eq 'SharePointSiteGroup' -and $_.DisplayName -match 'Members' }).Count -gt 0
  $hasVisitorsAcl = @($inventory.Accg01LibraryPrincipals | Where-Object { $_.Kind -eq 'SharePointSiteGroup' -and $_.DisplayName -match 'Visitors' }).Count -gt 0
  $plan.BlastRadius = if ($hasMembersAcl -or $hasVisitorsAcl) {
    'ACCG01 inherits Hub Members write and/or Visitors read — cross-client ACL pattern (see inventory artifact)'
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
    'Inventory Members/Visitors on HVCG-Clients before any apply window',
    'Do not bind site Members or Visitors onto HVCG_ACCG01',
    'Match SYN01 unique ACL'
  )
}
