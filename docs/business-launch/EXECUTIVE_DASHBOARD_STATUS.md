# EXECUTIVE_DASHBOARD_STATUS

**As of:** 2026-07-15 18:40 PT  
**Priority #6** — Revenue visibility from **real registers** (not sample data)

---

## Client health SoR (NEW)

| Artifact | Status |
|----------|--------|
| `executive/CLIENT_HEALTH_DASHBOARD.md` | **DONE** — single-view table, **63 clients scored** |
| `executive/CLIENT_HEALTH_DASHBOARD.json` | **DONE** — Power BI / Command Center feed |
| `executive/CLIENT_HEALTH_RUBRIC.md` | **DONE** — 0–100 scoring methodology |

**Authoritative for client health:** `CLIENT_HEALTH_DASHBOARD.md` + `.json` (supersedes mock-only client rows in `DASHBOARD_MOCK_VALUES.md`).

---

## Deliverables (this cycle)

| Artifact | Status |
|----------|--------|
| `executive/DASHBOARD_DATA_MODEL.md` | **DONE** — 9 metric definitions + SoR mapping |
| `executive/DASHBOARD_MOCK_VALUES.md` | **DONE** — populated from registers + `crm-import/*.json` only |
| `executive/COMMAND_CENTER_WIRE_PLAN.md` | **DONE** — Dev SP / Power BI wiring plan |
| Weekly markdown snapshot | **DONE** — see `EXECUTIVE_SNAPSHOT.md` + client health dashboard |

---

## Metrics (target → current)

| Metric | Data source | Status | Current value (2026-07-15) |
|--------|-------------|--------|----------------------------|
| Active clients (HVS) | Legacy register + Dev shells | Partial — 2 confirmed active | **2** active (`IsActive=true`) · **7** named roster |
| Active clients (HVCG) | New client register | Empty | **0** |
| Contracted MRR (verified) | Engagement pricing | **Blocked** — no Verified?=Yes | **null** |
| Contracted MRR (unverified) | Extracts + Dev shells | Partial | **$7,500/mo** (Prodigy only — UNVERIFIED) |
| Pipeline $ (new HVCG) | CRM opportunities | Empty until funnel | **null** |
| Website leads | Forms / funnel | Blocked BL-W1 | **0** |
| AR outstanding | Invoice inventory | Partial — OCR failed | **null** |
| Onboarding % | Migration checklist | Register formula | **~28%** |
| Portal enabled count | Dev shells + portal status | Verified | **0** |

---

## Build status

| Work | Status |
|------|--------|
| Metric data model | **DONE** |
| Real-extract mock snapshot | **DONE** |
| Command Center wire plan (Dev) | **DONE** |
| Dev CRM import of client shells | NOT STARTED (intentional) |
| Power BI / SP live dashboard | NOT STARTED — gated |
| Prod dashboard publish | **FORBIDDEN** |
| Financial account connect | **FORBIDDEN** (BL-F1) |

---

## Owner / ops gates blocking live dashboard

| Gate | Blocks |
|------|--------|
| **BL-ACCG-PRICE** | Verified MRR · ACCG row · trustworthy MRR total |
| **BL-ACCG-CLASS** | HVS vs transitioning classification in CRM |
| **BL-W1** | Website leads · SP Comm Site · Forms → Dev CRM |
| **BL-PNP-1** | SharePoint Command Center Dev list provisioning |
| **BL-F1** | Live AR from bank/processor (default deny) |
| **BL-C1** | Portal-enabled external users |
| Master PM Dev write clear | CRM import of `crm-import/*.json` |
| PDF extract libs | Christie + ACCG invoice/agreement dollar extract |

---

## Next (no Prod)

1. Refresh `DASHBOARD_MOCK_VALUES.md` when BL-ACCG-PRICE closes or new shells ship  
2. On Dev write clear: import shells → validate metrics against mock values  
3. On BL-PNP-1: execute `COMMAND_CENTER_WIRE_PLAN.md` Phase 2–3 (Dev only)  
4. Fix invoice PDF OCR → populate `AR_Outstanding` when amounts exist  

---

## Cross-links

| File | Purpose |
|------|---------|
| `executive/CLIENT_HEALTH_DASHBOARD.md` | **SoR — client health (all clients)** |
| `executive/CLIENT_HEALTH_DASHBOARD.json` | Machine-readable client health |
| `executive/CLIENT_HEALTH_RUBRIC.md` | Health score methodology |
| `executive/DASHBOARD_DATA_MODEL.md` | Metric definitions |
| `executive/DASHBOARD_MOCK_VALUES.md` | Aggregate metrics snapshot |
| `executive/COMMAND_CENTER_WIRE_PLAN.md` | Dev wiring |
| `EXECUTIVE_SNAPSHOT.md` | Owner weekly rollup |
| `PRICING_REGISTER.md` | MRR verify source |
| `LEGACY_HVS_CLIENT_REGISTER.md` | HVS client counts |
