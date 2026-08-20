# Premium walkthrough — Elite commercial workspace (directive 7 recert)

**Train:** revenue-os  
**Directive:** 7  
**Surface:** `/revenue` Commercial workspace (existing Elite render — not rebuilt)  
**Session:** Local Owner (Dev) on `VITE_ATLAS_ENV=local npm run dev` — **not** a production Entra recert of frozen Elite `75d0c59`  
**Journey tip executed:** `e9b3be8c58a3ea20f8d73806c9dbd6258cec8c56`  
**P1:** REVOS-ELITE-RT-20260820-01 remain fail-closed  
**Captured:** 2026-08-20T14:53:00Z

## Viewports

| Viewport | Size | Frames |
| --- | --- | --- |
| Desktop | 1440×900 | `desktop-shell-nav`, `desktop-empty-error`, `desktop-00` … `desktop-04` |
| Mobile | 390×844 | `mobile-shell-nav`, `mobile-empty-error`, `mobile-00` … `mobile-04` |

## Shell / nav

- Desktop: HVCG AppShell with OPERATE / CRM / WORK / CAPITAL / SEARCH / OPERATIONS. **Commercial** highlighted under CRM. Global search, Local Owner chrome, DEVELOPMENT / UAT banner (“NO LIVE CLIENT ACTIONS”).
- Mobile: hamburger + search + End Local Owner. Nav collapses; Pipeline remains reachable.
- Skip-to-main-content is present (`A11Y-NOTES.json` `hasSkipLink=true`).

## Loading / empty / error

- Loading: **N/A** — fixture read-model is synchronous; no spinner. Immediate fail-closed or matched render.
- Empty / error (`/revenue` with no `opportunity`): ErrorState “Commercial context not loaded” — `opportunityId is required`. No ACME prices. `role=alert`.
- Fail-closed (`opp-accg-expansion-001`): ErrorState explains unmatched opportunity; ACME01 floor/list **not** rendered.

## Information density

- Desktop: four summary cards + two-column offer/pricing + proposal/engagement sections. Comfortable whitespace; metadata readable.
- Mobile: same cards stack vertically; pricing $10,000 / $35,000 remains visible on the matched path without overflow of gate chips.

## Needs-Action / Blocked / Ready

| State | Evidence | Notes |
| --- | --- | --- |
| Needs Action | `*-01-workspace` | Offer chip “Awaiting operator”; accept-offer enabled; accept-pricing disabled until offer accepted |
| Ready | `*-02-accepted-pricing` | Offer accepted; proposal `status ready`; record-acceptance enabled |
| Blocked | `*-03-send-blocked` | BL-C1 “proposal cannot auto-send”; `autoSend false`; `liveDispatch false` |
| Ready (engagement) | `*-04-engagement` | `eng-revos-001`; success fee EARNED ≠ collected; payout off; `autoProvisionAccess=false` |

## Accessibility notes

- Page heading “Commercial workspace” is exposed as a heading.
- Fail-closed / empty ErrorState uses `role=alert` (confirmed in `A11Y-NOTES.json`).
- Operator actions are named buttons: “Operator accept offer”, “Operator accept pricing”, “Send proposal”, “Record acceptance (no live send)”, “Open engagement”.
- Skip-to-main-content is available on both viewports.
- Observation: send-blocked MessageBar is visible but was **not** exposed as `role=alert` in the a11y dump. Residual a11y note — not a P0/P1; no UI change this certification cycle.
- Contrast: dark navy headings on white; gold primary actions; red-left error card.

## Evidence

- `desktop-shell-nav.png` / `mobile-shell-nav.png`
- `desktop-empty-error.png` / `mobile-empty-error.png`
- `desktop-00-fail-closed-accg.png` / `mobile-00-fail-closed-accg.png`
- `desktop-01-workspace.png` / `mobile-01-workspace.png`
- `desktop-02-accepted-pricing.png` / `mobile-02-accepted-pricing.png`
- `desktop-03-send-blocked.png` / `mobile-03-send-blocked.png`
- `desktop-04-engagement.png` / `mobile-04-engagement.png`
- `A11Y-NOTES.json`

Reproduce: `node apps/atlas-elite-os/scripts/premium-commercial-walkthrough.mjs` with Elite on :5180.

**PREMIUM STATUS:** PASS (this-train commercial workspace recert, desktop + mobile). Not an Atlas production recert of `75d0c59`.
