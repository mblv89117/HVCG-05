#Requires -Version 7.0
<#
.SYNOPSIS
  Offline unit tests for schema validation drift (missing / extra / mismatch) and report output.
#>
[CmdletBinding()]
param(
  [string]$RepoRoot = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not $RepoRoot) {
  $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
}

Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.Deployment.psm1') -Force

$failures = [System.Collections.Generic.List[string]]::new()
function Assert-True {
  param([bool]$Condition, [string]$Name)
  if ($Condition) { Write-Host "  PASS: $Name" -ForegroundColor Green }
  else {
    Write-Host "  FAIL: $Name" -ForegroundColor Red
    $failures.Add($Name)
  }
}

Write-Host '=== HVCG schema validation drift ==='

# Build live field maps for HVCG_TeamMembers only — other lists reported missing
$teamSchema = Get-Content (Join-Path $RepoRoot 'src/sharepoint/lists/HVCG_TeamMembers.json') -Raw | ConvertFrom-Json
$liveByList = @{}

$teamFields = [System.Collections.Generic.List[object]]::new()
foreach ($col in $teamSchema.columns) {
  $c = Get-HVCGColumnSchemaFacade -Column $col
  $type = if ($c.InternalName -eq 'Title') { 'Text' } else { $c.Type }
  if ($type -eq 'Boolean') { $type = 'Boolean' }
  elseif ($type -eq 'Number') { $type = 'Number' }
  elseif ($type -eq 'Choice') { $type = 'Choice' }
  elseif ($type -eq 'MultiChoice') { $type = 'MultiChoice' }
  elseif ($type -eq 'DateTime') { $type = 'DateTime' }
  elseif ($type -eq 'Currency') { $type = 'Currency' }
  elseif ($type -eq 'URL') { $type = 'URL' }
  elseif ($type -eq 'Lookup') { $type = 'Lookup' }
  else { $type = 'Text' }
  $teamFields.Add([pscustomobject]@{
      InternalName = $c.InternalName
      TypeAsString = $type
      Required     = [bool]$c.Required
      Hidden       = $false
      FromBaseType = ($c.InternalName -eq 'Title')
    })
}

# Missing: drop Email
$teamFields = [System.Collections.Generic.List[object]]@($teamFields | Where-Object { $_.InternalName -ne 'Email' })

# Mismatch: IsActive as Text instead of Boolean
foreach ($f in $teamFields) {
  if ($f.InternalName -eq 'IsActive') { $f.TypeAsString = 'Text' }
}

# Extra custom field
$teamFields.Add([pscustomobject]@{
    InternalName = 'LegacyGhostField'
    TypeAsString = 'Text'
    Required     = $false
    Hidden       = $false
    FromBaseType = $false
  })

$liveByList['HVCG_TeamMembers'] = @($teamFields)

$result = Test-HVCGSharePointSchemaCompliance -SiteUrl 'https://example.sharepoint.com/sites/mock' -RepoRoot $RepoRoot -ListGetter {
  param($Title)
  if ($Title -eq 'HVCG_TeamMembers') { return [pscustomobject]@{ Title = $Title } }
  return $null
} -FieldLister {
  param($Title)
  if ($liveByList.ContainsKey($Title)) { return @($liveByList[$Title]) }
  return @()
} -FieldGetter {
  param($Title, $Name)
  if (-not $liveByList.ContainsKey($Title)) { return $null }
  return ($liveByList[$Title] | Where-Object { $_.InternalName -eq $Name } | Select-Object -First 1)
}

Assert-True ($result.HasDrift -eq $true) 'HasDrift when drift present'
Assert-True ($result.IsCompliant -eq $false) 'not compliant when drift present'
Assert-True (@($result.Missing) -contains 'HVCG_TeamMembers.Email') 'missing field detected'
Assert-True ((@($result.Missing) | Where-Object { $_ -like 'List:*' }).Count -gt 0) 'missing lists detected'
Assert-True (@($result.Extra) -contains 'HVCG_TeamMembers.LegacyGhostField') 'extra field detected'
$mismatchIsActive = @(@($result.Incorrect) | Where-Object { $_ -like 'HVCG_TeamMembers.IsActive:*' })
Assert-True ($mismatchIsActive.Count -eq 1) 'mismatched type detected'

$path = Save-HVCGSchemaValidationReport -Result $result -RepoRoot $RepoRoot -Phase 'unit-test'
Assert-True (Test-Path $path) 'schema validation report written'
$latest = Join-Path $RepoRoot 'deployment/reports/schema/schema-validation-latest.json'
Assert-True (Test-Path $latest) 'schema-validation-latest.json present'
$doc = Get-Content $latest -Raw | ConvertFrom-Json
Assert-True ($doc.hasDrift -eq $true) 'report hasDrift true'
Assert-True ($doc.missingCount -ge 1) 'report missingCount'
Assert-True ($doc.extraCount -ge 1) 'report extraCount'
Assert-True ($doc.mismatchedCount -ge 1) 'report mismatchedCount'
Assert-True (Test-Path (Join-Path $RepoRoot 'deployment/reports/schema/schema-validation-latest.md')) 'markdown report written'

# Compliant path for a single list when maps match schema types
$cleanFields = [System.Collections.Generic.List[object]]::new()
foreach ($col in $teamSchema.columns) {
  $c = Get-HVCGColumnSchemaFacade -Column $col
  $type = switch ($c.Type) {
    'Boolean' { 'Boolean' }
    'Number' { 'Number' }
    'Choice' { 'Choice' }
    'MultiChoice' { 'MultiChoice' }
    'DateTime' { 'DateTime' }
    'Currency' { 'Currency' }
    'URL' { 'URL' }
    'Lookup' { 'Lookup' }
    default { 'Text' }
  }
  if ($c.InternalName -eq 'Title') { $type = 'Text' }
  $cleanFields.Add([pscustomobject]@{
      InternalName = $c.InternalName
      TypeAsString = $type
      Required     = [bool]$c.Required
      Hidden       = $false
      FromBaseType = ($c.InternalName -eq 'Title')
    })
}
$liveByList = @{ 'HVCG_TeamMembers' = @($cleanFields) }

# Only validate TeamMembers by faking all other lists as present with exact schema fields
$allDefs = @(Get-HVCGListDefinitions -RepoRoot $RepoRoot)
foreach ($def in $allDefs) {
  if ($def.title -eq 'HVCG_TeamMembers') { continue }
  $fields = [System.Collections.Generic.List[object]]::new()
  foreach ($col in $def.columns) {
    $c = Get-HVCGColumnSchemaFacade -Column $col
    $type = switch ($c.Type) {
      'Boolean' { 'Boolean' }
      'Number' { 'Number' }
      'Choice' { 'Choice' }
      'MultiChoice' { 'MultiChoice' }
      'DateTime' { 'DateTime' }
      'Currency' { 'Currency' }
      'URL' { 'URL' }
      'Lookup' { 'Lookup' }
      default { 'Text' }
    }
    if ($c.InternalName -eq 'Title') { $type = 'Text' }
    $fields.Add([pscustomobject]@{
        InternalName = $c.InternalName
        TypeAsString = $type
        Required     = [bool]$c.Required
        Hidden       = $false
        FromBaseType = ($c.InternalName -eq 'Title')
      })
  }
  $liveByList[$def.title] = @($fields)
}

$okResult = Test-HVCGSharePointSchemaCompliance -SiteUrl 'https://example.sharepoint.com/sites/mock' -RepoRoot $RepoRoot -ListGetter {
  param($Title)
  return [pscustomobject]@{ Title = $Title }
} -FieldLister {
  param($Title)
  return @($liveByList[$Title])
} -FieldGetter {
  param($Title, $Name)
  return ($liveByList[$Title] | Where-Object { $_.InternalName -eq $Name } | Select-Object -First 1)
}

Assert-True ($okResult.HasDrift -eq $false) 'no drift when schema matches'
Assert-True ($okResult.IsCompliant -eq $true) 'compliant when schema matches'
Assert-True (@($okResult.Missing).Count -eq 0) 'no missing when match'
Assert-True (@($okResult.Extra).Count -eq 0) 'no extra when match'
Assert-True (@($okResult.Incorrect).Count -eq 0) 'no mismatch when match'

Write-Host ''
if ($failures.Count -gt 0) {
  Write-Host "RESULT: FAIL ($($failures.Count))" -ForegroundColor Red
  $failures | ForEach-Object { Write-Host " - $_" }
  exit 1
}
Write-Host 'RESULT: PASS' -ForegroundColor Green
exit 0
