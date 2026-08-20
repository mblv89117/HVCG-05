# Directive Consumption Log — Train E (Platform Integration)

| Field | Value |
|-------|-------|
| Train | integration (E — Platform Integration / Contracts) |
| Product branch | `cursor/platform-integration-contracts` (`workOnCurrentBranch=true`) |
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **3** |
| BASED ON CURRENT SHA | `a29c873729b0539505231c8b82e33b14f3ce2d49` |
| BASED ON CURRENT RUN ID | `run-4497aaf8-2256-4d77-8905-2768cf566a61` |
| This worker | `bc-0e3c9a74` |
| Must not reuse | `bc-af57d6b6` / `run-8c5dc9cf` on `cursor/platform-orchestrator-b1fa` |
| Orchestrator repo | `360-growth-solution` |
| Orchestrator branch | `cursor/platform-orchestrator-b1fa` (**not pushed**) |
| Prior consumed | **2** (D2 matrix; stale consumer SHAs superseded by D3) |

## Comparison vs branch state at consume time

| Orch expectation (v3) | Branch state @ `a29c873` | Action |
| --- | --- | --- |
| Do not repeat D2 | D2 already published | New journey/current-tip pack only |
| Pin six current SHAs | D2 still listed Revenue `e9b3be8` / GCC `41a59b8` / Copilot `19a200e` | Replaced with `85def0e` / `8d757cf` / `2f02702` + OD-005 `9e5d10a` |
| 24-step journey table + percent | Absent | Published `CROSS_SYSTEM_JOURNEY_PERCENT.md` (71%) |
| CURRENT_PRODUCT_TIPS_TESTED_TOGETHER | Absent | Published **NO** (GTM/Copilot 404) |
| Confirm CC-001/002/003/006 vs current tips | SoT + stale consumer pins | Confirmed on `85def0e` / `8d757cf` + supervisor/RT cites |
| Re-run harness | 27/27 | Re-ran **27/27 OK**; no new test |
| XSYS-01/02 Hub-side @ `9e5d10a` | Docs still named `0bbfd87` | Updated to `9e5d10a` FIXED_REVALIDATED (RT D23) |
| No Hub HMAC / no deploy | Satisfied | No runtime edits |

## Stale-directive rule

D2 publish-matrix / 27/27-only refresh is consumed. Directive 1 schema publish remains satisfied since `9b46313`. Those items were not re-implemented.
