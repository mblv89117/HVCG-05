<#
.SYNOPSIS
  Write a structured Atlas deployment log entry.
#>
[CmdletBinding()]
param(
    [ValidateSet('development', 'testing', 'staging', 'production')]
    [string]$Environment = 'development',
    [Parameter(Mandatory = $true)]
    [ValidateSet('preflight', 'health', 'smoke', 'deploy', 'postdeploy', 'rollback', 'release-notes')]
    [string]$Action,
    [ValidateSet('started', 'succeeded', 'failed', 'blocked')]
    [string]$Status = 'started',
    [string]$Detail = ''
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AtlasRoot = Split-Path -Parent $ScriptDir

if ($Environment -eq 'production' -or $Action -eq 'deploy' -and $Environment -ne 'development') {
    if ($Environment -eq 'production') {
        Write-Error 'ATLAS: refusing to write production execution logs via Atlas.'
        exit 2
    }
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$logDir = Join-Path $AtlasRoot 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$out = Join-Path $logDir "deploy-$stamp.json"
$obj = [ordered]@{
    generated         = (Get-Date).ToString('o')
    environment       = $Environment
    action            = $Action
    status            = $Status
    frameworkVersion  = '0.1.0-dev'
    operator          = $env:USER
    details           = @{ message = $Detail }
    relatedFiles      = @()
    productionTouch   = $false
}
$obj | ConvertTo-Json -Depth 6 | Set-Content $out
Write-Host "LOG FILE=$out"
exit 0
