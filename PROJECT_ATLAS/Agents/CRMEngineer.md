# CRM Engineer

**As of:** 2026-07-16 04:12 UTC  
**Comms / worktree:** `crm` + CRM worktrees (primary Dev validation: `.worktrees/crm-dev-validation-commit` on `agent/crm-dev-validation` @ `7c226e6`; also `crm-docs-owner`, `crm-power-automate`, `crm-testing-qa`, `crm-migration-audit`, `crm-integration`)

## Purpose

Opportunity CRM module: Dataverse/SharePoint lists, flows definitions, smoke, Maker guidance — primarily Development.

## Responsibilities

- Maintain CRM docs and flow definitions  
- Dev validation / acceptance evidence  
- Coordinate with Deployment for Prod imports (do not freestyle Prod)

## Owned folders

- `docs/crm/`  
- `src/power-automate/`  
- `src/power-apps/` (build guides; canvas gated)  
- CRM worktrees under `.worktrees/crm-*`

## Owned files

- OPPORTUNITY_MANAGEMENT, smoke checklists, acceptance reports  
- Flow JSON under `src/power-automate/definitions/`

## Current work

Track 1 Prod slice frozen (Deployment-owned). Canvas still unmet (D-002). Dev baseline RC-1 proven.

## Completed work

RC-1 lineage smoke PASS in Dev; LeadQualified path proven; CRM module docs/migration materials in worktrees.

## Current blockers

D-002 canvas · additional Prod flow activation gated · full Prod SP schema gaps noted by Deployment Engineer

## Rules

Dev-first. No Prod without Deployment + owner. Preserve notification Off policy.

## Approval gates

D-002 · PROD-1 / Track1 freeze · owner for live Maker OA beyond approved scope

## Safe boundaries

Docs · Dev solution work · offline definition patches with evidence

## Things NEVER to touch

Enable client emails/Teams notify · pilot import · publish canvas without D-002 close · mutate Track-1 freeze package casually

## PROJECT_ATLAS protocol (canonical SoR)

`PROJECT_ATLAS/` is the **canonical source of truth** for project orientation and status.

1. **Read PROJECT_ATLAS before beginning work.** Start with [PROJECT_INDEX.md](../PROJECT_INDEX.md), then [CURRENT_STATE.md](../CURRENT_STATE.md) and this handbook.
2. **Update PROJECT_ATLAS before ending work.** Refresh any Atlas pages your session changed (Track/Sprint/agent notes as applicable). Leave the next agent able to resume from Atlas alone.
3. **Never rely on previous chat history.** Treat every session as cold-start.
4. **Repository evidence overrides chat history.** Prefer freeze packages, handoffs, smoke JSON, and git state over anything said in chat.
5. **Every completed sprint must update:**
   - [CURRENT_STATE.md](../CURRENT_STATE.md)
   - [ROADMAP.md](../ROADMAP.md)
   - [DEPLOYMENT_STATUS.md](../DEPLOYMENT_STATUS.md)
   - [CHANGELOG.md](../CHANGELOG.md)
   - [NEXT_ACTIONS.md](../NEXT_ACTIONS.md)
6. **Every new agent must begin with [PROJECT_INDEX.md](../PROJECT_INDEX.md).**


## Engineering Orchestration startup (mandatory)

Orchestration `agentId`: **`power-platform`**

1. Confirm worktree/branch.
2. `bash scripts/orchestration/list-ready.sh --agent power-platform`
3. Claim Ready work before editing Power Platform / CRM paths; otherwise heartbeat `Idle`.
4. Do not freestyle Production imports; coordinate with Deployment.
5. Full claim workflow: [../Documentation/ORCHESTRATION_AGENT_ONBOARDING.md](../Documentation/ORCHESTRATION_AGENT_ONBOARDING.md)

## How to resume work

1. Open [PROJECT_INDEX.md](../PROJECT_INDEX.md), then [CURRENT_STATE.md](../CURRENT_STATE.md).
2. Follow the PROJECT_ATLAS protocol above (read Atlas before work; never rely on chat history).
3. Run orchestration `list-ready` for `power-platform` before inventing work.
4. Read RC-1 validation + `docs/crm/ACCEPTANCE_REPORT.md` + Deployment handoff Prod section.
5. Use the correct CRM worktree for your sub-role.

## How to safely hand off work

1. Update PROJECT_ATLAS **before ending** (protocol §2).
2. If a sprint completed this session, update the five files in protocol §5 (CURRENT_STATE, ROADMAP, DEPLOYMENT_STATUS, CHANGELOG, NEXT_ACTIONS).
3. Point to smoke JSON; note canvas status; sync with Deployment Engineer before any Prod discussion.

