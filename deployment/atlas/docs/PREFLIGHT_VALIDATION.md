# Pre-flight Validation — Project Atlas

## Purpose

Fail closed before any deploy wrapper runs.

## Checks

| ID | Check |
|----|-------|
| PF-01 | Environment guard PASS |
| PF-02 | Atlas manifest readable |
| PF-03 | Environment definition exists |
| PF-04 | Feature flags file exists; Teams/email false |
| PF-05 | Repo predeploy tests available |
| PF-06 | No Production keywords in selected config binding (best-effort) |

## Command

```powershell
pwsh -File ./deployment/atlas/scripts/Invoke-AtlasPreflight.ps1 -Environment development
```

## Output

`deployment/atlas/reports/preflight-<stamp>.json` using `templates/preflight-report.json`.
