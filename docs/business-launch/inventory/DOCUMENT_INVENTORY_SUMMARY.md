# DOCUMENT_INVENTORY_SUMMARY

**Generated:** 2026-07-15 18:20 PT  
**Mode:** READ ONLY — inventory only  
**Full JSON:** `onedrive_local_inventory.json` (1,527 records) · `agreement_pricing_extracts.json`

## Counts (local OneDrive sync)

| Slice | Count / note |
|-------|----------------|
| Total indexed records | 1,527 |
| ACCG-related | 564 |
| Named clients with path hits | ACCG, Arboretum, Christie’s Place, Hart, Prodigy |
| Hub engagement client folders | 15+ (see DATA_SOURCE_REGISTER §C) |
| Graph / PnP online | **0** — no session |

## High-importance agreement anchors (do not move)

| Client | Path (relative to OD sync) | Importance | Recommended CRM | Duplicate risk |
|--------|----------------------------|------------|-----------------|----------------|
| ACCG | `HVS Hub…/ACCG Inc/99_Internal…/HVS_ACCG_Master_Services_Agreement.docx` | CRITICAL | Engagement — ACCG | High vs PDF twin |
| ACCG | `HVS Hub…/ACCG Inc/05_Contracts…/High value Solution LLC Access Plus Consulting Agreement.pdf` | CRITICAL | Engagement — ACCG | Med |
| ACCG | `High Value Capital Group/HVCG/Clients/ACCG/STATEMENT OF WORK AND ENGAGEMENT AGREEMENT.docx` | CRITICAL | Engagement — ACCG (HVCG draft?) | Unique path |
| Prodigy | `…/Prodigy Games/05_Contracts…/HVS_Prodigy_Games_Fractional_CFO_Agreement.docx` (+ signed PDF) | CRITICAL | Engagement — Prodigy | High (docx/pdf/archive) |
| Prodigy | `…/Strategic_Capital_Agreement.docx` | HIGH | Related deal — Prodigy | Med |
| Prodigy/Kava | `…/Prodigy_ThatsKava_Bookkeeping_Services_Agreement_FL.docx` | HIGH | Engagement — That’s Kava / Prodigy | Med |
| Arboretum | `High Value Solution/Arboretum LLC/HVS Internal/Consulting Agreement 1.4.23.docx` (+ signed PDF) | CRITICAL | Engagement — Arboretum | High vs Personal Drive copy |

## Pricing extracts (inventory — not applied)

| Document | Extracted commercial terms | Execution status |
|----------|---------------------------|------------------|
| ACCG HVS MSA | Scale tier **$12,500/mo**; debt success **1.5%**; overage **$450/hr**; effective date text **Feb 1, 2026**; OPEN ITEMS “before execution” | **Treat as DRAFT until owner confirms signed** |
| ACCG HVCG SOW | Prior Access Plus **~$4,562/mo**; proposed HVCG **$6,000/mo** + **$3,000** setup | **Draft path under HVCG/Clients — confirm if executed** |
| Prodigy Fractional CFO | **$7,500/mo**; Growth tier; 6-mo initial; overage **$350/hr** | Signed PDF present — verify |
| Arboretum Consulting | **$7,500** deposit; **1%** gross revenue + **5%** voting equity | Confirm active vs closed |

**Rule:** Preserve whatever is **actually contracted**. Do not auto-apply HVCG rate card to legacy. Owner confirms which ACCG instrument is live (**BL-ACCG-PRICE**).

## Empty / thin sources

- `Client Secure Uploads` / `Client Secure Upload - Manny Barela` — empty locally  
- Outlook / Teams / live SharePoint — blocked pending Graph/PnP auth
