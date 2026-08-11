# HVCG V2 Requirements Coverage

**As of:** 2026-08-11  
**Source:** `config/business/hvcg-v2-requirements.json` (125 requirements)  
**Traceability:** [../BUSINESS/HVCG_V2_REQUIREMENTS_TRACEABILITY.md](../BUSINESS/HVCG_V2_REQUIREMENTS_TRACEABILITY.md)

## Definition

- **Coverage %** = (`IMPLEMENTED` + `EXISTING_REUSED`) / Total × 100
- `IN_PROGRESS` and `PLANNED` do **not** count as implemented
- Evidence required for `IMPLEMENTED` / `EXISTING_REUSED`

## Overall

| Metric | Count |
|--------|------:|
| Total | 125 |
| `IMPLEMENTED` | 44 |
| `EXISTING_REUSED` | 14 |
| `IN_PROGRESS` | 27 |
| `PLANNED` | 38 |
| `DEFERRED_OWNER_GATE` | 2 |
| **Coverage %** | **46.4%** |

## By domain

| Domain | Total | Implemented | Reused | In Progress | Planned | Deferred | Coverage % |
|--------|------:|------------:|-------:|------------:|--------:|---------:|-----------:|
| AI | 23 | 2 | 1 | 18 | 2 | 0 | 13% |
| CFO | 3 | 0 | 1 | 0 | 1 | 1 | 33% |
| Capital | 4 | 0 | 1 | 0 | 3 | 0 | 25% |
| Client Experience | 1 | 0 | 1 | 0 | 0 | 0 | 100% |
| Client Migration | 5 | 2 | 0 | 2 | 1 | 0 | 40% |
| Compliance | 2 | 1 | 1 | 0 | 0 | 0 | 100% |
| Diagnostics | 4 | 1 | 0 | 0 | 3 | 0 | 25% |
| Documents | 3 | 1 | 1 | 0 | 1 | 0 | 67% |
| Executive Support | 2 | 1 | 0 | 0 | 1 | 0 | 50% |
| Governance | 3 | 2 | 1 | 0 | 0 | 0 | 100% |
| Growth | 1 | 0 | 1 | 0 | 0 | 0 | 100% |
| Marketing / Content | 4 | 1 | 0 | 1 | 2 | 0 | 25% |
| Microsoft 365 | 10 | 0 | 3 | 0 | 7 | 0 | 30% |
| Offers | 15 | 14 | 0 | 1 | 0 | 0 | 93% |
| Positioning | 5 | 1 | 0 | 2 | 1 | 1 | 20% |
| Pricing | 7 | 4 | 1 | 1 | 1 | 0 | 71% |
| Procurement | 2 | 0 | 0 | 0 | 2 | 0 | 0% |
| Proposals | 6 | 5 | 0 | 0 | 1 | 0 | 83% |
| Referrals | 2 | 0 | 0 | 0 | 2 | 0 | 0% |
| Reporting | 2 | 0 | 1 | 0 | 1 | 0 | 50% |
| Revenue OS | 8 | 1 | 1 | 2 | 4 | 0 | 25% |
| Risk | 2 | 0 | 0 | 0 | 2 | 0 | 0% |
| Sales Enablement | 3 | 1 | 0 | 0 | 2 | 0 | 33% |
| Service Architecture | 8 | 7 | 0 | 0 | 1 | 0 | 88% |

## Honesty note

AI agent requirements remain largely `IN_PROGRESS` (config stubs only). Opportunity CommercialClass schema + validation exists for Sprint 2, but Production provisioning is **not** authorized. Offer catalog entries are complete as configuration; Elite UI wiring remains BA-B.

Website messaging is prepared (`website-messaging.json`) but **not published** (BL-PUBLISH-1).

