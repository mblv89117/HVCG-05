#Requires -Version 7.0
<#
.SYNOPSIS
  Runs HVCG pre-deployment validation. Exit 1 on critical failures.
#>
[CmdletBinding()]
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$JsonOut = '',
  [switch]$Strict
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Write-Host "=== HVCG Pre-Deployment Tests ===" -ForegroundColor Cyan
Write-Host "RepoRoot: $RepoRoot"

$failures = 0
$results = [ordered]@{
  started = (Get-Date).ToString('o')
  checks  = @()
}

function Add-Check($Name, $Passed, $Detail) {
  $script:results.checks += [pscustomobject]@{ name = $Name; passed = $Passed; detail = $Detail }
  if ($Passed) {
    Write-Host "PASS  $Name — $Detail" -ForegroundColor Green
  }
  else {
    Write-Host "FAIL  $Name — $Detail" -ForegroundColor Red
    $script:failures++
  }
}

# 1) Python schema validator
$py = Get-Command python3 -ErrorAction SilentlyContinue
if (-not $py) { $py = Get-Command python -ErrorAction SilentlyContinue }
if (-not $py) {
  Add-Check 'python_available' $false 'python3/python not found'
}
else {
  $outFile = if ($JsonOut) { $JsonOut } else { Join-Path $RepoRoot 'deployment/reports/predeploy-tests-latest.json' }
  $null = New-Item -ItemType Directory -Force -Path (Split-Path $outFile) 
  $args = @((Join-Path $RepoRoot 'tests/validate_predeployment.py'), '--json-out', $outFile)
  if ($Strict) { $args += '--strict' }
  & $py.Source @args
  $code = $LASTEXITCODE
  Add-Check 'schema_integrity' ($code -eq 0) "validate_predeployment.py exit=$code"
}

# 2) PowerShell script parse / existence
$requiredScripts = @(
  'deployment/Deploy-HVCGDevelopment.ps1',
  'deployment/lib/HVCG.Deployment.psm1',
  'deployment/scripts/Install-HVCGLists.ps1',
  'deployment/scripts/New-HVCGEntraGroups.ps1',
  'deployment/scripts/New-HVCGClientWorkspace.ps1',
  'deployment/scripts/New-HVCGProjectFromTemplate.ps1',
  'deployment/install/Install-HVCGOS.ps1',
  'deployment/upgrade/Upgrade-HVCGOS.ps1',
  'deployment/rollback/Rollback-HVCGOS.ps1',
  'deployment/backup/Backup-HVCGOS.ps1',
  'deployment/restore/Restore-HVCGOS.ps1',
  'deployment/health/Invoke-HVCGOSOperationalHealth.ps1'
)
foreach ($rel in $requiredScripts) {
  $p = Join-Path $RepoRoot $rel
  Add-Check "script_exists:$rel" (Test-Path $p) $p
}

# 3) Parse PowerShell for syntax where possible
foreach ($rel in @('deployment/Deploy-HVCGDevelopment.ps1', 'deployment/lib/HVCG.Deployment.psm1', 'tests/Invoke-HVCGPreDeploymentTests.ps1')) {
  $p = Join-Path $RepoRoot $rel
  if (-not (Test-Path $p)) { continue }
  try {
    $tokens = $null
    $errors = $null
    $null = [System.Management.Automation.Language.Parser]::ParseFile($p, [ref]$tokens, [ref]$errors)
    $ok = ($null -eq $errors -or $errors.Count -eq 0)
    $detail = if ($ok) { 'parsed OK' } else { ($errors | ForEach-Object { $_.ToString() }) -join '; ' }
    Add-Check "ps_parse:$rel" $ok $detail
  }
  catch {
    Add-Check "ps_parse:$rel" $false $_.Exception.Message
  }
}

# 4) Environment examples + placeholders
foreach ($rel in @('config/environments/development.example.json', 'config/environments/production.example.json')) {
  $p = Join-Path $RepoRoot $rel
  if (-not (Test-Path $p)) {
    Add-Check "env_example:$rel" $false 'missing'
    continue
  }
  $cfg = Get-Content $p -Raw | ConvertFrom-Json
  $hasRequiredMarker = ($cfg.tenant.domain -match 'REQUIRED')
  Add-Check "env_placeholders:$rel" $hasRequiredMarker "requiredFields=$($cfg.requiredFields.Count)"
}

# 5) Flow definitions present
$defIndex = Join-Path $RepoRoot 'src/power-automate/definitions/_index.json'
if (Test-Path $defIndex) {
  $di = Get-Content $defIndex -Raw | ConvertFrom-Json
  Add-Check 'flow_definitions' ($di.count -ge 10) "count=$($di.count)"
}
else {
  Add-Check 'flow_definitions' $false 'definitions index missing'
}

# 6) No secrets in tracked env examples
$secretPatterns = 'password\s*=|client_secret\s*=|Bearer\s+[A-Za-z0-9_\-\.]+'
$suspect = Select-String -Path (Join-Path $RepoRoot 'config/environments/*.example.json') -Pattern $secretPatterns -ErrorAction SilentlyContinue
Add-Check 'no_secrets_in_examples' ($null -eq $suspect -or $suspect.Count -eq 0) 'scanned example configs'

# 7) Release packaging gate
$versionFile = Join-Path $RepoRoot 'VERSION'
$versionJson = Join-Path $RepoRoot 'version.json'
if ((Test-Path $versionFile) -and (Test-Path $versionJson)) {
  $v = (Get-Content $versionFile -Raw).Trim()
  $meta = Get-Content $versionJson -Raw | ConvertFrom-Json
  Add-Check 'semver_sync' ($meta.version -eq $v) "VERSION=$v version.json=$($meta.version)"
  $notes = Join-Path $RepoRoot "releases/v$v/notes/RELEASE_NOTES.md"
  Add-Check 'release_notes' (Test-Path $notes) $notes
  $baseline = Join-Path $RepoRoot 'releases/migrations/20260714_001_baseline_v1_0_0.json'
  Add-Check 'baseline_migration' (Test-Path $baseline) $baseline
  $install = Join-Path $RepoRoot 'deployment/install/Install-HVCGOS.ps1'
  Add-Check 'installer_present' (Test-Path $install) $install
  $mig110 = Join-Path $RepoRoot 'releases/migrations/20260714_002_intelligence_ai_backup_v1_1_0.json'
  Add-Check 'migration_1_1_0' (Test-Path $mig110) $mig110
  $notes110 = Join-Path $RepoRoot 'releases/v1.1.0/notes/RELEASE_NOTES.md'
  if ($v -eq '1.1.0') {
    Add-Check 'release_notes_1_1_0' (Test-Path $notes110) $notes110
  }
  $immutable = Join-Path $RepoRoot 'releases/v1.0.0/notes/RELEASE_NOTES.md'
  Add-Check 'release_immutability_v1_0_0' (Test-Path $immutable) $immutable
}
else {
  Add-Check 'semver_files' $false 'VERSION or version.json missing'
}

# 8) Intelligence / AI / backup / upgrade path tests
if ($py) {
  & $py.Source (Join-Path $RepoRoot 'tests/intelligence/test_intelligence_ai_backup.py')
  Add-Check 'intelligence_ai_backup' ($LASTEXITCODE -eq 0) 'test_intelligence_ai_backup.py'
  & $py.Source (Join-Path $RepoRoot 'tests/unit/test_pnp_auth.py')
  Add-Check 'pnp_auth_packaging' ($LASTEXITCODE -eq 0) 'test_pnp_auth.py'
  & $py.Source (Join-Path $RepoRoot 'tests/unit/test_field_provisioning.py')
  Add-Check 'field_provisioning_strictmode' ($LASTEXITCODE -eq 0) 'test_field_provisioning.py'
  & $py.Source (Join-Path $RepoRoot 'tests/unit/test_opportunity_crm.py')
  Add-Check 'opportunity_crm_module' ($LASTEXITCODE -eq 0) 'test_opportunity_crm.py'
  & $py.Source (Join-Path $RepoRoot 'tests/unit/test_opportunity_migration.py')
  Add-Check 'opportunity_crm_migration' ($LASTEXITCODE -eq 0) 'test_opportunity_migration.py'
  & $py.Source (Join-Path $RepoRoot 'tests/unit/test_opportunity_lifecycle.py')
  Add-Check 'opportunity_crm_lifecycle' ($LASTEXITCODE -eq 0) 'test_opportunity_lifecycle.py'
  & $py.Source (Join-Path $RepoRoot 'tests/crm/smoke_helpers.py')
  Add-Check 'opportunity_crm_smoke_helpers' ($LASTEXITCODE -eq 0) 'tests/crm/smoke_helpers.py'
}

# 8a) Opportunity CRM offline acceptance (Agent 5)
$crmAccept = Join-Path $RepoRoot 'scripts/Test-HVCGOpportunityCrmAcceptance.ps1'
if (Test-Path $crmAccept) {
  try {
    & pwsh -NoProfile -File $crmAccept -RepoRoot $RepoRoot -Offline
    Add-Check 'opportunity_crm_acceptance_offline' ($LASTEXITCODE -eq 0) 'Test-HVCGOpportunityCrmAcceptance.ps1 -Offline'
  }
  catch {
    Add-Check 'opportunity_crm_acceptance_offline' $false $_.Exception.Message
  }
}
else {
  Add-Check 'opportunity_crm_acceptance_offline' $false 'Test-HVCGOpportunityCrmAcceptance.ps1 missing'
}

$crmSmokeDoc = Join-Path $RepoRoot 'docs/crm/SMOKE_TEST_CHECKLIST.md'
Add-Check 'opportunity_crm_smoke_checklist' (Test-Path $crmSmokeDoc) $crmSmokeDoc

# 8b) PnP retry / backoff / propagation unit tests
$retryTest = Join-Path $RepoRoot 'tests/unit/Test-HVCGPnPRetry.ps1'
if (Test-Path $retryTest) {
  try {
    & pwsh -NoProfile -File $retryTest -RepoRoot $RepoRoot
    Add-Check 'pnp_retry_layer' ($LASTEXITCODE -eq 0) 'Test-HVCGPnPRetry.ps1'
  }
  catch {
    Add-Check 'pnp_retry_layer' $false $_.Exception.Message
  }
}
else {
  Add-Check 'pnp_retry_layer' $false 'Test-HVCGPnPRetry.ps1 missing'
}

# 8b2) Lookup FieldXml provisioning (PnP 3.x -Values fix)
$lookupTest = Join-Path $RepoRoot 'tests/unit/Test-HVCGLookupFieldProvisioning.ps1'
if (Test-Path $lookupTest) {
  try {
    & pwsh -NoProfile -File $lookupTest -RepoRoot $RepoRoot
    Add-Check 'lookup_field_provisioning' ($LASTEXITCODE -eq 0) 'Test-HVCGLookupFieldProvisioning.ps1'
  }
  catch {
    Add-Check 'lookup_field_provisioning' $false $_.Exception.Message
  }
}
else {
  Add-Check 'lookup_field_provisioning' $false 'Test-HVCGLookupFieldProvisioning.ps1 missing'
}

# 8c) Schema validation drift report unit tests
$schemaValTest = Join-Path $RepoRoot 'tests/unit/Test-HVCGSchemaValidation.ps1'
if (Test-Path $schemaValTest) {
  try {
    & pwsh -NoProfile -File $schemaValTest -RepoRoot $RepoRoot
    Add-Check 'schema_validation_drift' ($LASTEXITCODE -eq 0) 'Test-HVCGSchemaValidation.ps1'
  }
  catch {
    Add-Check 'schema_validation_drift' $false $_.Exception.Message
  }
}
else {
  Add-Check 'schema_validation_drift' $false 'Test-HVCGSchemaValidation.ps1 missing'
}

# 8d) Seed data StrictMode / -and parameter parse unit tests
$seedTest = Join-Path $RepoRoot 'tests/unit/Test-HVCGSeedData.ps1'
if (Test-Path $seedTest) {
  try {
    & pwsh -NoProfile -File $seedTest -RepoRoot $RepoRoot
    Add-Check 'seed_data_strictmode' ($LASTEXITCODE -eq 0) 'Test-HVCGSeedData.ps1'
  }
  catch {
    Add-Check 'seed_data_strictmode' $false $_.Exception.Message
  }
}
else {
  Add-Check 'seed_data_strictmode' $false 'Test-HVCGSeedData.ps1 missing'
}

if (-not $py) {
  Add-Check 'intelligence_ai_backup' $false 'python unavailable'
}

# 9) Operational health report generation (WhatIf — no tenant)
$healthScript = Join-Path $RepoRoot 'deployment/health/Invoke-HVCGOSOperationalHealth.ps1'
if (Test-Path $healthScript) {
  try {
    & pwsh -NoProfile -File $healthScript -Environment development -WhatIf
    $latestHealth = Join-Path $RepoRoot 'deployment/reports/health/operational-latest.json'
    $okHealth = (Test-Path $latestHealth)
    if ($okHealth) {
      $hj = Get-Content $latestHealth -Raw | ConvertFrom-Json
      $okHealth = ($null -ne $hj.overallStatus)
    }
    Add-Check 'operational_health_report' $okHealth $latestHealth
  }
  catch {
    Add-Check 'operational_health_report' $false $_.Exception.Message
  }
}
else {
  Add-Check 'operational_health_report' $false 'script missing'
}

# 10) Backup WhatIf + restore gate parse
foreach ($rel in @(
  'deployment/backup/Backup-HVCGOS.ps1',
  'deployment/restore/Restore-HVCGOS.ps1',
  'deployment/health/Invoke-HVCGOSOperationalHealth.ps1'
)) {
  $p = Join-Path $RepoRoot $rel
  if (-not (Test-Path $p)) { continue }
  try {
    $tokens = $null; $errors = $null
    $null = [System.Management.Automation.Language.Parser]::ParseFile($p, [ref]$tokens, [ref]$errors)
    $ok = ($null -eq $errors -or $errors.Count -eq 0)
    $detail = if ($ok) { 'parsed OK' } else { ($errors | ForEach-Object { $_.ToString() }) -join '; ' }
    Add-Check "ps_parse:$rel" $ok $detail
  }
  catch {
    Add-Check "ps_parse:$rel" $false $_.Exception.Message
  }
}

$results.finished = (Get-Date).ToString('o')
$results.passed = ($failures -eq 0)
$results.failureCount = $failures

if ($JsonOut) {
  ($results | ConvertTo-Json -Depth 6) | Set-Content -Path $JsonOut -Encoding UTF8
}
else {
  $out = Join-Path $RepoRoot 'deployment/reports/predeploy-tests-latest.json'
  New-Item -ItemType Directory -Force -Path (Split-Path $out) | Out-Null
  ($results | ConvertTo-Json -Depth 6) | Set-Content -Path $out -Encoding UTF8
}

if ($failures -gt 0) {
  Write-Host "RESULT: FAIL ($failures checks)" -ForegroundColor Red
  exit 1
}
Write-Host "RESULT: PASS" -ForegroundColor Green
exit 0
