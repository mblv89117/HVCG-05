# Revalidation — Orchestrator Directive 28 (2026-08-20)

**Train:** red-team  
**Directive:** 28  
**Published UTC:** 2026-08-20T21:06:00Z  
**Worker branch:** `hvcg-05` / `cursor/platform-red-team-866c`  
**BASED ON WORKER SHA:** `9220be8589b28b9462ded1df78109cc54714eeaf`  
**BASED ON RUN ID:** `run-146f77d7-4ff9-4de0-8fc5-380aa00f8031`

**Scope:** Independent GTM security revalidation of NEW tip after journey-sot adapters (`f61d29c`). Do **not** retest identical Copilot `fe3db75`, GCC `8d757cf`, OD-005 `9e5d10a`, Revenue `85def0e`, or GTM `14d8e4d`.

**Target:** `360-growth-solution` / `cursor/360-gtm-agent-system` @ exact SHA `f53e628a2ef8e7eceb91e12d5a91f59a78c5bdbb` (matches origin tip; read/test only).

**Live baseline (unchanged):** Hub `940a484` / Elite `75d0c59` — LIVE Production P0 = **5 OPEN**.

---

## Overall gates

| Gate | Result |
|------|--------|
| Flag defaults (cleared env) | `GTM_LIVE_DISPATCH_ENABLED=false`, `PAID_ADS_ENABLED=false`, `GTM_KILL_SWITCH=true` |
| `toBookingEventV1` refuses non-dry-run | **PASS** (throws `dryRun` / liveDispatch impossible) |
| `toExperimentSpecV1.paidAdsEnabled` | **const false** |
| `toOptimizationDecisionV1.mutatesPaidAds` | **const false**; `decision=hold_for_owner` |
| Live outbound / paid-ad mutation via `f61d29c` | **Not introduced** (adapters + SYN-GTM marks only) |
| `@360gs/flags` tests | **PASS** 9/9 exit 0 |
| `@360gs/gtm-agent` `journey-sot` tests | **PASS** 5/5 exit 0 |
| `@360gs/gtm-agent` full package tests | **PASS** 16/16 exit 0 |
| New GTM P0 / P1 @ `f53e628` | **0 / 0** |
| GTM SECURITY_CERTIFIED | **PASS** @ `f53e628` |
| Copilot / GCC / OD-005 (cited) | PASS / PASS / REGRESSION=PASS — not retested |
| AUTHORIZE PRODUCTION / deploy | **NO** |
| Live Production P0 | **5 OPEN** |

---

## Commands (exact SHA `f53e628`)

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm install --filter @360gs/gtm-agent... --frozen-lockfile` | **0** | `/tmp/rt-d28/gtm` |
| `pnpm --filter @360gs/gtm-agent exec vitest run tests/journey-sot.test.ts` | **0** | 5/5 — `directive28_gtm_journey_sot_test.txt` |
| `pnpm --filter @360gs/gtm-agent test` | **0** | 16/16 — `directive28_gtm_agent_test.txt` |
| `pnpm --filter @360gs/flags test` | **0** | 9/9 — `directive28_gtm_flags_test.txt` |
| Independent adapter + defaults probe | **0** | `GTM_ADAPTER_GOVERNANCE_PASS` — `directive28_gtm_adapter_probe.txt` |

### Independent probe summary

```json
{
  "defaults": {
    "gtmLiveDispatchEnabled": false,
    "paidAdsEnabled": false,
    "gtmKillSwitch": true
  },
  "booking": { "refuseNonDryRun": true, "hasLiveDispatch": false },
  "experiment": { "paidAdsEnabled": false },
  "optimization": { "mutatesPaidAds": false, "decision": "hold_for_owner" }
}
```

---

## Findings table (this run)

| Finding ID | System | Branch | Exact SHA | Severity | Evidence | Reproduction | Impact | Remediation | Regression requirement | Status |
|------------|--------|--------|-----------|----------|----------|--------------|--------|-------------|------------------------|--------|
| GTM-RT-20260820-J1 | GTM | `cursor/360-gtm-agent-system` | `f53e628a2ef8e7eceb91e12d5a91f59a78c5bdbb` | would-be P0 if open | `toBookingEventV1` throws unless `dryRun===true`; event has no `liveDispatch` | Call adapter with `dryRun:false` | Live booking emit | Keep refuse path | Non-dry-run throws | **NOT_REPRODUCIBLE** (control holds) |
| GTM-RT-20260820-J2 | GTM | same | `f53e628` | would-be P0 if open | `mutatesPaidAds: z.literal(false)`; decision `hold_for_owner` | Emit `toOptimizationDecisionV1` | Unauthorized spend | Keep const false | mutatesPaidAds always false | **NOT_REPRODUCIBLE** (control holds) |
| GTM-RT-20260820-J3 | GTM | same | `f53e628` | would-be P0 if open | `paidAdsEnabled: z.literal(false)` on experiment-spec | Emit `toExperimentSpecV1` | Paid ads enable via SoT | Keep const false | paidAdsEnabled always false | **NOT_REPRODUCIBLE** (control holds) |
| GTM-RT-20260820-J4 | GTM | same | `f53e628` | would-be P0 if open | `packages/flags` defaults + tests | Cleared env → kill=true, live=false, paid=false | Live outbound / ads | Keep fail-closed defaults | Defaults remain safe | **NOT_REPRODUCIBLE** (control holds) |
| *(none new OPEN)* | GTM | same | `f53e628` | — | suites + probe | — | — | — | — | Candidate **P0=0 P1=0** |

LIVE_PRODUCTION: Hub ATLAS/XSYS P0s remain **OPEN** ×5 (not this tip).  
CANDIDATE GTM `f53e628`: **P0=0 P1=0**; **SECURITY_CERTIFIED=PASS**.

Prior nurture-only tip `14d8e4d` is **STALE_SUPERSEDED** for this SECURITY_CERTIFIED gate (SHA moved; journey-sot added).

---

## Source inspect — `f61d29c` delta

Files: `journey-sot.ts` (new), `journey-sot.test.ts` (new), SYN-GTM wiring in `synthetic.ts` / `memory.ts` / exports.

| Check | Result |
|-------|--------|
| New paid-ad mutation / live Graph / live outbound wire | **Absent** |
| Booking path | Dry-run only → stage SoT event |
| Optimization path | `hold_for_owner` + `mutatesPaidAds=false` |
| Contract meaning | Adapters cite Integration tip `516553f` / lineage `773b510` — no fork |

Artifacts: `directive28_gtm_journey_sot_delta.txt`, `directive28_gtm_flags_source.txt`.

---

## Dual-surface / citation

| Surface | Status |
|---------|--------|
| Live Hub `940a484` ATLAS-01/02/03 + XSYS-01/02 | **OPEN** ×5 |
| OD-005 `9e5d10a` | FIXED_REVALIDATED; D23 REGRESSION=PASS (cited) |
| GCC `8d757cf` | SECURITY_CERTIFIED=PASS (D25 cite) |
| Copilot `fe3db75` | SECURITY_CERTIFIED=PASS (D27 cite) |
| GTM `f53e628` | **SECURITY_CERTIFIED=PASS**; candidate P0/P1 = **0/0** |

Artifacts: `docs/red-team/artifacts/directive28_gtm_*.txt`
