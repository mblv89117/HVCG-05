# FIRST_FIVE_AUTOMATIONS — Dev implementation stubs

**Rule:** Drafts + internal alerts only. Disable switch on each. No client send.

| # | Automation | Dev status | Disable switch | Log |
|---|------------|------------|----------------|-----|
| 1 | Website lead → CRM lead → qualification task | **SPEC+FIELD MAP ready**; Form not wired | `hvcg_EnableClientEmails=false` + flow Off | AutomationLog |
| 2 | Qualified lead → strategy-call booking workflow | Stub: create Activity + internal email draft | Flow Off default | AutomationLog |
| 3 | Approved proposal data → draft proposal package | `sales/PROPOSAL_GENERATOR.md` + samples | No send connector | File draft only |
| 4 | Signed client → onboarding checklist + workspace prep | `onboarding/AUTOMATED_ONBOARDING_SPEC.md` | No portal invite | List rows only |
| 5 | Daily executive brief assembly | **IMPLEMENTED** `automation/assemble_executive_brief.py` | N/A local | Overwrites EXECUTIVE_BRIEF.md |

## Next Dev build order
1. Wire Microsoft Form (Dev) → Lead create (Track3)  
2. Add “Qualify” → task flow (internal)  
3. Proposal draft flow writing to SharePoint Drafts library  
4. Onboarding checklist on Won (Dev lists)  
5. Schedule brief script via local cron / ADO pipeline (not client-facing)

**Also ready (collections — draft only):** `finance/power-automate/COLLECTIONS_FLOW_DEFINITION.md` + `LEGACY_PRICING_GUARD.md` — Approvals gate before any Outlook send; never auto-contact.

**Owner:** COO · **Failure path:** flow terminate + AutomationLog Failed · **No Prod activation** until Track1 LIVE—INTERNAL + CEO approve
