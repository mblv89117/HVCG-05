import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AppConfig } from '../../config.ts';
import { requirePrincipal } from '../../middleware/auth.ts';
import { resolveHubCommit } from '../../http/hubCommit.ts';
import type { IntegrationRepository } from '../../store/repository.ts';
import type { PmRepository } from '../repository.ts';
import { buildCommandCenter } from '../commandCenter.ts';
import { readDeskCommercialContext } from '../commercialContext/handle.ts';
import { canAccessOperatorDesk, entitledClientCodes } from '../sharepoint/authz.ts';
import { buildSharePointCommandCenter } from '../sharepoint/http.ts';
import type { SharePointPmService } from '../sharepoint/repository.ts';
import { searchSharePointPm } from '../sharepoint/search.ts';
import { renderOperatorDeskHtml, renderUnsignedOperatorDesk } from './html.ts';
import { listEntitledAttention, realClientsNeedingAttention } from '../sharepoint/attention.ts';
import { buildKnowledgeOperatingPicture } from '../sharepoint/knowledgeOperating.ts';
import { listOperatorClientJourneys } from '../../clientExperience/service.ts';
import { buildOperatorDeskModel, emptyHonestOperatingPicture, operatorOperatingPictureFromKnowledge } from './model.ts';
import { isOperatorDeskPath, wantsOperatorJson, type OperatorDeskModel } from './types.ts';

export { isOperatorDeskPath };

function sendHtml(res: ServerResponse, status: number, body: string, origin?: string | null) {
  const headers: Record<string, string> = {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'x-atlas-operator-desk': 'v1',
  };
  if (status === 401) headers['www-authenticate'] = 'Bearer';
  if (origin) {
    headers['access-control-allow-origin'] = origin;
    headers['access-control-allow-credentials'] = 'true';
    headers['vary'] = 'Origin';
  }
  res.writeHead(status, headers);
  res.end(body);
}

function sendJson(res: ServerResponse, status: number, body: unknown, origin?: string | null) {
  const headers: Record<string, string> = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'x-atlas-operator-desk': 'v1',
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

async function loadSharePointDesk(opts: {
  cfg: AppConfig;
  sharepoint: SharePointPmService;
  principal: Awaited<ReturnType<typeof requirePrincipal>>;
  searchQuery: string;
}): Promise<OperatorDeskModel> {
  const { sharepoint: service, principal, cfg } = opts;
  const [projects, tasks, leads, opportunities, knowledge] = await Promise.all([
    service.listAuthorizedProjects(principal),
    service.listAuthorizedTasks(principal),
    service.listAuthorizedLeads(principal),
    service.listAuthorizedOpportunities(principal),
    buildKnowledgeOperatingPicture(service, principal, {
      dataDir: cfg.dataDir,
      hvsDataAccess: 'BLOCKED',
    }),
  ]);
  const milestones = [];
  for (const project of projects) {
    milestones.push(...(await service.listAuthorizedMilestones(principal, project.id)));
  }
  const commandCenter = buildSharePointCommandCenter(projects, tasks, milestones, leads, opportunities);
  const commercialContext = readDeskCommercialContext({
    dataDir: cfg.dataDir,
    principal,
    opportunities,
    leads,
  });
  const q = opts.searchQuery.trim().slice(0, 120);
  const searchRan = q.length >= 2;
  const found = searchRan ? await searchSharePointPm(service, principal, q) : { results: [] };
  const entitled = entitledClientCodes(principal);
  const attention = listEntitledAttention(cfg.dataDir, entitled);
  return buildOperatorDeskModel({
    hubSha: resolveHubCommit(),
    entitledClients: entitled,
    commandCenter: commandCenter as unknown as Record<string, unknown>,
    commercialContext,
    searchQuery: q,
    searchRan,
    searchHits: found.results.map((hit) => ({
      id: hit.id,
      title: hit.title,
      kind: hit.kind,
      href: hit.href,
      clientCode: hit.clientCode,
    })),
    attentionItems: attention.map((row) => ({
      id: row.id,
      title: row.classification === 'SYNTHETIC_QA' ? `${row.title} (SYNTHETIC QA)` : row.title,
      href: row.href,
      kind: row.kind,
    })),
    realClientsNeedingAttention: realClientsNeedingAttention(attention).length,
    operatingPicture: operatorOperatingPictureFromKnowledge(knowledge),
    clientJourneys: listOperatorClientJourneys({
      dataDir: cfg.dataDir,
      entitledClientCodes: entitled,
    }),
  });
}

function loadDevelopmentDesk(opts: {
  cfg: AppConfig;
  pm: PmRepository;
  repo: IntegrationRepository;
  principal: Awaited<ReturnType<typeof requirePrincipal>>;
  searchQuery: string;
}): OperatorDeskModel {
  const commandCenter = buildCommandCenter(opts.pm, opts.repo);
  const commercialContext = readDeskCommercialContext({
    dataDir: opts.cfg.dataDir,
    principal: opts.principal,
  });
  const q = opts.searchQuery.trim().slice(0, 120);
  return buildOperatorDeskModel({
    hubSha: resolveHubCommit(),
    entitledClients: entitledClientCodes(opts.principal),
    commandCenter: commandCenter as unknown as Record<string, unknown>,
    commercialContext,
    searchQuery: q,
    searchRan: q.length >= 2,
    searchHits: [],
    operatingPicture: emptyHonestOperatingPicture(),
    clientJourneys: listOperatorClientJourneys({
      dataDir: opts.cfg.dataDir,
      entitledClientCodes: entitledClientCodes(opts.principal),
    }),
  });
}

export async function handleOperatorDesk(opts: {
  cfg: AppConfig;
  repo: IntegrationRepository;
  pm: PmRepository | null;
  sharepoint?: SharePointPmService | null;
  req: IncomingMessage;
  res: ServerResponse;
  method: string;
  path: string;
  origin?: string | null;
}): Promise<boolean> {
  if (!isOperatorDeskPath(opts.path)) return false;
  if (opts.method !== 'GET' && opts.method !== 'HEAD') {
    sendJson(opts.res, 405, { error: 'method_not_allowed', code: 'method_not_allowed' }, opts.origin);
    return true;
  }

  const accept = typeof opts.req.headers.accept === 'string' ? opts.req.headers.accept : '';
  const asJson = wantsOperatorJson(opts.path, accept);
  const url = new URL(opts.req.url || '/', `http://${opts.req.headers.host || 'local'}`);
  const searchQuery = url.searchParams.get('q') || '';

  let principal;
  try {
    principal = await requirePrincipal(opts.req, opts.cfg);
  } catch (err) {
    const status = (err as { status?: number }).status || 500;
    if (status === 401) {
      if (asJson) {
        sendJson(
          opts.res,
          401,
          {
            error: 'unauthorized',
            code: 'unauthorized',
            message: 'Microsoft sign-in required (Bearer token missing)',
          },
          opts.origin,
        );
      } else {
        sendHtml(opts.res, 401, renderUnsignedOperatorDesk(), opts.origin);
      }
      return true;
    }
    throw err;
  }

  if (!canAccessOperatorDesk(principal)) {
    if (asJson) {
      sendJson(
        opts.res,
        403,
        {
          error: 'forbidden',
          code: 'forbidden',
          message: 'Operator desk is restricted to HVCG internal staff.',
        },
        opts.origin,
      );
    } else {
      sendHtml(
        opts.res,
        403,
        '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Forbidden</title></head><body><p>Operator desk is restricted to HVCG internal staff.</p></body></html>',
        opts.origin,
      );
    }
    return true;
  }

  const model =
    opts.cfg.pmBackend.mode === 'sharepoint' && opts.sharepoint
      ? await loadSharePointDesk({
          cfg: opts.cfg,
          sharepoint: opts.sharepoint,
          principal,
          searchQuery,
        })
      : opts.pm
        ? loadDevelopmentDesk({
            cfg: opts.cfg,
            pm: opts.pm,
            repo: opts.repo,
            principal,
            searchQuery,
          })
        : null;

  if (!model) {
    sendJson(
      opts.res,
      503,
      { error: 'pm_backend_unavailable', code: 'pm_backend_unavailable' },
      opts.origin,
    );
    return true;
  }

  if (asJson) {
    sendJson(opts.res, 200, { operatorDesk: model }, opts.origin);
    return true;
  }
  sendHtml(opts.res, 200, renderOperatorDeskHtml(model), opts.origin);
  return true;
}
