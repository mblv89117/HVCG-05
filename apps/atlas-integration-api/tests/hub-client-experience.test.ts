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
import { hashInviteToken, issueInviteToken } from '../src/clientExperience/store.ts';

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
    resolveAllowedClientIds: async () => [],
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
      };
      assert.equal(requestsBody.clientCode, SYN_A);
      assert.equal(requestsBody.binariesInAtlas, false);
      const docRequest = requestsBody.attention.find((row) => row.kind === 'document');
      const decisionRequest = requestsBody.attention.find((row) => row.kind === 'decision');
      assert.ok(docRequest);
      assert.ok(decisionRequest);

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
      const listedBody = (await listed.json()) as { documents: Array<{ title: string; clientCode?: string }>; clientCode: string };
      assert.equal(listedBody.clientCode, SYN_A);
      assert.ok(listedBody.documents.some((doc) => doc.title === 'Operating agreement'));

      const decided = await fetch(`${base}/api/client/requests/${decisionRequest?.id}/decide`, {
        method: 'POST',
        headers: auth('client-a'),
        body: JSON.stringify({ decision: 'accepted' }),
      });
      assert.equal(decided.status, 200);

      const projects = await fetch(`${base}/api/client/projects`, { headers: auth('client-a') });
      assert.equal(projects.status, 200);
      const gcc = await fetch(`${base}/api/client/gcc`, { headers: auth('client-a') });
      const gccBody = (await gcc.json()) as { gcc: { workspaceKey: string; clientCode: string } };
      assert.equal(gccBody.gcc.clientCode, SYN_A);
      assert.equal(gccBody.gcc.workspaceKey.includes(SYN_B), false);

      const commercial = await fetch(`${base}/api/client/commercial-context`, { headers: auth('client-a') });
      const commercialBody = (await commercial.json()) as { commercial: { clientCode: string; paidAds: boolean } };
      assert.equal(commercialBody.commercial.clientCode, SYN_A);
      assert.equal(commercialBody.commercial.paidAds, false);

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

      const bSeesA = await fetch(`${base}/api/client/workspace/${SYN_A}`, { headers: auth('client-b') });
      assert.equal(bSeesA.status, 403);
    });
  });
});
