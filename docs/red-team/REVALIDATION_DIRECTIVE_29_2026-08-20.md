# Revalidation — Orchestrator Directive 29 (2026-08-20)

**Train:** red-team  
**Directive:** 29  
**Published UTC:** 2026-08-20T21:38:00Z  
**Worker branch:** `hvcg-05` / `cursor/platform-red-team-866c`  
**BASED ON WORKER SHA:** `5ed414fc07c4db7a054f2ef12474e44609d6892e`

**Scope:** Independent Integration schema-security review of NEW tip after D8 pack (`778defd`). Do **not** identical-scope retest GTM `f53e628`, Copilot `fe3db75`, GCC `8d757cf`, Revenue `85def0e`, or OD-005 `9e5d10a`.

**Target:** `hvcg-05` / `cursor/platform-integration-contracts` @ exact SHA `30964bbf437ef0f43708a0e308d554b84ce4c1d7` (matches origin tip; read/test only via worktree).

**Live baseline (unchanged):** Hub `940a484` / Elite `75d0c59` — LIVE Production P0 = **5 OPEN**.

---

## Overall gates

| Gate | Result |
|------|--------|
| `outbound-dispatch.v1` fail-closed | **PASS** — `mode` const `dry_run_record_only`; `recorded` const true; `dispatched` const false; `liveDispatch` const false; no live-send success shape |
| `icp-studio.v1` exclusions | **PASS** — `exclusions.sensitivePersonalTraits` const **true** |
| Targeted rejects (dispatched=true / mode=live / liveDispatch=true / sensitivePersonalTraits=false) | **PASS** |
| Integration harness `python3 tests/integrations/run_integration_contracts.py` | **PASS** **40/40** exit **0** |
| GTM `createOutboundAdapter` @ `f53e628` (cite only) | Engineering path returns `dry_run_record_only` + `dispatched=false`; live path not wired |
| New Integration schema P0 / P1 | **0 / 0** |
| Integration schema-security @ `30964bb` | **PASS** |
| AUTHORIZE PRODUCTION / OD-005 deploy | **NO** |
| Live Production P0 | **5 OPEN** |

---

## Commands (exact SHA `30964bb`)

| Command | Exit | Evidence |
|---------|------|----------|
| Schema const inspect (outbound + icp) | **0** | `SCHEMA_FAILCLOSED_INSPECT_PASS` — `directive29_schema_failclosed_inspect.txt` |
| `python3 tests/integrations/run_integration_contracts.py` | **0** | **Ran 40 tests … OK** — `directive29_integration_harness.txt` |
| Targeted fail-closed probes + unittest subset | **0** | `FAILCLOSED_PROBES_PASS` — `directive29_failclosed_probes.txt` |

### Probe matrix

| Probe | Result |
|-------|--------|
| outbound valid dry-run | **ACCEPT** |
| `dispatched=true` | **REJECT** |
| `mode=live` | **REJECT** |
| `liveDispatch=true` | **REJECT** |
| `recorded=false` | **REJECT** |
| icp valid (`sensitivePersonalTraits=true`) | **ACCEPT** |
| `sensitivePersonalTraits=false` | **REJECT** |
| Adapter `to_outbound_dispatch_v1` live/dispatched | **REJECT** |
| Suite `test_outbound_dispatch_fail_closed` / `test_icp_studio_excludes_sensitive_personal_traits` | **ok** |

---

## GTM outbound adapter cite (no D28 suite re-run)

**File:** `360-growth-solution` @ `f53e628` — `packages/gtm-agent/src/outbound/orchestrator.ts`

`createOutboundAdapter` always returns `dryRunResult(...)` with `mode: 'dry_run_record_only'`, `recorded: true`, `dispatched: false` for kill-switch, emergency pause, live-dispatch-disabled, channel blocks, and explicitly `live_path_not_wired_in_engineering`. It **cannot** return `dispatched=true` on the engineering tip.

Artifact: `directive29_gtm_outbound_adapter_cite.txt`.

---

## Findings

| Finding ID | System | Branch | Exact SHA | Severity | Evidence | Reproduction | Impact | Remediation | Regression | Status |
|------------|--------|--------|-----------|----------|----------|--------------|--------|-------------|------------|--------|
| *(none new)* | Integration | `cursor/platform-integration-contracts` | `30964bb` | — | 40/40 harness + fail-closed probes | Attempt live/dispatched/sensitive=false | Would enable live send or sensitive ICP | N/A — holds | Keep consts + tests | **no-new-findings** |

Candidate Integration schema P0=**0** P1=**0**.  
LIVE Hub ATLAS/XSYS P0s remain **OPEN** ×5.

---

## Dual-surface / citation

| Surface | Status |
|---------|--------|
| Live Hub `940a484` | **OPEN** ×5 |
| OD-005 / GTM / Copilot / GCC / Revenue | Prior PASS cites; **not** retested this directive |
| Integration `30964bb` outbound-dispatch + icp-studio | **schema-security PASS** |

Artifacts: `docs/red-team/artifacts/directive29_*`
