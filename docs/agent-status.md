# Agent Status — Platform Red Team

| Field | Value |
|-------|-------|
| project | Platform Red Team (Train F) |
| primary repo | `hvcg-05` |
| branch | `cursor/platform-red-team-866c` |
| current SHA | *(git tip after push)* |
| baseline | Hub `940a484` / Elite `75d0c59` PASS (frozen; not mutated) |
| owned domains | Independent adversarial testing and findings |
| files/domains touched | `docs/red-team/**`, `docs/agent-status.md`, `scripts/red-team/check-d16-gtm.mjs` |
| contracts required | Integration SoT `773b510` (dependency; not retested) |
| tests | D16: GTM flags 9/9 · handoff 5/5 · gtm-agent 9/9 · SYN-GTM 28/28 · D16 harness exit 0 |
| build | N/A |
| synthetic certification | N/A (product SYN-GTM verified dry-run only) |
| security status | Gate **FAIL** until XSYS P0=0 and OD-005 authorized for Hub |
| Premium status | **N/A** — no RT UI |
| integration dependencies | `integration@773b510` |
| P0 | Hub: ATLAS-01/02/03 + XSYS-01/02 **OPEN**. OD-005 candidate: ATLAS FIXED (D15); XSYS OPEN |
| P1 | **0** (GTM-03/04 **FIXED**, reconfirmed @ `f63b8eb`) |
| P2 | none filed (dry-run engagement binding note only) |
| owner decisions | OD-005 deploy authorization required; XSYS follow-on patch needed |
| deployment state | REMOTE_REACHABLE — **not** DEPLOYMENT_READY |

## Orchestrator control

| Field | Value |
|-------|-------|
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **16** |
| BASED ON WORKER SHA | `456fee71e3698839c5eee6e63a196441435c6990` |
| BASED ON RUN ID | `run-d8447acf-4835-4a40-bbfd-7f8367984608` |
| CURRENT SHA | *(git tip after push)* |
| COMPLETED ACTIONS | Revalidated GTM tip `f63b8eb` for GTM-RT-03/04 + Revenue OS consumer/SYN-GTM; confirmed pause fail-closed, InquiryForm camelCase, liveDispatch=false, operator-accept required; no new P0/P1 |
| REMAINING ACTIONS | Retest when XSYS remediations land; re-confirm Hub after OD-005 authorized deploy |
| P0/P1/P2 | P0=Hub ATLAS×3 + XSYS×2 · P1=0 · P2=none |
| TEST STATUS | D16 harness exit 0; flags/handoff/gtm-agent PASS; SYN-GTM 28/28 PASS |
| PREMIUM STATUS | N/A |
| INTEGRATION STATUS | Dependency `773b510`; XSYS Hub authenticity still open |
| OWNER DECISIONS | Await OD-005 production security-patch authorization |

## SHAs this cycle

| System | SHA |
|--------|-----|
| GTM (moved) | `f63b8eb166eb5161bdb9956a9e0cdf939e9c3fcb` |
| Prior OD-005 (not retested) | `bb7edae503d91e85fe8f5a6a69943aeed5579c3a` |
| Prior Revenue engine (not retested) | `9c9c331d707e59c8e020f28bcaf75528bfe42927` |

## Notes

- Did not implement Hub runtime fixes on frozen production.
- Did not deploy OD-005.
- Did not retest identical D15/D12/D10 SHA/scope surfaces.
- Revenue OS engine tip unchanged — consumer path on GTM tip only.

**Updated:** 2026-08-20T06:56:30Z
