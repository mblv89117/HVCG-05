# Feature Flags — Project Atlas

## Purpose

Environment-scoped toggles for outbound and progressive delivery. Defaults are safe.

## Files

| Environment | File |
|-------------|------|
| development | `flags/feature-flags.development.json` |
| testing | `flags/feature-flags.testing.json` |
| staging | `flags/feature-flags.staging.json` |
| production | `flags/feature-flags.production.json` (all Off / blocked) |

## Required flags

| Flag | Default | Notes |
|------|---------|-------|
| `CrmEnableTeamsNotify` | `false` | Must stay Off without owner approval |
| `EnableClientEmails` | `false` | Must stay Off without owner approval |
| `CanvasPublishEnabled` | `false` | D-002 gated |
| `PilotImportEnabled` | `false` | Track 2 |
| `BlueGreenSwapEnabled` | `false` | Staging/Prod architecture |
| `AtlasAllowProduction` | `false` | Framework kill-switch; must remain false |

## Change control

1. Edit only the target environment flags file.
2. Record change in deployment log.
3. Production flag file must not be used by Atlas scripts.
