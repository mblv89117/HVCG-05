#Requires -Version 7.0
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.CapitalListGrants.psm1') -Force

$Hub = '2b9ca61d-2396-4caa-95cd-30200d2ff36a'
$Other = '11111111-1111-4111-8111-111111111111'
$failed = 0

function Assert-HVCG {
  param([string]$Name, [bool]$Condition, [string]$Detail = '')
  if ($Condition) {
    Write-Host "PASS $Name"
  } else {
    Write-Host "FAIL $Name $Detail"
    $script:failed++
  }
}

# A. Selected permission with application identity
$a = @{
  roles = @('write')
  grantedTo = @{ application = @{ id = $Hub } }
}
$ra = Resolve-HVCGSelectedWriteGrant -Permissions @($a) -TargetAppId $Hub
Assert-HVCG 'A application write EXISTS' ($ra.State -eq 'EXISTS') $ra.State

# B. grantedToV2 identitySet application
$b = @{
  roles = @('write')
  grantedToV2 = @{ application = @{ id = $Hub; displayName = 'id-atlas-prod' } }
}
$rb = Resolve-HVCGSelectedWriteGrant -Permissions @($b) -TargetAppId $Hub
Assert-HVCG 'B grantedToV2 application EXISTS' ($rb.State -eq 'EXISTS') $rb.State

# C. grantedToIdentitiesV2 array
$c = @{
  roles = @('write')
  grantedToIdentitiesV2 = @(
    @{ user = @{ id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' } },
    @{ application = @{ id = $Hub } }
  )
}
$rc = Resolve-HVCGSelectedWriteGrant -Permissions @($c) -TargetAppId $Hub
Assert-HVCG 'C grantedToIdentitiesV2 EXISTS' ($rc.State -eq 'EXISTS') $rc.State

# D. no existing Selected permission (SharePoint inherited groups only — live tenant shape)
$d = @(
  @{
    roles = @('owner')
    grantedToV2 = @{
      siteGroup = @{ id = '3'; displayName = 'Owners' }
      sharePointGroup = @{ principalId = '3' }
    }
    grantedTo = @{ user = @{ displayName = 'Owners' } }
  },
  @{
    roles = @('write')
    grantedToV2 = @{
      siteGroup = @{ id = '5'; displayName = 'Members' }
      sharePointGroup = @{ principalId = '5' }
    }
    grantedTo = @{ user = @{ displayName = 'Members' } }
  },
  @{
    roles = @('read')
    grantedToV2 = @{
      siteGroup = @{ id = '4'; displayName = 'Visitors' }
      sharePointGroup = @{ principalId = '4' }
    }
    grantedTo = @{ user = @{ displayName = 'Visitors' } }
  },
  @{
    roles = @('owner')
    grantedToV2 = @{
      group = @{ id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' }
      siteUser = @{ id = '6' }
    }
    grantedTo = @{ user = @{ displayName = 'Manny' } }
  }
)
$rd = Resolve-HVCGSelectedWriteGrant -Permissions $d -TargetAppId $Hub
Assert-HVCG 'D inherited SharePoint groups MISSING hub grant' ($rd.State -eq 'MISSING') $rd.State

# E. unrelated application permission
$e = @{
  roles = @('write')
  grantedToV2 = @{ application = @{ id = $Other } }
}
$re = Resolve-HVCGSelectedWriteGrant -Permissions @($e) -TargetAppId $Hub
Assert-HVCG 'E unrelated application MISSING' ($re.State -eq 'MISSING') $re.State

# F. malformed / unexpected permission object
$f = @{
  roles = @('write')
  grantedToV2 = @{ unexpectedPrincipal = @{ id = $Hub } }
}
$rf = Resolve-HVCGSelectedWriteGrant -Permissions @($f) -TargetAppId $Hub
Assert-HVCG 'F unexpected identity UNKNOWN' ($rf.State -eq 'UNKNOWN') $rf.State

$f2 = @{ roles = @('write'); mystery = @{ id = $Hub } }
$rf2 = Resolve-HVCGSelectedWriteGrant -Permissions @($f2) -TargetAppId $Hub
Assert-HVCG 'F missing identity fields UNKNOWN' ($rf2.State -eq 'UNKNOWN') $rf2.State

# G. existing correct write grant among inherited ACLs
$g = $d + @(
  @{
    roles = @('write')
    grantedToV2 = @{ application = @{ id = $Hub } }
    grantedTo = @{ application = @{ id = $Hub } }
  }
)
$rg = Resolve-HVCGSelectedWriteGrant -Permissions $g -TargetAppId $Hub
Assert-HVCG 'G write grant EXISTS among inherited ACLs' ($rg.State -eq 'EXISTS') $rg.State

# H. existing insufficient/read grant (live HVCG_Clients shape)
$h = $d + @(
  @{
    roles = @('read')
    grantedToV2 = @{ application = @{ id = $Hub } }
    grantedTo = @{ application = @{ id = $Hub } }
  }
)
$rh = Resolve-HVCGSelectedWriteGrant -Permissions $h -TargetAppId $Hub
Assert-HVCG 'H read grant INSUFFICIENT' ($rh.State -eq 'INSUFFICIENT') $rh.State

# I. duplicate / replay / idempotency: two write grants still EXISTS
$i = @(
  @{ roles = @('write'); grantedToV2 = @{ application = @{ id = $Hub } } },
  @{ roles = @('write'); grantedTo = @{ application = @{ id = $Hub } } }
)
$ri = Resolve-HVCGSelectedWriteGrant -Permissions $i -TargetAppId $Hub
Assert-HVCG 'I duplicate write EXISTS' ($ri.State -eq 'EXISTS') $ri.State

# empty collection
$rz = Resolve-HVCGSelectedWriteGrant -Permissions @() -TargetAppId $Hub
Assert-HVCG 'empty permissions MISSING' ($rz.State -eq 'MISSING') $rz.State

# StrictMode crash regression: siteGroup-only grantedToV2 has no .application
Convert-HVCGListPermission -Permission $d[0] | Out-Null
Assert-HVCG 'siteGroup grantedToV2 does not throw' $true

# Live Graph JSON shape (PSCustomObject): inherited ACLs + optional Clients read grant
$liveJson = @'
[
  {
    "id": "perm-owners",
    "roles": ["owner"],
    "grantedToV2": {
      "siteGroup": { "id": "3", "displayName": "Owners" },
      "sharePointGroup": { "id": "3", "displayName": "Owners", "loginName": "Owners" }
    },
    "grantedTo": { "user": { "displayName": "Owners" } },
    "inheritedFrom": { "siteId": "site" }
  },
  {
    "id": "perm-members",
    "roles": ["write"],
    "grantedToV2": {
      "siteGroup": { "id": "5", "displayName": "Members" },
      "sharePointGroup": { "id": "5", "displayName": "Members", "loginName": "Members" }
    },
    "grantedTo": { "user": { "displayName": "Members" } }
  }
]
'@
$liveObjs = $liveJson | ConvertFrom-Json
$rlive = Resolve-HVCGSelectedWriteGrant -Permissions $liveObjs -TargetAppId $Hub
Assert-HVCG 'live Graph JSON inherited ACLs MISSING' ($rlive.State -eq 'MISSING') $rlive.State
Convert-HVCGListPermission -Permission $liveObjs[0] | Out-Null
Assert-HVCG 'live Graph JSON siteGroup does not throw' $true

# ACL principal inventory parser (read-only)
$siteGroupParsed = @(Convert-HVCGAclGrantedPrincipal -Permission $d[0])
Assert-HVCG 'ACL parser siteGroup kind' ($siteGroupParsed[0].Kind -eq 'SharePointSiteGroup' -and $siteGroupParsed[0].DisplayName -eq 'Owners') $siteGroupParsed[0].Kind
Assert-HVCG 'ACL parser siteGroup owner role' ($siteGroupParsed[0].Roles -contains 'owner')
$groupParsed = @(Convert-HVCGAclGrantedPrincipal -Permission $d[3])
Assert-HVCG 'ACL parser entra group kind' ($groupParsed[0].Kind -eq 'EntraGroup') $groupParsed[0].Kind
$nullParsed = @(Convert-HVCGAclGrantedPrincipal -Permission $null)
Assert-HVCG 'ACL parser null is Unknown' ($nullParsed[0].Kind -eq 'Unknown')

if ($failed -gt 0) {
  Write-Host "FAILED $failed"
  exit 1
}
Write-Host 'ALL PASS'
exit 0
