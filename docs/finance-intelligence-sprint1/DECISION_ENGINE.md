# Decision Engine — Finance Intelligence

Finance Intelligence evolves from reporting into an **executive decision engine**.

## Observations vs recommendations

| Type | Label | Actionable | Audit |
|------|-------|------------|-------|
| **Observation** | `kind: observation` / AI interpretation | No | Human review only |
| **Recommendation** | `kind: recommendation` | Yes — Accept / Defer / Reject | Acceptance log + decision history |

## Capabilities (Phase 1 decision engine)

- Executive recommendations with **Supporting data** citations
- Highest impact actions (impact score + flag)
- What changed since yesterday (labeled deltas; structural-only where no dollars)
- Cash runway optimization levers (cited demo effects)
- Scenario comparison table (base / upside / downside)
- Revenue risk score (FI-local methodology)
- Capital readiness score (FI-local methodology)
- Enterprise value driver strength (indicative)
- Forecast confidence (FI-local; CCB incomplete)
- AI observations with source references
- Decision history
- Recommendation acceptance tracking
- Full audit log on accept/defer/reject/reopen

## Data rules (unchanged)

- Never invent financial values
- CCB financial scores and KPIs remain incomplete until verified Atlas bind
- Every recommendation must include `citations[]` and `sourceIds[]`
- Confidence and verification status displayed on recommendations and observations

## Cross-team coordination

Shared rubrics (forecast confidence, capital readiness, revenue risk) remain **FI-local** until coordinated with:

- Revenue Systems
- Executive Intelligence
- AI Governance
- Data Engineering
- Master PM

See `COORDINATION.md`.
