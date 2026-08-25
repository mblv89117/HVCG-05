#!/usr/bin/env pwsh
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/_Comms.ps1"
Invoke-HvcgComms dashboard
Write-Host ""
Invoke-HvcgComms summary
