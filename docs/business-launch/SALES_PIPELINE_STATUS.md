# SALES_PIPELINE_STATUS

**As of:** 2026-07-15 18:45 PT  

## Pipeline stages (HVCG new business)

Lead → Qualified → Assessment complete → Strategy call → Proposal (owner-priced) → Won / Lost

**Canonical spec:** `sales/PIPELINE_STAGES.md` (exit criteria + CRM mapping)

## Automation (build now — fire later)

| Automation | Status | Notes |
|------------|--------|-------|
| Lead capture form → Dev CRM | SPEC ONLY | `funnel/EVA_INTAKE_TO_CRM_MAP.md`; needs BL-W1 |
| Lead score from EVA band | **READY** | Rules in `PIPELINE_STAGES.md` |
| Proposal package generator | **READY** | `sales/PROPOSAL_TEMPLATE.md`; rate card v1 |
| Pipeline stage definitions | **READY** | `sales/PIPELINE_STAGES.md` |
| Follow-up sequences | HOLD | Needs BL-C1 for any external email |
| Opportunity stage sync | Partial CRM module | Dev only; D-002 for flow import |
| Won → onboarding | **SPEC READY** | `onboarding/AUTOMATED_ONBOARDING_SPEC.md` |

## Lead scoring (v1)

| Signal | Points |
|--------|--------|
| EVA / FRA completed | +30 |
| Revenue band disclosed | +15 |
| Capital need + timeline | +20 |
| Financials available | +15 |
| Decision-maker booked call | +20 |
| Band A readiness | +10 |
| Incomplete / low trust flags | −20 |

Thresholds: ≥70 Sales Priority · 40–69 Nurture · &lt;40 Educate / FRA only.

## Pricing integration

| Item | Status |
|------|--------|
| BL-P1 rate card | **CLOSED** — `PRICING_REGISTER.md` v1 |
| Proposal owner approval | **REQUIRED** — all auto-generated proposals |
| Legacy HVS rate card | **BLOCK** — Section A preserve |

## Current opportunities

| Name | Stage | Class | Next |
|------|-------|-------|------|
| — | — | — | Public funnel not live |

Legacy clients are **not** sales opportunities — migration track.

## Ready for build vs blocked

| Ready | Blocked |
|-------|---------|
| Stage defs + exit criteria | Live form → Lead (BL-W1) |
| Lead scoring rules | External email / nurture (BL-C1) |
| Proposal template + SKU wiring | Flow import (D-002) |
| EVA → CRM field map | Prod CRM (PROD-1) |
