# Platform Independent Security Red Team Report

**Date:** 2026-08-20  
**Mode:** Adversarial source review + safe local verification  
**Findings branch:** `cursor/platform-red-team-866c`  
**Method:** Source review, candidate tip inspection, synthetic harness. No destructive production actions. No ACCG01 writes, marketing sends, lender submissions, money movement, or permission changes.

---

## 1. Overall risk

**RELEASE GATE: FAIL** — P0 > 0 and P1 > 0 across active candidates.

Cross-system trust is **contract-forward and auth-thin**. Several product trains correctly fail-closed for live outbound / live CRM provision, but identity, tenant isolation, and admin surfaces contain release-blocking defects.

| System | Risk | Gate |
|---|---|---|
| Atlas | High — staff opportunity IDOR + Plaid header auth | FAIL |
| Revenue OS | Design-only — no executable candidate | N/A (design risks noted) |
| GTM (360) | High latent — inbound trust weak; outbound mostly gated | FAIL |
| GCC | Critical — profile privilege escalation + unsigned QBO state | FAIL |
| Copilot | Critical — unauthenticated mutating APIs + shared store | FAIL |
| Integration | High — shared intake key, weak handoff authenticity | FAIL |

---

## 2. Branches inspected

Mission-named candidates (`cursor/atlas-revenue-engagement-os`, `cursor/360-gtm-agent-system`, `cursor/gcc-client-value-os`, `cursor/copilot-production-completion`, `cursor/platform-integration-contracts`, `cursor/atlas-search-performance-p2`) **were not present on remotes** at inspect time.

Mapped active remote truth:

| Role | Ref | SHA |
|---|---|---|
| Atlas Hub frozen baseline | `940a484` | `940a484` |
| Atlas Elite frozen baseline | `75d0c59` | `75d0c59` |
| Atlas candidate | `origin/cursor/atlas-hv-completion-52d1` | `2a5a605` |
| Atlas default tip | `origin/cursor/v1.1.0-intelligence-ai-ops` | `b75b19b` |
| Revenue OS design only | `origin/cursor/revenue-os-atlas-design` | `4c0ca6b` |
| GTM candidate | `origin/cursor/360-hv-completion-52d1` | `e585d0f` |
| GTM main | `origin/main` | `163122e` |
| GCC candidate | `origin/cursor/gcc-hv-completion-52d1` | `62f98cc` |
| GCC main | `origin/main` | `fb986cb` |
| Copilot candidate | `origin/cursor/copilot-hv-completion-52d1` | `51f1cbf` |
| Copilot main | `origin/main` | `c356cac` |

---

## 3. Counts

| Severity | Open |
|---|---|
| **P0** | **11** |
| **P1** | **18** |
| **P2** | **14** |
| Closed this run | 0 |

Full catalog: `docs/red-team/findings/FINDINGS_CATALOG_2026-08-20.md`

---

## 4. System summaries

### Atlas

**Certified behaviors that hold (do not regress):** Hub Bearer required by default; production fail-closed against insecure/dev auth; Capital ClientCode isolation without staff wildcard; Capital submissions recorded-only; `If-Match: *` rejected; synthetic Graph writes default off; Client Activation authorize is Manny OID; project ClientCode immutable on PATCH; website intake rejects Bearer substitution.

**Critical defects:**
- Staff short-circuit in `canSeeOpportunity` → cross-client opportunity read/write for any `HVCG Team Member` / `HVCG Owner` despite Entra client entitlements (present at Hub `940a484` and candidate `2a5a605`).
- Plaid API trusts `x-atlas-*` headers without JWT when auth is “required”.
- Free Fit owner decision lacks Owner/Manny gate (P1).

### Revenue OS

No executable `cursor/atlas-revenue-engagement-os` branch. Design tip `4c0ca6b` documents pricing exceptions, outbound BL-C1 fail-closed, finance ownership boundaries, and mock-only integrations. **No live pricing/discount/success-fee mutation surface to attack in code.** Residual design risks: early revenue recognition, legacy repricing, missing dual-control for commercial exceptions — track as design debt, not live P0.

### GTM (360)

**Holds:** Outbound publish/email/SMS/paid-ads default false; Guardian blocks outbound action types; agent tool denylist; CMO hard-blocks `change_offer` / pause disable; FORCE RLS; Open Dental live writes deferred.

**Critical / blocking:**
- CallRail signature accepts any configured office secret for any tracker (attribution / office confusion).
- Publisher execution gate fail-open when approval/Guardian IDs absent (latent until live; still dry-run trust defect).
- No suppression / unsubscribe / frequency-cap subsystem.
- Dual kill-switch (env vs DB) desync.
- Public inquiry form bypasses Atlas handoff contract.

### GCC

**Holds on candidate:** App-layer default-org invent removed for some routes; org mismatch → 403; demo pinned to Apex; Atlas handoff `autoProvisionAccess: false`; Stripe webhook signature verified; live Plaid sync disabled in production.

**Critical defects:**
- `gcc_profiles` RLS allows self-UPDATE of `role` / `organization_id` → platform_admin / cross-tenant.
- QuickBooks OAuth `state` is unsigned base64 `{organizationId}`; public callback upserts tokens with no session bind.
- Signup SQL trigger still COALESCE to `org-apex` / trusts user metadata.
- `sales` role can reach financial APIs/pages (RBAC mismatch).

### Copilot

**Holds:** `liveDispatch: false`; observation-only governance; connector write scopes denied; UAT sanitizers on start path.

**Critical defects:**
- No auth middleware on mutating/data APIs (assessments, documents, analysis, admin review/pricing, reports, atlas handoff).
- Process-wide shared `data/store.json` → cross-session disclosure/destruction.
- Unauthenticated admin approve / client `adminApproved` release bypass.
- Intake text promoted to `VERIFIED` fact class on feature branch.

### Integration / AI safety

- Atlas website lead ingest: shared intake key only (no body HMAC / sender identity).
- Idempotency keys accepted without prefix↔source binding.
- GCC Atlas activation handoff: platform_admin user session, not Atlas service attestation.
- Copilot / 360 handoffs stage-only today; enabling live dispatch without signing would forge CRM/activation fuel.
- External text often treated as data in capital docs scanners, but **not** on website lead / MRI / brand-brain retrieve paths — prompt-injection defenses incomplete for cross-system propagation.

---

## 5. P0 findings (release blockers)

| ID | System | Summary |
|---|---|---|
| ATLAS-RT-20260820-01 | Atlas | Staff opportunity IDOR (read all clients) |
| ATLAS-RT-20260820-02 | Atlas | Staff opportunity mutation of foreign clients |
| ATLAS-RT-20260820-03 | Atlas | Plaid header-spoofable auth (no JWT) |
| GTM-RT-20260820-01 | GTM | CallRail secret↔office unbound |
| GCC-RT-20260820-01 | GCC | Default/forced `org-apex` via signup trigger |
| GCC-RT-20260820-02 | GCC | Self-service profile role/org escalation |
| GCC-RT-20260820-03 | GCC | Unsigned QBO OAuth state → token bind |
| COPILOT-RT-20260820-01 | Copilot | Unauthenticated mutating/data APIs |
| COPILOT-RT-20260820-02 | Copilot | Global shared store cross-session |
| COPILOT-RT-20260820-03 | Copilot | Unauthenticated admin approve / pricing |
| XSYS-RT-20260820-01 | Integration | Website lead intake key without body signature |

---

## 6. Critical release blockers (owner trains)

1. **GCC:** Fix profile RLS column restrictions; sign+bind QBO OAuth state; remove Apex COALESCE in Auth trigger.  
2. **Copilot:** Deny-by-default auth middleware; per-session stores; server-only admin approval.  
3. **Atlas:** Remove staff short-circuit on opportunity authz; JWT-enforce Plaid like Hub.  
4. **GTM:** Bind CallRail secrets to office; fail-closed publisher approval/Guardian presence.  
5. **Integration:** Per-sender HMAC on Atlas intake; enforce idempotency prefix binding before any liveDispatch.

Do **not** silently fix these on product branches from this train. Owning engineering trains repair; red-team only documents + isolated harnesses.

---

## 7. Regression status

| Area | Status |
|---|---|
| Atlas Capital recorded-only / ETag / entitlement on Capital | Intact at `2a5a605` |
| Atlas opportunity staff bypass | **Open since Hub `940a484`** (not a tip regression; still blocking) |
| GTM outbound flags fail-closed | Intact |
| GCC candidate org-default removal (app routes) | Partial improve vs main; DB trigger still open |
| Copilot liveDispatch off | Intact; auth gap dominates |
| Cross-system live provision | Still observation-only / stage-only |

Isolated harness on this branch: `docs/red-team/harness/opportunity-entitlement-expected.md` + `scripts/red-team/check-opportunity-staff-bypass.mjs`

---

## 8. New / closed

- **New findings:** all IDs dated `20260820` (this run).  
- **Closed findings:** none.  
- **Prior red-team branch:** did not exist on remotes; created this run.

---

## 9. Safety attestation

Performed: source review, candidate SHA inventory, local file reads, isolated documentation harness.  
Not performed: ACCG01 writes, real marketing, lender submissions, money movement, production permission changes, secret exposure.
