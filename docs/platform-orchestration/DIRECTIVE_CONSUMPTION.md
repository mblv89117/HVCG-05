# Directive Consumption Log — Train E (Platform Integration)

| Field | Value |
|-------|-------|
| Train | integration (E — Platform Integration / Contracts) |
| Product branch | `cursor/platform-integration-contracts` (`workOnCurrentBranch=true`) |
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **2** |
| BASED ON CURRENT SHA | `773b5101032ccd5218d5563d2177c31722ecf575` |
| BASED ON CURRENT RUN ID | `none-on-this-worker` (replacement) |
| This worker | `bc-0e3c9a74` |
| Must not reuse | `bc-af57d6b6` / `run-8c5dc9cf` on `cursor/platform-orchestrator-b1fa` |
| Orchestrator repo | `360-growth-solution` |
| Orchestrator branch | `cursor/platform-orchestrator-b1fa` (**not pushed**) |
| Directive artifacts read | HVCG ORCHESTRATOR FOLLOW-UP DIRECTIVE v2 (inline); local snapshot `directives/E-platform-integration.md` |

## Comparison vs branch state at consume time

| Orch expectation (v2) | Branch state @ `773b510` | Action |
| --- | --- | --- |
| Stay on contracts branch | Already on tip | Satisfied — no new train |
| Refresh consumer matrix vs five tips | Matrix pinned older GTM/GCC/Copilot; Revenue was "missing" | Published `CONSUMER_COMPATIBILITY.md` |
| Re-run harness | 27/27 previously | Re-ran **27/27 OK** |
| Confirm CC-001/002/003/006 | CC-001/006 already SoT; CC-002/003 documented in schemas | Confirmed; no semantic fork |
| XSYS-01/02 Hub-side | Docs named XSYS-RT-01 only | Documented Hub LIVE_PRODUCTION_P0 + candidate `0bbfd87` |
| No Hub HMAC / no deploy | Satisfied | No runtime edits |

## Stale-directive rule

Directive 1 / `ORCH-DIR-E-2026-08-20T0418Z` publish-schemas + first CC-001/CC-006 work is already on `9b46313`–`773b510`. Those items were not re-implemented.
