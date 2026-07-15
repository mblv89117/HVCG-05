#Requires -Version 7.0
<#
.SYNOPSIS
  Offline unit tests for Install-HVCGSeedData client value mapping (StrictMode / -and parse).
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

$psm1 = Join-Path $RepoRoot 'deployment/lib/HVCG.Deployment.psm1'
Import-Module $psm1 -Force

$failures = [System.Collections.Generic.List[string]]::new()
function Assert-True {
  param([bool]$Condition, [string]$Name)
  if ($Condition) {
    Write-Host "  PASS: $Name" -ForegroundColor Green
  }
  else {
    Write-Host "  FAIL: $Name" -ForegroundColor Red
    $failures.Add($Name)
  }
}

Write-Host '=== HVCG Seed data (StrictMode / -and parse) ==='

$src = Get-Content -Path $psm1 -Raw

# Exact failure mode from Dev repair: -and bound as a parameter after -Name
$andAsParam = [regex]::IsMatch(
  $src,
  "Test-HVCGHasProperty\s+-Object\s+\$\w+\s+-Name\s+'[^']+'\s+-and"
)
Assert-True (-not $andAsParam) 'module must not pass -and as Test-HVCGHasProperty parameter'

Assert-True ($src -match 'function ConvertTo-HVCGSeedClientValues') 'ConvertTo-HVCGSeedClientValues present'
Assert-True ($src -match 'ConvertTo-HVCGSeedClientValues\s+-Client') 'Install-HVCGSeedData uses ConvertTo-HVCGSeedClientValues'

# Reproduce the parse error offline (documents the bug class)
$threwAndParam = $false
try {
  Invoke-Expression "if (Test-HVCGHasProperty -Object ([pscustomobject]@{DBA='x'}) -Name 'DBA' -and `$true) { `$null }"
}
catch {
  $threwAndParam = ($_.Exception.Message -match "parameter name 'and'")
}
Assert-True $threwAndParam 'bare Test-HVCGHasProperty ... -Name X -and reproduces parameter name and'

# Demo pack: sparse clients (no DBA) must not throw under StrictMode
$demoPath = Join-Path $RepoRoot 'sample-data/demo-pack.json'
$demo = Get-Content $demoPath -Raw | ConvertFrom-Json
Assert-True (@($demo.clients).Count -ge 2) 'demo-pack has multiple clients'

$withDba = $null
$withoutDba = $null
foreach ($c in $demo.clients) {
  if ((Test-HVCGHasProperty -Object $c -Name 'DBA')) {
    if ($null -eq $withDba) { $withDba = $c }
  }
  else {
    if ($null -eq $withoutDba) { $withoutDba = $c }
  }
}
Assert-True ($null -ne $withDba) 'demo-pack includes a client with DBA'
Assert-True ($null -ne $withoutDba) 'demo-pack includes a client without DBA'

$valsWith = ConvertTo-HVCGSeedClientValues -Client $withDba
Assert-True ($valsWith.ContainsKey('DBA')) 'DBA mapped when present'
Assert-True ($valsWith.DBA -eq $withDba.DBA) 'DBA value preserved'
Assert-True ($valsWith.ClientCode -eq $withDba.ClientCode) 'ClientCode mapped'

$valsWithout = ConvertTo-HVCGSeedClientValues -Client $withoutDba
Assert-True (-not $valsWithout.ContainsKey('DBA')) 'DBA omitted when missing'
Assert-True ($valsWithout.ContainsKey('ClientCode')) 'ClientCode still mapped without DBA'
Assert-True ($valsWithout.IsActive -is [bool]) 'IsActive is bool'

# Full pack sweep under StrictMode
foreach ($c in $demo.clients) {
  $v = ConvertTo-HVCGSeedClientValues -Client $c
  Assert-True (-not [string]::IsNullOrWhiteSpace([string]$v.ClientCode)) "client values for $($c.ClientCode)"
}

if ($failures.Count -gt 0) {
  Write-Host "RESULT: FAIL ($($failures.Count))" -ForegroundColor Red
  exit 1
}
Write-Host 'RESULT: PASS' -ForegroundColor Green
exit 0
