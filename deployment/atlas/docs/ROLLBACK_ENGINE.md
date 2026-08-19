# Rollback Engine — Project Atlas

## Purpose

Standardize how to reverse a failed or undesired Development (and future non-Prod) deployment using Atlas checklists + existing HVCG rollback scripts.

## Principles

1. Prefer **disable** (flows Off / feature flags Off) before uninstall.
2. Prefer **re-import prior package** over destructive deletes.
3. Never delete Production environments or Prod SharePoint sites from Atlas.
4. Production rollback remains owned by Track-1 freeze runbooks — Atlas does not execute it.

## Engine stages

| Stage | Action | Artifact |
|-------|--------|----------|
| R0 Detect | Capture failure log + environment id | `logs/deploy-*.json` |
| R1 Contain | Turn feature flags / flows Off | Feature flags + Maker |
| R2 Restore package | Re-apply last known-good Dev package | `deployment/rollback/Rollback-HVCGOS.ps1` |
| R3 Validate | Preflight + health + smoke | Atlas scripts |
| R4 Report | Write rollback log + release note addendum | Deployment logs |

## Dev rollback command map

```powershell
# Existing product rollback (Dev)
pwsh -File ./deployment/rollback/Rollback-HVCGOS.ps1 -Environment development

# Atlas post-rollback validation (when QA approves running)
pwsh -File ./deployment/atlas/scripts/Invoke-AtlasPostDeployValidate.ps1 -Environment development
```

## Production reference (read-only)

If an operator needs Prod rollback procedure, use (do not run from Atlas):

- `releases/Track-1-Live-Internal/guides/ROLLBACK.md`
- `deployment/release-ops/ROLLBACK_RUNBOOK.md`

## Checklist

See `checklists/rollback.md`.
