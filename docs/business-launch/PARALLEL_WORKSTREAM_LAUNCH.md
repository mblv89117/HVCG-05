# PARALLEL_WORKSTREAM_LAUNCH

**As of:** 2026-07-15 18:20 PT  
**Authority:** Master PM  
**Prod / external / destructive:** Forbidden on all streams

## Collision fix (applied)

| Conflict | Resolution |
|----------|------------|
| `crm` + `docs` both claimed `docs/business-launch/` | **Partition:** Client Ops writes `clients/`, `crm-import/`, `*_ONBOARDING_PACKET.md`, `inventory/`. Sales writes `website/` only. Master PM sole writer of root registers (`*_STATUS.md`, `*_REGISTER.md`, `OWNER_DECISIONS.md`). |
| `operations` + `operations-hub` duplicate | Treat as **one** Client Ops owner: `operations-hub` worktree; retire duplicate assignment noise. |

## Launch matrix

| # | Workstream | Team | Agent owner | Worktree | Exclusive write paths | Deps OK? | Prod? | Ext? | Destructive? |
|---|------------|------|-------------|----------|----------------------|----------|-------|------|--------------|
| 1 | Client migration + CRM shells | Client Operations | `operations` + Master PM consolidate | `operations-hub` + read OD; CRM JSON in master-pm `crm-import/` via Master PM lock | `docs/operations/client-migration/` (ops) · `docs/business-launch/clients/` · `crm-import/` (MPM) | Yes | No | No | No |
| 2 | Website staging | Sales and Growth | `docs` (Website) | master-pm `website/` only | `docs/business-launch/website/**` | Yes (local staging) | No | No | No |
| 3 | EVA + pricing engine | Sales + Finance | `finance` | `finance-operations` | `docs/finance/pricing/` · `docs/finance/eva/` | Yes (rates canonical) | No | No | No |
| 4 | Executive dashboard | Executive Office | `executive` | `executive-command-center` | `docs/executive/**` | Yes (consume read-only profiles) | No | No | No |
| 5 | Automation inventory | Technology | `ai-governance` | `ai-governance-work-queues` | `docs/ai/automation-backlog/` · `docs/business-launch/automation/` (MPM seed) | Yes | No | No | No |
| 6 | Documentation sync | Executive Office | `docs` agent on doc WT for non-BL | `documentation-knowledge-manager` | `docs/` excl. business-launch registers | Yes | No | No | No |
| 7 | Financial invoice inventory | Finance Operations | `finance` | `finance-operations` | `docs/finance/inventory/` | Yes (read-only OD) | No | No | No |

**Master PM sole paths:** `MASTER_*.md`, `docs/business-launch/*_STATUS.md`, `*_REGISTER.md`, `OWNER_DECISIONS.md`, executive report.
