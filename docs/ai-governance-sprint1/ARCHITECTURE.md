# AI Governance Sprint 1 Phase 1 — Architecture

**Status:** Implementation complete pending QA and owner approval
**Mode:** Internal mock/offline only
**App:** `apps/hvcg-ai-governance/`
**Runtime:** React 19, TypeScript, Vite
**Branch:** `cursor/ai-governance-sprint1`

## Purpose

The first HVCG AI Governance control plane gives ownership an executive view of AI agents, prompts, tools, health, cost, actions, approval gates, and compliance risks. It does not orchestrate live agents or connect to billing, identity, Microsoft 365, Production, deployment, client, or financial systems.

## Architecture

```text
AppShell
├── Mock/offline environment indicator
├── Owner / Governance Admin / Auditor view switch
└── Route outlet
    ├── Overview
    ├── Agent Registry → Agent Detail
    ├── Prompt Registry
    ├── Tool & Permission Matrix
    ├── Agent Health
    ├── Cost & Usage
    ├── Audit Log
    ├── Approval Queue
    ├── Risk & Compliance
    └── Governance Policies

GovernanceProvider
├── Role capability evaluation
├── Approval authority
├── Cost visibility
└── Prompt-edit capability

Mock domain data
├── agents
├── prompts
├── permissions
├── audit events
├── approvals
├── risks
└── policies
```

## Design language

The application intentionally follows Executive Command Center Sprint 1:

- deep forest fixed sidebar;
- restrained gold, sage, red, amber, and blue operational tones;
- paper/surface backgrounds;
- executive metric strips;
- dense but readable tables;
- small-radius panels;
- mobile drawer navigation;
- minimal ornament and no novelty illustrations.

## Trust boundaries

| Boundary | Phase 1 behavior |
|----------|------------------|
| Production | No connection; permission cannot be Execute |
| Deployment | Mock matrix only; owner approval represented |
| Microsoft 365 | No connection |
| Billing | Mock costs only |
| Client / financial data | Synthetic aggregate labels only |
| Agent runtime | Mock status; no process control |
| Approval actions | UI controls only; no persistence or side effect |

## Role capabilities

| Capability | Owner | Governance Admin | Auditor |
|------------|-------|------------------|---------|
| View registry / prompts / health / audit / policies | Yes | Yes | Yes |
| View costs | Yes | Yes | No |
| Create prompt version (mock control) | Yes | Yes | No |
| Approve / reject requests | Yes | No | No |

Role switching is a QA demonstration control, not authentication. A future backend must enforce identity and authorization server-side.

## Future adapter boundary

Phase 1 pages consume normalized records from `src/data/mockData.ts`. A future adapter can implement the same TypeScript contracts from approved sources:

```text
Agent Comms ──┐
Git metadata ─┤
Atlas data ───┼──> GovernanceData adapter ──> pages
Billing data ─┤       (future, approved)
IAM / tools ──┘
```

No future adapter should be introduced until source ownership, security review, retention, and approval requirements are defined.

## Rollback

The sprint is isolated. Rollback is deletion of `.worktrees/ai-governance-sprint1` and branch `cursor/ai-governance-sprint1`. No database, environment, deployment, or Production rollback is required.
