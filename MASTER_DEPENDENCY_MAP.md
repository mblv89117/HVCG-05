# MASTER DEPENDENCY MAP

**Owner:** Master PM  
**As of:** 2026-07-15 15:27 PT

## Hard dependencies

| Upstream | Downstream | Rule |
|----------|------------|------|
| D-001 Maker consent | CRM live E2E | Owner gate |
| D-002 Canvas | CRM UI smoke | Owner/Maker gate |
| CRM smoke PASS + clean commit | Any module merge to release line | No merges onto dirty MAIN |
| Agent bus operational | Cross-agent coordination | Prefer bus over chat |
| Executive READY | First business-module merge | After CRM park + D-003 |
| Ops exclusive packaging | Ops integration | Shared indexes locked until window |
| Portal schema | Portal flows/UI | Portal owns Data Rooms lists |
| AI list schema commit | AI READY | No shared engines |
| Finance exclusive scaffold | Finance READY | No shared indexes |

## File ownership (enforce)

| Owner | Exclusive |
|-------|-----------|
| CRM | Live CRM flows, CRM Maker smoke, CRM acceptance during live run, CRM solution under smoke |
| Executive | `docs/executive/**`, `src/power-apps/executive/**`, `ExecutiveNamedFormulas.fx`, `src/power-bi/executive/**`, `executive-views.json`, `tests/executive/**` |
| Operations | `HVCG_Ops*`, `operations-hub-views.json`, ops docs/apps |
| Finance | `docs/finance/**`, finance lists/apps |
| Client Portal | `docs/portal/**`, `HVCG_DataRoom*`, `HVCG_Portal*` |
| AI Governance | `docs/ai/**`, `HVCG_AI*` |
| Agent Comms | `.agent-comms/**`, `scripts/agent-comms/**`, `docs/agents/*COMMS*`, bootstrap prompts |
| Integration | Merge planning, release docs, parallel map |
| Master PM | `MASTER_*.md` only (+ bus routing messages) |

## Locked (change window + bus lock required)

- `deployment/**` engines  
- Auth / PnP / `.env*` / environment configs  
- Shared indexes: `flows/_index.json`, `definitions/_index.json`, `lists/_index.json`  
- `command-center-views.json`  
- Shared `NamedFormulas.fx` / root BUILD_SHEET (append-only at integration)  
- Production  

## Soft overlaps

| Pair | Surface | Handling |
|------|---------|----------|
| crm ↔ integration | `docs/crm/PARALLEL_AGENT_MAP.md` | Integration owns map; CRM does not rewrite |
| Ops ↔ all | Shared indexes (already modified) | CONFLICT bus thread; freeze |
| MAIN CRM WIP ↔ agent-comms | Same worktree dirt | Segregate commits; do not package together |
