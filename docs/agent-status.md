# Agent Status — Platform Red Team

| Field | Value |
|-------|-------|
| project | Platform Red Team (Train F) / independent-validation |
| primary repo | `hvcg-05` |
| branch | `cursor/platform-red-team-866c` |
| current SHA | *(git tip after push)* |
| baseline | D31 exact-release gate for Hub `9e5d10a` + deployment `698f7e92…` |
| owned domains | Independent adversarial testing and findings |
| files/domains touched | `docs/red-team/**`, `docs/agent-status.md` |
| contracts required | none this cycle |
| tests | D31 SHA/deployment gate — LIVE_VALIDATION_ABORTED=YES (SHA not independently verified) |
| build | N/A |
| synthetic certification | N/A |
| security status | **LIVE_SECURITY_CERTIFIED=NO**. LIVE_VALIDATION_ABORTED=YES. Five findings INCONCLUSIVE. |
| Premium status | **N/A** |
| integration dependencies | SoT meaning unchanged |
| P0 | LIVE: five findings **INCONCLUSIVE** (D31); not closable as 0 |
| P1 | none |
| P2 | none |
| owner decisions | No deploy/rollback from RT. Await Azure SP for deployment-history SHA verify. |
| deployment state | REMOTE_REACHABLE ambient; exact release **unverified** |

## Orchestrator control

| Field | Value |
|-------|-------|
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **31** |
| BASED ON WORKER SHA | `7faca45a52c47cad1e1ba894f33b59877916aa2b` |
| BASED ON PRIOR RUN | D30 artifact @ `7faca45` |
| CURRENT SHA | *(git tip after push)* |
| COMPLETED ACTIONS | D31 acknowledge; independent SHA/deployment gate; abort documented; secrets requested |
| REMAINING ACTIONS | Verify live SHA=`9e5d10a` + deployment=`698f7e92…` via az deployment history; then ATLAS/XSYS reproducers |
| LIVE_P0 | not 0 (INCONCLUSIVE×5) |
| LIVE_P1 | none |
| LIVE_SECURITY_CERTIFIED | **NO** |
| LIVE_VALIDATION_ABORTED | **YES** |
| TEST STATUS | Finding probes not run (SHA gate abort). Ambient /health ok only. |
| PREMIUM STATUS | N/A |
| INTEGRATION STATUS | Not retested |
| OWNER DECISIONS | No RT deploy/rollback. Elite untouched. |

## SHAs this cycle

| System | SHA / evidence |
|--------|----------------|
| Required live Hub package | `9e5d10a20639bbeb659fbacd6362cd9f13adb08b` (**unverified** on live) |
| Required controlled deployment ID | `698f7e92-40d1-44e6-82ce-3988d30144fc` (**unverified**) |
| Live Hub URL | `https://app-atlas-integration-hub.azurewebsites.net` |
| Elite (do not touch) | `75d0c59` |

## Notes

- Azure SP secrets requested for deployment-history-only verify.
- Optional synthetic staff JWT / WEBSITE_INTAKE_KEY / Plaid base URL requested for post-gate reproducers.
- No app-settings or Key Vault reads.
- Do not report LIVE_SECURITY_CERTIFIED=YES while any of the five is not VERIFIED_FIXED.

**Updated:** 2026-08-22T00:56:00Z
