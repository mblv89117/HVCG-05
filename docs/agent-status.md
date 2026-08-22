# Agent Status — Platform Red Team

| Field | Value |
|-------|-------|
| project | Platform Red Team (Train F) / independent-validation |
| primary repo | `hvcg-05` |
| branch | `cursor/platform-red-team-866c` |
| current SHA | *(git tip after push)* |
| baseline | D33 public-marker Hub SHA `64b56dc` — SHA_GATE=PASS |
| owned domains | Independent adversarial testing and findings |
| files/domains touched | `docs/red-team/**`, `docs/agent-status.md` |
| contracts required | none this cycle |
| tests | D33 public SHA markers PASS; fail-closed 401 PASS; five findings INCONCLUSIVE |
| build | N/A |
| synthetic certification | N/A |
| security status | **LIVE_SECURITY_CERTIFIED=NO**. SHA_GATE=PASS. LIVE_P0=5 INCONCLUSIVE. |
| Premium status | **N/A** |
| integration dependencies | SoT meaning unchanged |
| P0 | LIVE_P0=5 (INCONCLUSIVE×5) |
| P1 | none |
| P2 | none |
| owner decisions | No deploy/rollback. Elite untouched. |
| deployment state | Public marker Hub `64b56dc` verified via GET markers |

## Orchestrator control

| Field | Value |
|-------|-------|
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **33** |
| BASED ON WORKER SHA | `0e09aa630ad09f829dc9ef7a3a81c2a7e753c0a8` |
| PREVIOUS | D32 CONSUMED=32 INHERIT=FAIL — not replayed |
| CURRENT SHA | *(git tip after push)* |
| COMPLETED ACTIONS | D33 public SHA gate PASS; fail-closed probes; five findings classified INCONCLUSIVE; CONSUMED=33 |
| REMAINING ACTIONS | Synthetic staff JWT + intake key (+ Plaid URL) for VERIFIED_FIXED |
| LIVE_P0 | **5** |
| LIVE_P1 | none |
| LIVE_SECURITY_CERTIFIED | **NO** |
| LIVE_VALIDATION_ABORTED | **NO** |
| SHA_GATE | **PASS** |
| INHERIT | **FAIL** |
| FOLLOWUP_CANNOT_REBIND | **YES** |
| TEST STATUS | Public markers + fail-closed PASS; entitlement/HMAC/Plaid full reproducers blocked |
| PREMIUM STATUS | N/A |
| INTEGRATION STATUS | Not retested |
| OWNER DECISIONS | No RT deploy/rollback |

## THIS-POD INHERIT (D33 — names only)

| Field | Value |
|-------|-------|
| THIS_POD_ENV_ID | `9e385f28-9c25-11f1-ba66-0e7d0216e441` |
| THIS_POD_ENV_VERSION | `a86e2323-9c2a-11f1-ba66-0e7d0216e441` |
| THIS_POD_BUILD_ID | `bld-20260820-859ee60c-1350-4ede-89ab-db0836afc9d5` |
| AZURE_CLIENT_ID | **ABSENT** |
| AZURE_CLIENT_SECRET | **ABSENT** |
| AZURE_TENANT_ID | **ABSENT** |
| AZURE_SUBSCRIPTION_ID | **ABSENT** |
| INHERIT | **FAIL** |
| FOLLOWUP_CANNOT_REBIND | **YES** |

## Live release (public markers)

| System | Evidence |
|--------|----------|
| Required / observed Hub SHA | `64b56dcb73caae1cfcd71743bcedfd8cd64c2b26` |
| Markers | `/ATLAS_HUB_COMMIT.txt`, `/health.commit`, `/hub-build.json.gitSha` — all match |
| Live Hub URL | `https://app-atlas-integration-hub.azurewebsites.net` |
| Elite (do not touch) | `75d0c59` |
| Prior 9e5d10a / 698f7e92 | Not this release |

## Notes

- D33 is not a D32 clone; Azure ABSENT did not abort.
- LIVE_SECURITY_CERTIFIED is worker evidence rollup only; V3 does not self-certify.
- No app-settings or Key Vault reads. No secret values recorded.

**Updated:** 2026-08-22T02:35:00Z
