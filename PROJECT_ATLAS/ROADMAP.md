# ROADMAP

**As of:** 2026-08-11 (BA V2 overlay)  
**Sources:** [CURRENT_STATE.md](CURRENT_STATE.md); [CR-HVCG-BA-V2-001](ChangeRequests/CR-HVCG-BA-V2-001.md); Absolute GO evidence; Jul-19 executive report

## Near-term (ordered)

| Order | Milestone | Owner / Track | Gate |
|-------|-----------|---------------|------|
| 0 | **HVCG BA V2 Foundation + Sprint 3 conversion (Dev)** | BA-A/B | Owner CR accepted; no Prod |
| 1 | **Protect Absolute GO Production** — no unauthorized Prod BA schema; Track 1 freeze | Integration & Release | Owner for Prod |
| 2 | Elite Opportunity commercial surface wiring (`revenue-pipeline-product`) | BA-B / Elite | Use surface contract |
| 2 | **Full QA** against RC1 → written Local UAT GO/NO-GO | QA | Written GO |
| 3 | Owner Local UAT acceptance @ http://127.0.0.1:5180/ | Owner | CONDITIONAL GO path |
| 4 | Plaid Sandbox secrets + live Link E2E | Owner + Plaid + Security | INT-001/002/005 |
| 5 | Entra SPA client ID + multi-identity smoke | Owner / Azure | INT-003 |
| 6 | **QBO decision:** merge tip `c892215` after QA ACK **or** defer | Owner + Master PM + QBO | INT-004 |
| 7 | Dev SWA redeploy from RC1 + DEF-ELITE live retest | Integration + QA | INT-006 / INT-011 |
| 8 | Staging Key Vault / infra only (no Prod) | Azure | Staging checklist |
| 9 | Post-RC1 integration queue (Portal adapter, Finance Ops, Ops, AI schemas) | Master PM | After Local UAT acceptance |
| 10 | Preserve Track 1 freeze | Deployment | Owner for any Prod change |
| 11 | Revenue Sprint 5 (candidate) | Revenue | Owner assignment; keep off Elite RC1 until gated |
| 12 | Soft UAT / website preview / pilot / DNS / canvas | Tracks 2–4 / CRM | Existing owner gates |

## Completed (selected)

- Track 1 Live — Internal (**FROZEN**)  
- Elite UI recovery base (`35ca684`) + Integration **RC1** designated  
- **Atlas v1.0.1 Absolute GO** — tag `atlas-v1.0.1-production` @ `dceea798` (Production Elite LIVE)  
- Plaid Sandbox stack (code) integrated into Absolute GO lineage  
- Revenue OS Sprints 1–4 **COMPLETE** (Dev/Staging) — S4 tip `bf34c93`  
- Sprint 11 Azure migration objectives **COMPLETE**  
- Track 9 EOS Sprint 2 **COMPLETE** (Dev)  
- Multiple module packages **READY FOR INTEGRATION** (Portal DR, Finance Ops, Ops Hub SP, ECC, AI schemas)  
- Pre–Revenue Sprint 4 [Release Candidate RC-1](Releases/Release_Candidate_RC-1.md) (Jul 16 doc lock) — distinct from Elite RC1 / Absolute GO  

## Explicit non-goals (now)

- Unauthorized Production BA schema mutation or legacy reprice  
- Competing shells (Capital/CFO/Procurement/Risk/AI SPAs as separate products)  
- Activating pricing V2 as CURRENT without superseding BL-P1  
- New `track10` Elite forks that diverge from Absolute GO / usable-operating-layer line  
- Shipping parallel daily shells without Elite adapter plan  
- Enabling BL-C1 outbound, public DNS, pilot import, extra Prod flows without new owner approval  

## Longer horizon

See root `VERSION2_ROADMAP.md` and `IMPLEMENTATION_PLAN.md` — not restated here.
