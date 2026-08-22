#Requires -Version 7.0
<#
.SYNOPSIS
  Import Client 360 / curated HVCG-HVS clients into Dev SharePoint HVCG_Clients (idempotent).

.DESCRIPTION
  Uses PnP DeviceLogin (browser approval once). Does not delete existing rows.
  Dedupes by ClientCode then Title. Marks imported rows with ImportProvenance.

.EXAMPLE
  pwsh -File ./deployment/scripts/Import-HVCGClientsFromAtlas.ps1 -DeviceLogin
#>
[CmdletBinding()]
param(
  [string]$RepoRoot = '',
  [string]$Client360JsonPath = '',
  [ValidateSet('development', 'test', 'production')]
  [string]$Environment = 'development',
  [switch]$DeviceLogin,
  [switch]$WhatIf
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (-not $RepoRoot) {
  $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
}

Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.Deployment.psm1') -Force
Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.Release.psm1') -Force
$Report = New-HVCGDeploymentReport -Environment "$Environment-client-import" -RepoRoot $RepoRoot

$Config = Get-HVCGOSConfig -RepoRoot $RepoRoot -Environment $Environment
Assert-HVCGConfig -Config $Config -Report $Report
Install-HVCGModules -Report $Report | Out-Null
$null = Initialize-HVCGPnPAuth -Config $Config -Report $Report

$siteUrl = $Config.sites.commandCenter.url
$cid = Resolve-HVCGPnPClientId -Config $Config

Write-HVCGLog -Level STEP -Message "Connecting to $siteUrl (DeviceLogin=$DeviceLogin env=$Environment)" -Report $Report
if (Test-HVCGPnPConnectedTo -Url $siteUrl) {
  Write-HVCGLog -Level INFO -Message "Reusing existing PnP connection → $siteUrl" -Report $Report
}
elseif ($DeviceLogin) {
  Connect-PnPOnline -Url $siteUrl -DeviceLogin -ClientId $cid -ErrorAction Stop | Out-Null
}
else {
  Connect-HVCGPnPOnline -Url $siteUrl -Config $Config -Report $Report
}

# Curated priority clients + optional Client 360 dump
$seed = @(
  @{ Title = 'ACCG Inc.'; ClientCode = 'ACCG01'; DBA = 'ACCG'; Industry = 'Services'; ClientStage = 'Active Client'; IsActive = $true; InternalNotes = 'Imported from Atlas Client 360 / Microsoft' },
  @{ Title = 'Prodigy Games LLC'; ClientCode = 'PDG01'; DBA = 'Prodigy Games'; Industry = 'Gaming'; ClientStage = 'Active Client'; IsActive = $true; InternalNotes = 'Imported from Atlas Client 360 / Microsoft' },
  @{ Title = 'Colorado Craft Beef'; ClientCode = 'CCB01'; DBA = 'Colorado Craft Beef'; Industry = 'Food & Beverage'; ClientStage = 'Active Client'; IsActive = $true; InternalNotes = 'Imported from Atlas Client 360 / Microsoft' },
  @{ Title = 'That''s Kava LLC'; ClientCode = 'KAVA01'; DBA = 'That''s Kava'; Industry = 'Food & Beverage'; ClientStage = 'Alumni'; IsActive = $false; InternalNotes = 'Queued for import — confirm source match' },
  @{ Title = 'Christie''s Place LLC'; ClientCode = 'CPL01'; DBA = 'Christie''s Place'; Industry = 'Nonprofit'; ClientStage = 'Alumni'; IsActive = $false; InternalNotes = 'Queued for import — confirm source match' },
  @{ Title = 'Hart Family Dental'; ClientCode = 'HFD01'; DBA = 'Hart Family Dental'; Industry = 'Healthcare'; ClientStage = 'Active Client'; IsActive = $true; InternalNotes = 'Queued for import — confirm source match' },
  @{ Title = 'Lien Partners'; ClientCode = 'LIEN01'; DBA = 'Lienpartners'; Industry = 'Professional Services'; ClientStage = 'Active Client'; IsActive = $true; InternalNotes = 'Imported from Atlas Client 360 / Microsoft' }
)

if ($Client360JsonPath -and (Test-Path $Client360JsonPath)) {
  $c360 = Get-Content $Client360JsonPath -Raw | ConvertFrom-Json
  foreach ($c in @($c360.candidates + $c360.clients)) {
    if (-not $c) { continue }
    $title = [string](Get-HVCGPropertyValue -Object $c -Name 'displayName' -Default '')
    if ([string]::IsNullOrWhiteSpace($title)) { continue }
    $code = ($title -replace '[^A-Za-z0-9]', '').ToUpperInvariant()
    if ($code.Length -gt 12) { $code = $code.Substring(0, 12) }
    if ($code.Length -lt 3) { continue }
    if ($seed | Where-Object { $_.ClientCode -eq $code -or $_.Title -eq $title }) { continue }
    $seed += @{
      Title       = $title
      ClientCode  = $code
      ClientStage = if ($c.lifecycle -eq 'active') { 'Active Client' } elseif ($c.lifecycle -eq 'former') { 'Alumni' } else { 'Prospect' }
      IsActive    = ($c.lifecycle -eq 'active')
      InternalNotes = "Imported from Client 360 id=$($c.id)"
    }
  }
}

$existing = @(Get-PnPListItem -List 'HVCG_Clients' -PageSize 2000 -ErrorAction Stop)
$byCode = @{}
$byTitle = @{}
foreach ($item in $existing) {
  $f = $item.FieldValues
  if ($f.ClientCode) { $byCode[[string]$f.ClientCode] = $item }
  if ($f.Title) { $byTitle[[string]$f.Title] = $item }
}

$created = 0
$skipped = 0
foreach ($row in $seed) {
  if ($byCode.ContainsKey([string]$row.ClientCode) -or $byTitle.ContainsKey([string]$row.Title)) {
    $skipped++
    Write-HVCGLog -Level INFO -Message "Skip existing $($row.ClientCode) / $($row.Title)" -Report $Report
    continue
  }
  if ($WhatIf) {
    Write-HVCGLog -Level INFO -Message "WhatIf create $($row.ClientCode) $($row.Title)" -Report $Report
    continue
  }
  $values = @{
    Title      = [string]$row.Title
    ClientCode = [string]$row.ClientCode
    IsActive   = [bool]$row.IsActive
  }
  if ($row.DBA) { $values.DBA = [string]$row.DBA }
  if ($row.Industry) { $values.Industry = [string]$row.Industry }
  if ($row.ClientStage) { $values.ClientStage = [string]$row.ClientStage }
  if ($row.InternalNotes) { $values.InternalNotes = [string]$row.InternalNotes }

  Add-PnPListItem -List 'HVCG_Clients' -Values $values -ErrorAction Stop | Out-Null
  $created++
  Write-HVCGLog -Level SUCCESS -Message "Created $($row.ClientCode) $($row.Title)" -Report $Report
  $Report.ResourcesCreated.Add("Client:$($row.ClientCode)")
}

$Report.Success = $true
$Report.NextStep = "Created=$created Skipped=$skipped. Open $siteUrl lists/HVCG_Clients"
Save-HVCGDeploymentReport -Report $Report -RepoRoot $RepoRoot | Out-Null
Write-Host "Import complete created=$created skipped=$skipped"
try { Disconnect-PnPOnline -ErrorAction SilentlyContinue } catch {}
exit 0
