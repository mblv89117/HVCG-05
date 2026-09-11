# Wave 1 Lane B — current-runtime recert discovery

**Status: PARTIAL** — health matches baseline; local/fixture + live fail-closed probes PASS; signed happy-path matrix BLOCKED (no secrets).

| Field | Value |
| --- | --- |
| Baseline SHA | `4a7e5f75ca2c740e44de4854bdf4ac7343f0bce6` |
| Live `/health.commit` | `4a7e5f75ca2c740e44de4854bdf4ac7343f0bce6` (match) |
| `secretsPresent` | `false` |
| Tests weakened | No |

## What ran

- **Local fixture harnesses:** `hub-module-ingest.test.ts`, `hub-module-ingest-backend.test.ts`, `module-ingest-commercial-projection.test.ts` (plus full `@hvcg/atlas-integration-api` suite: 754/754 PASS).
- **Live unsigned fail-closed:** bad signature (gcc/mri/growth360), unknown key-id, expired timestamp, raw-secret-only rejection, website missing intake auth → all 401 as expected.
- **Not run:** valid signed ingest, live replay/durable row proof, signed cross-client, website signed PREPARE — require Key Vault–backed HMAC material.

## Module coverage (honest)

| Lane | Posture on this run |
| --- | --- |
| GCC / PDG01 | Signed live OBSERVE **BLOCKED**; prior evidence not re-certified on this SHA |
| Growth360 / HFD01 | Signed live OBSERVE **BLOCKED**; `canExecute` remains false |
| MRI | **Fixture-only**; no production mapping invented |
| Website / EVA | **PREPARE-only**; unsigned fail-closed PASS; signed path BLOCKED |

## Secrets (boolean only)

Documented approved refs exist (`AtlasModuleIngestKeyGcc|Mri|Growth360`, `AtlasModuleIngestKeysJson` → Hub `INTEGRATION_MODULE_INGEST_KEYS_JSON`). This environment has no env secret material, no local `.env`, and no `az` login — so signed recert cannot proceed without weakening tests.

## Evidence JSON

`docs/evidence/wave1-recert-current-sha-2026-09-11.json`
