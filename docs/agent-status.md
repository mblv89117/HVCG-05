# Agent Status — Platform Red Team

| Field | Value |
|-------|-------|
| project | Platform Red Team (Train F) |
| primary repo | `hvcg-05` |
| branch | `cursor/platform-red-team-866c` |
| current SHA | *(git tip after push)* |
| baseline | Hub `940a484` / Elite `75d0c59` PASS (frozen; not mutated) |
| owned domains | Independent adversarial testing and findings |
| files/domains touched | `docs/red-team/**`, `docs/agent-status.md`, `scripts/red-team/check-d20-revenue-adapters.mjs` |
| contracts required | Integration SoT `773b510` (dependency; not retested) |
| tests | D20: adapter 5/5 · revenue suite 22/22 · Elite P1 6/6 · harness exit 0 |
| build | N/A |
| synthetic certification | N/A |
| security status | Gate **FAIL** until Hub P0=0 |
| Premium status | **N/A** — no RT UI |
| integration dependencies | `integration@773b510` |
| P0 | Hub: ATLAS-01/02/03 + XSYS-01/02 **OPEN** |
| P1 | **0** (REVOS-ELITE-01 **FIXED**, reconfirmed @ `e9b3be8`) |
| P2 | none filed |
| owner decisions | OD-005 deploy authorization required; XSYS follow-on |
| deployment state | REMOTE_REACHABLE — **not** DEPLOYMENT_READY |

## Orchestrator control

| Field | Value |
|-------|-------|
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **20** |
| BASED ON WORKER SHA | `22ab0ef89e6c68168e19af868f672db5040db801` |
| BASED ON RUN ID | `run-214442cf-2399-468d-aaaa-f77d74cd2057` |
| CURRENT SHA | *(git tip after push)* |
| COMPLETED ACTIONS | First-pass Revenue Dev SharePoint adapters @ `e9b3be8` (Proposals/Engagements); reconfirmed REVOS-ELITE-RT-20260820-01 FIXED; no new P0/P1 |
| REMAINING ACTIONS | Retest Hub/XSYS when OD-005 authorized or XSYS remediations land |
| P0/P1/P2 | P0=Hub ATLAS×3 + XSYS×2 · P1=0 · P2=none |
| TEST STATUS | adapter 5/5; revenue suite 22/22; Elite P1 6/6; D20 harness exit 0 |
| PREMIUM STATUS | N/A |
| INTEGRATION STATUS | Dependency `773b510`; XSYS Hub authenticity still open |
| OWNER DECISIONS | Await OD-005 production security-patch authorization |

## SHAs this cycle

| System | SHA |
|--------|-----|
| Revenue adapters (new) | `e9b3be8c58a3ea20f8d73806c9dbd6258cec8c56` |

## Notes

- Did not retest GTM docs-only pins or identical prior tips.
- No SharePoint schema thaw in tip delta.
- No production deploy; adapters are fixture-only.

**Updated:** 2026-08-20T08:08:30Z
