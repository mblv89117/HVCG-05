# EOS Sprint 1 — Architecture

**Track:** 9 — Engineering Operating System
**Version:** eos-1.0.0
**Environment:** Development staging

## Principles

1. Project Atlas remains institutional SoR.
2. Agent registry and worktrees remain ownership SoR.
3. Agent-comms v1 remains operational; Bus 2.0 is additive.
4. No redesign of Revenue, QA, or Deployment completed systems.

## Components

| Component | Role |
|-----------|------|
| Snapshot collector | Read-only inventory of tracks, sprints, branches, worktrees, agents, QA, debt, CRs |
| Workflow engine | Explicit lifecycle stages from Owner Request → Close Sprint |
| Change Request system | Structured CR objects with approvals and plans |
| Agent Bus 2.0 | Standardized messages with correlation / track / sprint |
| Master PM automation | Summaries, briefings, readiness reports |
| Engineering analytics | KPI definitions and computed metrics |
| Command Center | Operator dashboard |
| Executive Engineering Dashboard | Owner one-page health view |

## Data flow

```
git worktree list + registry.json + Atlas markdown + local CR/bus stores
        │
        ▼
   EOS Snapshot (JSON)
        │
        ├──► Command Center
        ├──► Master PM reports
        ├──► Analytics KPIs
        └──► Executive Dashboard
```

## Non-mutations

- Revenue Sprint 4 commits
- Track 1 freeze package
- Production environments
- Existing Power Automate activations
- Agent-comms v1 required fields
