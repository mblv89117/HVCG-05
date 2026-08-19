<#
.SYNOPSIS
  Atlas environment hard guard. Refuses Production.
.NOTES
  Offline — does not connect to Dataverse or SharePoint.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('development', 'testing', 'staging', 'production')]
    [string]$Environment
)

$ErrorActionPreference = 'Stop'
$AtlasRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$IndexPath = Join-Path $AtlasRoot 'environments/environments.index.json'
$DefPath = Join-Path $AtlasRoot "environments/$Environment.json"

if (-not (Test-Path $IndexPath)) { throw "Missing environments index: $IndexPath" }
if (-not (Test-Path $DefPath)) { throw "Missing environment definition: $DefPath" }

$def = Get-Content $DefPath -Raw | ConvertFrom-Json

if ($Environment -eq 'production' -or $def.connectAllowed -eq $false) {
    Write-Host "ATLAS GUARD BLOCKED — environment=$Environment connectAllowed=$($def.connectAllowed) deployAllowed=$($def.deployAllowed)"
    Write-Host "ATLAS GUARD: Production / non-connectable environment is blocked. Do not connect. Do not deploy."
    exit 2
}

Write-Host "ATLAS GUARD PASS — environment=$Environment connectAllowed=$($def.connectAllowed) deployAllowed=$($def.deployAllowed)"
exit 0
