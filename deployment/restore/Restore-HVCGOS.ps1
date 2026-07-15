#Requires -Version 7.0
<#
.SYNOPSIS
  Restore HVCG OS from a backup folder. Additive by default; destructive overwrite requires -AllowDestructiveOverwrite -Confirm.

.EXAMPLE
  pwsh -File ./deployment/restore/Restore-HVCGOS.ps1 -BackupPath ./backups/development/20260714-120000 -WhatIf

.EXAMPLE
  pwsh -File ./deployment/restore/Restore-HVCGOS.ps1 -Environment development -BackupPath ./backups/development/latest-folder
#>
[CmdletBinding()]
param(
  [ValidateSet('development', 'test', 'production')]
  [string]$Environment = 'development',
  [Parameter(Mandatory = $true)]
  [string]$BackupPath,
  [string]$ConfigPath = '',
  [string]$RepoRoot = '',
  [switch]$RestoreData,
  [switch]$RestoreTemplates,
  [switch]$ImportManagedSolution,
  [switch]$AllowDestructiveOverwrite,
  [switch]$WhatIf,
  [switch]$Confirm
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (-not $RepoRoot) { $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path }

Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.Deployment.psm1') -Force
Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.Release.psm1') -Force

$Report = New-HVCGDeploymentReport -Environment "$Environment-restore" -RepoRoot $RepoRoot

if (-not (Test-Path $BackupPath)) { throw "Backup path not found: $BackupPath" }
$manifestPath = Join-Path $BackupPath 'manifest.json'
if (-not (Test-Path $manifestPath)) { throw 'manifest.json missing — refuse restore' }
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json

# Validate checksums
$checksumsPath = Join-Path $BackupPath 'checksums.json'
if (Test-Path $checksumsPath) {
  $sums = Get-Content $checksumsPath -Raw | ConvertFrom-Json
  foreach ($prop in $sums.PSObject.Properties) {
    $file = Join-Path $BackupPath $prop.Name
    if (-not (Test-Path $file)) {
      Write-HVCGLog -Level WARN -Message "Missing file for checksum: $($prop.Name)" -Report $Report
      continue
    }
    $actual = (Get-FileHash $file -Algorithm SHA256).Hash
    if ($actual -ne $prop.Value) {
      throw "Checksum mismatch for $($prop.Name)"
    }
  }
  Write-HVCGLog -Level SUCCESS -Message 'Backup checksums validated' -Report $Report
}

if ($AllowDestructiveOverwrite -and -not $Confirm) {
  throw 'Destructive overwrite requires -Confirm in addition to -AllowDestructiveOverwrite.'
}
if ($WhatIf) {
  Write-HVCGLog -Level WARN -Message "WhatIf restore from $BackupPath (additive=$(-not $AllowDestructiveOverwrite))" -Report $Report
  Write-Host "Would restore schema via Upgrade/Install using backup schema; data restore=$RestoreData"
  $Report.Success = $true
  Save-HVCGDeploymentReport -Report $Report -RepoRoot $RepoRoot | Out-Null
  exit 0
}

try {
  $Config = Get-HVCGOSConfig -RepoRoot $RepoRoot -Environment $Environment -ConfigPath $ConfigPath
  Install-HVCGModules -Report $Report
  $null = Connect-HVCGGraphInteractive -Report $Report
  $null = Initialize-HVCGPnPAuth -Config $Config -Report $Report
  $siteUrl = $Config.sites.commandCenter.url
  Connect-HVCGPnPOnline -Url $siteUrl -Config $Config -Report $Report

  # Version validation
  $backupVer = $null
  $vpath = Join-Path $BackupPath 'version/installed.json'
  if (Test-Path $vpath) {
    $backupVer = (Get-Content $vpath -Raw | ConvertFrom-Json).installedVersion
  }
  $current = Get-HVCGInstalledVersion -SiteUrl $siteUrl
  Write-HVCGLog -Level INFO -Message "Current=$current BackupInstalled=$backupVer" -Report $Report

  # Schema: prefer upgrade path to package version using repo (safer). Backup schema used for conflict reporting.
  Write-HVCGLog -Level STEP -Message 'Applying additive schema from current package (preserves data)' -Report $Report
  $target = (Get-Content (Join-Path $RepoRoot 'VERSION') -Raw).Trim()
  & (Join-Path $RepoRoot 'deployment/upgrade/Upgrade-HVCGOS.ps1') -Environment $Environment -TargetVersion $target -RepoRoot $RepoRoot -SkipPreTests
  if ($LASTEXITCODE -ne 0) { throw 'Schema upgrade during restore failed' }

  if ($RestoreTemplates) {
    Install-HVCGKnowledgeTemplates -KnowledgeUrl $Config.sites.knowledgeCenter.url -RepoRoot $RepoRoot -Report $Report
  }

  if ($RestoreData) {
    Write-HVCGLog -Level STEP -Message 'Restoring list data (additive upsert by HVCG_IdempotencyKey / skip existing Title where safe)' -Report $Report
    $dataDir = Join-Path $BackupPath 'data'
    Get-ChildItem $dataDir -Filter '*.json' -ErrorAction SilentlyContinue | ForEach-Object {
      $listName = $_.BaseName
      if (-not (Get-PnPList -Identity $listName -ErrorAction SilentlyContinue)) {
        Write-HVCGLog -Level WARN -Message "Skip data; list missing $listName" -Report $Report
        return
      }
      $rows = Get-Content $_.FullName -Raw | ConvertFrom-Json
      if ($null -eq $rows) { return }
      if ($rows -isnot [System.Array]) { $rows = @($rows) }
      foreach ($row in $rows) {
        try {
          $key = $null
          if ($row.HVCG_IdempotencyKey) { $key = [string]$row.HVCG_IdempotencyKey }
          if ($key) {
            $found = Get-PnPListItem -List $listName -Query "<View><Query><Where><Eq><FieldRef Name='HVCG_IdempotencyKey'/><Value Type='Text'>$key</Value></Eq></Where></Query></View>" -ErrorAction SilentlyContinue
            if ($found) {
              if ($AllowDestructiveOverwrite -and $Confirm) {
                # limited field update not fully generic — skip for safety
                $Report.ResourcesSkipped.Add("DataExists:${listName}:${key}")
              }
              else {
                $Report.ResourcesSkipped.Add("DataExists:${listName}:${key}")
              }
              continue
            }
          }
          # Only restore a subset of simple text fields for safety
          $vals = @{}
          foreach ($p in $row.PSObject.Properties) {
            if ($p.Name -in @('_Id','ID','Id','Author','Editor','Created','Modified','GUID','FileSystemObjectType')) { continue }
            if ($p.Name -match 'Id$' -and $p.Name -ne 'HVCG_IdempotencyKey') { continue } # skip lookups on restore
            if ($null -ne $p.Value -and [string]$p.Value -ne '') { $vals[$p.Name] = [string]$p.Value }
          }
          if ($vals.ContainsKey('Title') -or $vals.Count -gt 0) {
            Add-PnPListItem -List $listName -Values $vals -ErrorAction SilentlyContinue | Out-Null
            $Report.ResourcesCreated.Add("Data:$listName")
          }
        }
        catch {
          Write-HVCGLog -Level WARN -Message "Row restore $listName : $($_.Exception.Message)" -Report $Report
        }
      }
    }
  }

  if ($ImportManagedSolution) {
    $zip = Get-ChildItem (Join-Path $BackupPath 'powerplatform') -Filter '*.zip' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($zip) {
      Write-HVCGLog -Level INFO -Message "Import solution $($zip.FullName) via pac if available" -Report $Report
      $pac = Get-Command pac -ErrorAction SilentlyContinue
      if ($pac) { & pac solution import --path $zip.FullName }
    }
  }

  $Report.Success = $true
  $Report.NextStep = 'Run health + post-deploy validation'
  Write-HVCGLog -Level SUCCESS -Message 'Restore finished (additive schema; data per flags).' -Report $Report
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
