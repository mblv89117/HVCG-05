# Capital Transaction Execution — Phase 3.5 Discovery

**As of:** 2026-08-18  
**Scope:** Discovery only — map existing Atlas Capital Operations code against the post-strategy execution vertical.  
**Worktree:** `.worktrees/atlas-capital-operations`  
**Out of scope:** Autonomous external lender submission, new app/DB, deployment, production provisioning.

SharePoint `HVCG_*` remains the structured system of record. Hub `development-json` and the durable intelligence **overlay** (`apps/atlas-integration-api/src/capital/overlay.ts`) are runtime adapters — not a second CRM.

---

## Execution pipeline (requested stages → code)

| Stage | Primary artifacts | Stage(s) in `stages.ts` |
|-------|-------------------|-------------------------|
| Approved strategy | `FinancingStrategy`, Manny flags on opportunity | `StrategyApproved` → research/shortlist |
| Application package | `ApplicationPackage` | Pre-`ReadyForSubmission` |
| Document package | `ChecklistItem[]`, client library files | `DocumentsRequested` … `DocumentsComplete` |
| Lender submission preparation | Draft `LenderSubmission`, `SubmissionReadiness` | `ReadyForSubmission` |
| Recorded submission | `HVCG_LenderOutreach` row | `Submitted` |
| Lender RFI | `MessageClass`, optional new doc rows | `AdditionalInformationRequested` |
| Client request | `MissingDocumentRequest` draft | Document stages |
| Term sheet | `TermSheetOffer` / `HVCG_CapitalOffers` | `TermSheetOfferReceived` |
| Term comparison | `compareOffers()` | `OfferComparison` |
| Client decision | `ClientApproval` | `ClientDecision` |
| Closing | `ClosingCondition[]` | `Closing` |
| Funded | Opportunity terminal stage | `Funded` |
| Fee / tail tracking | `FeeRecord` | Post-`Funded` (parallel) |

---

## What already exists

### Stage machine & gates (contracts)

- **File:** `packages/atlas-capital-core/src/stages.ts`  
- **Behavior:** 23-stage forward graph including execution stages (`ReadyForSubmission` → `Funded`). Manny gates at `AwaitingMannyStrategyApproval` and `AwaitingMannyShortlistApproval`. Illegal transitions throw `InvalidStageTransitionError`.
- **Legacy sync:** Lossy maps to `HVCG_CapitalOpportunities.FundingStatus` (`STAGE_TO_LEGACY_FUNDING_STATUS`).

### Approved strategy

- **Core:** `draftStrategy`, `buildMannyStrategyPackage`, `applyMannyDecision` (`intelligence.ts`).
- **Hub:** `POST …/strategy`, `POST …/strategy/decision` — Manny role required for decision; on `APPROVED` sets `StrategyApproved` (`service.ts`).
- **UI:** Strategy tab with Approve / Revise / Reject (`OpportunityWorkspace.tsx`); `decideStrategy` in `capitalApi.ts`.
- **Storage:** Strategies live in Hub overlay / JSON store. Graph hydrate synthesizes from opportunity Manny flags — **`HVCG_CapitalStrategies` is not used** (`sharepoint/repository.ts`).

### Application package

- **Core:** `ApplicationPackage` type; `prepareApplication()` populates lender-specific fields from opportunity + attached docs (`intelligence.ts`).
- **Hub:** `POST /api/capital/opportunities/:id/application` — persists to `state.applications` (`service.ts`, `http.ts`).
- **UI:** Application tab displays package when present on detail payload (`OpportunityWorkspace.tsx`).
- **Gap note:** `GET …/opportunities/:id` does **not** return `application` or `fees` today — UI only sees them via synthetic fallback or if another path merges them.

### Document package

- **Core:** `generateChecklist()`, `consolidateMissingRequest()`, document intelligence pipeline (`checklist.ts`, `document-intelligence.ts`).
- **Hub:** `POST …/checklist/generate`, `GET …/checklist`, `POST …/checklist/:itemId/override`, `POST …/documents`, `POST …/ingest`, `POST …/document-intelligence`, `GET …/missing-request`, evidence/fact review routes (`service.ts`, `http.ts`).
- **SharePoint reuse:** Checklist rows map to **`HVCG_DocumentRequests`** via `GraphCapitalStore.replaceChecklist()` (`sharepoint/repository.ts`, `sharepoint/map.ts`). Additive columns: `ChecklistItemKey`, `ChecklistStatus`, `VerificationStatus`, etc. (schema JSON).
- **UI:** Documents tab, missing-request draft display, ingest/review flows (`OpportunityWorkspace.tsx`, `loadMissingRequest` in `capitalApi.ts`).
- **Send guard:** Any `send` / `sendToClient` / `externalSend` flag → **422**; responses always include `clientRequestSendAttempted: false`.

### Lender submission preparation

- **Core:** `LenderSubmission` with `status: draft`; opportunity fields `submissionReadiness`, `SubmissionReadiness` on SharePoint schema.
- **Hub:** On Manny shortlist `APPROVED`, creates draft outreach rows per `lenderId` and moves to `ReadyForSubmission` (`shortlistDecision` in `service.ts`).
- **SharePoint reuse:** Draft/submitted lifecycle on **`HVCG_LenderOutreach`** — additive `SubmissionStatus`, `SubmissionMethod`, `PackageVersion`, etc. (`HVCG_LenderOutreach.json`).

### Recorded submission (human-performed, system-recorded)

- **Hub:** `POST …/submissions` — **record-only**; requires Manny strategy + shortlist approved and stage `ReadyForSubmission`; sets `Submitted`; returns `recordedOnly: true`, `externalSubmit: false` (`service.ts`). Ignores `body.externalSubmit`.
- **Graph:** `GraphCapitalStore.createSubmission()` writes **`HVCG_LenderOutreach`** with idempotency key; never calls lender APIs (`sharepoint/repository.ts`).
- **Tests:** Red-team / operations tests assert no external submit path.

### Lender RFI (advisory classification)

- **Core:** `classifyLenderMessage()` → `LenderMessageClass` including `REQUEST_FOR_INFORMATION` (`intelligence.ts`). Stage `AdditionalInformationRequested` exists in machine.
- **Hub:** `POST …/communications/classify` — returns classification + parsed bullet items; **does not** persist to outreach or transition stage (`service.ts`).

### Client request (draft)

- **Core:** `consolidateMissingRequest()` builds subject/body from open required checklist items (`checklist.ts`).
- **Hub:** Exposed via document-intelligence report and `GET …/missing-request`. Never sends email.

### Term sheet & comparison

- **Core:** `TermSheetOffer`, `compareOffers()` with rate-is-not-effective-cost disclaimer (`types.ts`, `intelligence.ts`).
- **Hub:** `POST …/offers`, `GET …/offers/compare` (`service.ts`, `http.ts`).
- **Schema:** `HVCG_CapitalOffers` list JSON exists (`src/sharepoint/lists/HVCG_CapitalOffers.json`).
- **UI:** Offers tab table (read-only display); no Hub client helpers for add/compare in `capitalApi.ts`.

### Client decision

- **Core/UI:** Stage `ClientDecision`; field `clientApproval` on opportunity (SharePoint `ClientApproval` in map).
- **UI:** Manual `transitionOpportunity(…, 'Closing')` button when stage is `ClientDecision` (`OpportunityWorkspace.tsx`).
- **Hub:** Generic `POST …/transition` only — no dedicated client-decision endpoint.

### Closing

- **Core:** `defaultClosingConditions()` by `transactionType` (`intelligence.ts`).
- **Hub:** `POST …/closing/generate` — seeds `state.closing[id]` in overlay/JSON (`service.ts`).
- **Schema:** `HVCG_ClosingConditions` list JSON exists; **not** on live Graph min slice (`CAPITAL_RELEASE_HANDOFF.md`).

### Funded

- **Stage machine:** `Closing` → `Funded` → `ClosedArchived`; queue `FUNDED` derived in `queueFor()` (`intelligence.ts`).
- **UI/KPIs:** `recentlyFunded` in command center KPIs (`commandKpis`).

### Fee / tail tracking

- **Core:** `createFeeRecord()`, `feeRequiresLegalReview()` flags regulated/success/tail types (`intelligence.ts`).
- **Hub:** `POST /api/capital/fees` (`service.ts`, `http.ts`).
- **Schema:** `HVCG_FeeRecords` with `TailStart`, `TailEnd`, `LegalComplianceReviewRequired` (`HVCG_FeeRecords.json`).
- **UI:** Fees tab (read); KPI `feeReceivableOpen`.

### Operator surfaces

- **Elite `/capital`:** `CapitalCommandCenter.tsx`, `OpportunityWorkspace.tsx` — queues, pipeline stages, strategy/Manny gates, documents, offers/closing/fees display.
- **Hub API surface:** `/api/capital/*` in `http.ts` with audit hooks for transitions, submissions (recorded-only), fees.

---

## What is missing (gaps vs gates)

| Gap | Impact |
|-----|--------|
| **Production SharePoint slice incomplete** | Additive columns on `HVCG_CapitalOpportunities`, `HVCG_DocumentRequests`, `HVCG_LenderOutreach` not confirmed live; `HVCG_CapitalOffers`, `HVCG_ClosingConditions`, `HVCG_FeeRecords` deferred — offers/closing/fees stay overlay-only in Graph mode. |
| **`submissionReadiness` / `closingReadiness` never computed** | Fields exist on opportunity + schema; Hub always creates with `false`; no rule ties ACCEPTED checklist → readiness flag; submission gate uses Manny + stage only. |
| **`clientApproval` never updated** | No API/UI records client choice among compared offers before closing transition. |
| **Elite not wired to execution write APIs** | No `capitalApi` helpers for `application`, `submissions`, `offers`, `closing/generate`, `fees` — operator must use Hub directly or synthetic demo data. |
| **`GET` opportunity omits `application` and `fees`** | Workspace tabs often empty on real Hub path even after POST. |
| **RFI → workflow** | Classify is ephemeral; no patch to `HVCG_LenderOutreach.MessageClass` / `SubmissionStatus=rfi`, no auto `AdditionalInformationRequested` transition, no spawn of lender-specific `DocumentRequests`. |
| **Term sheet ingress** | No structured ingest from classified lender mail → offer row; manual `POST …/offers` only. |
| **Offer comparison UX** | `GET …/offers/compare` notes not surfaced in Elite; no stage auto-advance to `OfferComparison`. |
| **Closing condition lifecycle** | Generate-only; no update/satisfy/waive API; `closingReadiness` not derived from open conditions. |
| **Fee/tail operations** | No invoice/payment state transitions, tail date tracking UI, or Graph persistence; legal-compliance queue is a flag only. |
| **Audit to `HVCG_AuditEvents`** | Hub integration audit log exists; business audit list writes for stage/Manny/submission not fully wired per architecture intent. |
| **Bundled document package artifact** | Checklist + files tracked separately; no single versioned “package manifest” export for human lender send (by design — human assembles send). |

---

## Required human gates (must remain)

| Gate | Mechanism | Current enforcement |
|------|-----------|---------------------|
| Manny strategy approval | `AwaitingMannyStrategyApproval` / `MannyStrategyApproval` | Hub `strategy/decision` + `isMannyApprover` |
| Manny shortlist approval | `AwaitingMannyShortlistApproval` / `MannyShortlistApproval` | Hub `shortlist/decision`; draft outreach only after approve |
| Submission readiness | `SubmissionReadiness` + checklist ACCEPTED | **Documented, not enforced in code** |
| Physical lender submit | Human email/portal/package send | System records via `POST …/submissions` only after human send |
| Client document request send | Draft `missing-request` / `clientRequest` | **422** on any send flag |
| Client decision | `ClientDecision` + `ClientApproval` | Stage exists; **approval field not wired** |
| Closing release | `ClosingReadiness` + open conditions | **Documented; readiness not computed** |
| Fee legal/compliance | `LegalComplianceReviewRequired` on regulated types | Set on create; human review required |

---

## Must NEVER be automated

Explicit blocks already in code or contracts — Phase 3.5 must not add bypasses:

| Action | Where blocked |
|--------|----------------|
| **External lender submit** (portal/API/email send) | `submission()` record-only; `externalSubmit` ignored; Graph repo comment; audit `recordedOnly=true` |
| **Client email / external comms send** | `requestedClientSend()` → 422 on ingest/intelligence; `clientRequestSendAttempted: false` |
| **Credit pull** | No integration; do not add bureau/soft-pull automation |
| **Money movement** | Fee records are not GL; no wire/ACH/disbursement automation |
| **AI → VERIFIED promotion** | `reviewDocument` / fact review human decisions only |
| **Auto BEST_FIT submission target** | Matching is advisory; `reviewStatus: PENDING_MANNY` |

---

## List reuse (do not duplicate)

| List | Role in execution vertical |
|------|----------------------------|
| **`HVCG_CapitalOpportunities`** | Header: `Stage`, Manny/Client approval fields, `SubmissionReadiness`, `ClosingReadiness`, `TargetAmount`, legacy `FundingStatus`. |
| **`HVCG_DocumentRequests`** | Document package checklist rows (`ChecklistItemKey`, `ChecklistStatus`, file linkage). Capital and non-capital requests share this list. |
| **`HVCG_LenderOutreach`** | Per-lender submission tracker: draft → submitted → rfi/underwriting/offer/declined; human-recorded `SubmittedAt` / `SubmittedBy` / `ConfirmationNumber`. |

Deferred new lists (schema only, overlay until provisioned): `HVCG_CapitalOffers`, `HVCG_ClosingConditions`, `HVCG_FeeRecords`, `HVCG_CapitalStrategies`.

---

## Recommended Phase 3.5 build order (discovery — not implementation)

1. Wire Elite `capitalApi` + `GET` detail for application/fees/submissions write paths (still human-gated).
2. Compute/set `submissionReadiness` from checklist rules; optional gate before `POST …/submissions`.
3. Persist RFI: classify → patch `HVCG_LenderOutreach` + stage transition + optional DocumentRequest spawn.
4. Client decision endpoint updating `ClientApproval` before `Closing` transition.
5. Owner provisioning for offers/closing/fees lists OR document overlay persistence policy explicitly.
6. Closing condition CRUD + `closingReadiness` derivation.

---

## Related documents

- [CAPITAL_OPERATIONS_DISCOVERY.md](CAPITAL_OPERATIONS_DISCOVERY.md)
- [CAPITAL_WORKFLOW.md](CAPITAL_WORKFLOW.md)
- [CAPITAL_DATA_MODEL.md](CAPITAL_DATA_MODEL.md)
- [CAPITAL_PHASE2_CONTRACTS.md](CAPITAL_PHASE2_CONTRACTS.md)
