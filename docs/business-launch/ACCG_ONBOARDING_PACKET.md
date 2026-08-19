# ACCG_ONBOARDING_PACKET

**Client:** ACCG Inc.  
**ClientCode (proposed):** `ACCG01`  
**Classification:** `HVS_LEGACY_CLIENT` — **OWNER LOCKED** (keep legacy agreement)  
**As of:** 2026-07-15 18:25 PT  
**Status:** IN PROGRESS — shells from inventory; **no** Dev/Prod writes, invites, or outbound client comms

## Standing rules

| Rule | Status |
|------|--------|
| Do not invent “current price” — owner confirms executed instrument | LOCKED |
| Do not apply new HVCG public rate card to ACCG until re-contract confirmed | LOCKED |
| No portal invites / external sharing / client email | LOCKED |
| No Prod; no source file mutations | LOCKED |

---

## 1. Account shell

| Field | Value | Source |
|-------|-------|--------|
| LegalName | ACCG Inc. | Hub + OD |
| ClientCode | ACCG01 *(proposed)* | Convention |
| Classification | **HVS_LEGACY_CLIENT** (default) / possible **HVS_TRANSITIONING_CLIENT** if HVCG SOW executed | Owner: BL-ACCG-CLASS |
| ContractingEntity (current ops) | High Value Solution LLC *(default)* | MSA / Access Plus |
| ContractingEntity (candidate) | High Value Capital Group LLC | HVCG SOW draft |
| State / profile | FL concrete contractor; ~$5M revenue; target $25M by 2027 *(from MSA recitals — verify)* | MSA draft text |
| Relationship since | March 2023 *(MSA recital)* | MSA |
| PortalEnabled | **false** | Rule |
| SharePointLibraryUrl | PLAN ONLY — Hub `…/ACCG Inc/` is working tree | Inventory |

---

## 2. Contacts (do not contact)

| # | Name | Role | Email | Phone | Notes |
|---|------|------|-------|-------|-------|
| C1 | Earl Jackson | President | Ej@accg-inc.com | 321-363-6005; 386-689-9331 | Second Brain |
| C2 | Sandra Vasquez | Finance | MISSING | MISSING | Inventory email TBD |
| C3 | Leon Reed | Principal / related | MISSING | MISSING | Named in MSA cover note |

---

## 3. Engagement / pricing register (PRESERVE — verify)

| Instrument | Entity | Path | Commercial terms extracted | Status |
|------------|--------|------|----------------------------|--------|
| Access Plus Consulting Agreement | HVS | Hub `05_Contracts…/High value Solution LLC Access Plus….pdf` | PDF not OCR’d this pass; HVCG SOW cites prior retainer **~$4,562/mo** | LOCATED |
| HVS MSA — Scale Tier | HVS | Hub `99_Internal…/HVS_ACCG_Master_Services_Agreement.docx` (+ PDF) | **$12,500/mo**; 60 hrs; debt success **1.5%**; overage **$450/hr**; term 12 mo; effective text **2026-02-01**; **OPEN ITEMS before execution** | **DRAFT-LIKELY** — confirm signature |
| HVCG Statement of Work & Engagement | HVCG | `High Value Capital Group/HVCG/Clients/ACCG/STATEMENT OF WORK….docx` | Prior ~**$4,562**; new **$6,000/mo** + **$3,000** setup; payable to HVCG; Option 3 ROS/AI add-on language | **DRAFT?** — confirm if signed/effective |
| Second Brain ops note | — | Prior inventory | Pattern **$4,539/mo** | Unverified vs agreements |

**Operational instruction until owner decides:** treat billing as **frozen at currently invoiced amount**; do not bill $12,500 or $6,000 from drafts alone. Owner gate **BL-ACCG-PRICE**.

---

## 4. Projects / docs (locations only)

| Area | Path |
|------|------|
| Hub client root | `HVS Hub - Documents/4_Engagements/00_Client Files/ACCG Inc/` |
| Contracts | `…/05_Contracts & Invoice Docs/` |
| Financials | `…/02_Financial Docs/` |
| Bank/AR | `…/04_Bank & AR Docs/` |
| Internal HVS | `…/99_Internal (HVS only)/` |
| Legacy OD tree | `High Value Solution/ACCG/` (+ Submit / Submit 2 duplicates — **duplicate risk HIGH**) |
| HVCG client folder | `High Value Capital Group/HVCG/Clients/ACCG/` |

Duplicate risk: `Submit` vs `Submit 2`; MSA docx vs pdf; Personal Drive `4.10.23` copies. **Do not dedupe.**

---

## 5. CRM Dev draft plan (not written)

When owner clears Dev writes for shells only:

1. `HVCG_Clients` row ACCG01 — classification + contracting entity per BL-ACCG-CLASS  
2. Contacts C1–C3  
3. Engagement row pointing to **verified** instrument only  
4. Document metadata rows (paths/hashes) — no file moves  

**Prod:** untouched.

---

## 6. Owner gates (ACCG)

| ID | Decision needed |
|----|-----------------|
| BL-ACCG-CLASS | Legacy HVS vs Transitioning to HVCG |
| BL-ACCG-PRICE | Which retainer is live: ~$4,562 / draft $12,500 MSA / draft $6,000 HVCG SOW |
| BL-ACCG-1 | Confirm Hub `ACCG Inc` as canonical document root |
| BL-ACCG-4 | Any additional SP site URLs beyond OD sync |

---

## 7. Next agent actions (no owner wait except gates above)

1. Hash remaining HIGH contracts; OCR Access Plus PDF when tool available  
2. Invoice folder inventory → AR snapshot (read-only)  
3. Draft Dev JSON import package (file only — no API write)  
4. After ACCG template proven → Prodigy packet


---

## 8. Billing evidence update (2026-07-15 PDF extract)

| Evidence | Amount | Interpretation |
|----------|--------|----------------|
| `HVS_Invoice_ACCG_2026-5.pdf` INV-2026-05-ACCG-AP | **$4,539.00** | Access Plus — current bill pattern |
| Past Due Oct 2025 Access Plus Membership | **$4,539.00** | Same product |
| Stripe Invoice-23323F37-0001 (Sep 2024) | **$4,563.00** | Near Access Plus |
| HVS MSA Scale draft | $12,500/mo | **Not used for current billing** |
| HVCG SOW draft | $6,000 + $3k setup | **Not used for current billing** |

**Operational freeze:** treat **$4,539/mo Access Plus** as current preserve amount for CRM/ops until owner confirms a different executed instrument (BL-ACCG-PRICE reduced to: confirm drafts inactive).


## OWNER LOCK (2026-07-15)

- Keep ACCG on **legacy Access Plus** at **$4,539/mo**.
- Do **not** apply MSA $12,500 or HVCG $6,000 drafts.
- Do **not** touch pricing for existing clients.
