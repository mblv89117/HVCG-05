# Agent Status — Platform Red Team

| Field | Value |
|-------|-------|
| project | Platform Red Team (Train F) |
| primary repo | `hvcg-05` |
| branch | `cursor/platform-red-team-866c` |
| current SHA | da27919 |
| baseline | Hub `940a484` / Elite `75d0c59`; product tips per Directive 10 |
| owned domains | Independent adversarial testing and findings (no feature ownership) |
| files/domains touched | `docs/red-team/**`, `docs/agent-status.md`, `scripts/red-team/**` |
| contracts required | Read-only consume Integration SoT `773b510` |
| tests | Static harness + tip source reproduction (Directive 10) |
| build | N/A |
| synthetic certification | N/A |
| security status | Gate **FAIL** for new production candidates |
| Premium status | N/A |
| integration dependencies | Revalidate when Atlas HMAC / Copilot store / GCC RBAC land |
| P0 | **6 open** (ATLAS×3, COPILOT-02, XSYS-01, XSYS-02) |
| P1 | Prior ~19; this pass closed GTM-02 + COPILOT-11; residuals GTM-03/04, GCC-05/06/07 open/partial |
| P2 | ~14+ (not primary this pass) |
| owner decisions | OD-003/004/005 tracked; OD-005 owns Atlas Hub P0 patch |
| deployment state | Findings continuous — **not** a deploy candidate |

## Orchestrator control

| Field | Value |
|-------|-------|
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **10** |
| ORCHESTRATOR ACK | Controlled wake test YES; mapping confidence HIGH |
| BASED ON WORKER SHA | `0386a53b9b82fd6e6cd351c3348cdfb3f83724c1` |
| PREVIOUS RUN ID | `run-fb85119f-9632-4808-8d1a-f2bd09deffc4` |
| ORCHESTRATOR REMOTE SHA (at consume) | `db9629a` (`cursor/platform-orchestrator-b1fa`) |
| CURRENT SHA | da2791986ed85cbd142e182d3e238748da8916a4 |
| COMPLETED ACTIONS | Directive 10 tip SHA verify; P0/P1 reclassification; report published |
| REMAINING ACTIONS | Retest after Atlas patch / Copilot store / GCC RBAC+handoff; GTM-04 integration proof |
| P0/P1/P2 | P0=6 · P1 residuals open · P2 prior debt |
| TEST STATUS | Source reproduction on exact SHAs; GTM CallRail unit tests present but deps not installed in RT env |
| PREMIUM STATUS | N/A |
| INTEGRATION STATUS | Contracts tip reviewed read-only; Hub HMAC/prefix still open |
| OWNER DECISIONS | Awaiting OD-005 for Atlas P0 closure |

## SHAs tested (Directive 10)

| System | SHA |
|--------|-----|
| GTM | `5bd8204dbf2fbb25e78aff7540f26c787604d77c` |
| GCC | `b02c1322d5e18ef8bc6699b202515e9137cde6a1` |
| Copilot | `aacc09c4fe7d67d453d4ad6111f8db0cf38ebf12` |
| Integration | `773b5101032ccd5218d5563d2177c31722ecf575` |
| Atlas Hub / Elite | `940a484` / `75d0c59` |

## Notes

- Do not silently fix product branches.
- Closed this pass: GTM-RT-01, GCC-RT-01/02/03, GTM-RT-02, COPILOT-RT-01/11.
- Atlas frozen live-cert current-scope PASS unchanged; Hub code defects remain open for patch train.

## Blockers

- New production releases blocked while P0/P1 remain open on candidates that claim deploy readiness.

## Next milestone

Retest when OD-005 Atlas security-patch tip and Copilot durable per-session store land.

**Updated:** 2026-08-20T05:35:00Z
