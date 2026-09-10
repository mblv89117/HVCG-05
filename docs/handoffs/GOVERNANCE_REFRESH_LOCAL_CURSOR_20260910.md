# Local Cursor / GitHub Handoff — Canonical Governance Refresh

**Do not ask Manny to edit JSON manually.**
**Do not create a replacement governance repository.**
**Do not activate Supervisor V4 until this refresh merges and CI PASSes.**

## Why this handoff exists

Cloud agent access to `mblv89117/hvcg-platform-governance` returns **404 / AGENT_ACCESS_LIMITATION**.
The repository exists; this environment cannot write it.

Supervisor V4 remains **NOT ACTIVATED** until registries below reflect current reality.

## Operator steps (Local Cursor with GitHub access)

1. Open existing repo: `mblv89117/hvcg-platform-governance`
2. `git pull origin main`
3. Update `registry/HVCG_PROGRAM_STATE_CURRENT.json` (and related current-state registries) from the verified facts below
4. Run governance CI
5. Open PR → merge when PASS
6. Only then locate and activate Supervisor V4 (**HOURLY** initially)

## Verified facts to write (2026-09-10)

| Field | Value |
|---|---|
| `HVCG_DEFAULT_BRANCH` | `production/atlas-core` |
| `LIVE_HUB_SHA` | `502d5ea6a2d7e258dd275dfae1b2dadb6c9ef5b5` (live `/health`) |
| Hub git tip (docs) | `5364a44683230a9e8cc4e51e7bf305bdcb82eaaf` on `production/atlas-core` |
| `GCC_DATABASE` | `AZURE_POSTGRESQL` |
| `GCC_AUTH` | `ENTRA_EXTERNAL_ID` |
| `MICROSOFT_NATIVE_COMPLETE` | `YES` |
| `SUPABASE_DB` | `ROLLBACK_ONLY` |
| `SUPABASE_AUTH` | `ROLLBACK_ONLY` |
| `PR123` | `MERGED` (`b87a87a80ef23264e2121e927bcce6ce5fc625ce`) |
| `PR124` | `MERGED` (`62124fe4d9c0882e4e34c971052a834f4ba30a41`) — DB ClientCode + HMAC signer on `main` |
| `MODULE_INGEST_BACKEND` | `azure-table` |
| `HMAC_KEY_ID` | `gcc` (Key Vault–backed; never in git/logs/chat) |
| `HMAC_ENDPOINT` | Live; key ring configured; fail-closed without valid signature |
| `REAL_GCC_MAPPINGS` | **PDG01 VERIFIED** only (see evidence mappings); others `MISSING_GCC_ORG` |
| `SYN01` | Fixture only (not a production entitlement) |
| `WAVE10` | `PASS` — SYN01 matrix + real-client OBSERVE durable cert |
| `GLOBAL_AUTO_RESPOND` | `false` |
| `SUPERVISOR_V4` | Ready after this refresh; activate **HOURLY** only |

## Remove / correct stale claims

Delete or rewrite any registry statements that still claim:

- Hub SHA `2d61fe65…`
- Stale default branch
- Hub Waves not deployed
- GCC DB/Auth still Supabase
- HMAC not deployed
- PR #123 still open

## Evidence pointers (HVCG-05)

- `docs/evidence/wave10-hmac-durable-cert-20260909.json`
- `docs/evidence/wave10-final-operational-cert-20260910.json`
- This handoff: `docs/handoffs/GOVERNANCE_REFRESH_LOCAL_CURSOR_20260910.md`
- GCC `main` contains DB-backed ClientCode resolver + HMAC signer (PR #124)
- Live GCC ACA revision `azapprngzn--0000034`
- Live Hub health commit `502d5ea6a2d7e258dd275dfae1b2dadb6c9ef5b5`

## Supervisor V4 activation gate (after governance merge)

Automation name: **HVCG Platform Engineering Supervisor V4 — Constitutional Control Plane**

Activate only when all are true:

- Canonical governance refreshed + CI PASS
- P0 = 0
- Default branch `production/atlas-core`
- Hub live + durable ingest + signed certs PASS
- GCC Azure PostgreSQL + Entra live
- `GLOBAL_AUTO_RESPOND=false`
- Duplicate-agent safeguards PASS

Cadence: **HOURLY** initially (do not jump to 15 minutes).

If the automation UUID is not visible: report `TOOLING_VISIBILITY_LIMITATION` — do not invent a new Supervisor.
