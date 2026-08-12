# HVCG BA V2 — Sprint 13 Handoff (Documents, Client Portal & M365 Knowledge)

**CR:** CR-HVCG-BA-V2-001  
**Sprint:** 13 — Documents / Client Portal / M365 Knowledge Integration  
**Date:** 2026-08-11  
**Controls:** NO DEPLOY · NO MERGE · BL-C1 · GATE-RISK-ELEVATED-ACL-PROD · GATE-CLIENT-PORTAL-PROD · GATE-M365-SECOND-BRAIN-PROD · **NO SPRINT 14**

## Sprint 12 commits (done)

| Worktree | Branch | SHA |
|----------|--------|-----|
| BA | `cursor/hvcg-business-architecture-v2` | `fe00069e262380204fedb552a26790e94d39b35e` |
| Elite | `fix/atlas-usable-operating-layer` | `0a2881155f4d82ee8df5ab33bf34f606e3fbb96f` |

## Sprint 13 Development (pending Owner commit authorization)

### BA
- `document_os.py` + `document-operating-policy.json`
- List: `HVCG_DocumentRecords` (metadata; SharePoint = bytes)
- Gates: `GATE-CLIENT-PORTAL-PROD`, `GATE-M365-SECOND-BRAIN-PROD`
- AGT-DOC-CHECKLIST / AGT-SECOND-BRAIN deepened (still PRODUCTION_GATED)
- Second Brain document layer wired in `ai_orchestrator.second_brain_query`
- Tests: `test_document_os_sprint13.py` (19 OK) · business suite **176** OK
- Report: `HVCG_V2_DOCUMENT_PORTAL_CAPABILITY_SPRINT13.md`
- Requirements: DOC-002→006 IN_PROGRESS (+3 new subordinate IDs)

### Elite
- `DocumentLifecycleWorkbench` on `/documents` (Request Center · Registry · Portal Dev · Ops · Gates)
- Existing `DocumentsOperatingPage` retained at `/documents/operating`
- Client 360 Documents section extended (no second Client 360)
- `tsc -b` OK

## Agent maturity (honest)

| Agent | States | Production |
|-------|--------|------------|
| AGT-DOC-CHECKLIST | FULL_DEV_RUNTIME | PRODUCTION_GATED — not READY |
| AGT-SECOND-BRAIN | FULL_DEV_RUNTIME | PRODUCTION_GATED — fixture retrieval ≠ live Prod RAG |
| AGT-INVOICE / AGT-REFERRAL | FULL_DEV_RUNTIME (S12) | PRODUCTION_GATED |
| Canonical 18 | — | All remain Production-gated |

## Production gaps
- External portal auth + malware scanning
- Live Graph permission-aware RAG
- Power Automate / Outlook production connectors
- Destructive migration tooling (intentionally deferred)

## Stop
Do **not** begin Sprint 14 without Owner authorization.  
Likely next: Executive Owner Support · AI depth gaps · M365 live hardening · Production hardening.
