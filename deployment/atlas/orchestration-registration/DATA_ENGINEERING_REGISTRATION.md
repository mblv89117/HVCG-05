# Sprint 12 — Data Engineering Registration

**Platform:** Atlas Engineering Orchestration Platform  
**Orchestration SoR:** `.worktrees/sprint12-engineering-orchestration/PROJECT_ATLAS/ORCHESTRATION`  
**Confirmed by:** deployment-manager  

## Status: REGISTERED

| Field | Value |
|-------|-------|
| agentId | `data-engineering` |
| displayName | Data Engineering |
| status | active |
| capabilities | schema, etl, sample-data, dataverse-model |
| ownedPaths | `sample-data/`, `releases/migrations/` |
| defaultBranchPrefix | `cursor/data-` |
| escalatesTo | master-pm |
| orchestration heartbeat | Idle |
| agent-comms | registered (inbox `.agent-comms/inbox/data-engineering`) |

## Notes

- Registry entry already present under ATLAS-T-1202 (Waiting Review); not modified.
- No Ready task seeded; no branch/worktree/path lock created.
- Heartbeat written to Sprint 12 orchestration worktree SoR.
