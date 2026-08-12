# HVCG V2 Revenue / Billing Audit — Sprint 12

**CR:** CR-HVCG-BA-V2-001 · **Date:** 2026-08-11

| Capability | Verdict |
|------------|---------|
| Revenue OS / Sprints 1–4 | **REUSE** |
| Engagement / proposal economics | **EXTEND** |
| HVCG_Invoices / Collections / Milestones | **EXTEND** |
| AGT-INVOICE / AGT-REFERRAL | **EXTEND** → FULL_DEV_RUNTIME (PRODUCTION_GATED) |
| Referral partners / referrals lists | **EXTEND** |
| Success fee foundations (Capital/Procurement/Risk) | **EXTEND** into unified records |
| Client 360 Revenue / ECC / Owner Brief | **EXTEND** |
| HVCG_Approvals | **EXTEND** (ReferralPayout etc.) |
| ACCG protection | **REUSE** |
| QBO / Plaid / banking live | **DEFER** |
| Client AR/AP (CFO) | **DEFER** (domain boundary) |
| Autonomous payouts / ACH | **DEFER** |

## New (thin — not a second GL)

- `revenue_truth.py` + policy  
- `HVCG_Payments`  
- `HVCG_RevenueEvents`  

## Duplicates avoided

No second accounting system, invoice system, Revenue OS, referral DB, or payment ledger/GL.
