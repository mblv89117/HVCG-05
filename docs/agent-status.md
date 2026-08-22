# Agent Status — Atlas P2 Performance / Polish

| Field | Value |
|-------|-------|
| project | Atlas P2 Performance / Polish (Train G) |
| primary repo | `hvcg-05` |
| branch | `cursor/atlas-search-performance-p2` |
| current SHA | `b0bcc9a4e9126375eaa4755e74bc4e358adf5b1c` |
| baseline | Hub `940a484` + Elite `75d0c59` via freeze tip `2a5a605` |
| owned domains | Search performance; operator honesty; dead-chrome primary nav |
| files/domains touched | `deadChrome.ts`, AppShell primary nav / Command-K / recents filters; Documents honesty (D11); search perf (prior) |
| contracts required | None |
| tests | See TEST STATUS |
| build | Elite `vite build` PASS this checkpoint (candidate only) |
| synthetic certification | Modeled search bench prior PASS. Live unauth 401 prior (D11). Auth latency NOT_RUN. |
| security status | Train P0: 0 · Train P1: SEARCH_LIVE_LATENCY. No LIVE_SECURITY_CERTIFIED / live P0=0 claim. No ATLAS-RT/XSYS. |
| Premium status | D12 nav rendered evidence on **local candidate preview** (desktop + mobile). **Live Elite `75d0c59` will not show this until a later authorized Elite release.** |
| integration dependencies | None |
| P0 | 0 (train) |
| P1 | SEARCH_LIVE_LATENCY (undeployed search patch; AUTHENTICATED_LATENCY=NOT_RUN) |
| P2 | Dead-chrome nav honesty addressed on this branch |
| owner decisions | OD-005 out of scope |
| deployment state | `REMOTE-REACHABLE` · **DO NOT DEPLOY** |

## Orchestrator control protocol

| Field | Value |
|-------|-------|
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **12** (`ORCH-D12` / `docs/platform-orchestration/directives/atlas-p2.md`) |
| ORCHESTRATOR REMOTE SHA | `0b337daf08831ad9525465170c232462ef4bd077` |
| BASED ON WORKER SHA (directive) | `78ec8848c98b8024caba14546d4c83efdcc35cdf` |
| ACK | **D12 acknowledged explicitly** (D11 accepted; unauth search not redone; no deploy) |

## Live search (carry-forward D11; not redone)

| Item | Value |
|------|--------|
| `AUTHENTICATED_LATENCY` | **NOT_RUN** (`HUB_TOKEN` still absent) |
| `SEARCH_LIVE_LATENCY` | **P1** (last live auth ~14.5s; candidate undeployed) |
| Unauth 401 | Prior D11 PASS — not re-probed per D12 |

## Nav change list (D12)

**Default primary nav (allowed only):** Command Center, My Work, Decisions (`/tasks`), Clients, Leads, Opportunities, Projects, Capital, Search / Knowledge, Documents, Connections, Settings, Administration (Connections/Admin capability-gated).

**Removed from default primary nav / Command-K catalog / shortcut chrome (dead chrome):** Inbox, Team, Analytics/executive, Revenue, Financials, Procurement, Risk, Growth, Automation, AI Agents, Reports, Banking, Accounting, `/clients/intake`.

**Kept as honest deferred ROUTES** (URL still works; not advertised in nav; not stored in recents): App.tsx deferred boundaries for those paths remain. No invented data.

**Hardening:** `src/layout/deadChrome.ts` denylist + allowlist; AppShell filters sections/catalog/shortcuts; dead paths do not enter recents.

## COMPLETED ACTIONS

- D12 dead-chrome nav honesty + tests
- Hub 325/325 + nav redteam PASS
- Elite production build PASS
- Premium local rendered nav evidence (desktop + mobile)
- Status CONSUMED=12

## REMAINING ACTIONS

1. Authenticated live search when token exists
2. Authorized Elite release to show D12 nav on live `75d0c59` SWA (not this train)
3. Authorized Hub deploy for search P1 (not this train)

## TEST STATUS

PASS — Hub **325/325**; Elite dead-chrome + AppShell + D11 honesty redteam **PASS**; Elite build **PASS**.

## PREMIUM STATUS

Local candidate app at `http://127.0.0.1:4180` (Local Owner session) — desktop + mobile nav evidence (`d12_nav_desktop_live.webp`, `d12_nav_mobile_live.webp`). Daily desk present; dead chrome absent. **Live Elite `75d0c59` will not show this until a later authorized Elite release.**

## INTEGRATION STATUS

N/A.

## OWNER DECISIONS

None.

**Updated:** 2026-08-22T01:50:00Z
