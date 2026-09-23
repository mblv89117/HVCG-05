/**
 * W2F live-cert remediation.
 * Ask Atlas finance must quote a hydrated PDG01 GCC observation when
 * workspace truth is SOURCE_UNAVAILABLE. No observation keeps NOT_CERTIFIED.
 * Dollar shapes stay absent. Approval Center is not written.
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EVENT_GCC_VALUE_SIGNAL, type AtlasIntegrationEnvelope } from '@hvcg/atlas-integration-contracts';
import { loadConfig, type AppConfig } from '../src/config.ts';
import { buildRegistry } from '../src/connectors/registry.ts';
import { handleRequest } from '../src/http/router.ts';
import { createLocalAiAdapter } from '../src/local-ai/adapter.ts';
import { createAuthorizedPmRepository, createSharePointPmService } from '../src/pm/backend.ts';
import type { PmGraphTransport } from '../src/pm/sharepoint/graph.ts';
import { PmHttpError } from '../src/pm/sharepoint/errors.ts';
import { IntegrationRepository } from '../src/store/repository.ts';
import type { UserBasicLookup } from '../src/entitlements/userLookup.ts';
import { handleModuleEnvelope } from '../src/modules/ingest/handlers.ts';
import { projectModuleEnvelopeToOverlay } from '../src/modules/ingest/projectToCommercialOverlay.ts';
import { listGrowth360ApprovalRequests } from '../src/modules/ingest/campaignApproval.ts';
import { loadOverlay } from '../src/pm/commercialContext/store.ts';
import { buildOperatorCommercialContext } from '../src/pm/commercialContext/build.ts';
import {
  financeAnswerWhenWorkspaceUnavailable,
  WORKSPACE_TRUTH_SOURCE_UNAVAILABLE,
} from '../src/pm/operatorDesk/askAtlasClientOperatingBrief.ts';
import { resetIdentityRegistry } from '../src/identity/registry.ts';
import type { AtlasPrincipal } from '../src/middleware/auth.ts';

const IMPACT = 424242;
const SUMMARY = 'Delivery depends on a small supplier set';
const FINDING =
  'Vendor concentration is elevated 424242.00 424,242.00 USD 424,242.00 usd424242 $  424,242 and $424,242';
const EVIDENCE = 'Three suppliers cover most recurring delivery runway 6 months cash 12500';
const LEAK_SHAPES = [
  '424242.00',
  '424,242.00',
  '424,242',
  '424242',
  'USD',
  'usd',
  '$',
  '12500',
  '12,500',
  'runway 6 months cash 12500',
  'runway 6',
  '6 months',
  'cash 12500',
  'Fractional CFO',
  'second-location',
  'org-apex',
];

const SITE =
  'contoso.sharepoint.com,11111111-1111-4111-8111-111111111011,22222222-2222-4222-8222-222222222022';
const PROJECTS = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const TASKS = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
const MILESTONES = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';
const CLIENTS = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1';
const MI = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1';
const COMMS = 'ffffffff-ffff-4fff-8fff-fffffffffff3';
const CONTACTS = 'ffffffff-ffff-4fff-8fff-fffffffffff1';
const USER_STAFF = '11111111-1111-4111-8111-111111111003';

function assertMoneyShapesAbsent(text: string, label: string): void {
  for (const shape of LEAK_SHAPES) {
    assert.equal(text.includes(shape), false, `${label} still contains ${shape}`);
  }
}

function principal(codes: string[]): AtlasPrincipal {
  return {
    userId: 'w2f-source-unavailable',
    organizationId: 'org-hvcg',
    allowedClientIds: codes,
    roles: ['HVCG Team Member'],
  };
}

function gccEnvelope(): AtlasIntegrationEnvelope {
  const now = '2026-09-22T18:00:00.000Z';
  return {
    clientCode: 'PDG01',
    source: 'growth_command_center',
    sourceRecordId: 'gcc-pdg-unavailable',
    schemaVersion: 'gcc-value-signal.v1',
    eventType: EVENT_GCC_VALUE_SIGNAL,
    timestamp: now,
    provenance: { system: 'gcc', observedAt: now, confidence: 'VERIFIED' },
    confidence: 'VERIFIED',
    correlationId: 'corr-w2f-unavailable',
    idempotencyKey: 'gcc|PDG01|w2f|unavailable',
    actor: 'gcc-worker',
    authorityClass: 'OBSERVE',
    payload: {
      organizationId: 'org-prodigy-games-llc',
      signalType: 'constraint',
      summary: SUMMARY,
      finding: FINDING,
      evidence: EVIDENCE,
      financialImpact: IMPACT,
      autoProvision: false,
    },
  };
}

function projectPdgSignal(dir: string): void {
  const handled = handleModuleEnvelope(gccEnvelope());
  assert.equal(handled.ok, true);
  if (!handled.ok) return;
  const projected = projectModuleEnvelopeToOverlay(dir, handled.envelope);
  assert.equal(projected.projected, true);
  const signal = loadOverlay(dir).gccSignals[0]!;
  assert.equal(signal.clientCode, 'PDG01');
  assert.equal(signal.copiesLedger, false);
  assert.equal('financialImpact' in signal, false);
  assert.equal(listGrowth360ApprovalRequests(dir).length, 0);
}

const emptyGraph: PmGraphTransport = {
  async listItems() {
    return { items: [] };
  },
  async getItem() {
    return null;
  },
  async createItem() {
    throw new PmHttpError(403, 'forbidden', 'W2F source-unavailable tests are read-only.');
  },
  async patchItemFields() {
    throw new PmHttpError(403, 'forbidden', 'W2F source-unavailable tests are read-only.');
  },
};

const lookupOk: UserBasicLookup = async (oid) => ({
  ok: true,
  profile: {
    id: oid,
    mail: `${oid.slice(0, 8)}@hvcg.example`,
    userPrincipalName: `${oid.slice(0, 8)}@hvcg.example`,
  },
});

async function verify(token: string): Promise<Record<string, unknown>> {
  if (token === 'staff') {
    return { oid: USER_STAFF, roles: ['HVCG Team Member'], scp: 'access_as_user' };
  }
  const err = new Error('invalid') as Error & { status: number; code: string };
  err.status = 401;
  err.code = 'invalid_token';
  throw err;
}

async function withUnavailableWorkspace(
  dir: string,
  fn: (base: string) => Promise<void>,
): Promise<void> {
  const prev = { ...process.env };
  process.env.NODE_ENV = 'production';
  process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
  process.env.INTEGRATION_HOST = '127.0.0.1';
  process.env.MICROSOFT_TENANT_ID = '11111111-1111-1111-1111-111111111111';
  process.env.INTEGRATION_DATA_DIR = dir;
  process.env.INTEGRATION_PM_BACKEND = 'sharepoint';
  process.env.INTEGRATION_PM_SHAREPOINT_SITE_ID = SITE;
  process.env.INTEGRATION_PM_PROJECTS_LIST_ID = PROJECTS;
  process.env.INTEGRATION_PM_TASKS_LIST_ID = TASKS;
  process.env.INTEGRATION_PM_MILESTONES_LIST_ID = MILESTONES;
  process.env.INTEGRATION_PM_CLIENTS_LIST_ID = CLIENTS;
  process.env.INTEGRATION_PM_COMMUNICATIONS_LIST_ID = COMMS;
  process.env.INTEGRATION_PM_CONTACTS_LIST_ID = CONTACTS;
  process.env.AZURE_CLIENT_ID = MI;
  process.env.INTEGRATION_ALLOWED_ORIGINS = 'http://127.0.0.1:5180';
  delete process.env.INTEGRATION_REQUIRE_AUTH;
  delete process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH;
  delete process.env.INTEGRATION_BA_BASE_URL;
  delete process.env.INTEGRATION_GCC_APP_ORIGIN;
  const cfg: AppConfig = {
    ...loadConfig(),
    verifyAccessToken: verify,
    resolveAllowedClientIds: async () => ['PDG01', 'HFD01', 'ACCG01'],
    lookupUserBasic: lookupOk,
    pmGraphTransport: emptyGraph,
  };
  const sharepoint = createSharePointPmService(cfg);
  assert.ok(sharepoint);
  assert.equal(createAuthorizedPmRepository(cfg), null);
  const repo = new IntegrationRepository(dir, cfg.tokenEncryptionKeyB64);
  const app = buildRegistry(cfg, repo);
  const localAi = createLocalAiAdapter({ env: { LOCAL_AI_ENABLED: undefined }, secretsFileEnv: {} });
  const server = createServer((req, res) => {
    handleRequest({ cfg, repo, app, pm: null, sharepoint, localAi }, req, res).catch((err) => {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'server_error', message: String(err) }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as AddressInfo).port;
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    for (const key of Object.keys(process.env)) {
      if (!(key in prev)) delete process.env[key];
    }
    Object.assign(process.env, prev);
  }
}

async function askAtlas(base: string, question: string) {
  const url = new URL(`${base}/operator/runtime.json`);
  url.searchParams.set('question', question);
  const res = await fetch(url, {
    headers: { authorization: 'Bearer staff', 'content-type': 'application/json' },
  });
  const body = (await res.json()) as {
    workflowAnswer?: string;
    operatorDesk?: { askAtlas?: { items?: Array<{ state?: string; classification?: string }> } };
    runtime?: { workspaceTruth?: string; portfolioFallback?: boolean; policyClass?: string; autoSend?: boolean };
  };
  return { status: res.status, body };
}

describe('W2F GCC observation when workspace is SOURCE_UNAVAILABLE', () => {
  beforeEach(() => {
    resetIdentityRegistry();
  });

  it('quotes a hydrated PDG01 signal on a finance question without certifying a ledger', () => {
    const dir = mkdtempSync(join(tmpdir(), 'w2f-unavail-unit-'));
    try {
      projectPdgSignal(dir);
      const ctx = buildOperatorCommercialContext({
        principal: principal(['PDG01', 'HFD01', 'ACCG01']),
        overlay: loadOverlay(dir),
        clientCode: 'PDG01',
      });
      const finance = financeAnswerWhenWorkspaceUnavailable('PDG01', ctx);
      assert.match(finance, /signalType=constraint/);
      assert.match(finance, /Delivery depends on a small supplier set/);
      assert.match(finance, /observation-only/);
      assert.match(finance, /copiesLedger=false/);
      assert.match(finance, /canExecute=false/);
      assert.match(finance, /Not a certified ledger/);
      assert.match(finance, /SOURCE_UNAVAILABLE/);
      assert.match(finance, /Document availability is SOURCE_UNAVAILABLE/);
      assert.match(finance, /will not substitute recovered or portfolio data/i);
      assert.match(finance, /financialContext=NOT_CERTIFIED/);
      assert.match(finance, /capitalSubmit=false/);
      assert.equal(finance.includes(String(IMPACT)), false);
      assertMoneyShapesAbsent(finance, 'observation finance');
      assert.equal(listGrowth360ApprovalRequests(dir).length, 0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('keeps NOT_CERTIFIED honesty when no GCC observation is hydrated', () => {
    const finance = financeAnswerWhenWorkspaceUnavailable('PDG01', undefined);
    assert.match(finance, new RegExp(WORKSPACE_TRUTH_SOURCE_UNAVAILABLE));
    assert.match(finance, /financialContext remains NOT_CERTIFIED/);
    assert.match(finance, /growthContext remains NOT_CERTIFIED/);
    assert.equal(finance.includes('signalType='), false);
    assert.equal(finance.includes(SUMMARY), false);
    assert.match(finance, /will not substitute recovered or portfolio data/i);
    assert.match(finance, /canExecute=false/);
    assert.match(finance, /capitalSubmit=false/);
  });

  it('redacts dollar shapes that are still present on a hydrated summary', () => {
    const ctx = buildOperatorCommercialContext({
      principal: principal(['PDG01']),
      overlay: {
        gccSignals: [
          {
            contractVersion: 'gcc-value-signal.v1',
            signalId: 'gcc-pdg-raw',
            clientCode: 'PDG01',
            signalType: 'constraint',
            summary: `${SUMMARY} ${FINDING} ${EVIDENCE}`,
            emittedAt: '2026-09-22T18:00:00.000Z',
            copiesLedger: false,
            idempotencyKey: 'gcc|PDG01|w2f|raw-summary',
          },
        ],
        preCallBriefs: [],
        attributions: [],
        copilotAssessments: [],
      },
      clientCode: 'PDG01',
    });
    const finance = financeAnswerWhenWorkspaceUnavailable('PDG01', ctx);
    assert.match(finance, /signalType=constraint/);
    assert.match(finance, /Delivery depends on a small supplier set/);
    assert.match(finance, /copiesLedger=false/);
    assert.match(finance, /canExecute=false/);
    assert.equal(finance.includes(String(IMPACT)), false);
    assertMoneyShapesAbsent(finance, 'raw summary finance');
  });

  it('Ask Atlas finance quotes the hydrated signal when SharePoint workspace is SOURCE_UNAVAILABLE', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'w2f-unavail-http-'));
    try {
      projectPdgSignal(dir);
      await withUnavailableWorkspace(dir, async (base) => {
        const finance = await askAtlas(base, 'What is the finance picture for PDG01?');
        assert.equal(finance.status, 200);
        const text = finance.body.workflowAnswer || '';
        assert.match(text, /signalType=constraint/);
        assert.match(text, /Delivery depends on a small supplier set/);
        assert.match(text, /observation-only/);
        assert.match(text, /copiesLedger=false/);
        assert.match(text, /canExecute=false/);
        assert.match(text, /Not a certified ledger/);
        assert.match(text, /SOURCE_UNAVAILABLE/);
        assert.match(text, /Document availability is SOURCE_UNAVAILABLE/);
        assert.match(text, /will not substitute recovered or portfolio data/i);
        assert.match(text, /financialContext=NOT_CERTIFIED/);
        assert.match(text, /capitalSubmit=false/);
        assert.equal(text.includes(String(IMPACT)), false);
        assertMoneyShapesAbsent(text, 'ask atlas source-unavailable finance');
        assert.equal(finance.body.runtime?.workspaceTruth, 'SOURCE_UNAVAILABLE');
        assert.equal(finance.body.runtime?.portfolioFallback, false);
        assert.equal(finance.body.runtime?.policyClass, 'READ_AUTO');
        assert.equal(finance.body.runtime?.autoSend, false);
        const item = finance.body.operatorDesk?.askAtlas?.items?.[0];
        assert.notEqual(item?.classification, 'CONFIRMED');
        assert.notEqual(item?.state, 'Decision Required');

        const known = await askAtlas(base, 'What does Atlas know about PDG01 financials?');
        assert.equal(known.status, 200);
        assert.match(known.body.workflowAnswer || '', /signalType=constraint/);
        assert.match(known.body.workflowAnswer || '', /SOURCE_UNAVAILABLE/);
        assert.match(known.body.workflowAnswer || '', /copiesLedger=false/);
        assert.match(known.body.workflowAnswer || '', /canExecute=false/);
        assertMoneyShapesAbsent(known.body.workflowAnswer || '', 'financials known');

        const working = await askAtlas(base, 'What are we working on for PDG01?');
        assert.equal(working.status, 200);
        const workingText = working.body.workflowAnswer || '';
        assert.match(workingText, /SOURCE_UNAVAILABLE/);
        assert.match(workingText, /financialContext remains NOT_CERTIFIED/);
        assert.equal(workingText.includes('signalType='), false);
        assert.equal(workingText.includes(SUMMARY), false);
        assertMoneyShapesAbsent(workingText, 'working on');
        assert.equal(working.body.runtime?.workspaceTruth, 'SOURCE_UNAVAILABLE');
      });
      assert.equal(listGrowth360ApprovalRequests(dir).length, 0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('Ask Atlas finance stays NOT_CERTIFIED when the workspace is unavailable and no signal is hydrated', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'w2f-unavail-empty-'));
    try {
      await withUnavailableWorkspace(dir, async (base) => {
        const finance = await askAtlas(base, 'What is the finance picture for PDG01?');
        assert.equal(finance.status, 200);
        const text = finance.body.workflowAnswer || '';
        assert.match(text, /SOURCE_UNAVAILABLE/);
        assert.match(text, /financialContext remains NOT_CERTIFIED/);
        assert.match(text, /growthContext remains NOT_CERTIFIED/);
        assert.equal(text.includes('signalType='), false);
        assert.equal(text.includes(SUMMARY), false);
        assert.match(text, /canExecute=false/);
        assert.match(text, /capitalSubmit=false/);
        assert.equal(finance.body.runtime?.workspaceTruth, 'SOURCE_UNAVAILABLE');
        assert.equal(finance.body.runtime?.portfolioFallback, false);
        assertMoneyShapesAbsent(text, 'empty finance');
      });
      assert.equal(listGrowth360ApprovalRequests(dir).length, 0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
