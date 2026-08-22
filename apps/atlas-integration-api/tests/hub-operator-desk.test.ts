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
import { renderOperatorDeskHtml, renderUnsignedOperatorDesk } from '../src/pm/operatorDesk/html.ts';
import { buildOperatorDeskModel, emptyHonestDesk, emptyHonestOperatingPicture } from '../src/pm/operatorDesk/model.ts';

const SYN01 = 'SYN01';
const ACME01 = 'ACME01';

async function withHub(
  resolveCodes: (oid: string | undefined) => Promise<string[]>,
  fn: (ctx: { base: string }) => Promise<void>,
) {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-operator-desk-'));
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
  const cfg: AppConfig = {
    ...loadConfig(),
    verifyAccessToken: async (token: string) => {
      if (token === 'valid-member') {
        return {
          oid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          preferred_username: 'member@example.com',
          roles: ['HVCG Team Member'],
          scp: 'access_as_user',
        };
      }
      if (token === 'valid-client') {
        return {
          oid: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
          preferred_username: 'client@example.com',
          roles: ['Client Executive'],
          scp: 'access_as_user',
        };
      }
      if (token === 'valid-roleless') {
        return {
          oid: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
          preferred_username: 'sp@example.com',
          roles: [],
          scp: 'access_as_user',
        };
      }
      if (token === 'valid-roleless-empty') {
        return {
          oid: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
          preferred_username: 'empty-sp@example.com',
          roles: [],
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
    handleRequest({ cfg, repo, app, pm, localAi }, req, res).catch((err) => {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'server_error', message: String(err) }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as AddressInfo).port;
  try {
    await fn({ base: `http://127.0.0.1:${port}` });
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
    if (prev.DATA === undefined) delete process.env.INTEGRATION_DATA_DIR;
    else process.env.INTEGRATION_DATA_DIR = prev.DATA;
  }
}

describe('operator desk copy', () => {
  it('unsigned HTML has no CRM rows and forbids invented commercial facts', () => {
    const html = renderUnsignedOperatorDesk();
    assert.match(html, /Microsoft sign-in required/);
    assert.match(html, /fail-closed/);
    assert.match(html, /Ask Atlas attention is fail-closed/);
    assert.equal(html.includes(SYN01), false);
    assert.equal(html.includes(ACME01), false);
    assert.equal(html.includes('250000'), false);
    assert.equal(html.includes('Prodigy Games'), false);
    assert.match(html, /does not invent LTV/);
  });

  it('entitled HTML renders honest empty commercial lanes from recorded-only context', () => {
    const model = buildOperatorDeskModel({
      hubSha: 'ea31592',
      entitledClients: [SYN01],
      commandCenter: {
        businessHealth: { activeProjects: 1, openTasks: 2, overdueTasks: 0, decisionsNeeded: 1, clientsNeedingAttention: 0, atRiskProjects: 0 },
        ownerApprovals: [{ id: 'task-1', title: 'Approve SYN01 activation' }],
        myDay: { decisionsNeeded: [{ id: 'dec-1', title: 'Decide next SYN01 action' }], overdue: [], waitingFollowUps: [] },
        criticalAlerts: [],
      },
      commercialContext: emptyHonestDesk(1),
      attentionItems: [{ id: 'docreq-1', title: 'SYNQA W-9 request (SYNTHETIC QA)', href: '/api/pm/clients/SYN01/document-requests', kind: 'document_request' }],
      realClientsNeedingAttention: 0,
    });
    const html = renderOperatorDeskHtml(model);
    assert.match(html, /SYNQA W-9 request/);
    assert.match(html, /Client workspace preview/);
    assert.match(html, /Client journey/);
    assert.match(html, /\/api\/pm\/clients\/SYN01\/desk/);
    assert.deepEqual(model.clientJourneys, []);
    assert.match(html, /Approve SYN01 activation/);
    assert.match(html, /What we are working on/);
    assert.match(html, /Synthetic QA work/);
    assert.match(html, /Waiting/);
    assert.match(html, /Recovered HVS clients/);
    assert.match(html, /Recovered client operating records/);
    assert.match(html, /HVCG vs client responsibilities/);
    assert.match(html, /Missing documents/);
    assert.match(html, /HVCG —/);
    assert.match(html, /Client —/);
    assert.match(html, /1 waiting/);
    assert.match(html, /4 missing-document notes/);
    assert.match(html, /No inventoried files yet in/);
    assert.ok(html.indexOf('<h2>Needs Action</h2>') < html.indexOf('<h2>Waiting</h2>'));
    assert.ok(html.indexOf('<h2>Waiting</h2>') < html.indexOf('<h2>Decision Required</h2>'));
    assert.ok(html.indexOf('<h2>Decision Required</h2>') < html.indexOf('<h2>Capital</h2>'));
    assert.ok(html.indexOf('<h2>Capital</h2>') < html.indexOf('<h2>Overdue</h2>'));
    assert.ok(html.indexOf('<h2>Overdue</h2>') < html.indexOf('<h2>Blocked</h2>'));
    assert.ok(html.indexOf('<h2>Blocked</h2>') < html.indexOf('<h2>At Risk</h2>'));
    assert.ok(html.indexOf('<h2>At Risk</h2>') < html.indexOf('<h2>Recovered HVS clients</h2>'));
    assert.match(html, /Recovered exception counts/);
    assert.match(html, /past-due invoice filenames and capital-packet filenames/);
    assert.match(html, /Past Due Invoice/);
    assert.match(html, /payment status and amounts not extracted/);
    assert.match(html, /<h2>Capital<\/h2>/);
    assert.match(html, /amounts and funding status not extracted/);
    assert.equal((html.match(/<h2>Capital<\/h2>/g) || []).length, 1);
    assert.equal((html.match(/<h2>Waiting<\/h2>/g) || []).length, 1);
    assert.equal((html.match(/<h2>Decision Required<\/h2>/g) || []).length, 1);
    const recoveredRecordsHtml = html.slice(
      html.indexOf('<h2>Recovered client operating records</h2>'),
      html.indexOf('<h2>HVCG vs client responsibilities</h2>'),
    );
    const responsibilitiesHtml = html.slice(
      html.indexOf('<h2>HVCG vs client responsibilities</h2>'),
      html.indexOf('<h2>Missing documents</h2>'),
    );
    const missingHtml = html.slice(
      html.indexOf('<h2>Missing documents</h2>'),
      html.indexOf('<h2>Recovered capital packets</h2>'),
    );
    assert.equal(recoveredRecordsHtml.includes('class="kind"'), false);
    assert.equal(responsibilitiesHtml.includes('class="kind"'), false);
    assert.equal(missingHtml.includes('class="kind"'), false);
    assert.equal(html.includes('Use recovered filenames as reference-only knowledge'), false);
    assert.match(html, /Recovered capital packets/);
    assert.match(html, /Recovered documents/);
    assert.match(html, /Recovered projects/);
    assert.match(html, /ACCG Inc/);
    assert.match(html, /Final Installment/);
    assert.match(html, /knowledge operationalized/);
    assert.match(html, /SBA Express/);
    assert.match(html, /amountsExtracted=false/);
    assert.match(html, /reference-only/);
    assert.match(html, /Blocked/);
    assert.match(html, /At Risk/);
    assert.match(html, /Decision Required/);
    assert.match(html, /Missing or blocked data/);
    assert.match(html, /HVS_DATA_ACCESS=PARTIAL/);
    assert.match(html, /does not invent work/);
    assert.match(html, /SYN01 is not a customer operationalization/);
    assert.equal(model.operatingPicture.invented, false);
    assert.equal(model.operatingPicture.hvsDataAccess, 'PARTIAL');
    assert.equal(model.operatingPicture.honestEmpty, true);
    assert.deepEqual(model.operatingPicture.realClientsOperationalized, []);
    assert.equal(model.operatingPicture.hvsRecoveredClients.length, 12);
    assert.ok((model.operatingPicture.hvsRecoveredProjects?.length || 0) >= 10);
    assert.ok(model.operatingPicture.hvsRecoveredProjects.some((row) => row.client === 'Final Installment'));
    assert.ok(model.operatingPicture.hvsRecoveredProjects.some((row) => row.client === 'Colorado Beef'));
    assert.equal(model.operatingPicture.hvsRecoveredClients[0]?.operationalized, false);
    assert.equal(model.operatingPicture.hvsRecoveredClientRecords.length, 12);
    assert.ok(model.operatingPicture.hvsRecoveredClientRecords.some((row) => row.client === 'ACCG Inc' && row.knowledgeOperationalized));
    assert.ok(model.operatingPicture.hvsRecoveredCapitalPackets.some((row) => row.client === 'Colorado Beef'));
    assert.ok(model.operatingPicture.recoveredClientsKnowledgeOperationalized.includes('ACCG01'));
    assert.equal(model.operatingPicture.hvsRecoveredClients[0]?.knowledgeIndexed, true);
    assert.ok((model.operatingPicture.hvsRecoveredDocuments?.length || 0) >= 20);
    assert.ok(model.operatingPicture.queues.needsAction.some((row) => row.kind === 'hvs_recovered_action'));
    assert.equal(
      model.operatingPicture.queues.waiting.some((row) => row.kind === 'hvs_actionable_waiting' && !row.href),
      true,
    );
    assert.ok(
      model.operatingPicture.queues.overdue.some(
        (row) =>
          row.kind === 'hvs_actionable_overdue' &&
          row.clientCode === 'PDG01' &&
          /past-due invoice filename/i.test(row.title) &&
          !row.href,
      ),
    );
    assert.equal(model.operatingPicture.queues.overdue.length, 2);
    assert.ok(
      model.operatingPicture.queues.needsAction.some(
        (row) =>
          row.kind === 'hvs_actionable_capital' &&
          row.clientCode === 'CCB01' &&
          /capital-packet filename/i.test(row.title) &&
          !row.href,
      ),
    );
    assert.ok(
      model.operatingPicture.queues.needsAction.some(
        (row) => row.kind === 'hvs_actionable_capital' && /Prodigy Games/i.test(row.title),
      ),
    );
    assert.equal(model.operatingPicture.queues.atRisk.length, 1);
    assert.ok(
      model.operatingPicture.queues.atRisk.some(
        (row) =>
          row.kind === 'hvs_actionable_at_risk' &&
          row.clientCode === 'PDG01' &&
          /past-due invoice filenames and capital-packet filenames/i.test(row.title) &&
          !row.href,
      ),
    );
    assert.match(html, /Ask Atlas — What needs attention/);
    assert.match(html, /WHAT ARE THE MOST IMPORTANT THINGS I NEED TO ADDRESS ACROSS HVCG RIGHT NOW/);
    assert.match(html, /Based on:/);
    const askHtml = html.slice(
      html.indexOf('<h2>Ask Atlas — What needs attention</h2>'),
      html.indexOf('<h2>Client workspace preview</h2>'),
    );
    assert.match(askHtml, /Prodigy Games/);
    assert.match(askHtml, /PDG01/);
    assert.match(askHtml, /LIKELY/);
    assert.match(askHtml, /past-due invoice filenames and capital-packet filenames/i);
    assert.equal(askHtml.includes('$'), false);
    assert.equal(askHtml.includes('250000'), false);
    const askItems = [...askHtml.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((match) => match[1]);
    assert.equal(
      askItems.some((item) => item.includes('At Risk') && item.includes('Colorado Beef')),
      false,
    );
    assert.equal(model.askAtlas.invented, false);
    assert.equal(model.askAtlas.honestEmpty, false);
    assert.ok(
      model.askAtlas.items.some(
        (row) =>
          row.state === 'At Risk' &&
          row.client === 'Prodigy Games' &&
          row.clientCode === 'PDG01' &&
          row.classification === 'LIKELY',
      ),
    );
    assert.equal(
      model.askAtlas.items.some(
        (row) => row.state === 'At Risk' && (row.client === 'Colorado Beef' || row.clientCode === 'CCB01'),
      ),
      false,
    );
    assert.match(html, /<span class="muted">Waiting<\/span><strong>/);
    assert.match(html, /<span class="muted">Capital<\/span><strong>/);
    assert.match(html, /<span class="muted">At Risk<\/span><strong>1<\/strong>/);
    assert.equal(html.includes('Active projects'), false);
    assert.equal(model.operatingPicture.hvsActionableClientKnowledge.length, 12);
    assert.ok(
      model.operatingPicture.hvsActionableClientKnowledge.some(
        (row) => row.client === 'Colorado Beef' && row.clientResponsibilities.length > 0,
      ),
    );
    assert.equal(model.businessHealth.clientsNeedingAttention, 0);
    assert.equal(model.queues.needsAction[0]?.title.includes('SYNQA W-9'), true);
    assert.match(html, /does not invent LTV/);
    assert.match(html, /does not invent MRI/);
    assert.match(html, /does not invent campaign history/);
    assert.match(html, /liveGtmOutbound=false/);
    assert.equal(html.includes('250000'), false);
    assert.equal(model.liveGtmOutbound, false);
    assert.equal(model.paidAds, false);
    const empty = emptyHonestOperatingPicture();
    assert.equal(empty.kind, 'operator_operating_picture_v1');
    assert.equal(empty.invented, false);
  });
});

describe('operator desk HTTP fail-closed', () => {
  it('unauth HTML/JSON are 401 and entitled desk is Premium-rendered without invented LTV', async () => {
    await withHub(
      async (oid) =>
        oid?.startsWith('aaaaaaaa') || oid?.startsWith('dddddddd') ? [SYN01] : [],
      async ({ base }) => {
      const unauthHtml = await fetch(`${base}/operator`);
      assert.equal(unauthHtml.status, 401);
      assert.match(unauthHtml.headers.get('content-type') || '', /text\/html/);
      const unauthBody = await unauthHtml.text();
      assert.match(unauthBody, /Microsoft sign-in required/);
      assert.equal(unauthBody.includes('250000'), false);

      const unauthJson = await fetch(`${base}/operator.json`);
      assert.equal(unauthJson.status, 401);
      const unauthJsonBody = (await unauthJson.json()) as { error: string; askAtlas?: unknown; operatorDesk?: unknown };
      assert.equal(unauthJsonBody.error, 'unauthorized');
      assert.equal(unauthJsonBody.askAtlas, undefined);
      assert.equal(unauthJsonBody.operatorDesk, undefined);

      const entitled = await fetch(`${base}/operator`, {
        headers: { authorization: 'Bearer valid-member' },
      });
      assert.equal(entitled.status, 200);
      assert.match(entitled.headers.get('content-type') || '', /text\/html/);
      const html = await entitled.text();
      assert.match(html, /Atlas Hub operator desk/);
      assert.match(html, /Ask Atlas — What needs attention/);
      assert.match(html, /does not invent LTV/);
      assert.match(html, /liveGtmOutbound=false/);
      assert.match(html, /Client journey/);
      assert.match(html, /Recovered HVS clients/);
      assert.match(html, /Recovered client operating records/);
      assert.match(html, /Recovered capital packets/);
      assert.match(html, /Recovered documents/);
      assert.match(html, /ACCG Inc/);
      assert.match(html, /SBA Express/);
      assert.match(html, /signedClientSession=false/);
      assert.match(html, /Workspace not staged/);
      assert.equal(html.includes(ACME01), false);
      assert.equal(html.includes('250000'), false);

      const json = await fetch(`${base}/operator.json`, {
        headers: { authorization: 'Bearer valid-member' },
      });
      assert.equal(json.status, 200);
      const body = (await json.json()) as {
        operatorDesk: {
          entitled: boolean;
          liveGtmOutbound: boolean;
          paidAds: boolean;
          entitledClients: string[];
          clientJourneys: Array<{
            clientCode: string;
            classification: string;
            workspaceStaged: boolean;
            invitationStatus: string;
            signedClientSession: boolean;
            gccWorkspaceKey: string;
            stageHref: string;
            reissueHref: string;
            redeemHref: string;
            canStageFromDesk: boolean;
            canReissueInviteFromDesk: boolean;
            nextAction: string;
          }>;
          commercialContext: { gcc: { available: boolean; emptyReason?: string } };
          operatingPicture: {
            invented: boolean;
            hvsDataAccess: string;
            honestEmpty: boolean;
            realClientsOperationalized: string[];
            hvsRecoveredClients: Array<{
              client: string;
              clientCode: string;
              operationalized: boolean;
            }>;
            queues: { waiting: Array<{ kind: string; href?: string }> };
            syntheticQueues: { needsAction: unknown[] };
          };
          askAtlas: {
            kind: string;
            invented: boolean;
            honestEmpty: boolean;
            items: Array<{
              state: string;
              client?: string;
              clientCode?: string;
              classification: string;
              why: string;
              basedOn: string;
            }>;
          };
        };
      };
      assert.equal(body.operatorDesk.entitled, true);
      assert.equal(body.operatorDesk.liveGtmOutbound, false);
      assert.equal(body.operatorDesk.paidAds, false);
      assert.deepEqual(body.operatorDesk.entitledClients, [SYN01]);
      assert.equal(body.operatorDesk.clientJourneys.length, 1);
      assert.equal(body.operatorDesk.clientJourneys[0]?.clientCode, SYN01);
      assert.equal(body.operatorDesk.clientJourneys[0]?.classification, 'SYNTHETIC_QA');
      assert.equal(body.operatorDesk.clientJourneys[0]?.workspaceStaged, false);
      assert.equal(body.operatorDesk.clientJourneys[0]?.invitationStatus, 'none');
      assert.equal(body.operatorDesk.clientJourneys[0]?.signedClientSession, false);
      assert.equal(body.operatorDesk.clientJourneys[0]?.gccWorkspaceKey, 'gcc-SYN01');
      assert.equal(body.operatorDesk.clientJourneys[0]?.canStageFromDesk, true);
      assert.equal(body.operatorDesk.clientJourneys[0]?.canReissueInviteFromDesk, false);
      assert.equal(body.operatorDesk.clientJourneys[0]?.stageHref, `/api/pm/clients/${SYN01}/experience`);
      assert.equal(body.operatorDesk.clientJourneys[0]?.reissueHref, `/api/pm/clients/${SYN01}/invitation/reissue`);
      assert.equal(body.operatorDesk.clientJourneys[0]?.redeemHref, '/api/client/invitations/redeem');
      assert.match(body.operatorDesk.clientJourneys[0]?.nextAction || '', /stageHref/);

      const staged = await fetch(`${base}/api/pm/clients/${SYN01}/experience`, {
        method: 'POST',
        headers: { authorization: 'Bearer valid-member', 'content-type': 'application/json' },
        body: JSON.stringify({
          invitationEmail: 'syn01-owner@synqa.example',
          activationGate: 'authorized',
        }),
      });
      assert.equal(staged.status, 201);
      const stagedBody = (await staged.json()) as { outboundSent: boolean; invitation: { outboundSent: boolean } };
      assert.equal(stagedBody.outboundSent, false);
      assert.equal(stagedBody.invitation.outboundSent, false);

      const after = await fetch(`${base}/operator.json`, {
        headers: { authorization: 'Bearer valid-member' },
      });
      assert.equal(after.status, 200);
      const afterBody = (await after.json()) as {
        operatorDesk: {
          clientJourneys: Array<{
            workspaceStaged: boolean;
            invitationStatus: string;
            canStageFromDesk: boolean;
            canReissueInviteFromDesk: boolean;
            invitationEmail: string | null;
            signedClientSession: boolean;
            nextAction: string;
          }>;
        };
      };
      assert.equal(afterBody.operatorDesk.clientJourneys[0]?.workspaceStaged, true);
      assert.equal(afterBody.operatorDesk.clientJourneys[0]?.invitationStatus, 'staged');
      assert.equal(afterBody.operatorDesk.clientJourneys[0]?.canStageFromDesk, false);
      assert.equal(afterBody.operatorDesk.clientJourneys[0]?.canReissueInviteFromDesk, true);
      assert.equal(afterBody.operatorDesk.clientJourneys[0]?.invitationEmail, 'syn01-owner@synqa.example');
      assert.equal(afterBody.operatorDesk.clientJourneys[0]?.signedClientSession, false);
      assert.match(afterBody.operatorDesk.clientJourneys[0]?.nextAction || '', /reissueHref/);

      const reissued = await fetch(`${base}/api/pm/clients/${SYN01}/invitation/reissue`, {
        method: 'POST',
        headers: { authorization: 'Bearer valid-member', 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      assert.equal(reissued.status, 201);
      const reissuedBody = (await reissued.json()) as { inviteToken: string; outboundSent: boolean };
      assert.equal(reissuedBody.outboundSent, false);
      assert.ok(reissuedBody.inviteToken.length >= 32);

      const rolelessStage = await fetch(`${base}/api/pm/clients/${SYN01}/experience`, {
        method: 'POST',
        headers: { authorization: 'Bearer valid-roleless', 'content-type': 'application/json' },
        body: JSON.stringify({
          invitationEmail: 'syn01-owner@synqa.example',
          activationGate: 'authorized',
        }),
      });
      assert.equal(rolelessStage.status, 200);

      const unsignedRedeem = await fetch(`${base}/api/client/invitations/redeem`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: reissuedBody.inviteToken }),
      });
      assert.equal(unsignedRedeem.status, 200);
      const unsignedBody = (await unsignedRedeem.json()) as {
        clientSessionToken: string;
        signedClientSession: boolean;
        classification: string;
      };
      assert.equal(unsignedBody.signedClientSession, true);
      assert.equal(unsignedBody.classification, 'SYNTHETIC_QA');
      assert.ok(unsignedBody.clientSessionToken.length > 32);

      const signedDesk = await fetch(`${base}/client.json`, {
        headers: { authorization: `Bearer ${unsignedBody.clientSessionToken}` },
      });
      assert.equal(signedDesk.status, 200);
      const signedDeskBody = (await signedDesk.json()) as { clientDesk: { clientCode: string } };
      assert.equal(signedDeskBody.clientDesk.clientCode, SYN01);

      const afterRedeem = await fetch(`${base}/operator.json`, {
        headers: { authorization: 'Bearer valid-member' },
      });
      assert.equal(afterRedeem.status, 200);
      const afterRedeemBody = (await afterRedeem.json()) as {
        operatorDesk: {
          clientJourneys: Array<{
            signedClientSession: boolean;
            invitationStatus: string;
            nextAction: string;
            canReissueInviteFromDesk: boolean;
          }>;
        };
      };
      assert.equal(afterRedeemBody.operatorDesk.clientJourneys[0]?.invitationStatus, 'redeemed');
      assert.equal(afterRedeemBody.operatorDesk.clientJourneys[0]?.signedClientSession, true);
      assert.equal(afterRedeemBody.operatorDesk.clientJourneys[0]?.canReissueInviteFromDesk, true);
      assert.match(afterRedeemBody.operatorDesk.clientJourneys[0]?.nextAction || '', /reissueHref/);

      const clientStillClosed = await fetch(`${base}/client`, {
        headers: { authorization: 'Bearer valid-member' },
      });
      assert.equal(clientStillClosed.status, 403);
      assert.equal(
        body.operatorDesk.clientJourneys.some((row) => row.clientCode === ACME01),
        false,
      );
      assert.equal(body.operatorDesk.commercialContext.gcc.available, false);
      assert.match(body.operatorDesk.commercialContext.gcc.emptyReason || '', /does not invent LTV/);
      assert.equal(body.operatorDesk.operatingPicture.invented, false);
      assert.equal(body.operatorDesk.operatingPicture.hvsDataAccess, 'PARTIAL');
      assert.equal(body.operatorDesk.operatingPicture.honestEmpty, true);
      assert.deepEqual(body.operatorDesk.operatingPicture.realClientsOperationalized, []);
      assert.equal(body.operatorDesk.operatingPicture.hvsRecoveredClients.length, 12);
      assert.equal(
        body.operatorDesk.operatingPicture.hvsRecoveredClients.some(
          (row) => row.client === 'ACCG Inc' && row.operationalized === false,
        ),
        true,
      );
      assert.equal(
        body.operatorDesk.operatingPicture.queues.waiting.some(
          (row) => row.kind === 'hvs_actionable_waiting' && !row.href,
        ),
        true,
      );
      assert.deepEqual(body.operatorDesk.operatingPicture.syntheticQueues.needsAction, []);
      assert.equal(body.operatorDesk.askAtlas.kind, 'ask_atlas_attention_v1');
      assert.equal(body.operatorDesk.askAtlas.invented, false);
      assert.equal(body.operatorDesk.askAtlas.honestEmpty, false);
      assert.ok(
        body.operatorDesk.askAtlas.items.some(
          (row) =>
            row.state === 'At Risk' &&
            row.client === 'Prodigy Games' &&
            row.clientCode === 'PDG01' &&
            row.classification === 'LIKELY',
        ),
      );
      assert.equal(
        body.operatorDesk.askAtlas.items.some(
          (row) => row.state === 'At Risk' && (row.client === 'Colorado Beef' || row.clientCode === 'CCB01'),
        ),
        false,
      );
      assert.equal(JSON.stringify(body.operatorDesk.askAtlas).includes('$'), false);

      const root = await fetch(base);
      assert.equal(root.status, 405);

      const clientDesk = await fetch(`${base}/operator`, {
        headers: { authorization: 'Bearer valid-client' },
      });
      assert.equal(clientDesk.status, 403);
      assert.equal((await clientDesk.text()).includes('Atlas Hub operator desk'), false);

      const roleless = await fetch(`${base}/operator`, {
        headers: { authorization: 'Bearer valid-roleless' },
      });
      assert.equal(roleless.status, 200);
      assert.match(await roleless.text(), /Atlas Hub operator desk/);

      const rolelessEmpty = await fetch(`${base}/operator`, {
        headers: { authorization: 'Bearer valid-roleless-empty' },
      });
      assert.equal(rolelessEmpty.status, 403);
      assert.equal((await rolelessEmpty.text()).includes('Atlas Hub operator desk'), false);
    });
  });
});
