# Architecture — Revenue Sprint 4 Sales Engine

**As of:** 2026-07-16
**Environment:** Development / Staging
**Reuse:** Sprint 3 conversion + Sprint 4 Phase 1 activation

## Flow

```
EVA answers
  → HVCG_EVA_CONVERSION.build()
  → HVCG_EVA_ACTIVATION.build()
       → HVCG_EVA_PRICING.build(config)
       → HVCG_EVA_SALES_QUAL.build(config)
       → HVCG_EVA_PROPOSAL.build()
       → HVCG_EVA_PIPELINE.build(config)  // Draft shells only
       → HVCG_EVA_EXEC_REVENUE data model
```

## Config authority

Pricing rules, SKUs, qualification weights/thresholds, and pipeline trigger classes live in JSON configs under `docs/business-launch/funnel/sprint4/config/`. Engines interpret configuration; they do not embed business thresholds.

## Non-mutations

- Locked EVA `schemaOnly` keys unchanged
- Existing Power Automate flows referenced, not modified
- Production / Track 1 frozen
- Communications disabled
