# OPERATING_DIVISIONS

**As of:** 2026-07-15 18:35 PT  
**Authority:** COO (Master PM) · Reports to CEO (Manny)  
**Mission:** Increase enterprise value every day  

## Value filter (every task must hit ≥1)

Revenue · Profit · Enterprise Value · Client Satisfaction · Automation · Risk Reduction  

## Divisions

| Division | Owns | Primary KPIs | Specialist owners | Write paths (exclusive) |
|----------|------|--------------|-------------------|-------------------------|
| **Executive Office** | Briefs, roadmap, decisions, agent coordination, EV narrative | Brief on time; open gates ≤6 types; collision=0 | master-pm, executive | `MASTER_*.md`, `EXECUTIVE_BRIEF.md`, `OWNER_DECISIONS.md`, `docs/business-launch/*_STATUS.md` (registers) |
| **Sales** | Pipeline, proposals, appointments, lead scoring | Pipeline $; proposals drafted; cycle time | sales Task / docs(sales) | `docs/business-launch/sales/` |
| **Marketing** | Website staging, SEO, content, lead magnets, brand | Staging readiness; CTA conversion (test); content cadence | website specialists | `docs/business-launch/website/` |
| **Client Success** | Legacy client health, renewals, CX, portal prep | Green clients ↑; churn risk ↓; CSAT proxy | operations, client-portal | `docs/business-launch/clients/`, `portal/` |
| **Operations** | Delivery rhythm, tasks, onboarding ops, workspaces | On-time deliverables; onboarding cycle time | operations-hub | `docs/operations/`, `onboarding/` |
| **Finance** | AR, collections drafts, pricing register, invoice inventory | AR aging; DSO; collections queue hygiene | finance | `docs/finance/` (finance WT) + `docs/business-launch/finance/` |
| **Capital Advisory** | Capital packages, lender packs, funding status, EVA→capital path | Capital opps tracked; package cycle time | crm + finance hooks | `docs/business-launch/capital/` |
| **AI Automation** | Automation catalog, brief assembly, draft flows | Hrs saved/wk; automations in prod-ready stub | ai-governance | `docs/ai/`, `docs/business-launch/automation/` |
| **Product Development** | Power Apps/CRM Dev shells, Command Center, staging product | Dev usability; shell completeness | crm, architect (standards) | CRM module paths; `crm-import/` |
| **Legal & Compliance** | Disclaimers, publish gates, data handling, no-auto-contact | Gate adherence; zero unauthorized sends | ai-governance (policy) + Master PM | `docs/business-launch/legal/`, OWNER gates |

## Interrupt CEO only when

1. Money can be collected  
2. Client needs CEO judgment  
3. Proposal needs signature  
4. Legal/compliance approval  
5. Production deployment  
6. Critical blocker cannot be solved autonomously  

## Rules

- Parallel specialists when ownership clear · no shared-file dual-writes  
- Every completed task → enqueue next highest EV task  
- Never ask CEO “what next?”  
- Never auto-contact clients · never reprice legacy · never public-publish without gate  
