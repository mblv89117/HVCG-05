# Premium walkthrough — Elite commercial workspace

**Train:** revenue-os  
**Directive:** 4  
**Surface:** `/revenue` Commercial workspace  
**Session:** Local Owner (Dev) on `npm run dev` — not a production Entra certification of frozen Elite `75d0c59`  
**P1:** REVOS-ELITE-RT-20260820-01 fail-closed on unmatched opportunity  
**Matched URL:** `http://127.0.0.1:5180/revenue?opportunity=opp-revos-001`  
**Fail-closed URL:** `http://127.0.0.1:5180/revenue?opportunity=opp-accg-expansion-001`  
**Captured:** 2026-08-20T07:25:00Z

## Viewports

| Viewport | Size | Frames |
| --- | --- | --- |
| Desktop | 1440×900 | `desktop-00` … `desktop-04` |
| Mobile | 390×844 | `mobile-00` … `mobile-04` |

## Steps

1. Open `/revenue?opportunity=opp-accg-expansion-001`. Confirm ErrorState: no ACME01 floor/list, subtitle fail closed, `liveDispatch false` / `autoSend false`.
2. Open `/revenue?opportunity=opp-revos-001` (ACME01 matched). Confirm `liveDispatch false` / `autoSend false`.
3. Operator accept offer, then pricing. Recommendations remain `observationOnly` until accept.
4. Click **Send proposal** — BL-C1 blocks send; proposal stays `ready`.
5. Record acceptance (no live send) and open engagement. `autoProvisionAccess=false`, payout off, SUCCESS_FEE_EARNED ≠ collected.

## Evidence

- `desktop-00-fail-closed-accg.png`
- `desktop-01-workspace.png`
- `desktop-02-accepted-pricing.png`
- `desktop-03-send-blocked.png`
- `desktop-04-engagement.png`
- `mobile-00-fail-closed-accg.png`
- `mobile-01-workspace.png`
- `mobile-02-accepted-pricing.png`
- `mobile-03-send-blocked.png`
- `mobile-04-engagement.png`

Reproduce: `node apps/atlas-elite-os/scripts/premium-commercial-walkthrough.mjs` with Elite `VITE_ATLAS_ENV=local npm run dev` on :5180.

**PREMIUM STATUS:** PASS (this-train commercial workspace, desktop + mobile, including fail-closed ACCG frame). Not an Atlas production recert.
