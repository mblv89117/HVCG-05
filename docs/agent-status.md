# Agent Status — Platform Red Team

| Field | Value |
|-------|-------|
| project | Platform Red Team (Train F) |
| primary repo | `hvcg-05` |
| branch | `cursor/platform-red-team-866c` |
| current SHA | `9d26419` |
| baseline | Hub `940a484` / Elite `75d0c59` PASS (frozen; not mutated) |
| owned domains | Independent adversarial testing and findings |
| files/domains touched | `docs/red-team/**`, `docs/agent-status.md`, `scripts/red-team/check-d15-od005.mjs` |
| contracts required | Integration SoT `773b510` (dependency; not retested) |
| tests | OD-005 Plaid PASS 6/6; opportunity harness exit 0; GTM flags/handoff/agent PASS; Revenue OS suite PASS 17/17 |
| build | N/A |
| synthetic certification | N/A |
| security status | Gate **FAIL** until XSYS P0=0 and OD-005 authorized for Hub |
| Premium status | **N/A** — no RT UI |
| integration dependencies | `integration@773b510` |
| P0 | OD-005 tip: ATLAS-01/02/03 **FIXED**; XSYS-01/02 **OPEN**. Frozen Hub: ATLAS+XSYS still open until deploy |
| P1 | **0** tracked open (GTM-03/04 **FIXED** @ `bd72003`) |
| P2 | none |
| owner decisions | OD-005 deploy authorization required; XSYS follow-on patch needed |
| deployment state | REMOTE_REACHABLE — **not** DEPLOYMENT_READY |

## Orchestrator control

| Field | Value |
|-------|-------|
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **15** |
| BASED ON WORKER SHA | `97576c2bc23e3834ae1488e48422656cce894fa1` |
| BASED ON RUN ID | `run-75ccd61c-6d51-406b-a509-7f245e4f86c1` |
| CURRENT SHA | `9d26419` |
| COMPLETED ACTIONS | Verified OD-005 `bb7edae` for ATLAS-01/02/03; confirmed XSYS still open; verified GTM-03/04 @ `bd72003`; Revenue OS first-pass @ `9c9c331` (no new P0/P1) |
| REMAINING ACTIONS | Retest when XSYS remediations land; re-confirm Hub after OD-005 authorized deploy |
| P0/P1/P2 | P0=XSYS×2 (+ Hub ATLAS until deploy) · P1=0 · P2=none |
| TEST STATUS | See Directive 15 report commands — all executed suites PASS |
| PREMIUM STATUS | N/A |
| INTEGRATION STATUS | Dependency `773b510`; XSYS Hub authenticity still open |
| OWNER DECISIONS | Await OD-005 production security-patch authorization |

## SHAs this cycle

| System | SHA |
|--------|-----|
| OD-005 | `bb7edae503d91e85fe8f5a6a69943aeed5579c3a` |
| GTM | `bd720033a646a9b8775d6c5f17f001d182ad2632` |
| Revenue | `9c9c331d707e59c8e020f28bcaf75528bfe42927` |

## Notes

- Did not implement Hub runtime fixes on frozen production.
- Did not deploy OD-005.
- Design notes from Revenue OS not inherited as P0.

**Updated:** 2026-08-20T06:45:00Z
