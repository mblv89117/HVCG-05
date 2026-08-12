# HVCG V2 — Staging / Production-like Readiness (Sprint 17)

**CR:** CR-HVCG-BA-V2-001  
**As of:** 2026-08-12  
**Status:** `DEVELOPMENT_COMPLETE · UNCOMMITTED`  
**Production deployment:** NONE · **Gate OPEN:** NONE

## Sprint 16 commits

| Tree | Branch | SHA |
|------|--------|-----|
| BA | `cursor/hvcg-business-architecture-v2` | `75f6e1fb0e3dba2ca8d4a388187924f631aa460e` |
| Elite | `fix/atlas-usable-operating-layer` | `b92abf3f6effcc0c13073168730a1d97e44e87f6` |

## Live Hub HTTP E2E

| Item | Result |
|------|--------|
| Process | `atlas-integration-api` on `127.0.0.1:8792` |
| Path | Elite/curl → Hub `/api/ba/*` → `ba_bridge.py` → `atlas_security` |
| Identity mode | Dev headers (`INTEGRATION_REQUIRE_AUTH=false`) |
| Auth-required Hub | `:8793` — missing/malformed Bearer → 401 fail-closed |
| Real Entra JWT | **CREDENTIAL_REQUIRED** (no local `.secrets`) |
| Port note | `:8790` occupied by older Hub without BA routes (`atlas-local-ai-operations`) |

## Honest blockers

- Live Entra tokens / SPA registration fill
- Live Graph / SharePoint non-Prod connection
- Real malware AV service (mock + EICAR policy only)
- QBO live read credentials (`NO_QBO_PLAID_LIVE`)
- Alert delivery channel
- Dedicated staging env pack
- Owner UAT / QA GO / RC / Production GO

## Do not claim

Production-ready · gate OPEN · UAT complete · QA GO · live Graph RAG · Production AV
