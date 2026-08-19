# Capital Operations — Discovery

**As of:** 2026-08-18 (LIVE overlay on the 2026-08-17 discovery text)  
**Scope:** Atlas Capital Operations (internal Project Atlas module)  
**Worktree (this honesty pass):** `.worktrees/atlas-phase5-docs`  
**Honesty rule:** This document reports contracts in git **and** LIVE Hub `/health`. It does not claim ACCG01 ACL Apply ran, live lender matching, CRM operator certification, or a new platform.

## LIVE vs this document

| Fact | Value |
|------|--------|
| LIVE Hub | `d22b55f870efc0c105ed328a20a4ba4df077e6aa` / Azure deploy `501fb29b-80f6-427d-8c65-3f1a88da52d9` |
| LIVE `/health` capital | `capitalBackend.mode=sharepoint`; overlay durable |
| LIVE Elite | `e5740379ff16b68f329b7e2388867d7a43233a5b` asset `index-DvEHjcS6.js` |
| ACCG01 ACL Apply | **Not run.** Do not say it was. |
| CRM operator `a43803e` | **Candidate only** — not live-certified |
| Code default when `INTEGRATION_CAPITAL_BACKEND` unset | still fail-closed `unavailable` (503). LIVE App Settings are **not** unset. |

Capital Operations is an **internal Atlas / HVCG OS module**. It is not an eighth HVCG product. SharePoint `HVCG_*` remains the operational system of record. There is no Dataverse migration and no new CRM or database.

---

## Current state

| Surface | What is true |
|---------|----------------|
| Elite `/capital` | `CapitalPage` renders `CapitalCommandCenter`. Hub-backed when signed in. **401/403 fail closed** (no synthetic substitution). Labeled SYNTHETIC demo data only when `VITE_ALLOW_SAMPLE_FALLBACK` is on and Hub is unreachable / capital routes are not mounted. `CapitalReadinessWorkbench` remains in-repo as a fixture only. |
| SharePoint capital lists | Schema exists for `HVCG_CapitalOpportunities`, `HVCG_Lenders`, `HVCG_LenderOutreach`, `HVCG_DocumentRequests`, `HVCG_FundingMilestones`, `HVCG_CapitalSources` (plus Investors / InvestorOutreach). Lists are **thin**: coarse `FundingStatus`, limited lender fields, no 23-stage pipeline, no product criteria, no offer/fee/closing objects. |
| Additive schema (this module) | Existing lists are extended with additive columns only. Seven new `HVCG_*` lists are defined in JSON. **JSON is not live SharePoint.** Owner must provision columns/lists before production use. |
| `packages/atlas-capital-core` | Pure TypeScript contracts and helpers: 23 stages, checklist rules, lender matching, reviews, strategy, fees. Testable without Graph. Not a production runtime by itself. |
| Hub Graph allowlist | PM transport remains Projects/Tasks/Milestones write + Clients read (+ optional Leads). Capital has a **separate** allowlist (`capabilityForCapitalList`) behind `INTEGRATION_CAPITAL_BACKEND=sharepoint` and `INTEGRATION_CAPITAL_*_LIST_ID`. **LIVE** Hub reports `capitalBackend.mode=sharepoint`. Unset/code default remains **unavailable** (503). Production plus capital `development-json` is rejected. **ACCG01 ACL Apply was not run.** |
| Hub JSON store | `INTEGRATION_CAPITAL_BACKEND=development-json` is the local/CI runtime. It is not a production SoR. |
| Hub auth | Elite → Hub JWT → managed identity `id-atlas-prod` → Graph. Capital UI must reuse Hub auth. No parallel identity stack. |
| AI governance | Existing `HVCG_AI*` lists, `docs/ai/AI_GOVERNANCE.md`, human-gated jobs. Capital AI must reuse these. Extracted numbers stay unverified until a human confirms them. |
| Audit | `HVCG_AuditEvents` is the business audit list. Stage changes, overrides, and Manny approvals should write here once a runtime exists. |

Elite `/capital` is an operating Command Center against Hub `/api/capital/*`. 401/403 fail closed. **LIVE** Hub App Settings already report `capitalBackend.mode=sharepoint`. That is not ACCG01 ACL Apply and not a certified CRM operator zip. No lender auto-submit.

---

## Reuse (do not replace)

Reuse these Atlas pieces. Wire capital into them; do not fork them.

| Asset | Reuse as |
|-------|----------|
| `HVCG_CapitalOpportunities` | Opportunity header. Keep `FundingStatus` and `TargetAmount`. Map Hub `need.requestedAmount` to `TargetAmount`. New `Stage` is additive. |
| `HVCG_Lenders` / `HVCG_CapitalSources` | Lender org + master source. Products move to `HVCG_LenderProducts`. |
| `HVCG_DocumentRequests` | Checklist rows. Keep `RequestStatus`. New `ChecklistStatus` / `ChecklistItemKey` are additive. |
| `HVCG_LenderOutreach` | Submission / response tracker. Keep `Response`. New submission fields are additive. |
| `HVCG_FundingMilestones` | Process milestones. Additive lender/stage/blocker fields only. |
| `HVCG_AuditEvents` | Significant business events (stage, approval, override). |
| `HVCG_AIJobs` / `HVCG_AIOutputs` / `HVCG_AIApprovals` / related | Capital AI jobs, drafts, reviews. Human-gated. No auto-send. |
| Hub auth + Elite session | Same Entra / JWT path as Command Center. |
| Hub development-json | Local/testable capital store until SharePoint is provisioned and allowlisted. |

Files stay in SharePoint / client libraries. This module does not invent a document database.

---

## What will NOT be rebuilt

Do **not** rebuild, merge, or re-platform:

- EVA (website assessment / lead funnel in Autonomous Marketing)
- Agent Copilot (deep AI Business MRI product)
- Growth Command Center (commercial CFO product; own data boundary)
- 360 Growth Solution (client-tenant marketing OS)
- Autonomous Marketing (commercial website)
- Elevated Syndicate
- Best Day Of My Life Consulting Website
- Dynamics / Dataverse CRM
- A new capital database, CRM, or “eighth system”
- Client 360 live mapping (deferred, fail-closed)

ACCG / Prodigy materials are **domain patterns only** (checklists, SBA package shape, fee/tail language). Fixtures and tests must not contain real PII, tax IDs, bank statements, or client-identifying financials from those files.

---

## Graph / SharePoint constraint (blocking)

Hub PM Graph transport (`apps/atlas-integration-api/src/pm/sharepoint/graph.ts`) is a **four-list allowlist**:

- `HVCG_Projects` — write
- `HVCG_Tasks` — write
- `HVCG_Milestones` — write
- `HVCG_Clients` — read
- optional `HVCG_Leads` — write, if configured

Capital lists are **not** mixed into the PM allowlist. Hub capital Graph uses `capabilityForCapitalList` and `INTEGRATION_CAPITAL_*_LIST_ID`. Existing tenant lists for the min slice: `HVCG_CapitalOpportunities`, `HVCG_DocumentRequests`, `HVCG_LenderOutreach`, `HVCG_Lenders` (read), `HVCG_Clients` (read). Additive columns (`Stage`, `NextAction`, `Manny*`, `ChecklistItemKey`, `SubmissionStatus`) are **not yet on the live lists**. `Lists.SelectedOperations.Selected` grants for those lists to `id-atlas-prod` are **not yet confirmed**. Until columns + Selected grants + App Service env are in place:

1. Schema JSON in this repo is the contract.
2. Hub `development-json` is the only local write path.
3. Unset Hub still fail-closes (`unavailable`). **LIVE** Hub is explicitly `sharepoint` per `/health`. That does **not** mean ACCG01 ACL Apply ran.

Catalog/schema metadata visibility for ungranted lists is a known moderate residual risk (`docs/security/PM_SHAREPOINT_SELECTED_PERMISSIONS.md`). Do not treat Selected permissions as metadata isolation.

---

## Testable runtime

| Environment | Backend | Capital writes |
|-------------|---------|----------------|
| Local / CI | `INTEGRATION_CAPITAL_BACKEND=development-json` | Allowed. Not SharePoint. |
| Production Hub (LIVE) | `sharepoint` (`d22b55f` `/health`) | App Settings are sharepoint. Code default if unset is still **503 fail closed**. **ACCG01 ACL Apply was not run** — do not treat mode as grant proof. |

`NODE_ENV=production` plus capital `development-json` is rejected at configuration time. Do not use the JSON store as a production SoR.

---

## Critical path

Order is real. Later steps cannot honestly claim “live capital ops” without earlier ones.

1. **Contracts (this worktree)** — `atlas-capital-core` stages/types; additive `HVCG_*` JSON; docs. No production effect by itself. **DONE.**
2. **Hub development-json adapter** — `/api/capital/*` persists opportunities, checklists, outreach, offers on `{dataDir}/capital-operations.json`; stage transitions and Owner gates enforced. **TESTED.** Live Graph capital writes still blocked.
3. **Elite `/capital` against Hub** — Command Center + opportunity workspace. **401/403 fail closed.** Synthetic fallback only when sample fallback is explicitly allowed and Hub is unreachable. **DONE.**
4. **Tests** — stage machine, isolation, Graph allowlist, mocked live slice, Elite route wiring. **PASSING in this worktree.**
5. **Owner provisioning** — additive columns on existing lists; Selected grants to Hub MI; App Service `INTEGRATION_CAPITAL_*` IDs; then `INTEGRATION_CAPITAL_BACKEND=sharepoint`. **Do not create duplicate lists.**
6. **Pilot writes** — one SYNTHETIC QA opportunity through Hub Graph (`INTEGRATION_CAPITAL_ALLOW_SYNTHETIC_GRAPH` only for that pilot); then disable the flag.
7. **Only then** — treat `/capital` as operational for real files. Lender send remains human-gated. HVCG is not a lender and does not guarantee funding.

---

## Parallelization plan

Safe in parallel **after** contracts exist (they do in this worktree):

| Stream | Can proceed now | Blocked on |
|--------|-----------------|------------|
| Hub JSON repository + stage/checklist APIs | Yes | — |
| Elite command queues / pipeline UI against JSON | Yes | Hub routes |
| Matching + freshness labeling | Yes (core already) | Live lender criteria (owner/data) |
| Document review jobs on existing AI lists | Yes, drafts only | Human review; no VERIFIED promotion |
| SharePoint PnP/Graph provisioning scripts | Draft only | Owner approval to run against tenant |
| Graph allowlist + Selected grants | No | Owner |
| Real ACCG/Prodigy file ingest | No | Never as fixtures; production only under client ACLs |
| Auto-submit to lenders | No | Out of scope for v1 |

Do not parallelize a second SoR, a Dataverse model, or a rewrite of EVA/Copilot/GCC/360.

---

## Domain patterns (ACCG / Prodigy)

Use historical package structure as **patterns**:

- common vs conditional document checklists
- SBA form families as named checklist keys (current successor form names, not stale numbers as legal advice)
- fee/tail language → `HVCG_FeeRecords` + legal-compliance flag
- closing condition families by transaction type

Do **not** copy real names, EINs, statements, or deal amounts into fixtures, tests, or this repo.

---

## Related documents

- [CAPITAL_OPERATIONS_ARCHITECTURE.md](CAPITAL_OPERATIONS_ARCHITECTURE.md)
- [CAPITAL_DATA_MODEL.md](CAPITAL_DATA_MODEL.md)
- [CAPITAL_WORKFLOW.md](CAPITAL_WORKFLOW.md)
- [CAPITAL_DOCUMENT_ENGINE.md](CAPITAL_DOCUMENT_ENGINE.md)
- [LENDER_INTELLIGENCE_MODEL.md](LENDER_INTELLIGENCE_MODEL.md)
- [CAPITAL_AI_GOVERNANCE.md](CAPITAL_AI_GOVERNANCE.md)
- [CAPITAL_SECURITY.md](CAPITAL_SECURITY.md)
- [architecture/HVCG_SYSTEM_INDEX.md](architecture/HVCG_SYSTEM_INDEX.md) — seven systems; this module lives under Atlas
- [../PROJECT_ATLAS/CURRENT_STATE.md](../PROJECT_ATLAS/CURRENT_STATE.md)
