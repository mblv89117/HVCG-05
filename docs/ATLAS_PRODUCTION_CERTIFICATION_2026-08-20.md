# Atlas production certification — 2026-08-20

Honesty rule: this file records **Azure live state** and **what was actually inspected**. Repo tests are not live certification. Signed-out Elite is not Premium certification.

## Production

| Item | Value |
|------|--------|
| Branch | `cursor/atlas-hv-completion-52d1` |
| PR | https://github.com/mblv89117/HVCG-05/pull/6 (draft) |
| Hub app | `app-atlas-integration-hub` / `rg-atlas-prod` |
| Hub URL | `https://app-atlas-integration-hub.azurewebsites.net` |
| **Running Hub SHA** | `940a4849577ad5356da86850e2eccdbf3fe4e86b` |
| Hub Azure deployment ID | `9b406df7-984c-43c0-a4e1-52a291eb79b3` |
| Convert-stage fix commit | `ec71350` (ancestor of running SHA) |
| Prior healthy Hub | `b6a3c9c50747f3bc06b0de870d9906c4b9424152` / `3f62750c-2909-49d5-b25e-d1e119843e2e` |
| Elite SWA | `swa-atlas-elite-os-dev` / `rg-atlas-dev` production |
| Elite URL | `https://zealous-rock-0090c7e1e.7.azurestaticapps.net` |
| Elite asset | `/assets/index-DpGJPHPN.js` (SHA `940a4849577ad5356da86850e2eccdbf3fe4e86b`) |
| Rollback | `deployment/artifacts/hub-rollback/pre-940a484-from-b6a3c9c.zip` (gitignored). Pre-window zip `pre-3f794f7…-20260820-014626.zip` is `5b50ca2`. |
| Auth | `INTEGRATION_REQUIRE_AUTH=true`, `insecureDevAuth=false` |
| Synthetic Graph | `INTEGRATION_CAPITAL_ALLOW_SYNTHETIC_GRAPH=false` |
| Sites.Manage.All | absent |
| ACCG01 writes | none this window |

## Tests

- Hub unit/integration after convert-stage fix: **321 pass / 90 suites / 0 fail**

## SYN01 evidence

| Step | Result |
|------|--------|
| Website lead 21 | PASS (prior window) |
| Convert reuse SYN01 / opp 4 | PASS (prior window; company stayed Lead — defect, now fixed) |
| Won → ACTIVATION_REQUIRED | PASS |
| Governed activation request → review → authorize → verify | PASS |
| SYN01 now | **Active Client / verified** |
| Provisioned flags | all false |
| Idempotency | `client-activate\|SYN01\|4` |

## Convert-stage recert (Hub `940a484`)

| Step | Result |
|------|--------|
| Create SYNT67 at Lead | PASS |
| Website lead 22 | PASS |
| Convert reuse → Prospect | PASS (`opportunity` 5) |
| Replay stays Prospect | PASS |
| SYN01 remains Active Client | PASS |
| GET SYNT67 | 404 — expected; no `HVCG-Client-SYNT67` entitlement. Not a convert failure. |
| Home NEEDS_MANNY set/cleared on opp 5 | PASS (attention → OPEN) |
| Forged activation | `PM_ETAG_REQUIRED` |
| ACCG01 | GET only |

## Capital evidence

Governed operator workflow (not a client portal; not a bypass):

`PREPARED → CLIENT_CONFIRMATION_REQUIRED → CLIENT_CONFIRMED → APPROVED_FOR_SUBMISSION → recorded-only submit`

| Item | Value |
|------|--------|
| Opportunity | `cap-c5e13811-a5e1-4d62-bf6c-0c6b12d51e27` |
| Lender | `ln-catalog-bofa` |
| Package | `app-cap-c5e13811-a5e1-4d62-bf6c-0c6b12d51e27-ln-catalog-bofa` |
| Submission | `sub-a1384526-d064-4d42-9cc4-0d7dee93cdce` |
| Stage | Submitted |
| Package status | SUBMITTED_RECORDED_ONLY |
| External send | false (`sendAttempted=false`, `externalSubmit=false`) |
| Replay | `created=false`, same submission id |
| Interaction | SUBMISSION_RECORDED present |
| Skip PREPARED → APPROVED | 422 fail-closed |
| `*` create | 422 |

Certified on Hub `b6a3c9c` before the convert-stage patch. Attestation code was unchanged in `940a484`.

## Search (authenticated Hub API, 12 samples)

| Metric | Value |
|--------|--------|
| P50 | 14474 ms |
| P95 | 15622 ms |
| Typical | 14479 ms |
| SYN01 hits | 3 |
| Unknown token hits | 0 |
| Unauth | 401 |
| Authorization | PASS |

**P2 performance debt.** Typical ~14–16s vs ~3s target. Not materially unusable. Do not weaken RBAC.

## Premium screenshots

Signed-out production gate and Microsoft login page only. Authenticated Home / Leads / Opportunities / Activation / Capital / Search **were not rendered** because Azure CLI session does not transfer to the browser.

## Known P2 debt

- Search latency ~14–16s (Graph fan-out)
- Elite Premium authenticated visual QA pending successful MSAL browser login
- Hub vs Elite SHA rematch after Elite auth fix deploys
- 360 / Copilot / GCC remain undeployed by policy

## Auth incident (2026-08-20)

Operator saw **401 Unauthorized** at `identity.7.azurestaticapps.net/.auth/login/done` after Microsoft password/MFA.

Classification: **Azure Static Web Apps Easy Auth callback failure**, not Hub API and not AADSTS. This Free SWA has **zero** invited users (`az staticwebapp users list` = `[]`). Hosted "Sign in with Microsoft" was incorrectly routing to `/.auth/login/aad`.

Fix: Elite Sign-in uses **MSAL SPA** `49d20328-…` for Hub `access_as_user`. SWA `/.auth/me` remains hint-only. Do not use `/.auth/login/aad` for Premium certification.
