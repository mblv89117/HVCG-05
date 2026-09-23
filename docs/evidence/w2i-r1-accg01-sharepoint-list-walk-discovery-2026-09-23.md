# W2I-R1 discovery — ACCG01 SharePoint workspace list-walk availability

**Status:** DISCOVERY ONLY. Not an implementation. **LIVE_CERT_PASS is not claimed.**

**Code under inspection:** `production/atlas-core` @ `4080408004851717d35094d51caf7c5a63fc7780` (PR #234, W2I ACCG01 documents-index honesty). This matches the Hub SHA named in the mission.

**Method:** Static trace of Hub workspace load, SharePoint list walk, documents-index honesty, and the Elite banner. No live Graph call. No Azure log export is in this repo. No list item count was invented.

**Honesty already verified (not re-litigated):** Ask Atlas documents for ACCG01 returns `documents=SOURCE_UNAVAILABLE` when the SharePoint list walk is incomplete. Authority stays `canExecute=false`, `capitalSubmit=false`, `GLOBAL_AUTO_RESPOND=false`. Recovered HVS names are not current or LIKELY Missing. That path is PASS. This note explains why the entitled workspace still cannot finish the list walk.

---

## 1. ROOT_CAUSE class

**Primary: B — pagination / nextLink / page cap.**

**Amplifier: C — one incomplete list walk fails the entire workspace, so documents stay `SOURCE_UNAVAILABLE`.**

The live Elite banner text is produced by exactly one error:

- Class: `ListWalkTruncatedError`
- Hub HTTP status: **503**
- Hub code: **`LIST_WALK_TRUNCATED`**
- Message: `SharePoint list walk stopped before the list was complete.`
- Classification: `unavailable`

That string is set in `apps/atlas-integration-api/src/pm/sharepoint/errors.ts` and is not used for permission, timeout, missing list, or token failure.

The same class has two reasons. **The live banner does not say which one fired.** `toErrorBody()` omits `ListWalkTruncatedError.reason`, the list id, the list display name, and the page count.

| Reason | When it throws | What it implies |
|---|---|---|
| `repeated_next_link` | The same `@odata.nextLink` is about to be fetched again | Graph returned HTTP 200 with a nextLink that did not advance. Can happen before the page cap. |
| `page_cap` | 80 item pages were fetched and the last page still has a nextLink | The walk is locally stopped. With `$top=100` on the first page, a full-size walk has seen up to 8,000 items and is still incomplete. |

Both reasons are thrown inside `SharePointPmService.listAll` (`apps/atlas-integration-api/src/pm/sharepoint/repository.ts`) before the list cache stores anything. A partial page set is not cached as a successful complete list. W2C route tests (`cycle` and `page_cap` on `HVCG_Communications`) require the Ask Atlas answer to stay `SOURCE_UNAVAILABLE` and to omit partial file titles.

### Ruled out for this banner

| Class | Why it is not this banner |
|---|---|
| **A. Permission / Graph / MI / site-list grant** | HTTP 401/403 from Graph becomes `PM_BACKEND_UNAVAILABLE` with `SharePoint PM permission or token was rejected (HTTP 401\|403).` Token acquisition failure is `Managed identity token acquisition failed.` A rejected nextLink is `SharePoint PM pagination link was rejected.` None of those strings are the live banner. |
| **D. Timeout / throttling as the thrown error** | Per-request Graph timeout is 15s (`TIMEOUT_MS` in `graph.ts`). Abort becomes `SharePoint PM Graph transport failed (HTTP 0).` HTTP 429 is not retried and is mapped through `formatGraphWriteFailure`, not `LIST_WALK_TRUNCATED`. Ask Atlas has a separate 20s deadline (`ATLAS_OPERATOR_BRIEF_DEADLINE_MS`, default 20,000). That deadline is swallowed and still answers `SOURCE_UNAVAILABLE`, but it does not produce the list-walk sentence. `GET /api/pm/clients/:code/workspace` is not wrapped in that deadline. The Elite banner therefore means the workspace GET finished in `listAll` with truncation, not that the 20s brief timer fired. |
| **E. Stale list id / renamed list / schema abort** | Unknown list id is rejected before Graph (`SharePoint PM list is not in the approved resource allowlist.`). Graph HTTP 404 becomes `not_found`. Those are different bodies. |

`$filter` is intentionally never sent. `graph.ts` documents that `Lists.SelectedOperations.Selected` treats `fields/` filters as HTTP 403. ClientCode selection happens in memory after a full list walk. That is a class-A constraint on how class B is reached. It is not the error the banner is showing.

---

## 2. First failing operation

**Operation:** `SharePointPmService.listAll` stops after successful Graph item pages, then throws `ListWalkTruncatedError`.

**Call chain:**

1. Elite `LiveClientDetailPage` → `GET /api/pm/clients/{ClientCode}/workspace`
2. `handleSharePointPmRoutes` → `loadEntitledClientWorkspaceTruth`
3. `buildSharePointClientWorkspace`
4. Sequential full-list walks, then a parallel set:
   - `authorizeClient` → `listAll(clientsListId)` (in-memory `ClientCode` match; Graph is unfiltered)
   - `listAuthorizedProjects` → `listAll(projectsListId)`
   - `listAuthorizedTasks` → `listAll(tasksListId)` (and another projects walk, normally a cache hit)
   - `listWorkspaceCollections` → `Promise.all` of `listAll` for every **configured** id among:
     - `HVCG_Communications` (`INTEGRATION_PM_COMMUNICATIONS_LIST_ID`)
     - `HVCG_Meetings`
     - `HVCG_Engagements`
     - `HVCG_Deliverables`
     - `HVCG_Decisions`
     - `HVCG_Risks`
     - `HVCG_Contacts`
5. The first `listAll` that throws rejects the workspace builder. `fail()` returns HTTP 503 `LIST_WALK_TRUNCATED`.
6. Elite puts that message in the error description. Title is `Client workspace unavailable`.
7. Ask Atlas `finishClientOperatingBriefBeforeDesk` catches any workspace load failure and, for a documents question, returns `documentIndexUnavailableAnswer`: `documents=SOURCE_UNAVAILABLE`. Partial file-index rows are not composed.

**Graph request (first page):**

`GET https://graph.microsoft.com/v1.0/sites/{INTEGRATION_PM_SHAREPOINT_SITE_ID}/lists/{listId}/items?$expand=fields&$top=100`

**Later pages:** the prior response’s `@odata.nextLink`, after `assertSafeNextLink` (HTTPS, host `graph.microsoft.com`, same site, same list, `/items` only). `$top` on follow-up pages is whatever Graph put on that link.

**HTTP status of the failing Graph call:** not a Graph error status. Truncation is thrown only after `listItems` returns HTTP 200 pages that still expose a nextLink. The failure status the client sees is Hub **503**.

**Graph error code:** none. This stop is local.

**Correlation / request id:** not captured. `graphFetch` does not read `request-id` or `client-request-id`. None can be reported from this trace.

**List name:** **not in the 503 body.** The thrown error has no list id. This discovery does not name a live list as fact.

**Leading candidate, not a capture:** `HVCG_Communications`. Reasons that stay inside the repo:

- `listAll`’s comment says file-index lists can be thousands of rows and that a repeated nextLink or the page cap must not be cached as complete.
- Current document truth is entitled `HVCG_Communications` / file-index rows (`clientTruth.ts`, `documentIndexUnavailableAnswer`).
- W2C tests drive `cycle` and `page_cap` only on the communications list and require whole-workspace `SOURCE_UNAVAILABLE`.

Clients, projects, or tasks could throw the same error first if one of those lists does not finish within 80 pages or repeats a nextLink. The payload cannot distinguish that. Do not treat the communications candidate as a measured item count.

**Retry:** `graphFetch` has no retry and no `Retry-After` handling. The list cache stores only a loader that returns. Truncation deletes the in-flight entry and is not stored (default TTL 60s applies only to a finished walk; `INTEGRATION_PM_LIST_CACHE_TTL_MS=0` disables the cache). Elite Retry calls `GET` workspace again, which walks again. W2C asserts a second Ask Atlas call still increments communications fetches. The failure is deterministic for a list whose paging does not terminate inside the cap. It is not a one-off timeout.

**“Sign in required” on the same screen:** not a 401. `LiveClientDetailPage` uses subtitle `Sign in required` on every non-401/403 workspace error, including this 503. The 401 branch is a different screen (`Authenticated access required` / `Hub returned 401`). Do not treat the coupled subtitle as an auth or MFA failure.

---

## 3. ACCG01-only vs systemic

**Systemic for every entitled client workspace that walks the same lists.**

`listAll` is keyed by list id, not ClientCode. There is no ACCG01 branch in the walker, the workspace builder, or the truncation error. ACCG01 is the cert client that surfaces it. Any other entitled ClientCode whose workspace GET reaches the same non-terminating list fails the same way.

An unset optional list id does not throw. `load()` returns `PARTIAL_SOURCE_DATA_NOT_FOUND` / not queried (`{list} is not in the Hub Graph Selected allowlist...`). A **configured** list that truncates throws, and `Promise.all` fails the whole collection load. There is no per-list catch.

| List role | If the id is unset | If the id is set and the walk truncates |
|---|---|---|
| Clients, projects, tasks | Workspace cannot be configured (settings require those ids) | Entire workspace GET 503. Not optional. |
| Communications (file-index / documents) | Section not queried. Documents can still point at `HVCG_Clients.SharePointLibraryUrl` without being a file-index. | Entire workspace 503. Ask Atlas documents become `SOURCE_UNAVAILABLE`, not `MISSING`. Partial titles are dropped. This is required for honesty. |
| Meetings, engagements, deliverables, decisions, risks, contacts | That section is not queried (`PARTIAL_SOURCE_DATA_NOT_FOUND`) | Entire workspace 503, including documents, even if the file-index itself would have completed. |

Unsetting `INTEGRATION_PM_COMMUNICATIONS_LIST_ID` to avoid the walk would skip the current document index and can surface `documents=MISSING`. That weakens fail-closed honesty. Do not do it to green a cert.

---

## 4. Recommended remediation (Owner preference order)

### (1) Config / entitlement correction — do not change grants on this evidence

The banner is not a grant rejection. Do not rotate list ids, add `$filter`, or change ClientCode routing to make ACCG01 load. Do not clear a configured communications list id so the index looks empty.

Env that bounds the walk (values are App Service settings, not in git):

- `INTEGRATION_PM_BACKEND=sharepoint`
- `INTEGRATION_PM_SHAREPOINT_SITE_ID`
- `INTEGRATION_PM_CLIENTS_LIST_ID`, `INTEGRATION_PM_PROJECTS_LIST_ID`, `INTEGRATION_PM_TASKS_LIST_ID`, `INTEGRATION_PM_MILESTONES_LIST_ID`
- Optional workspace lists, especially `INTEGRATION_PM_COMMUNICATIONS_LIST_ID`
- `AZURE_CLIENT_ID` (user-assigned managed identity for the Graph token)
- `INTEGRATION_PM_LIST_CACHE_TTL_MS` (default 60,000; `0` disables)
- `ATLAS_OPERATOR_BRIEF_DEADLINE_MS` (Ask Atlas only; default 20,000; clamp 200–60,000)

Token path: App Service managed identity local endpoint, resource `https://graph.microsoft.com`, client id `AZURE_CLIENT_ID`. No Hub client secret.

### (2) Deterministic repo / list-walk bug fix — diagnostic fields only, not a cap raise

No off-by-one was found that marks a finished list incomplete. The cap is intentional fail-closed. Raising `maxPages` (80) or `$top` (100, hard-capped in `graph.ts`) is **not** recommended. Owner previously treated blind page-cap / `$filter` / list-grant churn as admin-sensitive, and this repo has no measured item count that proves the cap is the live subtype.

The deterministic gap that blocks remediation is observability: the 503 drops `reason` and list identity. A later bounded change may add only:

- list display name (the `HVCG_*` name already passed into `load`, not a secret)
- `reason`: `page_cap` or `repeated_next_link`
- pages fetched (integer)

Do not add nextLink URLs, skiptokens, tokens, or item titles to the body. Do not return the partial pages as `COMPLETE`, `MISSING`, or `INDEXED`.

That change does not make the walk succeed and does not achieve `LIVE_CERT_PASS`. It is what makes (4) or a measured cap decision possible.

### (3) Bounded retry / backoff — not indicated

Retrying the same non-terminating walk repeats 503. There is no 429 on this banner to back off from. Do not add a retry that eventually treats a partial walk as complete.

### (4) Per-list fault isolation — not yet

Safe only after a 503 names the list and the reason.

- If the list is `HVCG_Communications`, isolation must keep documents at `SOURCE_UNAVAILABLE` and must not emit `documents=MISSING` or recovered HVS names. Partial file titles stay uncached and unquoted. That matches today’s tests. Isolating communications does not by itself certify the document index.
- If the list is a different optional section, that section can stay explicit not-complete (`PARTIAL_SOURCE_DATA_NOT_FOUND` or an explicit unavailable reason). Documents may then be `INDEXED` or `MISSING` only from a **finished** communications walk. Do not implement this until the list name is in the error.

### (5) Infra / permission correction — not indicated by this banner

Do not start admin consent, new Graph scopes, or list-grant edits for `LIST_WALK_TRUNCATED`. A later capture of HTTP 401/403 would be a different incident (class A) and needs its own discovery.

---

## 5. Owner MFA / admin consent

**Not required for this root cause.** No portal, menu, or consent steps are prescribed. The live failure is a local stop after HTTP 200 item pages, not an interactive sign-in or an admin-consent denial.

---

## 6. If a code change is made later

**Do not implement in this discovery.**

**Bounded scope:** serialize list name, truncation reason, and page count on `LIST_WALK_TRUNCATED`. No walker cap change. No `$filter`. No cache of partial lists. No honesty-copy change.

**Files:**

- `apps/atlas-integration-api/src/pm/sharepoint/errors.ts` (`toErrorBody` / `ListWalkTruncatedError`)
- `apps/atlas-integration-api/src/pm/sharepoint/repository.ts` (`listAll` throw site only)
- Tests beside `apps/atlas-integration-api/tests/w2c-accg01-route-honesty.test.ts` and `w2i-accg01-documents-index-honesty.test.ts`

**Regression matrix:**

| Case | Required result |
|---|---|
| Fail-closed unknown ClientCode | 404 `not_found`. No workspace body. |
| Cross-client rows | ACCG01 answers do not include PDG01 / HFD01 titles. |
| Communications `page_cap` or repeated nextLink | `workspaceTruth=SOURCE_UNAVAILABLE`, `documents=SOURCE_UNAVAILABLE`, partial file title absent, second call does not cache the partial walk as complete. |
| Graph 401/403, transport abort, brief deadline | Still `SOURCE_UNAVAILABLE` for documents. Not `MISSING`. |
| Successful full walk, zero file-index rows | `documents=MISSING`. No invented filenames. Recovered HVS not current. |
| Successful full walk, entitled file-index rows | `documents=INDEXED` with those titles only. |
| Authority | `canExecute=false`, `capitalSubmit=false`, `GLOBAL_AUTO_RESPOND=false`. |
| Optional list id unset | That section `queried: false` / `PARTIAL_SOURCE_DATA_NOT_FOUND`. Other finished sections stay honest. |

---

## 7. What not to change

- Do not weaken `SOURCE_UNAVAILABLE` or invent `MISSING` / `INDEXED` to reach `LIVE_CERT_PASS`.
- Do not quote recovered HVS filenames as the current document index.
- Do not change ClientCode routing or entitlement checks.
- Do not send Graph `$filter` on these list walks.
- Do not raise the page cap or `$top` without a measured item count and an explicit Owner decision.
- Do not cache a truncated walk as TTL success.
- Do not turn one optional list’s truncation into a silent empty section.
- Do not treat the Elite subtitle `Sign in required` on this 503 as an auth defect to paper over.
- Do not redeploy Hub or Elite only to equalize SHAs.

---

## Evidence map

| Fact | Where |
|---|---|
| Banner sentence | `ListWalkTruncatedError` message in `src/pm/sharepoint/errors.ts` |
| Page cap 80, `$top` 100, repeated nextLink | `SharePointPmService.listAll` in `src/pm/sharepoint/repository.ts` |
| Whole-workspace failure | `listWorkspaceCollections` `Promise.all` has no per-list catch; `buildSharePointClientWorkspace` does not catch |
| 503 body omits reason | `toErrorBody` |
| Unset list is partial, not a throw | `ungranted` / `load()` when `listId` is missing |
| No `$filter` | `createGraphTransport.listItems` in `src/pm/sharepoint/graph.ts` |
| 15s Graph timeout, no request-id, no retry | `graphFetch` in `graph.ts` |
| Truncation not cached | `createListItemCache` catch path; W2C test `repeated nextLink or page-cap file-index walks are SOURCE_UNAVAILABLE and are not cached complete` |
| Documents honesty | `documentIndexUnavailableAnswer` in `src/pm/operatorDesk/askAtlasClientOperatingBrief.ts` |
| Elite subtitle vs 401 | `LiveClientDetailPage.tsx`: 503 uses subtitle `Sign in required` plus title `Client workspace unavailable`; 401 is a different branch |
