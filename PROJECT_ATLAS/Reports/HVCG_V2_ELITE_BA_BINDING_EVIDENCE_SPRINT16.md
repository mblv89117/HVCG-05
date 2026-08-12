# Elite↔BA Runtime Binding Evidence (Sprint 16 Phase 0)

## Contract

`Elite → Integration Hub (/api/ba/*) → ba_bridge.py → atlas_security.dispatch_ba_request → domain modules`

## Proven in Development

| Case | Result |
|------|--------|
| EB-A Valid context | OK |
| EB-B Cross-client | BLOCKED |
| EB-C Missing identity | UNAUTHORIZED |
| EB-D Owner Support | BLOCKED |
| EB-E Risk | BLOCKED |
| EB-F BL-C1 | BLOCKED_POLICY |
| EB-G Document ACL | BLOCKED |
| EB-H Exec Intel permissions | RESTRICTED |
| ba_bridge CLI | OK |

## Files

- `apps/atlas-integration-api/src/ba/invokePython.ts`
- `apps/atlas-integration-api/src/ba/routes.ts`
- `apps/atlas-elite-os/src/integrations/hub/baApi.ts`
- `config/business/ba_bridge.py`
- `config/business/atlas_security.py`

## Remaining

Live Hub HTTP E2E against a running `atlas-integration-api` process with Entra/dev auth — **LIVE_VALIDATION_REQUIRED** (not claimed as executed in this sprint).
