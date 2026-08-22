#Requires -Version 7.0
<#
.SYNOPSIS
  Recreate ClientId lookup fields after a failed retire (PnP 3.3-compatible).
  Uses Add-PnPFieldFromXml — Add-PnPField -Type Lookup does not accept -Values.
#>
[CmdletBinding()]
param(
  [switch]$DeviceLogin
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Set-Location $RepoRoot
Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.Deployment.psm1') -Force

$Config = Get-Content (Join-Path $RepoRoot 'config/environments/production.json') -Raw | ConvertFrom-Json
$cid = $Config.authentication.pnpEntraAppClientId
$site = $Config.sites.commandCenter.url

Write-Host 'HVCG PnP — ClientId lookup recreate (PnP 3.3 FieldFromXml)'
Write-Host 'Account: manuel@highvaluecapitalgroup.com'
Write-Host "App ClientId: $cid"
Write-Host "Site: $site"

$conn = $null
try { $conn = Get-PnPConnection -ErrorAction SilentlyContinue } catch { $conn = $null }
if (-not $conn -or ($conn.Url.TrimEnd('/') -ne $site.TrimEnd('/'))) {
  if (-not $DeviceLogin) {
    Write-Host 'No usable PnP connection; attempting Connect with DeviceLogin (will print code if MFA needed)...'
  }
  Write-Host 'Open https://microsoft.com/devicelogin when code appears'
  Connect-PnPOnline -Url $site -DeviceLogin -ClientId $cid -ErrorAction Stop
}
Write-Host 'CONNECTED'

$clients = Get-PnPList -Identity 'HVCG_Clients' -Includes Id
$clientsId = $clients.Id.ToString()
Write-Host "HVCG_Clients Id=$clientsId"

$report = [ordered]@{
  generatedAt   = (Get-Date).ToUniversalTime().ToString('o')
  clientsListId = $clientsId
  lists         = [System.Collections.Generic.List[object]]::new()
  actions       = [System.Collections.Generic.List[string]]::new()
}

$listNames = @(
  'HVCG_Projects'
  'HVCG_Tasks'
  'HVCG_Deliverables'
  'HVCG_Decisions'
  'HVCG_DocumentRequests'
)

function Get-LookupListFromSchema {
  param([string]$SchemaXml)
  if ($SchemaXml -match 'List="\{?([^}"]+)\}?"') { return $Matches[1].Trim('{}') }
  return ''
}

foreach ($listName in $listNames) {
  try {
    $null = Get-PnPList -Identity $listName -ErrorAction Stop
  }
  catch {
    Write-Host "SKIP missing list $listName"
    continue
  }

  $entry = [ordered]@{ list = $listName; action = 'none'; after = $null; error = $null }

  try {
    $existing = $null
    try { $existing = Get-PnPField -List $listName -Identity 'ClientId' -ErrorAction Stop } catch { $existing = $null }

    if ($existing) {
      $lookup = Get-LookupListFromSchema -SchemaXml ([string]$existing.SchemaXml)
      Write-Host "$listName ClientId exists type=$($existing.TypeAsString) lookup=$lookup — retiring then recreating"
      $retireName = "ClientId_Retired_$(Get-Date -Format 'yyyyMMddHHmmss')"
      # PnP 3.3: Set-PnPField -Values (no -UpdateType)
      Set-PnPField -List $listName -Identity 'ClientId' -Values @{ Title = $retireName; Hidden = $true }
      $report.actions.Add("$listName renamed ClientId -> $retireName")
      # Also change internal name via SchemaXml if possible; otherwise leave retired display name
      try {
        Remove-PnPField -List $listName -Identity 'ClientId' -Force -ErrorAction Stop
        $report.actions.Add("$listName removed retired ClientId field")
      }
      catch {
        Write-Host "Remove after rename skipped: $($_.Exception.Message)"
      }
    }
    else {
      Write-Host "$listName ClientId MISSING — creating fresh lookup"
      $report.actions.Add("$listName ClientId was missing")
    }

    $fieldXml = @"
<Field Type="Lookup"
       DisplayName="ClientId"
       Required="FALSE"
       EnforceUniqueValues="FALSE"
       List="{$clientsId}"
       ShowField="Title"
       UnlimitedLengthInDocumentLibrary="FALSE"
       RelationshipDeleteBehavior="None"
       StaticName="ClientId"
       Name="ClientId"
       Group="HVCG" />
"@
    Add-PnPFieldFromXml -List $listName -FieldXml $fieldXml -ErrorAction Stop | Out-Null
    # Ensure not hidden / in default view optionally
    Set-PnPField -List $listName -Identity 'ClientId' -Values @{ Hidden = $false; Required = $false }

    $f2 = Get-PnPField -List $listName -Identity 'ClientId'
    $lookup2 = Get-LookupListFromSchema -SchemaXml ([string]$f2.SchemaXml)
    $entry.after = [ordered]@{
      type       = $f2.TypeAsString
      lookupList = $lookup2
      id         = $f2.Id.ToString()
    }
    $entry.action = 'recreated'
    $report.actions.Add("$listName recreated ClientId -> $lookup2")
    Write-Host "$listName RECREATED lookup=$lookup2 type=$($f2.TypeAsString)"
  }
  catch {
    $entry.error = $_.Exception.Message
    $entry.action = 'error'
    $report.actions.Add("$listName ERROR: $($_.Exception.Message)")
    Write-Host "$listName ERROR $($_.Exception.Message)"
  }

  $report.lists.Add([pscustomobject]$entry)
}

# Validate GetItems without $select (the PA connector failure mode)
try {
  $null = Invoke-PnPSPRestMethod -Method Get -Url "/_api/web/lists/getbytitle('HVCG_Projects')/items?`$top=1"
  $report['projectsGetItems'] = 'OK'
  Write-Host 'Projects GetItems (no $select): OK'
}
catch {
  $report['projectsGetItems'] = $_.Exception.Message
  Write-Host "Projects GetItems FAIL: $($_.Exception.Message)"
}

try {
  $null = Invoke-PnPSPRestMethod -Method Get -Url "/_api/web/lists/getbytitle('HVCG_Tasks')/items?`$top=1"
  $report['tasksGetItems'] = 'OK'
  Write-Host 'Tasks GetItems (no $select): OK'
}
catch {
  $report['tasksGetItems'] = $_.Exception.Message
  Write-Host "Tasks GetItems FAIL: $($_.Exception.Message)"
}

# Write/read ClientId
try {
  $client = (Get-PnPListItem -List 'HVCG_Clients' -PageSize 1)[0]
  $t = "ATLAS-CID-REPAIR-$(Get-Date -Format 'HHmmss')"
  $item = Add-PnPListItem -List 'HVCG_Projects' -Values @{
    Title         = $t
    ClientId      = [int]$client.Id
    ClientCode    = 'HARDEN'
    ProjectStatus = 'Not Started'
  }
  Start-Sleep -Seconds 1
  $r = Get-PnPListItem -List 'HVCG_Projects' -Id $item.Id
  $report['writeRead'] = [string]$r.FieldValues['ClientId']
  Remove-PnPListItem -List 'HVCG_Projects' -Identity $item.Id -Force
  Write-Host "Write/read ClientId=$($report['writeRead'])"
}
catch {
  $report['writeReadError'] = $_.Exception.Message
  Write-Host "Write/read FAIL: $($_.Exception.Message)"
}

$outDir = Join-Path $RepoRoot 'deployment/reports/schema'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
($report | ConvertTo-Json -Depth 8) | Set-Content (Join-Path $outDir 'clientid-recreate-latest.json') -Encoding UTF8

@"
# ClientId Field Recreate Report
- Generated: $($report.generatedAt)
- Clients list: $($report.clientsListId)
- Projects GetItems: $($report['projectsGetItems'])
- Tasks GetItems: $($report['tasksGetItems'])
- Write/read: $($report['writeRead'])
- Actions:
$($report.actions | ForEach-Object { "- $_" } | Out-String)
"@ | Set-Content (Join-Path $outDir 'clientid-recreate-latest.md') -Encoding UTF8

Write-Host "REPORT projectsGetItems=$($report['projectsGetItems']) writeRead=$($report['writeRead'])"
Write-Host 'SESSION_HELD_READY_FOR_HARDENING'
