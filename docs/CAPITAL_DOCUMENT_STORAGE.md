# Capital Document Storage & Ingestion — Discovery (A1)

**As of:** 2026-08-17  
**Workstream:** A1 — discovery only (no provisioning, no deploy, no production mutation)  
**Branch:** `feature/atlas-capital-operations`  
**Contracts:** [CAPITAL_PHASE2_CONTRACTS.md](./CAPITAL_PHASE2_CONTRACTS.md)  
**Related:** [CAPITAL_DOCUMENT_ENGINE.md](./CAPITAL_DOCUMENT_ENGINE.md), [CAPITAL_SECURITY.md](./CAPITAL_SECURITY.md)

This document records what exists, what to reuse, and confirmed gaps for capital document **storage** and **ingestion**. It does not provision SharePoint lists, deploy Hub, or place real client files in git.

---

## Executive summary

| Area | Verdict |
|------|---------|
| **System of record for checklist rows** | **CONFIRMED REUSE** — `HVCG_DocumentRequests` |
| **Binary file storage** | **CONFIRMED REUSE** — per-client SharePoint library `HVCG_{ClientCode}` on HVCG-Clients site |
| **File pointer on checklist row** | **CONFIRMED REUSE** — `FileLink` (URL field, Graph `{ Url, Description }`) |
| **Hub capital Graph adapter** | **CONFIRMED REUSE** — list-only writes via `capabilityForCapitalList`; checklist ↔ `HVCG_DocumentRequests` |
| **PM fabric file index** | **CONFIRMED REUSE (adjacent)** — metadata + link only; not wired to capital ingest today |
| **Hub binary upload to SharePoint** | **GAP** — no drive/upload-session path in capital or PM Hub |
| **Automated upload / request links** | **GAP** — policy exists; Hub does not create sharing links |
| **CapitalDocument / review overlay persistence** | **GAP (by design)** — Hub overlay only; not SharePoint SoR |
| **Local AI document staging** | **GAP** — text-in/text-out only; no file staging |
| **Schema fields SHA256 / VersionNumber / FolderTarget on write path** | **GAP** — columns exist in JSON schema; Hub map does not write them yet |

**No new SharePoint lists are required** for Phase 2 minimum ingest. Existing structures are adequate if Hub writes the already-defined columns and humans/flows place bytes in client libraries.

---

## 1. What exists and should be reused

### 1.1 SharePoint client libraries (binary SoR)

**Template:** `src/sharepoint/libraries/HVCG_ClientLibrary.template.json`

| Property | Value |
|----------|--------|
| Library name pattern | `HVCG_{ClientCode}` (e.g. `HVCG_SYN01`) |
| Site | HVCG-Clients (`highvaluecapitalgroup.sharepoint.com:/sites/HVCG-Clients`) |
| Versioning | Major versions on; minor off; limit 500 |
| Content type | `HVCG_ClientDocument` |
| Anonymous links | Denied (`denyAnonymousLinks: true`) |

**Standard folders (00–23):** Engagement Administration, Corporate, Ownership, Historical/Current Financials, Tax Returns, Bank Statements, Debt Schedule, AR/AP, Payroll, Contracts, Real Estate, Insurance, Legal, Financial Models, **Lender Package (16)**, Investor Package, Presentations, Deliverables, etc.

**Library metadata columns (on files):** `ClientCode`, `DocumentCategory`, `ReceivedDate`, `ExpirationDate`, `SubmittedBy`, `ReviewStatus`.

**Provisioning:** `HVCG_CreateClientWorkspace` (Power Automate) creates library + folders and writes `SharePointLibraryUrl` back to `HVCG_Clients`. Permissions / break-inheritance handled out-of-band by `deployment/scripts/New-HVCGClientWorkspace.ps1` (PnP). Idempotent.

**Client record link:** `HVCG_Clients.SharePointLibraryUrl` — used by PM Client Workspace to surface the library root without granting Hub drive APIs.

### 1.2 SharePoint list — checklist / request register (metadata SoR)

**Schema:** `src/sharepoint/lists/HVCG_DocumentRequests.json`  
**Live list ID (documented in Hub settings):** `89a421e9-3086-47ef-80c3-214500d3d92c` (tenant doc only; configure via env)

Capital Phase 2 contract fields (already in schema):

| Field | Role |
|-------|------|
| `Title` | Requested document name |
| `ClientCode` | Isolation key (indexed) |
| `AtlasClientRef` | Primary client lookup (write via `AtlasClientRefLookupId`) |
| `CapitalOpportunityId` | Capital opportunity lookup |
| `TemplateItemKey` | Stable checklist rule key (live identity; prefer over additive `ChecklistItemKey`) |
| `RequestStatus` | Legacy operational status (Hub maps from `ChecklistStatus`) |
| `DocumentCategory` | Choice aligned with library categories |
| `FolderTarget` | Target folder hint (e.g. `05 - Tax Returns`) |
| `FileLink` | **URL to library object** — Graph shape `{ Url, Description }` |
| `DateReceived` | When file associated |
| `ExpirationDate` / `IsStale` | Freshness |
| `SHA256` | Hash of original bytes (schema present) |
| `VersionNumber` | Metadata version (schema present) |
| `HVCG_IdempotencyKey` | Idempotent upsert |
| `ChecklistStatus` / `VerificationStatus` | Additive operational / fact grades (schema present; live column presence varies) |
| `PortalVisible` | Portal policy (default true) |
| `Audience` | Client / Lender / Investor / Internal |

**Not reused for Phase 2 ingest SoR:** `HVCG_CapitalDocumentReviews` — defined in JSON, **not live**, **not to be provisioned**. Advisory reviews stay in Hub overlay per [CAPITAL_DOCUMENT_ENGINE.md](./CAPITAL_DOCUMENT_ENGINE.md).

### 1.3 Hub capital SharePoint adapter

**Location:** `apps/atlas-integration-api/src/capital/sharepoint/`

| Component | Purpose |
|-----------|---------|
| `settings.ts` | Resolves `INTEGRATION_CAPITAL_*` list IDs; reuses PM site ID; `allowSyntheticGraph` flag |
| `graph.ts` | Separate allowlist from PM — opportunities, document requests, lender outreach write; clients/lenders read |
| `map.ts` | `checklistItemToFields` / `checklistItemFromItem` — includes `FileLink`, `TemplateItemKey`, `ClientCode`, `CapitalOpportunityId`, `RequestStatus`, `DocumentCategory`, `IsStale`, `ExpirationDate`, `DateReceived` |
| `repository.ts` | `replaceChecklist` upserts rows in `HVCG_DocumentRequests`; `assertGraphWriteAllowed` blocks SYN* unless `INTEGRATION_CAPITAL_ALLOW_SYNTHETIC_GRAPH=true` |

**Important:** Graph transport is **list items only**. No `/drives/.../content` or `createUploadSession`. Documents overlay (`state.documents`, `state.reviews`) is **not** written to SharePoint — kept in Hub overlay inside `AsyncCapitalStore`.

### 1.4 Hub PM file / Graph adapters (adjacent reuse)

**Fabric file index** — `apps/atlas-integration-api/src/pm/sharepoint/fabric/files.ts`

- Scans known HVCG business sites (Clients, Knowledge, HQ) via drive **delta** and bounded search.
- **Metadata + link only** — explicitly no binary copy.
- Classifies via `fabric/classify.ts`; restricted financial paths → `ingest: 'metadata_link'`.
- Writes index rows to `HVCG_Communications` via `upsertCommunicationIndex` (`provenanceSource: 'sharepoint-file'`).
- Client library detection: regex `\bHVCG_([A-Z]{2,8}\d{2})\b`.

**Client Workspace** — `apps/atlas-integration-api/src/pm/sharepoint/workspace.ts`

- Surfaces `HVCG_Clients.SharePointLibraryUrl` + fabric file-index rows as document evidence.
- Does **not** query `HVCG_DocumentRequests` (not in PM workspace grant set).

**Integration-core `uploadFile`:** declared on adapter interface; base implementation throws `UnsupportedOperationError`. No capital or PM Hub route exposes SharePoint upload.

### 1.5 Capital document intelligence (ingest semantics, not storage)

**Core:** `packages/atlas-capital-core/src/document-intelligence.ts`  
**Hub routes:**

| Method | Path | Role |
|--------|------|------|
| POST | `/api/capital/opportunities/:id/documents` | Associate metadata to opportunity; optional `webUrl`, `sha256`, `checklistItemId` |
| POST | `/api/capital/opportunities/:id/documents/:docId/review` | Advisory review; blocks `send` / `sendToClient` / `externalSend` |
| POST | `/api/capital/opportunities/:id/document-intelligence` | Full pipeline; draft client request only |
| GET | `/api/capital/opportunities/:id/missing-request` | Draft missing-doc message |

Collection today is **metadata association** (`CapitalDocument` in Hub state), not SharePoint upload. Linking a checklist row sets `FileLink` from `webUrl` when checklist is saved to Graph.

### 1.6 Upload-link policy (human / flow, not Hub API)

From `docs/security/SECURITY_MODEL.md` and `CAPITAL_DOCUMENT_ENGINE.md`:

- V1 default: **upload via request links**, not standing client SharePoint membership.
- Anonymous links denied on HVCG-Clients.
- Guest / specific-people links allowed with expiration (human-operated).
- `HVCG_MissingDocumentReminders` flow exists as scaffold; **Off** in safety controls — no automated client email from Hub.

`consolidateMissingRequest` body text directs clients to “secure HVCG client repository” — send remains human.

### 1.7 Local AI

**Routes:** `/api/local-ai/health`, `/api/local-ai/flags`, `/api/local-ai/complete`  
**Adapter:** `apps/atlas-integration-api/src/local-ai/adapter.ts`

- Ollama text completion only (`sourceContent` string in, JSON out).
- No file upload, no SharePoint staging, no sqlite document store.
- Extraction for capital must remain caller-supplied facts with `SourceRef`; AI cannot land as `VERIFIED` (contract).

Future OCR/extraction should route through existing `HVCG_AIJobs` / `HVCG_AIOutputs` human-gated pattern — not a new storage layer.

---

## 2. Access control / ClientCode scoping

### 2.1 Hub application layer

**Rules:** `packages/atlas-capital-core/src/authz.ts`, `apps/atlas-integration-api/src/capital/authz.ts`

| Rule | Behavior |
|------|----------|
| Canonical `ClientCode` | `^[A-Z][A-Z0-9]{2,15}$` only |
| `*` | Never an entitlement |
| Owner / Administrator | **Do not** bypass client scope |
| SYN* codes | Labeled QA (`isSyntheticClientCode`); real clients never fixtures |
| Graph writes for SYN* | Blocked unless `INTEGRATION_CAPITAL_ALLOW_SYNTHETIC_GRAPH=true` (pilot only) |

Every capital route resolves opportunity → `clientCode` → `assertCanAccessClient(principal, clientCode)`.

### 2.2 SharePoint library ACLs

From library template permissions:

- `HVCG-Role-Owner`, `Administrator`, `OperationsManager` — Edit / Full Control
- `HVCG-Client-{ClientCode}` — Edit on that client's library
- Break inheritance; no anonymous links

Entra group `HVCG-Client-SYN01` is the QA pattern for SYN01 pilot (`deployment/scripts/Enable-HVCGCapitalMinSlice.ps1`, `Set-HVCGCapitalHubAppSettings.ps1`).

### 2.3 Graph Selected grants (capital)

Capital lists are **not** in the PM four-list allowlist. Separate env vars:

- `INTEGRATION_CAPITAL_OPPORTUNITIES_LIST_ID`
- `INTEGRATION_CAPITAL_DOCUMENT_REQUESTS_LIST_ID`
- `INTEGRATION_CAPITAL_LENDER_OUTREACH_LIST_ID`
- Optional: `INTEGRATION_CAPITAL_LENDERS_LIST_ID`, `INTEGRATION_CAPITAL_CLIENTS_LIST_ID`

Hub MI must have `Lists.SelectedOperations.Selected` on these lists before production Graph writes. Default production backend: **unavailable** (503).

### 2.4 Fabric / restricted content

Financial library paths (tax, bank, payroll, etc.) classify as `RESTRICTED` → **metadata and source link only** in communications index. Capital ingest must not pull restricted binaries into Hub or git.

---

## 3. Minimum ingest metadata mapping

Goal: associate an on-disk SharePoint file with a capital checklist row **without new lists**.

### 3.1 Ingest payload → Hub `CapitalDocument` (overlay)

`POST /api/capital/opportunities/:id/documents`

| Input field | Hub `CapitalDocument` | Notes |
|-------------|----------------------|-------|
| `fileName` | `fileName` | Required |
| `webUrl` | `webUrl` | SharePoint file URL after human/flow upload |
| `sha256` | `sha256` | Optional integrity |
| `checklistItemId` | `checklistItemId` | Links to checklist row id in Hub state |
| `documentType` | `documentType` | Optional; else `classifyDocumentName(fileName)` |
| `contentType` | `contentType` | Default `application/pdf` |
| `sizeBytes` | `sizeBytes` | |
| `source` | `source` | Default `client-upload` |
| (derived) | `clientCode` | From opportunity |
| (derived) | `capitalOpportunityId` | From route |
| (derived) | `associatedBy` | Principal email |

If linked checklist item is `MISSING` or `REQUESTED`, status → `RECEIVED` (not `ACCEPTED`).

### 3.2 Hub checklist → `HVCG_DocumentRequests` (Graph persist)

`checklistItemToFields` in `map.ts` (core fields always written when column exists):

| Hub `ChecklistItem` | SharePoint field |
|---------------------|------------------|
| `name` / `itemKey` | `Title` |
| `clientCode` | `ClientCode` |
| opportunity SP id | `CapitalOpportunityIdLookupId` |
| `status` | `RequestStatus` (mapped) |
| `itemKey` | `TemplateItemKey` |
| `itemKey` | `HVCG_IdempotencyKey` = `cap-chk\|{oppId}\|{itemKey}` |
| `category` | `DocumentCategory` (via `mapDocumentCategory`) |
| `status === OUTDATED` | `IsStale` |
| `expiration` | `ExpirationDate` |
| `receivedAt` | `DateReceived` |
| `fileLink` | `FileLink` as `{ Url, Description }` |
| `itemKey` | `ChecklistItemKey` (additive — only if tenant column exists) |
| `status` | `ChecklistStatus` (additive) |

### 3.3 DocumentCategory ↔ FolderTarget (reuse existing choices)

Power Automate `HVCG_CreateDocumentRequests` already sets `FolderTarget` from template (e.g. Tax Returns → `05 - Tax Returns`). Capital checklist categories map to live `DocumentCategory` choices in `map.ts` (`LIVE_DOCUMENT_CATEGORIES`).

Suggested reuse mapping when ingesting (derive `FolderTarget` from category — **not yet implemented in Hub**):

| DocumentCategory | FolderTarget |
|------------------|--------------|
| Engagement Administration | `00 - Engagement Administration` |
| Corporate | `01 - Corporate Documents` |
| Ownership | `02 - Ownership and Management` |
| Historical Financials | `03 - Historical Financials` |
| Current Financials | `04 - Current Financials` |
| Tax Returns | `05 - Tax Returns` |
| Bank Statements | `06 - Bank Statements` |
| Debt Schedule | `07 - Debt Schedule` |
| AR | `08 - Accounts Receivable` |
| AP | `09 - Accounts Payable` |
| Payroll | `10 - Payroll and Employees` |
| Contracts | `11 - Contracts` |
| Real Estate | `12 - Real Estate` |
| Insurance | `13 - Insurance` |
| Legal | `14 - Legal and Compliance` |
| Other | Best-effort from `FolderTarget` on request row or `19 - Deliverables` |

Lender package assembly should use folder **16 - Lender Package** (`HVCG_CapitalPackageDocument` content type exists for package-kind metadata).

### 3.4 Completeness vs request (contract grades)

Document intelligence emits completeness relative to checklist — not lender policy:

`SATISFIED | LIKELY_SATISFIED_NEEDS_REVIEW | INCOMPLETE | OUTDATED | WRONG_ENTITY | WRONG_PERIOD | CONFLICTING | NOT_MATCHED | UNKNOWN`

These map to checklist/review overlay fields; only status-like outcomes persist to `RequestStatus` / `ChecklistStatus` / `IsStale` on `HVCG_DocumentRequests`.

### 3.5 Fields in schema but not on Hub write path yet

| Field | Schema | Hub `CORE_CHECKLIST_FIELDS` | Action |
|-------|--------|----------------------------|--------|
| `SHA256` | Yes | **No** | Extend map when bytes hash known — no new list |
| `VersionNumber` | Yes | **No** | Extend map on re-ingest — no new list |
| `FolderTarget` | Yes | **No** | Derive from category on write — no new list |
| `VerificationStatus` | Yes | **No** | Human confirmation only — no new list |

---

## 4. SYN01-safe ingest path

SYN01 is labeled QA. This path avoids production client data and blocks unintended Graph writes.

### 4.1 Preconditions

1. **Entitlement:** Principal has `SYN01` in `allowedClientIds` via `HVCG-Client-SYN01` → `{groupId}:SYN01` in `INTEGRATION_CLIENT_ENTITLEMENT_GROUPS`.
2. **Client row:** `HVCG_Clients` item with `ClientCode=SYN01`, title contains `SYNTHETIC QA` (see `Enable-HVCGCapitalMinSlice.ps1`).
3. **Backend:**
   - **Local/CI:** `INTEGRATION_CAPITAL_BACKEND=development-json` — full overlay writes; no SharePoint.
   - **Graph pilot:** `INTEGRATION_CAPITAL_BACKEND=sharepoint` + `INTEGRATION_CAPITAL_ALLOW_SYNTHETIC_GRAPH=true` only; disable flag after pilot.
4. **Files:** Use synthetic filenames only (e.g. `SYN01 Bank Statement 2026-03.pdf` in tests). **Never commit real client PDFs to git.**

### 4.2 End-to-end flow (metadata-first)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Human or PnP/flow places file in HVCG_SYN01 library        │
│    (folder from FolderTarget / DocumentCategory)               │
└────────────────────────────┬────────────────────────────────────┘
                             │ webUrl (+ optional sha256)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. POST …/opportunities/{id}/documents                         │
│    Hub checks ClientCode entitlement + SYN synthetic rules       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. POST …/document-intelligence (send/sendToClient → 422)       │
│    Classification, period, entity, stale, conflicts — advisory   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. store.save() → checklist rows → HVCG_DocumentRequests       │
│    FileLink = SharePoint URL; RequestStatus from checklist       │
│    (Graph only if sharepoint backend + allowSyntheticGraph)      │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Explicit blocks (fail-closed)

| Action | Result |
|--------|--------|
| `send` / `sendToClient` / `externalSend` on intelligence/review | 422 |
| SYN* Graph write without `allowSyntheticGraph` | 403 |
| Unentitled ClientCode | 403 |
| Malformed ClientCode | 422 |
| Production `development-json` backend | Config rejected |

### 4.4 What SYN01 pilot validates

- Checklist upsert idempotency via `HVCG_IdempotencyKey`
- `FileLink` round-trip (`asUrl` on read)
- Client isolation (SYN01 principal cannot read other clients' opportunities)
- Document intelligence pipeline on synthetic filenames
- **Not validated by A1:** automated upload, OCR, email reminders, lender send

---

## 5. Schema additions — only if existing is inadequate

**Orchestrator rule:** No new lists unless proven inadequate. Current assessment: **existing structures suffice** for Phase 2 minimum ingest.

### 5.1 Do not provision

| Artifact | Reason |
|----------|--------|
| `HVCG_CapitalDocumentReviews` | Overlay reviews are process state; engine doc explicitly defers |
| New document library | Per-client `HVCG_{ClientCode}` already exists |
| Capital-specific upload list | `FileLink` + library metadata covers pointer needs |

### 5.2 Extend existing columns (owner provisioning — not A1)

If stable Graph item reference is needed beyond URL strings, prefer **one** additive column on `HVCG_DocumentRequests` only after `FileLink` proven insufficient:

| Proposed field | Type | When needed |
|----------------|------|-------------|
| `DriveItemId` | Text (indexed) | URL-only `FileLink` breaks on move/rename; need Graph `/drives/{id}/items/{id}` stability |

Do **not** provision until a concrete failure mode is recorded. `FileLink` + `SHA256` may be enough for V1.

### 5.3 Hub map extensions (code — not schema)

These use **existing** list columns:

- Write `SHA256` from `CapitalDocument.sha256`
- Write `VersionNumber` on re-ingest
- Write `FolderTarget` from category mapping
- Write `VerificationStatus` only on human override path (never from AI)

---

## 6. CONFIRMED reuse vs gaps

### CONFIRMED REUSE

1. **`HVCG_{ClientCode}` libraries** — binary storage, folder taxonomy, ACL model, `SharePointLibraryUrl` on client.
2. **`HVCG_DocumentRequests`** — checklist/register SoR with `FileLink`, `TemplateItemKey`, `CapitalOpportunityId`, `ClientCode`, freshness fields.
3. **Hub capital Graph adapter** — checklist CRUD with allowlist, synthetic guard, idempotency.
4. **`POST …/documents` + document-intelligence** — metadata association and advisory pipeline.
5. **PM fabric file index** — discover existing library files as metadata+link (future bridge to capital collection).
6. **`HVCG_ClientDocument` / `HVCG_CapitalPackageDocument` content types** — file-level metadata on upload (via SharePoint native upload, not Hub).
7. **Security model** — ClientCode entitlements, no admin bypass, request-link-first upload policy.
8. **Power Automate `HVCG_CreateClientWorkspace` / `HVCG_CreateDocumentRequests`** — library + request row patterns.

### CONFIRMED GAPS

1. **No Hub API to upload bytes to SharePoint** — ingest is metadata-only; files must land via human, PnP, or Power Automate first.
2. **No Hub API to mint upload/request sharing links** — policy documented; implementation deferred.
3. **`CapitalDocument` and `DocumentReview` not in SharePoint SoR** — intentional overlay; lost on Graph-only hydrate unless re-associated.
4. **`SHA256`, `VersionNumber`, `FolderTarget` not written by `checklistItemToFields`** — schema ready, map incomplete.
5. **`ChecklistStatus` / additive columns may be absent on live tenant** — Hub falls back to `RequestStatus` mapping (`settings.optionalColumns`).
6. **Fabric file index not connected to capital document-intelligence** — separate code paths.
7. **Local AI has no document staging** — text completion only.
8. **`HVCG_DocumentRequests` not in PM workspace grants** — capital module must use capital routes, not PM workspace, for checklist/file association.
9. **`uploadFile` integration adapter** — unsupported at base layer; no SharePoint provider implementation in Hub.

### NOT A GAP (explicit non-goals)

- OCR / binary parsing in Hub (stubbed; caller facts only)
- Autonomous client email or external send
- New document database or Dataverse migration
- Real client files in git fixtures

---

## 7. Recommended next streams (post-A1)

| Stream | Work |
|--------|------|
| A2/A3 | Extend `checklistItemToFields` for `SHA256`, `VersionNumber`, `FolderTarget`; optional fabric→capital collection bridge |
| D1 | Drive upload or sharing-link API **only** with new Graph scopes + security review (out of A1 scope) |
| Owner | Provision additive columns on live `HVCG_DocumentRequests`; Selected grants; pilot SYN01 Graph write then disable `allowSyntheticGraph` |

---

## 8. References (absolute paths)

| Asset | Path |
|-------|------|
| Document requests schema | `/Volumes/MacMiniPro2TB/HVCG Project Management System/.worktrees/atlas-capital-operations/src/sharepoint/lists/HVCG_DocumentRequests.json` |
| Client library template | `/Volumes/MacMiniPro2TB/HVCG Project Management System/.worktrees/atlas-capital-operations/src/sharepoint/libraries/HVCG_ClientLibrary.template.json` |
| Capital SP map | `/Volumes/MacMiniPro2TB/HVCG Project Management System/.worktrees/atlas-capital-operations/apps/atlas-integration-api/src/capital/sharepoint/map.ts` |
| Capital SP repository | `/Volumes/MacMiniPro2TB/HVCG Project Management System/.worktrees/atlas-capital-operations/apps/atlas-integration-api/src/capital/sharepoint/repository.ts` |
| Fabric file index | `/Volumes/MacMiniPro2TB/HVCG Project Management System/.worktrees/atlas-capital-operations/apps/atlas-integration-api/src/pm/sharepoint/fabric/files.ts` |
| Document intelligence | `/Volumes/MacMiniPro2TB/HVCG Project Management System/.worktrees/atlas-capital-operations/packages/atlas-capital-core/src/document-intelligence.ts` |
| Capital service (addDocument) | `/Volumes/MacMiniPro2TB/HVCG Project Management System/.worktrees/atlas-capital-operations/apps/atlas-integration-api/src/capital/service.ts` |
| Phase 2 contracts | `/Volumes/MacMiniPro2TB/HVCG Project Management System/.worktrees/atlas-capital-operations/docs/CAPITAL_PHASE2_CONTRACTS.md` |
