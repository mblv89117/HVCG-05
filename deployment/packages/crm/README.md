# CRM Development packages

Dev-only solution export and validation artifacts for Opportunity CRM.

| Artifact | Description |
|----------|-------------|
| `HVCGCommandCenterDev-unmanaged-*.zip` | Live unmanaged export from HVCG Development |
| `export-inspect-*/` | Unpacked export for review |
| `enriched-validation-*/` | Export + repo ConnectionReferences + EnvironmentVariableDefinitions |
| `MANIFEST.json` | Machine-readable validation result |

See `docs/crm/SOLUTION_EXPORT_VALIDATION.md` and `docs/crm/CANVAS_APP_OWNER_GUIDE.md`.

Do **not** import these zips to Production. Do **not** publish the canvas app without owner approval.
