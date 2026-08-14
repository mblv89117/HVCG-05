# Atlas Business Analyst service

Isolated CPython 3.11 HTTP wrapper around the canonical BA engines in `config/business`.

This service is **not** a public Atlas API. Elite/browser callers continue to use the Integration Hub. The Hub remains the JWT, role, and client-scope authority.

```
Elite/browser
  -> Hub /api/ba/*          (requirePrincipal + client-scope)
  -> authenticated Hub-to-BA HTTP
  -> this service POST /dispatch
  -> config/business dispatch
  -> JSON back through Hub
```

This gate prepares source and the runtime contract. It does **not** provision Azure, create an Entra app, or deploy.

## Runtime

- CPython 3.11 only (`requires-python = ">=3.11,<3.12"`)
- Production host: **uvicorn** serving a **Starlette** ASGI app
- Do not use `python -m http.server`

### BA engine dependencies

None beyond CPython 3.11 stdlib and in-tree JSON policy files under `config/business`.

### BA service host dependencies

Pinned in `requirements.txt`: Starlette, uvicorn, anyio, PyJWT, httpx (tests).

## Local start

From the repository root:

```bash
python3.11 -m venv apps/atlas-business-analyst-service/.venv
apps/atlas-business-analyst-service/.venv/bin/pip install -r apps/atlas-business-analyst-service/requirements.txt
export BA_ATLAS_ENV=local
export BA_TEST_AUTH_TOKEN=local-test-token
export HVCG_BA_BUSINESS_DIR="$(pwd)/config/business"
PYTHONPATH=apps/atlas-business-analyst-service apps/atlas-business-analyst-service/.venv/bin/python -m atlas_ba_service
```

The process binds `BA_HOST`/`BA_PORT` (defaults `127.0.0.1:8794`).

## Local test

```bash
PYTHONPATH=apps/atlas-business-analyst-service \
  apps/atlas-business-analyst-service/.venv/bin/python -m unittest discover \
  -s apps/atlas-business-analyst-service/tests -p 'test_*.py'
```

Engine tests remain:

```bash
python3.11 -m unittest discover -s tests/unit/business -p 'test_*.py'
```

## Configuration

| Variable | Purpose |
|---|---|
| `BA_ATLAS_ENV` | `local` / `test` / `development` / `staging` / `production` |
| `HVCG_BA_BUSINESS_DIR` | Optional override for `config/business`. No workstation-absolute default. |
| `BA_REQUIRE_AUTH` | Default true. Cannot be false in production/staging. |
| `BA_ENTRA_TENANT_ID` | Placeholder until the infrastructure gate. Required in production. |
| `BA_API_AUDIENCE` | Future BA API audience. Required in production. Do not invent an ID. |
| `BA_AUTHORIZED_AZP` | Future Hub caller `azp`/`appid` (managed identity or Hub app). Required in production. |
| `BA_JWKS_URL` | Optional. Defaults from tenant. |
| `BA_TEST_AUTH_TOKEN` | Local/test static bearer. **Production refuses to start if set.** |
| `BA_TEST_JWT_HS256_SECRET` | Local/test HS256 JWT. **Production refuses to start if set.** |
| `LOCAL_AI_ENABLED` | Must remain false. Production start fails if true. |
| `BA_QBO_ENABLED` | Must remain false. Production start fails if true. |

Production fails closed if tenant, audience, or authorized caller identity is missing.

## Authentication contract

Intended future trust (not provisioned here):

```
Hub managed identity -> Entra access token -> BA API audience
  -> this service validates token
  -> this service accepts Hub principal projection
```

The BA service does **not** trust:

- browser authentication state
- Elite-generated roles
- `x-atlas-roles` / `x-atlas-client-ids`
- arbitrary caller-supplied ClientCodes
- anonymous production calls
- the user's raw Hub JWT as the BA trust root

Local/test may use `BA_TEST_AUTH_TOKEN` or `BA_TEST_JWT_HS256_SECRET`. Those variables are rejected at startup when `BA_ATLAS_ENV` is `production` or `staging`.

Entra JWKS validation is source-prepared. The BA API application registration does not exist yet; production hosting must not start until the infrastructure gate fills the placeholders.

## Principal projection (Hub -> BA)

Hub sends a server-derived projection, not browser headers:

- `userId` (Entra oid)
- `email?`
- `organizationId`
- `roles` (Hub-verified)
- `allowedClientIds` (Hub-verified; never `*` from Owner/Admin)
- `environment` (explicit; production always `production`)
- request `payload.client` / `payload.clientId`
- `correlationId`

BA still fail-closes inconsistent client context. Owner/Admin does not become wildcard client access.

## Hub integration contract

Hub `POST {INTEGRATION_BA_BASE_URL}/dispatch` with:

- Hub-to-BA bearer (future managed identity; local test token is not a production trust root)
- JSON `{ op, principal, payload, correlationId }`
- `x-correlation-id`

Hub `GET {INTEGRATION_BA_BASE_URL}/health` is process health only. Hub global `/health` stays `ok: true` when BA is down; BA is an optional/degraded dependency.

If `INTEGRATION_BA_BASE_URL` is unset, Hub starts and `/api/ba/*` fail closed (`ba_not_configured`). PM and auth are unaffected. There is no production `spawn("python3")` fallback.

## Production persistence

**Stateless operations only.** `.data/` writes are disabled in production/staging.

| Class | Production |
|---|---|
| `security.ping`, `gates.registry`, commercial/pricing/definition, `freefit.definition`, document/access-policy analysis, executive intelligence, `blc1.block` | Allowed (stateless) |
| `lead.*` | Gated until an approved adapter to existing `HVCG_Leads` |
| persistent `freefit.*` | Gated until an approved existing-list mapping |
| `doc.upload` | Gated |
| file audit sink | Not production audit architecture |

No 83rd SharePoint list. Preserve 82 lists / 143 lookups / 21 templates / 15 flows.

## Deployment artifact layout

Package the following together. Do not copy `config/business` into a second source tree in git.

```
atlas-business-analyst-service/
  atlas_ba_service/
  requirements.txt
  pyproject.toml
  README.md
config/business/          # engines + JSON policy files
  *.py
  *.json
```

Set `HVCG_BA_BUSINESS_DIR` to the packaged `config/business` directory. The service must not require a writable repository or `.data/` in production.

Startup (future App Service, not this gate):

```
python -m atlas_ba_service
```

or

```
uvicorn atlas_ba_service.app:create_app --factory --host 0.0.0.0 --port 8000
```

## Failure behavior

- Missing/invalid JSON → 400 fail closed
- Oversized body → 413
- Anonymous / wrong audience / wrong tenant → 401
- Unauthorized Hub caller (`azp`) → 403
- Invalid op / client mismatch → 403
- Dispatch timeout → 504
- Sanitized errors only; tokens and request bodies are not logged

## Health semantics

`GET /health` is **process/runtime** health for this service. It does not prove Hub authorization or SharePoint.

Hub `/health` reports `ba.configured` and `ba.reachable` and does **not** set `ok=false` when BA is unavailable.

## Local AI policy

Off. Fail-soft locally. Production start fails if `LOCAL_AI_ENABLED=true`. No Ollama dependency.

## QBO policy

Deferred. Production start fails if `BA_QBO_ENABLED=true`. No QBO client.

## Future ingress (not provisioned here)

Placing two apps on one App Service Plan does **not** provide private networking.

| Option | Security property | Infra required | Hub connectivity | DNS | Managed identity | Complexity | New Azure networking? |
|---|---|---|---|---|---|---|---|
| **1. Entra-protected public HTTPS** | Internet-reachable; unauthorized callers denied by token audience/`azp` | BA App Service + Entra app registration (BA API) | Hub uses public HTTPS + MI token | Public DNS only | Hub UAMI requests BA API audience | Low | No |
| **2. Access restrictions** | Network allow-list; still not VNet-private | BA App Service + restriction rules using Hub outbound IPs or service tag | Hub outbound IPs are not a single stable IP without NAT | Public DNS | Still required if Entra is also used | Medium; IP drift | No VNet, but operationally fragile |
| **3. Private Endpoint / VNet** | Network-unreachable from the internet | VNet, Private Endpoint, private DNS zone, Hub VNet integration | Hub must be VNet-integrated | Private DNS | MI still used for app auth | High | **Yes** |

Distinguish:

- **Network unreachable to the internet** = Option 3
- **Internet-reachable but Entra-authenticated** = Option 1

**Recommended for the later infrastructure gate: Option 1.**

The current estate already uses public HTTPS + Entra JWT for Hub, with no VNet or Private Endpoint. Option 1 matches that pattern, does not add networking infrastructure, and keeps Hub as the user-authorization boundary. Option 2 is not a reliable Hub-only path because App Service outbound IPs are not a single stable address. Option 3 is the true private-ingress model and should be revisited only if the estate later adopts VNet integration.
