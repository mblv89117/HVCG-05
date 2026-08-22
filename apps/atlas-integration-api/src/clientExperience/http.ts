/**
 * Client experience HTTP — isolated /client + /api/client/* plus operator staging.
 * Binds invitations to the live governed portal and document-request paths.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AppConfig } from '../config.ts';
import { requirePrincipal } from '../middleware/auth.ts';
import { isCanonicalClientCode } from '../entitlements/clientCode.ts';
import type { SharePointPmService } from '../pm/sharepoint/repository.ts';
import { isClientOnlyPrincipal } from './roles.ts';
import {
  ClientExperienceError,
  attachOperatorDeskOperatingPicture,
  buildClientWorkspaceView,
  buildOperatorClientDeskPreview,
  decideClientRequest,
  getClientDocument,
  isExperienceSyntheticClient,
  operatorExperienceStatus,
  redeemInvitation,
  reissueClientInvitation,
  stageClientExperience,
  uploadClientDocument,
} from './service.ts';
import { handleClientDesk, renderClientDeskHtml } from './desk.ts';
import { canAccessOperatorDesk, isInternalStaff } from '../pm/sharepoint/authz.ts';
import { resolveHubCommit } from '../http/hubCommit.ts';
import { readCommercialContext } from '../pm/commercialContext/handle.ts';
import { buildKnowledgeOperatingPicture } from '../pm/sharepoint/knowledgeOperating.ts';

function send(res: ServerResponse, status: number, body: unknown, origin?: string | null) {
  const headers: Record<string, string> = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'x-atlas-client-experience': 'v1',
  };
  if (status === 401) headers['www-authenticate'] = 'Bearer';
  if (origin) {
    headers['access-control-allow-origin'] = origin;
    headers['access-control-allow-credentials'] = 'true';
    headers['vary'] = 'Origin';
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new ClientExperienceError(400, 'malformed_json', 'Request body must be a JSON object');
    }
    return parsed as Record<string, unknown>;
  } catch (err) {
    if (err instanceof ClientExperienceError) throw err;
    throw new ClientExperienceError(400, 'malformed_json', 'Request body is not valid JSON');
  }
}

function experienceStagePath(path: string): string | null {
  const match = path.match(/^\/api\/pm\/clients\/([^/]+)\/experience$/);
  if (!match) return null;
  const code = decodeURIComponent(match[1]);
  return isCanonicalClientCode(code) ? code : null;
}

function invitationReissuePath(path: string): string | null {
  const match = path.match(/^\/api\/pm\/clients\/([^/]+)\/invitation\/reissue$/);
  if (!match) return null;
  const code = decodeURIComponent(match[1]);
  return isCanonicalClientCode(code) ? code : null;
}

function clientDeskPreviewPath(path: string): { code: string; asJson: boolean } | null {
  const match = path.match(/^\/api\/pm\/clients\/([^/]+)\/desk(\.json)?$/);
  if (!match) return null;
  const code = decodeURIComponent(match[1]);
  if (!isCanonicalClientCode(code)) return null;
  return { code, asJson: Boolean(match[2]) };
}

function clientCodeFromPath(path: string, prefix: string): string | null {
  if (!path.startsWith(prefix)) return null;
  const rest = decodeURIComponent(path.slice(prefix.length));
  if (!rest || rest.includes('/')) return null;
  return isCanonicalClientCode(rest) ? rest : null;
}

function isClientExperienceApi(path: string): boolean {
  return path === '/api/client' || path.startsWith('/api/client/');
}

export async function handleClientExperience(opts: {
  cfg: AppConfig;
  req: IncomingMessage;
  res: ServerResponse;
  method: string;
  path: string;
  origin?: string | null;
  sharepoint?: SharePointPmService | null;
}): Promise<boolean> {
  if (await handleClientDesk(opts)) return true;

  const stagedCode = experienceStagePath(opts.path);
  const reissueCode = invitationReissuePath(opts.path);
  const deskPreview = clientDeskPreviewPath(opts.path);
  const isClientApi = isClientExperienceApi(opts.path);
  if (!isClientApi && !stagedCode && !reissueCode && !deskPreview) return false;

  let principal;
  try {
    principal = await requirePrincipal(opts.req, opts.cfg);
  } catch (err) {
    const status = (err as { status?: number }).status || 401;
    const code = (err as { code?: string }).code || 'unauthorized';
    send(
      opts.res,
      status === 401 ? 401 : status,
      { error: code, code, message: (err as Error).message || 'Microsoft sign-in required' },
      opts.origin,
    );
    return true;
  }

  try {
    if (deskPreview) {
      if (opts.method !== 'GET' && opts.method !== 'HEAD') {
        send(opts.res, 405, { error: 'method_not_allowed', code: 'method_not_allowed' }, opts.origin);
        return true;
      }
      if (isClientOnlyPrincipal(principal)) {
        send(
          opts.res,
          403,
          { error: 'forbidden', code: 'forbidden', message: 'Client principals use /client, not the operator preview.' },
          opts.origin,
        );
        return true;
      }
      if (!canAccessOperatorDesk(principal)) {
        send(
          opts.res,
          403,
          { error: 'forbidden', code: 'forbidden', message: 'Operator preview requires an operator or entitled Hub principal.' },
          opts.origin,
        );
        return true;
      }
      let displayName: string | undefined;
      if (opts.sharepoint) {
        const live = await opts.sharepoint.authorizeClient(principal, deskPreview.code);
        if (live === 'not_found') {
          send(opts.res, 404, { error: 'not_found', code: 'not_found' }, opts.origin);
          return true;
        }
        displayName = live.displayName;
      }
      let view = buildOperatorClientDeskPreview({
        dataDir: opts.cfg.dataDir,
        principal,
        clientCode: deskPreview.code,
        displayName,
      });
      if (opts.sharepoint) {
        const [opportunities, leads, knowledge] = await Promise.all([
          opts.sharepoint.listAuthorizedOpportunities(principal),
          opts.sharepoint.listAuthorizedLeads(principal),
          buildKnowledgeOperatingPicture(opts.sharepoint, principal, {
            dataDir: opts.cfg.dataDir,
            hvsDataAccess: 'BLOCKED',
          }),
        ]);
        view = attachOperatorDeskOperatingPicture(view, {
          commercial: readCommercialContext({
            dataDir: opts.cfg.dataDir,
            principal,
            opportunities,
            leads,
            clientCode: deskPreview.code,
          }),
          knowledge,
        });
      }
      const hubSha = resolveHubCommit() || undefined;
      if (deskPreview.asJson) {
        send(
          opts.res,
          200,
          {
            clientDesk: view,
            hubSha,
            preview: true,
            signedClientSession: false,
            source: 'hub_governed_overlay',
            binariesInAtlas: false,
          },
          opts.origin,
        );
        return true;
      }
      const headers: Record<string, string> = {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
        'x-atlas-client-desk': 'v1',
        'x-atlas-client-desk-preview': 'operator',
      };
      if (opts.origin) {
        headers['access-control-allow-origin'] = opts.origin;
        headers['access-control-allow-credentials'] = 'true';
        headers['vary'] = 'Origin';
      }
      opts.res.writeHead(200, headers);
      opts.res.end(renderClientDeskHtml(view, hubSha, { operatorPreview: true }));
      return true;
    }

    if (stagedCode) {
      if (opts.method === 'GET') {
        send(
          opts.res,
          200,
          operatorExperienceStatus({
            dataDir: opts.cfg.dataDir,
            principal,
            clientCode: stagedCode,
          }),
          opts.origin,
        );
        return true;
      }
      if (opts.method !== 'POST') {
        send(opts.res, 405, { error: 'method_not_allowed', code: 'method_not_allowed' }, opts.origin);
        return true;
      }
      const body = await readJson(opts.req);
      let activationStatus = typeof body.activationGate === 'string' ? body.activationGate : '';
      const syntheticOverlay = isExperienceSyntheticClient(stagedCode);
      if (opts.sharepoint && !syntheticOverlay) {
        const live = await opts.sharepoint.getClientActivation(
          principal,
          stagedCode,
          typeof body.opportunityId === 'string' ? body.opportunityId : undefined,
        );
        activationStatus = live.status || live.activation?.status || activationStatus;
      } else if (opts.sharepoint && syntheticOverlay && isInternalStaff(principal)) {
        try {
          const live = await opts.sharepoint.getClientActivation(
            principal,
            stagedCode,
            typeof body.opportunityId === 'string' ? body.opportunityId : undefined,
          );
          activationStatus = live.status || live.activation?.status || activationStatus;
        } catch {
          /* SYNQA overlay staging uses the request gate when SharePoint activation is staff-gated. */
        }
      }
      const result = stageClientExperience({
        dataDir: opts.cfg.dataDir,
        principal,
        clientCode: stagedCode,
        displayName: typeof body.displayName === 'string' ? body.displayName : undefined,
        invitationEmail: typeof body.invitationEmail === 'string' ? body.invitationEmail : '',
        activationGate: typeof body.activationGate === 'string' ? body.activationGate : '',
        activationStatus,
      });
      send(
        opts.res,
        result.replay ? 200 : 201,
        {
          replay: result.replay,
          workspace: result.workspace,
          invitation: result.invitation,
          inviteToken: result.inviteToken || undefined,
          outboundSent: false,
          entraGroupProvisioned: false,
          portalAccessProvisioned: true,
          documentRequestPathProvisioned: true,
          note: 'Invitation is record-only. LIVE_GTM_OUTBOUND stays OFF. Token is shown once and is not emailed. Workspace is bound to the governed Hub portal and document-request paths.',
        },
        opts.origin,
      );
      return true;
    }

    if (reissueCode) {
      if (opts.method !== 'POST') {
        send(opts.res, 405, { error: 'method_not_allowed', code: 'method_not_allowed' }, opts.origin);
        return true;
      }
      const body = await readJson(opts.req);
      const result = reissueClientInvitation({
        dataDir: opts.cfg.dataDir,
        principal,
        clientCode: reissueCode,
        invitationEmail: typeof body.invitationEmail === 'string' ? body.invitationEmail : undefined,
      });
      send(
        opts.res,
        201,
        {
          workspace: result.workspace,
          invitation: result.invitation,
          inviteToken: result.inviteToken,
          outboundSent: false,
          redeemHref: '/api/client/invitations/redeem',
          note: 'Replacement token is record-only. LIVE_GTM_OUTBOUND stays OFF. Token is shown once and is not emailed. Only a Client Executive principal may redeem.',
        },
        opts.origin,
      );
      return true;
    }

    if (!isClientOnlyPrincipal(principal) && opts.path !== '/api/client/invitations/redeem') {
      send(opts.res, 403, { error: 'forbidden', code: 'forbidden', message: 'Client workspace requires a client principal.' }, opts.origin);
      return true;
    }

    if (opts.method === 'POST' && opts.path === '/api/client/invitations/redeem') {
      const body = await readJson(opts.req);
      const redeemed = redeemInvitation({
        dataDir: opts.cfg.dataDir,
        principal,
        token: typeof body.token === 'string' ? body.token : '',
      });
      send(opts.res, 200, { binding: redeemed.binding, workspace: redeemed.workspace }, opts.origin);
      return true;
    }

    if (opts.method === 'GET' && (opts.path === '/api/client/workspace' || opts.path === '/api/client/me')) {
      send(opts.res, 200, { workspace: buildClientWorkspaceView({ dataDir: opts.cfg.dataDir, principal }) }, opts.origin);
      return true;
    }

    const workspaceCode = clientCodeFromPath(opts.path, '/api/client/workspace/');
    if (opts.method === 'GET' && workspaceCode) {
      send(
        opts.res,
        200,
        { workspace: buildClientWorkspaceView({ dataDir: opts.cfg.dataDir, principal, clientCode: workspaceCode }) },
        opts.origin,
      );
      return true;
    }

    if (opts.method === 'GET' && opts.path === '/api/client/portal') {
      const view = buildClientWorkspaceView({ dataDir: opts.cfg.dataDir, principal });
      send(opts.res, 200, { portal: view.portal }, opts.origin);
      return true;
    }

    if (opts.method === 'GET' && opts.path === '/api/client/documents') {
      const view = buildClientWorkspaceView({ dataDir: opts.cfg.dataDir, principal });
      send(opts.res, 200, { documents: view.documents, clientCode: view.clientCode }, opts.origin);
      return true;
    }

    if (opts.method === 'POST' && opts.path === '/api/client/documents') {
      const body = await readJson(opts.req);
      const view = buildClientWorkspaceView({
        dataDir: opts.cfg.dataDir,
        principal,
        clientCode: typeof body.clientCode === 'string' ? body.clientCode : undefined,
      });
      const doc = uploadClientDocument({
        dataDir: opts.cfg.dataDir,
        principal,
        clientCode: view.clientCode,
        title: typeof body.title === 'string' ? body.title : '',
        fileName: typeof body.fileName === 'string' ? body.fileName : '',
        contentType: typeof body.contentType === 'string' ? body.contentType : undefined,
        contentB64: typeof body.contentB64 === 'string' ? body.contentB64 : '',
        requestedId: typeof body.requestedId === 'string' ? body.requestedId : undefined,
      });
      const { contentB64: _omit, ...meta } = doc;
      void _omit;
      send(opts.res, 201, { document: meta }, opts.origin);
      return true;
    }

    const documentGet = opts.path.match(/^\/api\/client\/documents\/([^/]+)$/);
    if (opts.method === 'GET' && documentGet) {
      const doc = getClientDocument({
        dataDir: opts.cfg.dataDir,
        principal,
        documentId: decodeURIComponent(documentGet[1]),
      });
      send(opts.res, 200, { document: doc }, opts.origin);
      return true;
    }

    if (opts.method === 'GET' && opts.path === '/api/client/attention') {
      const view = buildClientWorkspaceView({ dataDir: opts.cfg.dataDir, principal });
      send(
        opts.res,
        200,
        {
          attention: view.attention,
          clientCode: view.clientCode,
          source: 'hub_governed_overlay',
          binariesInAtlas: false,
        },
        opts.origin,
      );
      return true;
    }

    if (opts.method === 'GET' && (opts.path === '/api/client/requests' || opts.path === '/api/client/document-requests')) {
      const view = buildClientWorkspaceView({ dataDir: opts.cfg.dataDir, principal });
      send(
        opts.res,
        200,
        {
          requests: view.requests,
          documentRequests: view.documentRequests,
          attention: view.attention,
          clientCode: view.clientCode,
          source: 'hub_governed_overlay',
          binariesInAtlas: false,
        },
        opts.origin,
      );
      return true;
    }

    const decide = opts.path.match(/^\/api\/client\/requests\/([^/]+)\/decide$/);
    if (opts.method === 'POST' && decide) {
      const body = await readJson(opts.req);
      const decision = body.decision === 'declined' ? 'declined' : body.decision === 'accepted' ? 'accepted' : '';
      if (!decision) {
        send(opts.res, 400, { error: 'invalid_decision', code: 'invalid_decision' }, opts.origin);
        return true;
      }
      const request = decideClientRequest({
        dataDir: opts.cfg.dataDir,
        principal,
        requestId: decodeURIComponent(decide[1]),
        decision,
      });
      send(opts.res, 200, { request }, opts.origin);
      return true;
    }

    if (opts.method === 'GET' && opts.path === '/api/client/projects') {
      const view = buildClientWorkspaceView({ dataDir: opts.cfg.dataDir, principal });
      send(opts.res, 200, { projects: view.projects, clientCode: view.clientCode }, opts.origin);
      return true;
    }

    if (opts.method === 'GET' && opts.path === '/api/client/commercial-context') {
      const view = buildClientWorkspaceView({ dataDir: opts.cfg.dataDir, principal });
      send(opts.res, 200, { commercial: view.commercial, clientCode: view.clientCode }, opts.origin);
      return true;
    }

    if (opts.method === 'GET' && opts.path === '/api/client/gcc') {
      const view = buildClientWorkspaceView({ dataDir: opts.cfg.dataDir, principal });
      send(opts.res, 200, { gcc: view.gcc }, opts.origin);
      return true;
    }

    send(opts.res, 404, { error: 'not_found', code: 'not_found' }, opts.origin);
    return true;
  } catch (err) {
    if (err instanceof ClientExperienceError) {
      send(opts.res, err.status, { error: err.code, code: err.code, message: err.message }, opts.origin);
      return true;
    }
    const status = (err as { status?: number }).status;
    if (status === 401 || status === 403 || status === 404) {
      send(
        opts.res,
        status,
        { error: (err as { code?: string }).code || 'forbidden', code: (err as { code?: string }).code || 'forbidden' },
        opts.origin,
      );
      return true;
    }
    throw err;
  }
}
