# DASHBOARD_MOCK_VALUES

**As of:** 2026-07-15 18:35 PT  
**Rule:** Populated **only** from real extracts in business-launch registers and `crm-import/*.json`. **Never invent.** Unknown = `null`. Competing figures = **UNVERIFIED** line items — **not summed**.

**Sources read:** `CLIENT_MIGRATION_STATUS.md` · `LEGACY_HVS_CLIENT_REGISTER.md` · `PRICING_REGISTER.md` · `FUNNEL_STATUS.md` · `WEBSITE_STATUS.md` · `SALES_PIPELINE_STATUS.md` · `EXECUTIVE_SNAPSHOT.md` · `HVCG_NEW_CLIENT_REGISTER.md` · `CLIENT_PORTAL_STATUS.md` · `crm-import/ACCG01_dev_shell.json` · `crm-import/PROD01_dev_shell.json` · `crm-import/CHRI01_dev_shell.json` · `crm-import/ARBO01_dev_shell.json` · `inventory/christie_invoice_extract.json` · `inventory/accg_access_plus_extract.json`

---

## Snapshot table

| Metric ID | Value | Verified? | Evidence / notes |
|-----------|-------|-----------|----------------|
| `ActiveClients_HVS` | **2** (confirmed `IsActive=true` in Dev shells) · **7** named roster · **8+** hub discovery unclassified | Partial | `IsActive=true`: ACCG01, PROD01. Named roster = 7 (`LEGACY_HVS_CLIENT_REGISTER`). Arboretum `IsActive=null` (confirm active vs former). Hart, Outstanding Auto, Christie’s Place, That’s Kava — active status **not confirmed**. Hub discovery (Pierlo, Integrity Lift, …) **excluded** from active count. |
| `ActiveClients_HVCG` | **0** | Yes | `HVCG_NEW_CLIENT_REGISTER`: _(none yet)_ |
| `ContractedMRR_Verified` | **null** | — | `PRICING_REGISTER` §A.1: all clients `Verified?=No` or Partial. No MSA+invoice cross-check complete. |
| `ContractedMRR_Unverified` | **$7,500/mo** (single line item only) | No | Prodigy Games LLC — `PROD01_dev_shell.json` `MonthlyRetainer: 7500`, `PricingStatus: EXTRACTED_VERIFY_SIGNED`; `PRICING_REGISTER`: “Partial”. **Not summed with ACCG** (competing candidates). ACCG `MonthlyRetainer: null`. Christie `null` (invoice OCR failed). Arboretum = deposit + % terms — **not MRR**. |
| `PipelineValue` | **null** | Yes (empty) | `SALES_PIPELINE_STATUS`: no opportunities; “Public funnel not live”. |
| `WebsiteLeads` | **0** | Yes | `FUNNEL_STATUS`: “Live leads 0 · No public site”. `WEBSITE_STATUS`: public DNS forbidden. |
| `AR_Outstanding` | **null** | No | ACCG: “Invoices / AR PARTIAL” — no totals extracted. Christie invoices located but `inventory/christie_invoice_extract.json`: OCR **failed** (no PDF libs), `amounts: []`. Access Plus PDF extract **failed** same. |
| `OnboardingPct` | **~28%** | Yes (register) | `CLIENT_MIGRATION_STATUS`: “Overall migration % (structured records) ~28%”. 0 completed · 2 in progress (ACCG deep, Prodigy shell). |
| `PortalEnabledCount` | **0** | Yes | All four Dev shells: `PortalEnabled: false`. `CLIENT_PORTAL_STATUS`: invites forbidden. |

---

## UNVERIFIED line items (not in MRR sum)

| Client | Amount | Cadence | Source | Status |
|--------|--------|---------|--------|--------|
| Prodigy Games LLC | $7,500 | /mo | Signed Fractional CFO PDF (`PROD01_dev_shell.json`) | **UNVERIFIED** — verify live billing |
| ACCG Inc. | ~$4,562 | /mo (ops pattern) | Access Plus cite in HVCG SOW / Second Brain ~$4,539 | **UNVERIFIED** — BL-ACCG-PRICE; do not use as verified |
| ACCG Inc. | $12,500 | /mo | HVS MSA Scale draft | **UNVERIFIED** — likely draft, not executed |
| ACCG Inc. | $6,000 + $3,000 setup | /mo + setup | HVCG SOW draft | **UNVERIFIED** — confirm if executed |
| Arboretum LLC | $7,500 deposit + 1% GR + 5% equity | Non-MRR | Consulting Agreement 1.4.23 (`ARBO01_dev_shell.json`) | **UNVERIFIED** — confirm active vs former; **excluded from MRR** |
| Christie’s Place LLC | null | — | Invoice PDFs 2026-06-19 | **MISSING** — OCR blocked |

---

## Context counters (informational — not dashboard KPIs)

| Item | Value | Source |
|------|-------|--------|
| Named legacy clients in migration | 7 + hub discovery | `CLIENT_MIGRATION_STATUS` |
| Dev CRM import shells drafted | 4 (ACCG01, PROD01, CHRI01, ARBO01) | `crm-import/` |
| CRM Dev write / import | NOT STARTED (intentional) | `CLIENT_MIGRATION_STATUS` |
| HVCG rate card | Live v1 (`HVCG-PRICE-2026-07-15-v1`) | `PRICING_REGISTER` §B |
| Website staging pages | 9+ local HTML | `WEBSITE_STATUS` |
| Prod tenant | Untouched | `EXECUTIVE_SNAPSHOT` |

---

## Refresh log

| Date | Action |
|------|--------|
| 2026-07-15 | Initial snapshot from registers + Dev shells — no invented dollars |
