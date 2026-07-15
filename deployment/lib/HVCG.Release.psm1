#Requires -Version 7.0
<#
.SYNOPSIS
  HVCG OS release / upgrade / version helpers.
#>

Set-StrictMode -Version Latest

function ConvertTo-HVCGSemVerParts {
  param([string]$Version)
  if ($Version -eq '0.0.0' -or [string]::IsNullOrWhiteSpace($Version)) {
    return [pscustomobject]@{ Major = 0; Minor = 0; Patch = 0; Raw = '0.0.0' }
  }
  $clean = ($Version -replace '^v', '').Split('-')[0]
  $parts = $clean.Split('.')
  return [pscustomobject]@{
    Major = [int]$parts[0]
    Minor = [int]$(if ($parts.Count -gt 1) { $parts[1] } else { 0 })
    Patch = [int]$(if ($parts.Count -gt 2) { $parts[2] } else { 0 })
    Raw   = $clean
  }
}

function Compare-HVCGSemVer {
  param(
    [string]$Left,
    [string]$Right,
    [ValidateSet('EQ','GE','GT','LE','LT','CMP')]
    [string]$Op = 'CMP'
  )
  $a = ConvertTo-HVCGSemVerParts $Left
  $b = ConvertTo-HVCGSemVerParts $Right
  $cmp = 0
  if ($a.Major -ne $b.Major) { $cmp = $a.Major - $b.Major }
  elseif ($a.Minor -ne $b.Minor) { $cmp = $a.Minor - $b.Minor }
  else { $cmp = $a.Patch - $b.Patch }

  switch ($Op) {
    'EQ' { return ($cmp -eq 0) }
    'GE' { return ($cmp -ge 0) }
    'GT' { return ($cmp -gt 0) }
    'LE' { return ($cmp -le 0) }
    'LT' { return ($cmp -lt 0) }
    default { return $cmp }
  }
}

function Get-HVCGOSConfig {
  param(
    [string]$RepoRoot,
    [string]$Environment,
    [string]$ConfigPath = ''
  )
  if ($ConfigPath -and (Test-Path $ConfigPath)) {
    return (Get-Content $ConfigPath -Raw | ConvertFrom-Json)
  }
  $map = @{
    development = 'config/environments/development.json'
    test        = 'config/environments/test.json'
    production  = 'config/environments/production.json'
  }
  $rel = $map[$Environment]
  $full = Join-Path $RepoRoot $rel
  if (-not (Test-Path $full)) {
    $example = Join-Path $RepoRoot ($rel -replace '\.json$', '.example.json')
    if ($Environment -eq 'test' -and -not (Test-Path $example)) {
      $example = Join-Path $RepoRoot 'config/environments/development.example.json'
    }
    if ($Environment -eq 'production') {
      $example = Join-Path $RepoRoot 'config/environments/production.example.json'
    }
    if ($Environment -eq 'development') {
      $example = Join-Path $RepoRoot 'config/environments/development.example.json'
    }
    if (-not (Test-Path $full) -and (Test-Path $example)) {
      Copy-Item $example $full
      Write-Host "Created $full from example — fill REQUIRED values before production." -ForegroundColor Yellow
    }
  }
  if (-not (Test-Path $full)) {
    throw "Config not found for $Environment. Create $rel or pass -ConfigPath."
  }
  return (Get-Content $full -Raw | ConvertFrom-Json)
}

function Invoke-HVCGConfigMigration {
  param($Config, [string]$RepoRoot, $Report)
  $schemaPath = Join-Path $RepoRoot 'config/migrations/config-schema.json'
  $schema = Get-Content $schemaPath -Raw | ConvertFrom-Json
  $current = '0.0.0'
  if ($Config.PSObject.Properties.Name -contains 'configSchemaVersion' -and $Config.configSchemaVersion) {
    $current = [string]$Config.configSchemaVersion
  }
  $target = $schema.configSchemaVersion
  if ($current -eq $target) {
    Write-HVCGLog -Level INFO -Message "Config schema already $target" -Report $Report
    return $Config
  }

  # 0.0.0 → 1.0.0 additive defaults
  if (-not ($Config.PSObject.Properties.Name -contains 'configSchemaVersion')) {
    $Config | Add-Member -NotePropertyName configSchemaVersion -NotePropertyValue '1.0.0' -Force
  }
  else {
    $Config.configSchemaVersion = '1.0.0'
  }
  if (-not ($Config.PSObject.Properties.Name -contains 'productVersion')) {
    $Config | Add-Member -NotePropertyName productVersion -NotePropertyValue (Get-Content (Join-Path $RepoRoot 'VERSION') -Raw).Trim() -Force
  }
  Write-HVCGLog -Level SUCCESS -Message "Migrated config schema $current → 1.0.0" -Report $Report
  return $Config
}

function Get-HVCGMigrationPlan {
  param([string]$RepoRoot, [string]$FromVersion, [string]$ToVersion)
  $dir = Join-Path $RepoRoot 'releases/migrations'
  $packs = @(Get-ChildItem $dir -Filter '*.json' -ErrorAction Stop | ForEach-Object {
    Get-Content $_.FullName -Raw | ConvertFrom-Json
  } | Where-Object {
    $_.id -notlike 'PLACEHOLDER*' -and (
      -not ($_.PSObject.Properties.Name -contains 'status') -or (
        [string]$_.status -ne 'planned' -and [string]$_.status -ne 'superseded'
      )
    )
  })

  # Direct match first
  $direct = @($packs | Where-Object { $_.fromVersion -eq $FromVersion -and $_.toVersion -eq $ToVersion })
  if ($direct.Count -gt 0) { return $direct }

  $ordered = [System.Collections.Generic.List[object]]::new()
  $cursor = $FromVersion
  for ($guard = 0; $guard -lt 50 -and $cursor -ne $ToVersion; $guard++) {
    $candidates = @($packs | Where-Object {
      $_.fromVersion -eq $cursor -and (Compare-HVCGSemVer -Left $_.toVersion -Right $ToVersion -Op LE)
    } | Sort-Object { (ConvertTo-HVCGSemVerParts $_.toVersion).Major }, { (ConvertTo-HVCGSemVerParts $_.toVersion).Minor }, { (ConvertTo-HVCGSemVerParts $_.toVersion).Patch })
    if ($candidates.Count -eq 0) { break }
    $next = $candidates[-1]
    if ($ordered | Where-Object { $_.id -eq $next.id }) { break }
    $ordered.Add($next)
    $cursor = $next.toVersion
  }
  return @($ordered)
}

function Ensure-HVCGSystemInfoList {
  param([string]$SiteUrl, [string]$RepoRoot, $Report)
  Connect-PnPOnline -Url $SiteUrl -Interactive -ErrorAction Stop
  $schema = Get-Content (Join-Path $RepoRoot 'src/sharepoint/lists/HVCG_SystemInfo.json') -Raw | ConvertFrom-Json
  if (-not (Get-PnPList -Identity 'HVCG_SystemInfo' -ErrorAction SilentlyContinue)) {
    New-PnPList -Title 'HVCG_SystemInfo' -Template GenericList | Out-Null
    $Report.ResourcesCreated.Add('List:HVCG_SystemInfo')
  }
  foreach ($col in $schema.columns) {
    if ($col.internalName -eq 'Title') { continue }
    if (Get-PnPField -List 'HVCG_SystemInfo' -Identity $col.internalName -ErrorAction SilentlyContinue) { continue }
    if ($col.choices) {
      Add-PnPField -List 'HVCG_SystemInfo' -Type Choice -InternalName $col.internalName -DisplayName $col.displayName -Choices ([string[]]$col.choices) | Out-Null
    }
    else {
      Add-PnPField -List 'HVCG_SystemInfo' -Type $col.type -InternalName $col.internalName -DisplayName $col.displayName | Out-Null
    }
  }
}

function Get-HVCGInstalledVersion {
  param([string]$SiteUrl)
  try {
    Connect-PnPOnline -Url $SiteUrl -Interactive -ErrorAction Stop
    if (-not (Get-PnPList -Identity 'HVCG_SystemInfo' -ErrorAction SilentlyContinue)) {
      return '0.0.0'
    }
    $items = Get-PnPListItem -List 'HVCG_SystemInfo' -PageSize 5
    if (-not $items -or $items.Count -eq 0) { return '0.0.0' }
    $v = [string]$items[0].FieldValues['InstalledVersion']
    if ([string]::IsNullOrWhiteSpace($v)) { return '0.0.0' }
    return $v
  }
  catch {
    return '0.0.0'
  }
}

function Set-HVCGInstalledVersion {
  param(
    [string]$SiteUrl,
    [string]$Version,
    [string]$EnvironmentName,
    $Report,
    [string]$Notes = '',
    [string]$RepoRoot = ''
  )
  if (-not $RepoRoot) {
    $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
  }
  Connect-PnPOnline -Url $SiteUrl -Interactive -ErrorAction Stop
  Ensure-HVCGSystemInfoList -SiteUrl $SiteUrl -RepoRoot $RepoRoot -Report $Report
  $items = @(Get-PnPListItem -List 'HVCG_SystemInfo' -PageSize 5)
  $values = @{
    Title                 = 'HVCG OS'
    InstalledVersion      = $Version
    SchemaVersion         = $Version
    ConfigSchemaVersion   = '1.0.0'
    LastUpgradeUtc        = (Get-Date).ToUniversalTime()
    EnvironmentName       = $EnvironmentName
    LastHealthStatus      = 'Unknown'
  }
  if ($Notes) { $values.Notes = $Notes }
  if ($items.Count -eq 0) {
    Add-PnPListItem -List 'HVCG_SystemInfo' -Values $values | Out-Null
    $Report.ResourcesCreated.Add("SystemInfo:$Version")
  }
  else {
    Set-PnPListItem -List 'HVCG_SystemInfo' -Identity $items[0].Id -Values $values | Out-Null
    $Report.ResourcesUpdated.Add("SystemInfo:$Version")
  }
}

function Invoke-HVCGMigration {
  param($Migration, $Config, [string]$RepoRoot, $Report)

  foreach ($step in $Migration.steps) {
    $action = [string]$step.action
    Write-HVCGLog -Level INFO -Message "Migration step: $action" -Report $Report
    switch ($action) {
      'EnsureSystemInfoList' {
        Ensure-HVCGSystemInfoList -SiteUrl $Config.sites.commandCenter.url -RepoRoot $RepoRoot -Report $Report
      }
      'ProvisionAllListsFromIndex' {
        # Ensure sites exist for baseline if using upgrade path alone
        Install-HVCGListsFromSchema -SiteUrl $Config.sites.commandCenter.url -RepoRoot $RepoRoot -Report $Report
      }
      'ProvisionViews' {
        Install-HVCGViews -SiteUrl $Config.sites.commandCenter.url -RepoRoot $RepoRoot -Report $Report
      }
      'UploadProjectTemplates' {
        if ($Config.sites.knowledgeCenter.url) {
          Install-HVCGKnowledgeTemplates -KnowledgeUrl $Config.sites.knowledgeCenter.url -RepoRoot $RepoRoot -Report $Report
        }
      }
      'SetInstalledVersion' {
        Set-HVCGInstalledVersion -SiteUrl $Config.sites.commandCenter.url -Version $step.version -EnvironmentName $Config.environment -Report $Report -RepoRoot $RepoRoot
      }
      'WriteAuditEvent' {
        try {
          if (Get-PnPList -Identity 'HVCG_AuditEvents' -ErrorAction SilentlyContinue) {
            Add-PnPListItem -List 'HVCG_AuditEvents' -Values @{
              Title       = "$($step.eventType) $($Migration.id)"
              EventType   = $step.eventType
              ActorEmail  = (Get-MgContext).Account
              Details     = $step.details
              EventDate   = Get-Date
            } | Out-Null
          }
        }
        catch {
          Write-HVCGLog -Level WARN -Message "Audit event skipped: $($_.Exception.Message)" -Report $Report
        }
      }
      'AssertInstalledVersion' {
        $installed = Get-HVCGInstalledVersion -SiteUrl $Config.sites.commandCenter.url
        if ($step.min -and (Compare-HVCGSemVer -Left $installed -Right $step.min -Op LT)) {
          throw "Installed $installed is below required min $($step.min)"
        }
        if ($step.max -and (Compare-HVCGSemVer -Left $installed -Right $step.max -Op GT)) {
          throw "Installed $installed is above allowed max $($step.max)"
        }
      }
      'ApplyListDiff' {
        $diffPath = Join-Path $RepoRoot $step.diffFile
        if (-not (Test-Path $diffPath)) {
          Write-HVCGLog -Level WARN -Message "Diff file missing (no-op): $diffPath" -Report $Report
        }
        else {
          Invoke-HVCGListDiff -DiffPath $diffPath -SiteUrl $Config.sites.commandCenter.url -Report $Report
        }
      }
      default {
        Write-HVCGLog -Level WARN -Message "Unknown migration action $action — skipped" -Report $Report
      }
    }
  }
}

function Invoke-HVCGListDiff {
  param([string]$DiffPath, [string]$SiteUrl, $Report)
  # Diff format: { addLists: [...schemas], addColumns: [{list, column}] }
  $diff = Get-Content $DiffPath -Raw | ConvertFrom-Json
  Connect-PnPOnline -Url $SiteUrl -Interactive
  foreach ($listDef in @($diff.addLists)) {
    if (-not (Get-PnPList -Identity $listDef.title -ErrorAction SilentlyContinue)) {
      New-PnPList -Title $listDef.title -Template GenericList | Out-Null
      $Report.ResourcesCreated.Add("List:$($listDef.title)")
    }
    foreach ($col in $listDef.columns) {
      if ($col.internalName -eq 'Title' -or $col.type -eq 'Lookup') { continue }
      if (Get-PnPField -List $listDef.title -Identity $col.internalName -ErrorAction SilentlyContinue) { continue }
      if ($col.choices) {
        Add-PnPField -List $listDef.title -Type Choice -InternalName $col.internalName -DisplayName $col.displayName -Choices ([string[]]$col.choices) | Out-Null
      }
      else {
        Add-PnPField -List $listDef.title -Type $col.type -InternalName $col.internalName -DisplayName $col.displayName | Out-Null
      }
      $Report.ResourcesCreated.Add("Field:$($listDef.title).$($col.internalName)")
    }
  }
  foreach ($add in @($diff.addColumns)) {
    $list = $add.list
    $col = $add.column
    if (Get-PnPField -List $list -Identity $col.internalName -ErrorAction SilentlyContinue) {
      $Report.ResourcesSkipped.Add("Field:$list.$($col.internalName)")
      continue
    }
    if ($col.choices) {
      Add-PnPField -List $list -Type Choice -InternalName $col.internalName -DisplayName $col.displayName -Choices ([string[]]$col.choices) | Out-Null
    }
    else {
      Add-PnPField -List $list -Type $col.type -InternalName $col.internalName -DisplayName $col.displayName | Out-Null
    }
    $Report.ResourcesCreated.Add("Field:$list.$($col.internalName)")
  }
}

Export-ModuleMember -Function *
