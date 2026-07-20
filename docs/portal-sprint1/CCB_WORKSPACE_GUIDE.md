# Colorado Craft Beef — Client Workspace & Data Room

**Branch:** `cursor/client-portal-sprint1`  
**App:** `apps/hvcg-client-portal`  
**Template client:** Colorado Craft Beef (`CCB`)  
**Mode:** Product UI with mocked Microsoft integrations — no live invites, email, SMS, or anonymous sharing

## Verified facts (only)

Source: Atlas Elite OS `workspaces.ts` (Owner directive)

| Field | Value |
|-------|--------|
| Client | Colorado Craft Beef |
| Referral | Randy Kamin — Generational Group |
| Original relationship | HVS referral |
| Current relationship | HVCG |
| Objectives | Growth capital; additional real estate |
| Financing themes | Non-dilutive; agricultural |
| Relationship owner | Manny Barela |
| Health | On Track |
| Status | Transitioning to HVCG |
| Financial KPIs / EV / amounts | **Not displayed** — awaiting verified sources |

## Reusable workspace structure

1. Clone `src/data/workspaceTemplate.ts` (`createClientWorkspaceShell` + `createEmptyDataRoomSkeleton`)
2. Seed verified client facts (never invent currency figures)
3. Attach category document requests + activity/notifications
4. Switch workspace in the portal header

CCB (`src/data/coloradoCraftBeef.ts`) is the reference implementation.

## Experience map

| Area | Route |
|------|-------|
| Client home | `/` |
| Executive summary | `/summary` |
| Contacts | `/contacts` |
| Engagement overview | `/engagement` |
| Projects | `/projects` |
| Milestones | `/milestones` |
| Tasks / next actions | `/tasks` |
| Approvals | `/approvals` |
| Financial KPIs | `/kpis` |
| Capital roadmap | `/capital` |
| Lender / investor pipeline | `/pipeline` |
| Enterprise value | `/enterprise-value` |
| Secure data room | `/data-room` |
| Document requests | `/documents` |
| Meetings | `/meetings` |
| Notes | `/notes` |
| Decisions | `/decisions` |
| Deliverables | `/deliverables` |
| AI insights | `/ai-insights` |
| Activity history | `/activity` |
| Notifications | `/notifications` |

## Data room categories

Corporate · Financial · Tax · Legal · Insurance · Ownership · Debt · Real Estate · Operations · Capital · Compliance · Engagement · Deliverables

Each category supports: secure upload (contributor+), approved download, version label, request status, received/expiration dates, approval status, ownership, notes, audit summary, role-based visibility (`ClientVisible` | `Internal`).

## Roles

| Role | Upload | Internal notes/files |
|------|--------|----------------------|
| ClientContact | No | Hidden |
| ClientContributor | Yes (mock) | Hidden |
| Advisor / Admin | Yes | Visible |

Client users only see organizations in `user.clientIds`. Switching to ACCG proves isolation — CCB never shows `ACCG_ONLY` files.

## Notifications

In-app only. `EmailDisabled` / `SmsDisabled` channels document blocked outbound behavior until BL-C1 / owner approval.

## Local QA

```bash
cd apps/hvcg-client-portal
npm run qa:all
```

## User guide (short)

1. Open the portal and confirm workspace **Colorado Craft Beef (CCB)**.
2. Review **Executive Summary** for verified relationship facts.
3. Use **Tasks** for next actions (financial package intake).
4. Upload via **Document Requests** or **Secure Data Room** (Contributor role).
5. Switch role to **ClientContact** to confirm read-only + internal hiding.
6. Switch workspace to ACCG and back — confirm no cross-client leakage.
