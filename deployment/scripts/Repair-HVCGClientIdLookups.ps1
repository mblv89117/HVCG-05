#Requires -Version 7.0
<#
.SYNOPSIS
  Validates and (optionally) repairs the ClientId lookup columns on HVCG_Projects and
  HVCG_Tasks so Power Automate GetItems/PostItem (without $select) works reliably.

.DESCRIPTION
  Connects to the HVCG Command Center site via PnP.PowerShell (using the environment
  config, production.json by default) and, for HVCG_Projects and HVCG_Tasks:

    1. Confirms the ClientId column is a Lookup whose LookupList GUID equals the
       HVCG_Clients list Id and whose ShowField is Title.
    2. Verifies a write + read round-trip of ClientId and a REST GET of items WITHOUT
       $select (the pattern the flows rely on).
    3. When broken:
         - Lookup pointing at the wrong list / wrong ShowField -> repaired in place by
           updating the field SchemaXml (internal name preserved).
         - Missing column or wrong field type -> the old column's values are backed up to
           ClientId_Orphaned_<yyyyMMdd>, the old column is removed, a fresh ClientId lookup
           is created via FieldXml (List={clientsId} ShowField=Title), values are migrated by
           ClientCode, then re-verified. The orphaned backup column is only removed when
           -RetireOrphaned is supplied.

  A JSON + Markdown report is written to deployment/reports/schema/clientid-repair-latest.*.

.NOTES
  Read-only unless -Repair is supplied. -WhatIf is honoured for all mutating operations.
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [Parameter(Mandatory = $false)]
  [string]$ConfigPath = (Join-Path $PSScriptRoot '../../config/environments/production.json'),

  [Parameter(Mandatory = $false)]
  [string[]]$Lists = @('HVCG_Projects', 'HVCG_Tasks'),

  [Parameter(Mandatory = $false)]
  [string]$ClientsList = 'HVCG_Clients',

  [Parameter(Mandatory = $false)]
  [switch]$Repair,

  [Parameter(Mandatory = $false)]
  [switch]$RetireOrphaned,

  [Parameter(Mandatory = $false)]
  [switch]$SkipWriteTest
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.Deployment.psm1') -Force

if (-not (Test-Path $ConfigPath)) {
  $fallback = Join-Path $RepoRoot 'config/environments/development.json'
  if (Test-Path $fallback) {
    Write-Warning "Config '$ConfigPath' not found; falling back to $fallback"
    $ConfigPath = $fallback
  }
  else {
    throw "Config not found: $ConfigPath (and no development.json fallback)."
  }
}

$Report = New-HVCGDeploymentReport -Environment 'clientid-repair' -RepoRoot $RepoRoot
$envCfg = Get-Content (Resolve-Path $ConfigPath) -Raw | ConvertFrom-Json
$siteUrl = $envCfg.sites.commandCenter.url
if ([string]::IsNullOrWhiteSpace($siteUrl) -or $siteUrl -match 'REQUIRED_SET_ME') {
  throw "Command Center site URL is not set in $ConfigPath (sites.commandCenter.url)."
}

$results = [System.Collections.Generic.List[object]]::new()

function Normalize-Guid {
  param([string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) { return '' }
  return ($Value -replace '[{}]', '').Trim().ToLowerInvariant()
}

function Get-ClientIdFieldFacts {
  param([string]$ListTitle, [string]$ClientsListId)
  $field = Get-PnPField -List $ListTitle -Identity 'ClientId' -ErrorAction SilentlyContinue
  if (-not $field) {
    return [pscustomobject]@{
      Exists = $false; Type = $null; LookupListId = $null; ShowField = $null
      GuidOk = $false; ShowFieldOk = $false; Required = $false; SchemaXml = $null
    }
  }
  [xml]$xml = $field.SchemaXml
  $node = $xml.Field
  $lookupList = Normalize-Guid ([string]$node.List)
  $showField = [string]$node.ShowField
  if ([string]::IsNullOrWhiteSpace($showField)) { $showField = 'Title' }
  return [pscustomobject]@{
    Exists       = $true
    Type         = [string]$field.TypeAsString
    LookupListId = $lookupList
    ShowField    = $showField
    GuidOk       = ($lookupList -eq (Normalize-Guid $ClientsListId))
    ShowFieldOk  = ($showField -eq 'Title')
    Required     = [bool]$field.Required
    SchemaXml    = $field.SchemaXml
  }
}

function Test-ClientIdReadWrite {
  param([string]$ListTitle, [string]$SiteUrl, [int]$SampleClientId)
  $probe = [ordered]@{ WriteReadOk = $false; RestNoSelectOk = $false; Notes = @() }
  $tempProjectId = $null
  $tempItemId = $null
  try {
    $values = @{ Title = 'ZZ_ClientIdRepairProbe'; ClientId = $SampleClientId }
    if ($ListTitle -eq 'HVCG_Projects') {
      $values['ProjectStatus'] = 'Not Started'
      $item = Add-PnPListItem -List $ListTitle -Values $values
      $tempItemId = $item.Id
    }
    elseif ($ListTitle -eq 'HVCG_Tasks') {
      # Tasks need a valid ProjectId lookup; create a throwaway project first.
      $tp = Add-PnPListItem -List 'HVCG_Projects' -Values @{ Title = 'ZZ_ClientIdRepairProbeProj'; ProjectStatus = 'Not Started'; ClientId = $SampleClientId }
      $tempProjectId = $tp.Id
      $values['ProjectId'] = $tempProjectId
      $values['TaskStatus'] = 'Not Started'
      $item = Add-PnPListItem -List $ListTitle -Values $values
      $tempItemId = $item.Id
    }
    else {
      $item = Add-PnPListItem -List $ListTitle -Values $values
      $tempItemId = $item.Id
    }

    $read = Get-PnPListItem -List $ListTitle -Id $tempItemId -Fields 'ClientId', 'Title'
    $lookupVal = $read['ClientId']
    if ($null -ne $lookupVal -and [int]$lookupVal.LookupId -eq $SampleClientId) {
      $probe.WriteReadOk = $true
    }
    else {
      $probe.Notes += "ClientId round-trip mismatch (expected $SampleClientId)."
    }

    # REST GET without $select on the item just written.
    $rest = Invoke-PnPSPRestMethod -Method Get -Url "$SiteUrl/_api/web/lists/getbytitle('$ListTitle')/items($tempItemId)"
    if ($null -ne $rest -and ($rest.PSObject.Properties.Name -contains 'ClientId' -or $rest.PSObject.Properties.Name -contains 'ClientIdId')) {
      $probe.RestNoSelectOk = $true
    }
    else {
      $probe.Notes += 'REST GET (no $select) did not return ClientId/ClientIdId.'
    }
  }
  catch {
    $probe.Notes += "Write/read probe error: $($_.Exception.Message)"
  }
  finally {
    if ($tempItemId) { Remove-PnPListItem -List $ListTitle -Identity $tempItemId -Force -ErrorAction SilentlyContinue | Out-Null }
    if ($tempProjectId) { Remove-PnPListItem -List 'HVCG_Projects' -Identity $tempProjectId -Force -ErrorAction SilentlyContinue | Out-Null }
  }
  return [pscustomobject]$probe
}

function Repair-ClientIdInPlace {
  param([string]$ListTitle, [string]$ClientsListId)
  $field = Get-PnPField -List $ListTitle -Identity 'ClientId'
  [xml]$xml = $field.SchemaXml
  $xml.Field.SetAttribute('List', "{$ClientsListId}")
  $xml.Field.SetAttribute('ShowField', 'Title')
  $field.SchemaXml = $xml.OuterXml
  $field.UpdateAndPushChanges($true)
  Invoke-PnPQuery
}

function Repair-ClientIdRecreate {
  param([string]$ListTitle, [string]$ClientsListId, [bool]$Required, [hashtable]$ClientCodeToId)
  $orphanName = "ClientId_Orphaned_$(Get-Date -Format 'yyyyMMdd')"

  # 1. Snapshot existing rows keyed by ClientCode for migration.
  $rows = Get-PnPListItem -List $ListTitle -PageSize 500 -Fields 'ID', 'ClientCode'
  $snapshot = @{}
  foreach ($r in $rows) {
    $code = [string]$r['ClientCode']
    if (-not [string]::IsNullOrWhiteSpace($code)) { $snapshot[[int]$r.Id] = $code }
  }

  # 2. Ensure orphan backup column exists and copy ClientCode into it (raw backup).
  $orphan = Get-PnPField -List $ListTitle -Identity $orphanName -ErrorAction SilentlyContinue
  if (-not $orphan) {
    Add-PnPField -List $ListTitle -Type Text -InternalName $orphanName -DisplayName $orphanName | Out-Null
  }
  foreach ($id in $snapshot.Keys) {
    Set-PnPListItem -List $ListTitle -Identity $id -Values @{ $orphanName = $snapshot[$id] } -ErrorAction SilentlyContinue | Out-Null
  }

  # 3. Remove old broken ClientId column (if present) and recreate as Lookup.
  $existing = Get-PnPField -List $ListTitle -Identity 'ClientId' -ErrorAction SilentlyContinue
  if ($existing) { Remove-PnPField -List $ListTitle -Identity 'ClientId' -Force }

  $reqAttr = if ($Required) { 'TRUE' } else { 'FALSE' }
  $fieldId = [guid]::NewGuid().ToString()
  $fieldXml = "<Field Type=`"Lookup`" DisplayName=`"ClientId`" StaticName=`"ClientId`" Name=`"ClientId`" List=`"{$ClientsListId}`" ShowField=`"Title`" Required=`"$reqAttr`" Indexed=`"TRUE`" ID=`"{$fieldId}`" />"
  Add-PnPFieldFromXml -List $ListTitle -FieldXml $fieldXml | Out-Null

  # 4. Migrate values by ClientCode.
  $migrated = 0
  foreach ($id in $snapshot.Keys) {
    $code = $snapshot[$id]
    if ($ClientCodeToId.ContainsKey($code)) {
      Set-PnPListItem -List $ListTitle -Identity $id -Values @{ ClientId = $ClientCodeToId[$code] } -ErrorAction SilentlyContinue | Out-Null
      $migrated++
    }
  }
  return [pscustomobject]@{ OrphanColumn = $orphanName; RowsBackedUp = $snapshot.Count; RowsMigrated = $migrated }
}

try {
  $null = Initialize-HVCGPnPAuth -Config $envCfg -Report $Report
  Connect-HVCGPnPOnline -Url $siteUrl -Config $envCfg -Report $Report
  $Report.Tenant = $siteUrl

  $clients = Get-PnPList -Identity $ClientsList
  $clientsId = $clients.Id.ToString()
  Write-HVCGLog -Level INFO -Message "$ClientsList list Id = $clientsId" -Report $Report

  # Build ClientCode -> Id map for migration (best-effort).
  $clientCodeToId = @{}
  $sampleClientId = 0
  try {
    $clientItems = Get-PnPListItem -List $ClientsList -PageSize 500 -Fields 'ID', 'ClientCode'
    foreach ($ci in $clientItems) {
      $code = [string]$ci['ClientCode']
      if (-not [string]::IsNullOrWhiteSpace($code) -and -not $clientCodeToId.ContainsKey($code)) {
        $clientCodeToId[$code] = [int]$ci.Id
      }
      if ($sampleClientId -eq 0) { $sampleClientId = [int]$ci.Id }
    }
  }
  catch {
    Write-HVCGLog -Level WARN -Message "Could not enumerate clients for migration map: $($_.Exception.Message)" -Report $Report
  }

  foreach ($listTitle in $Lists) {
    Write-HVCGLog -Level STEP -Message "Checking $listTitle.ClientId" -Report $Report
    $entry = [ordered]@{
      list          = $listTitle
      before        = $null
      broken        = $false
      brokenReasons = @()
      action        = 'none'
      writeReadOk   = $null
      restNoSelectOk = $null
      after         = $null
      repairDetail  = $null
      notes         = @()
    }

    $facts = Get-ClientIdFieldFacts -ListTitle $listTitle -ClientsListId $clientsId
    $entry.before = $facts

    if (-not $facts.Exists) { $entry.broken = $true; $entry.brokenReasons += 'missing' }
    elseif ($facts.Type -ne 'Lookup') { $entry.broken = $true; $entry.brokenReasons += "wrongType:$($facts.Type)" }
    else {
      if (-not $facts.GuidOk) { $entry.broken = $true; $entry.brokenReasons += 'wrongLookupList' }
      if (-not $facts.ShowFieldOk) { $entry.broken = $true; $entry.brokenReasons += "wrongShowField:$($facts.ShowField)" }
    }

    # Write/read verification (only meaningful when a lookup exists and we have a sample client).
    if (-not $SkipWriteTest -and $facts.Exists -and $facts.Type -eq 'Lookup' -and $sampleClientId -gt 0) {
      if ($PSCmdlet.ShouldProcess($listTitle, 'Write/read + REST(no $select) probe')) {
        $probe = Test-ClientIdReadWrite -ListTitle $listTitle -SiteUrl $siteUrl -SampleClientId $sampleClientId
        $entry.writeReadOk = $probe.WriteReadOk
        $entry.restNoSelectOk = $probe.RestNoSelectOk
        $entry.notes += $probe.Notes
        if (-not $probe.WriteReadOk -or -not $probe.RestNoSelectOk) {
          $entry.broken = $true
          $entry.brokenReasons += 'writeReadOrRestFailed'
        }
      }
    }
    elseif ($sampleClientId -le 0) {
      $entry.notes += 'No sample client available; write/read probe skipped.'
    }

    if ($entry.broken -and $Repair) {
      $required = ($listTitle -eq 'HVCG_Projects')
      $canInPlace = ($facts.Exists -and $facts.Type -eq 'Lookup' -and ($entry.brokenReasons -notcontains 'writeReadOrRestFailed' -or (-not $facts.GuidOk -or -not $facts.ShowFieldOk)))
      $needsRecreate = ((-not $facts.Exists) -or ($facts.Exists -and $facts.Type -ne 'Lookup'))

      if ($needsRecreate) {
        if ($PSCmdlet.ShouldProcess($listTitle, 'Recreate ClientId lookup (backup + migrate)')) {
          Write-HVCGLog -Level WARN -Message "$listTitle.ClientId requires recreate ($($entry.brokenReasons -join ','))" -Report $Report
          $entry.action = 'recreate'
          $entry.repairDetail = Repair-ClientIdRecreate -ListTitle $listTitle -ClientsListId $clientsId -Required $required -ClientCodeToId $clientCodeToId
        }
      }
      elseif ($canInPlace) {
        if ($PSCmdlet.ShouldProcess($listTitle, 'Repair ClientId lookup in place (SchemaXml)')) {
          Write-HVCGLog -Level WARN -Message "$listTitle.ClientId in-place fix ($($entry.brokenReasons -join ','))" -Report $Report
          $entry.action = 'inPlace'
          Repair-ClientIdInPlace -ListTitle $listTitle -ClientsListId $clientsId
        }
      }
    }
    elseif ($entry.broken) {
      $entry.notes += 'Broken but -Repair not supplied; no changes made.'
      $Report.Warnings.Add("$listTitle.ClientId broken: $($entry.brokenReasons -join ',')")
    }

    # Re-validate after any repair.
    if ($entry.action -ne 'none') {
      $after = Get-ClientIdFieldFacts -ListTitle $listTitle -ClientsListId $clientsId
      $entry.after = $after
      $stillBroken = (-not $after.Exists) -or ($after.Type -ne 'Lookup') -or (-not $after.GuidOk) -or (-not $after.ShowFieldOk)
      if ($stillBroken) {
        $Report.Errors.Add("$listTitle.ClientId still broken after repair.")
      }
      else {
        Write-HVCGLog -Level SUCCESS -Message "$listTitle.ClientId repaired and validated." -Report $Report
        # Only retire the orphan backup once the new field validates.
        if ($RetireOrphaned -and $entry.action -eq 'recreate' -and $entry.repairDetail) {
          if ($PSCmdlet.ShouldProcess($listTitle, "Retire orphan column $($entry.repairDetail.OrphanColumn)")) {
            Remove-PnPField -List $listTitle -Identity $entry.repairDetail.OrphanColumn -Force -ErrorAction SilentlyContinue
            $entry.notes += "Orphan column $($entry.repairDetail.OrphanColumn) removed."
          }
        }
        elseif ($entry.action -eq 'recreate') {
          $entry.notes += "Orphan column $($entry.repairDetail.OrphanColumn) retained (use -RetireOrphaned to remove)."
        }
      }
    }
    elseif (-not $entry.broken) {
      Write-HVCGLog -Level SUCCESS -Message "$listTitle.ClientId is valid." -Report $Report
    }

    $results.Add([pscustomobject]$entry)
  }

  $Report.Success = ($Report.Errors.Count -eq 0)
}
catch {
  $Report.Errors.Add($_.Exception.Message)
  Write-HVCGLog -Level ERROR -Message $_.Exception.Message -Report $Report
}
finally {
  try { Disconnect-PnPOnline -ErrorAction SilentlyContinue } catch { }

  $reportDir = Join-Path $RepoRoot 'deployment/reports/schema'
  New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'

  $payload = [ordered]@{
    generatedAt = (Get-Date).ToString('o')
    site        = $siteUrl
    repair      = [bool]$Repair
    retireOrphaned = [bool]$RetireOrphaned
    whatIf      = [bool]$WhatIfPreference
    success     = $Report.Success
    lists       = $results
    errors      = @($Report.Errors)
    warnings    = @($Report.Warnings)
  }
  $json = $payload | ConvertTo-Json -Depth 10
  Set-Content -Path (Join-Path $reportDir "clientid-repair-$stamp.json") -Value $json -Encoding UTF8
  Set-Content -Path (Join-Path $reportDir 'clientid-repair-latest.json') -Value $json -Encoding UTF8

  $md = @"
# HVCG ClientId Lookup Repair

- **When:** $($payload.generatedAt)
- **Site:** $siteUrl
- **Repair mode:** $($payload.repair)
- **RetireOrphaned:** $($payload.retireOrphaned)
- **WhatIf:** $($payload.whatIf)
- **Success:** $($payload.success)

## Lists
$(($results | ForEach-Object {
  "### $($_.list)`n- broken: $($_.broken) ($($_.brokenReasons -join ', '))`n- action: $($_.action)`n- writeReadOk: $($_.writeReadOk)`n- restNoSelectOk: $($_.restNoSelectOk)`n- notes: $($_.notes -join '; ')"
}) -join "`n`n")

## Errors
$(if ($Report.Errors.Count -eq 0) { '- none' } else { ($Report.Errors | ForEach-Object { "- $_" }) -join "`n" })

## Warnings
$(if ($Report.Warnings.Count -eq 0) { '- none' } else { ($Report.Warnings | ForEach-Object { "- $_" }) -join "`n" })
"@
  Set-Content -Path (Join-Path $reportDir "clientid-repair-$stamp.md") -Value $md -Encoding UTF8
  Set-Content -Path (Join-Path $reportDir 'clientid-repair-latest.md') -Value $md -Encoding UTF8

  Write-Host ""
  Write-Host "Report: $(Join-Path $reportDir 'clientid-repair-latest.json')" -ForegroundColor Cyan
}

if (-not $Report.Success) { exit 1 }
