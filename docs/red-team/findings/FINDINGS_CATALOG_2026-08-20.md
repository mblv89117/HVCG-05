# Findings Catalog — 2026-08-20

Status legend: `open` | `closed` | `fixed` | `partial` | `requires-integration-test` | `accepted-risk`
Severity: P0 / P1 / P2 (not inflated)

**Tip revalidation 0428Z:** older SHAs (superseded for product tips).
**Directive 10 revalidation:** `docs/red-team/REVALIDATION_DIRECTIVE_10_2026-08-20.md` against GTM `5bd8204`, GCC `b02c132`, Copilot `aacc09c`, Integration `773b510`, Atlas Hub `940a484`.

**Post-Directive-10 counts:** P0 open=6 · P0 closed this pass=4 · P1 closed this pass include GTM-02 + COPILOT-11 · Gate FAIL for new deploys

**CURRENT RELEASE STATE:** D33 public-marker Hub SHA `64b56dc` — **SHA_GATE=PASS**; LIVE_SECURITY_CERTIFIED=**NO**; LIVE_P0=5 INCONCLUSIVE

**CURRENT OPEN (authoritative dual-surface):**
- LIVE Hub (D33 @ `64b56dc`): ATLAS-01/02/03 + XSYS-01/02 all **INCONCLUSIVE** (fail-closed PASS; full entitlement/HMAC/Plaid reproducers blocked). **LIVE_SECURITY_CERTIFIED=NO**. **LIVE_P0=5**.
- D32 inherit FAIL not replayed. Candidate lineage FIXED_REVALIDATED remains candidate-only.

---

## ATLAS

### ATLAS-RT-20260820-01
- **system:** Atlas
- **branch/SHA:** LIVE Hub public marker `64b56dc` (D33 SHA_GATE=PASS); prior claimed `9e5d10a` lineage
- **severity:** P0
- **evidence:** `canSeeOpportunity` uses entitlement intersection only (staff short-circuit absent @ `64b56dc`). D33 live: unauth/forged JWT → 401; staff entitlement isolation not live-executed (no RT staff JWT).
- **reproduction:** Authenticate as Team Member entitled only to `ACCG01`. `GET /api/pm/opportunities` and `GET /api/pm/opportunities/{foreignId}` return other clients' opportunities (expect 404).
- **impact:** Cross-client CRM opportunity disclosure (titles, notes, stages, amounts).
- **recommended remediation:** Remove staff short-circuit; require `entitledClientCodes(principal).includes(clientCode)` for all principals (explicit Manny tenant-wide exception only if product-approved).
- **regression test:** Staff entitled to A cannot list/get B opportunities.
- **status:** LIVE **INCONCLUSIVE** (D33); CANDIDATE FIXED_REVALIDATED lineage

### ATLAS-RT-20260820-02
- **system:** Atlas
- **branch/SHA:** live `64b56dc`
- **severity:** P0
- **evidence:** D33: unauth/forged PATCH → 401; authorizeOpportunity → canSeeOpportunity (no staff all-see). Foreign Won not live-proven.
- **reproduction:** With 01 setup, `PATCH /api/pm/opportunities/{foreignId}` + `If-Match` + `{ "stage": "Won" }` succeeds.
- **impact:** Pipeline integrity failure; forged Won; activation queue pollution.
- **recommended remediation:** Same ClientCode gate before any field write; optionally restrict Won to Owner/Manny.
- **regression test:** Staff A cannot patch client B opportunity → 404/403.
- **status:** LIVE **INCONCLUSIVE** (D33); CANDIDATE FIXED_REVALIDATED lineage

### ATLAS-RT-20260820-03
- **system:** Atlas
- **branch/SHA:** live Hub `64b56dc` / plaid app source
- **severity:** P0 (if Plaid API network-reachable)
- **evidence:** D33: Hub `/api/plaid/*` → 405; plaid source still header-oriented without jwtVerify in inspect. No separate Plaid URL in RT env.
- **reproduction:** With `PLAID_REQUIRE_AUTH=true`, forge headers without Bearer → today accepted.
- **impact:** Bank connection/balance/identity isolation collapse.
- **recommended remediation:** Reuse Hub JWT + server-side group entitlements; ignore client headers for authz.
- **regression test:** Missing Bearer → 401; forged headers + invalid JWT → 401.
- **status:** LIVE **INCONCLUSIVE** (D33); CANDIDATE FIXED_REVALIDATED lineage

### ATLAS-RT-20260820-04
- **system:** Atlas · **severity:** P1 · **branch/SHA:** `2a5a605`
- **evidence:** `freefit.owner_decision` skips client context in `atlas_security.py`; `record_owner_decision` does not require Owner/Manny.
- **reproduction:** Team Member `POST /api/ba/freefit/owner-decision` records as owner.
- **impact:** Commercial qualification forged by non-owners.
- **recommended remediation:** Require owner_support_scope / HVCG Owner / Manny OID.
- **regression test:** Non-owner → 403.
- **status:** open

### ATLAS-RT-20260820-05
- **system:** Atlas · **severity:** P2 · **branch/SHA:** `2a5a605`
- **evidence:** `tokenHasRequiredHubScope` accepts empty `scp` when `oid` present.
- **impact:** Scope confusion if Hub-aud tokens issued without delegated scope.
- **recommended remediation:** Require explicit `access_as_user` in production.
- **regression test:** Empty scp → 401 when hardening flag on.
- **status:** open

### ATLAS-RT-20260820-06
- **system:** Atlas · **severity:** P2 · **branch/SHA:** `2a5a605`
- **evidence:** `INTEGRATION_CAPITAL_ALLOW_SYNTHETIC_GRAPH` not hard-rejected in production.
- **impact:** Synthetic Graph writes into live SharePoint if mis-set.
- **recommended remediation:** Throw UnsafeHubConfigurationError when production && flag true.
- **regression test:** Production + flag → boot fail.
- **status:** open

### ATLAS-RT-20260820-07
- **system:** Atlas · **severity:** P2 · **branch/SHA:** `2a5a605`
- **evidence:** Historical Active Client path accepts any non-empty `provenanceSource` for Manny.
- **impact:** Activation control-plane bypass with weak provenance.
- **recommended remediation:** Allowlist provenance; dual control.
- **regression test:** Non-allowlisted provenance → 400.
- **status:** open

### ATLAS-RT-20260820-08
- **system:** Atlas · **severity:** P2 · **branch/SHA:** `2a5a605`
- **evidence:** Capital `fee` checks clientCode entitlement but not that `capitalOpportunityId` belongs to that client.
- **impact:** Cross-client fee/event linkage pollution.
- **recommended remediation:** `requireOpp` + assert opp.clientCode === clientCode.
- **regression test:** Mismatched fee opp id → 404/422.
- **status:** open

### ATLAS-RT-20260820-09
- **system:** Atlas · **severity:** P2 · **branch/SHA:** `2a5a605`
- **evidence:** Manny `authorize` can skip request/review (auto-create record).
- **impact:** Governance bypass (Manny-only; entitlements still not provisioned).
- **recommended remediation:** Require `status==='review'` before authorize.
- **regression test:** authorize without review → 400.
- **status:** open

### ATLAS-RT-20260820-10
- **system:** Atlas · **severity:** P2 · **branch/SHA:** `2a5a605`
- **evidence:** Unauthenticated `/health` returns `authRequired`, `insecureDevAuth`, backend modes.
- **impact:** Recon aid for auth misconfig.
- **recommended remediation:** Strip security flags from public health.
- **regression test:** Public health omits insecureDevAuth.
- **status:** open

---

## REVENUE OS

### REVOS-RT-20260820-01
- **system:** Revenue OS
- **branch/SHA:** `cursor/revenue-os-atlas-design` / `4c0ca6b`
- **severity:** P2 (design / not live)
- **evidence:** Design docs only; no executable pricing/discount/success-fee APIs on mission candidate (branch absent). Risks noted: legacy repricing, early recognition, missing dual-control for exceptions (`ASSUMPTIONS_RISKS_DEBT.md`).
- **reproduction:** N/A — no runtime surface.
- **impact:** Future implementation could ship without commercial dual-control if design risks ignored.
- **recommended remediation:** Before coding: enforce floor pricing, success-fee immutability after approve, referral payout RBAC, proposal ClientCode isolation, approval dual-control in acceptance tests.
- **regression test:** Design acceptance matrix for discount-below-floor / approval-bypass must fail closed.
- **status:** open

---

## GTM (360)

### GTM-RT-20260820-01
- **system:** GTM · **severity:** P0 · **branch/SHA:** `cursor/360-hv-completion-52d1` / `e585d0f`
- **evidence:** `verifyCallRailSignature` accepts HMAC from any of `CALLRAIL_WEBHOOK_SECRET` / `_YUCCA` / `_DHS` for any tracker; tenant from attacker-chosen tracker_id.
- **reproduction:** Sign body with Yucca secret + DHS tracker → accepted with DHS office attribution.
- **impact:** Fabricated call events, wrong-office attribution, poisoned lead pipeline.
- **recommended remediation:** Bind secret↔office; reject cross-office secret; default webhook disabled.
- **regression test:** Yucca secret + DHS tracker → 401.
- **status:** open

### GTM-RT-20260820-02
- **system:** GTM · **severity:** P1 · **branch/SHA:** `e585d0f`
- **evidence:** `runExecutionGate` only validates approval when `approval_id` present; missing Guardian ignored; only `approval_invalidated` blocked when approval absent.
- **impact:** Unapproved content can pass dry-run; same gate becomes production control when live flags flip.
- **recommended remediation:** Fail closed: require approved row + non-block Guardian.
- **regression test:** missing approval/guardian → gate fail.
- **status:** open

### GTM-RT-20260820-03
- **system:** GTM · **severity:** P1 · **branch/SHA:** `e585d0f`
- **evidence:** Dual kill-switch: DB pause vs `EMERGENCY_PAUSE_GLOBAL` env; Atlas handoff uses env only.
- **impact:** Operators can believe pause is on while gates disagree.
- **recommended remediation:** Single SoT; alert on mismatch.
- **regression test:** env/DB desync → all outbound blocked or alert.
- **status:** fixed @ `bd72003` (`evaluateUnifiedEmergencyPause` fail-closed)

### GTM-RT-20260820-04
- **system:** GTM · **severity:** P1 · **branch/SHA:** `e585d0f`
- **evidence:** Public `InquiryForm` posts freeform JSON to HVCG leads API; does not use `360-atlas-lead.v1` contract.
- **impact:** Leads enter without observation-only / idempotency governance; attribution spoofable.
- **recommended remediation:** Emit contract-valid payload; server verify.
- **regression test:** Missing governance literals rejected.
- **status:** fixed @ `bd72003` (InquiryForm → receive-inquiry camelCase governance)

### GTM-RT-20260820-05
- **system:** GTM · **severity:** P1 · **branch/SHA:** `e585d0f`
- **evidence:** Booking falls back unknown clinic → `yucca_valley`; schedule hard-codes `leadSource: 'Google Ads'`.
- **impact:** Wrong-office booking attempts; attribution fraud when live create enabled.
- **recommended remediation:** Reject unknown clinic; bind clinic to call_event.location_id.
- **regression test:** Unknown clinic → 400.
- **status:** open

### GTM-RT-20260820-06
- **system:** GTM · **severity:** P1 · **branch/SHA:** `e585d0f`
- **evidence:** No unsubscribe / suppression / frequency-cap subsystem; only flags gate send.
- **impact:** TCPA/CAN-SPAM exposure once outbound ships.
- **recommended remediation:** Mandatory suppression + frequency checks fail-closed.
- **regression test:** Unsubscribed → block.
- **status:** open

### GTM-RT-20260820-07
- **system:** GTM · **severity:** P1 · **branch/SHA:** `e585d0f`
- **evidence:** Shallow pattern-based injection filters; several Guardian cases non-block.
- **impact:** Injected instructions can influence drafts (outbound tools still denied).
- **recommended remediation:** Treat external text as data; expand detectors; default block injection class.
- **regression test:** Injection corpus must block.
- **status:** open

### GTM-RT-20260820-08
- **system:** GTM · **severity:** P1 · **branch/SHA:** `e585d0f`
- **evidence:** `startAgentRun` sets `app.is_platform_admin=true`; API run requires only `AGENT_READ`.
- **impact:** Privilege escalation for agent execution; possible cross-tenant agent selection.
- **recommended remediation:** Never elevate to platform admin for tenant runs; require AGENT_WRITE.
- **regression test:** Non-write role → 403 on run.
- **status:** open

### GTM-RT-20260820-09
- **system:** GTM · **severity:** P1 · **branch/SHA:** `e585d0f`
- **evidence:** Brand Brain retrieve accepts client `allowRestricted: true` with only READ perm.
- **impact:** Restricted facts exposed to any reader.
- **recommended remediation:** Ignore client flag; elevated permission required.
- **regression test:** allowRestricted without elevated perm → deny.
- **status:** open

### GTM-RT-20260820-10
- **system:** GTM · **severity:** P1 · **branch/SHA:** `e585d0f`
- **evidence:** `callrailWebhookEnabled` / `leadIntelQueueEnabled` default true.
- **impact:** Inbound PHI-adjacent processing active by default.
- **recommended remediation:** Default false.
- **regression test:** Unset env → both false.
- **status:** open

### GTM-RT-20260820-11..16 (P2)
- **11** JWT caches memberships indefinitely — stale privilege after revoke.
- **12** Dev header auth is sole actor path — P0 if mis-deployed non-prod-like.
- **13** Pricing trust heuristic; Guardian lacks APPROVED_OFFER bind.
- **14** Experiment table writable at DB without status workflow.
- **15** Atlas stager in-memory; governance not cryptographically bound.
- **16** Fact verify without source grounding → human-approved lies become Brand Brain truth.
- **status:** open

---

## GCC

### GCC-RT-20260820-01
- **system:** GCC · **severity:** P0 · **branch/SHA:** `62f98cc` / `fb986cb`
- **evidence:** `supabase/setup.sql` `gcc_handle_new_user` COALESCE to `org-apex`; trusts `raw_user_meta_data.role` / `organization_id`. Feature removed some app defaults but not trigger.
- **reproduction:** Auth signup → Apex tenant / attacker metadata role.
- **impact:** Cross-org financial exposure via demo/client tenant attachment.
- **recommended remediation:** Trigger inserts NULL org; invite-only; never COALESCE to Apex.
- **regression test:** Signup never assigns org-apex.
- **status:** FIXED_REVALIDATED @ `8d757cf` (D25; prior D24 @ `32e923c`, D12 @ `41a59b8`)

### GCC-RT-20260820-02
- **system:** GCC · **severity:** P0 · **branch/SHA:** `62f98cc`
- **evidence:** Policy `"gcc profile update"` `USING (id = auth.uid())` with no column WITH CHECK — clients can UPDATE `role` / `organization_id`.
- **reproduction:** Authenticated user PATCH own profile to `platform_admin` + foreign org.
- **impact:** Platform admin + cross-tenant access.
- **recommended remediation:** Restrict updatable columns; trigger reject role/org mutations from client.
- **regression test:** Client cannot UPDATE role/organization_id.
- **status:** FIXED_REVALIDATED @ `8d757cf` (D25)

### GCC-RT-20260820-03
- **system:** GCC · **severity:** P0 · **branch/SHA:** `62f98cc`
- **evidence:** Connect encodes `{organizationId}` base64url unsigned; public callback parses state and upserts tokens with admin client, no session check.
- **reproduction:** Complete Intuit OAuth with forged state for victim org → victim connection overwritten.
- **impact:** Financial integration takeover / cross-tenant QBO binding.
- **recommended remediation:** Signed expiring state tied to session; verify auth on callback.
- **regression test:** Tampered state rejected.
- **status:** FIXED_REVALIDATED @ `8d757cf` (D25)

### GCC-RT-20260820-04
- **system:** GCC · **severity:** P0 on main / mitigated on feature routes · **branch/SHA:** `fb986cb` (main)
- **evidence:** Main `/api/dashboard` and `/api/tenant` default missing organizationId to `org-apex`.
- **impact:** Demo/client financial leakage.
- **recommended remediation:** Keep feature fail-closed; never ship main default.
- **regression test:** Missing organizationId ≠ Apex.
- **status:** open (main) — not in D25 `test:security` scope on feature tip

### GCC-RT-20260820-05
- **system:** GCC · **severity:** P1 · **branch/SHA:** `62f98cc`
- **evidence:** Browser-supplied organizationId is authorization input; data layer uses service role.
- **impact:** Classic IDOR if any handler omits requireApiAccess.
- **recommended remediation:** Derive tenant from server auth only.
- **regression test:** Mismatched org → 403 on all tenant routes.
- **status:** FIXED_REVALIDATED @ `8d757cf` (D25)

### GCC-RT-20260820-06
- **system:** GCC · **severity:** P1 · **branch/SHA:** `62f98cc`
- **evidence:** `sales` lacks financials:read but `/financials` and `/api/tenant` only require auth+org; export skips reports:export.
- **impact:** Role model advisory for financial data.
- **recommended remediation:** Enforce permissions on APIs and layouts.
- **regression test:** sales → 403 on financial payload/export.
- **status:** FIXED_REVALIDATED @ `8d757cf` (D25)

### GCC-RT-20260820-07
- **system:** GCC · **severity:** P1 · **branch/SHA:** `62f98cc`
- **evidence:** Atlas activation handoff accepts platform_admin body without HMAC/mTLS.
- **impact:** Poisoned tenant-mapping queue (autoProvision still false).
- **recommended remediation:** Atlas-issued signed activation token.
- **regression test:** Unsigned body rejected for machine path.
- **status:** FIXED_REVALIDATED @ `8d757cf` (D25)

### GCC-RT-20260820-08..10 (P1/P2)
- **08** P1 Value-signal/KPI write weak under demo; financial truth via admin bypass.
- **09** P2 API middleware does not auth; relies on handlers; metadata role fallback.
- **10** P2 Production demo mode cookie when ALLOW_DEMO_MODE=true.
- **status:** open

---

## COPILOT

### COPILOT-RT-20260820-01
- **system:** Copilot · **severity:** P1 residual (was P0 on `51f1cbf`) · **branch/SHA:** `7e63a6d` (revalidated)
- **evidence:** Tip adds middleware + route session guards. Residual: `PUBLIC_API_PREFIXES` includes `/api/assessments`; unauth `start` bootstraps session (see COPILOT-RT-11).
- **reproduction:** Unauth GET `/api/admin/review` → 401 (mitigated). Unauth POST `/api/assessments` `{action:"start"}` still succeeds.
- **impact:** Blanket unauth API compromise mitigated; bootstrap path remains intentional UAT hole.
- **recommended remediation:** Narrow public prefix to explicit start-only route; rate-limit; never wipe global store.
- **regression test:** Unauthenticated mutating routes except controlled start → 401.
- **status:** FIXED_REVALIDATED @ `fe3db75` (D27; prior D26 @ `2f02702`)

### COPILOT-RT-20260820-02
- **system:** Copilot · **severity:** P0 · **branch/SHA:** `7e63a6d` (revalidated; still open)
- **evidence:** Single process-wide `data/store.json`; `start` still `writeStore` replaces workspace. `requireTenantContext` used on many routes but shared file remains.
- **reproduction:** User A starts UAT; User B `start` → wipes A.
- **impact:** Cross-session disclosure/destruction.
- **recommended remediation:** Per-user durable store; enforce assertTenant at persistence layer.
- **regression test:** Two sessions isolated.
- **status:** FIXED_REVALIDATED @ `fe3db75` (D27; prior D26 @ `2f02702`)

### COPILOT-RT-20260820-03
- **system:** Copilot · **severity:** P0 → **closed on tip** · **branch/SHA:** `7e63a6d`
- **evidence:** Admin review/pricing require `readSessionFromRequest` + `requireRole([...admin/consultant])`.
- **reproduction:** Anonymous approve → 401.
- **impact:** Original unauth admin bypass remediated on production-completion tip.
- **recommended remediation:** Keep; add Entra before production client data.
- **regression test:** Unauthenticated admin → 401 (passing on tip).
- **status:** FIXED_REVALIDATED @ `fe3db75` (D27)

### COPILOT-RT-20260820-11
- **system:** Copilot · **severity:** P1 · **branch/SHA:** `7e63a6d`
- **evidence:** Middleware public prefix `/api/assessments` + unauth `start` + shared store wipe (CC-008).
- **reproduction:** `curl -X POST /api/assessments -d '{"action":"start"}'` without cookie → 200 + Set-Cookie; replaces store.
- **impact:** Amplifies RT-02; forged campaign attribution on start body.
- **recommended remediation:** Dedicated `/api/assessments/start` with abuse controls; no global wipe.
- **regression test:** Concurrent starts do not destroy other session data.
- **status:** FIXED_REVALIDATED @ `fe3db75` (D27; assessments + enrichment not public; prior D26 @ `2f02702`)

### COPILOT-RT-20260820-04..10
- **04** P1 Assessment ID spoofing / active-resolution confusion.
- **05** P1 Protected-result/report leakage via unauth PDF/admin/atlas GETs.
- **06** P1 Document/interview injection into shared store.
- **07** P1 Prompt-injection posture incomplete (no sanitize boundary).
- **08** P1 Handoff replay + forged campaign context (liveDispatch false mitigates).
- **09** P1 Intake inference promoted to VERIFIED (`classifyFactClass`).
- **10** P2 Unsafe external action surface stubbed (residual).
- **status:** open

---


### REVOS-ELITE-RT-20260820-01
- **system:** Revenue OS Elite UI
- **severity:** P1
- **branch/SHA:** `cursor/atlas-revenue-engagement-os` / `8cffe34`
- **evidence:** `loadCommercialReadModel(opportunityId)` returns `{...ACME_COMMERCIAL_READ_MODEL, opportunityId}` — clientCode/pricing stay ACME01 while opportunity id can be any deep-link value (e.g. from OpportunityDetailPage `/revenue?opportunity=`).
- **impact:** Operators can view ACME synthetic economics under a foreign opportunity id; commercial context not opportunity-bound.
- **recommended remediation:** Fail closed unless opportunity maps to matching ClientCode commercial context; never render ACME prices for non-ACME ids.
- **regression test:** `loadCommercialReadModel('opp-accg-expansion-001').clientCode` must not be `ACME01` (or must error).
- **status:** fixed @ `fc92f74` (fail-closed LOADED_COMMERCIAL_CONTEXTS + ClientCode bind)

## CROSS-SYSTEM

### XSYS-RT-20260820-01
- **system:** Integration · **severity:** P0 · **branch/SHA:** LIVE Hub post-OD-005 / CANDIDATE `9e5d10a`
- **evidence:** LIVE D30: unauth/forged-key → 401; HMAC invalid-signature path not live-proven (no intake key). CANDIDATE: HMAC+key-id+timestamp in `intakeAuth.ts` / `http.ts`.
- **impact:** Key holder forges leads/attribution into SharePoint CRM if HMAC not live.
- **recommended remediation:** Confirm live signature-invalid 401 with intake key.
- **regression test:** Valid key + invalid signature → 401.
- **status:** LIVE **INCONCLUSIVE** (D31 SHA gate abort); prior D30 PARTIAL; CANDIDATE FIXED_REVALIDATED @ `9e5d10a`

### XSYS-RT-20260820-02
- **system:** Integration · **severity:** P0 · **branch/SHA:** LIVE Hub post-OD-005 / CANDIDATE `9e5d10a`
- **evidence:** LIVE D30: idempotency gate not reached without intake auth. CANDIDATE: `assertIdempotencyKeyBoundToSource` → 409.
- **impact:** Cross-system lead overwrite via colliding keys if unbound key still accepted.
- **recommended remediation:** Live website+`eva|` → 409 probe with intake credentials.
- **regression test:** Website type + `eva|` key → 409.
- **status:** LIVE **INCONCLUSIVE** (D31 SHA gate abort); prior D30 NEEDS_RETEST; CANDIDATE FIXED_REVALIDATED @ `9e5d10a`

### XSYS-RT-20260820-03..12
- **03** P1 GCC handoff without Atlas attestation.
- **04** P1 Schema/version confusion; Atlas receiver loosest (`additionalProperties: true`).
- **05** P1 ID confusion assessmentId≡leadId; optional ClientCode claim.
- **06** P1 Capital Copilot handoff missing idempotency.
- **07** P1 EVA capital attribution dual-write drop.
- **08** P2 Attribution manipulation on lead replay.
- **09** P2 Client vs marketing tenant confusion (docs only).
- **10** P2 Prompt injection across handoffs (lead/MRI unscanned).
- **11** P2 Unsafe autonomous actions conditional on liveDispatch.
- **12** P2 TOCTOU on filesystem/list dual writers.
- **status:** open

---

## Severity rollup

| Sev | IDs |
|---|---|
| P0 | ATLAS-01,02,03 · GTM-01 · GCC-01,02,03 · COPILOT-01,02,03 · XSYS-01,02 (+ GCC-04 on main) |
| P1 | ATLAS-04 · GTM-02..10 · GCC-05..08 · COPILOT-04..09 · XSYS-03..07 |
| P2 | remaining |

**Release gate:** No candidate is production-ready while P0>0 or P1>0.

---

## Directive 10 status appendix (authoritative for tip classification)

| ID | Status @ Directive 10 |
|----|------------------------|
| ATLAS-RT-20260820-01 | OPEN @ Hub `940a484` |
| ATLAS-RT-20260820-02 | OPEN @ Hub `940a484` |
| ATLAS-RT-20260820-03 | OPEN @ Hub/`2a5a605` |
| GTM-RT-20260820-01 | FIXED @ `5bd8204` |
| GTM-RT-20260820-02 | FIXED @ `5bd8204` |
| GTM-RT-20260820-03 | PARTIALLY FIXED @ `5bd8204` |
| GTM-RT-20260820-04 | REQUIRES INTEGRATION TEST @ `5bd8204` |
| GCC-RT-20260820-01 | FIXED @ `b02c132` |
| GCC-RT-20260820-02 | FIXED @ `b02c132` |
| GCC-RT-20260820-03 | FIXED @ `b02c132` |
| GCC-RT-20260820-05 | PARTIALLY FIXED @ `b02c132` |
| GCC-RT-20260820-06 | OPEN @ `b02c132` |
| GCC-RT-20260820-07 | OPEN @ `b02c132` |
| COPILOT-RT-20260820-01 | FIXED @ `aacc09c` |
| COPILOT-RT-20260820-02 | OPEN @ `aacc09c` |
| COPILOT-RT-20260820-03 | CLOSED (prior) |
| COPILOT-RT-20260820-11 | FIXED @ `aacc09c` |
| XSYS-RT-20260820-01 | OPEN (Hub runtime; Integration docs-only) |
| XSYS-RT-20260820-02 | OPEN @ Hub `940a484` |

---

## Directive 12 status appendix (GCC + Copilot tip move)

| ID | Status @ Directive 12 |
|----|------------------------|
| GCC-RT-20260820-05 | FIXED @ `41a59b8` |
| GCC-RT-20260820-06 | FIXED @ `41a59b8` |
| GCC-RT-20260820-07 | FIXED @ `41a59b8` |
| COPILOT-RT-20260820-02 | FIXED @ `19a200e` |
| ATLAS-RT-20260820-01/02/03 | OPEN (Hub unchanged; not re-probed) |
| XSYS-RT-20260820-01/02 | OPEN (Hub unchanged; not re-probed) |
| GTM-RT-20260820-03/04 | OPEN (GTM tip unchanged; not re-probed) |


## Directive 15 status appendix (authoritative tip classification)

| ID | Status @ Directive 15 |
|----|------------------------|
| ATLAS-RT-20260820-01 | FIXED on OD-005 `bb7edae`; OPEN on Hub `940a484` |
| ATLAS-RT-20260820-02 | FIXED on OD-005 `bb7edae`; OPEN on Hub `940a484` |
| ATLAS-RT-20260820-03 | FIXED on OD-005 `bb7edae`; OPEN on Hub/`2a5a605` tip lineage |
| GTM-RT-20260820-03 | FIXED @ `bd72003` (unified pause SoT fail-closed) |
| GTM-RT-20260820-04 | FIXED @ `bd72003` (InquiryForm→receive camelCase governance) |
| XSYS-RT-20260820-01 | OPEN on Hub + OD-005 (intake key only; no body HMAC) |
| XSYS-RT-20260820-02 | OPEN on Hub + OD-005 (unbound `fullPayload.idempotencyKey`) |
| Revenue OS `9c9c331` | First-pass: no new P0/P1 |
| GCC / Copilot / Integration / Hub / Elite | Not retested (D12/D10 cover) |


## Directive 16 status appendix (GTM tip move)

| ID | Status @ Directive 16 |
|----|------------------------|
| GTM-RT-20260820-03 | FIXED reconfirmed @ `f63b8eb` |
| GTM-RT-20260820-04 | FIXED reconfirmed @ `f63b8eb` |
| GTM Revenue OS consumer / SYN-GTM | No new P0/P1 @ `f63b8eb` (28/28 SYN PASS) |
| ATLAS-RT-20260820-01/02/03 | OPEN on Hub (not retested; OD-005 candidate still FIXED per D15) |
| XSYS-RT-20260820-01/02 | OPEN (not retested) |
| Revenue OS engine `9c9c331` | Not retested (identical SHA) |


## Directive 18 status appendix (Revenue Elite UI)

| ID | Status @ Directive 18 |
|----|------------------------|
| REVOS-ELITE-RT-20260820-01 | OPEN P1 @ `8cffe34` (opportunity deep-link commercial context) |
| Elite /revenue gates (autoSend/liveDispatch/operator accept/FinanceRoute) | PASS patterns @ `8cffe34` |
| ACCG01 rewrite / SharePoint thaw | Not observed in tip delta |
| ATLAS-RT-01/02/03 · XSYS-01/02 | OPEN on Hub (not retested) |
| GTM `f63b8eb` / engine `9c9c331` | Not retested |


## Directive 19 status appendix

| ID | Status @ Directive 19 |
|----|------------------------|
| GTM-RT-20260820-03/04 | FIXED reconfirmed @ `7b70411` |
| REVOS-ELITE-RT-20260820-01 | **FIXED** @ `fc92f74` |
| ATLAS-RT-01/02/03 · XSYS-01/02 | OPEN on Hub (not retested) |
| New P0/P1 this cycle | 0 / 0 |


## Directive 20 status appendix (Revenue Dev SharePoint adapters)

| ID / control | Status @ Directive 20 |
|----|------------------------|
| HVCG_Proposals / HVCG_Engagements adapters @ `e9b3be8` | PASS — ClientCode-scoped, fail-closed unmatched opp, ACCG01 refuse, fixture-only, no schema thaw |
| REVOS-ELITE-RT-20260820-01 | FIXED reconfirmed @ `e9b3be8` |
| New P0/P1 | 0 / 0 |
| ATLAS-RT-01/02/03 · XSYS-01/02 | OPEN on Hub (not retested) |


## Directive 21 status appendix (complete OD-005 @ 0bbfd87)

| ID | LIVE Hub `940a484` | CANDIDATE `0bbfd87` |
|----|--------------------|---------------------|
| ATLAS-RT-20260820-01 | OPEN | FIXED_REVALIDATED |
| ATLAS-RT-20260820-02 | OPEN | FIXED_REVALIDATED |
| ATLAS-RT-20260820-03 | OPEN | FIXED_REVALIDATED |
| XSYS-RT-20260820-01 | OPEN | FIXED_REVALIDATED |
| XSYS-RT-20260820-02 | OPEN | FIXED_REVALIDATED |
| Incomplete tip `bb7edae` | — | STALE_SUPERSEDED (XSYS incomplete) |
| Candidate P0/P1 | — | **0 / 0** |
| Live production P0 | **5** | — |


## Directive 22 status appendix (certified workflow regression + rollback)

| Gate / ID | Status @ Directive 22 |
|-----------|------------------------|
| ATLAS-RT-01/02/03 · XSYS-01/02 | Dual-surface **unchanged** (D21): LIVE OPEN×5 / CANDIDATE FIXED_REVALIDATED — findings probes not re-run as sole D22 evidence |
| Certified workflow regression @ `0bbfd87` | **PARTIAL** — Hub API 322 pass / 1 fail (`hub-pm-sharepoint` convert→GET opportunity 404 vs staff short-circuit on Hub `940a484`) |
| Workflows a–c, e–k | **PASS** (executable suites; artifacts `directive22_*.txt`) |
| Workflow d Lead→Prospect→Opportunity | **PARTIAL** (convert 200; post-convert GET 404) |
| ROLLBACK_READY | **YES** (script EXISTS; prior Hub SHA `b6a3c9c` RECORDED; zip MISSING/gitignored; **not executed**) |
| OWNER_GATE_PREREQS | `CANDIDATE_P0=0 CANDIDATE_P1=0 RED_TEAM=PASS REGRESSION=PARTIAL ROLLBACK_READY=YES` |
| Live production P0 | **5** (unchanged) |
| Report | `docs/red-team/CERTIFIED_WORKFLOW_REGRESSION_0bbfd87.md` |


## Directive 23 status appendix (OD-005 tip move `9e5d10a` — convert residual)

| Gate / ID | Status @ Directive 23 |
|-----------|------------------------|
| Exact candidate SHA | `9e5d10a20639bbeb659fbacd6362cd9f13adb08b` |
| hub-pm-sharepoint convert+GET residual | **PASS** — 34/34 exit 0; entitled GET 200; staff GET 404; `entitlementProvisioned=false`; NORTH01 |
| Hub API aggregate | **PASS** — **323 pass / 0 fail** exit 0 (D22 was 322/1 on `0bbfd87`) |
| Staff-bypass static check | **PASS** — exit 0; `staffShortCircuitPresent=false` |
| Certified workflow REGRESSION | **PASS** |
| ROLLBACK_READY | **YES** (script EXISTS; prior Hub `b6a3c9c` RECORDED; zip MISSING/gitignored; not executed) |
| ATLAS-RT-01/02/03 · XSYS-01/02 | Dual-surface **unchanged**: LIVE OPEN×5 / CANDIDATE FIXED_REVALIDATED (D21 cite; findings probes not sole D23 evidence; D23 commands did not reopen) |
| OWNER_GATE_PREREQS | `CANDIDATE_P0=0 CANDIDATE_P1=0 RED_TEAM=PASS REGRESSION=PASS ROLLBACK_READY=YES` |
| AUTHORIZE PRODUCTION SECURITY PATCH | **NO** (this worker) |
| Live production P0 | **5** (unchanged) |
| Report | `docs/red-team/CERTIFIED_WORKFLOW_REGRESSION_9e5d10a.md` |


## Directive 24 status appendix (GCC tip `32e923c`)

| Gate / ID | Status @ Directive 24 |
|-----------|------------------------|
| Exact GCC SHA | `32e923cb836741a9569b58841b51ceec429f56b4` |
| GCC-RT-20260820-01/02/03/05/06/07 | **FIXED_REVALIDATED** — `npm run test:security` 6/6 exit 0 |
| `npm test` | **PASS** exit 0 (isolation 5 + handoff 3 + cvos 8 + security 6) |
| `npm run fixture:cvos` | **PASS** — `FIXTURE_PATH_PASS`; `autoProvisionAccess=false`; org=`org-syn01` ≠ org-apex; SYN01; live flags false; `gcc-value-signal.v1` |
| `npm run typecheck` | **FAIL** exit 2 — new `scripts/fixture-synthetic-cvos-path.ts` TS5097/TS2339 only |
| GCC SECURITY_CERTIFIED | **PARTIAL** (security+tests+fixture PASS; typecheck FAIL) |
| New fixture-path P0/P1 | **0** (source inspect: no live network / org spoof / entitlement provision) |
| OD-005 REGRESSION | **PASS** @ `9e5d10a` (D23 cite; not retested) |
| Live production P0 | **5** OPEN @ Hub `940a484` |
| Report | `docs/red-team/REVALIDATION_DIRECTIVE_24_2026-08-20.md` |


## Directive 25 status appendix (GCC tip `8d757cf` — D26 typecheck close)

| Gate / ID | Status @ Directive 25 |
|-----------|------------------------|
| Exact GCC SHA | `8d757cf68157a6054432de7ca57f8431731b2d64` (fix `430eea4`) |
| `npm run typecheck` | **PASS** exit 0 (D24 residual closed) |
| GCC-RT-20260820-01/02/03/05/06/07 | **FIXED_REVALIDATED** — `test:security` 6/6 exit 0 |
| `npm test` | **PASS** exit 0 |
| `npm run fixture:cvos` | **PASS** — `FIXTURE_PATH_PASS`; autoProvisionAccess=false; org-syn01; SYN01; live flags false; gcc-value-signal.v1 |
| D26 delta vs `32e923c` | **typecheck-only** on fixture script (imports + mapped.ok narrowing + artifact rename); no governance/HMAC/RBAC/dispatch thaw |
| GCC SECURITY_CERTIFIED | **PASS** @ `8d757cf` |
| Prior tip `32e923c` | STALE_SUPERSEDED for SECURITY_CERTIFIED gate |
| New fixture-path P0/P1 | **0** |
| OD-005 REGRESSION | **PASS** @ `9e5d10a` (D23 cite; not retested) |
| Live production P0 | **5** OPEN @ Hub `940a484` |
| Report | `docs/red-team/REVALIDATION_DIRECTIVE_25_2026-08-20.md` |


## Directive 26 status appendix (Copilot tip `2f02702` — jose middleware)

| Gate / ID | Status @ Directive 26 |
|-----------|------------------------|
| Exact Copilot SHA | `2f0270228cdaf1dceed51a52a62200ffde07a9e0` (fix `600403b`) |
| `npm test` | **PASS** — **37/37** exit 0 |
| `security-rt-revalidation` | **PASS** — **7/7** exit 0 |
| `npm run build` | **PASS** exit 0 |
| jose fail-closed probe | **PASS** — missing/forged/incomplete/expired → null; valid HS256 accepted |
| `/api/assessments` public | **false** (middleware + session) |
| liveDispatch / observationOnly / productionClientDataAllowed | false / true / false (unchanged; suite asserts) |
| COPILOT-RT-01/02/03/11 | **FIXED_REVALIDATED** @ `2f02702` |
| Middleware delta vs `19a200e` | jose.jwtVerify replaces fragile Web Crypto; fail-closed retained; no assessment public / live dispatch thaw |
| Copilot SECURITY_CERTIFIED | **PASS** @ `2f02702` |
| New jose-path P0/P1 | **0** |
| GCC SECURITY_CERTIFIED | **PASS** @ `8d757cf` (D25 cite; not retested) |
| OD-005 REGRESSION | **PASS** @ `9e5d10a` (D23 cite; not retested) |
| Live production P0 | **5** OPEN @ Hub `940a484` |
| Report | `docs/red-team/REVALIDATION_DIRECTIVE_26_2026-08-20.md` |


## Directive 27 status appendix (Copilot tip `fe3db75` — enrichment / pre-call)

| Gate / ID | Status @ Directive 27 |
|-----------|------------------------|
| Exact Copilot SHA | `fe3db7569a0c52e6d25c171c57bba1d85d0fa592` (feat `0c62792`) |
| `npm test` | **PASS** — **44/44** exit 0 |
| `security-rt-revalidation` | **PASS** — **7/7** exit 0 |
| Unauth assessments GET+POST | **401** UNAUTHENTICATED (suite + independent probe) |
| Unauth enrichment GET+POST | **401** UNAUTHENTICATED (independent probe) |
| jose / session fail-closed | **PASS** |
| Enrichment tenant spoof | **403** TENANT_CONTEXT_REQUIRED (foreign assessment/org) |
| Governance flags | observationOnly=true; liveDispatch=false; commercialAuthority=revenue-os; productionClientDataAllowed=false |
| COPILOT-RT-01/02/03/11 | **FIXED_REVALIDATED** @ `fe3db75` |
| New enrichment P0/P1 | **0** |
| Copilot SECURITY_CERTIFIED | **PASS** @ `fe3db75` |
| Prior tip `2f02702` | STALE_SUPERSEDED for SECURITY_CERTIFIED gate |
| Live production P0 | **5** OPEN @ Hub `940a484` |
| Report | `docs/red-team/REVALIDATION_DIRECTIVE_27_2026-08-20.md` |


## Directive 28 status appendix (GTM tip `f53e628` — journey-sot adapters)

| Gate / ID | Status @ Directive 28 |
|-----------|------------------------|
| Exact GTM SHA | `f53e628a2ef8e7eceb91e12d5a91f59a78c5bdbb` (feat `f61d29c`) |
| Flag defaults | LIVE_DISPATCH=false; PAID_ADS=false; KILL_SWITCH=true |
| `toBookingEventV1` | refuses non-dry-run (**PASS**) |
| `toExperimentSpecV1` | `paidAdsEnabled` const false (**PASS**) |
| `toOptimizationDecisionV1` | `mutatesPaidAds` const false; `hold_for_owner` (**PASS**) |
| journey-sot / gtm-agent / flags tests | 5/5 · 16/16 · 9/9 all exit 0 |
| New GTM P0/P1 | **0 / 0** |
| GTM SECURITY_CERTIFIED | **PASS** @ `f53e628` |
| Prior tip `14d8e4d` | STALE_SUPERSEDED for this SECURITY_CERTIFIED gate |
| Live production P0 | **5** OPEN @ Hub `940a484` |
| Report | `docs/red-team/REVALIDATION_DIRECTIVE_28_2026-08-20.md` |


## Directive 29 status appendix (Integration tip `30964bb` — outbound-dispatch + icp-studio)

| Gate / ID | Status @ Directive 29 |
|-----------|------------------------|
| Exact Integration SHA | `30964bbf437ef0f43708a0e308d554b84ce4c1d7` (pack `778defd`) |
| `outbound-dispatch.v1` | **PASS** — mode=`dry_run_record_only`; recorded=true; dispatched=false; liveDispatch=false |
| `icp-studio.v1` | **PASS** — `exclusions.sensitivePersonalTraits` const true |
| Harness | **40/40** exit 0 |
| Fail-closed probes | **PASS** (reject live/dispatched/sensitive=false) |
| GTM `createOutboundAdapter` @ `f53e628` | cite-only: cannot return `dispatched=true` in engineering |
| New findings | **none** (candidate P0=0 P1=0) |
| Live production P0 | **5** OPEN @ Hub `940a484` |
| Report | `docs/red-team/REVALIDATION_DIRECTIVE_29_2026-08-20.md` |


## Directive 30 status appendix (LIVE Hub post-OD-005 deploy)

| Gate / ID | Status @ Directive 30 |
|-----------|------------------------|
| Live Hub URL | `https://app-atlas-integration-hub.azurewebsites.net` |
| Claimed package SHA | `9e5d10a20639bbeb659fbacd6362cd9f13adb08b` |
| `/health` | ok; authRequired=true; insecureDevAuth=false |
| ATLAS-RT-20260820-01 | LIVE **PARTIAL** (fail-closed Entra; entitlement isolation not live-proven) |
| ATLAS-RT-20260820-02 | LIVE **PARTIAL** |
| ATLAS-RT-20260820-03 | LIVE **NEEDS_RETEST** (Plaid host not on Hub) |
| XSYS-RT-20260820-01 | LIVE **PARTIAL** (key gate 401; HMAC not live-proven) |
| XSYS-RT-20260820-02 | LIVE **NEEDS_RETEST** |
| LIVE P0 = 0? | **NO** |
| LIVE_CERTIFIED | **NO** |
| Rollback | Retain ready until FIXED_REVALIDATED; **not** executed |
| Report | `docs/red-team/REVALIDATION_DIRECTIVE_30_2026-08-20.md` |

## Directive 31 status appendix (independent live validation — SHA gate)

| Gate / ID | Status @ Directive 31 |
|-----------|------------------------|
| Required live SHA | `9e5d10a20639bbeb659fbacd6362cd9f13adb08b` |
| Required deployment ID | `698f7e92-40d1-44e6-82ce-3988d30144fc` |
| SHA independently verified | **NO** |
| LIVE_VALIDATION_ABORTED | **YES** |
| ATLAS-RT-20260820-01 | **INCONCLUSIVE** |
| ATLAS-RT-20260820-02 | **INCONCLUSIVE** |
| ATLAS-RT-20260820-03 | **INCONCLUSIVE** |
| XSYS-RT-20260820-01 | **INCONCLUSIVE** |
| XSYS-RT-20260820-02 | **INCONCLUSIVE** |
| LIVE_P0 = 0? | **NO** |
| LIVE_SECURITY_CERTIFIED | **NO** |
| Report | `docs/red-team/REVALIDATION_DIRECTIVE_31_2026-08-22.md` |

## Directive 32 status appendix (EXECUTE — HOLD LIFTED; Step 0 inherit)

| Gate / ID | Status @ Directive 32 |
|-----------|------------------------|
| THIS_POD_ENV_VERSION | `a86e2323-9c2a-11f1-ba66-0e7d0216e441` |
| THIS_POD_BUILD_ID | `bld-20260820-859ee60c-1350-4ede-89ab-db0836afc9d5` |
| AZURE_* (all four) | **ABSENT** |
| INHERIT | **FAIL** |
| LIVE_VALIDATION_ABORTED | **YES** |
| ATLAS-01/02/03 · XSYS-01/02 | **INCONCLUSIVE** (no probes — inherit FAIL) |
| LIVE_P0 | **5** |
| LIVE_SECURITY_CERTIFIED | **NO** |
| Report | `docs/red-team/REVALIDATION_DIRECTIVE_32_2026-08-22.md` |

## Directive 33 status appendix (public-marker SHA gate)

| Gate / ID | Status @ Directive 33 |
|-----------|------------------------|
| Required / observed live SHA | `64b56dcb73caae1cfcd71743bcedfd8cd64c2b26` |
| Public markers | `/ATLAS_HUB_COMMIT.txt` + `/health.commit` + `/hub-build.json.gitSha` — **PASS** |
| SHA_GATE | **PASS** |
| INHERIT | **FAIL** (Azure ABSENT; continued) |
| FOLLOWUP_CANNOT_REBIND | **YES** |
| Fail-closed PM GET opportunities/search/leads | **401** |
| Staff-bypass harness | exit 0; pattern ABSENT |
| ATLAS-01/02/03 · XSYS-01/02 | **INCONCLUSIVE** |
| LIVE_P0 | **5** |
| LIVE_SECURITY_CERTIFIED | **NO** |
| LIVE_VALIDATION_ABORTED | **NO** |
| Report | `docs/red-team/REVALIDATION_DIRECTIVE_33_2026-08-22.md` |
