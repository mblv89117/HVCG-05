# Agent Status — Platform Red Team

| Field | Value |
|-------|-------|
| project | Platform Red Team (Train F) |
| primary repo | `hvcg-05` |
| branch | `cursor/platform-red-team-866c` |
| current SHA | 21ca641 |
| baseline | Orchestrator default line `b75b19b`; findings bind Hub `940a484` / Elite `75d0c59` + product tips |
| owned domains | Independent adversarial testing and findings (no feature ownership) |
| files/domains touched | `docs/red-team/**`, `scripts/red-team/**`, `docs/agent-status.md` |
| contracts required | Consume Integration SoT when published (`atlas-lead-intake.v1`); do not redefine |
| tests | Static harness `check-opportunity-staff-bypass.mjs` + tip revalidation probes |
| build | N/A (docs + harness) |
| synthetic certification | N/A |
| security status | Gate **FAIL** — see P0/P1/P2 |
| Premium status | N/A |
| integration dependencies | Must revalidate against Integration / GTM / GCC / Copilot / Atlas tips |
| P0 | **9 open** after tip revalidation (was 11; Copilot admin unauth closed; Copilot blanket unauth narrowed) |
| P1 | **19** (catalog + new residual CC-008 assessments public prefix) |
| P2 | **14** |
| owner decisions | OD-003 (Integration SoT), OD-004 (GTM tip), OD-005 (Atlas security patch) — tracked, not owned |
| deployment state | Findings continuous — **not** a deploy candidate |

## Orchestrator control

| Field | Value |
|-------|-------|
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | `ORCHESTRATOR_REPORT_2026-08-20T0418Z` + `trains/F-platform-red-team.md` |
| ORCHESTRATOR REMOTE SHA | `795d5159d1ba9257e7607701fd7aacb9c4fa2bff` |
| DIRECTIVES PATH NOTE | `docs/platform-orchestration/directives/` **absent** on orchestrator tip; train sheet + reports used as directive source |
| CURRENT SHA | 21ca6412f3549a96ea096d37028cd3ab1db76061 |
| COMPLETED ACTIONS | First-run findings catalog; P0 revalidation on current tips (2026-08-20T0428Z); status protocol artifact |
| REMAINING ACTIONS | Continuous revalidation as tips move; close findings only when owning tips prove remediation; watch Revenue OS tip when remote; re-check XSYS after Integration adapters |
| P0/P1/P2 | P0=9 · P1=19 · P2=14 (post-revalidation) |
| TEST STATUS | Harness exit 2 (ATLAS-RT-01 open) on Hub tip, P2 tip, Integration tip |
| PREMIUM STATUS | N/A |
| INTEGRATION STATUS | Consumer of SoT; XSYS-RT-01/02 still open on Hub receive path |
| OWNER DECISIONS | Awaiting OD-003/004/005; RT does not block non-deploy engineering |

## Notes

- Status SHA note: value is tip at last status edit; subsequent status-only SHA pin commits may advance tip by 1.

- Do **not** silently fix product branches. Findings only + isolated harnesses.
- Mission branch name `cursor/platform-red-team` mapped to cloud-required `cursor/platform-red-team-866c`.
- Stale finding SHAs from predecessor tips (`e585d0f`, `62f98cc`, `51f1cbf`) **revalidated** against current tips listed in revalidation report.

## Blockers

- Platform release gate FAIL until owning trains close remaining P0/P1.
- Revenue OS executable tip still missing → commercial attack surface N/A.

## Next milestone

Revalidate again when Atlas security-patch tip (OD-005), Revenue OS tip, or Integration HMAC land; keep gate FAIL until P0=0 and P1=0 for any production candidate.

**Updated:** 2026-08-20T04:30:00Z
