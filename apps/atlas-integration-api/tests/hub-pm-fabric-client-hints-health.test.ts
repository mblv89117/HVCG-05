/**
 * ATLAS-M365-FABRIC-CLIENT-HINTS-HEALTH-001
 * Honest fabricSync.clientHints on /health. Count only. Never invent ClientCodes.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { PmHttpError } from '../src/pm/sharepoint/errors.ts';
import { inspectFabricSyncHealth } from '../src/pm/sharepoint/fabric/status.ts';
import { loadClientHintsWithFabricRetry, runFabricSync } from '../src/pm/sharepoint/fabric/sync.ts';
import { MANNY_ENTRA_OID } from '../src/pm/sharepoint/manny.ts';
import type { SharePointPmService } from '../src/pm/sharepoint/repository.ts';
import { loadConfig, type AppConfig } from '../src/config.ts';
import { buildRegistry } from '../src/connectors/registry.ts';
import { handleRequest } from '../src/http/router.ts';
import { createLocalAiAdapter } from '../src/local-ai/adapter.ts';
import { PmRepository } from '../src/pm/repository.ts';
import { IntegrationRepository } from '../src/store/repository.ts';

const FORBIDDEN_HINT_IDS = /PDG01|ACCG01|CCB01|HFD01|LIEN01|Colorado Craft|Precision Dental|displayName|@highvalue|dba/i;

function tokenFailed(): never {
  throw new PmHttpError(503, 'PM_TOKEN_ACQUISITION_FAILED', 'Managed identity token acquisition failed.');
}

function mailGraph(messages: Array<Record<string, unknown>>) {
  return {
    async getJson(path: string) {
      if (path.includes('/mailFolders/inbox/messages/delta')) {
        return {
          status: 200,
          json: {
            value: messages,
            '@odata.deltaLink': `/v1.0/users/${MANNY_ENTRA_OID}/mailFolders/inbox/messages/delta?$deltatoken=hints-health`,
          },
        };
      }
      return { status: 404, json: {} };
    },
    async postJson() {
      return { status: 403, json: {} };
    },
  };
}

function service(listClientHints: SharePointPmService['listClientHints']) {
  const communications: Array<Record<string, unknown>> = [];
  return {
    communications,
    listClientHints,
    async upsertCommunicationIndex(row: Record<string, unknown>) {
      communications.push(row);
    },
    async upsertMeetingIndex() {
      /* not exercised */
    },
    async upsertContactIndex() {
      /* not exercised */
    },
  };
}

describe('fabricSync.clientHints health honesty', () => {
  it('reports ready and count>0 after a completed sweep without leaking identifiers', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'fabric-hints-health-ready-'));
    const svc = service(async () => [
      { clientCode: 'CCB01', displayName: 'Colorado Craft Beef' },
      { clientCode: 'PDG01', displayName: 'Precision Dental Group' },
    ]);
    try {
      const result = await runFabricSync({
        service: svc as unknown as SharePointPmService,
        fabric: mailGraph([]) as never,
        dataDir: dir,
        bootstrap: true,
      });
      assert.equal(result.checkpoint.clientHintsCount, 2);
      assert.equal(result.checkpoint.clientHintsError, false);
      const health = inspectFabricSyncHealth(dir, { sweepEnabled: true });
      assert.equal(health.clientHints.status, 'ready');
      assert.equal(health.clientHints.count, 2);
      assert.equal(health.clientHints.count > 0, true);
      assert.match(health.clientHints.reason, /loaded on the last completed sweep/);
      const dumped = JSON.stringify(health.clientHints);
      assert.equal(FORBIDDEN_HINT_IDS.test(dumped), false);
      assert.equal(/Bearer |deltatoken/i.test(JSON.stringify(health)), false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reports empty and count=0 without inventing ClientCodes', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'fabric-hints-health-empty-'));
    const svc = service(async () => []);
    try {
      const result = await runFabricSync({
        service: svc as unknown as SharePointPmService,
        fabric: mailGraph([
          {
            id: 'm-empty',
            conversationId: 'conv-empty',
            subject: 'Internal HVCG ops standup',
            bodyPreview: 'Internal high value solutions note. Do not invent a ClientCode.',
            receivedDateTime: '2026-08-24T00:00:00Z',
            from: { emailAddress: { address: 'manny@highvaluecapitalgroup.com' } },
            webLink: 'https://outlook.office.com/mail/m-empty',
          },
        ]) as never,
        dataDir: dir,
        bootstrap: true,
      });
      assert.equal(result.checkpoint.clientHintsCount, 0);
      assert.equal(result.checkpoint.clientHintsError, false);
      assert.equal(result.notes.some((note) => /Client hints unavailable/.test(note)), false);
      assert.equal(svc.communications[0]?.clientCode, undefined);
      assert.equal(
        svc.communications.some((row) => FORBIDDEN_HINT_IDS.test(String(row.clientCode || ''))),
        false,
      );
      const health = inspectFabricSyncHealth(dir, { sweepEnabled: true });
      assert.equal(health.clientHints.status, 'empty');
      assert.equal(health.clientHints.count, 0);
      assert.match(health.clientHints.reason, /empty hint list/);
      assert.equal(FORBIDDEN_HINT_IDS.test(JSON.stringify(health.clientHints)), false);
      assert.equal(FORBIDDEN_HINT_IDS.test(JSON.stringify(health)), false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('error path stays fail-closed and count is 0 with no invented ClientCodes', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'fabric-hints-health-error-'));
    const svc = service(async () => tokenFailed());
    try {
      const result = await runFabricSync({
        service: svc as unknown as SharePointPmService,
        fabric: mailGraph([
          {
            id: 'm-err',
            conversationId: 'conv-err',
            subject: 'Internal HVCG ops standup',
            bodyPreview: 'Internal high value solutions note. Do not invent a ClientCode.',
            receivedDateTime: '2026-08-24T00:00:00Z',
            from: { emailAddress: { address: 'manny@highvaluecapitalgroup.com' } },
            webLink: 'https://outlook.office.com/mail/m-err',
          },
        ]) as never,
        dataDir: dir,
        bootstrap: true,
      });
      assert.equal(result.checkpoint.clientHintsCount, 0);
      assert.equal(result.checkpoint.clientHintsError, true);
      assert.ok(result.notes.some((note) => /empty client resolver/.test(note)));
      assert.equal(svc.communications[0]?.clientCode, undefined);
      assert.equal(
        svc.communications.some((row) => row.clientCode === 'CCB01' || row.clientCode === 'PDG01'),
        false,
      );
      const health = inspectFabricSyncHealth(dir, { sweepEnabled: true });
      assert.equal(health.clientHints.status, 'error');
      assert.equal(health.clientHints.count, 0);
      assert.match(health.clientHints.reason, /empty resolver/);
      assert.equal(FORBIDDEN_HINT_IDS.test(JSON.stringify(health.clientHints)), false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('never writes Client B onto a Client A thread when hints are ready', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'fabric-hints-health-isolate-'));
    const svc = service(async () => [
      { clientCode: 'CCB01', displayName: 'Colorado Craft Beef' },
      { clientCode: 'PDG01', displayName: 'Precision Dental Group' },
    ]);
    try {
      await runFabricSync({
        service: svc as unknown as SharePointPmService,
        fabric: mailGraph([
          {
            id: 'm-a',
            conversationId: 'conv-a',
            subject: 'Colorado Craft Beef weekly',
            bodyPreview: 'CCB packet.',
            receivedDateTime: '2026-08-24T00:00:00Z',
            from: { emailAddress: { address: 'a@example.com' } },
            webLink: 'https://outlook.office.com/mail/m-a',
          },
          {
            id: 'm-b',
            conversationId: 'conv-b',
            subject: 'Precision Dental Group weekly',
            bodyPreview: 'PDG packet.',
            receivedDateTime: '2026-08-24T00:00:00Z',
            from: { emailAddress: { address: 'b@example.com' } },
            webLink: 'https://outlook.office.com/mail/m-b',
          },
        ]) as never,
        dataDir: dir,
        bootstrap: true,
      });
      const byKey = new Map(svc.communications.map((row) => [String(row.idempotencyKey), row]));
      assert.equal(byKey.get('mail:conv-a')?.clientCode, 'CCB01');
      assert.equal(byKey.get('mail:conv-b')?.clientCode, 'PDG01');
      assert.equal(byKey.get('mail:conv-a')?.clientCode === 'PDG01', false);
      assert.equal(byKey.get('mail:conv-b')?.clientCode === 'CCB01', false);
      const health = inspectFabricSyncHealth(dir, { sweepEnabled: true });
      assert.equal(health.clientHints.status, 'ready');
      assert.equal(health.clientHints.count, 2);
      assert.equal(FORBIDDEN_HINT_IDS.test(JSON.stringify(health.clientHints)), false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reports skipped before a completed sweep and error when the checkpoint is unreadable', () => {
    const emptyDir = mkdtempSync(join(tmpdir(), 'fabric-hints-health-skip-'));
    const badDir = mkdtempSync(join(tmpdir(), 'fabric-hints-health-unread-'));
    try {
      const skipped = inspectFabricSyncHealth(emptyDir, { sweepEnabled: true });
      assert.equal(skipped.clientHints.status, 'skipped');
      assert.equal(skipped.clientHints.count, 0);
      writeFileSync(join(badDir, 'fabric-checkpoint.json'), '{not-json', 'utf8');
      const broken = inspectFabricSyncHealth(badDir, { sweepEnabled: true });
      assert.equal(broken.clientHints.status, 'error');
      assert.equal(broken.clientHints.count, 0);
      assert.equal(FORBIDDEN_HINT_IDS.test(JSON.stringify(skipped.clientHints)), false);
      assert.equal(FORBIDDEN_HINT_IDS.test(JSON.stringify(broken.clientHints)), false);
    } finally {
      rmSync(emptyDir, { recursive: true, force: true });
      rmSync(badDir, { recursive: true, force: true });
    }
  });

  it('persists last-sweep hint count so /health survives across requests', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'fabric-hints-health-persist-'));
    try {
      await runFabricSync({
        service: service(async () => [
          { clientCode: 'CCB01', displayName: 'Colorado Craft Beef' },
        ]) as unknown as SharePointPmService,
        fabric: mailGraph([]) as never,
        dataDir: dir,
        bootstrap: true,
      });
      const stored = JSON.parse(readFileSync(join(dir, 'fabric-checkpoint.json'), 'utf8')) as {
        clientHintsCount?: number;
        clientHintsError?: boolean;
      };
      assert.equal(stored.clientHintsCount, 1);
      assert.equal(stored.clientHintsError, false);
      const first = inspectFabricSyncHealth(dir, { sweepEnabled: true });
      const second = inspectFabricSyncHealth(dir, { sweepEnabled: true });
      assert.equal(first.clientHints.status, 'ready');
      assert.equal(first.clientHints.count, 1);
      assert.equal(second.clientHints.count, 1);
      assert.equal(second.clientHints.status, first.clientHints.status);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('GET /health includes fabricSync.clientHints without identifiers', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'fabric-hints-health-http-'));
    writeFileSync(
      join(dir, 'fabric-checkpoint.json'),
      JSON.stringify({
        lastRunAt: '2026-08-24T17:51:59.236Z',
        mailMode: 'delta',
        mailDeltaReady: true,
        clientHintsCount: 5,
        clientHintsError: false,
        counts: {},
        lastIndexed: {},
        lastNotes: ['Mail delta reached HTTP 200.'],
      }),
      'utf8',
    );
    const prev = {
      NODE_ENV: process.env.NODE_ENV,
      HOST: process.env.INTEGRATION_HOST,
      KEY: process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY,
      TENANT: process.env.MICROSOFT_TENANT_ID,
      PM: process.env.INTEGRATION_PM_BACKEND,
      REQUIRE: process.env.INTEGRATION_REQUIRE_AUTH,
      INSECURE: process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH,
      DATA: process.env.INTEGRATION_DATA_DIR,
    };
    process.env.NODE_ENV = 'development';
    process.env.INTEGRATION_HOST = '127.0.0.1';
    process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
    process.env.MICROSOFT_TENANT_ID = '11111111-1111-1111-1111-111111111111';
    process.env.INTEGRATION_PM_BACKEND = 'development-json';
    process.env.INTEGRATION_DATA_DIR = dir;
    delete process.env.INTEGRATION_REQUIRE_AUTH;
    delete process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH;
    const cfg: AppConfig = { ...loadConfig(), dataDir: dir };
    const repo = new IntegrationRepository(dir, cfg.tokenEncryptionKeyB64);
    const pm = new PmRepository(dir);
    const app = buildRegistry(cfg, repo);
    const localAi = createLocalAiAdapter({ env: { LOCAL_AI_ENABLED: undefined }, secretsFileEnv: {} });
    const server = createServer((req, res) => {
      handleRequest({ cfg, repo, app, pm, localAi }, req, res).catch((err) => {
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'server_error', message: String(err) }));
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const { port } = server.address() as AddressInfo;
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      assert.equal(res.status, 200);
      const body = (await res.json()) as {
        fabricSync?: { clientHints?: { status?: string; count?: number; reason?: string } };
      };
      assert.equal(body.fabricSync?.clientHints?.status, 'ready');
      assert.equal(body.fabricSync?.clientHints?.count, 5);
      assert.equal(FORBIDDEN_HINT_IDS.test(JSON.stringify(body.fabricSync?.clientHints)), false);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
      rmSync(dir, { recursive: true, force: true });
      if (prev.NODE_ENV === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = prev.NODE_ENV;
      if (prev.HOST === undefined) delete process.env.INTEGRATION_HOST;
      else process.env.INTEGRATION_HOST = prev.HOST;
      if (prev.KEY === undefined) delete process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY;
      else process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = prev.KEY;
      if (prev.TENANT === undefined) delete process.env.MICROSOFT_TENANT_ID;
      else process.env.MICROSOFT_TENANT_ID = prev.TENANT;
      if (prev.PM === undefined) delete process.env.INTEGRATION_PM_BACKEND;
      else process.env.INTEGRATION_PM_BACKEND = prev.PM;
      if (prev.REQUIRE === undefined) delete process.env.INTEGRATION_REQUIRE_AUTH;
      else process.env.INTEGRATION_REQUIRE_AUTH = prev.REQUIRE;
      if (prev.INSECURE === undefined) delete process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH;
      else process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH = prev.INSECURE;
      if (prev.DATA === undefined) delete process.env.INTEGRATION_DATA_DIR;
      else process.env.INTEGRATION_DATA_DIR = prev.DATA;
    }
  });

  it('reuses listClientHints and does not invent a second Graph identity product', async () => {
    let calls = 0;
    const hints = await loadClientHintsWithFabricRetry({
      async listClientHints() {
        calls += 1;
        return [];
      },
    });
    assert.equal(calls, 1);
    assert.equal(hints.error, undefined);
    assert.equal(hints.clients.length, 0);
  });
});
