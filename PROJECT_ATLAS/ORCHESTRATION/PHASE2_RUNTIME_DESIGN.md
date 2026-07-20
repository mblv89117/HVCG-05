# Phase 2 Design — Atlas Agent Runtime (post PoC)

**Prerequisite:** Phase 1 PASS with evidence (ATLAS-R-001). Do not deploy until Owner approves.

## Goals

- Treat Cursor Cloud Agents as the autonomous worker runtime (not local chat sessions).
- Dispatch many role-scoped agents in parallel.
- Durable orchestration, retries, and auditability.

## Architecture

```
Owner / Master PM
       │
       ▼
 Atlas Control Plane (orchestration JSON + future Cosmos/Table)
       │
       ▼
 Azure Service Bus (topic: atlas.tasks)
       │  subscriptions per role / priority
       ▼
 Azure Durable Functions (Orchestrator)
       │  activity: DispatchCursorCloudAgent
       │  activity: PollOrAwaitWebhook
       │  activity: RecordRunResult
       │  activity: EnforcePathPolicy
       ▼
 Cursor Cloud Agents API (https://api.cursor.com/v1/agents)
       │
       ▼
 GitHub repo (exclusive branch per task)
```

## Components

| Component | Purpose |
|---|---|
| Service Bus topic `atlas.tasks` | Buffer + fan-out of structured tasks |
| Durable Function orchestrator | Per-task saga: create → poll → verify → close |
| Activity `DispatchCursorCloudAgent` | Wraps Atlas adapter (`workOnCurrentBranch`, authorized paths in prompt) |
| Activity `PollRun` | GET `/v1/agents/{id}/runs/{runId}` until terminal (webhook when GA) |
| Activity `RecordRunResult` | Write run JSON + update queue task |
| Activity `EnforcePathPolicy` | Fail if `git diff` includes non-authorized paths |
| Azure Key Vault | Secret `cursor-api-key`; Managed Identity |
| App Insights | Trace ids = Atlas taskId + cloud agentId + runId |

## Parallelism

- One Durable orchestration instance per `taskId`.
- Max concurrent cloud agents = plan limit (configurable throttle via SB sessions or DF concurrency).
- Exclusive branch naming: `cursor/<role>/<purpose>-<taskId>` (ADR-0003).

## Security

- No secrets in git; Key Vault only.
- Soft path constraints in prompt + hard post-run `git diff` gate.
- No Production Power Platform publish from cloud agents without Owner lock lift.

## Migration from PoC

1. Promote `PROJECT_ATLAS/runtime/adapters/cursor` into Function App package.
2. Replace poll interval with webhook when Cursor v1 webhooks ship.
3. Keep local CLI dispatcher for Owner emergency / offline validation.
