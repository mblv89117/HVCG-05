# Revenue OS Audit — BA V2 Sprint 3

**As of:** 2026-08-11  
**CR:** CR-HVCG-BA-V2-001  
**Branch:** `cursor/hvcg-business-architecture-v2` @ post-Sprint-2 `16609c4`  
**Rule:** Extend existing Revenue OS — do not create a second Revenue OS.

## Canonical sources

| Layer | Location | Tip |
|-------|----------|-----|
| EVA conversion S3 | `.worktrees/revenue-sprint3` | `0073bf4` |
| Sales activation S4 | `.worktrees/revenue-sprint4` | `bf34c93` |
| Design model | `.worktrees/revenue-os-atlas-design` | design pack |
| Elite pipeline UI | `.worktrees/revenue-pipeline-product` | `revenuePipeline.ts` |
| BA V2 commercial SoR | this worktree `config/business/` | Owner ADR-BA-V2-002 |

## What already existed

- SharePoint CRM: Leads, Opportunities, Proposals, Clients, Contacts, OpportunityActivities, Approvals, Referrals
- EVA free assessment staging app + conversion-engine.js (auto_qualify=false)
- LeadQualified → Opportunity flow
- S4 pricing-engine.js / proposal-generator.js / sales-qualification-engine.js
- Opportunity commercial fields (BA V2 Sprint 2 additive, Dev-only)

## What Sprint 3 reuses

- Lead / Opportunity / Proposal / Approvals lists (extend, don't replace)
- EVA-FREE path → maps to Free Fit & Readiness Assessment (`SKU-FRA`)
- `HVCG_Approvals` for proposal/pricing override approvals
- Offer catalog, diagnostics, pricing_policy, proposal templates from BA V2
- BL-C1 external lock

## What Sprint 3 extends

- Free Fit Assessment record model + validation (prohibited substantive work)
- Diagnostic record model (fact vs AI inference vs advisor conclusion)
- Pricing recommendation service (V2 current for new clients; legacy protected)
- Manual pricing override audit trail
- Proposal draft engine from three archetypes (stop at APPROVED_TO_SEND)
- Outcome-selling need mapper
- Referral attribution chain fields
- Elite commercial surface field contract (progressive disclosure) — Elite app lives in revenue-pipeline-product worktree

## Explicit non-goals (Sprint 3)

- Production provisioning
- Auto-send proposals
- Autonomous payouts
- Second CRM / second shell
