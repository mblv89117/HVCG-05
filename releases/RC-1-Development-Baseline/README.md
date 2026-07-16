# RC-1 Development Baseline

**Release candidate:** `RC-1-Development-Baseline`  
**STATUS:** Development Baseline Complete  
**Next milestone:** Production Deployment Planning  
**Environment proven:** HVCG Development only  
**Production:** not imported · not published · not activated in this milestone  

**Wait for Owner approval** before any Production planning execution, import, publish, or activate beyond what already exists in Development.

---

## Package contents

| Path | Description |
|------|-------------|
| `solution/` | Unmanaged Dev export with workflows, connection refs, env var definitions + values |
| `settings/deploymentSettings-template.json` | Import settings skeleton (Values / ConnectionIds empty) |
| `guides/OWNER_DEPLOYMENT_GUIDE.md` | Owner steps for any future non-Dev deploy |
| `guides/ROLLBACK_GUIDE.md` | Rollback for this RC |
| `docs/ENVIRONMENT_VARIABLES.md` | Env var inventory and Prod obtainment |
| `docs/CONNECTION_REFERENCES.md` | Connection reference inventory |
| `validation/` | Acceptance, export, and env-var gap reports |
| `smoke/` | Final CRM smoke JSON (Dev evidence) |
| `checksums/sha256.json` | File hashes |
| `version.json` | Release identity |

## Gates (do not violate)

- Do **not** publish Canvas.
- Do **not** activate new Production flows.
- Do **not** import this package into Production without Owner approval.
- Keep `hvcg_CrmEnableTeamsNotify=false` until Teams channel vars + Owner approval.

## Git identity

| Item | Value |
|------|--------|
| Branch | `agent/crm-dev-validation` |
| Milestone commit (this RC) | see `version.json` after push |
| Prior smoke commit | `a62e687` |
| Env-var remediation parent | `e107b1b` |
