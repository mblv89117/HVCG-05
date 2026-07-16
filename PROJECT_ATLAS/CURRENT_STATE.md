# CURRENT_STATE

**As of:** 2026-07-16 19:01 UTC
**Sources:** `git` (`origin/cursor/revenue-sprint3-conversion` @ `0073bf49411408cced88873805b432bce4eefb31`), `.worktrees/deployment-engineer/releases/Track-1-Live-Internal/`, `.worktrees/deployment-engineer/deployment/release-ops/GO_LIVE_STATUS.md`, `deployment/release-ops/HANDOFFS/RevenueSystemsEngineer.md`, `releases/RC-1-Development-Baseline/version.json`

## Snapshot

| Area | Status | Evidence |
|------|--------|----------|
| Track 1 (internal Prod CRM) | **FROZEN — LIVE—INTERNAL** | `.worktrees/deployment-engineer/releases/Track-1-Live-Internal/`; GO_LIVE_STATUS 2026-07-16T03:08Z |
| Sprint 1 Revenue OS | **COMPLETE** | Revenue handoff; EVA → Dev CRM smoke |
| Sprint 2 Revenue OS | **COMPLETE** (Dev/Staging) | `origin/cursor/revenue-sprint3-conversion` @ `0073bf4` |
| Sprint 3 Revenue OS | **COMPLETE** (Dev/Staging) | Same commit; conversion engine + tests in git |
| Sprint 4 | **READY TO START — NOT STARTED** | Awaiting Master PM + owner assignment |
| Revenue Systems Engineer | **COMPLETE** | Role closed for Sprint 1–3 @ `0073bf49411408cced88873805b432bce4eefb31` |
| Production | HVCG Production Track 1 slice live | `https://orgee2f7545.crm.dynamics.com/` |
| Development | HVCG Development | `https://org1131a2b0.crm.dynamics.com/` |
| Website public / DNS | **NOT STARTED** | Track-1 freeze gates |
| Pilot client import | **NOT STARTED** / BLOCKED | GO_LIVE Track 2 Pilot |
| Canvas publish | **NOT DONE** (D-002) | RC-1 + Deployment Engineer handoff |
| Main checkout | `cursor/agent-communications` | Local orientation/Atlas branch |
| Revenue tip | `0073bf4` on `origin/cursor/revenue-sprint3-conversion` | Verified via `git fetch` / `git rev-parse` |
| Atlas committed tip | `692d276` on `origin/cursor/agent-communications` | Local HEAD = remote branch tip |

## Release checkpoint

[Release Candidate RC-1](Releases/Release_Candidate_RC-1.md) records the verified pre-Sprint 4 state. Immutable anchors:

- Revenue: `0073bf49411408cced88873805b432bce4eefb31`
- Atlas baseline: `692d27668e2144ec0e62360941c249dfd3d92db4`
- Track 1 freeze tag: `302615956cea80c238172931f5901792f548f59c`

The repository working directories are **not clean**; RC-1 excludes all uncommitted files. See the checkpoint for counts and worktree status.

## Revenue tip (canonical for Sprint 2–3 code)

| Field | Value |
|-------|-------|
| Remote branch | `origin/cursor/revenue-sprint3-conversion` |
| Local branch | `cursor/revenue-sprint3-conversion` |
| Commit | `0073bf49411408cced88873805b432bce4eefb31` |
| Worktree | `.worktrees/revenue-sprint3` |
| Message | Add Sprint 2 EVA experience and Sprint 3 conversion engine (Dev/Staging). |

## Environments

| Name | ID | URL |
|------|-----|-----|
| HVCG Production | `f141a2cf-ae13-eb59-84c4-25817d899105` | `https://orgee2f7545.crm.dynamics.com/` |
| HVCG Development | `c03b1329-4394-ece7-acc9-c50794b3db1e` | `https://org1131a2b0.crm.dynamics.com/` |

## Production Track 1 slice (frozen)

- Managed solution imported; LeadQualified functional smoke **PASS**
- Flows: **1 Activated** (`HVCG_LeadQualifiedCreateOpportunity`) · **14 Draft**
- Gates: Teams notify **Off** · client emails **Off** · no canvas · no pilot import · no DNS

## Active worktrees (notable)

| Worktree | Branch | HEAD (short) |
|----------|--------|--------------|
| `.` (main) | `cursor/agent-communications` | see `git rev-parse` |
| `.worktrees/deployment-engineer` | `cursor/deployment-engineer` | `c726f1e` |
| `.worktrees/revenue-sprint3` | `cursor/revenue-sprint3-conversion` | `0073bf4` |
| `.worktrees/client-portal-sprint1` | `cursor/client-portal-sprint1` | Sprint 1 Phase 1 MVP (pending commit) |
| `.worktrees/master-pm-orchestrator` | `cursor/master-pm-orchestrator` | `b75b19b` |

Full table: [AGENT_ASSIGNMENTS.md](AGENT_ASSIGNMENTS.md)

## Client Portal (Track 4)

| Field | Value |
|-------|-------|
| Sprint 1 Phase 1 | **COMPLETE (repo)** on `cursor/client-portal-sprint1` / `.worktrees/client-portal-sprint1` |
| App | `apps/hvcg-client-portal` (mocked integrations; no live invites) |
| Commit/push | **Owner approved — committed and pushed on isolated branch** |
| Prod invites | Still gated **BL-C1** |

## Priorities now

1. Do **not** modify Track 1 frozen Production slice without new owner approval
2. Assign / gate **Sprint 4** (Revenue Track **READY TO START**; Sprint 4 not started)
3. Soft UAT / optional Dev HTTP URL / website preview / pilot — owner gates
4. Keep Atlas as SoR; Revenue code SoR is `origin/cursor/revenue-sprint3-conversion` @ `0073bf49411408cced88873805b432bce4eefb31`
5. Preserve Client Portal Sprint 1 on its isolated branch; do not merge without a separate instruction

## Status authority

Within Atlas, **this file** is the status SoR. Track/Sprint pages and agent handbooks must match it.

## Known stale note

`.worktrees/master-pm-orchestrator/docs/business-launch/go-live/GO_LIVE_STATUS.md` may still describe earlier Prod-blocked state. Prefer Deployment Engineer Track-1 package + GO_LIVE_STATUS for Track 1. Track-1 freeze is **not** at repo-root `releases/Track-1-Live-Internal/`.
