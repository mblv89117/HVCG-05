# HVCG V2 — Document / Portal / M365 Capability (Sprint 13)

**CR:** CR-HVCG-BA-V2-001  
**As of:** 2026-08-11  
**Environment:** Development only  
**Controls:** BL-C1 · GATE-RISK-ELEVATED-ACL-PROD · GATE-CLIENT-PORTAL-PROD · GATE-M365-SECOND-BRAIN-PROD

## Verdict

Sprint 13 delivers **one governed document lifecycle** in Development: metadata SoR in Atlas (`document_os` + `HVCG_DocumentRecords`), bytes remain in SharePoint client libraries, **one** Client Portal extension (no second portal product), and Second Brain document-layer retrieval with citations.  
**RECEIVED ≠ ACCEPTED · Draft ≠ Final · Dev UI ≠ Production.**

## Maturity snapshot

| Capability | Maturity | Notes |
|------------|----------|-------|
| Document Request | **FULL_DEV_RUNTIME** / PRODUCTION_GATED | Workflow + BL-C1 send block |
| Document Registry | **FULL_DEV_RUNTIME** / PRODUCTION_GATED | Canonical record; link-first |
| SharePoint integration | **EXISTING + ADAPTER** | Taxonomy map 00–13; no bulk move |
| Client Portal | **DEV_UX_EXTENDED** / PRODUCTION_GATED | Extends Elite `/documents`; GATE-CLIENT-PORTAL-PROD |
| Data Room | **REUSED** | LenderPackage rooms remain; not a new product |
| AGT-DOC-CHECKLIST | **FULL_DEV_RUNTIME** / PRODUCTION_GATED | `document_os.run_doc_checklist_agent` |
| Second Brain retrieval | **FULL_DEV_RUNTIME** / PRODUCTION_GATED | Document layer + fixtures; not live Prod RAG |
| Client 360 Documents | **EXTENDED** | Section + existing SP links |
| Domain integrations | **IN_PROGRESS** | Capital/CFO/Procurement/Risk/Growth consume registry in Dev tests |

## Audit disposition

| Disposition | Items |
|-------------|-------|
| **REUSE** | `HVCG_DocumentRequests`, HVCG-Clients libraries, Graph/SP adapters, LenderPackage rooms, capital_readiness checklist, FinPkg data-room index, knowledge rail, security model, `DocumentsOperatingPage` |
| **EXTEND** | Canonical Document Record, portal request/upload UX, Risk evidence FileRef→Document Record, Second Brain document retrieval, Client 360 Documents |
| **REPLACE_BY_CANONICAL_ADAPTER** | Disconnected per-domain file indexes → consume `document_os` |
| **DEFER** | Power Pages invites, unsafe Outlook auto-file, malware AV pipeline, Production Graph RAG, destructive bulk migration |
| **REJECT_AS_DUPLICATE** | `client-portal-sprint1` mock as runtime SoR |

## Production gates (unchanged / new)

- Existing: BL-C1, GATE-RISK-ELEVATED-ACL-PROD, no money movement, no Production AI deploy, no QBO/Plaid, no lender/SAM/Risk external  
- New formal: [GATE-CLIENT-PORTAL-PROD](../Decisions/GATE-CLIENT-PORTAL-PROD.md), [GATE-M365-SECOND-BRAIN-PROD](../Decisions/GATE-M365-SECOND-BRAIN-PROD.md)

## Evidence

- `config/business/document_os.py`, `document-operating-policy.json`, `folder-taxonomy-map.json`  
- `src/sharepoint/lists/HVCG_DocumentRecords.json`  
- `tests/unit/business/test_document_os_sprint13.py` (19 OK; suite 176 OK)  
- Elite: `DocumentLifecycleWorkbench.tsx` on `/documents`  
- Agents: AGT-DOC-CHECKLIST / AGT-SECOND-BRAIN notes updated — still PRODUCTION_GATED  

## Explicit non-goals (Sprint 13)

Production portal launch · Production Graph expansion · autonomous client email/reminders · autonomous publish · Risk Prod exposure · e-sign platform · accounting mutation · bulk file migration · QBO/Plaid · payments/refunds/payouts · High Value Founder launch
