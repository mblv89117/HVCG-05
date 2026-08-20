# Directive Consumption Log — Train E (Platform Integration)

| Field | Value |
|-------|-------|
| Train | E — Platform Integration / Contracts |
| Product branch | `cursor/platform-integration-contracts` (unchanged) |
| Orchestrator repo | `360-growth-solution` |
| Orchestrator branch | `cursor/platform-orchestrator-b1fa` |
| Orchestrator SHA fetched | `795d5159d1ba9257e7607701fd7aacb9c4fa2bff` |
| Directive version consumed | `ORCH-DIR-E-2026-08-20T0418Z` |
| Directive artifacts read | `trains/E-platform-integration.md`, `reports/ORCHESTRATOR_REPORT_2026-08-20T0418Z.md`, `CONTRACT_COLLISIONS.md`, `contracts/CC-001_LEAD_INTAKE_CANDIDATE.md`, `STATUS_PROTOCOL.md` |
| `directives/` folder | **Absent** on orch tip — protocol path noted; trains+report used as binding directive |

## Comparison vs branch state at consume time

| Orch expectation | Branch state @ `8fc711f` | Action |
| --- | --- | --- |
| Schemas + harness published | Present | Already satisfied |
| CC-001 residual Copilot drift | Open | Fail-safe alias policy + Copilot requirement |
| CC-006 GCC signal dualism | Open | Adapter + enum expansion |
| GTM additive sync unratified | Open | Ratified `360-atlas-gtm-sync.v1` |
| Live dispatch off | Satisfied | No change |
| No Hub runtime churn | Satisfied | XSYS-RT-01 docs-only |

## Stale-directive rule

Branch had already advanced past first-run publish referenced in older reports (0355/0406). Those “publish schemas” instructions were ignored as satisfied by `9b46313`+.
