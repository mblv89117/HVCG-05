/**
 * ATLAS-M365-FABRIC-CLIENT-HINTS-TIMEOUT-001
 * Share the 15s fabric MSI timeout/retry for listClientHints.
 * Empty resolver stays fail-closed. Never invent ClientCodes.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { PmHttpError } from '../src/pm/sharepoint/errors.ts';
import { createSharePointPmService } from '../src/pm/backend.ts';
import {
  FABRIC_MSI_TOKEN_TIMEOUT_MS,
  createManagedIdentityTokenProvider,
  fabricMsiTokenProviderOptions,
} from '../src/pm/sharepoint/token.ts';
import {
  FABRIC_CLIENT_HINT_ATTEMPTS,
  loadClientHintsWithFabricRetry,
  runFabricSync,
} from '../src/pm/sharepoint/fabric/sync.ts';
import { MANNY_ENTRA_OID } from '../src/pm/sharepoint/manny.ts';
import type { SharePointPmService } from '../src/pm/sharepoint/repository.ts';

const CLIENT_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1';
const ACCESS_TOKEN = 'test-access-token-sentinel-do-not-leak';

function expiresOn(secondsFromNow = 3600): string {
  return String(Math.floor(Date.now() / 1000) + secondsFromNow);
}

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
            '@odata.deltaLink': `/v1.0/users/${MANNY_ENTRA_OID}/mailFolders/inbox/messages/delta?$deltatoken=hints`,
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

describe('listClientHints fabric MSI timeout and retry', () => {
  it('PM Graph token used by listClientHints shares the 15s fabric MSI timeout', () => {
    const opts = fabricMsiTokenProviderOptions();
    assert.equal(opts.timeoutMs, 15_000);
    assert.equal(opts.timeoutMs, FABRIC_MSI_TOKEN_TIMEOUT_MS);
    assert.equal(FABRIC_CLIENT_HINT_ATTEMPTS, 4);
    const created = createSharePointPmService({
      pmBackend: { mode: 'unavailable', classification: 'unavailable' },
    } as never);
    assert.equal(created, null);
  });

  it('retries listClientHints token timeout then recovers entitled hints', async () => {
    let calls = 0;
    const hints = await loadClientHintsWithFabricRetry({
      async listClientHints() {
        calls += 1;
        if (calls < 3) tokenFailed();
        return [{ clientCode: 'CCB01', displayName: 'Colorado Craft Beef' }];
      },
    });
    assert.equal(calls, 3);
    assert.equal(hints.error, undefined);
    assert.deepEqual(
      hints.clients.map((c) => c.clientCode),
      ['CCB01'],
    );
  });

  it('token abort still fail-closes and empty resolver writes no ClientCode', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'fabric-hints-timeout-'));
    let calls = 0;
    const svc = service(async () => {
      calls += 1;
      tokenFailed();
    });
    try {
      const result = await runFabricSync({
        service: svc as unknown as SharePointPmService,
        fabric: mailGraph([
          {
            id: 'm-a',
            conversationId: 'conv-a',
            subject: 'Internal HVCG ops standup',
            bodyPreview: 'Internal high value solutions note. Do not invent a ClientCode.',
            receivedDateTime: '2026-08-24T00:00:00Z',
            from: { emailAddress: { address: 'manny@highvaluecapitalgroup.com' } },
            webLink: 'https://outlook.office.com/mail/m-a',
          },
        ]) as never,
        dataDir: dir,
        bootstrap: true,
      });
      assert.equal(calls, FABRIC_CLIENT_HINT_ATTEMPTS);
      assert.ok(result.notes.some((note) => /Client hints unavailable/.test(note)));
      assert.ok(result.notes.some((note) => /empty client resolver/.test(note)));
      assert.equal(result.checkpoint.mailDeltaReady, true);
      assert.equal(result.checkpoint.clientHintsCount, 0);
      assert.equal(result.checkpoint.clientHintsError, true);
      assert.equal(svc.communications.length, 1);
      assert.equal(svc.communications[0]?.clientCode, undefined);
      assert.equal(
        svc.communications.some((row) => row.clientCode === 'CCB01' || row.clientCode === 'PDG01'),
        false,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('never writes Client B onto a Client A thread when hints recover', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'fabric-hints-isolate-'));
    let calls = 0;
    const svc = service(async () => {
      calls += 1;
      if (calls === 1) tokenFailed();
      return [
        { clientCode: 'CCB01', displayName: 'Colorado Craft Beef' },
        { clientCode: 'PDG01', displayName: 'Precision Dental Group' },
      ];
    });
    try {
      const result = await runFabricSync({
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
      assert.equal(calls, 2);
      assert.equal(result.checkpoint.clientHintsCount, 2);
      assert.equal(result.checkpoint.clientHintsError, false);
      assert.equal(result.notes.some((note) => /Client hints unavailable/.test(note)), false);
      const byKey = new Map(svc.communications.map((row) => [String(row.idempotencyKey), row]));
      assert.equal(byKey.get('mail:conv-a')?.clientCode, 'CCB01');
      assert.equal(byKey.get('mail:conv-b')?.clientCode, 'PDG01');
      assert.equal(byKey.get('mail:conv-a')?.clientCode === 'PDG01', false);
      assert.equal(byKey.get('mail:conv-b')?.clientCode === 'CCB01', false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('fabric MSI token retry after abort still fail-closes without a second identity', async () => {
    let fetches = 0;
    const provider = createManagedIdentityTokenProvider(CLIENT_ID, {
      env: {
        IDENTITY_ENDPOINT: 'http://127.0.0.1:8081/msi/token',
        IDENTITY_HEADER: 'test-identity-header-sentinel-do-not-leak',
      },
      ...fabricMsiTokenProviderOptions({ timeoutMs: 20 }),
      fetch: async (_input, init) => {
        fetches += 1;
        return new Promise((_, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const err = new Error('aborted');
            err.name = 'AbortError';
            reject(err);
          });
        });
      },
    });
    await assert.rejects(
      () => provider.getToken(),
      (err: unknown) =>
        err instanceof PmHttpError &&
        err.code === 'PM_TOKEN_ACQUISITION_FAILED' &&
        err.message === 'Managed identity token acquisition failed.',
    );
    assert.equal(fetches, 1);
  });
});
