# Wave 1 Lane E — memory pipeline direction

**Status:** DIRECTION_LOCKED  
**As of:** 2026-09-11  
**Machine record:** `docs/evidence/wave1-memory-pipeline-direction-2026-09-11.json`

## Verdict

Reuse existing **businessMemory** / **fabric** / **commercial overlay**. Wave 1 is a **thin slice**, not a new storage product.

## Wave 1 thin slice

1. **Hydrate-on-read** from Azure Table durable ingest  
2. **Local ingest** into the commercial overlay  
3. **Live Client pilot brief**

Pilot pattern: **pilot hydrate + pilot brief**.

## Reusable abstraction direction

Evolve from the pilot hydrate + brief pattern toward a continuous pipeline:

`continuous ingest → normalize → ClientCode resolve → dedupe → timeline → entity / document / communication / decision / task linkage → freshness → provenance → human correction`

## Constraints

- **No new storage product** in Wave 1
- Unknown ClientCode remains **fail closed**
- Do not invent history
- Cross-client leakage target remains **0**
- Default module authority class stays **OBSERVE** unless Owner-gated otherwise

## Non-goals (Wave 1)

- Second memory SoR or greenfield durable store
- Autonomous write-back of inferred memory without Owner gate
- Replacing fabric index or SharePoint `HVCG_*` as authority

## Surfaces to reuse

| Surface | Role |
|---|---|
| businessMemory | Operator desk memory overlay |
| fabric | Indexed Graph/SharePoint signals |
| commercial overlay | Live Client commercial context |
| Azure Table module ingest | Durable OBSERVE envelopes for hydrate-on-read |
