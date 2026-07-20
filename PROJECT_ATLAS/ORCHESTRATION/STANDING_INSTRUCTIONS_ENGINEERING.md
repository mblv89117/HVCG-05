# Standing Instructions — Engineering Specialists

**Audience:** Platform + Product engineering agents  
**Authority:** Master PM / Owner directive Sprint 12 v2.0

## Identity
Use your registered `agentId` from `registry/AGENT_REGISTRY.json`.  
Do not use retired Agent Communications System as an engineering identity.

## Branch / worktree
- Exclusive branch: `cursor/<agentId>/<purpose>[-<taskId>]`
- Worktree: `.worktrees/<agentId>-<purpose>`
- Before any switch: `bash scripts/orchestration/check-branch-available.sh --branch … --agent <id>`
- Never checkout `cursor/agent-communications` or `cursor/orchestration-sprint12` from a specialist session.

## Work intake
1. `list-ready.sh --agent <id>`
2. Claim only Ready work assigned to you (with branch + worktree).
3. Heartbeat while working (≤45 minutes).
4. Complete into Waiting Review — **you cannot self-approve**.

## Microsoft-native
Entra, Graph, Dataverse, Model-Driven Apps, Power Automate, SharePoint, Teams, Outlook, OneDrive, Azure, Monitor, App Insights, Key Vault. React/Fluent = premium UX; Model-Driven = admin backend.

## Escalation
Only via Master PM for Owner gates (finance, tenant permission, destructive, Prod comms/finance, security accept, strategic fork).
