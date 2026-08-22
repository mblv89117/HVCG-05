# High Value Platform Operating Picture — 2026-08-19 Cloud Run

This document records current runtime/repository truth observed in the cloud agent environment. It is not a roadmap and does not merge product boundaries.

## Current status

| Area | Status | Evidence / blocker |
| --- | --- | --- |
| Atlas / HVCG OS | Repo-ready candidate for Phase 5G pre-auth gates | `cursor/platform-completion-7241` at `2d0912c3857e73f3833ffd3f52817fe837aff460` before this document update; Hub typecheck/tests PASS; Elite build/tests PASS; signed-out rendered QA PASS. No live deployment or Microsoft-auth live certification performed in this run. |
| 360 Growth Solution | BLOCKED | Exact repo `mblv89117/360-growth-solution` is not accessible to this cloud principal; GitHub repo list/search returned no accessible match. No code changes made. |
| Agent Copilot | BLOCKED | Exact repo `mblv89117/hvcg-agent-copilot` is not accessible to this cloud principal; GitHub repo list/search returned no accessible match. No code changes made. |
| EVA | PARTIAL / Atlas-side contract present | Atlas tests cover `Website-EVA` lead listing, lead conversion, idempotency, and no client entitlement. Actual EVA runtime/repository was not accessible/discovered in this environment. |
| Growth Command Center | Local repo-ready fixes; remote push BLOCKED | `growth-command-center` cloned from `mblv89117/growth-command-center`; local branch `cursor/gcc-client-handoff-7241` at `a400da598b7e25098b2f5b65d319c77a13fcb3b7`; install/build/lint/typecheck PASS locally; signed-out rendered QA PASS with minor non-blocking console observations. Push denied: `Permission to mblv89117/growth-command-center.git denied to cursor[bot]`. |
| Elevated / Autonomous Marketing / Best Day / client repos | Boundary only | Not platform-completion workstreams in this run. Gmail archive excluded. ACCG01 not touched. |

## Production / candidate baselines verified

### Atlas

- Repository: `https://github.com/mblv89117/HVCG-05`
- Live Hub branch/SHA supplied and verified present: `feature/atlas-lead-opportunity-conversion` @ `5b50ca2c338b34afffa5796d6fa79298a7b27d4c`
- Live Elite branch/SHA supplied and verified present: `feature/atlas-lead-opportunity-elite` @ `632b7ae32e94afe9d839d39f1dff20625e86789e`
- Supplied Phase 5G SHA: `36e94c0f089f74bd6c12f184676a0c751a569f7f`
- Remote ref containing supplied Phase 5G SHA: `origin/cursor/phase-5g-opportunity-ops-27ef`
- Verified current Phase 5G remote tip before this run's fixes: `d116a6bda6f3d9c4914becfc83bd0a5303696e26`
- Ancestry:
  - `5b50ca2` is an ancestor of `36e94c0` and of remote tip `d116a6b`.
  - `632b7ae` is not an ancestor of `36e94c0`, but is an ancestor of remote tip `d116a6b`.
  - `36e94c0` is an ancestor of remote tip `d116a6b`.
- Candidate branch for this run: `cursor/platform-completion-7241`
- Candidate SHA after reproducibility fixes: `2d0912c3857e73f3833ffd3f52817fe837aff460`
- PR: `https://github.com/mblv89117/HVCG-05/pull/5`

### Growth Command Center

- Repository: `https://github.com/mblv89117/growth-command-center.git`
- Default branch: `main`
- Base SHA observed: `fb986cbd76334edfa84822fab51abae16d4103c4`
- Local candidate branch: `cursor/gcc-client-handoff-7241`
- Local candidate SHA: `a400da598b7e25098b2f5b65d319c77a13fcb3b7`
- Remote push / PR: BLOCKED by GitHub write permission for `cursor[bot]`

## Verification performed in this run

### Atlas

- `npm ci` — PASS
- `npm run typecheck -w @hvcg/atlas-integration-api` — PASS
- `npm run test -w @hvcg/atlas-integration-api` — PASS (`313` tests, `89` suites)
- `npm run build -w @hvcg/atlas-elite-os` — PASS
- `npm run test:all -w @hvcg/atlas-elite-os` — PASS
- Rendered UI smoke at `http://127.0.0.1:4180/` — PASS for signed-out shell, protected route auth gates, 375px narrow viewport, no horizontal overflow.

Covered Atlas gates include:

- Capital P1 #1 package/lender/confirmation gate assertions:
  - mismatched lender rejected `422`
  - no matching prepared package rejected `422`
  - fabricated/foreign package rejected `422`
  - missing confirmation rejected `422`
  - `externalSubmit` remains recorded-only, no external send
- Capital P1 #2 recorded submission persistence:
  - governed recorded submission returns `200`
  - stage/submission persistence covered by integration tests
  - `SUBMISSION_RECORDED` exactly once
  - replay returns same submission with `created:false`
  - synthetic Graph writes remain disabled unless explicitly allowed
- CRM lead conversion:
  - `HVCG_Leads -> HVCG_Clients -> HVCG_Contacts -> HVCG_Opportunities`
  - `ClientStage = Prospect`
  - opportunity `Stage = Discovery`
  - `WinLossStatus = Open`
  - idempotency key `opp-from-lead|{LeadId}`
  - no external client entitlement
- Opportunity operations:
  - owner, stage, next action, due date, attention, win/loss, ETag/concurrency, Graph failure paths.
- Search / security:
  - authorized SYN client hits retained when extras fail/hang
  - cross-client/foreign lead and project/task search probes fail closed
  - no wildcard client scope accepted.

### Growth Command Center

- `npm ci` — PASS
- `npm run build` — PASS
- `npm run lint` — PASS
- `npm run typecheck` — PASS after local reproducibility fix
- Rendered UI smoke at `http://127.0.0.1:3080/` — PASS for signed-out auth gates and narrow responsive layouts. Non-blocking browser-console observations: `auto?ae=1` 404 and one duplicate-label warning on `/cash-forecast`; no source match found and build/lint/typecheck remain green.

Local GCC fixes:

- `next.config.ts`: explicit `outputFileTracingRoot` so multi-repo workspaces do not cause Next to select the parent Atlas lockfile as root.
- `package.json`: adds `typecheck` script using `tsc --noEmit --incremental false` to avoid stale `.tsbuildinfo` false failures in reused cloud workspaces.

## Cross-system contracts

### Company / account identity

- Atlas authoritative company/account key: `HVCG_Clients.ClientCode`.
- `HVCG_Clients` is the master for both prospects and clients.
- `ClientStage` represents lifecycle (`Prospect`, `Active Client`, etc.).
- Client activation remains a separate governed event; opportunity `Won` does not automatically set `Active Client` or grant access.

### Lead / opportunity identity

- Atlas lead source of record: `HVCG_Leads`.
- Atlas opportunity source of record: `HVCG_Opportunities`.
- Lead conversion idempotency: `opp-from-lead|{LeadId}`.
- Replay must return the same opportunity with `created:false`.

### Attribution

Preserve when present; do not invent:

- `Source`
- `LeadSourceDetail`
- campaign / UTM / ad / creative identifiers
- assessment identifier
- landing experience
- lead ID
- opportunity ID
- client/account `ClientCode`

Current Atlas-side examples include `Website-EVA` and `Website-Funding` lead sources. 360/Copilot richer attribution could not be verified because their repos were inaccessible.

### EVA

- EVA remains front door / assessment funnel.
- Atlas remains CRM.
- Atlas-side current contract: `Website-EVA` lead can list for internal staff, convert to Prospect company/contact/Discovery opportunity, remain idempotent, and grant no client entitlement.
- Actual EVA runtime certification is blocked until the implementation/repo/deployment is accessible.

### Agent Copilot

- Copilot remains AI Business MRI / AI implementation diagnostic.
- Required handoff target: existing or new Atlas lead with source, provenance, confidence, and no automatic verified business facts.
- AI ROI/readiness/opportunity hypotheses must not become verified capital facts, legal facts, financial facts, or client commitments.
- Repo/runtime certification is blocked until `hvcg-agent-copilot` access is available.

### 360 Growth Solution

- 360 remains commercial multi-tenant growth/marketing platform.
- 360 may send attributed HVCG demand to EVA or approved Atlas intake.
- `PAID_ADS_ENABLED=false` and `EMERGENCY_PAUSE_GLOBAL=true` remain policy defaults unless owner explicitly changes them.
- Repo/runtime certification is blocked until `360-growth-solution` access is available.

### Growth Command Center

- GCC remains financial/KPI/cash/client-delivery intelligence.
- Atlas does not absorb GCC ledgers or dashboards.
- Current handoff target: Atlas `Active Client` plus governed mapping to GCC tenant/client record. No broad automatic access.
- Local repo gates pass after reproducibility fixes, but pushing/PR is blocked by write permissions.

## Security / release gates

- No Gmail archive access requested or used.
- No ACCG01 mutation performed.
- No real-client synthetic mutation performed.
- No deployments performed.
- No external emails/proposals/lender submissions/ad spend/provisioning/money movement/legal/tax/credit decisions performed.
- Runtime identity remains least-privilege; added Atlas verification source explicitly treats `Sites.Manage.All` as a banned role.

## Owner action bundle

Do not request these individually; batch into one owner window after all repo-only staging is complete.

1. Microsoft auth / MFA window for Atlas Phase 5G live deployment and certification:
   - deploy exact Hub/Elite artifacts
   - verify rollback artifacts
   - run live synthetic lead -> opportunity -> opportunity operations acceptance
   - run capital P1 live checks without external sends
2. GitHub repository access:
   - grant the cloud agent/write principal push permission to `mblv89117/growth-command-center`
   - provide or grant access to exact current 360 Growth Solution repository
   - provide or grant access to exact current Agent Copilot repository
   - identify actual EVA implementation repository/deployment if not in HVCG-05
3. Deployment/runtime authority only if needed after repo staging:
   - GCC Supabase/Vercel/production secrets for live certification
   - 360 deployment/test secrets
   - Copilot deployment/test secrets

## Completion scoring — observed, not false-precise

| System | Repo-complete | Deployed | Live-certified | Business-useful | Premium UI certified | Security certified | Documented |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Atlas | PARTIAL/PASS for Phase 5G pre-auth candidate | NOT in this run | NOT in this run | PARTIAL | PASS for signed-out/protected-route smoke; authenticated rendered QA still owner-auth blocked | Repo red-team PASS for tested gates | PARTIAL/PASS |
| 360 | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | PARTIAL boundary only |
| EVA | Atlas-side PARTIAL | Unknown | NOT in this run | PARTIAL | Not certified | Atlas-side tests PASS | PARTIAL |
| Agent Copilot | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | PARTIAL boundary only |
| GCC | LOCAL PASS | NOT in this run | NOT in this run | PARTIAL | PASS for signed-out/protected-route smoke; authenticated dashboard QA still auth/secret blocked | Build/lint/typecheck PASS locally | PARTIAL |

High Value current approved platform scope is **not complete** until blocked repos are accessible and live certification is performed for production systems.
