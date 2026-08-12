# HVCG V2 Revenue Truth — Sprint 12 (Development fixtures)

**CR:** CR-HVCG-BA-V2-001  
**As of:** 2026-08-11  
**Authority:** `config/business/revenue_truth.py` fixtures only  

> These totals are **Development fixture aggregates from automated tests**, not live HVCG financials.

## Fixture summary (from Sprint 12 test scenarios)

| Metric | Fixture note |
|--------|----------------|
| Total Contracted Revenue | Engagement economics preserved (e.g. ACCG $4,539/mo protected) |
| Total Invoiced | Distinct from collected — e.g. $5,000 invoiced cases |
| Total Collected | Verified payments only — partials/refunds/net applied |
| Total Outstanding | Invoiced − collected − write-offs |
| Unreconciled Payments | SOURCE_CONFLICT / UNRECONCILED flagged |
| Earned Success Fees | Agreement-governed (e.g. 2% of $1M funded → $20k earned after review) |
| Collected Success Fees | $0 until HVCG payment arrives |
| Referral Eligible | Based on eligible **collected** HVCG revenue |
| Referral Payable | After human approval — STOP before payment |
| Referral Paid | $0 in Sprint 12 (payout tools DISABLED) |

## Non-interchangeable states

`PROPOSED ≠ APPROVED ≠ CONTRACTED ≠ INVOICED ≠ DUE ≠ PAID ≠ COLLECTED ≠ EARNED_SUCCESS_FEE ≠ REFERRAL_ELIGIBLE ≠ REFERRAL_PAYABLE ≠ REFERRAL_PAID`

## Cross-domain truth

| Domain outcome | HVCG revenue |
|----------------|--------------|
| Capital funded $1,000,000 | ≠ HVCG collected |
| Procurement award $3,000,000 | ≠ HVCG collected |
| Risk claimed/approved/paid recovery | All preserved distinctly; fee from agreement + verified base only |

## Production gaps

See handoff Production Gaps section. Not Production-ready.
