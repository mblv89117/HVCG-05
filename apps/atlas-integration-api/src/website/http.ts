/**
 * Keyed POST /api/website/leads → SharePoint HVCG_Leads.
 * Auth is x-website-intake-key only. Bearer does not grant this route.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { audit } from '../audit/auditLog.ts';
import type { AppConfig } from '../config.ts';
import { createGraphTransport } from '../pm/sharepoint/graph.ts';
import { PmHttpError, toErrorBody } from '../pm/sharepoint/errors.ts';
import { createManagedIdentityTokenProvider, GRAPH_TOKEN_RESOURCE } from '../pm/sharepoint/token.ts';
import { verifyWebsiteIntakeKey, websiteIntakeKeyConfigured } from './intakeAuth.ts';
import { upsertWebsiteLead } from './leads.ts';

function send(res: ServerResponse, status: number, body: unknown, origin?: string | null) {
  const headers: Record<string, string> = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  };
  if (origin) {
    headers['access-control-allow-origin'] = origin;
    headers['access-control-allow-credentials'] = 'true';
    headers['vary'] = 'Origin';
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

export async function handleWebsiteLeadRoutes(opts: {
  cfg: AppConfig;
  req: IncomingMessage;
  res: ServerResponse;
  method: string;
  path: string;
  origin: string | null;
}): Promise<boolean> {
  const { cfg, req, res, method, path, origin } = opts;
  if (path !== '/api/website/leads') return false;

  if (!websiteIntakeKeyConfigured(cfg.websiteIntakeKey)) {
    send(
      res,
      503,
      {
        error: 'WEBSITE_INTAKE_UNAVAILABLE',
        code: 'WEBSITE_INTAKE_UNAVAILABLE',
        message: 'Website lead ingest is not configured.',
      },
      origin,
    );
    return true;
  }

  if (!verifyWebsiteIntakeKey(req.headers['x-website-intake-key'], cfg.websiteIntakeKey)) {
    send(
      res,
      401,
      {
        error: 'unauthorized',
        message: 'Website intake key required.',
      },
      origin,
    );
    return true;
  }

  if (method !== 'POST') {
    send(res, 405, { error: 'method_not_allowed' }, origin);
    return true;
  }

  const settings = cfg.pmBackend.mode === 'sharepoint' ? cfg.pmBackend.sharepoint : undefined;
  if (!settings?.leadsListId) {
    send(
      res,
      503,
      {
        error: 'WEBSITE_INTAKE_UNAVAILABLE',
        code: 'WEBSITE_INTAKE_UNAVAILABLE',
        message: 'Website lead ingest is not configured.',
      },
      origin,
    );
    return true;
  }

  let body: unknown = {};
  try {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const raw = Buffer.concat(chunks).toString('utf8');
    body = raw ? JSON.parse(raw) : {};
  } catch {
    send(res, 400, { error: 'invalid_json' }, origin);
    return true;
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    send(res, 400, { error: 'invalid_json' }, origin);
    return true;
  }

  const tokenProvider =
    cfg.pmTokenProvider ||
    createManagedIdentityTokenProvider(settings.managedIdentityClientId, {
      resource: GRAPH_TOKEN_RESOURCE,
    });
  const graph = cfg.pmGraphTransport || createGraphTransport(settings, tokenProvider);

  try {
    const result = await upsertWebsiteLead({
      settings,
      graph,
      body: body as Record<string, unknown>,
      ownerEmail: cfg.websiteLeadOwnerEmail,
    });
    audit({
      action: 'website_lead_upsert',
      outcome: 'success',
      detail: `${result.created ? 'created' : 'updated'} list=HVCG_Leads item=${result.itemId}`,
    });
    send(res, result.created ? 201 : 200, result, origin);
    return true;
  } catch (err) {
    if (err instanceof PmHttpError) {
      send(res, err.status, toErrorBody(err), origin);
      return true;
    }
    send(
      res,
      503,
      {
        error: 'WEBSITE_INTAKE_UNAVAILABLE',
        code: 'WEBSITE_INTAKE_UNAVAILABLE',
        message: 'Website lead ingest failed.',
      },
      origin,
    );
    return true;
  }
}
