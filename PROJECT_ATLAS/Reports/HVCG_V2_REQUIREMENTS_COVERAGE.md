# HVCG V2 Requirements Coverage

**As of:** 2026-08-11 (Sprint 5 Development — Capital Readiness Engine)  
**Source:** `config/business/hvcg-v2-requirements.json` (125 requirements)

## Sprint 4 committed baseline

| Metric | Count |
|--------|------:|
| `IMPLEMENTED` | 56 |
| `EXISTING_REUSED` | 12 |
| `IN_PROGRESS` | 27 |
| `PLANNED` | 28 |
| `DEFERRED_OWNER_GATE` | 2 |
| **Coverage %** | **54.4%** |

## Sprint 5 current (Dev — pending Owner commit)

| Metric | Previous (S4) | Current (S5) | Delta |
|--------|--------------:|-------------:|------:|
| `IMPLEMENTED` | 56 | 57 | +1 |
| `EXISTING_REUSED` | 12 | 12 | 0 |
| `IN_PROGRESS` | 27 | 29 | +2 |
| `PLANNED` | 28 | 25 | −3 |
| `DEFERRED_OWNER_GATE` | 2 | 2 | 0 |
| **Coverage %** | **54.4%** | **55.2%** | **+0.8 pp** |

## Exact IDs changed (Sprint 5)

| ID | From | To |
|----|------|----|
| `HVCG-V2-CAP-002` | PLANNED | IMPLEMENTED |
| `HVCG-V2-CAP-003` | PLANNED | IN_PROGRESS |
| `HVCG-V2-CAP-004` | PLANNED | IN_PROGRESS |

CAP-001 remains `EXISTING_REUSED` (Capital Case domain). C360-001 remains `IN_PROGRESS` (Capital tab added; not full multi-domain Client 360).

## Evidence

| Capability | Evidence |
|------------|----------|
| Scoring engine | `capital_readiness.py`, `capital-readiness-scoring.json`, `test_capital_readiness_sprint5.py` |
| Capital workbench | `CapitalReadinessWorkbench.tsx` (usable-operating-layer) |
| Client 360 Capital | `Client360CommercialSections.tsx` |
| Package handoff | `build_financial_package_handoff` → `READY_FOR_PACKAGE_BUILD` |
| E2E | Fit → Diagnostic → Readiness → Approve → OFF-CAP-PKG → Proposal → APPROVED_TO_SEND → BL-C1 stop |

## Non-claims

- Lender submit not implemented (blocked)
- Full FIN-PKG runtime not claimed IMPLEMENTED
- No Production provision
