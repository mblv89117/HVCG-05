#Requires -Version 7.0
<#
.SYNOPSIS
  Backup HVCG OS configuration, schemas, list data, and metadata for an environment.

.EXAMPLE
  pwsh -File ./deployment/backup/Backup-HVCGOS.ps1 -Environment development

.EXAMPLE
  pwsh -File ./deployment/backup/Backup-HVCGOS.ps1 -Environment production -Mode Full -IncludeDocuments
#>
[CmdletBinding()]
param(
  [ValidateSet('development', 'test', 'production')]
  [string]$Environment = 'development',
  [ValidateSet('Full', 'ConfigurationOnly')]
  [string]$Mode = 'Full',
  [string]$OutputPath = '',
  [string]$ConfigPath = '',
  [string]$RepoRoot = '',
  [switch]$IncludeDocuments,
  [switch]$WhatIf
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (-not $RepoRoot) { $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path }

Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.Deployment.psm1') -Force
Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.Release.psm1') -Force

$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
if (-not $OutputPath) {
  $OutputPath = Join-Path $RepoRoot "backups/$Environment/$ts"
}

$Report = New-HVCGDeploymentReport -Environment "$Environment-backup" -RepoRoot $RepoRoot
$manifest = [ordered]@{
  product = 'HVCG OS'
  environment = $Environment
  mode = $Mode
  startedUtc = (Get-Date).ToUniversalTime().ToString('o')
  outputPath = $OutputPath
  includeDocuments = [bool]$IncludeDocuments
  items = @()
  errors = @()
  checksums = @{}
}

function Add-ManifestItem($Relative, $Note) {
  $script:manifest.items += [pscustomobject]@{ path = $Relative; note = $Note }
}

try {
  Write-HVCGLog -Level STEP -Message "Backup starting → $OutputPath (mode=$Mode)" -Report $Report
  if ($WhatIf) {
    Write-HVCGLog -Level WARN -Message 'WhatIf: no files written' -Report $Report
    $Report.Success = $true
    Save-HVCGDeploymentReport -Report $Report -RepoRoot $RepoRoot | Out-Null
    exit 0
  }

  New-Item -ItemType Directory -Force -Path $OutputPath,
    (Join-Path $OutputPath 'config'),
    (Join-Path $OutputPath 'schema'),
    (Join-Path $OutputPath 'data'),
    (Join-Path $OutputPath 'permissions'),
    (Join-Path $OutputPath 'templates'),
    (Join-Path $OutputPath 'automation'),
    (Join-Path $OutputPath 'powerplatform'),
    (Join-Path $OutputPath 'version'),
    (Join-Path $OutputPath 'libraries') | Out-Null

  # --- Config (no secrets) ---
  $Config = Get-HVCGOSConfig -RepoRoot $RepoRoot -Environment $Environment -ConfigPath $ConfigPath
  $cfgSafe = $Config | ConvertTo-Json -Depth 12 | ConvertFrom-Json
  # strip any accidental secret-like props
  $json = ($cfgSafe | ConvertTo-Json -Depth 12)
  if ($json -match '(?i)(client_secret|password|private_key)\s*[:=]') {
    throw 'Refusing to write backup: config appears to contain secrets.'
  }
  $cfgOut = Join-Path $OutputPath "config/environment.$Environment.json"
  Set-Content $cfgOut -Value $json -Encoding UTF8
  Add-ManifestItem 'config/environment.json' 'Environment config without secrets'
  Copy-Item (Join-Path $RepoRoot 'config/hvcg.config.json') (Join-Path $OutputPath 'config/hvcg.config.json')
  Copy-Item (Join-Path $RepoRoot 'VERSION') (Join-Path $OutputPath 'version/VERSION')
  Copy-Item (Join-Path $RepoRoot 'version.json') (Join-Path $OutputPath 'version/version.json')
  Add-ManifestItem 'version/' 'Product version markers'

  # --- Schema from repo (authoritative) ---
  Copy-Item (Join-Path $RepoRoot 'src/sharepoint/lists') (Join-Path $OutputPath 'schema/lists') -Recurse -Force
  Copy-Item (Join-Path $RepoRoot 'src/sharepoint/views') (Join-Path $OutputPath 'schema/views') -Recurse -Force -ErrorAction SilentlyContinue
  Copy-Item (Join-Path $RepoRoot 'src/sharepoint/content-types') (Join-Path $OutputPath 'schema/content-types') -Recurse -Force -ErrorAction SilentlyContinue
  Copy-Item (Join-Path $RepoRoot 'src/sharepoint/libraries') (Join-Path $OutputPath 'schema/libraries') -Recurse -Force -ErrorAction SilentlyContinue
  Add-ManifestItem 'schema/' 'SharePoint schemas, views, content types'

  # --- Templates & automation defs ---
  Copy-Item (Join-Path $RepoRoot 'templates') (Join-Path $OutputPath 'templates') -Recurse -Force
  Copy-Item (Join-Path $RepoRoot 'src/power-automate') (Join-Path $OutputPath 'automation/power-automate') -Recurse -Force
  Copy-Item (Join-Path $RepoRoot 'src/power-platform/environment-variables') (Join-Path $OutputPath 'powerplatform/environment-variables') -Recurse -Force -ErrorAction SilentlyContinue
  Copy-Item (Join-Path $RepoRoot 'src/power-platform/connection-references') (Join-Path $OutputPath 'powerplatform/connection-references') -Recurse -Force -ErrorAction SilentlyContinue
  Add-ManifestItem 'templates/' 'Project/communication templates'
  Add-ManifestItem 'automation/' 'Flow definitions'
  Add-ManifestItem 'powerplatform/' 'Env vars & connection refs (no secrets)'

  if ($Mode -eq 'ConfigurationOnly') {
    Write-HVCGLog -Level INFO -Message 'ConfigurationOnly — skipping live tenant data export' -Report $Report
  }
  else {
    Install-HVCGModules -Report $Report
    $null = Connect-HVCGGraphInteractive -Report $Report
    $siteUrl = $Config.sites.commandCenter.url
    Connect-PnPOnline -Url $siteUrl -Interactive

    # Version marker
    $installed = Get-HVCGInstalledVersion -SiteUrl $siteUrl
    @{ installedVersion = $installed; siteUrl = $siteUrl; backedUpUtc = (Get-Date).ToUniversalTime().ToString('o') } |
      ConvertTo-Json | Set-Content (Join-Path $OutputPath 'version/installed.json') -Encoding UTF8
    Add-ManifestItem 'version/installed.json' 'Tenant InstalledVersion'

    # List data export (JSON lines per list) — page safely
    $idx = Get-Content (Join-Path $RepoRoot 'src/sharepoint/lists/_index.json') -Raw | ConvertFrom-Json
    $dataDir = Join-Path $OutputPath 'data'
    $i = 0
    foreach ($l in $idx.lists) {
      $i++
      Write-Progress -Activity 'Exporting list data' -Status $l.name -PercentComplete ([int](100 * $i / [math]::Max(1,$idx.lists.Count)))
      try {
        if (-not (Get-PnPList -Identity $l.name -ErrorAction SilentlyContinue)) {
          Write-HVCGLog -Level WARN -Message "List missing, skip data: $($l.name)" -Report $Report
          continue
        }
        $items = Get-PnPListItem -List $l.name -PageSize 500
        $rows = foreach ($it in $items) {
          $fv = @{}
          foreach ($k in $it.FieldValues.Keys) {
            if ($k -in @('MetaInfo','FileRef','FileDirRef','_UIVersionString')) { continue }
            $val = $it.FieldValues[$k]
            if ($null -eq $val) { continue }
            $fv[$k] = [string]$val
          }
          $fv['_Id'] = $it.Id
          $fv
        }
        ($rows | ConvertTo-Json -Depth 5) | Set-Content (Join-Path $dataDir "$($l.name).json") -Encoding UTF8
        Add-ManifestItem "data/$($l.name).json" "Item export"
      }
      catch {
        $manifest.errors += "Data export $($l.name): $($_.Exception.Message)"
        Write-HVCGLog -Level WARN -Message $manifest.errors[-1] -Report $Report
      }
    }
    Write-Progress -Activity 'Exporting list data' -Completed

    # Permissions snapshot (web role assignments best-effort)
    try {
      $web = Get-PnPWeb -Includes RoleAssignments
      $perm = @()
      foreach ($ra in $web.RoleAssignments) {
        $ra.Context.Load($ra.Member)
        $ra.Context.Load($ra.RoleDefinitionBindings)
        $ra.Context.ExecuteQuery()
        $perm += [pscustomobject]@{
          Principal = $ra.Member.Title
          Login = $ra.Member.LoginName
          Roles = ($ra.RoleDefinitionBindings | ForEach-Object { $_.Name }) -join ';'
        }
      }
      ($perm | ConvertTo-Json -Depth 4) | Set-Content (Join-Path $OutputPath 'permissions/web-roleassignments.json') -Encoding UTF8
      Add-ManifestItem 'permissions/web-roleassignments.json' 'Web permissions snapshot'
    }
    catch {
      Write-HVCGLog -Level WARN -Message "Permissions export partial: $($_.Exception.Message)" -Report $Report
    }

    # Document library inventory on Clients hub
    try {
      Connect-PnPOnline -Url $Config.sites.clientsHub.url -Interactive
      $libs = Get-PnPList | Where-Object { $_.BaseTemplate -eq 101 -and $_.Title -like 'HVCG_*' }
      $inv = foreach ($lib in $libs) {
        [pscustomobject]@{ Title = $lib.Title; ItemCount = $lib.ItemCount; Url = $lib.RootFolder.ServerRelativeUrl }
      }
      ($inv | ConvertTo-Json) | Set-Content (Join-Path $OutputPath 'libraries/inventory.json') -Encoding UTF8
      Add-ManifestItem 'libraries/inventory.json' 'Client library inventory'
      if ($IncludeDocuments) {
        Write-HVCGLog -Level WARN -Message 'IncludeDocuments: use PnP Provisioning or separate Secure Store job — file bodies not auto-downloaded in v1.1 (size/safety). Inventory only.' -Report $Report
      }
    }
    catch {
      Write-HVCGLog -Level WARN -Message "Library inventory: $($_.Exception.Message)" -Report $Report
    }

    # Optional PP solution export
    $pac = Get-Command pac -ErrorAction SilentlyContinue
    if ($pac) {
      try {
        $zip = Join-Path $OutputPath "powerplatform/HVCGOS_unmanaged_backup.zip"
        & pac solution export --name HVCGOS --managed false --path $zip
        Add-ManifestItem 'powerplatform/HVCGOS_unmanaged_backup.zip' 'PAC solution export'
      }
      catch {
        Write-HVCGLog -Level WARN -Message "pac export skipped: $($_.Exception.Message)" -Report $Report
      }
    }
  }

  # Deployment metadata
  Copy-Item (Join-Path $RepoRoot 'releases/migrations') (Join-Path $OutputPath 'version/migrations') -Recurse -Force -ErrorAction SilentlyContinue

  # Checksums
  Get-ChildItem $OutputPath -Recurse -File | Where-Object { $_.Name -ne 'manifest.json' -and $_.Name -ne 'checksums.json' } | ForEach-Object {
    $rel = $_.FullName.Substring($OutputPath.Length).TrimStart('\','/')
    $hash = (Get-FileHash $_.FullName -Algorithm SHA256).Hash
    $manifest.checksums[$rel] = $hash
  }
  $manifest.finishedUtc = (Get-Date).ToUniversalTime().ToString('o')
  $manifest.success = ($manifest.errors.Count -eq 0)
  ($manifest | ConvertTo-Json -Depth 8) | Set-Content (Join-Path $OutputPath 'manifest.json') -Encoding UTF8
  ($manifest.checksums | ConvertTo-Json) | Set-Content (Join-Path $OutputPath 'checksums.json') -Encoding UTF8

  # Pointer latest
  $latest = Join-Path $RepoRoot "backups/$Environment/latest"
  if (Test-Path $latest) { Remove-Item $latest -Force -Recurse -ErrorAction SilentlyContinue }
  New-Item -ItemType Directory -Force -Path (Split-Path $latest) | Out-Null
  # write pointer file instead of symlink for portability
  Set-Content -Path (Join-Path $RepoRoot "backups/$Environment/latest.txt") -Value $OutputPath -Encoding UTF8

  $Report.Success = $true
  $Report.NextStep = "Restore dry-run: pwsh -File ./deployment/restore/Restore-HVCGOS.ps1 -BackupPath '$OutputPath' -WhatIf"
  Write-HVCGLog -Level SUCCESS -Message "Backup complete: $OutputPath" -Report $Report
}
catch {
  Write-HVCGLog -Level ERROR -Message $_.Exception.Message -Report $Report
  $Report.Success = $false
  exit 1
}
finally {
  Save-HVCGDeploymentReport -Report $Report -RepoRoot $RepoRoot | Out-Null
  try { Disconnect-PnPOnline -ErrorAction SilentlyContinue } catch {}
}

exit 0
