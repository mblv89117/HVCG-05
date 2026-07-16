# Sprint 4 — Conversion Activation

**Status:** SPRINT 4 – PHASE 1 (ACTIVATION FRAMEWORK) COMPLETE (DEV/STAGING)  
**As of:** 2026-07-16  
**Branch:** `cursor/revenue-sprint4-activation`  
**Worktree:** `.worktrees/revenue-sprint4`  
**Base tip:** `0073bf4` (Sprint 2–3 complete)  
**Environment:** Development / Staging only — **no Production**

> Phase 1 delivers the engineering activation framework in Dev/Staging. The
> remaining Sprint 4 work is **owner-gated activation tasks, not engineering
> defects** (see "Remaining owner-gated activation tasks" below).

---

## Mission

Convert completed EVA + Sprint 3 conversion output into an **automated sales activation layer**: strategy session capture, qualification workflow, engagement packaging, Dev CRM activation pipeline (documented), nurture trigger plans (no send), internal sales board, owner gates.

## Non-negotiables honored

| Rule | How |
|------|-----|
| No Sprint 1–3 redesign | `conversion-engine.js`, scoring, question bank, CRM `schemaOnly` untouched |
| No CRM schema change | Activation lives in staging objects / localStorage; pipeline flags `schema_only_keys_unchanged` |
| No Prod / DNS / live email | Owner gates BLOCKED; nurture `outbound_enabled: false` |
| No auto-qualify | `lead_status_intent: New`, `auto_qualify: false` |
| Additive UI only | Bridge script + new pages; wizard engines unchanged |

## Features

1. **Strategy Session scheduling** — `strategy-session.html` request capture (preferred slots); no live calendar  
2. **Lead qualification workflow** — formalized steps from Sprint 3 temperature (manual qualify gate)  
3. **Engagement recommendation engine** — activation package wrapping Sprint 3 services + pricing gate  
4. **CRM activation pipeline** — staged Dev pipeline definition (capture → attach → strategy → nurture plan → manual qualify → Opp); Prod stage BLOCKED  
5. **Nurture trigger framework** — planned sequences; BL-C1 blocks all prospect sends  
6. **Internal sales dashboard** — `sales-dashboard.html` local board  
7. **Owner approval gates** — BL-C1, LIVE-BOOKING, PROD-CRM, AUTO-QUALIFY, price cards, secondary phone  

## Files owned (this sprint)

- `docs/business-launch/website/staging/assessments/eva/js/activation-engine.js`
- `docs/business-launch/website/staging/assessments/eva/js/nurture-framework.js`
- `docs/business-launch/website/staging/assessments/eva/js/activation-bridge.js`
- `docs/business-launch/website/staging/assessments/eva/js/strategy-session.js`
- `docs/business-launch/website/staging/assessments/eva/js/sales-dashboard.js`
- `docs/business-launch/website/staging/assessments/eva/css/activation.css`
- `docs/business-launch/website/staging/assessments/eva/strategy-session.html`
- `docs/business-launch/website/staging/assessments/eva/sales-dashboard.html`
- `docs/business-launch/website/staging/assessments/eva/index.html` (**additive script tags only**)
- `docs/business-launch/funnel/activation/`
- `tests/revenue/run_activation_tests.js`
- `docs/business-launch/funnel/activation/CRM_ACTIVATION_PIPELINE.json`

## Preview

```bash
cd .worktrees/revenue-sprint4/docs/business-launch/website/staging
python3 -m http.server 8767 --bind 127.0.0.1
# EVA: http://127.0.0.1:8767/assessments/eva/
# Strategy: .../assessments/eva/strategy-session.html
# Board: .../assessments/eva/sales-dashboard.html
```

## Tests

```bash
cd .worktrees/revenue-sprint4
node tests/revenue/run_activation_tests.js
# Includes Sprint 3 regression (33/33)
```

## Remaining owner-gated activation tasks (not engineering defects)

Phase 1 is engineering-complete in Dev/Staging. The following are **business /
owner activation decisions** required before the framework can go live. None are
code defects or regressions.

- **Live booking integration** — connect an approved calendar provider (LIVE-BOOKING gate)
- **Pricing card approval** — SKU-FCFO / SKU-EXIT / SKU-ACQ / SKU-MODEL rate cards (currently OWNER REVIEW)
- **Soft UAT** — human review of activation CTA + strategy form copy
- **Outbound email/SMS activation** — BL-C1 gate; nurture sends remain disabled until approved
- **Production activation gates** — PROD-CRM / AUTO-QUALIFY; Track 1 frozen until owner approval

### Supporting / optional

- Secondary phone routing (`725.577.6511`, DS-PHONE)  
- Optional Dev HTTP URL for EVA POST / strategy request queue (no outbound)  
