# Shared helper for HVCG agent-comms PowerShell wrappers.
function Get-HvcgRepoRoot {
    if ($env:HVCG_REPO_ROOT) { return (Resolve-Path $env:HVCG_REPO_ROOT).Path }
    $dir = $PSScriptRoot
    while ($dir -and $dir -ne [IO.Path]::GetPathRoot($dir)) {
        if ((Test-Path (Join-Path $dir '.agent-comms')) -or (Test-Path (Join-Path $dir '.git'))) {
            return $dir
        }
        $dir = Split-Path $dir -Parent
    }
    return (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
}

function Invoke-HvcgComms {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
    $root = Get-HvcgRepoRoot
    $env:HVCG_REPO_ROOT = $root
    $py = if ($env:PYTHON) { $env:PYTHON } else { 'python3' }
    $comms = Join-Path $root 'scripts/agent-comms/lib/comms.py'
    & $py $comms @Args
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
