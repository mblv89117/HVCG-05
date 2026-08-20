# Premium walkthrough — Elite commercial workspace

**Train:** revenue-os  
**Directive:** 3  
**Surface:** `/revenue` Commercial workspace  
**Session:** Local Owner (Dev) on `npm run dev` — not a production Entra certification of frozen Elite `75d0c59`  
**Base URL:** `http://127.0.0.1:5180/revenue?opportunity=opp-revos-001`  
**Captured:** 2026-08-20T07:00:00Z

## Viewports

| Viewport | Size | Frames |
| --- | --- | --- |
| Desktop | 1440×900 | `desktop-01` … `desktop-04` |
| Mobile | 390×844 | `mobile-01` … `mobile-04` |

## Steps

1. Open `/revenue` as Local Owner (Dev). Confirm `liveDispatch false` / `autoSend false`.
2. Operator accept offer, then pricing. Recommendations remain `observationOnly` until accept.
3. Click **Send proposal** — BL-C1 blocks send; proposal stays `ready`.
4. Record acceptance (no live send) and open engagement. `autoProvisionAccess=false`, payout off, SUCCESS_FEE_EARNED ≠ collected.

## Evidence

- `desktop-01-workspace.png`
- `desktop-02-accepted-pricing.png`
- `desktop-03-send-blocked.png`
- `desktop-04-engagement.png`
- `mobile-01-workspace.png`
- `mobile-02-accepted-pricing.png`
- `mobile-03-send-blocked.png`
- `mobile-04-engagement.png`

Reproduce: `node apps/atlas-elite-os/scripts/premium-commercial-walkthrough.mjs` with Elite `npm run dev` on :5180.

**PREMIUM STATUS:** PASS (this-train commercial workspace, desktop + mobile). Not an Atlas production recert.
