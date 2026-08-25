# High Value Platform Operating Picture — 2026-08-20

Current repository truth for the four-repo High Value environment. Not a roadmap.

## Environment

| Item | Truth |
| --- | --- |
| Cloud environment | Four repos present: `hvcg-05`, `360-growth-solution`, `hvcg-agent-copilot`, `growth-command-center` |
| Gmail archive | Absent and unused |
| ACCG01 | Untouched |
| Paid ads | `PAID_ADS_ENABLED=false`, `EMERGENCY_PAUSE_GLOBAL=true` preserved |

## Current candidates

| Repo | Working branch | Base | SHA at branch creation |
| --- | --- | --- | --- |
| Atlas / HVCG-05 | `cursor/atlas-hv-completion-52d1` | `origin/cursor/platform-completion-7241` | `955f6fd9b3492ddad7de162001e9eaeff0302e42` |
| 360 | `cursor/360-hv-completion-52d1` | `origin/feature/360-public-product-site` | `5f6679b14b2523bd34339da546a13a7dd10ff15f` |
| Agent Copilot | `cursor/copilot-hv-completion-52d1` | `origin/preservation/agent-copilot-working-state-2026-08-16` | `9062b7e7112fff00b20bab83aecbdb680b853cc5` |
| GCC | `cursor/gcc-hv-completion-52d1` | `origin/main` | `fb986cbd76334edfa84822fab51abae16d4103c4` |

Default Atlas HEAD `cursor/v1.1.0-intelligence-ai-ops` @ `b75b19b` is **not** the production or completion line.

## This loop's repo-complete additions

- Atlas governed Client Activation (`request` → `review` → Manny `authorize` → `verify`). Won does not set Active Client or provision access.
- Opportunity attention `ACTIVATION_REQUIRED` + Home/Command Center exceptions.
- Search uses one workspace-list batch per query instead of N×7 Graph scans.
- Agent Copilot Atlas **lead** handoff staged locally (`copilot|{assessmentId}`), observation-only.
- 360 Website Builder SiteSpec + swappable BuilderAdapter; 360→Atlas lead contract staged locally.
- GCC `outputFileTracingRoot`, `typecheck` script, persist-only Atlas Active Client handoff receiver.
- Elite Home now renders Hub activation exceptions and `/clients/:code/activation` is a named operational route.
- GCC public signup no longer attaches users to `org-apex`; dashboard/tenant APIs fail closed without an organization mapping.

## Still not live-certified

No Hub/Elite/360/GCC/Copilot production deploy was performed in this run. Microsoft MFA remains the live Atlas gate.
