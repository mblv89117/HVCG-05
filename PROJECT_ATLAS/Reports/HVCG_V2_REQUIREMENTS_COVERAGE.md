# HVCG V2 Requirements Coverage

**As of:** 2026-08-11 (Sprint 4 Development — Revenue Experience + Client Migration)  
**Source:** `config/business/hvcg-v2-requirements.json` (125 requirements)  
**Traceability:** [../BUSINESS/HVCG_V2_REQUIREMENTS_TRACEABILITY.md](../BUSINESS/HVCG_V2_REQUIREMENTS_TRACEABILITY.md)

## Sprint 3 commit baseline (honest correction)

| Metric | Count |
|--------|------:|
| `IMPLEMENTED` | 43 |
| `EXISTING_REUSED` | 13 |
| `IN_PROGRESS` | 34 |
| `PLANNED` | 33 |
| `DEFERRED_OWNER_GATE` | 2 |
| **Coverage %** | **44.8%** |

## Sprint 4 current

| Metric | Previous (S3 commit) | Current (S4 Dev) | Delta |
|--------|---------------------:|-----------------:|------:|
| `IMPLEMENTED` | 43 | 56 | +13 |
| `EXISTING_REUSED` | 13 | 12 | -1 |
| `IN_PROGRESS` | 34 | 27 | -7 |
| `PLANNED` | 33 | 28 | -5 |
| `DEFERRED_OWNER_GATE` | 2 | 2 | 0 |
| **Coverage %** | **44.8%** | **54.4%** | **+9.6 pp** |

Coverage rose only where operational Elite surfaces + Dev integration tests exist. `HVCG-V2-C360-001` moved from `EXISTING_REUSED` → `IN_PROGRESS` because Revenue/Migration tabs are partial (not full Capital/Procurement/Risk/AI Client 360 expansion).

## Exact requirement IDs changed (Sprint 4)

| ID | From | To |
|----|------|----|
| `HVCG-V2-DIAG-001` | IN_PROGRESS | IMPLEMENTED |
| `HVCG-V2-DIAG-004` | IN_PROGRESS | IMPLEMENTED |
| `HVCG-V2-PROP-001` | IN_PROGRESS | IMPLEMENTED |
| `HVCG-V2-PROP-002` | IN_PROGRESS | IMPLEMENTED |
| `HVCG-V2-PROP-003` | IN_PROGRESS | IMPLEMENTED |
| `HVCG-V2-PROP-004` | IN_PROGRESS | IMPLEMENTED |
| `HVCG-V2-PROP-005` | IN_PROGRESS | IMPLEMENTED |
| `HVCG-V2-PROP-006` | IN_PROGRESS | IMPLEMENTED |
| `HVCG-V2-MIG-001` | IN_PROGRESS | IMPLEMENTED |
| `HVCG-V2-MIG-005` | PLANNED | IN_PROGRESS |
| `HVCG-V2-REV-005` | PLANNED | IN_PROGRESS |
| `HVCG-V2-REV-006` | PLANNED | IMPLEMENTED |
| `HVCG-V2-REV-007` | PLANNED | IMPLEMENTED |
| `HVCG-V2-C360-001` | EXISTING_REUSED | IN_PROGRESS |
| `HVCG-V2-OFF-016` | IN_PROGRESS | IMPLEMENTED |
| `HVCG-V2-OFF-017` | IN_PROGRESS | IMPLEMENTED |
| `HVCG-V2-PRC-006` | PLANNED | IN_PROGRESS |

## Evidence (primary)

| Capability | Module / worktree | Surface / test |
|------------|-------------------|----------------|
| Elite commercial path | `revenue-pipeline-product` | `CommercialWorkbench.tsx` on Opportunity detail |
| Free Fit / Diagnostic / Bypass | `revenue-pipeline-product` | Qualification + Diagnostic panels |
| Proposal draft/preview/approval | `revenue-pipeline-product` | Proposal panel; BL-C1 send blocked |
| Offer / Service Line lookup | `revenue-pipeline-product` | Canonical JSON catalogs under `src/commercial/catalog/` |
| Client Migration UI | `revenue-pipeline-product` | `/revenue/migrations` (`ClientMigrationPage.tsx`) |
| Client 360 Revenue + Migration | `atlas-usable-operating-layer` | `LiveClientDetailPage` tabs + `Client360CommercialSections.tsx` |
| Attribution taxonomy | BA V2 + Revenue UI | `attribution-taxonomy.json` + Attribution panel |
| E2E commercial / bypass / legacy | BA V2 | `tests/unit/business/test_revenue_sprint4_integration.py` (32 BA tests OK) |

## Explicit non-claims

- Not Production deployed
- Not auto-send / BL-C1 still active
- Not High Value Founder launch
- Not full success-fee engine
- Not full Capital Readiness / CFO / Procurement / Risk engines
