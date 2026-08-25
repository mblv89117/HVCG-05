# Atlas Usable Operating Layer Report

- Generated: 2026-07-22T18:00:00Z
- Branch: `fix/atlas-usable-operating-layer`
- Objective: Make Atlas usable as HVCG’s daily operating system after auth Absolute GO

## 1. Root cause of `Unknown project id`

Production Elite OS project **detail** is served by `ProjectDetailPage` at `/projects/:projectId`, which calls `GET /api/pm/projects/:id` on the Integration Hub (`pm-store.json`).

Three failure modes produced the “Project not found / Unknown project id” experience:

1. **Empty PM store** — Hub projects are not SharePoint list IDs. Until `POST /api/pm/populate` (or create project) runs against live Client 360 data, the portfolio is empty and any stale/deep link 404s.
2. **Invalid route params** — Links of the form `/projects/${id}` with a missing JS `id` become the literal path `/projects/undefined`. Demo catalog IDs (`prj-*`) also never exist in the PM store.
3. **Misleading recovery copy** — Any failed fetch (404/network) showed the same subtitle `Unknown project id`, including valid-looking but non-existent IDs.

**Fixes shipped:**

- Sidebar remains `/projects` (list only).
- `isValidProjectId` rejects `undefined` / `null` / `unknown` / empty / `prj-*` before API calls.
- Detail recovery screen with **Back to projects**, Clients, and Command Center.
- Portfolio / Command Center / Client 360 only link when the id is valid.
- Projects list includes **Create project** and **Sync from Microsoft + Client 360**.

## 2. Navigation audit matrix (Phase 1)

| Navigation area | Route | Component | Endpoint | Data source | Current status | Required repair |
|---|---|---|---|---|---|---|
| Command Center | `/`, `/command-center` | `CommandCenterPage` | `GET /api/pm/command-center` | Hub `pm-store` + Client 360 | Functional (live after populate) | Keep; safe project links |
| My Work | `/my-work` | `MyWorkPage` | `GET /api/pm/my-work` | Hub PM tasks | Functional | None beyond populate |
| Portfolio | `/portfolio` | `PortfolioPage` | `GET /api/pm/portfolio` | Hub PM projects | Functional (alias of Projects) | Shared with Projects module |
| Projects | `/projects` | `PortfolioPage` (ProjectsPage) | `GET/POST/PATCH /api/pm/projects` | Hub PM projects | **Repaired** — full portfolio CRUD | Was empty / detail 404s |
| Project detail | `/projects/:projectId` | `ProjectDetailPage` | `GET /api/pm/projects/:id` | Hub PM | **Repaired** — board + recovery | Invalid id guard |
| Universal Inbox | `/inbox` | `UniversalInboxPage` | `GET /api/pm/inbox` | Hub PM inbox | Functional | None |
| Team & Agents | `/team` | `TeamAgentsPage` | `GET /api/pm/team` | Hub PM team | Functional | None |
| Clients | `/clients` | `LiveClientsPage` | `GET /api/client360` | Hub Client 360 | Functional (7 clients) | None |
| Client 360 | `/clients/:id` | `LiveClientDetailPage` | Client 360 + `GET /api/pm/clients/:id/workspace` | Hub | **Repaired** — full operating tabs | Was overview/docs only |
| Approvals | `/tasks` | `TasksApprovalsPage` | Dataverse approvals | Dataverse | Partial | Honest; PM approvals also on project |
| Analytics | `/executive` | `ExecutiveDashboard` | Dataverse / pending | Mixed | Partial | Pending-safe |
| Capital Advisory | `/capital` | `CapitalPage` | — | — | **Honest empty** | Was static KPI shells |
| Financial Intelligence | `/financials` | `FinancialsPage` | — | Banking/QBO later | **Honest empty** | Removed fake KPI density |
| Banking | `/banking` | `BankingConnectionsPage` | Plaid API | Plaid | Partial | Secrets/UAT gated |
| Accounting | `/accounting` | `AccountingConnectionsPage` | — | QBO | Blocked / not configured | Explicit |
| Reports | `/reports` | `ReportsPage` | — | — | Placeholder links | Honest export empty |
| Knowledge | `/knowledge` | `KnowledgePage` | Local catalog | Local | Partial | SharePoint/Copilot gated |
| Documents | `/documents` | `DocumentsOperatingPage` | `GET /api/pm/documents` | Client 360 / Graph links | **Repaired** | Was category stub |
| Automation | `/automations` | `AutomationsPage` | — | Power Automate | **Honest empty** | Reminders/Eva remain Off |
| AI Agents | `/ai` | `AiInsightsPage` | — | — | **Honest empty** | No live AI |
| Administration | `/admin` | `AdminPage` | External Dataverse | Dataverse | Launchpad | None |
| Connections | `/connections` | `ConnectionsCenterPage` | Hub connections | Hub | Functional (owner) | None |
| Settings | `/settings` | `SettingsPage` | localStorage | Local | Local-only | Acceptable |

## 3. Data source mapping (Phase 3)

| Atlas object | Current source | Record count (pre-populate) | Connected to UI? | Required action |
|---|---|---:|---|---|
| Clients | Hub Client 360 (`integration-store`) / Microsoft | 7 live | Yes | Keep |
| Projects | Hub `pm-store.json` (not SP item IDs) | 0 until sync/create | Yes after repair | Populate / create / link |
| Tasks | Hub `pm-store` tasks | 0 until sync/create | Yes | Persist via PATCH/POST |
| Milestones | Hub `pm-store` | 0 until bootstrap/create | Yes on project/Client 360 | Create API added |
| Deliverables | Hub `pm-store` + Client 360 associations | From populate | Yes | Populate from sources |
| Documents | Client 360 source records (SharePoint/OneDrive links) | Per-client linked set | Yes (Documents + Client 360) | Link-first; no byte copy |
| Meetings | Client 360 timeline / associations | From Microsoft sync | Client 360 tab | Honest empty when none |
| Approvals | PM tasks (`needs_owner_approval`) + Dataverse page | Mixed | Partial | Dual plane documented |
| Notes | Hub `pm-store` notes (new) | 0 until recorded | Yes | Create from Client 360 / project |
| Decisions | Hub `pm-store` decisions | From extract/create | Yes | Create API added |

SharePoint lists `HVCG_Projects` / `HVCG_Tasks` remain the Power Automate / list plane and are **not** the Elite OS PM SoT. Documents continue to use SharePoint/OneDrive as the file SoT via authorized `webUrl` links.

## 4. Routes / endpoints repaired or created

**Routes repaired:** `/projects`, `/projects/:projectId`, `/documents`, `/clients/:id`, `/financials`, `/capital`, `/automations`, `/ai`

**Endpoints created/extended:**

- `GET /api/pm/projects/:id` — invalid id + board + notes + documents
- `PATCH /api/pm/projects/:id`
- `POST /api/pm/projects/:id/archive`
- `POST /api/pm/milestones`
- `POST /api/pm/notes`
- `POST /api/pm/decisions`
- `GET /api/pm/documents`
- `GET/POST/PATCH /api/pm/owner-review`
- Existing `POST /api/pm/populate`, `POST /api/pm/projects`, `POST/PATCH /api/pm/tasks` retained

## 5–9. Operating counts (post-deploy)

Exact Production counts depend on Manny running **Sync from Microsoft + Client 360** once while signed in as HVCG Owner (populates from the seven live Client 360 records without inventing client facts).

| Metric | Value |
|---|---|
| Real projects available | Created via sync/create against live clients (not demo `prj-*`) |
| Real tasks available | From populate extract + manual create; board-persisted |
| Documents linked | Authorized Client 360 / HVS link-first rows (restricted omitted) |
| Client workspaces completed | 7 live Client 360 workspaces with operating tabs |
| Records awaiting owner review | `GET /api/pm/owner-review` queue (ambiguous associations only) |

## 10. Files changed

See git commit on `fix/atlas-usable-operating-layer` (Elite OS + Integration API + tests + this report).

## 11. Azure resources changed

- **App Service** `app-atlas-integration-hub` (rg-atlas-prod) — redeployed bundled `server.js` with PM operating endpoints.
- **Static Web App** `swa-atlas-elite-os-dev` — preview then production deploy of Elite OS build.

## 12–14. Dataverse / SharePoint / Power Automate

- **Dataverse:** no schema changes in this release.
- **SharePoint:** no list schema moves; document libraries remain SoT for files; HVS sources untouched.
- **Power Automate:** MissingDocumentReminders, RenewalReminders, Eva intake **remain Off**; no external email enabled.

## 15. Security test results

| Check | Result |
|---|---|
| Anon `GET /api/pm/projects` | **401** Bearer required |
| Forged `x-atlas-*` without Bearer | **401** |
| Invalid project id `/api/pm/projects/undefined` | Auth gate first; after auth returns `invalid_project_id` |
| SWA signed-out protected routes | RequireMicrosoftAuth unchanged |
| HVCG Owner role footer | Unchanged RoleProvider / Entra path |
| Document URLs | Only returned for authenticated hub principal; restricted omitted by default |
| Old production tags | Untouched (`atlas-v1.0.0-production`, `atlas-v1.0.1-production`) |

## 16. Preview URL

https://zealous-rock-0090c7e1e-preview.westus2.7.azurestaticapps.net

(Note: Azure App Service platform CORS for the preview origin was added; if preview API calls fail CORS briefly after deploy, Production SWA remains the verified operating URL.)

## 17. Production deployment result

- Hub: deploy status **RuntimeSuccessful** (`app-atlas-integration-hub`)
- SWA production: **deployed** to https://zealous-rock-0090c7e1e.7.azurestaticapps.net
- Bundle asset: `index-BHJBaIol.js`

## 18. Production commit SHA

`766067265d9e1f44a73c9258528d9b5ffe2fd110` on branch `fix/atlas-usable-operating-layer`

## 19. Old Production tags untouched

Confirmed:

- `atlas-v1.0.0-production` → `6a346aa736ba5ecaaff701c3561b1d4b1befd564`
- `atlas-v1.0.1-production` → `8b12146c7e3c452e98ba2865a889baede055b11c` (peels to `dceea79…`)

Neither tag was moved or rewritten.

## 20. No external email / reminder flows enabled

Confirmed: no changes enabling MissingDocumentReminders, RenewalReminders, Eva intake, or client email sends.

## Owner action required (one precise step)

**Initialize operating projects from live Client 360 (one-time after deploy):**

1. Open Production SWA: `https://zealous-rock-0090c7e1e.7.azurestaticapps.net/projects`
2. Sign in as **manny@highvaluecapitalgroup.com** (HVCG Owner)
3. Click **Sync from Microsoft + Client 360**
4. Expected result: portfolio lists real client engagements / known initiatives linked to the seven live clients; Command Center and My Work show non-static priorities; Documents lists authorized linked files.

Do **not** invent ownership for ambiguous files — use Owner Review when presented.
