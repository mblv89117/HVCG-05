/**
 * ATLAS-M365-CURRENT-CLIENT-BACKFILL-001
 * Current-client enumeration, identity map, reconciliation, isolation, fail-closed.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig, type AppConfig } from '../src/config.ts';
import { buildRegistry } from '../src/connectors/registry.ts';
import { handleRequest } from '../src/http/router.ts';
import { createLocalAiAdapter } from '../src/local-ai/adapter.ts';
import { createAuthorizedPmRepository } from '../src/pm/backend.ts';
import { IntegrationRepository } from '../src/store/repository.ts';
import type { AtlasPrincipal } from '../src/middleware/auth.ts';
import {
  buildIdentityMapFromClients,
  enumerateAuthoritativeCurrentClients,
  mapsToBusinessMemoryIntent,
  reconcileClientOperatingRecord,
} from '../src/pm/operatorDesk/clientBusinessMemory.ts';
import {
  readBusinessMemoryOverlay,
  resolveBusinessMemoryDir,
  upsertOperatingRecord,
  writeBusinessMemoryOverlay,
} from '../src/pm/operatorDesk/businessMemoryState.ts';
import { emptyHonestOperatingPicture } from '../src/pm/operatorDesk/model.ts';
import { isOperatorBusinessMemoryPath } from '../src/pm/operatorDesk/types.ts';
import { MANNY_ENTRA_OID, bootstrapMannyPrincipal } from '../src/pm/sharepoint/manny.ts';
import type { SharePointPmService } from '../src/pm/sharepoint/repository.ts';

const staff: AtlasPrincipal = {
  userId: '11111111-1111-4111-8111-aaaaaaaaaa01',
  organizationId: 'org-hvcg',
  allowedClientIds: ['HFD01', 'PDG01'],
  roles: ['HVCG Team Member'],
};

const otherClient: AtlasPrincipal = {
  userId: '22222222-2222-4222-8222-bbbbbbbbbbb2',
  organizationId: 'org-hvcg',
  allowedClientIds: ['HFD01'],
  roles: ['HVCG Team Member'],
};

function mockService(): SharePointPmService {
  return {
    async listAuthorizedClients(principal) {
      const codes = principal.allowedClientIds || [];
      return codes.map((clientCode) => ({
        id: clientCode,
        itemId: '1',
        clientCode,
        displayName: `${clientCode} Test Co`,
        source: 'sharepoint',
      }));
    },
    async listAuthorizedProjects() {
      return [
        {
          id: 'proj-hfd',
          name: 'HFD01 entitled project',
          clientCode: 'HFD01',
          objective: 'Entitled objective on Hub row.',
          nextAction: 'Review entitled next action.',
          status: 'active',
          updatedAt: '2026-08-20T18:04:00Z',
        },
        {
          id: 'proj-pdg-leak',
          name: 'PDG01 leak',
          clientCode: 'PDG01',
          objective: 'Must not leak to HFD01',
          nextAction: 'hidden',
          status: 'active',
          updatedAt: '2026-08-20T18:04:00Z',
        },
      ];
    },
    async listAuthorizedTasks() {
      return [];
    },
    async listAuthorizedLeads() {
      return [];
    },
    async listAuthorizedOpportunities() {
      return [];
    },
    async listAuthorizedMilestones() {
      return [];
    },
    async listClientHints() {
      return [
        { clientCode: 'HFD01', displayName: 'HFD Co' },
        { clientCode: 'PDG01', displayName: 'Prodigy' },
      ];
    },
  } as SharePointPmService;
}

async function withHub(
  resolveCodes: (oid: string | undefined) => Promise<string[]>,
  fn: (ctx: { base: string; dir: string; auth: Record<string, string> }) => Promise<void>,
) {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-business-memory-'));
  const prev = {
    NODE_ENV: process.env.NODE_ENV,
    HOST: process.env.INTEGRATION_HOST,
    KEY: process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY,
    TENANT: process.env.MICROSOFT_TENANT_ID,
    PM: process.env.INTEGRATION_PM_BACKEND,
    DATA: process.env.INTEGRATION_DATA_DIR,
  };
  process.env.NODE_ENV = 'development';
  process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
  process.env.INTEGRATION_HOST = '127.0.0.1';
  process.env.MICROSOFT_TENANT_ID = '11111111-1111-1111-1111-111111111111';
  process.env.INTEGRATION_DATA_DIR = dir;
  process.env.INTEGRATION_PM_BACKEND = 'development-json';
  delete process.env.INTEGRATION_REQUIRE_AUTH;
  delete process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH;

  const baseCfg = loadConfig();
  const cfg: AppConfig = {
    ...baseCfg,
    verifyAccessToken: async (token: string) => {
      if (token === 'valid-member') {
        return {
          oid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          preferred_username: 'member@example.com',
          roles: ['HVCG Team Member'],
          scp: 'access_as_user',
        };
      }
      const err = new Error('Invalid or expired Microsoft token') as Error & { status: number; code: string };
      err.status = 401;
      err.code = 'invalid_token';
      throw err;
    },
    resolveAllowedClientIds: resolveCodes,
  };
  const repo = new IntegrationRepository(dir, cfg.tokenEncryptionKeyB64);
  const pm = createAuthorizedPmRepository(cfg);
  const app = buildRegistry(cfg, repo);
  const localAi = createLocalAiAdapter({ env: { LOCAL_AI_ENABLED: undefined }, secretsFileEnv: {} });
  const server = createServer((req, res) => {
    handleRequest({ cfg, repo, app, pm, localAi, sharepoint: mockService() }, req, res).catch((err) => {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'server_error', message: String(err) }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as AddressInfo).port;
  const base = `http://127.0.0.1:${port}`;
  const auth = { Authorization: 'Bearer valid-member', 'x-atlas-operator-desk': 'v1' };
  try {
    await fn({ base, dir, auth });
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    rmSync(dir, { recursive: true, force: true });
    process.env.NODE_ENV = prev.NODE_ENV;
    process.env.INTEGRATION_HOST = prev.HOST;
    process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = prev.KEY;
    process.env.MICROSOFT_TENANT_ID = prev.TENANT;
    process.env.INTEGRATION_PM_BACKEND = prev.PM;
    process.env.INTEGRATION_DATA_DIR = prev.DATA;
  }
}

describe('business memory backfill', () => {
  it('registers operator business-memory path', () => {
    assert.equal(isOperatorBusinessMemoryPath('/operator/business-memory.json'), true);
  });

  it('enumerates authoritative current clients without synthetic QA codes', async () => {
    const service = mockService();
    const clients = await enumerateAuthoritativeCurrentClients(staff, service);
    assert.deepEqual(clients.map((c) => c.clientCode).sort(), ['HFD01', 'PDG01']);
    assert.equal(clients.some((c) => c.clientCode === 'SYNTH01'), false);
  });

  it('builds identity map from Hub clients only — no auto-promote HVS-only', () => {
    const picture = emptyHonestOperatingPicture();
    const map = buildIdentityMapFromClients(
      [{ clientCode: 'HFD01', displayName: 'HFD Test Co' }],
      picture,
    );
    assert.equal(map.length, 1);
    assert.equal(map[0]!.currentClient, true);
    assert.equal(map[0]!.authoritativeSource, 'HVCG_Clients');
  });

  it('reconciles operating record without cross-client project leak', async () => {
    const picture = emptyHonestOperatingPicture();
    const record = await reconcileClientOperatingRecord({
      clientCode: 'HFD01',
      clientName: 'HFD Test Co',
      picture,
      principal: staff,
      pmSearch: {
        results: [
          {
            id: 'comm-1',
            title: 'HFD01 thread',
            kind: 'communication',
            clientCode: 'HFD01',
            preview: 'We will follow up on the entitled package.',
            source: 'HVCG_Communications',
          },
          {
            id: 'proj-hfd',
            title: 'HFD01 entitled project',
            kind: 'project',
            clientCode: 'HFD01',
            objective: 'Entitled objective',
            nextAction: 'Review next action',
            source: 'HVCG_Projects',
          },
          {
            id: 'proj-pdg-leak',
            title: 'PDG01 leak',
            kind: 'project',
            clientCode: 'PDG01',
            objective: 'leak',
            source: 'HVCG_Projects',
          },
        ],
      },
    });
    assert.equal(record.clientCode, 'HFD01');
    assert.equal(record.projectsReconstructed >= 1, true);
    assert.equal(record.whatWeAreWorkingOn?.some((r) => r.includes('PDG01')), false);
    assert.equal(record.commitments.length >= 1, true);
  });

  it('overlay upsert is idempotent for the same client record', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-bm-idempotent-'));
    const picture = emptyHonestOperatingPicture();
    const pmSearch = {
      results: [
        {
          id: 'comm-1',
          title: 'HFD01 thread',
          kind: 'communication',
          clientCode: 'HFD01',
          preview: 'We will send the update.',
          source: 'HVCG_Communications',
        },
      ],
    };
    try {
      const record = await reconcileClientOperatingRecord({
        clientCode: 'HFD01',
        clientName: 'HFD Co',
        picture,
        principal: staff,
        pmSearch,
      });
      const memDir = resolveBusinessMemoryDir(dir);
      let overlay = readBusinessMemoryOverlay(memDir);
      upsertOperatingRecord(overlay, record);
      writeBusinessMemoryOverlay(memDir, overlay);
      overlay = readBusinessMemoryOverlay(memDir);
      upsertOperatingRecord(overlay, { ...record, lastBackfillAt: new Date().toISOString() });
      writeBusinessMemoryOverlay(memDir, overlay);
      const finalOverlay = readBusinessMemoryOverlay(memDir);
      assert.equal(finalOverlay.operatingRecords.filter((r) => r.clientCode === 'HFD01').length, 1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('maps business-memory Ask Atlas intents', () => {
    assert.equal(mapsToBusinessMemoryIntent('What are we working on for Prodigy?'), true);
    assert.equal(mapsToBusinessMemoryIntent('random unrelated question'), false);
  });

  it('bootstrap Manny principal carries operational client codes for MI sweep', () => {
    const principal = bootstrapMannyPrincipal(['HFD01', 'PDG01']);
    assert.equal(principal.userId, MANNY_ENTRA_OID);
    assert.deepEqual(principal.allowedClientIds, ['HFD01', 'PDG01']);
    assert.equal(principal.roles.includes('HVCG Owner'), true);
  });

  it('unsigned business-memory endpoint is 401', async () => {
    await withHub(async () => ['HFD01'], async ({ base }) => {
      const res = await fetch(`${base}/operator/business-memory.json`);
      assert.equal(res.status, 401);
      const text = await res.text();
      assert.equal(text.includes('PDG01'), false);
    });
  });

  it('signed GET business-memory returns status without other-client leakage', async () => {
    await withHub(async () => ['HFD01'], async ({ base, auth }) => {
      const res = await fetch(`${base}/operator/business-memory.json`, { headers: auth });
      assert.equal(res.status, 200);
      const body = (await res.json()) as {
        businessMemory?: { status?: { kind: string; identityMap?: Array<{ clientCode: string }> } };
      };
      assert.equal(body.businessMemory?.status?.kind, 'business_memory_status_v1');
      const codes = body.businessMemory?.status?.identityMap?.map((r) => r.clientCode) ?? [];
      assert.equal(codes.includes('PDG01'), false);
      const raw = JSON.stringify(body);
      assert.equal(raw.includes('PDG01'), false);
    });
  });
});
