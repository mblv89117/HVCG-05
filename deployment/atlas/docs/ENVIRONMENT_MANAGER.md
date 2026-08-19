# Environment Manager — Project Atlas

## Purpose

Select, validate, and guard Atlas environments before any validation or deploy wrapper runs.

## Responsibilities

1. Load `environments/environments.index.json`
2. Resolve environment definition JSON
3. Enforce `connectAllowed` / `deployAllowed`
4. Refuse Production (and any Prod keyword) via `Test-AtlasEnvironmentGuard.ps1`
5. Bind to repo config examples under `config/environments/` (never invent secrets)

## Commands

```powershell
# Pass — development
pwsh -File ./deployment/atlas/scripts/Test-AtlasEnvironmentGuard.ps1 -Environment development

# Fail — production (expected)
pwsh -File ./deployment/atlas/scripts/Test-AtlasEnvironmentGuard.ps1 -Environment production
```

## Selection rules

| Requested env | Connect | Deploy (Atlas wrappers) | Outcome |
|---------------|---------|-------------------------|---------|
| development | Yes | Yes | Allowed |
| testing | Yes | No | Guard may pass connect-only checks; deploy wrappers refuse |
| staging | Yes | No | Same as testing |
| production | No | No | **Hard fail** |

## Adding an environment

1. Add `environments/<id>.json` from Development template.
2. Register in `environments.index.json`.
3. Add `flags/feature-flags.<id>.json`.
4. Document promotion path in `docs/RELEASE_PIPELINE.md`.
5. Never enable `connectAllowed: true` for production inside Atlas without a new owner-approved framework revision.

## Out of scope

- Creating Power Platform environments
- Writing to Production Dataverse / SharePoint
- Changing Track-1 Live-Internal freeze artifacts
