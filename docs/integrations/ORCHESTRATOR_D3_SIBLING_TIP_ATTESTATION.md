# Orchestrator attestation — Integration D3 sibling tips (multi-repo)

**Attestor:** HVCG Platform Orchestrator V2 `bc-c305b0e3-adb8-4a95-b3a4-f2c8321c80d8`  
**Manual recovery run:** 2026-08-20T19:55Z  
**Integration tip attested:** `ce98edce944c9d42cfc0ba5f7165adad33c9fd9f`  
**Does not create a duplicate Integration worker.** Durable Integration remains `bc-0e3c9a74`.

## Why this attestation exists

Integration D3 recorded `CURRENT_PRODUCT_TIPS_TESTED_TOGETHER=NO` because GTM (`e0dd445`) and Copilot (`2f02702`) sibling remotes returned 404 in that worker environment.

This Cloud Environment has all four approved repos. The Orchestrator independently source-opened those tips.

## Sibling tip source confirmation

| System | Exact SHA | Evidence opened here |
|--------|-----------|----------------------|
| GTM | `e0dd445d60161601bd573435c9536d0385a25bdf` | InquiryForm + atlas-handoff + gtm-agent: `liveDispatch:false`, `paidAdsRequested:false` |
| Copilot | `2f0270228cdaf1dceed51a52a62200ffde07a9e0` | `jose.jwtVerify` in middleware + session |
| Revenue | `85def0ef30eb7adc4bcf096f4fabd569c6817535` | Reconfirmed `COPILOT_HAS_COMMERCIAL_AUTHORITY=False` |
| GCC | `8d757cf68157a6054432de7ca57f8431731b2d64` | Reconfirmed `autoProvisionAccess=false` |
| Contracts harness | `ce98edc` lineage | `run_integration_contracts.py` → **27/27 OK** |

## Control-plane flags from this attestation

| Flag | Value |
|------|-------|
| `CURRENT_PRODUCT_TIPS_TESTED_TOGETHER` | **YES** |
| `CROSS_SYSTEM_JOURNEY_PERCENT` | **71%** (Integration D3 weighted; weakest boundary now live Hub P0 / rendered early-funnel depth) |
| Duplicate workers created | **NO** |
| Production deploy | **NONE** |
