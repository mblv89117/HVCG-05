# Capital Package Audit — Sprint 6 BA-C2

**CR:** CR-HVCG-BA-V2-001  
**As of:** 2026-08-11

## Existing → classification

| Capability | Class | Notes |
|------------|-------|-------|
| AGT-FIN-PKG config + S5 handoff | EXTEND | Runtime now `financial_package.py` |
| CapitalOpportunities + readiness fields | REUSE | Package states tracked in engine + handoff status |
| DocumentRequests / conditional checklist | REUSE | Financing-type requirements |
| Portal LenderPackage data rooms | REUSE | Index + visibility; external Off |
| Folder taxonomy / lender-package templates | REUSE | No second repository |
| OFF-CAP-PKG + proposal path | REUSE | Commercial continuity |
| HVCG_Approvals | EXTEND | CapitalPackage, LenderMemo, PackageQAOverride, LenderSubmission |
| Capital workbench / Client 360 Capital | EXTEND | Package panels + package view |
| QBO / Plaid / live FI | DEFER | `PENDING_LIVE_SOURCE` adapter label |
| Live lender submit | DEFER | Submission gate / BL-C1 |

## Extended (Sprint 6)

- `capital-package-policy.json`
- `financial_package.py` — completeness, summary, debt/UoF reconcile, projections separation, data room index, lender memo, QA, versioning, change detection
- Approvals types
- Workbench package sections
- Tests A–I + E2E

## Duplicates avoided

No second Capital OS, data-room product, or Finance Ops fork.
