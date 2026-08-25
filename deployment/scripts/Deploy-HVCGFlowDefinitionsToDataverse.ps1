#Requires -Version 7.0
<#
.SYNOPSIS
  Pushes real (non-scaffold) Power Automate flow definitions into an existing Dataverse
  environment by PATCHing each cloud flow's clientdata.

.DESCRIPTION
  For each target flow this script:
    1. Reads the definition JSON from src/power-automate/definitions/<name>.definition.json
    2. Looks up the matching modern cloud flow (workflow, category 5) by name
    3. Deactivates it (statecode=0) if it is currently activated
    4. PATCHes clientdata wrapping { properties: { connectionReferences, definition }, schemaVersion }
    5. Reactivates it (statecode=1)
  A JSON + Markdown report is written under deployment/reports/.

  Authentication uses the Azure CLI token for the Dataverse org:
    az account get-access-token --resource <DataverseUrl>
  You must have run `az login` (and selected the correct tenant) beforehand.

  HVCG_EvaFormCreateLead is intentionally NEVER activated by this script.

.NOTES
  No secrets are written to disk. The access token is held in memory only.
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [Parameter(Mandatory = $false)]
  [string]$DataverseUrl = 'https://orgee2f7545.crm.dynamics.com',

  [Parameter(Mandatory = $false)]
  [string[]]$FlowNames = @(
    'HVCG_CreateClientWorkspace',
    'HVCG_CreateProjectFromTemplate',
    'HVCG_CreateDocumentRequests',
    'HVCG_DeliverableApproval',
    'HVCG_ExecutiveDecisionEscalation'
  ),

  [Parameter(Mandatory = $false)]
  [string]$DefinitionsDir,

  [Parameter(Mandatory = $false)]
  [switch]$SkipReactivate
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
if (-not $DefinitionsDir) {
  $DefinitionsDir = Join-Path $RepoRoot 'src/power-automate/definitions'
}

# Flows that must never be activated by this tooling.
$NeverActivate = @('HVCG_EvaFormCreateLead')

$ApiVersion = 'v9.2'
$BaseUrl = "$($DataverseUrl.TrimEnd('/'))/api/data/$ApiVersion"

function Write-Step { param([string]$Message) Write-Host "[STEP] $Message" -ForegroundColor Cyan }
function Write-Ok { param([string]$Message) Write-Host "[ OK ] $Message" -ForegroundColor Green }
function Write-Warn2 { param([string]$Message) Write-Host "[WARN] $Message" -ForegroundColor Yellow }
function Write-Err { param([string]$Message) Write-Host "[FAIL] $Message" -ForegroundColor Red }

function Get-DataverseToken {
  param([string]$Resource)
  Write-Step "Acquiring Dataverse access token via az account get-access-token ($Resource)"
  $raw = az account get-access-token --resource $Resource 2>$null
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($raw)) {
    throw "Failed to acquire token. Run 'az login' and ensure you have access to $Resource."
  }
  $tok = $raw | ConvertFrom-Json
  return $tok.accessToken
}

function Invoke-Dv {
  param(
    [Parameter(Mandatory)][ValidateSet('GET', 'POST', 'PATCH', 'DELETE')][string]$Method,
    [Parameter(Mandatory)][string]$Url,
    [hashtable]$Headers,
    [string]$Body
  )
  $params = @{
    Method  = $Method
    Uri     = $Url
    Headers = $Headers
  }
  if ($PSBoundParameters.ContainsKey('Body') -and $Body) {
    $params.Body = $Body
    $params.ContentType = 'application/json'
  }
  return Invoke-RestMethod @params
}

$report = [ordered]@{
  generatedAt  = (Get-Date).ToString('o')
  dataverseUrl = $DataverseUrl
  apiVersion   = $ApiVersion
  whatIf       = [bool]$WhatIfPreference
  flows        = @()
  errors       = @()
  success      = $false
}

try {
  $token = Get-DataverseToken -Resource $DataverseUrl
  $headers = @{
    Authorization    = "Bearer $token"
    'OData-MaxVersion' = '4.0'
    'OData-Version'    = '4.0'
    Accept            = 'application/json'
    'If-Match'        = '*'
  }

  foreach ($name in $FlowNames) {
    $flowResult = [ordered]@{
      name          = $name
      found         = $false
      workflowId    = $null
      wasActive     = $null
      patched       = $false
      reactivated   = $false
      skippedActivate = $false
      error         = $null
    }

    try {
      if ($NeverActivate -contains $name) {
        Write-Warn2 "$name is in the never-activate list; skipping entirely."
        $flowResult.error = 'Skipped (never-activate list)'
        $report.flows += $flowResult
        continue
      }

      $defPath = Join-Path $DefinitionsDir "$name.definition.json"
      if (-not (Test-Path $defPath)) {
        throw "Definition file not found: $defPath"
      }
      $def = Get-Content -Path $defPath -Raw | ConvertFrom-Json

      Write-Step "Looking up cloud flow '$name'"
      $filter = "name eq '$name' and category eq 5"
      $select = 'workflowid,name,statecode,statuscode,category'
      $lookupUrl = "$BaseUrl/workflows?`$filter=$([uri]::EscapeDataString($filter))&`$select=$select"
      $lookup = Invoke-Dv -Method GET -Url $lookupUrl -Headers $headers

      $wf = @($lookup.value)
      if ($wf.Count -eq 0) {
        throw "No modern cloud flow (category 5) named '$name' found in $DataverseUrl."
      }
      if ($wf.Count -gt 1) {
        Write-Warn2 "Multiple flows named '$name' found; using the first."
      }
      $workflow = $wf[0]
      $flowResult.found = $true
      $flowResult.workflowId = $workflow.workflowid
      $wasActive = ($workflow.statecode -eq 1)
      $flowResult.wasActive = $wasActive
      Write-Ok "Found $name (workflowid=$($workflow.workflowid), statecode=$($workflow.statecode))"

      # Build clientdata wrapper.
      $clientDataObj = [ordered]@{
        properties = [ordered]@{
          connectionReferences = $def.connectionReferences
          definition           = $def.definition
        }
        schemaVersion = '1.0.0.0'
      }
      $clientDataString = $clientDataObj | ConvertTo-Json -Depth 80 -Compress
      $patchBody = @{ clientdata = $clientDataString } | ConvertTo-Json -Depth 4

      $wfUrl = "$BaseUrl/workflows($($workflow.workflowid))"

      # Deactivate if currently active (definition PATCH requires a draft flow).
      if ($wasActive) {
        if ($PSCmdlet.ShouldProcess($name, 'Deactivate (statecode=0)')) {
          Write-Step "Deactivating $name"
          $deactivate = @{ statecode = 0; statuscode = 1 } | ConvertTo-Json
          Invoke-Dv -Method PATCH -Url $wfUrl -Headers $headers -Body $deactivate | Out-Null
          Write-Ok "Deactivated $name"
        }
      }

      # PATCH clientdata.
      if ($PSCmdlet.ShouldProcess($name, 'PATCH clientdata')) {
        Write-Step "Patching clientdata for $name ($([math]::Round($clientDataString.Length / 1024, 1)) KB)"
        Invoke-Dv -Method PATCH -Url $wfUrl -Headers $headers -Body $patchBody | Out-Null
        $flowResult.patched = $true
        Write-Ok "Patched $name"
      }

      # Reactivate.
      if ($SkipReactivate) {
        $flowResult.skippedActivate = $true
        Write-Warn2 "SkipReactivate set; leaving $name deactivated."
      }
      elseif ($PSCmdlet.ShouldProcess($name, 'Reactivate (statecode=1)')) {
        Write-Step "Reactivating $name"
        $activate = @{ statecode = 1; statuscode = 2 } | ConvertTo-Json
        Invoke-Dv -Method PATCH -Url $wfUrl -Headers $headers -Body $activate | Out-Null
        $flowResult.reactivated = $true
        Write-Ok "Reactivated $name"
      }
    }
    catch {
      $msg = "$name`: $($_.Exception.Message)"
      Write-Err $msg
      $flowResult.error = $_.Exception.Message
      $report.errors += $msg
    }

    $report.flows += $flowResult
  }

  $report.success = ($report.errors.Count -eq 0)
}
catch {
  $report.errors += $_.Exception.Message
  Write-Err $_.Exception.Message
}
finally {
  $reportDir = Join-Path $RepoRoot 'deployment/reports'
  New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $jsonPath = Join-Path $reportDir "flow-definitions-deploy-$stamp.json"
  $latestJson = Join-Path $reportDir 'flow-definitions-deploy-latest.json'
  $json = ($report | ConvertTo-Json -Depth 8)
  Set-Content -Path $jsonPath -Value $json -Encoding UTF8
  Set-Content -Path $latestJson -Value $json -Encoding UTF8

  $md = @"
# HVCG Flow Definition Dataverse Deploy

- **When:** $($report.generatedAt)
- **Dataverse:** $($report.dataverseUrl)
- **API version:** $($report.apiVersion)
- **WhatIf:** $($report.whatIf)
- **Success:** $($report.success)

## Flows
$(($report.flows | ForEach-Object {
  "- **$($_.name)** found=$($_.found) wasActive=$($_.wasActive) patched=$($_.patched) reactivated=$($_.reactivated)$(if ($_.error) { " error=$($_.error)" })"
}) -join "`n")

## Errors
$(if ($report.errors.Count -eq 0) { '- none' } else { ($report.errors | ForEach-Object { "- $_" }) -join "`n" })
"@
  Set-Content -Path ($jsonPath -replace '\.json$', '.md') -Value $md -Encoding UTF8
  Set-Content -Path (Join-Path $reportDir 'flow-definitions-deploy-latest.md') -Value $md -Encoding UTF8

  Write-Host ""
  Write-Host "Report: $jsonPath" -ForegroundColor Cyan
}

if (-not $report.success) { exit 1 }
