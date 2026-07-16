# AI Governance Sprint 1 Phase 1 — Architecture

**Track:** Track 6 — AI
**Mode:** Internal mock/offline only
**Branch:** `cursor/ai-governance-sprint1`
**Worktree:** `.worktrees/ai-governance-sprint1`

## Decision

Build AI Governance as a standalone React control-plane application under `apps/hvcg-ai-governance/`. The sprint does not modify existing AI orchestration lists, agent communications, deployment systems, subsystem apps, Production, or shared Atlas indexes.

## Boundaries

```text
Mock governance records
        ↓
TypeScript contracts
        ↓
Role-aware React pages
        ↓
Executive control surfaces
```

There are no outbound adapters, API calls, credentials, writes, deployments, or agent-control side effects.

## Control domains

1. Agent identity and ownership
2. Prompt versions
3. Tool permissions
4. Agent health
5. Cost and usage
6. Audit history
7. Human approvals
8. Risk and compliance
9. Governance policy

## Security posture

- default deny;
- human approval for governed actions;
- Production cannot be Execute;
- mock/synthetic data only;
- role switching is demonstrative and not authentication;
- all future enforcement must occur server-side.

Detailed architecture: `docs/ai-governance-sprint1/ARCHITECTURE.md`.
