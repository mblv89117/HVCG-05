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
import { MANNY_ENTRA_OID } from '../src/pm/sharepoint/manny.ts';
import { renderUnsignedClientDesk } from '../src/clientExperience/desk.ts';
import { isClientEntitledPmPath, isClientOnlyPrincipal } from '../src/clientExperience/roles.ts';
import { hashInviteToken, issueInviteToken, SYNQA_CLIENT_SESSION_PREFIX } from '../src/clientExperience/store.ts';

const SYN_A = 'SYNQA01';
const SYN_B = 'SYNQB02';

async function withHub(fn: (ctx: { base: string }) => Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-client-exp-'));
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
      if (token === 'manny') {
        return {
          oid: MANNY_ENTRA_OID,
          preferred_username: 'manny@hvcg.example',
          roles: ['HVCG Owner'],
          scp: 'access_as_user',
        };
      }
      if (token === 'staff') {
        return {
          oid: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          preferred_username: 'staff@hvcg.example',
          roles: ['HVCG Team Member'],
          scp: 'access_as_user',
        };
      }
      if (token === 'entitled-staff') {
        return {
          oid: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
          preferred_username: 'entitled-staff@hvcg.example',
          roles: ['HVCG Team Member'],
          scp: 'access_as_user',
        };
      }
      if (token === 'client-a') {
        return {
          oid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          preferred_username: 'owner-a@synqa.example',
          roles: ['Client Executive'],
          scp: 'access_as_user',
        };
      }
      if (token === 'client-b') {
        return {
          oid: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
          preferred_username: 'owner-b@synqb.example',
          roles: ['Client Executive'],
          scp: 'access_as_user',
        };
      }
      const err = new Error('Invalid or expired Microsoft token') as Error & { status: number; code: string };
      err.status = 401;
      err.code = 'invalid_token';
      throw err;
    },
    resolveAllowedClientIds: async (oid?: string) =>
      oid === 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' ? [SYN_A] : [],
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

function auth(token: string) {
  return { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
}

describe('client experience helpers', () => {
  it('treats Client Executive without staff roles as client-only', () => {
    assert.equal(
      isClientOnlyPrincipal({
        userId: 'u1',
        organizationId: 'org-hvcg',
        allowedClientIds: [SYN_A],
        roles: ['Client Executive'],
      }),
      true,
    );
    assert.equal(
      isClientOnlyPrincipal({
        userId: 'u2',
        organizationId: 'org-hvcg',
        allowedClientIds: [SYN_A],
        roles: ['Client Executive', 'HVCG Team Member'],
      }),
      false,
    );
    assert.equal(isClientEntitledPmPath(`/api/pm/clients/${SYN_A}/portal`), true);
    assert.equal(isClientEntitledPmPath(`/api/pm/clients/${SYN_A}/document-requests`), true);
    assert.equal(isClientEntitledPmPath(`/api/pm/clients/${SYN_A}/attention`), true);
    assert.equal(isClientEntitledPmPath(`/api/pm/clients/${SYN_A}/desk`), true);
    assert.equal(isClientEntitledPmPath(`/api/pm/clients/${SYN_A}/desk.json`), true);
    assert.equal(isClientEntitledPmPath('/api/pm/documents'), true);
    assert.equal(isClientEntitledPmPath('/api/pm/search'), true);
    assert.equal(isClientEntitledPmPath('/api/pm/my-work'), true);
    assert.equal(isClientEntitledPmPath('/api/pm/clients'), false);
    assert.equal(isClientEntitledPmPath(`/api/pm/clients/${SYN_A}/activation`), false);
  });

  it('hashes invitation tokens and never treats the raw token as the stored secret', () => {
    const issued = issueInviteToken();
    assert.equal(issued.token === issued.tokenHash, false);
    assert.equal(hashInviteToken(issued.token), issued.tokenHash);
    assert.match(renderUnsignedClientDesk(), /Microsoft sign-in required/);
    assert.equal(renderUnsignedClientDesk().includes(SYN_A), false);
  });
});

describe('synthetic client journey isolation', () => {
  it('stages, invites, authenticates, exchanges documents, and fail-closes cross-client access', async () => {
    await withHub(async ({ base }) => {
      const unsignedDesk = await fetch(`${base}/client`);
      assert.equal(unsignedDesk.status, 401);
      const unsignedHtml = await unsignedDesk.text();
      assert.match(unsignedHtml, /Microsoft sign-in required/);
      assert.equal(unsignedHtml.includes(SYN_A), false);

      const unsignedApi = await fetch(`${base}/api/client/workspace`);
      assert.equal(unsignedApi.status, 401);

      const tooEarly = await fetch(`${base}/api/pm/clients/${SYN_A}/experience`, {
        method: 'POST',
        headers: auth('manny'),
        body: JSON.stringify({
          invitationEmail: 'owner-a@synqa.example',
          activationGate: 'activation_required',
        }),
      });
      assert.equal(tooEarly.status, 409);

      const staffStage = await fetch(`${base}/api/pm/clients/${SYN_A}/experience`, {
        method: 'POST',
        headers: auth('staff'),
        body: JSON.stringify({
          invitationEmail: 'owner-a@synqa.example',
          activationGate: 'authorized',
        }),
      });
      assert.equal(staffStage.status, 403);

      const foreignStage = await fetch(`${base}/api/pm/clients/${SYN_B}/experience`, {
        method: 'POST',
        headers: auth('entitled-staff'),
        body: JSON.stringify({
          invitationEmail: 'owner-b@synqb.example',
          activationGate: 'authorized',
        }),
      });
      assert.equal(foreignStage.status, 403);

      const entitledStage = await fetch(`${base}/api/pm/clients/${SYN_A}/experience`, {
        method: 'POST',
        headers: auth('entitled-staff'),
        body: JSON.stringify({
          displayName: 'Synthetic QA Client A',
          invitationEmail: 'entitled-owner-a@synqa.example',
          activationGate: 'authorized',
        }),
      });
      assert.equal(entitledStage.status, 201);
      const entitledStaged = (await entitledStage.json()) as {
        workspace: { clientCode: string };
        invitation: { outboundSent: boolean };
        outboundSent: boolean;
      };
      assert.equal(entitledStaged.workspace.clientCode, SYN_A);
      assert.equal(entitledStaged.invitation.outboundSent, false);
      assert.equal(entitledStaged.outboundSent, false);

      const entitledStatus = await fetch(`${base}/api/pm/clients/${SYN_A}/experience`, {
        headers: auth('entitled-staff'),
      });
      assert.equal(entitledStatus.status, 200);

      const foreignReissue = await fetch(`${base}/api/pm/clients/${SYN_B}/invitation/reissue`, {
        method: 'POST',
        headers: auth('entitled-staff'),
        body: JSON.stringify({}),
      });
      assert.equal(foreignReissue.status, 403);

      const staffReissue = await fetch(`${base}/api/pm/clients/${SYN_A}/invitation/reissue`, {
        method: 'POST',
        headers: auth('staff'),
        body: JSON.stringify({}),
      });
      assert.equal(staffReissue.status, 403);

      const entitledReissue = await fetch(`${base}/api/pm/clients/${SYN_A}/invitation/reissue`, {
        method: 'POST',
        headers: auth('entitled-staff'),
        body: JSON.stringify({}),
      });
      assert.equal(entitledReissue.status, 201);
      const reissued = (await entitledReissue.json()) as {
        inviteToken: string;
        outboundSent: boolean;
        invitation: { email: string; outboundSent: boolean; status: string };
        redeemHref: string;
      };
      assert.equal(reissued.outboundSent, false);
      assert.equal(reissued.invitation.outboundSent, false);
      assert.equal(reissued.invitation.status, 'staged');
      assert.equal(reissued.invitation.email, 'entitled-owner-a@synqa.example');
      assert.equal(reissued.redeemHref, '/api/client/invitations/redeem');
      assert.ok(reissued.inviteToken.length >= 32);

      const stagedA = await fetch(`${base}/api/pm/clients/${SYN_A}/experience`, {
        method: 'POST',
        headers: auth('manny'),
        body: JSON.stringify({
          displayName: 'Synthetic QA Client A',
          invitationEmail: 'owner-a@synqa.example',
          activationGate: 'authorized',
        }),
      });
      assert.equal(stagedA.status, 201);
      const stagedABody = (await stagedA.json()) as {
        workspace: {
          clientCode: string;
          entraGroupProvisioned: boolean;
          outboundInviteSent: boolean;
          gccWorkspaceKey: string;
          portalHref: string;
          documentRequestHref: string;
          clientDeskHref: string;
          portalAccessProvisioned: boolean;
          documentRequestPathProvisioned: boolean;
          clientPortalHrefs: {
            portalHref: string;
            documentRequestHref: string;
            clientDeskHref: string;
          };
        };
        invitation: { email: string; outboundSent: boolean };
        inviteToken: string;
        outboundSent: boolean;
      };
      assert.equal(stagedABody.workspace.clientCode, SYN_A);
      assert.equal(stagedABody.workspace.entraGroupProvisioned, false);
      assert.equal(stagedABody.workspace.outboundInviteSent, false);
      assert.equal(stagedABody.outboundSent, false);
      assert.equal(stagedABody.workspace.gccWorkspaceKey, `gcc-${SYN_A}`);
      assert.equal(stagedABody.workspace.portalHref, `/api/pm/clients/${SYN_A}/portal`);
      assert.equal(stagedABody.workspace.documentRequestHref, `/api/pm/clients/${SYN_A}/document-requests`);
      assert.equal(stagedABody.workspace.clientDeskHref, '/client');
      assert.equal(stagedABody.workspace.clientPortalHrefs.portalHref, `/api/pm/clients/${SYN_A}/portal`);
      assert.equal(stagedABody.workspace.clientPortalHrefs.documentRequestHref, `/api/pm/clients/${SYN_A}/document-requests`);
      assert.equal(stagedABody.workspace.clientPortalHrefs.clientDeskHref, '/client');
      assert.equal(stagedABody.workspace.portalAccessProvisioned, true);
      assert.equal(stagedABody.workspace.documentRequestPathProvisioned, true);
      assert.ok(stagedABody.inviteToken.length >= 32);

      const stagedB = await fetch(`${base}/api/pm/clients/${SYN_B}/experience`, {
        method: 'POST',
        headers: auth('manny'),
        body: JSON.stringify({
          displayName: 'Synthetic QA Client B',
          invitationEmail: 'owner-b@synqb.example',
          activationGate: 'verified',
        }),
      });
      assert.equal(stagedB.status, 201);
      const stagedBBody = (await stagedB.json()) as { inviteToken: string; workspace: { clientCode: string } };
      assert.equal(stagedBBody.workspace.clientCode, SYN_B);

      const clientDeniedOperator = await fetch(`${base}/api/pm/clients`, { headers: auth('client-a') });
      assert.equal(clientDeniedOperator.status, 403);
      const operatorDeskDenied = await fetch(`${base}/operator.json`, { headers: auth('client-a') });
      assert.equal(operatorDeskDenied.status, 403);

      const staffRedeem = await fetch(`${base}/api/client/invitations/redeem`, {
        method: 'POST',
        headers: auth('staff'),
        body: JSON.stringify({ token: stagedABody.inviteToken }),
      });
      assert.equal(staffRedeem.status, 403);

      const mismatch = await fetch(`${base}/api/client/invitations/redeem`, {
        method: 'POST',
        headers: auth('client-b'),
        body: JSON.stringify({ token: stagedABody.inviteToken }),
      });
      assert.equal(mismatch.status, 403);

      const badToken = await fetch(`${base}/api/client/invitations/redeem`, {
        method: 'POST',
        headers: auth('client-a'),
        body: JSON.stringify({ token: '00'.repeat(32) }),
      });
      assert.equal(badToken.status, 403);

      const redeemedA = await fetch(`${base}/api/client/invitations/redeem`, {
        method: 'POST',
        headers: auth('client-a'),
        body: JSON.stringify({ token: stagedABody.inviteToken }),
      });
      assert.equal(redeemedA.status, 200);
      const redeemedB = await fetch(`${base}/api/client/invitations/redeem`, {
        method: 'POST',
        headers: auth('client-b'),
        body: JSON.stringify({ token: stagedBBody.inviteToken }),
      });
      assert.equal(redeemedB.status, 200);

      const workspaceA = await fetch(`${base}/api/client/workspace`, { headers: auth('client-a') });
      assert.equal(workspaceA.status, 200);
      const workspaceABody = (await workspaceA.json()) as {
        workspace: {
          clientCode: string;
          attention: Array<{ id: string; title: string }>;
          documents: unknown[];
          documentRequests: Array<{ clientCode: string; binariesInAtlas: boolean }>;
          projects: Array<{ name: string }>;
          gcc: { workspaceKey: string; clientCode: string };
          commercial: { clientCode: string; liveGtmOutbound: boolean };
          portal: { portalHref: string; documentRequestHref: string; operatorChrome: boolean };
          workspace: { portalHref: string };
        };
      };
      assert.equal(workspaceABody.workspace.clientCode, SYN_A);
      assert.equal(workspaceABody.workspace.gcc.workspaceKey, `gcc-${SYN_A}`);
      assert.equal(workspaceABody.workspace.commercial.liveGtmOutbound, false);
      assert.equal(workspaceABody.workspace.portal.operatorChrome, false);
      assert.equal(workspaceABody.workspace.portal.portalHref, `/api/pm/clients/${SYN_A}/portal`);
      assert.equal(
        workspaceABody.workspace.portal.documentRequestHref,
        `/api/pm/clients/${SYN_A}/document-requests`,
      );
      assert.ok(workspaceABody.workspace.documentRequests.every((row) => row.clientCode === SYN_A));
      assert.ok(workspaceABody.workspace.documentRequests.every((row) => row.binariesInAtlas === false));
      assert.ok(workspaceABody.workspace.attention.length >= 1);
      assert.ok(workspaceABody.workspace.projects.some((p) => p.name.includes('kickoff')));
      const clientAttention = await fetch(`${base}/api/client/attention`, { headers: auth('client-a') });
      assert.equal(clientAttention.status, 200);
      const clientAttentionBody = (await clientAttention.json()) as {
        clientCode: string;
        attention: Array<{ title: string }>;
        binariesInAtlas: boolean;
      };
      assert.equal(clientAttentionBody.clientCode, SYN_A);
      assert.equal(clientAttentionBody.binariesInAtlas, false);
      assert.ok(clientAttentionBody.attention.length >= 1);
      const stolenAttention = await fetch(`${base}/api/client/attention`, { headers: auth('client-b') });
      assert.equal(stolenAttention.status, 200);
      const stolenAttentionBody = (await stolenAttention.json()) as { clientCode: string };
      assert.equal(stolenAttentionBody.clientCode, SYN_B);

      const crossWorkspace = await fetch(`${base}/api/client/workspace/${SYN_B}`, { headers: auth('client-a') });
      assert.equal(crossWorkspace.status, 403);

      const requests = await fetch(`${base}/api/client/requests`, { headers: auth('client-a') });
      assert.equal(requests.status, 200);
      const requestsBody = (await requests.json()) as {
        attention: Array<{ id: string; kind: string }>;
        clientCode: string;
        binariesInAtlas: boolean;
        invented: boolean;
        decisions: { kind: string; openCount: number; invented: boolean };
        documentExchange: { outstandingCount: number; missingHonesty: string; invented: boolean };
      };
      assert.equal(requestsBody.clientCode, SYN_A);
      assert.equal(requestsBody.binariesInAtlas, false);
      assert.equal(requestsBody.invented, false);
      assert.equal(requestsBody.decisions.kind, 'client_decisions_v1');
      assert.ok(requestsBody.decisions.openCount >= 1);
      assert.equal(requestsBody.documentExchange.invented, false);
      assert.ok(requestsBody.documentExchange.outstandingCount >= 1);
      const docRequest = requestsBody.attention.find((row) => row.kind === 'document');
      const decisionRequest = requestsBody.attention.find((row) => row.kind === 'decision');
      assert.ok(docRequest);
      assert.ok(decisionRequest);

      const exchangeBefore = await fetch(`${base}/api/client/document-exchange`, { headers: auth('client-a') });
      assert.equal(exchangeBefore.status, 200);
      const exchangeBeforeBody = (await exchangeBefore.json()) as {
        clientCode: string;
        invented: boolean;
        sharePointNavigation: boolean;
        binariesInAtlas: boolean;
        documentExchange: {
          outstandingCount: number;
          missing: Array<{ title: string; status: string; clientCode: string }>;
          missingHonesty: string;
        };
      };
      assert.equal(exchangeBeforeBody.clientCode, SYN_A);
      assert.equal(exchangeBeforeBody.invented, false);
      assert.equal(exchangeBeforeBody.sharePointNavigation, false);
      assert.equal(exchangeBeforeBody.binariesInAtlas, false);
      assert.ok(exchangeBeforeBody.documentExchange.outstandingCount >= 1);
      assert.ok(exchangeBeforeBody.documentExchange.missing.every((row) => row.clientCode === SYN_A));
      assert.match(exchangeBeforeBody.documentExchange.missingHonesty, /outstanding/);
      const stolenExchange = await fetch(`${base}/api/client/document-exchange`, { headers: auth('client-b') });
      assert.equal(stolenExchange.status, 200);
      const stolenExchangeBody = (await stolenExchange.json()) as { clientCode: string };
      assert.equal(stolenExchangeBody.clientCode, SYN_B);

      const uploaded = await fetch(`${base}/api/client/documents`, {
        method: 'POST',
        headers: auth('client-a'),
        body: JSON.stringify({
          title: 'Operating agreement',
          fileName: 'oa.txt',
          contentType: 'text/plain',
          contentB64: Buffer.from('synthetic-oa-synqa01', 'utf8').toString('base64'),
          requestedId: docRequest?.id,
        }),
      });
      assert.equal(uploaded.status, 201);
      const uploadedBody = (await uploaded.json()) as { document: { id: string; clientCode: string; contentB64?: string } };
      assert.equal(uploadedBody.document.clientCode, SYN_A);
      assert.equal(uploadedBody.document.contentB64, undefined);

      const retrieved = await fetch(`${base}/api/client/documents/${uploadedBody.document.id}`, {
        headers: auth('client-a'),
      });
      assert.equal(retrieved.status, 200);
      const retrievedBody = (await retrieved.json()) as { document: { contentB64: string; title: string } };
      assert.equal(Buffer.from(retrievedBody.document.contentB64, 'base64').toString('utf8'), 'synthetic-oa-synqa01');

      const stolen = await fetch(`${base}/api/client/documents/${uploadedBody.document.id}`, {
        headers: auth('client-b'),
      });
      assert.equal(stolen.status, 403);

      const listed = await fetch(`${base}/api/client/documents`, { headers: auth('client-a') });
      const listedBody = (await listed.json()) as {
        documents: Array<{ title: string; clientCode?: string }>;
        clientCode: string;
        documentExchange: { outstandingCount: number; receivedCount: number; missingHonesty: string };
      };
      assert.equal(listedBody.clientCode, SYN_A);
      assert.ok(listedBody.documents.some((doc) => doc.title === 'Operating agreement'));
      assert.equal(listedBody.documentExchange.outstandingCount, 0);
      assert.ok(listedBody.documentExchange.receivedCount >= 1);
      assert.match(listedBody.documentExchange.missingHonesty, /No outstanding requested documents/);

      const decisions = await fetch(`${base}/api/client/decisions`, { headers: auth('client-a') });
      assert.equal(decisions.status, 200);
      const decisionsBody = (await decisions.json()) as {
        clientCode: string;
        invented: boolean;
        decisions: { openCount: number; decisions: Array<{ title: string }> };
      };
      assert.equal(decisionsBody.clientCode, SYN_A);
      assert.equal(decisionsBody.invented, false);
      assert.ok(decisionsBody.decisions.decisions.some((row) => row.title.includes('kickoff')));

      const decided = await fetch(`${base}/api/client/requests/${decisionRequest?.id}/decide`, {
        method: 'POST',
        headers: auth('client-a'),
        body: JSON.stringify({ decision: 'accepted' }),
      });
      assert.equal(decided.status, 200);

      const projects = await fetch(`${base}/api/client/projects`, { headers: auth('client-a') });
      assert.equal(projects.status, 200);
      const projectsBody = (await projects.json()) as {
        clientCode: string;
        invented: boolean;
        priorities: { kind: string; honestEmpty: boolean; projects: Array<{ name: string; priority: string }> };
      };
      assert.equal(projectsBody.clientCode, SYN_A);
      assert.equal(projectsBody.invented, false);
      assert.equal(projectsBody.priorities.kind, 'client_priorities_v1');
      assert.equal(projectsBody.priorities.honestEmpty, false);
      assert.ok(projectsBody.priorities.projects.some((row) => row.name.includes('kickoff')));
      const gcc = await fetch(`${base}/api/client/gcc`, { headers: auth('client-a') });
      const gccBody = (await gcc.json()) as {
        gcc: {
          workspaceKey: string;
          clientCode: string;
          isolated: boolean;
          recordedOnly: boolean;
          liveDispatch: boolean;
          invented: boolean;
          available: boolean;
          classification: string;
          gccHref?: string;
          crossClientFallback: boolean;
          sharePointNavigation: boolean;
          recordedSignals: Array<{ clientCode: string }>;
          binding: { kind: string; liveDispatch: boolean; invented: boolean; crossClientFallback: boolean };
        };
      };
      assert.equal(gccBody.gcc.clientCode, SYN_A);
      assert.equal(gccBody.gcc.isolated, true);
      assert.equal(gccBody.gcc.recordedOnly, true);
      assert.equal(gccBody.gcc.liveDispatch, false);
      assert.equal(gccBody.gcc.invented, false);
      assert.equal(gccBody.gcc.available, false);
      assert.equal(gccBody.gcc.classification, 'SYNTHETIC_QA');
      assert.equal(gccBody.gcc.crossClientFallback, false);
      assert.equal(gccBody.gcc.sharePointNavigation, false);
      assert.deepEqual(gccBody.gcc.recordedSignals, []);
      assert.equal(gccBody.gcc.binding.kind, 'hub_gcc_session_v1');
      assert.equal(gccBody.gcc.binding.liveDispatch, false);
      assert.equal(gccBody.gcc.binding.invented, false);
      assert.equal(gccBody.gcc.binding.crossClientFallback, false);
      assert.equal(gccBody.gcc.gccHref, undefined);
      assert.equal(gccBody.gcc.workspaceKey.includes(SYN_B), false);

      const ownKey = await fetch(`${base}/api/client/gcc?workspaceKey=${encodeURIComponent(gccBody.gcc.workspaceKey)}`, {
        headers: auth('client-a'),
      });
      assert.equal(ownKey.status, 200);
      const foreignKey = await fetch(`${base}/api/client/gcc?workspaceKey=gcc-${SYN_B}`, {
        headers: auth('client-a'),
      });
      assert.equal(foreignKey.status, 403);

      const commercial = await fetch(`${base}/api/client/commercial-context`, { headers: auth('client-a') });
      const commercialBody = (await commercial.json()) as {
        commercial: {
          clientCode: string;
          paidAds: boolean;
          invented: boolean;
          gcc: { recordedOnly: boolean; available: boolean };
        };
      };
      assert.equal(commercialBody.commercial.clientCode, SYN_A);
      assert.equal(commercialBody.commercial.paidAds, false);
      assert.equal(commercialBody.commercial.invented, false);
      assert.equal(commercialBody.commercial.gcc.recordedOnly, true);
      assert.equal(commercialBody.commercial.gcc.available, false);

      const portal = await fetch(`${base}/api/client/portal`, { headers: auth('client-a') });
      assert.equal(portal.status, 200);
      const portalBody = (await portal.json()) as { portal: { clientCode: string; operatorChrome: boolean } };
      assert.equal(portalBody.portal.clientCode, SYN_A);
      assert.equal(portalBody.portal.operatorChrome, false);

      const desk = await fetch(`${base}/client`, { headers: auth('client-a') });
      assert.equal(desk.status, 200);
      const deskHtml = await desk.text();
      assert.match(deskHtml, /SYNQA01/);
      assert.equal(deskHtml.includes(SYN_B), false);
      assert.match(deskHtml, /Needs your attention/);
      assert.match(deskHtml, /Requested documents/);
      assert.match(deskHtml, /Decisions/);
      assert.match(deskHtml, /Growth Command Center/);
      assert.match(deskHtml, /Commercial context/);
      assert.match(deskHtml, /does not invent LTV/);

      const unsignedPreview = await fetch(`${base}/api/pm/clients/${SYN_A}/desk`);
      assert.equal(unsignedPreview.status, 401);
      const clientUsesPreview = await fetch(`${base}/api/pm/clients/${SYN_A}/desk`, { headers: auth('client-a') });
      assert.equal(clientUsesPreview.status, 403);
      const staffPreviewDenied = await fetch(`${base}/api/pm/clients/${SYN_A}/desk`, { headers: auth('staff') });
      assert.equal(staffPreviewDenied.status, 404);
      const mannyPreview = await fetch(`${base}/api/pm/clients/${SYN_A}/desk`, { headers: auth('manny') });
      assert.equal(mannyPreview.status, 200);
      assert.match(mannyPreview.headers.get('content-type') || '', /text\/html/);
      const mannyPreviewHtml = await mannyPreview.text();
      assert.match(mannyPreviewHtml, /Operator preview/);
      assert.match(mannyPreviewHtml, new RegExp(SYN_A));
      assert.match(mannyPreviewHtml, /What we are working on/);
      assert.match(mannyPreviewHtml, /Commercial context/);
      assert.match(mannyPreviewHtml, /HVS_DATA_ACCESS=PARTIAL/);
      assert.equal(mannyPreviewHtml.includes(SYN_B), false);
      const mannyPreviewJson = await fetch(`${base}/api/pm/clients/${SYN_A}/desk.json`, { headers: auth('manny') });
      assert.equal(mannyPreviewJson.status, 200);
      const mannyPreviewBody = (await mannyPreviewJson.json()) as {
        preview: boolean;
        signedClientSession: boolean;
        clientDesk: {
          clientCode: string;
          gcc: { workspaceKey: string };
          operatingPicture: { classification: string; hvsDataAccess: string; invented: boolean; customerRecord: boolean };
          commercial: { liveGtmOutbound: boolean; gcc: { recordedOnly: boolean } };
        };
      };
      assert.equal(mannyPreviewBody.preview, true);
      assert.equal(mannyPreviewBody.signedClientSession, false);
      assert.equal(mannyPreviewBody.clientDesk.clientCode, SYN_A);
      assert.equal(mannyPreviewBody.clientDesk.gcc.workspaceKey.includes(SYN_B), false);
      assert.equal(mannyPreviewBody.clientDesk.operatingPicture.classification, 'SYNTHETIC_QA');
      assert.equal(mannyPreviewBody.clientDesk.operatingPicture.hvsDataAccess, 'PARTIAL');
      assert.equal(mannyPreviewBody.clientDesk.operatingPicture.invented, false);
      assert.equal(mannyPreviewBody.clientDesk.operatingPicture.customerRecord, false);
      assert.equal(mannyPreviewBody.clientDesk.commercial.liveGtmOutbound, false);
      assert.equal(mannyPreviewBody.clientDesk.commercial.gcc.recordedOnly, true);
      const mannyForeign = await fetch(`${base}/api/pm/clients/HFD01/desk`, { headers: auth('manny') });
      assert.equal(mannyForeign.status, 404);
      const mannyClientDesk = await fetch(`${base}/client`, { headers: auth('manny') });
      assert.equal(mannyClientDesk.status, 403);

      const bSeesA = await fetch(`${base}/api/client/workspace/${SYN_A}`, { headers: auth('client-b') });
      assert.equal(bSeesA.status, 403);
    });
  });

  it('redeems SYNQA unsigned and isolates the signed client session', async () => {
    await withHub(async ({ base }) => {
        const staged = await fetch(`${base}/api/pm/clients/${SYN_A}/experience`, {
          method: 'POST',
          headers: auth('entitled-staff'),
          body: JSON.stringify({
            displayName: 'Synthetic QA Client A',
            invitationEmail: 'entitled-owner-a@synqa.example',
            activationGate: 'authorized',
          }),
        });
        assert.equal(staged.status, 201);
        const stagedBody = (await staged.json()) as { inviteToken: string };

        const unsignedEmpty = await fetch(`${base}/api/client/invitations/redeem`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
        });
        assert.equal(unsignedEmpty.status, 400);

        const unsignedBad = await fetch(`${base}/api/client/invitations/redeem`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token: '00'.repeat(32) }),
        });
        assert.equal(unsignedBad.status, 403);

        const redeemed = await fetch(`${base}/api/client/invitations/redeem`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token: stagedBody.inviteToken }),
        });
        assert.equal(redeemed.status, 200);
        const redeemedBody = (await redeemed.json()) as {
          clientSessionToken: string;
          signedClientSession: boolean;
          classification: string;
          binding: { clientCode: string; email: string };
        };
        assert.equal(redeemedBody.signedClientSession, true);
        assert.equal(redeemedBody.classification, 'SYNTHETIC_QA');
        assert.equal(redeemedBody.binding.clientCode, SYN_A);
        assert.equal(redeemedBody.binding.email, 'entitled-owner-a@synqa.example');
        assert.ok(redeemedBody.clientSessionToken.startsWith(SYNQA_CLIENT_SESSION_PREFIX));

        const session = { authorization: `Bearer ${redeemedBody.clientSessionToken}` };
        const desk = await fetch(`${base}/client.json`, { headers: session });
        assert.equal(desk.status, 200);
        const deskBody = (await desk.json()) as {
          clientDesk: {
            clientCode: string;
            gcc: { isolated: boolean; invented: boolean; liveDispatch: boolean; clientCode: string; crossClientFallback: boolean };
            commercial: { invented: boolean; gcc: { recordedOnly: boolean } };
            documentExchange: { invented: boolean; sharePointNavigation: boolean; outstandingCount: number };
            decisions: { kind: string; invented: boolean };
            priorities: { kind: string; invented: boolean };
            operatingPicture: {
              classification: string;
              invented: boolean;
              clientVisible: boolean;
              operatorChrome: boolean;
              honestEmpty: boolean;
              queues: Record<string, Array<{ title: string; queue: string }>>;
            };
          };
        };
        assert.equal(deskBody.clientDesk.clientCode, SYN_A);
        assert.equal(deskBody.clientDesk.gcc.isolated, true);
        assert.equal(deskBody.clientDesk.gcc.invented, false);
        assert.equal(deskBody.clientDesk.gcc.liveDispatch, false);
        assert.equal(deskBody.clientDesk.gcc.clientCode, SYN_A);
        assert.equal(deskBody.clientDesk.gcc.crossClientFallback, false);
        assert.equal(deskBody.clientDesk.documentExchange.invented, false);
        assert.equal(deskBody.clientDesk.documentExchange.sharePointNavigation, false);
        assert.ok(deskBody.clientDesk.documentExchange.outstandingCount >= 1);
        assert.equal(deskBody.clientDesk.decisions.kind, 'client_decisions_v1');
        assert.equal(deskBody.clientDesk.decisions.invented, false);
        assert.equal(deskBody.clientDesk.priorities.kind, 'client_priorities_v1');
        assert.equal(deskBody.clientDesk.priorities.invented, false);
        assert.equal(deskBody.clientDesk.commercial.invented, false);
        assert.equal(deskBody.clientDesk.commercial.gcc.recordedOnly, true);
        assert.equal(deskBody.clientDesk.operatingPicture.classification, 'SYNTHETIC_QA');
        assert.equal(deskBody.clientDesk.operatingPicture.invented, false);
        assert.equal(deskBody.clientDesk.operatingPicture.clientVisible, true);
        assert.equal(deskBody.clientDesk.operatingPicture.operatorChrome, false);
        assert.equal(deskBody.clientDesk.operatingPicture.honestEmpty, false);
        assert.equal(
          deskBody.clientDesk.operatingPicture.queues['Decision Required']?.some((row) =>
            row.title.includes('kickoff'),
          ),
          true,
        );
        const picture = await fetch(`${base}/api/client/operating-picture`, { headers: session });
        assert.equal(picture.status, 200);
        const pictureBody = (await picture.json()) as {
          clientCode: string;
          invented: boolean;
          operatorChrome: boolean;
          operatingPicture: { clientVisible: boolean };
        };
        assert.equal(pictureBody.clientCode, SYN_A);
        assert.equal(pictureBody.invented, false);
        assert.equal(pictureBody.operatorChrome, false);
        assert.equal(pictureBody.operatingPicture.clientVisible, true);
        const staffPicture = await fetch(`${base}/api/client/operating-picture`, {
          headers: auth('entitled-staff'),
        });
        assert.equal(staffPicture.status, 403);
        const staffDocs = await fetch(`${base}/api/client/document-exchange`, {
          headers: auth('entitled-staff'),
        });
        assert.equal(staffDocs.status, 403);
        const staffDecisions = await fetch(`${base}/api/client/decisions`, {
          headers: auth('entitled-staff'),
        });
        assert.equal(staffDecisions.status, 403);

        const exchange = await fetch(`${base}/api/client/document-exchange`, { headers: session });
        assert.equal(exchange.status, 200);
        const exchangeBody = (await exchange.json()) as {
          clientCode: string;
          invented: boolean;
          documentExchange: {
            outstandingCount: number;
            missing: Array<{ id: string; title: string; clientCode: string }>;
          };
        };
        assert.equal(exchangeBody.clientCode, SYN_A);
        assert.equal(exchangeBody.invented, false);
        assert.ok(exchangeBody.documentExchange.outstandingCount >= 1);
        const outstanding = exchangeBody.documentExchange.missing[0];
        assert.equal(outstanding?.clientCode, SYN_A);

        const uploaded = await fetch(`${base}/api/client/documents`, {
          method: 'POST',
          headers: { ...session, 'content-type': 'application/json' },
          body: JSON.stringify({
            title: 'Signed operating agreement',
            fileName: 'oa-signed.txt',
            contentType: 'text/plain',
            contentB64: Buffer.from('signed-session-oa', 'utf8').toString('base64'),
            requestedId: outstanding?.id,
          }),
        });
        assert.equal(uploaded.status, 201);
        const uploadedBody = (await uploaded.json()) as { document: { id: string; clientCode: string; contentB64?: string } };
        assert.equal(uploadedBody.document.clientCode, SYN_A);
        assert.equal(uploadedBody.document.contentB64, undefined);

        const retrieved = await fetch(`${base}/api/client/documents/${uploadedBody.document.id}`, {
          headers: session,
        });
        assert.equal(retrieved.status, 200);
        const retrievedBody = (await retrieved.json()) as { document: { contentB64: string } };
        assert.equal(Buffer.from(retrievedBody.document.contentB64, 'base64').toString('utf8'), 'signed-session-oa');

        const afterUpload = await fetch(`${base}/api/client/document-exchange`, { headers: session });
        const afterUploadBody = (await afterUpload.json()) as {
          documentExchange: { outstandingCount: number; receivedCount: number; missingHonesty: string };
        };
        assert.equal(afterUploadBody.documentExchange.outstandingCount, 0);
        assert.ok(afterUploadBody.documentExchange.receivedCount >= 1);
        assert.match(afterUploadBody.documentExchange.missingHonesty, /No outstanding requested documents/);

        const signedHtml = await fetch(`${base}/client`, { headers: session });
        assert.equal(signedHtml.status, 200);
        const signedHtmlBody = await signedHtml.text();
        assert.match(signedHtmlBody, /What we are working on/);
        assert.match(signedHtmlBody, /Confirm kickoff week/);
        assert.match(signedHtmlBody, /Requested documents/);
        assert.match(signedHtmlBody, /Decisions/);
        assert.match(signedHtmlBody, /Projects and priorities/);

        const gcc = await fetch(`${base}/api/client/gcc`, { headers: session });
        assert.equal(gcc.status, 200);
        const gccBody = (await gcc.json()) as {
          gcc: {
            clientCode: string;
            isolated: boolean;
            recordedOnly: boolean;
            liveDispatch: boolean;
            invented: boolean;
            crossClientFallback: boolean;
            recordedSignals: unknown[];
            binding: { kind: string };
            gccHref?: string;
          };
        };
        assert.equal(gccBody.gcc.clientCode, SYN_A);
        assert.equal(gccBody.gcc.isolated, true);
        assert.equal(gccBody.gcc.recordedOnly, true);
        assert.equal(gccBody.gcc.liveDispatch, false);
        assert.equal(gccBody.gcc.invented, false);
        assert.equal(gccBody.gcc.crossClientFallback, false);
        assert.deepEqual(gccBody.gcc.recordedSignals, []);
        assert.equal(gccBody.gcc.binding.kind, 'hub_gcc_session_v1');
        assert.equal(gccBody.gcc.gccHref, undefined);
        const foreignWorkspace = await fetch(`${base}/api/client/workspace/${SYN_B}`, { headers: session });
        assert.equal(foreignWorkspace.status, 403);
        const foreignGccKey = await fetch(`${base}/api/client/gcc?workspaceKey=gcc-${SYN_B}`, { headers: session });
        assert.equal(foreignGccKey.status, 403);

        const workspace = await fetch(`${base}/api/client/workspace`, { headers: session });
        assert.equal(workspace.status, 200);
        const workspaceBody = (await workspace.json()) as { workspace: { clientCode: string } };
        assert.equal(workspaceBody.workspace.clientCode, SYN_A);

        const foreign = await fetch(`${base}/api/client/workspace/${SYN_B}`, { headers: session });
        assert.equal(foreign.status, 403);

        const operator = await fetch(`${base}/operator.json`, { headers: session });
        assert.equal(operator.status, 403);

        const staffDesk = await fetch(`${base}/client`, { headers: auth('entitled-staff') });
        assert.equal(staffDesk.status, 403);

        const after = await fetch(`${base}/operator.json`, { headers: auth('entitled-staff') });
        assert.equal(after.status, 200);
        const afterBody = (await after.json()) as {
          operatorDesk: {
            clientJourneys: Array<{
              signedClientSession: boolean;
              invitationStatus: string;
              canReissueInviteFromDesk: boolean;
            }>;
          };
        };
        assert.equal(afterBody.operatorDesk.clientJourneys[0]?.invitationStatus, 'redeemed');
        assert.equal(afterBody.operatorDesk.clientJourneys[0]?.signedClientSession, true);
        assert.equal(afterBody.operatorDesk.clientJourneys[0]?.canReissueInviteFromDesk, true);

        const rotate = await fetch(`${base}/api/pm/clients/${SYN_A}/invitation/reissue`, {
          method: 'POST',
          headers: auth('entitled-staff'),
          body: JSON.stringify({}),
        });
        assert.equal(rotate.status, 201);
        const rotateBody = (await rotate.json()) as { inviteToken: string; invitation: { status: string } };
        assert.equal(rotateBody.invitation.status, 'staged');
        assert.ok(rotateBody.inviteToken.length >= 32);

        const staleSession = await fetch(`${base}/client.json`, { headers: session });
        assert.equal(staleSession.status, 401);

        const rotated = await fetch(`${base}/api/client/invitations/redeem`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token: rotateBody.inviteToken }),
        });
        assert.equal(rotated.status, 200);
        const rotatedBody = (await rotated.json()) as {
          clientSessionToken: string;
          signedClientSession: boolean;
          binding: { clientCode: string };
        };
        assert.equal(rotatedBody.signedClientSession, true);
        assert.equal(rotatedBody.binding.clientCode, SYN_A);
        assert.notEqual(rotatedBody.clientSessionToken, redeemedBody.clientSessionToken);

        const replayRotated = await fetch(`${base}/api/client/invitations/redeem`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token: rotateBody.inviteToken }),
        });
        assert.equal(replayRotated.status, 403);

        const rotatedDesk = await fetch(`${base}/client.json`, {
          headers: { authorization: `Bearer ${rotatedBody.clientSessionToken}` },
        });
        assert.equal(rotatedDesk.status, 200);
        const rotatedDeskBody = (await rotatedDesk.json()) as { clientDesk: { clientCode: string } };
        assert.equal(rotatedDeskBody.clientDesk.clientCode, SYN_A);

        const staffStillClosed = await fetch(`${base}/client`, { headers: auth('entitled-staff') });
        assert.equal(staffStillClosed.status, 403);
      });
  });
});

describe('GCC session binding contract', () => {
  it('emits gccHref only when an origin is provided and never enables live dispatch', async () => {
    const { bindIsolatedGccWorkspace } = await import('../src/clientExperience/service.ts');
    const { resolveGccAppOrigin } = await import('../src/config.ts');
    const commercial = {
      clientCode: SYN_A,
      permitted: true as const,
      liveGtmOutbound: false as const,
      paidAds: false as const,
      invented: false as const,
      gcc: {
        available: false,
        recordedOnly: true as const,
        signalCount: 0,
        recordedSignals: [],
        emptyReason: 'No GCC value signal on record.',
      },
      copilot: { available: false, recordedOnly: true as const, recordedCount: 0, emptyReason: undefined },
      gtm: { available: false, recordedOnly: true as const, recordedCount: 0, emptyReason: undefined },
    };
    const bound = bindIsolatedGccWorkspace({
      workspaceKey: `gcc-${SYN_A}`,
      clientCode: SYN_A,
      commercial,
      gccAppOrigin: resolveGccAppOrigin({ INTEGRATION_GCC_APP_ORIGIN: 'https://gcc.example.test' }),
    });
    assert.equal(bound.gccHref, 'https://gcc.example.test');
    assert.equal(bound.liveDispatch, false);
    assert.equal(bound.invented, false);
    assert.equal(bound.crossClientFallback, false);
    assert.deepEqual(bound.recordedSignals, []);
    assert.equal(bound.binding.kind, 'hub_gcc_session_v1');
    assert.equal(bound.binding.crossClientFallback, false);
    assert.equal(resolveGccAppOrigin({}), null);
  });
});
