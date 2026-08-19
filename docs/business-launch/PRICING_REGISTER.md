# PRICING_REGISTER (CANONICAL)

**As of:** 2026-07-15 18:12 PT  
**Owner-approved:** Yes (Manny) — **BL-P1 CLOSED**  
**SoR:** This file

---

## A — Legacy High Value Solution LLC clients

| Rule | Detail |
|------|--------|
| Classification | **Legacy HVS** (`HVS LEGACY CLIENT` / `HVS TRANSITIONING CLIENT`) |
| Pricing | **Preserve every existing engagement exactly as contracted** |
| Auto-increase | **Forbidden** |
| Future reprice | **Manual only at renewals** (owner-approved) |
| HVCG rate card | **Do not apply** unless owner re-contracts under HVCG |
| Calculator / engine | **BLOCK** — no Section B quote for legacy classes |

### A.0 Preservation process (inventory → verify → freeze)

| Step | Action | Output | Owner gate? |
|------|--------|--------|-------------|
| 1 | Locate MSA / Access Plus / SOW / invoices | Path + content hash (`ACCG_SOURCE_INVENTORY`) | No |
| 2 | Extract fee type, amounts, cadence, start, renewal, notice, success terms | Detail block (A.2) | No |
| 3 | Record **Original** (first contracted) vs **Current** (as billed) | Flags: **MISSING** / **TBD** / **UNVERIFIED** — never invent | No |
| 4 | Note waivers, holds, unpaid | Terms notes | No |
| 5 | Verify dollars vs MSA/SOW + invoices | Verified? Yes/No | Soft |
| 6 | **Freeze** — changes only via OWNER_DECISIONS + written agreement | Action = **PRESERVE** | **Yes** to change |
| 7 | Queue: ACCG first → remaining roster | Migration cross-link | No |

**Flag vocabulary:** **MISSING** = required, not extracted · **TBD** = expected from named source · **UNVERIFIED** = observed pattern only · **PRESERVE** = locked, no Section B.

**Forbidden:** file moves/deletes, client price emails, portal invites, payment-method changes, inventing dollars, applying HVCG rates to legacy.

### A.1 Preservation register (inventory in progress)

| Client | Classification | Original pricing | Current pricing | Verified? | Action |
|--------|----------------|------------------|-----------------|-----------|--------|
| ACCG Inc. | **HVS LEGACY — OWNER LOCKED** | Access Plus legacy agreement | **$4,539/mo** | **Yes — owner 2026-07-15** | **PRESERVE — never auto-reprice** |
| Prodigy Games LLC | Legacy HVS | Fractional CFO **$7,500/mo** (signed PDF) | Verify live | Partial | PRESERVE |
| That’s Kava LLC | Legacy HVS | **MISSING** | **MISSING** | No | PRESERVE |
| Christie’s Place LLC | Legacy HVS | TBD contract | **$4,750** consulting invoices Jun 2026 (#128/#129) | Invoice-extracted | PRESERVE |
| Hart Family Dental | Legacy HVS | **MISSING** | **MISSING** | No | PRESERVE |
| Outstanding Auto Detailing LLC | Legacy HVS | **MISSING** | **MISSING** | No | PRESERVE |
| Arboretum LLC | Legacy HVS | **MISSING** | **MISSING** | No | PRESERVE |
| Victorum Tattoo | Legacy HVS | Business plan/deposit stack + 1% post-sale (DOCX extract) | UNVERIFIED active | Partial | PRESERVE |
| Lien Partners LLC | Legacy HVS | **$4,562/mo** Close-Readiness Sprint (DOCX) | UNVERIFIED | Partial | PRESERVE |
| Integrity Lift Solutions LLC | Legacy HVS | **$10,000** retainer (draft DOCX; verify signed) | UNVERIFIED | Partial | PRESERVE |
| Frocovery | Legacy HVS | Setup $2,500; tiered $500–$2,500/mo (BDA) | UNVERIFIED | Partial | PRESERVE |
| Victory Contracting | Legacy HVS | **$10,000** funding retainer + 5% equity (DOCX) | UNVERIFIED | Partial | PRESERVE |

### A.2 ACCG Inc. — detail (from `ACCG_ONBOARDING_PACKET` §5)

| Field | Status | Value / note |
|-------|--------|--------------|
| ClientCode | Proposed | `ACCG01` |
| Classification | Locked | HVS LEGACY CLIENT / Legacy HVS |
| ContractingEntity | Known | High Value Solution LLC |
| Fee type | **TBD** | Expected monthly retainer (+ setup/success if in MSA) |
| Original pricing (contracted) | **TBD / MISSING extract** | SRC-AGREE-001 MSA PDF `fba090d2…`, SRC-AGREE-002 DOCX `6fe101b3…`, SRC-AGREE-003 Access Plus `09f789ba…` |
| Current pricing (observed) | **UNVERIFIED multi-source** | ~$4,562 Access Plus (HVCG SOW cite); Second Brain ~$4,539; MSA draft $12,500; HVCG SOW draft $6,000+$3k setup — **BL-ACCG-PRICE** |
| SetupFee | **TBD** | Extract from MSA/SOW |
| SuccessFeePercent / Terms | **TBD** | Extract from MSA/SOW |
| EngagementStartDate | **MISSING** | Extract from MSA |
| RenewalDate / notice | **MISSING** | Extract from MSA |
| EngagementValue | **MISSING** | Only after verified fees |
| SOW / Engagement | Located — terms **UNVERIFIED** | SRC-SOW-001 `8ce02d9a…` (HVCG Clients/ACCG path — confirm cover; still legacy); SRC-SOW-002 |
| Invoice cross-check | **MISSING** partial | SRC-INV-2026-01; older Submit-2 invoices not fully matched |
| Verified against MSA/SOW? | **No** | Dollar extract required |
| Action | **PRESERVE** | Never apply Section B; do not write UNVERIFIED amount as final CRM price |

**ACCG process notes**

1. Packet §5 + this block are SoR placeholders until MSA/Access Plus/SOW dollars are extracted.  
2. $4,539 = working **current-price hint** labeled UNVERIFIED — not OriginalPricing.  
3. HVCG-path SOW does **not** authorize HVCG reprice.  
4. Next: extract fee schedule from SRC-AGREE-001/002/003 → fill Original + confirm Current → Verified?=Yes → freeze.  
5. Cross-link: `ACCG_ONBOARDING_PACKET.md`, `ACCG_SOURCE_INVENTORY.md`.

### A.3 Change-control (legacy only)

Any proposed change requires: (1) owner decision ID, (2) written client agreement path, (3) before/after amounts here, (4) ContractingEntity note. Default = **deny**.

---

## B — New High Value Capital Group LLC clients (canonical rates)

**Applicability:** `HVCG PROSPECT` / `HVCG NEW CLIENT` only.  
**Engine may show estimated ranges; final engagement price requires owner approval.**

### B.1 Productized / packages

| SKU ID | Offer | Setup | Monthly | Notes |
|--------|-------|-------|---------|-------|
| SKU-FRA | Funding Readiness Assessment | **FREE** | — | Lead / qualification |
| SKU-CAP-CORE | Capital Advisory — Core | **$5,000** | **$3,500** | |
| SKU-CAP-GROWTH | Capital Advisory — Growth | **$10,000** | **$7,500** | |
| SKU-CAP-ENT | Capital Advisory — Enterprise | **Starting $20,000** | **Starting $12,500** | Custom may exceed based on complexity |

### B.2 Success fees

| SKU ID | Type | Rate |
|--------|------|------|
| SKU-SUCCESS-DEBT | Debt success fee | **1.5%** |
| SKU-SUCCESS-EQUITY | Equity success fee | **3%** |

### B.3 Hourly consulting

| SKU ID | Level | Rate |
|--------|-------|------|
| SKU-HR-ASSOC | Associate | **$250/hr** |
| SKU-HR-SENIOR | Senior | **$350/hr** |
| SKU-HR-PRINCIPAL | Principal | **$500/hr** |

### B.4 Engine rules

1. Never apply Section B to Legacy HVS without owner re-contract.  
2. Display ranges/estimates OK; **final price = owner approval** before engagement.  
3. Inaccurate-info notice before any upward/downward adjustment.  
4. No guarantees of valuation, financing, approval, funding, tax, legal, or performance.

### B.5 Version

| Field | Value |
|-------|--------|
| version | `HVCG-PRICE-2026-07-15-v1` |
| approved_by | Manny |
| effective_date | 2026-07-15 |

---

## Verification log

| Date | Item | Result |
|------|------|--------|
| 2026-07-15 | BL-P1 owner pricing policy | **APPROVED** — stored as canonical |
| 2026-07-15 | ACCG Section A MISSING/TBD/UNVERIFIED + process notes | Done from packet — **no legacy price change**; MSA extract still open |
| 2026-07-15 | Calculator stub (field→SKU; stub $ null) | `funnel/PRICING_CALCULATOR_STUB.md` |

| 2026-07-15 | BL-ACCG-PRICE CLOSED | Owner: keep legacy Access Plus $4,539; do not touch existing-client pricing |
