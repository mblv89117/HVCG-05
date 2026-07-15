# Owner Action Guide — Finance Operations

**Audience:** HVCG owner / Global Admin / Maker (Manny)  
**Module:** Finance Operations  
**When needed:** After parent merge of `cursor/finance-operations` and when Ready for Maker apply (not required for this documentation sprint)

## Repo package (done on branch)

Exclusive paths: `docs/finance/`, `tests/finance/`, `tests/unit/test_finance_operations.py`, Finance-focused `PROJECT_STATUS.md` / `NEXT_SESSION.md`.

Existing Finance lists (`HVCG_Invoices`, `HVCG_FinancialMilestones`, etc.) are already in the shared schema inventory — no owner schema repair is required for this sprint unless live Dev is missing those lists (unlikely on current baseline).

## Owner-only stop points (future — after package merge)

| # | Stop | Why owner-only | Blocks |
|---|------|----------------|--------|
| **OA-FIN-01** | Confirm Finance lists exist on Dev (spot-check Invoices / FinancialMilestones) | Human attestation of live site | App binding |
| **OA-FIN-02** | Create/authorize SharePoint connection for Finance screens/flows | Connector consent | Maker UX / automation |
| **OA-FIN-03** | Build/publish canvas `scrFinance` (and Finance section of client detail) | Maker authoring | End-user Finance UI |
| **OA-FIN-04** | Import past-due / renewal flows **Off**; keep Off until dry-run | Enabling may email clients | Runtime automation |
| **OA-FIN-05** | Demo-only smoke (no real client chase messages) + sign acceptance | Business sign-off | Declaring Finance Dev-ready |
| **OA-FIN-06** | Explicit approval before Production / real collections notify | Production gate | Prod Finance |

## Do not (until separately approved)

- Production publish  
- Enable client-facing collections email / Teams to company channels  
- Edit `.env` / deployment engines from this workstream  
- Change CRM Maker OA packages or interrupt live CRM auth/smoke  
- Put invoice PDFs with PII into git or agent-comms messages

## Until those gates

No owner action is required for the current **docs + offline test** package. Acknowledge Master PM bus messages only if you are operating as owner-orchestrator; Finance agent handles module ACKs.
