# SECURITY ROLE MAP — Production

**Status:** TEMPLATE — Prod env does not exist; roles not assigned.

| Role intent | Prod assignment | Status |
|-------------|-----------------|--------|
| System Administrator (deploy identity) | UNKNOWN | Required for import |
| HVCG Executive (read dashboards) | UNKNOWN | Post-deploy |
| HVCG Operations | UNKNOWN | Post-deploy |
| HVCG Finance / AR | UNKNOWN | Post-deploy |
| HVCG CRM User | UNKNOWN | Post-deploy |
| External / guest | **Denied** | Must remain denied for pilot |

## Rules

- No external sharing enablement without separate owner approval.
- Pilot import must suppress client-facing notifications.
- Confirm Dataverse security roles after managed import; document actual role names from Prod.
