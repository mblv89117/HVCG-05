# Cross-Team Coordination — Finance Intelligence

Before promoting Finance Intelligence concepts to Atlas-wide or shared product surfaces, coordinate with:

| Team | Topics |
|------|--------|
| **Revenue Systems** | Pipeline→revenue bind, MRR/ARR definitions, forecast conversion assumptions, August forecast confirm workflow |
| **Executive Intelligence** | Priority decisions taxonomy, brief sections, insight vs recommendation vs task conversion |
| **AI Governance** | Observation review path, Accept rules, no AUTO apply to Invoice/payment SoR, Knowledge Platform citations |
| **Data Engineering** | QBO/Mercury verified bind, CCB P&L/BS import, refresh SLAs, provenance promotion to `Verified` |
| **Master PM** | Sprint sequencing, shared KPI catalog, Atlas CURRENT_STATE updates, merge gates |

## FI-local until coordinated

These remain product-local in `src/data/decisionEngine.ts`:

- Revenue risk score methodology
- Capital readiness score methodology
- Forecast confidence factors
- Scenario comparison display labels

## CCB gate (verified)

No CCB financial dollars in approved Atlas sources — relationship and objectives only. Decision engine enforces bind-before-publish recommendation (`rec-ccb-bind`).
