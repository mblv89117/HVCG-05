# Adapter: gcc-atlas-signal.v1 → gcc-value-signal.v1

**CC-006 resolution (Integration SoT)**  
**Canonical:** `gcc-value-signal.v1`  
**Producer-local (non-canonical):** `peers/gcc-atlas-signal.v1.json`

## Mapping

| gcc-atlas-signal.kind | gcc-value-signal.signalType |
| --- | --- |
| `renewal_risk` | `renewal_risk` |
| `expansion_ready` | `expansion_opportunity` |
| `high_realized_value` | `value_realized` |
| `low_engagement` | `engagement_health` |
| `financial_deterioration` | `renewal_risk` |
| `new_capital_need` | `capital_need` |
| `new_constraint` | `constraint` |
| `new_ai_opportunity` | `ai_opportunity` |
| `new_process_bottleneck` | `process_bottleneck` |
| `contract_opportunity` | `contract_opportunity` |

## Required adapter behavior

1. Emit `contractVersion: gcc-value-signal.v1`.
2. Copy `signalId`, `clientCode`, `gccOrganizationId`, `emittedAt`, `summary`.
3. Map `kind` → `signalType` using the table; preserve original `kind` as optional field.
4. Map severity strings into `{low,medium,high,critical}` (unknown → `medium`).
5. Put producer `payload` under `metrics` / retain non-sensitive keys only.
6. Attach `write-envelope.v1` with idempotency `gcc-signal|{signalId}`.
7. `copiesLedger: false` always.
8. Never treat `gccOrganizationId` as `ClientCode`.

## Product train obligation

GCC must call this adapter before Atlas-bound emission, or emit `gcc-value-signal.v1` directly.
Atlas consumers validate only the canonical schema.
