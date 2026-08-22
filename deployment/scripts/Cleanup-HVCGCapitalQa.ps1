#Requires -Version 7.0
<#
.SYNOPSIS
  Mark or delete labeled SYNTHETIC QA capital rows. Keeps SYN01 client and Entra group.

.DESCRIPTION
  Targets only HVCG_CapitalOpportunities / DocumentRequests / LenderOutreach items whose Title
  contains "SYNTHETIC QA". Default WhatIf. Never touches ACCG/PDG or other production clients.
#>
[CmdletBinding()]
param(
  [switch]$Apply,
  [switch]$Delete,
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ExpectedTenantId = '3df46563-86f3-4414-87fd-84ba967741ef'
$SiteUrl = 'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter'
$Lists = @(
  @{ Name = 'HVCG_CapitalOpportunities'; Id = '255763b8-7c44-446b-8290-adde5c3c6f66' }
  @{ Name = 'HVCG_DocumentRequests'; Id = '89a421e9-3086-47ef-80c3-214500d3d92c' }
  @{ Name = 'HVCG_LenderOutreach'; Id = 'c49d02bb-eab5-44b5-8232-714e30867887' }
)

$acct = az account show | ConvertFrom-Json
if ($acct.tenantId -ne $ExpectedTenantId) { throw "Wrong tenant $($acct.tenantId)" }

Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.Deployment.psm1') -Force
$Report = New-HVCGDeploymentReport -Environment 'capital-qa-cleanup' -RepoRoot $RepoRoot
$cfgPath = Join-Path $RepoRoot 'config/environments/development.json'
$Config = if (Test-Path $cfgPath) { Get-Content $cfgPath -Raw | ConvertFrom-Json } else { [pscustomobject]@{ authentication = [pscustomobject]@{} } }
$null = Initialize-HVCGPnPAuth -Config $Config -Report $Report
Connect-HVCGPnPOnline -Url $SiteUrl -Config $Config -Report $Report

foreach ($list in $Lists) {
  $got = Get-PnPList -Identity $list.Name
  if (([string]$got.Id).ToLowerInvariant() -ne $list.Id) {
    throw "List $($list.Name) id mismatch."
  }
  $items = Get-PnPListItem -List $list.Name -PageSize 200
  $hits = @($items | Where-Object { [string]$_.FieldValues.Title -match 'SYNTHETIC QA' })
  Write-Host "$($list.Name): $($hits.Count) SYNTHETIC QA row(s)"
  foreach ($item in $hits) {
    $plan = "$(if ($Delete) { 'DELETE' } else { 'MARK' }) $($list.Name)#$($item.Id) $($item.FieldValues.Title)"
    if (-not $Apply) {
      Write-Host "WHATIF $plan"
      continue
    }
    if ($Delete) {
      Remove-PnPListItem -List $list.Name -Identity $item.Id -Force
    } else {
      $notes = [string]$item.FieldValues.Notes
      if ($notes -notmatch 'QA COMPLETE') {
        Set-PnPListItem -List $list.Name -Identity $item.Id -Values @{ Notes = "$notes`nQA COMPLETE — labeled synthetic; not a live client." }
      }
    }
    Write-Host $plan
  }
}
Write-Host 'SYN01 client row and HVCG-Client-SYN01 were not modified.'
