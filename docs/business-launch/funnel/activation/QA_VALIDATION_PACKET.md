# Sprint 4 QA Validation Packet

**As of:** 2026-07-16  
**Branch:** `cursor/revenue-sprint4-activation`  
**Worktree:** `.worktrees/revenue-sprint4`  
**To:** qa / integration / Master PM  

## Scope

Conversion activation on top of Sprint 1–3 (Dev/Staging only).

## Automated tests

```bash
cd .worktrees/revenue-sprint4
node tests/revenue/run_activation_tests.js
# Sprint 4 asserts + Sprint 3 regression 33/33
```

## Manual checklist

- [ ] Complete EVA → results still match Sprint 3 (scores, valuation, capital, engagement)
- [ ] Results show additive links: Strategy Session request · Internal sales board
- [ ] Primary CTA routes to strategy-session.html (staging note still appears)
- [ ] Submit strategy request with preferred slots → confirmation (no email sent)
- [ ] Sales board shows lead row + request + owner gates
- [ ] Nurture plan in activation JSON has `outbound_enabled: false`
- [ ] Report / PDF still works (Sprint 3)
- [ ] Legacy name ACCG → legacy_block / BLOCK (no new-client nurture as HVCG)
- [ ] No Production / DNS / schema changes

## Non-actions honored

No Prod · no public publish · no prospect email · no Track 1 changes · no schemaOnly key changes
