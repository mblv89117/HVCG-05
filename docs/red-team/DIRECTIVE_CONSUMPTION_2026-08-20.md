# Directive Consumption Log — Train F Red Team

| Field | Value |
|-------|-------|
| Consumed at UTC | 2026-08-20T04:28:00Z |
| Orchestrator branch | `cursor/platform-orchestrator-b1fa` (repo `360-growth-solution`) |
| Orchestrator remote SHA | `795d5159d1ba9257e7607701fd7aacb9c4fa2bff` |
| Directive version | `ORCHESTRATOR_REPORT_2026-08-20T0418Z` |
| Train sheet | `docs/platform-orchestration/trains/F-platform-red-team.md` |
| `directives/` folder | **Missing** on orchestrator tip — used train sheet + reports per control-plane README |

## Directive actions vs branch state

| Directive / expectation | Branch state | Action |
|-------------------------|--------------|--------|
| Continuous independent findings | Catalog already at `15d1253` | Kept; did not rewrite product code |
| Revalidate P0s on **current** tips (report SECURITY section) | Prior catalog used predecessors | **Executed** tip revalidation 0428Z |
| Publish agent-status per STATUS_PROTOCOL | Missing | **Executed** `docs/agent-status.md` |
| Exact branch name `cursor/platform-red-team` | Cloud requires `*-866c` suffix | Documented mapping; no rename (fail-safe vs cloud branch policy) |
| Do not silently fix product defects | Policy | Honored |
| OD-005 Atlas security patch | Owner decision | Documented; **not** implemented here (outside RT ownership) |
| Ignore stale predecessor-only claims | Tips advanced | Updated closed/partial statuses |

## Stale / superseded

- Inspection of only `e585d0f` / `62f98cc` / `51f1cbf` as “current” — **superseded** by tip revalidation.
- Claim that Copilot has no auth middleware — **superseded** on `7e63a6d` (partial).
