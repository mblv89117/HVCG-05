# Governance Convergence — Executable Local Cursor Package (2026-09-10)

## Hard rules

- Open **existing** `mblv89117/hvcg-platform-governance` only.
- **Do not** create a replacement governance repository.
- **Do not** ask Manny to edit JSON.
- **Do not** create Supervisor V5 / a duplicate Supervisor.
- **Do not** activate Supervisor V4 until this convergence merges and CI PASSes.
- **Do not** redeploy Hub solely to equalize live runtime SHA with Git tip.

## Cloud agent blocker (why this package exists)

From Cloud agent / GitHub MCP principal `mblv89117`:

- `GET repos/mblv89117/hvcg-platform-governance` → **404**
- Repo is **not** among the 8 repositories visible to that principal
- `gh` CLI is `cursor[bot]` and also cannot see the repo
- Conclusion: **AGENT_ACCESS_LIMITATION** (not evidence the repo is absent)

Supervisor V4 lookup requires a UUID (`cursor-cloud get-automation`); no list-automations API is exposed → **TOOLING_VISIBILITY_LIMITATION**.

## One-command execution (Local Cursor with GitHub auth that can see the private repo)

```bash
# From HVCG-05 checkout containing this package:
bash docs/handoffs/governance-convergence-20260910/run-converge.sh
```

The script will:

1. Verify access to existing governance repo (abort if missing — never creates a replacement)
2. Clone `main`
3. Deep-merge `payloads/*.json` into CURRENT registries + scrub stale CURRENT strings
4. Run existing governance validation/CI entrypoints
5. Open PR and squash-merge when authorized
6. Re-pull `main` and fail if stale Hub SHA `2d61fe65…` remains in CURRENT files

## After merge — Supervisor V4

1. Open Cursor Automations UI
2. Locate **existing** automation: `HVCG Platform Engineering Supervisor V4 — Constitutional Control Plane`
3. Read the **full permanent prompt** (do not fragment-patch)
4. If prompt is stale/conflicts with Constitution → set `V4_PROMPT_REPLACEMENT_REQUIRED=YES` and stop (Owner replaces with one full consolidated prompt)
5. If prompt is current AND all activation gates PASS → set cadence **HOURLY** and enable
6. Observe first cycles; disable immediately on unsafe behavior

### Activation gates (all required)

- Constitution `HVCG-CONSTITUTION-2026-09-04-v1.0`
- Canonical governance CURRENT = YES (post-merge)
- Governance CI = PASS
- P0 = 0
- Default branch `production/atlas-core`
- Hub live healthy; module ingest `azure-table`; HMAC signed cert PASS; PDG01 real-client PASS
- GCC Azure PostgreSQL + Entra External ID; Microsoft-native complete
- ClientCode fail-closed PASS; cross-client leakage 0
- `GLOBAL_AUTO_RESPOND=false`
- Duplicate-agent safeguards PASS; production guards PASS

## Payloads

- `payloads/HVCG_PROGRAM_STATE_CURRENT.json`
- `payloads/ATLAS_PRODUCTION_CURRENT.json`

Evidence of Cloud gate: `docs/evidence/control-plane-gate-20260910.json`
