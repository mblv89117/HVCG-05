# Capital OS Audit — Sprint 5 BA-C

**CR:** CR-HVCG-BA-V2-001  
**As of:** 2026-08-11  
**Explorer:** Capital architecture audit prior to BA-C implementation

## Existing (reused)

| Asset | Path / notes |
|-------|----------------|
| Capital lists | `HVCG_CapitalOpportunities`, Sources, Lenders, Investors, Outreach, FundingMilestones |
| CRM bridge | Opportunity `CapitalOpportunityId` / handoff status; win closeout flow |
| Document requests | `HVCG_DocumentRequests` with CapitalOpportunityId + Lender audience |
| Project templates | `templates/projects/capital-readiness-assessment.json`, lender-package, data-room-prep |
| Portal data rooms | `client-portal-data-rooms` LenderPackage templates (external Off) |
| Offers / diagnostics | OFF-CAP-DIAG, OFF-CAP-PKG; DIAG-FULL-CAPITAL |
| Compliance | `compliance-language.json` financing + AI disclaimers |
| Agents (config) | AGT-CAP-READY, AGT-FIN-PKG, AGT-DOC-CHECKLIST |
| Elite `/capital` | `atlas-usable-operating-layer` CapitalPage shell |

## Extended (Sprint 5)

| Extension | Where |
|-----------|-------|
| Scoring policy | `config/business/capital-readiness-scoring.json` |
| Engine runtime | `config/business/capital_readiness.py` |
| Capital list readiness fields | `HVCG_CapitalOpportunities` (+ Dev provisioning flag) |
| Agent I/O bindings | `hvcg-agents-v2.json` |
| Capital workbench UI | `CapitalReadinessWorkbench.tsx` on usable-operating-layer |
| Client 360 Capital tab | `Client360CommercialSections.tsx` |
| Tests A–F + E2E | `tests/unit/business/test_capital_readiness_sprint5.py` |

## Duplicates avoided

- No second Capital OS / lender DB / data-room product / Client 360 shell
- No React-only scoring SoR (policy + Python engine)
- No automatic lender submission
- Finance Ops/FI: adapter-ready; no fake live metrics presented as facts

## Gaps remaining (honest)

- Live SP/Hub binding for Capital workbench (Dev fixture labeled)
- Full AGT-FIN-PKG lender-package runtime (handoff only)
- CAP-003 lender-submit approval workflow (blocked by design in Sprint 5)
- Live FI signal adapters (IN_PROGRESS / pending interface)
