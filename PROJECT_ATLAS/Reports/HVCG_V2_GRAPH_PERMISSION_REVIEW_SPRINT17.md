# Graph Permission Review — Sprint 17

Source: `apps/atlas-integration-api/src/oauth/microsoft.ts` `MICROSOFT_SCOPES`

| Permission | Type | Purpose | Risk | Least-privilege alternative | Approval |
|------------|------|---------|------|----------------------------|----------|
| openid | delegated | OIDC | low | — | approved_for_dev |
| offline_access | delegated | Refresh | medium | Short-lived if feasible | approved_for_dev |
| User.Read | delegated | Profile | low | — | approved_for_dev |
| Mail.Read | delegated | Mail discovery | high | Defer / narrower mailbox | flag_over_broad_for_prod |
| Calendars.Read | delegated | Calendar | medium | Defer | flag_review_prod |
| Contacts.Read | delegated | Contacts | medium | Defer | flag_review_prod |
| Files.Read.All | delegated | Files | high | Sites.Selected + path ACL | flag_over_broad_for_prod |
| Sites.Read.All | delegated | Sites | high | Sites.Selected | flag_over_broad_for_prod |

**Rule:** Graph access ≠ Atlas authorization (`graph_atlas_authorize`).

Live Graph non-Prod: **CREDENTIAL_REQUIRED**. Do not broaden scopes for convenience.
