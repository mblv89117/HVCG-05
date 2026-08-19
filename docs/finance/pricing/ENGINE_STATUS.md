# ENGINE_STATUS

**Generated:** 2026-07-15 (Finance Operations worktree)  
**Mode:** READ_ONLY verification — no payment processor connects  
**Canonical rate card:** `HVCG-PRICE-2026-07-15-v1`  
**SoR references:** master-pm `PRICING_REGISTER.md`, `funnel/PRICING_ENGINE_SPEC.md`, `funnel/PRICING_CALCULATOR_STUB.md`

---

## Alignment summary

| Check | Status | Detail |
|-------|--------|--------|
| Rate card version | **ALIGNED** | Engine spec + calculator stub both reference `HVCG-PRICE-2026-07-15-v1` (owner-approved BL-P1) |
| Section B SKUs | **ALIGNED** | SKU-FRA, SKU-CAP-CORE/GROWTH/ENT, SKU-SUCCESS-DEBT/EQUITY, SKU-HR-* match register |
| Legacy guard | **BLOCK** | `HVS_LEGACY_CLIENT`, `HVS_TRANSITIONING_CLIENT`, `FORMER_CLIENT` → `legacy_guard = BLOCK`; no Section B quote |
| Owner approval gate | **ENFORCED** | All engine outputs require `owner_approval_required: true` before final engagement price |
| Payment connects | **NONE** | No Mercury / Square / auto-charge wiring on this branch |
| Legacy pricing preservation | **PRESERVED** | Section A clients (ACCG, Prodigy, Christie, etc.) locked to contracted rates |

---

## Legacy BLOCK — verified clients (seed inventory)

Per `PRICING_REGISTER.md` §A.1 and `CLIENT_HEALTH_DASHBOARD.json`:

| Client | Classification | Engine action | Current pricing (SoR) |
|--------|----------------|---------------|------------------------|
| ACCG Inc. | HVS_LEGACY_CLIENT | **BLOCK** — PRESERVE | $4,539/mo Access Plus (invoice-verified) |
| Prodigy Games LLC | HVS_LEGACY_CLIENT | **BLOCK** — PRESERVE | $7,500/mo Fractional CFO (UNVERIFIED live) |
| Christie's Place LLC | HVS_LEGACY_CLIENT | **BLOCK** — PRESERVE | $4,750 consulting (invoice-extracted Jun 2026) |

**Rule:** Calculator and pricing engine must emit `legacy_guard: BLOCK`, empty `sku_recommendations`, and null money fields for these clients. Changes only via owner decision + written agreement (Section A.3).

---

## HVCG-PRICE-2026-07-15-v1 — rate card snapshot

| SKU ID | Setup | Monthly / rate |
|--------|-------|----------------|
| SKU-FRA | FREE | — |
| SKU-EVA-FREE | FREE | — |
| SKU-CAP-CORE | $5,000 | $3,500/mo |
| SKU-CAP-GROWTH | $10,000 | $7,500/mo |
| SKU-CAP-ENT | from $20,000 | from $12,500/mo |
| SKU-SUCCESS-DEBT | — | 1.5% |
| SKU-SUCCESS-EQUITY | — | 3% |
| SKU-HR-ASSOC / SENIOR / PRINCIPAL | — | $250 / $350 / $500 hr |

Applicability: `HVCG_PROSPECT` / `HVCG_NEW_CLIENT` only.

---

## Engine implementation status

| Component | Status | Notes |
|-----------|--------|-------|
| `PRICING_REGISTER.md` | **CLOSED** (BL-P1) | Canonical SoR |
| `PRICING_ENGINE_SPEC.md` | SPEC READY | Output contract defined |
| `PRICING_CALCULATOR_STUB.md` | STUB v1.1 | Field→SKU weights wired; money emits as estimates with owner gate |
| Live calculator UI | **NOT LIVE** | Website staging only |
| CRM / Automate wiring | **BLOCKED** | BL-W1 gate for form → Lead create |
| Legacy client auto-quote | **BLOCKED** | Hard stop per legacy guard |

---

## Forbidden actions (confirmed off)

1. Apply Section B rates to legacy HVS without owner re-contract  
2. Auto-increase legacy client fees  
3. Connect Mercury, Square, or payment processors from this module  
4. Guarantee valuation, financing, or ROI in engine output  

---

## Next owner gates

1. **BL-W1** — EVA form → CRM Automate (prerequisite for live engine input)  
2. **BL-ACCG-PRICE** — MSA dollar extract; does not change engine BLOCK for ACCG  
3. Wire calculator money fields from register only after owner approves stub → prod promotion  
