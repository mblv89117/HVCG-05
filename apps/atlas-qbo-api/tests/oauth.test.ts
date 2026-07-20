import assert from 'node:assert/strict';
import { describe, it, before, after } from 'node:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';

/**
 * OAuth route tests — no Intuit network calls.
 * Verifies CSRF state, 503 when unconfigured, and authorize URL shape.
 */

async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('no port');
  return `http://127.0.0.1:${addr.port}`;
}

describe('oauth routes (unconfigured)', () => {
  let baseUrl = '';
  let server: Server;

  before(async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'qbo-oauth-'));
    process.env.QBO_API_DISABLE_AUTOSTART = '1';
    process.env.QBO_DATA_DIR = dataDir;
    process.env.QBO_REQUIRE_AUTH = 'false';
    process.env.QBO_CLIENT_ID = '';
    process.env.QBO_CLIENT_SECRET = '';
    process.env.QBO_TOKEN_ENCRYPTION_KEY = '';
    process.env.QBO_ALLOWED_ORIGINS = 'http://127.0.0.1:5180';

    const { createQboServer } = await import('../src/index.ts');
    const started = createQboServer({ enableScheduler: false, listen: false });
    server = started.server;
    baseUrl = await listen(server);
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it('health reports qboConfigured=false without secrets', async () => {
    const res = await fetch(`${baseUrl}/health`);
    const body = (await res.json()) as { qboConfigured: boolean };
    assert.equal(res.status, 200);
    assert.equal(body.qboConfigured, false);
  });

  it('oauth/start returns 503 when credentials missing', async () => {
    const res = await fetch(`${baseUrl}/api/qbo/oauth/start`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        clientId: 'ws-ccb',
        clientCode: 'CCB',
        consentAcceptedAt: new Date().toISOString(),
        consentVersion: 'atlas-qbo-consent-v1',
      }),
    });
    assert.equal(res.status, 503);
    const body = (await res.json()) as { error: string };
    assert.equal(body.error, 'qbo_not_configured');
  });
});

describe('oauth routes (configured)', () => {
  let baseUrl = '';
  let server: Server;

  before(async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'qbo-oauth2-'));
    process.env.QBO_API_DISABLE_AUTOSTART = '1';
    process.env.QBO_DATA_DIR = dataDir;
    process.env.QBO_REQUIRE_AUTH = 'false';
    process.env.QBO_CLIENT_ID = 'test-client-id';
    process.env.QBO_CLIENT_SECRET = 'test-client-secret';
    process.env.QBO_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 3).toString('base64');
    process.env.QBO_REDIRECT_URI = 'http://127.0.0.1:8788/api/qbo/oauth/callback';
    process.env.QBO_ALLOWED_ORIGINS = 'http://127.0.0.1:5180';

    // Fresh import of config-bound server factory (loadConfig reads env at call time)
    const { createQboServer } = await import('../src/index.ts');
    const started = createQboServer({ enableScheduler: false, listen: false });
    server = started.server;
    baseUrl = await listen(server);
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it('oauth/start returns authorize URL without client secret', async () => {
    const res = await fetch(`${baseUrl}/api/qbo/oauth/start`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        clientId: 'ws-ccb',
        clientCode: 'CCB',
        consentAcceptedAt: new Date().toISOString(),
        consentVersion: 'atlas-qbo-consent-v1',
      }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { authorizeUrl: string; state: string };
    assert.match(body.authorizeUrl, /appcenter\.intuit\.com\/connect\/oauth2/);
    assert.match(body.authorizeUrl, /client_id=test-client-id/);
    assert.ok(body.state.length > 10);
    assert.doesNotMatch(body.authorizeUrl, /test-client-secret/);
  });
});
