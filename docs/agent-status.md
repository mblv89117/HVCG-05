# Agent Status — Platform Red Team

| Field | Value |
|-------|-------|
| project | Platform Red Team (Train F) / independent-validation |
| primary repo | `hvcg-05` |
| branch | `cursor/platform-red-team-866c` |
| current SHA | `90ce0d8b4ce39267fb470016d75c47d986681bb4` |
| baseline | D34 classify XSYS packaged evidence @ Hub `64b56dc` |
| owned domains | Independent adversarial testing and findings |
| files/domains touched | `docs/red-team/**`, `docs/agent-status.md` |
| contracts required | none this cycle |
| tests | D34: XSYS-01/02 VERIFIED_FIXED from packaged 0253Z + public re-probes; ATLAS STILL_INCONCLUSIVE |
| build | N/A |
| synthetic certification | N/A |
| security status | **LIVE_SECURITY_CERTIFIED=NO**. XSYS-01/02 VERIFIED_FIXED. ATLAS-01/02/03 STILL_INCONCLUSIVE. LIVE_P0=3. |
| Premium status | **N/A** |
| integration dependencies | SoT meaning unchanged |
| P0 | LIVE_P0=3 (ATLAS-01/02/03 STILL_INCONCLUSIVE); XSYS-01/02 VERIFIED_FIXED |
| P1 | none |
| P2 | none |
| owner decisions | No deploy/rollback. Elite untouched. |
| deployment state | Public marker Hub `64b56dc` corroborated |

## Orchestrator control

| Field | Value |
|-------|-------|
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **34** |
| BASED ON WORKER SHA | `557aa6faf203183cf2fec26afb67de7a40ddd1bd` |
| PREVIOUS | D33 CONSUMED=33 SHA_GATE=PASS 5/5 INCONCLUSIVE — not replayed as mission |
| CURRENT SHA | `90ce0d8b4ce39267fb470016d75c47d986681bb4` |
| COMPLETED ACTIONS | D34 classify XSYS-01/02 VERIFIED_FIXED; ATLAS STILL_INCONCLUSIVE; CONSUMED=34 |
| REMAINING ACTIONS | Staff/synthetic session for ATLAS-01/02; Plaid host for ATLAS-03 |
| LIVE_P0 | **3** |
| LIVE_P1 | none |
| LIVE_SECURITY_CERTIFIED | **NO** |
| LIVE_VALIDATION_ABORTED | **NO** |
| INHERIT | **FAIL** |
| FOLLOWUP_CANNOT_REBIND | **YES** |
| TEST STATUS | XSYS closed via (a) V3 package 0253Z + (b) RT public fail-closed; ATLAS blocked |
| PREMIUM STATUS | N/A |
| INTEGRATION STATUS | Not retested |
| OWNER DECISIONS | No RT deploy/rollback |

## THIS-POD INHERIT (D34 — names only)

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

## Live release (corroboration)

| System | Evidence |
|--------|----------|
| Observed Hub SHA | `64b56dcb73caae1cfcd71743bcedfd8cd64c2b26` |
| V3 package cite | `360-growth-solution` `cursor/platform-orchestrator-b1fa` @ `55cde62` — `V3_AZURE_BACKED_P0_PROBES_2026-08-22T0253Z.md` |
| Elite (do not touch) | `75d0c59` |

## Notes

- D34 is not a D33/D32 clone. Azure ABSENT did not abort.
- LIVE_SECURITY_CERTIFIED is worker evidence rollup only; V3 does not self-certify; V3 evidence alone is not LIVE_CERT.
- No secret values recorded.

**Updated:** 2026-08-22T03:11:00Z
