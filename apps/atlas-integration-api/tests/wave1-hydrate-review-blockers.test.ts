import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  EVENT_360_CAMPAIGN_APPROVAL,
  EVENT_GCC_VALUE_SIGNAL,
  type AtlasIntegrationEnvelope,
} from '@hvcg/atlas-integration-contracts';
import {
  buildSharedKeyLiteAuthorization,
  buildSharedKeyLiteStringToSign,
  canonicalResourcePathForSignature,
  listIngestsByClientCode,
  type AzureTableIngestConfig,
} from '../src/modules/ingest/azureTableStore.ts';
import { hydrateCommercialOverlayForClient } from '../src/modules/ingest/hydrateCommercialOverlay.ts';
import { applyEnvelopeToOverlay } from '../src/modules/ingest/projectToCommercialOverlay.ts';
import { upsertIngestJson } from '../src/modules/ingest/store.ts';
import { emptyOverlay, loadOverlay } from '../src/pm/commercialContext/store.ts';

const CFG: AzureTableIngestConfig = {
  accountName: 'atlasingest',
  accountKey: Buffer.from('test-account-key-0123456789abcdef').toString('base64'),
  tableName: 'AtlasModuleIngestEvents',
};

function gccEnvelope(n: number, ts = '2026-01-15T12:00:00.000Z'): AtlasIntegrationEnvelope {
  return {
    clientCode: 'PDG01',
    source: 'growth_command_center',
    sourceRecordId: `gcc-${n}`,
    schemaVersion: 'gcc-value-signal.v1',
    eventType: EVENT_GCC_VALUE_SIGNAL,
    timestamp: ts,
    provenance: { system: 'gcc', observedAt: ts, confidence: 'VERIFIED' },
    confidence: 'VERIFIED',
    correlationId: `corr-gcc-${n}`,
    idempotencyKey: `gcc|PDG01|blocker|${n}`,
    actor: 'unit',
    authorityClass: 'OBSERVE',
    payload: {
      signalType: 'engagement_health',
      summary: `Signal ${n}`,
      financialImpact: 0,
    },
  };
}

function growthEnvelope(ts = '2026-02-01T08:30:00.000Z'): AtlasIntegrationEnvelope {
  return {
    clientCode: 'HFD01',
    source: 'growth_360',
    sourceRecordId: 'g360-1',
    schemaVersion: '360_campaign_approval_v1',
    eventType: EVENT_360_CAMPAIGN_APPROVAL,
    timestamp: ts,
    provenance: { system: 'growth_360', observedAt: ts, confidence: 'VERIFIED' },
    confidence: 'VERIFIED',
    correlationId: 'corr-360-1',
    idempotencyKey: 'growth360|HFD01|blocker|1',
    actor: 'unit',
    authorityClass: 'OBSERVE',
    payload: {
      organizationSlug: 'hart-family-dental',
      campaignId: 'camp-1',
      canExecute: false,
    },
  };
}

function tableRow(envelope: AtlasIntegrationEnvelope, receivedAt: string) {
  return {
    receivedAt,
    keyId: 'gcc',
    envelopeJson: JSON.stringify(envelope),
  };
}

describe('Wave1 hydrate review blockers', () => {
  describe('BLOCKER 1 — SharedKeyLite canonical resource excludes query', () => {
    it('strips $filter/$top from signed resource while preserving request URL query', () => {
      const table = CFG.tableName;
      const filter = encodeURIComponent("PartitionKey eq 'PDG01'");
      const requestPath = `${table}?$filter=${filter}&$top=50`;
      assert.equal(canonicalResourcePathForSignature(requestPath), table);

      const entity = `${table}(PartitionKey='PDG01',RowKey='gcc%7CPDG01%7C1')`;
      assert.equal(canonicalResourcePathForSignature(entity), entity);

      const date = 'Thu, 11 Sep 2026 05:00:00 GMT';
      const filtered = buildSharedKeyLiteAuthorization({
        accountName: CFG.accountName,
        accountKey: CFG.accountKey,
        date,
        signedResourcePath: requestPath,
      });
      const plain = buildSharedKeyLiteAuthorization({
        accountName: CFG.accountName,
        accountKey: CFG.accountKey,
        date,
        signedResourcePath: table,
      });
      assert.equal(filtered.signedResourcePath, table);
      assert.equal(filtered.stringToSign, plain.stringToSign);
      assert.equal(filtered.authorization, plain.authorization);
      assert.match(filtered.authorization, /^SharedKeyLite /);

      assert.equal(
        buildSharedKeyLiteStringToSign({
          accountName: CFG.accountName,
          date,
          signedResourcePath: entity,
        }),
        `${date}\n/${CFG.accountName}/${entity}`,
      );
      assert.equal(
        buildSharedKeyLiteStringToSign({
          accountName: CFG.accountName,
          date,
          signedResourcePath: table,
        }),
        `${date}\n/${CFG.accountName}/${table}`,
      );
    });
  });

  describe('BLOCKER 2 — durable read honesty (no silent empty on errors)', () => {
    const originalFetch = globalThis.fetch;
    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('returns SUCCESS_WITH_ROWS on 200 with entities', async () => {
      globalThis.fetch = (async () =>
        new Response(JSON.stringify({ value: [tableRow(gccEnvelope(1), '2026-01-15T12:00:00.000Z')] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })) as typeof fetch;

      const result = await listIngestsByClientCode({ cfg: CFG, clientCode: 'PDG01' });
      assert.equal(result.status, 'SUCCESS_WITH_ROWS');
      assert.equal(result.records.length, 1);
      assert.equal(result.truncated, false);
    });

    it('returns SUCCESS_EMPTY on 200 with empty page', async () => {
      globalThis.fetch = (async () =>
        new Response(JSON.stringify({ value: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })) as typeof fetch;
      const result = await listIngestsByClientCode({ cfg: CFG, clientCode: 'PDG01' });
      assert.equal(result.status, 'SUCCESS_EMPTY');
      assert.equal(result.records.length, 0);
    });

    it('returns ERROR on 401/403 instead of empty success', async () => {
      for (const status of [401, 403]) {
        globalThis.fetch = (async () => new Response('denied', { status })) as typeof fetch;
        const result = await listIngestsByClientCode({ cfg: CFG, clientCode: 'PDG01' });
        assert.equal(result.status, 'ERROR');
        assert.equal(result.records.length, 0);
        assert.equal(result.httpStatus, status);
      }
    });

    it('returns UNAVAILABLE on 500/503 instead of empty success', async () => {
      for (const status of [500, 503]) {
        globalThis.fetch = (async () => new Response('boom', { status })) as typeof fetch;
        const result = await listIngestsByClientCode({ cfg: CFG, clientCode: 'PDG01' });
        assert.equal(result.status, 'UNAVAILABLE');
        assert.equal(result.records.length, 0);
        assert.equal(result.httpStatus, status);
      }
    });
  });

  describe('BLOCKER 3 — continuation + safety ceiling + TRUNCATED', () => {
    const originalFetch = globalThis.fetch;
    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('follows continuation tokens across pages', async () => {
      let calls = 0;
      globalThis.fetch = (async (input: any) => {
        calls += 1;
        const url = String(input);
        if (calls === 1) {
          assert.match(url, /\$top=2/);
          return new Response(
            JSON.stringify({
              value: [
                tableRow(gccEnvelope(1), '2026-01-15T12:00:00.000Z'),
                tableRow(gccEnvelope(2), '2026-01-15T12:01:00.000Z'),
              ],
            }),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'x-ms-continuation-NextPartitionKey': 'PDG01',
                'x-ms-continuation-NextRowKey': 'next-2',
              },
            },
          );
        }
        assert.match(url, /NextPartitionKey=PDG01/);
        assert.match(url, /NextRowKey=next-2/);
        return new Response(
          JSON.stringify({ value: [tableRow(gccEnvelope(3), '2026-01-15T12:02:00.000Z')] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }) as typeof fetch;

      const result = await listIngestsByClientCode({
        cfg: CFG,
        clientCode: 'PDG01',
        pageSize: 2,
        maxRows: 50,
      });
      assert.equal(result.status, 'SUCCESS_WITH_ROWS');
      assert.equal(result.records.length, 3);
      assert.equal(result.pageCount, 2);
      assert.equal(result.truncated, false);
      assert.equal(calls, 2);
    });

    it('follows continuation across >50 rows (default page size) without silent truncation', async () => {
      let calls = 0;
      globalThis.fetch = (async () => {
        calls += 1;
        if (calls === 1) {
          const rows = Array.from({ length: 50 }, (_, i) =>
            tableRow(gccEnvelope(i + 1), `2026-01-15T12:00:${String(i).padStart(2, '0')}.000Z`),
          );
          return new Response(JSON.stringify({ value: rows }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'x-ms-continuation-NextPartitionKey': 'PDG01',
              'x-ms-continuation-NextRowKey': 'after-50',
            },
          });
        }
        return new Response(
          JSON.stringify({
            value: [
              tableRow(gccEnvelope(51), '2026-01-15T12:01:00.000Z'),
              tableRow(gccEnvelope(52), '2026-01-15T12:01:01.000Z'),
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }) as typeof fetch;

      const result = await listIngestsByClientCode({
        cfg: CFG,
        clientCode: 'PDG01',
        pageSize: 50,
        maxRows: 500,
      });
      assert.equal(result.status, 'SUCCESS_WITH_ROWS');
      assert.equal(result.records.length, 52);
      assert.equal(result.pageCount, 2);
      assert.equal(result.truncated, false);
      assert.equal(calls, 2);
    });

    it('marks TRUNCATED when safety ceiling is hit with more pages available', async () => {
      let calls = 0;
      globalThis.fetch = (async () => {
        calls += 1;
        const rows = Array.from({ length: 2 }, (_, i) => {
          const n = (calls - 1) * 2 + i + 1;
          return tableRow(gccEnvelope(n), `2026-01-15T12:00:0${n}.000Z`);
        });
        return new Response(JSON.stringify({ value: rows }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'x-ms-continuation-NextPartitionKey': 'PDG01',
            'x-ms-continuation-NextRowKey': `next-${calls}`,
          },
        });
      }) as typeof fetch;

      const result = await listIngestsByClientCode({
        cfg: CFG,
        clientCode: 'PDG01',
        pageSize: 2,
        maxRows: 4,
      });
      assert.equal(result.status, 'SUCCESS_WITH_ROWS');
      assert.equal(result.records.length, 4);
      assert.equal(result.truncated, true);
      assert.ok(result.pageCount >= 2);
    });
  });

  describe('BLOCKER 4 — pure GET hydrate preserves recordedAt and does not rewrite disk', () => {
    it('preserves historical recordedAt across rehydration', () => {
      const ts = '2026-02-01T08:30:00.000Z';
      const first = applyEnvelopeToOverlay(emptyOverlay(), growthEnvelope(ts), {
        recordedAtHint: ts,
      });
      assert.equal(first.overlay.attributions[0].recordedAt, ts);

      const second = applyEnvelopeToOverlay(first.overlay, growthEnvelope(ts), {
        recordedAtHint: '2026-09-11T05:00:00.000Z',
      });
      assert.equal(second.replay, true);
      assert.equal(second.overlay.attributions.length, 1);
      assert.equal(second.overlay.attributions[0].recordedAt, ts);
    });

    it('GET hydrate does not persist overlay by default and is idempotent', async () => {
      const dir = mkdtempSync(join(tmpdir(), 'atlas-hydrate-pure-'));
      const env = gccEnvelope(1, '2026-01-15T12:00:00.000Z');
      upsertIngestJson({ dataDir: dir, keyId: 'gcc', envelope: env });

      const first = await hydrateCommercialOverlayForClient({
        dataDir: dir,
        clientCode: 'PDG01',
      });
      assert.equal(first.persisted, false);
      assert.ok(first.hydratedFrom.includes('local-json'));
      assert.equal(first.overlay.gccSignals.length, 1);
      assert.equal(first.overlay.gccSignals[0].emittedAt, '2026-01-15T12:00:00.000Z');
      assert.equal(loadOverlay(dir).gccSignals.length, 0);

      const second = await hydrateCommercialOverlayForClient({
        dataDir: dir,
        clientCode: 'PDG01',
      });
      assert.equal(second.overlay.gccSignals.length, 1);
      assert.equal(second.overlay.gccSignals[0].emittedAt, '2026-01-15T12:00:00.000Z');
      assert.equal(second.overlay.gccSignals[0].idempotencyKey, env.idempotencyKey);
    });

    it('surfaces azure-table-unavailable honestly without inventing empty durable truth', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async () => new Response('nope', { status: 503 })) as typeof fetch;
      try {
        const dir = mkdtempSync(join(tmpdir(), 'atlas-hydrate-unavail-'));
        const result = await hydrateCommercialOverlayForClient({
          dataDir: dir,
          clientCode: 'PDG01',
          env: {
            INTEGRATION_MODULE_INGEST_STORAGE_ACCOUNT: CFG.accountName,
            INTEGRATION_MODULE_INGEST_STORAGE_KEY: CFG.accountKey,
            INTEGRATION_MODULE_INGEST_TABLE: CFG.tableName,
          },
        });
        assert.ok(result.hydratedFrom.includes('azure-table-unavailable'));
        assert.equal(result.durableStatus, 'unavailable');
        assert.equal(result.persisted, false);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
