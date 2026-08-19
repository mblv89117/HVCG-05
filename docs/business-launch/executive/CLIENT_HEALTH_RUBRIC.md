# CLIENT_HEALTH_RUBRIC

**As of:** 2026-07-15  
**SoR for scoring:** This file  
**Applied in:** `CLIENT_HEALTH_DASHBOARD.md` · `CLIENT_HEALTH_DASHBOARD.json`

---

## Purpose

Compute a **0–100 health score** per client from verified registers only. No invented dollars. Unverified amounts labeled **UNVERIFIED**; missing required fields labeled **MISSING**.

---

## Base points (max 100)

| Factor | Points | Earned when |
|--------|--------|-------------|
| **Pricing verified** | +20 | Current fee confirmed from **invoice** or **executed agreement** (not draft alone) |
| **Active engagement clarity** | +15 | `IsActive=true` or explicit active stage in CRM shell / packet |
| **Document corpus present** | +15 | Agreements, SOWs, invoices, or onboarding packet with anchors |
| **Contacts known** | +10 | Primary + billing/decision-maker in shell or invoice extract |
| **Funding status known** | +10 | Capital/CFO/funding engagement type + pricing instrument located |
| **Comms inventory available** | +10 | Emails/meetings counted in discovery census or comms register |
| **Low open risk** | +10 | No critical blockers, past-due signals, or owner gates open |
| **Renewal window known** | +5 | Renewal date, notice period, or initial term extracted |
| **Cross-sell identified** | +5 | Related account, expansion SKU, or transitioning candidate noted |

### Partial credit (structured clients)

When a factor is partially met, apply proportional credit (documented in JSON `score_breakdown`):

| Factor | Partial rules |
|--------|---------------|
| Pricing | +18 invoice-extracted only · +12 agreement-extracted UNVERIFIED · 0 MISSING |
| Engagement | +8 Discovery stage · +3 Unknown |
| Docs | 15 (≥100 files) · 12 (≥25) · 8 (≥10) · 5 (≥1) · 0 none |
| Contacts | +6 single partial contact · 0 none |
| Funding | +8 instrument + capital type · +3 type only |
| Comms | min(10, emails×2 + meetings) |
| Low risk | Start 10; deduct for open gates / missing pricing / unknown active |

### Discovery-only clients (no CRM shell)

Score from `ALL_CLIENTS_DISCOVERY.json` census only. Cap each factor lower; flag **INCOMPLETE — discovery only, no CRM shell**. Never assign VERIFIED pricing without invoice/agreement extract.

---

## Deductions

Apply after base points. Floor score at **0**.

| Signal | Deduction | Trigger |
|--------|-----------|---------|
| **MISSING critical field** | −3 to −5 each | Pricing, engagement status, or contacts all MISSING on active-class client |
| **Past-due signal** | −3 to −5 | Past-due invoice labels in inventory / PDF extracts |
| **Draft-vs-bill conflict** | −10 | Observed billing differs from draft MSA/SOW (e.g. BL-ACCG-PRICE) |
| **Unconfirmed relationship** | −2 | HVS advisory not confirmed (e.g. operating agreement only) |

---

## Health bands

| Band | Score | Executive meaning |
|------|-------|-------------------|
| **Green** | 70–100 | Operable — minor verification or renewal gaps only |
| **Yellow** | 40–69 | Attention — pricing, engagement, or contact gaps; owner action queued |
| **Red** | 0–39 | At risk — missing instrument, unprofiled, or discovery-only |

---

## Data source precedence

1. `clients/*/PROFILE.md` (when present) — **not yet available**
2. `crm-import/*_dev_shell.json` + onboarding packets
3. `PRICING_REGISTER.md` + `inventory/pdf_billing_extracts.json`
4. `inventory/ALL_CLIENTS_DISCOVERY.json` (census only — INCOMPLETE)

---

## Forbidden

- Inventing dollar amounts
- Applying HVCG rate card to legacy clients
- Prod CRM / SharePoint writes
- Treating draft instruments as verified pricing

---

## Cross-links

| File | Role |
|------|------|
| `CLIENT_HEALTH_DASHBOARD.md` | Human-readable SoR for client health |
| `CLIENT_HEALTH_DASHBOARD.json` | Machine-readable feed (Power BI / Command Center) |
| `PRICING_REGISTER.md` | Pricing verification policy |
| `LEGACY_HVS_CLIENT_REGISTER.md` | Named roster priority |
