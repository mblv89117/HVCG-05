# Capital Document Engine

**As of:** 2026-08-17  
**Code:** `packages/atlas-capital-core/src/checklist.ts`, `intelligence.ts`, `document-intelligence.ts`  
**Hub:** `POST /api/capital/opportunities/:id/documents`, `…/documents/:docId/review`, `…/document-intelligence`  
**SoR rows:** existing `HVCG_DocumentRequests` only (`TemplateItemKey`, `RequestStatus`, `CapitalOpportunityId`, `HVCG_IdempotencyKey`, plus live `DocumentCategory` / `IsStale` / `ExpirationDate` / `DateReceived` / `FileLink`).  
**Not used:** `HVCG_CapitalDocumentReviews` is **not live** and is **not created**. Advisory reviews stay in the Hub overlay.

Original files are preserved. This engine does not rewrite source PDFs, does not OCR, and does not send the client.

---

## Purpose

Remove repetitive document chasing from Manny: collect incoming files against the transaction checklist, classify them, extract what filename/metadata can support, detect period/entity/staleness/conflicts/gaps, draft one client request, and produce an advisory underwriting summary.

Completeness is operational. It is not a credit approval.

---

## Pipeline (first vertical slice)

`runDocumentIntelligence` in `document-intelligence.ts`:

1. **Collection** — associate a file to an opportunity / checklist row. Duplicates (`detectDuplicate`, SHA-256 then name) are flagged, not dropped. `originalPreserved` stays true.
2. **Classification** — `classifyDocumentName` from the file name. Grade: `DERIVED` (or `UNVERIFIED` for `other`). Maps to `TemplateItemKey` via `CLASSIFICATION_TO_ITEM_KEY`.
3. **Extraction** — caller-supplied facts only. **OCR is `STUBBED_NOT_RUN`.** Incoming `VERIFIED` is forced to `UNVERIFIED`. Facts without `SourceRef` are filled from the document record or dropped (`hasSourceRef`).
4. **Period detection** — ISO dates, `YYYY-MM`, month names, YTD, FY, tax-year tokens in the file name. Grade: `DERIVED` when a period end is parsed; YTD without a year is `UNVERIFIED`; else `MISSING`.
5. **Entity detection** — `ClientCode` or overlapping title tokens in the file name. Foreign names are `DERIVED` + `matchesOpportunity=false`.
6. **Current / stale** — bank statements > 45 days, financials/AR/AP > 90 days, tax years outside the trailing 3-year window, or past `ExpirationDate`. Unknown period is **not** treated as current (`determined=false`, `MISSING`).
7. **Completeness** — `completenessPercent` + bank-statement month coverage (3 distinct `YYYY-MM`). Engine never sets `ACCEPTED` or `VERIFIED`.
8. **Conflict detection** — same field across documents, extracted revenue vs Atlas snapshot, entity vs `ClientCode`. Grade: `CONFLICTING`.
9. **Missing documents** — `requiredOpenItems` after status patches.
10. **Client request** — `consolidateMissingRequest` draft only. Hub rejects `send` / `sendToClient` / `externalSend`. `clientRequestSendAttempted` is always `false`.
11. **Underwriting summary** — `buildUnderwritingSummary` (advisory; `usedUnverifiedFacts` when any non-verified fact was used).

Evidence grades: `VERIFIED | DERIVED | UNVERIFIED | CONFLICTING | MISSING`.  
Every derived/extracted fact carries `SourceRef` (`sourceSystem`, `capturedAt`, `field`, optional `sourceRecordId` / `sourceUrl`).

---

## Checklist generation

`generateChecklist(ctx)` filters `CHECKLIST_RULES` by `transactionType` and optional `applies` predicates (`realEstateComponent`, `personalGuaranteeExpected`, SBA, etc.).

Common required keys include formation, ownership, YTD P&L and balance sheet, 3-year business tax returns, 3 months bank statements, debt schedule, owner ID.

Conditional / type-specific examples (patterns, not legal advice):

| itemKey | When |
|---------|------|
| sba-1919, sba-413 | SBA families (use current successor form names in UI copy if SBA renumbers) |
| pfs | Personal guarantee expected |
| ar-aging, ap-aging | AR / ABL / WC |
| eq-invoice | equipment |
| re-psa, re-appraisal | CRE / acquisition / construction |
| construction-budget | construction |
| acq-quality-of-earnings | acquisition / recap |
| refi-notes | refinance / bridge |

`Requiredness`: `REQUIRED | OPTIONAL | CONDITIONAL`. `Condition` stores the human-readable predicate.

ACCG/Prodigy historical packages inform **shape only**. Do not load real client files into fixtures.

---

## Status model

Keep legacy `RequestStatus` on `HVCG_DocumentRequests`. Hub maps:

| ChecklistStatus | Live `RequestStatus` |
|-----------------|----------------------|
| RECEIVED | Received |
| NEEDS_REVIEW / INCOMPLETE / OUTDATED | In Review |
| ACCEPTED | Accepted |
| NOT_APPLICABLE | Waived |
| MISSING / REQUESTED | Requested |

Live `IsStale` is written when status is `OUTDATED`. An `Accepted` row with `IsStale=true` reads back as `OUTDATED`.

Blocking for required items: MISSING, REQUESTED, INCOMPLETE, OUTDATED, NEEDS_REVIEW (`isBlockingStatus`).

`completenessPercent` counts required, non-N/A items that are ACCEPTED.

`markOutdated` flips ACCEPTED → OUTDATED past `expiration` / current-through.

Human override requires `OverrideReason` + `OverrideBy` (`overrideChecklistItem`). Audit that write.

Engine status patches (fail-closed): MISSING/REQUESTED/RECEIVED → `NEEDS_REVIEW`; stale → `OUTDATED`; conflicts on accepted rows → `NEEDS_REVIEW` + `CONFLICTING`. Never `ACCEPTED`. Never `VERIFIED`.

---

## Files and integrity

| Field | Use |
|-------|-----|
| FileLink | Existing URL to library object (Graph `{ Url, Description }`) |
| SHA256 | Optional hash of the original bytes |
| VersionNumber | Metadata version; do not overwrite the original file |
| RelatedLenderId | Lender-specific addendum items |
| FolderTarget | Existing library folder hint |

`detectDuplicate` matches SHA-256 first, then file name. Duplicates are flagged on the review row (`DuplicateOf`), not silently dropped.

---

## Review pipeline (advisory)

1. Associate file to a checklist row / opportunity (`POST …/documents`). Filename classification fills `documentType` when omitted. Linked MISSING/REQUESTED rows become RECEIVED (not accepted).
2. Optional caller-supplied extraction (future: existing `HVCG_AI*` jobs, human-gated). OCR is not run in this worktree.
3. `reviewDocument` / `runDocumentIntelligence` produce overlay reviews: type guess, period, entity, summary, extracted facts.
4. Any incoming `VERIFIED` extraction is forced down from VERIFIED. A human must confirm against the source document before Hub may set `VerificationStatus=VERIFIED` on the request or profile field.
5. Incomplete pages, stale, inconsistent period, Atlas conflicts stay on the review row / report.

Classifier confidence is a number, not a fact.

Reviews are **not** written to a new SharePoint list. Graph persistence writes checklist rows to `HVCG_DocumentRequests` only.

---

## Client requests

`consolidateMissingRequest` builds one outstanding-items message. Send remains a human step. Hub returns `422` if the caller sets `send`, `sendToClient`, or `externalSend`.

Portal visibility (`PortalVisible`) is unchanged policy: V1 default is request-link upload, not standing client membership.

---

## Limits

- Engine does not OCR. Extraction is filename/metadata plus caller-supplied facts, still unverified.
- Engine does not submit packages to lenders and does not email clients.
- `HVCG_CapitalDocumentReviews` is not provisioned. Overlay reviews are process state, not SoR.
- `RequestStatus` and `ChecklistStatus` can diverge until additive `ChecklistStatus` exists; live Hub uses `RequestStatus`.
- Collection is metadata association, not a SharePoint library ingest.
