# LEGACY_PRICING_GUARD

**Purpose:** Prevent accidental repricing of existing HVS clients.  
**Owner:** Manny · **Operator:** COO / Master PM  
**As of:** 2026-07-16  

## One rule

**Existing clients are never auto-repriced.** Automation may read rates for AR visibility and draft copy — it may not change contracted amounts, generate uplift quotes, or swap rate cards without explicit owner action.

---

## Client tiers

| Tier | Who | Pricing source | Auto-reprice? |
|------|-----|----------------|---------------|
| **Legacy HVS** | ACCG, Prodigy, Christie, and all current engagement clients | Invoice-verified / MSA-contracted rates | **NEVER** |
| **HVCG prospects** | New leads post–business launch | HVCG rate card (Core / Growth / Enterprise) | N/A — not yet contracted |

---

## ACCG — owner locked

| Field | Value |
|-------|-------|
| Client | ACCG Inc. (`ACCG01`) |
| Service | Access Plus |
| Locked rate | **$4,539 / month** |
| Lock type | `OWNER_LOCKED` |
| Authority | Manny only — no agent, flow, or EVA may override |

**Allowed:** AR dashboard display, past-due draft reminders (approval-gated), internal escalation.  
**Forbidden:** Rate increases in drafts, automated quote generation, CRM field overwrites, Prodigy-style nurture on ACCG AR.

Past-due files on record do **not** authorize a price change — only collections follow-up after owner approval.

---

## Prodigy & Christie — legacy block

| Client | Rate pattern | Guard |
|--------|--------------|-------|
| Prodigy Games LLC | ~$7,500/mo CFO agreement | `LEGACY_BLOCK` — preserve; collections HIGH priority |
| Christie's Place LLC | $4,750 ×2 (Jun 2026 invoices) | `LEGACY_BLOCK` — preserve; LOW priority, monitor |

Same rules as ACCG: visibility and approval-gated drafts only. No auto-reprice.

---

## HVCG rate card — prospects only

The HVCG rate card applies **only** to net-new prospects evaluated through EVA / sales nurture (`SEQ-SALES-NURTURE-v1`).

| Applies to | Does not apply to |
|------------|-------------------|
| New HVCG leads | ACCG, Prodigy, Christie |
| Pre-contract proposals | Legacy HVS AR sequences |
| Owner-approved quotes | Any auto-generated invoice amount |

Sales nurture drafts still require **per-message owner approval** — same gate as collections.

---

## Enforcement points

| System | Behavior |
|--------|----------|
| Pricing engine | `BLOCK — PRESERVE` for legacy client codes |
| Power Automate collections | `PricingLock` column; skip amount mutation |
| EVA finance hooks | Legacy clients marked `BLOCK` |
| AR / collections flows | Dev only; never auto-contact |

See: `../finance-operations/docs/finance/pricing/ENGINE_STATUS.md` (reference).

---

## Contact boundary (same as collections)

**Never auto-contact clients** for pricing or collections. Owner approves every client-facing message. No Production deployments without sign-off.

**Related:** `COLLECTIONS_AUTOMATION.md` · `APPROVAL_QUEUE.md` · `AR_DASHBOARD.md` · `power-automate/COLLECTIONS_FLOW_DEFINITION.md`
