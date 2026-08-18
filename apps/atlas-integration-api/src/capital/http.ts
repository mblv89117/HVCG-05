import type { IncomingMessage, ServerResponse } from 'node:http';
import { audit } from '../audit/auditLog.ts';
import type { AppConfig } from '../config.ts';
import { requirePrincipal } from '../middleware/auth.ts';
import { capitalBackendUnavailableBody } from './backend.ts';
import { CapitalHttpError, toCapitalErrorBody } from './errors.ts';
import { assertClientScope } from './authz.ts';
import { CapitalService } from './service.ts';
import type { CapitalPersistence } from './store.ts';

function send(res: ServerResponse, status: number, body: unknown, origin?: string | null) {
  const headers: Record<string, string> = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  };
  if (origin) {
    headers['access-control-allow-origin'] = origin;
    headers['access-control-allow-credentials'] = 'true';
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  return JSON.parse(raw) as Record<string, unknown>;
}

export async function handleCapitalRoutes(opts: {
  cfg: AppConfig;
  capital?: CapitalPersistence | null;
  req: IncomingMessage;
  res: ServerResponse;
  method: string;
  path: string;
  origin?: string | null;
}): Promise<boolean> {
  const { cfg, req, res, method, path, origin } = opts;
  if (!path.startsWith('/api/capital')) return false;

  try {
    const principal = await requirePrincipal(req, cfg);
    assertClientScope(principal);

    const store = opts.capital;
    if (!store) {
      send(res, 503, capitalBackendUnavailableBody(), origin);
      return true;
    }

    const service = new CapitalService(store);
    let body: Record<string, unknown> = {};
    if (method !== 'GET' && method !== 'HEAD') body = await readJson(req);

    const sendOk = (payload: unknown) => send(res, 200, payload, origin);

    if (method === 'GET' && path === '/api/capital/command-center') {
      sendOk(await service.commandCenter(principal));
      return true;
    }
    if (method === 'GET' && path === '/api/capital/opportunities') {
      sendOk(await service.list(principal));
      return true;
    }
    if (method === 'POST' && path === '/api/capital/opportunities') {
      const result = await service.create(principal, body);
      audit({
        action: 'capital_opportunity_create',
        actorUserId: principal.userId,
        outcome: 'success',
        detail: `client=${result.opportunity.clientCode} id=${result.opportunity.id} created=${result.created}`,
      });
      send(res, 200, result, origin);
      return true;
    }

    const oppMatch = path.match(/^\/api\/capital\/opportunities\/([^/]+)(?:\/(.*))?$/);
    if (oppMatch) {
      const id = decodeURIComponent(oppMatch[1]);
      const rest = oppMatch[2] || '';
      if (method === 'GET' && rest === '') {
        sendOk(await service.get(principal, id));
        return true;
      }
      if (method === 'POST' && rest === 'transition') {
        const result = await service.transition(principal, id, body);
        audit({
          action: 'capital_opportunity_transition',
          actorUserId: principal.userId,
          outcome: 'success',
          detail: `id=${id} to=${result.opportunity.stage}`,
        });
        sendOk(result);
        return true;
      }
      if (method === 'POST' && rest === 'next-action') {
        const result = await service.updateNextAction(principal, id, body);
        audit({
          action: 'capital_next_action_update',
          actorUserId: principal.userId,
          outcome: 'success',
          detail: `id=${id}`,
        });
        sendOk(result);
        return true;
      }
      if (method === 'POST' && rest === 'checklist/generate') {
        sendOk(await service.generateChecklist(principal, id));
        return true;
      }
      if (method === 'GET' && rest === 'checklist') {
        sendOk(await service.checklist(principal, id));
        return true;
      }
      const override = rest.match(/^checklist\/([^/]+)\/override$/);
      if (method === 'POST' && override) {
        const result = await service.overrideItem(principal, id, decodeURIComponent(override[1]), body);
        audit({
          action: 'capital_checklist_override',
          actorUserId: principal.userId,
          outcome: 'success',
          detail: `id=${id} item=${override[1]}`,
        });
        sendOk(result);
        return true;
      }
      if (method === 'POST' && rest === 'documents') {
        sendOk(await service.addDocument(principal, id, body));
        return true;
      }
      const review = rest.match(/^documents\/([^/]+)\/review$/);
      if (method === 'POST' && review) {
        sendOk(await service.review(principal, id, decodeURIComponent(review[1]), body));
        return true;
      }
      if (method === 'GET' && rest === 'missing-request') {
        sendOk(await service.missingRequest(principal, id));
        return true;
      }
      if (method === 'POST' && rest === 'underwriting') {
        sendOk(await service.underwrite(principal, id));
        return true;
      }
      if (method === 'POST' && rest === 'strategy') {
        sendOk(await service.strategy(principal, id));
        return true;
      }
      if (method === 'POST' && rest === 'strategy/decision') {
        const result = await service.strategyDecision(principal, id, body);
        audit({
          action: 'capital_strategy_decision',
          actorUserId: principal.userId,
          outcome: 'success',
          detail: `id=${id} decision=${String(body.decision || '')}`,
        });
        sendOk(result);
        return true;
      }
      if (method === 'POST' && rest === 'match') {
        sendOk(await service.match(principal, id));
        return true;
      }
      if (method === 'POST' && rest === 'shortlist/decision') {
        const result = await service.shortlistDecision(principal, id, body);
        audit({
          action: 'capital_shortlist_decision',
          actorUserId: principal.userId,
          outcome: 'success',
          detail: `id=${id} decision=${String(body.decision || '')}`,
        });
        sendOk(result);
        return true;
      }
      if (method === 'POST' && rest === 'application') {
        sendOk(await service.application(principal, id, body));
        return true;
      }
      if (method === 'POST' && rest === 'submissions') {
        const result = await service.submission(principal, id, body);
        audit({
          action: 'capital_submission',
          actorUserId: principal.userId,
          outcome: 'success',
          detail: `id=${id} recordedOnly=true externalSubmit=false`,
        });
        sendOk(result);
        return true;
      }
      if (method === 'POST' && rest === 'communications/classify') {
        sendOk(await service.classify(principal, id, body));
        return true;
      }
      if (method === 'POST' && rest === 'offers') {
        sendOk(await service.addOffer(principal, id, body));
        return true;
      }
      if (method === 'GET' && rest === 'offers/compare') {
        sendOk(await service.compare(principal, id));
        return true;
      }
      if (method === 'POST' && rest === 'closing/generate') {
        sendOk(await service.closing(principal, id));
        return true;
      }
    }

    if (method === 'POST' && path === '/api/capital/lenders') {
      sendOk(await service.addLender(principal, body));
      return true;
    }
    const prod = path.match(/^\/api\/capital\/lenders\/([^/]+)\/products$/);
    if (method === 'POST' && prod) {
      sendOk(await service.addProduct(principal, decodeURIComponent(prod[1]), body));
      return true;
    }
    if (method === 'POST' && path === '/api/capital/fees') {
      sendOk(await service.fee(principal, body));
      return true;
    }
    if (method === 'POST' && path === '/api/capital/handoffs/eva') {
      sendOk(await service.evaHandoff(principal, body));
      return true;
    }
    if (method === 'POST' && path === '/api/capital/handoffs/agent-copilot') {
      sendOk(await service.copilotHandoff(principal, body));
      return true;
    }
    if (method === 'POST' && path === '/api/capital/handoffs/attribution') {
      sendOk(await service.attribution(principal, body));
      return true;
    }

    send(res, 404, { error: 'not_found' }, origin);
    return true;
  } catch (err) {
    if (err instanceof CapitalHttpError) {
      send(res, err.status, toCapitalErrorBody(err), origin);
      return true;
    }
    throw err;
  }
}
