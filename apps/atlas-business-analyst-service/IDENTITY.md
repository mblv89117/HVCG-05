# BA managed-identity authentication contract

Selected access-token version: **v2.0**.

This is a source contract. The BA API application, app role GUID, and Entra optional claims are **not** created in this gate.

## Layers

Service caller (this file) and end-user principal projection are distinct.

1. Hub validates the **user** JWT, roles, and client scope.
2. Hub requests an **application-only** Entra token for the BA API using the Hub user-assigned managed identity.
3. BA validates that token as the service caller.
4. BA then fail-closes the Hub-supplied **user** principal projection (client mismatch, no Owner/Admin wildcard).

## Production validation (all required)

1. JWT signature valid — RS256 via BA API JWKS
2. Issuer exactly `https://login.microsoftonline.com/{BA_ENTRA_TENANT_ID}/v2.0`
3. `tid` exactly `BA_ENTRA_TENANT_ID`
4. `aud` exactly `BA_API_AUDIENCE` (v2: BA API application ID GUID)
5. Application-only: `ver=2.0`, `idtyp=app`, `scp` absent
6. Caller oid exactly `BA_AUTHORIZED_CALLER_OID` (Hub managed-identity **principal / service-principal object ID**)
7. `roles` contains `BA_REQUIRED_APP_ROLE` (`Atlas.BA.Invoke`)

`azp` is the v2 client-application claim and is required to be present. If `BA_AUTHORIZED_AZP` is set, `azp` must match (Hub managed-identity **client ID**). `azp` is never sufficient authorization by itself.

v1-shaped tokens (`ver=1.0`, `appid` without v2 issuer/`azp`) are rejected under this contract.

## Why v2

Microsoft documents that the **resource** owns token version via `requestedAccessTokenVersion`, independent of the client endpoint. v2 access tokens use a deterministic `aud` (the API's client ID GUID) and emit `azp` instead of `appid`. That is the deliberate future BA API setting: `api.requestedAccessTokenVersion = 2`.

Later Entra configuration (not this gate): BA API manifest `requestedAccessTokenVersion: 2`. After that, Hub should request the token for the BA Application ID URI / app ID; the issued access token version is still controlled by the BA API registration.

## idtyp=app

Microsoft documents `idtyp` as an **optional access-token claim** owned by the resource. Value `app` is "the most accurate way for an API to determine if a token is an app token or an app+user token." It is emitted for app-only tokens only when the resource requests it.

Production BA requires `idtyp=app`. The infrastructure gate must add `idtyp` to the BA API's access-token optional claims. This source does not fabricate live Entra emission; tests use synthetic RS256 tokens that include `idtyp=app` to match the post-configuration contract. A verify key may be injected in tests only (`jwt_verify_key`); it cannot be loaded from the environment.

Delegated/user tokens (`scp` present, or `idtyp` not `app`) are denied.

## Accepted Hub caller (read-only baseline; not hardcoded)

Existing Hub UAMI `id-atlas-prod` (resource group `rg-atlas-shared`):

- client ID: `2b9ca61d-2396-4caa-95cd-30200d2ff36a` → future `BA_AUTHORIZED_AZP` corroboration
- principal ID: `6fbaf3e8-1baf-4391-b832-973c8964ad7d` → future `BA_AUTHORIZED_CALLER_OID`

Do not write those values into production settings in this gate. Do not create the BA API app or assign `Atlas.BA.Invoke`.

## Future Entra sequence (do not execute here)

1. Create BA API application registration.
2. Set Application ID URI / identifier URI; production `BA_API_AUDIENCE` is the v2 audience (API client ID GUID).
3. Set `requestedAccessTokenVersion` to `2`.
4. Define application-only app role `Atlas.BA.Invoke` with `allowedMemberTypes: ["Application"]`. Do not invent the role GUID in source.
5. Create the BA API service principal (enterprise application).
6. Assign that app role to the Hub managed-identity service principal (`principalId` = UAMI object ID) via Graph `appRoleAssignedTo`.
7. Configure BA: tenant, audience, `BA_AUTHORIZED_CALLER_OID`, optional `BA_AUTHORIZED_AZP`, `BA_REQUIRED_APP_ROLE=Atlas.BA.Invoke`, `BA_REQUIRE_IDTYP=true`. Add optional claim `idtyp` on BA API access tokens.
8. Hub requests a managed-identity token for the BA resource (App Service identity endpoint; user JWT is not the BA trust root).
9. Obtain sanitized token evidence (claims only: `aud`, `tid`, `ver`, `iss`, `oid`, `azp`, `idtyp`, `roles`; never the raw token).
10. Prove: correct `aud`, `tid`, `idtyp=app`, caller `oid`, `Atlas.BA.Invoke` present, `scp` absent.

## Managed-identity cache

Azure caches managed-identity tokens per resource URI for about 24 hours. Role assignment changes may not appear until the cached token expires. It is not possible to force refresh. Do not restart the App Service or detach/reattach the identity merely to force a new token.

## Microsoft documentation used

- [Access token claims reference](https://learn.microsoft.com/en-us/entra/identity-platform/access-token-claims-reference) — `aud`, `iss`, `appid` (v1), `azp` (v2), `oid`, `tid`, `roles`, `scp`, `ver`, `nbf`, `exp`
- [Access tokens](https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens) — v1/v2 formats; resource owns version via `requestedAccessTokenVersion`
- [Claims validation](https://learn.microsoft.com/en-us/entra/identity-platform/claims-validation) — audience, tenant, subject/`oid`, actor; `azp`/`appid` must not authorize delegated tokens without `idtyp=app`
- [Optional claims reference](https://learn.microsoft.com/en-us/entra/identity-platform/optional-claims-reference) — `idtyp`; resource-owned access-token optional claim
- [Optional claims](https://learn.microsoft.com/en-us/entra/identity-platform/optional-claims) — how to configure optional claims
- [App-only access primer](https://learn.microsoft.com/en-us/entra/identity-platform/app-only-access-primer) — assigned app roles appear in `roles`
- [Add app roles](https://learn.microsoft.com/en-us/entra/identity-platform/howto-add-app-roles-in-apps) — application member types; roles in tokens
- [Protected web API tutorial](https://learn.microsoft.com/en-us/entra/identity-platform/tutorial-web-api-dotnet-core-build-app) — `idtyp=app` vs `roles` without `scp`
- [App manifest](https://learn.microsoft.com/en-us/entra/identity-platform/reference-app-manifest) — `requestedAccessTokenVersion`
- [Assign app role to managed identity](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/how-to-assign-app-role-managed-identity) and [Azure CLI variant](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/assign-app-role-managed-identity-azure-cli)
- [Graph appRoleAssignedTo](https://learn.microsoft.com/en-us/graph/api/serviceprincipal-post-approleassignedto?view=graph-rest-1.0)
- [App Service managed identity](https://learn.microsoft.com/en-us/azure/app-service/overview-managed-identity) — ~24h cache; cannot force refresh
- [Managed identities FAQ](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/managed-identities-faq) — tokens cached per resource URI
- [Managed identity best practices](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/managed-identity-best-practice-recommendations) — role/group changes wait on token cache
