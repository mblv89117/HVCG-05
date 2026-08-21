# Agent Status — Platform Red Team

| Field | Value |
|-------|-------|
| project | Platform Red Team (Train F) |
| primary repo | `hvcg-05` |
| branch | `cursor/platform-red-team-866c` |
| current SHA | `385bf731b554d291afbaae0ae2266002f9a4517c` |
| baseline | Live Hub post-OD-005 deploy (claimed `9e5d10a`); prior freeze `940a484` superseded as production artifact |
| owned domains | Independent adversarial testing and findings |
| files/domains touched | `docs/red-team/**`, `docs/agent-status.md` |
| contracts required | Integration `30964bb` prior PASS (not retested) |
| tests | D30 live Hub probes: /health ok; PM/website fail-closed 401; ATLAS-01/02 PARTIAL; ATLAS-03/XSYS-02 NEEDS_RETEST |
| build | N/A |
| synthetic certification | N/A |
| security status | **LIVE_CERTIFIED=NO**. Live Hub P0 not 0 (PARTIAL×3 + NEEDS_RETEST×2). Candidate OD-005 still FIXED_REVALIDATED. |
| Premium status | **N/A** |
| integration dependencies | SoT meaning unchanged |
| P0 | LIVE: ATLAS-01/02 PARTIAL; ATLAS-03 NEEDS_RETEST; XSYS-01 PARTIAL; XSYS-02 NEEDS_RETEST. Candidate P0=0 |
| P1 | none |
| P2 | none |
| owner decisions | No further deploy from RT. Rollback retain until live FIXED_REVALIDATED. AUTHORIZE PRODUCTION from RT = **NO** (already deployed by supervisor) |
| deployment state | REMOTE_REACHABLE — Hub post-deploy; LIVE_CERTIFIED not granted |

## Orchestrator control

| Field | Value |
|-------|-------|
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **30** |
| BASED ON WORKER SHA | `ef00de500eebb949c7d410d498d344ad52b7c383` |
| BASED ON RUN ID | `followup-accepted-2026-08-20T2130Z` |
| CURRENT SHA | `385bf731b554d291afbaae0ae2266002f9a4517c` |
| COMPLETED ACTIONS | Independent live Hub fail-closed retest post-OD-005 deploy; SECURITY_TRUTH updated; LIVE_CERTIFIED=NO |
| REMAINING ACTIONS | Staff JWT entitlement retest (ATLAS-01/02); intake-key HMAC+idempotency (XSYS-01/02); Plaid host ATLAS-03 |
| P0/P1/P2 | Live P0 not closed · Candidate P0=0 · P1=none |
| TEST STATUS | Live fail-closed auth PASS; entitlement/HMAC/Plaid live proofs incomplete |
| PREMIUM STATUS | N/A |
| INTEGRATION STATUS | Prior Integration PASS cited; not retested |
| OWNER DECISIONS | No RT deploy/rollback executed. Keep rollback ready while live findings PARTIAL/NEEDS_RETEST |

## SHAs this cycle

| System | SHA / evidence |
|--------|----------------|
| Claimed live Hub package | `9e5d10a20639bbeb659fbacd6362cd9f13adb08b` |
| Claimed OneDeploy | `f2eee147-2624-414b-8f16-688729249097` (not Azure-API confirmed by RT) |
| Live Hub URL | `https://app-atlas-integration-hub.azurewebsites.net` |
| Prior Hub freeze | `940a484` (pre-deploy baseline) |

## Notes

- No Entra staff JWT / website intake key / az SP in RT env — limits FIXED_REVALIDATED.
- No app-settings or Key Vault reads.
- Live production P0 must **not** be reported as 0.

**Updated:** 2026-08-21T00:01:30Z
