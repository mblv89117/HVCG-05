# HVCG Finance Intelligence

Production-quality financial intelligence experience for ownership and accounting.

**Branch:** `cursor/finance-intelligence-sprint1`  
**Data mode:** HVCG = Mock demo (Finance Ops Sprint 1 baseline). CCB = incomplete labels only.

## Run

```bash
npm install --cache ./.npm-cache
npm run dev          # http://127.0.0.1:5176
npm run qa:all       # build + unit + Playwright QA
```

## Screens

| Route | Purpose |
|-------|---------|
| `/decisions` | Executive recommendations + acceptance tracking |
| `/changes` | What changed since yesterday |
| `/scores` | Revenue risk, capital readiness, EV drivers, forecast confidence |
| `/` | Overview + highest impact + change snapshot |
| `/trends` | Trend / margin / concentration |
| `/cash` | Cash, runway, debt calendar |
| `/working-capital` | AR/AP aging |
| `/budget` | Budget vs actual |
| `/forecast` | Rolling forecast + scenarios |
| `/enterprise-value` | Indicative EV models |
| `/workspaces` | HVCG / CCB / client aggregate |
| `/capital` | Capital advisory readiness |
| `/alerts` | Finance alerts |
| `/ai` | AI observations (human review) |
| `/governance` | Permissions, sources, audit |

## Roles

Owner / Executive / Finance (full) · Advisor (subset) · Assistant (overview, workspaces, alerts)

## Guardrails

- No invented CCB dollars
- EV labeled indicative unless formally validated
- AI interpretations never treated as verified accounting
- No live credentials; no Production / Track 1 / Revenue / Portal / ECC modifications
