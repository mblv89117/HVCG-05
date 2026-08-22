# Screen: Agent Center (scrAgentCenter)

**App:** HVCG_ProjectCommandCenter  
**Audience:** Owner, Administrator, OperationsManager; read-only summary for approved internal roles  
**Purpose:** native Atlas control surface for AI operations, activity, approvals, and recommendations

## Jobs to be done

1. See what Atlas agents are doing and why.
2. Review recent Ask Atlas answers, tool calls, recommendations, and failures.
3. Approve/reject gated AI outputs.
4. Track product-improvement engineering missions routed to V4.
5. Pause or suppress unsafe/noisy agent activity without deleting history.

## Data sources

| List | Purpose |
| --- | --- |
| `HVCG_AIWorkers` | registered agent capabilities and status |
| `HVCG_AgentActivity` | auditable activity stream |
| `HVCG_AgentEvents` | new/routed/failed operating signals |
| `HVCG_AIJobs` | execution status and retry count |
| `HVCG_AIApprovals` | approval state for gated outputs |
| `HVCG_AIOutputs` | generated outputs |
| `HVCG_EngineeringMissions` | Atlas-originated engineering loop |
| `HVCG_OperationalAlerts` | platform health and automation warnings |

## Layout

```text
Header: Agent Center | health | last sweep | emergency pause indicator
KPI strip: Active agents | New signals | Pending approvals | Failed jobs | Missions ready for V4
Tabs:
  Activity
  Recommendations
  Approvals
  Engineering Missions
  Agent Registry
```

## Activity tab

`galAgentActivity` filters `HVCG_AgentActivity` by date, agent, outcome,
permission class, and client code. Cards show:

- agent and version;
- activity type;
- policy decision;
- write scope;
- outcome;
- source evidence;
- affected client/entity;
- related job or engineering mission.

## Recommendations tab

Shows non-authoritative proposed work from `HVCG_AI_SuggestedActions` and
Ask Atlas answer cards. Recommendations must be visibly labeled `PROPOSED`
until reviewed or converted into a normal HVCG task/decision.

## Approvals tab

Shows pending records from `HVCG_AIApprovals`.

Owner-gated actions are never auto-approved by Agent Center. They remain
blocked until the owner decision is recorded.

## Engineering Missions tab

Shows `HVCG_EngineeringMissions` by status:

- Proposed
- ReadyForV4
- InProgress
- Implemented
- Validated
- Deployed
- LiveVerified
- Blocked / RolledBack

Mission cards show business impact, acceptance criteria, risk, affected repo,
affected system, rollback expectation, and originating evidence.

## Agent Registry tab

Shows `HVCG_AIWorkers` and allowed tools from `HVCG_AIToolRegistry`.
Disable/suppress actions should write activity; they must not delete worker
history.

## Acceptance criteria

- Owner can answer "what have agents done today?" from `HVCG_AgentActivity`.
- Pending approvals are visible without searching raw lists.
- Failed jobs and retries are visible with recommended next action.
- Engineering missions show evidence, risk, acceptance criteria, and V4 status.
- ClientCode filters apply before showing activity detail.
- Owner-gated requests remain blocked until explicit owner action.
