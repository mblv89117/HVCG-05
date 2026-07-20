# Communications — Permission Review

**Date:** 2026-07-19  
**Scope:** Atlas Communications product (Elite OS + `HVCG_Communications`)

## Principles

1. **Least privilege by client workspace** — users only see communications for clients they may open.
2. **No mailbox mirroring** — store curated summaries linked to records, not unrelated email bodies.
3. **Draft ≠ Sent** — `Status` is required; UI labels drafts explicitly.
4. **External send is Owner-gated** — OA-EXT-01; Atlas `blockLiveClientComms` defaults true.
5. **Guests** — no communications timeline (`canViewCommunications=false`).

## Role matrix (Elite OS RBAC)

| Capability | Owner | Executive | Operations | Finance | Advisor | Guest |
|------------|-------|-----------|------------|---------|---------|-------|
| View timeline | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| Prepare external draft | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ |
| Launch Outlook/Teams | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| Approve SendApproved | Owner / designated Ops | — | Ops when delegated | ✗ | ✗ | ✗ |
| Auto-send from Atlas | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

## SharePoint list notes

- `HVCG_Communications` rows inherit client library / site permissions for `ClientId`.
- `AttachmentOrDocLinks` may only reference approved SharePoint/OneDrive links.
- `EmailSummary` / `MeetingSummary` are business summaries — retention follows HVCG client-document policy; purge unrelated PII.

## Notification integration

- In-app: Elite OS Notifications module.
- Teams: test channels only until OA-CRM gates Approved (`TEAMS_NOTIFICATION_SPEC.md`).
- Power Automate must not post to production channel IDs without recorded approval.

## Residual risks

| Risk | Mitigation |
|------|------------|
| User pastes full email threads into Summary | Training + QA rejects; prefer short summaries |
| Deep links open wrong tenant | Launch URLs are microsoft.com; Entra tenant locked to HVCG |
| Finance sees pipeline narrative | Allowed; external draft blocked for Finance |

## Sign-off

| Role | Status |
|------|--------|
| Communications Product | Ready for QA |
| Security / Owner | Pending review |
| QA Release | See QA_HANDOFF.md |
