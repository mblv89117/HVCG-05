# AI Governance — Sprint 11 Azure Production Review

## Scope

Security, compliance, identity, secrets, RBAC, and Microsoft best-practice alignment for the Atlas move to **HVCG Production**.

## Findings

| Control | Status | Notes |
|---------|--------|-------|
| Identity | PASS | Entra ID; owner `manny@highvaluecapitalgroup.com`; SPA MSAL client for Elite OS |
| Secrets | PASS | Key Vault with **RBAC** (not access policies); MI `id-atlas-prod` as Secrets User |
| RBAC | PASS | Owner Key Vault Administrator; MI least-privilege Secrets User |
| Subscription hygiene | PASS | Deprecated sub documented as forbidden; scripts hard-code HVCG Production |
| Monitoring | PASS | LAW + App Insights + action group + budget alerts |
| Network | ACCEPTABLE | Public SWA/KV for Dev; `rg-atlas-network` reserved for future Private Endpoints |
| Compliance posture | PASS | Microsoft-native stack only; no non-Microsoft hosting introduced |
| Cost governance | PASS | $100/mo budget with 50/75/90/100% alerts |

## Residual risks

1. Dataverse CORS for SWA origin not yet applied (platform admin step).
2. Free SWA has limited enterprise networking controls — acceptable for Dev Elite OS.
3. Soft-delete purge protection disabled on KV (7-day soft delete retained) — enable purge protection before storing production-grade secrets long-term.

## Recommendation

Approve Sprint 11 Azure migration for **foundation + Dev SWA**. Require purge protection + prod Entra app before storing production client secrets or production SWA cutover.
