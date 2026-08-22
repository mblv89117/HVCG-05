# Atlas Agentic Operations

## Objective

Atlas becomes the signed HVCG operator environment where Manny can ask what needs
attention, why it matters, and what evidence supports the answer. Cursor and V4
remain the governed engineering backend, but normal HVCG operations should move
inside Atlas.

## Current-state discovery

The current HVCG OS already provides the right base primitives:

- Data plane: SharePoint/Microsoft Lists remain the authoritative operational
  store for clients, projects, tasks, decisions, documents, capital, revenue,
  relationships, and AI queues.
- Operator UI: Power Apps canvas specs under `src/power-apps` define Executive
  Home, Operations Home, CRM, Capital, Client Detail, and AI queue surfaces.
- Intelligence: `HVCG_Relationships` and
  `docs/intelligence/INTELLIGENCE_QUERY_CATALOG.md` provide cross-domain query
  patterns, including executive attention ranking.
- AI orchestration: `HVCG_AIWorkers`, `HVCG_AIJobs`, `HVCG_AIContext`,
  `HVCG_AIPrompts`, `HVCG_AIToolRegistry`, `HVCG_AIOutputs`,
  `HVCG_AIApprovals`, and `HVCG_AIAuditLog` already exist.
- Monitoring: `HVCG_OperationalAlerts` and
  `deployment/health/Invoke-HVCGOSOperationalHealth.ps1` provide operational
  health inputs.
- Release posture: additive SharePoint schema packs are the established safe
  path for v1.x changes.

## Selected incremental architecture

This slice does not create a new system. It extends Atlas with four additive
lists and one registry enhancement:

| Capability | Store | Purpose |
| --- | --- | --- |
| Ask Atlas conversation state | `HVCG_AskAtlasSessions` | Signed operator questions, response summary, policy decision, evidence references |
| Event-driven signals | `HVCG_AgentEvents` | Normalized user/system events routed to agent capabilities |
| Activity ledger | `HVCG_AgentActivity` | Permanent audit of questions, tools, sources, policy, writes, approvals, outcomes |
| Engineering loop | `HVCG_EngineeringMissions` | Atlas-originated missions for V4 with evidence, acceptance, risk, rollback |
| Tool gateway policy | `HVCG_AIToolRegistry.PermissionClass` | READ_AUTO / PROPOSE_AUTO / SAFE_INTERNAL_WRITE / GOVERNED_TECHNICAL_WRITE / OWNER_GATED |

Existing `HVCG_AIJobs` remains the execution/run record for agent work.
Existing `HVCG_AIApprovals` remains the approval register. Existing specialized
`HVCG_AI_*` queues remain domain-specific output queues.

## Tool permission classes

- `READ_AUTO`: retrieve, search, summarize, analyze when operator/client
  authorization permits.
- `PROPOSE_AUTO`: create visibly non-authoritative proposed actions,
  classifications, or recommendations.
- `SAFE_INTERNAL_WRITE`: write bounded derived context, audit entries, internal
  agent state, or non-authoritative classifications.
- `GOVERNED_TECHNICAL_WRITE`: create engineering missions and route approved
  internal technical work to V4 release controls.
- `OWNER_GATED`: money movement, lender submissions, signatures, contracts,
  paid ads, live outbound, destructive/irreversible business actions, and
  material external commitments.

## Ask Atlas retrieval policy

Ask Atlas must filter by authorization before retrieval. It must not retrieve
broad cross-client data and rely on prompting to hide it.

Minimum policy:

1. Resolve signed operator and role from Atlas.
2. Resolve `ConversationScope` and optional `ClientCode`.
3. Select only governed tools allowed for the role, scope, data classification,
   and requested permission class.
4. Retrieve source records with client isolation filters applied first.
5. Synthesize with evidence classification:
   `CONFIRMED`, `LIKELY`, `PROPOSED`, `STALE_OR_UNCERTAIN`, or `COMPLETE`.
6. Write `HVCG_AgentActivity` for material tool use and response output.

## First production-useful question

The first Ask Atlas capability should answer:

> What are the most important things I need to address across HVCG right now,
> why, and what is each based on?

Initial tools should be read-first and attention-focused:

- `get_attention_items`
- `get_overdue_items`
- `get_blocked_items`
- `get_decisions`
- `get_capital_context`
- `search_authorized_knowledge`
- `create_engineering_mission`
- `get_agent_activity`

## Engineering loop

Product Improvement Agent flow:

1. Signal appears in `HVCG_AgentEvents` or operator asks in Ask Atlas.
2. Atlas records material work in `HVCG_AgentActivity`.
3. If the issue is technical and supported by evidence, Atlas creates
   `HVCG_EngineeringMissions` with acceptance criteria and rollback.
4. V4 consumes the mission, creates bounded execution as needed, validates,
   releases when safe, and writes the result back to Agent Activity / mission.

## Guardrails

- Client A data must never enter Client B retrieval, memory, prompts, caches, or
  activity records.
- External owner-gated actions must stop at proposal/approval.
- Agent policies are versioned in repo/docs and list schema, not ad hoc chat.
- Activity ledger records enough provenance for the owner to ask, "What is this
  based on?"
- Material product changes require independent validation proportional to risk.
