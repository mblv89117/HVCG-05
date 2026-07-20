# Client Portal V1 — Delivery Report

**Status:** UI deliverables complete; uncommitted; stopped for QA.

## Executive Summary

Client Portal V1 extends the existing multi-client HVCG portal MVP into a complete mock client workspace. The UI now covers the client dashboard, document upload, secure messaging, project timeline, invoices, tasks, milestones, meeting scheduling, capital raise tracking, funding progress, notifications, and secure files.

All data and external dependencies are mocked. No SharePoint connections, production integrations, deployment, merge, or commit were performed.

## Deliverables

- Responsive multi-client dashboard
- Document checklist and mock upload workflow
- Secure conversation history and local message composer
- Project timeline
- Read-only mock invoice center
- Client/advisor task center
- Milestone dashboard
- Mock meeting scheduler
- Eleven-stage capital raise and funding tracker
- Dedicated notification center
- Portal architecture, data model, and dependency interfaces
- Unit, smoke, permission, navigation, and responsive QA

## Assumptions

1. `clientId` is the tenant-isolation key for all V1 UI data.
2. Client users see only client-safe fields; pricing internals and staff notes remain excluded.
3. Invoice data is presentational only and does not imply accounting-system authority.
4. Messaging is in-portal only; email and SMS remain disabled.
5. Document uploads return mock URIs and do not persist files.
6. Meeting and e-sign actions are non-production simulations.
7. BL-C1 continues to gate real portal invitations.

## Risks

| Risk | V1 mitigation |
|------|---------------|
| Mock behavior diverges from future APIs | Explicit interface specifications and adapter boundary |
| Client data leakage between workspaces | All new rows are client-scoped; permission tests |
| Invoice UI interpreted as accounting source | Prominent mock/read-only copy |
| Messaging mistaken for live delivery | No network integration; email/SMS explicitly disabled |
| Dense navigation on mobile | Responsive wrapped nav; further mobile UX validation recommended |

## Technical Debt

- Mock store is a single in-memory module rather than repository-backed ports.
- Route-level code splitting is not implemented.
- Accessibility validation is structural, not a full WCAG audit.
- Timeline, milestone, and invoice filtering are client-side only.
- Notifications reset on refresh.
- Uploads and message attachments are simulated.
- Browser automation does not yet cover every interactive state.

## Recommended Next Sprint

**Client Portal V1.1 — Adapter and accessibility hardening (still non-production)**

1. Extract repository ports for documents, invoices, messages, and notifications.
2. Add Storybook/component-state coverage.
3. Run formal keyboard, screen-reader, color-contrast, and zoom testing.
4. Add browser tests for workspace switching and interaction persistence.
5. Define, but do not activate, Entra and SharePoint adapter contracts.
6. Add error, empty, loading, and permission-denied states to every page.

## QA Handoff

Primary handoff: `docs/portal-sprint1/QA_HANDOFF_V1.md`.

QA should validate:

- all 13 routes,
- workspace isolation,
- mock-only dependency behavior,
- responsive layout,
- client-safe invoice/funding content,
- no protected-track changes,
- uncommitted status.
