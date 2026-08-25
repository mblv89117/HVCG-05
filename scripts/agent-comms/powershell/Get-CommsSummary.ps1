#!/usr/bin/env pwsh
param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Remaining)
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/_Comms.ps1"
Invoke-HvcgComms summary @Remaining
