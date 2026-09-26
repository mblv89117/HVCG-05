# W2J discovery — Ask Atlas drawer continuity (financial / client / bank)

**Status:** DISCOVERY ONLY. No implementation, merge, or deploy in this package.
**Authority:** OBSERVE / READ. `canExecute=false`. `capitalSubmit=false`. `GLOBAL_AUTO_RESPOND=false`.
**As of:** 2026-09-23.
**Base branch:** `production/atlas-core` @ `4080408004851717d35094d51caf7c5a63fc7780` (W2I PR #234).

This document is the ready-to-launch mission for a later implementation agent. It does not change runtime behavior.

## Production tips (verified this session)

| Surface | SHA | How verified | Meaning |
|---|---|---|---|
| Hub `/health.commit` | `4080408004851717d35094d51caf7c5a63fc7780` | `GET https://app-atlas-integration-hub.azurewebsites.net/health` | W2I documents-index honesty is live on Hub. |
| Elite SWA bundle | `74e106afe28cc98e7dccab30ef0a5aa5724d82e1` | `scripts/read-live-elite-sha.sh` method against `https://zealous-rock-0090c7e1e.7.azurestaticapps.net` (`assets/index-UQVXb8yk.js`) | W2H-era Elite drawer fix (PR #233, capital + document stay). |
| Git tip `production/atlas-core` | `4080408004851717d35094d51caf7c5a63fc7780` | `git rev-parse` after `git fetch origin production/atlas-core` | Same as live Hub. |

The only commits between the live Elite SHA and the live Hub SHA are W2I Hub files:

- `apps/atlas-integration-api/src/pm/commercialContext/clientTruth.ts`
- `apps/atlas-integration-api/src/pm/commercialContext/liveClientPilot.ts`
- `apps/atlas-integration-api/src/pm/operatorDesk/askAtlasClientOperatingBrief.ts`
- `apps/atlas-integration-api/tests/w2i-accg01-documents-index-honesty.test.ts`

Do not redeploy Elite only to make its SHA match Hub. The next Elite deploy should be this W2J drawer change (or another real Elite change), branched from `production/atlas-core` tip `40804080`.

## 1. Recommended package

**Id:** `ATLAS-W2J-ASK-ATLAS-DRAWER-CONTINUITY`

**Business outcome:** A signed Owner asking Ask Atlas about financials, a client, or a bank stays in the drawer and reads the Hub answer already certified in W2F–W2I, instead of being dropped onto a deferred Financials page, the clients directory, or the Plaid Banking screen.

## 2. Why this beats the alternatives

The prior W2I-discovery runner-up is still the highest-value bounded package. It is live on Elite today.

`aiCommandNavigatePath` (`packages/atlas-design-system/src/components/aiCommandNavigate.ts`) keyword-routes before the Hub answer can be read. `GlobalAICommandPanel` calls it on every prompt, including when `onRunPrompt` is attached. `AppShell` treats any hint as “close the drawer and `navigate(path)`”.

Current live rule (Elite `74e106af` and the same helper on Hub tip `40804080`):

| Prompt contains | Live Ask Atlas (`onRunPrompt` set) | Dev stub (no runner) |
|---|---|---|
| `bank` | **leaves** → `/banking` | `/banking` |
| `document` | stays | `/documents` |
| `client` | **leaves** → `/clients` | `/clients` |
| `financial` | **leaves** → `/financials` | `/financials` |
| `capital` | stays | `/capital` |

Keyword order makes the document exception incomplete. After a live runner skips `document`, `client` is still tested. These certified questions are stolen on the live Elite GUI:

- `What does Atlas know about PDG01 financials?` contains `financial` → `/financials`. That route is `FractionalCfoWorkbench`, a deferred page that states Atlas is not the CFO system of record. Hub already answers this phrase with GCC observation-only text or `financialContext=NOT_CERTIFIED` (`w2f-gcc-source-unavailable-honesty.test.ts`). The Owner never sees that answer.
- `What documents exist for client ACCG01?` skips the document branch, then matches `client` → `/clients`. W2I `workflowAnswer` (index honesty or `SOURCE_UNAVAILABLE`) is abandoned. `Find missing documents.` stays only because it has no `client` substring.
- `What is the current capital context for ACCG01?` stays (W2H). `What is the finance picture for PDG01?` also stays, because `finance` is not the substring `financial`. The GUI is inconsistent across two W2F phrases that Hub treats as the same finance topic.
- Any `bank` substring opens `BankingConnectionsPage` (Plaid consent, cash snapshot, disconnect). That page maps workspace ids to non-canonical codes (`CCB`, `HVCG`) via `clientCodeFor`. Ask Atlas must not enter that surface from a keyword.

Reuse already in production, do not rebuild:

- W2H drawer gate for capital and documents (`aiCommandNavigatePath` + `aiCommandNavigate.test.ts`).
- W2F finance `workflowAnswer` (`financeAnswerWhenWorkspaceUnavailable`, `financials_known` / `financials_unknown`).
- W2G projects and W2H capital and W2I documents answers on the operating brief. They display only if the drawer stays open (`AppShell` returns `res.workflowAnswer`).
- Live Client already renders recorded GCC value signals through `CommercialContextPanel`. W2J does not need a second finance panel.

### Runners-up (do not start)

1. **Bank-account honesty as a new Hub domain.** A drawer that stays open for `bank` may only show the existing fail-closed attention summary (“No entitled attention items…”) because `detectTopic` does not map `bank` to finance. That is acceptable W2J PASS. A later package could add an explicit NOT_CERTIFIED bank sentence. It must not read Plaid, show balances, or change consent. Not W2J.
2. **Live Client documents section completeness.** `apps/atlas-integration-api/src/pm/sharepoint/workspace.ts` still treats a SharePoint library URL as part of the documents section. That is the W2I-R1 list-walk / index honesty surface. Do not take it in W2J.

## 3. Repo surface and branch tip

| Item | Value |
|---|---|
| Repo | `mblv89117/HVCG-05` |
| Surface | **Elite-side shared UI only.** Design-system navigate helper plus the existing Elite unit test. No Hub operator-desk change required for PASS. |
| Branch from | `production/atlas-core` @ `4080408004851717d35094d51caf7c5a63fc7780` |
| Deploy implication | Hub redeploy is not required for this package. Elite deploy is required for live-cert, and only after the drawer change is reviewed. That deploy is a real Elite fix, not SHA equalization. |

## 4. Dependency / conflict vs W2I-R1

W2I overall is PARTIAL on SharePoint workspace source availability (`SOURCE_UNAVAILABLE`). A separate W2I-R1 agent is tracing the list-walk root cause.

**No dependency.** W2J does not wait on W2I-R1. A `SOURCE_UNAVAILABLE` documents answer that remains visible in the drawer is W2J PASS.

**Do not edit these W2I / list-walk files:**

- `apps/atlas-integration-api/src/pm/sharepoint/**` (including `graph.ts` nextLink walk, `workspace.ts` file-index, `errors.ts` page cap)
- `apps/atlas-integration-api/src/pm/commercialContext/clientTruth.ts` document completeness
- `apps/atlas-integration-api/src/pm/operatorDesk/askAtlasClientOperatingBrief.ts` document-topic rendering and `documentIndexUnavailableAnswer`
- `apps/atlas-integration-api/tests/w2i-accg01-documents-index-honesty.test.ts`

W2J may mention those behaviors in tests only as expected drawer text copied from already-shipped Hub answers. It must not change how the index is walked or classified.

## 5. Implementation sketch (modules, not patches)

1. `packages/atlas-design-system/src/components/aiCommandNavigate.ts`
   - When `opts.liveAskAtlas` is true, return `null` for `bank`, `client`, and `financial` the same way the helper already returns `null` for `document` and `capital`.
   - When `opts.liveAskAtlas` is false, keep today’s dev-stub routes: `/banking`, `/documents`, `/clients`, `/financials`, `/capital`.
   - Do not add new routes. Do not special-case “open the page” inside the live runner. Page entry stays on the signed nav shell (`viewFinance`, `viewClients`).
2. `packages/atlas-design-system/src/components/SearchAndAI.tsx`
   - Keep the existing call to `aiCommandNavigatePath`. Update the comment so it names financial, client, and bank alongside capital and documents.
   - Do not change `onNavigateHint` for the “Review tasks” / “documents” buttons under an already-shown answer. Those are explicit clicks after an answer, not keyword theft.
3. `apps/atlas-elite-os/src/layout/aiCommandNavigate.test.ts`
   - Extend the W2H cases. Do not rewrite `AppShell` routing.
   - Live runner returns `null` for:
     - `What does Atlas know about PDG01 financials?`
     - `What is the finance picture for PDG01?` (control; already null)
     - `What documents exist for client ACCG01?`
     - `Summarize client.`
     - `What bank accounts are connected for ACCG01?`
     - existing capital and projects probes
   - Dev stub still returns `/financials`, `/clients`, `/banking`, `/documents`, `/capital` for open-style prompts that lack a live runner.
4. `apps/atlas-elite-os/src/layout/AppShell.tsx`
   - No behavior change expected. `onRunPrompt` already returns `res.workflowAnswer`. Confirm the test still asserts that.

No new Hub intent, no Plaid client, no identity-registry edit, no SharePoint walk edit.

## 6. Live-cert definition of PASS

Signed Microsoft Owner session on production Elite after the W2J Elite deploy. Drawer opened from the shell control `aria-label="Ask Atlas"`. Hub remains `40804080` or a later Hub tip that still contains W2F–W2I answers. Elite SHA will differ from Hub. Do not fail the cert for that difference.

PASS is all of the following. The drawer stays open and the address bar does not change to the stolen route.

1. **Finance (primary).** Prompt: `What does Atlas know about PDG01 financials?`
   - Drawer stays open. Route is not `/financials`.
   - Visible text is the Hub `workflowAnswer`: either observation-only GCC text (`copiesLedger=false`, `canExecute=false`, no invented dollars) or `financialContext=NOT_CERTIFIED` / `SOURCE_UNAVAILABLE` honesty.
   - The deferred “Financial Performance / not Atlas SoR” page is not shown as the answer.
2. **Client-word documents (W2I non-interference).** Prompt: `What documents exist for client ACCG01?`
   - Drawer stays open. Route is not `/clients`.
   - Visible text is the existing W2I answer: entitled file-index honesty, `documents=MISSING`, or `SOURCE_UNAVAILABLE`.
   - `SOURCE_UNAVAILABLE` is PASS for W2J. It is not a W2I reopen and not a reason to edit the list walk.
3. **Bank boundary.** Prompt: `What bank accounts are connected for ACCG01?`
   - Drawer stays open. Route is not `/banking`.
   - Plaid consent, cash amounts, and disconnect controls are not shown.
   - Fail-closed attention text with no invented balances is PASS. Do not require a new bank SoR sentence.
4. **Regressions.** These stay in the drawer and still show Hub text:
   - `What is the current capital context for ACCG01?` (W2H)
   - `What are the current active projects for ACCG01?` (W2G)
   - `What is the finance picture for PDG01?` (W2F phrase that already stayed)

FAIL if any of those prompts close the drawer, if finance is replaced by the deferred Financials page, if a bank prompt opens Plaid, or if the answer invents dollars, lenders, files, or completion.

Unit PASS before deploy: `apps/atlas-elite-os/src/layout/aiCommandNavigate.test.ts` (and the design-system helper it imports). No Hub SharePoint test changes required.

## 7. Explicit out of scope

- W2I-R1 SharePoint list-walk, nextLink, file-index composition, and documents-index honesty edits.
- Redeploying Elite or Hub only to equalize SHAs.
- New bank / Plaid / cash / consent / QBO behavior. No money movement.
- Replacing `/financials` (`FractionalCfoWorkbench`) with a GCC clone.
- Capital submit, lender or investor submission, client contact, `GLOBAL_AUTO_RESPOND`.
- Rewriting default Ask Atlas chips (`Build SBA package.`, `Prepare lender package.`, `Update CRM.`). The `client` gate stops `Summarize client.` from leaving the drawer; chip copy is a separate product choice.
- Identity-registry or `BankingConnectionsPage` `clientCodeFor` cleanup.
- Approval execution, workflow activate, or any `canExecute=true` path.
- Owner-gated actions. Implementation agent authority stays read-only until a reviewed PR is merged by a human. Live-cert is observe-only against the signed GUI.

## 8. Ready-to-launch mission package

```
MISSION: ATLAS-W2J-ASK-ATLAS-DRAWER-CONTINUITY
MODE: IMPLEMENT + UNIT TEST. Do not deploy. Do not merge. Do not contact clients.
BASE: production/atlas-core @ 4080408004851717d35094d51caf7c5a63fc7780
LIVE NOW: Hub 4080408004851717d35094d51caf7c5a63fc7780; Elite 74e106afe28cc98e7dccab30ef0a5aa5724d82e1.
Do not redeploy Elite to equalize SHAs. Elite deploy happens only after review, as the vehicle for this drawer fix.

PROBLEM: Live Ask Atlas closes the drawer and navigates when the prompt contains bank, client, or financial.
`What does Atlas know about PDG01 financials?` opens deferred /financials instead of the W2F Hub answer.
`What documents exist for client ACCG01?` opens /clients even though document questions are supposed to stay (the client keyword is checked after the document exception).
`bank` opens Plaid BankingConnectionsPage.

CHANGE ONLY:
- packages/atlas-design-system/src/components/aiCommandNavigate.ts
- packages/atlas-design-system/src/components/SearchAndAI.tsx (comment if needed)
- apps/atlas-elite-os/src/layout/aiCommandNavigate.test.ts

RULE: if liveAskAtlas, return null for bank, client, and financial, matching the existing document and capital gates.
Dev stub (liveAskAtlas false) keeps /banking /clients /financials /documents /capital.
AppShell already renders workflowAnswer when the drawer stays open. Do not retune Hub prompts.

DO NOT EDIT:
- apps/atlas-integration-api/src/pm/sharepoint/**
- clientTruth.ts document composition
- askAtlasClientOperatingBrief.ts document answers
- w2i-accg01-documents-index-honesty.test.ts
W2I-R1 owns the list-walk. A SOURCE_UNAVAILABLE documents answer left on screen is success.

GATES: canExecute=false, capitalSubmit=false, GLOBAL_AUTO_RESPOND=false.
No invented dollars, files, lenders, or completion. Unknown ClientCode stays fail-closed.
No Plaid, cash, consent, or money movement.

UNIT PASS: aiCommandNavigate.test.ts covers the four live prompts in section 6 plus dev-stub routes.

LIVE-CERT (after a later reviewed Elite deploy, not this mission):
Signed Owner, Ask Atlas drawer:
1. What does Atlas know about PDG01 financials? — drawer stays, Hub finance honesty, not /financials.
2. What documents exist for client ACCG01? — drawer stays, existing W2I text including SOURCE_UNAVAILABLE, not /clients.
3. What bank accounts are connected for ACCG01? — drawer stays, no Plaid, no invented balances.
4. Regression: capital context ACCG01, active projects ACCG01, finance picture PDG01 stay in the drawer.
```

## Identity and runtime boundaries (observed, not a W2J edit)

- Hub `identity/registry.ts` is additive and fail-closed for unknown ClientCode. Operating-brief scope uses entitled codes only.
- Ask Atlas runtime is the signed Hub runner (`fetchOperatorRuntime`). Elite `routeAskAtlasPrompt` sends onboarding-status phrasing to Hub and refuses unsigned prompts. Keyword navigation bypasses that runtime by closing the drawer first.
- `/financials` and `/banking` are behind `FinanceRoute` (`viewFinance`). `/clients` is behind `ClientsRoute`. Keyword hints do not check those gates before `navigate`.
- `/financials` is explicitly not GCC and not QBO/Plaid (`FractionalCfoWorkbench`).
- `/banking` is the Plaid connection surface and derives a client token from the demo workspace id, not from the fail-closed ClientCode registry. Keeping Ask Atlas off that route is the boundary W2J preserves.
- `GLOBAL_AUTO_RESPOND` remains false. This package does not add send, submit, or execute tools.
