# Sprint 3 QA Validation Packet

**As of:** 2026-07-16 20:58 PT  
**Branch:** `cursor/revenue-sprint3-conversion`  
**Worktree:** `.worktrees/revenue-sprint3`  
**To:** qa / integration  

## Scope

Revenue Recommendations & Conversion Engine on top of Sprint 2 EVA UI (Dev/Staging only).

## How to preview

```bash
cd docs/business-launch/website/staging   # or master-pm worktree staging
python3 -m http.server 8766 --bind 127.0.0.1
# open http://127.0.0.1:8766/assessments/eva/
```

## Automated tests

```bash
cd .worktrees/revenue-sprint3
node tests/revenue/run_conversion_tests.js
# Result: 33/33 PASS
```

```bash
pwsh -File tests/revenue/Invoke-Sprint3ConversionSmoke.ps1
# Dev CRM LeadId=14, idempotency PASS
# Evidence: deployment/reports/checkpoints/eva-sprint3-conversion-smoke-*.json
```

## Manual checklist

- [ ] Complete multi-step assessment on desktop
- [ ] Resume after refresh (autosave)
- [ ] Mobile width ≤390px — readable scorecards, CTA
- [ ] Results show executive diagnostic, scores+plain language, valuation or “Additional information required”
- [ ] Capital path + engagement + docs + disclaimers present
- [ ] **No** CRM JSON / schema / debug visible
- [ ] Primary CTA shows staging-only note (no live booking/email)
- [ ] Report Print/PDF includes branding, contact 702.906.6444 + manny@…
- [ ] Legacy name ACCG → legacy_guard BLOCK in payload (internal)
- [ ] Duplicate session key does not imply auto-qualify

## Owner-review SKUs

Fractional CFO, Exit Readiness, Acquisition, Modeling → `OWNER REVIEW REQUIRED` when selected (not on Section B package card).

## Non-actions honored

No Prod · no public publish · no prospect email · no Track 1 changes
