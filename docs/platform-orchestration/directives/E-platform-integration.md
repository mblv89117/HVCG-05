# Train E Directive Snapshot (consumed)

This file is a **local consumption snapshot** of the Platform Orchestrator directive for Train E.
Authoritative remote control plane: `360-growth-solution` / `cursor/platform-orchestrator-b1fa`.

| Field | Value |
|-------|-------|
| Directive Version | `ORCH-DIR-E-2026-08-20T0418Z` |
| Based on remote SHA | `795d5159d1ba9257e7607701fd7aacb9c4fa2bff` |
| Fetched at | 2026-08-20T04:26Z |
| Expected branch | `cursor/platform-integration-contracts` |
| Priority | Continuous / Priority 2 |

## Binding technical directives (from orch report)

1. Keep Integration SoT for lead intake / cross-system contracts.
2. Resolve CC-001 Copilot PascalCase drift without breaking camelCase SoT.
3. Resolve CC-006 by mapping `gcc-atlas-signal` → `gcc-value-signal`.
4. Ratify GTM additive `360-atlas-gtm-sync.v1`.
5. Do not modify frozen Hub/Elite runtime; no production deploy.
6. Publish agent-status per STATUS_PROTOCOL.

See `../DIRECTIVE_CONSUMPTION.md` and `../../agent-status.md`.
