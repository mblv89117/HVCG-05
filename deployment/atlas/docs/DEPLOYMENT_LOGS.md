# Deployment Logs — Project Atlas

## Purpose

Structured JSON logs for every Atlas operation (preflight, health, smoke, deploy, rollback).

## Location

`deployment/atlas/logs/deploy-<stamp>.json`

## Writer

```powershell
pwsh -File ./deployment/atlas/scripts/Write-AtlasDeploymentLog.ps1 `
  -Environment development `
  -Action preflight `
  -Status started
```

## Schema

See `templates/deployment-log.json`.

## Retention

- Keep logs in worktree for QA.
- Do not commit secrets.
- Prod operations remain outside Atlas logs (use `deployment/release-ops/evidence/`).
