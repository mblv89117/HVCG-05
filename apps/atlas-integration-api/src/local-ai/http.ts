/**
 * HTTP routes for Local AI Operations Phase 1.
 * Mounted at /api/local-ai/*
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AppConfig } from '../config.ts';
import { requirePrincipal } from '../middleware/auth.ts';
import type { LocalAiService } from './service.ts';

type ErrLike = Error & { status?: number; code?: string };

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

function errStatus(err: unknown): { status: number; body: Record<string, unknown> } {
  const e = err as ErrLike;
  const status = typeof e.status === 'number' ? e.status : 500;
  return {
    status,
    body: {
      error: e.code || 'local_ai_error',
      message: e.message || String(err),
    },
  };
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  return JSON.parse(raw) as Record<string, unknown>;
}

export async function handleLocalAiRoutes(opts: {
  cfg: AppConfig;
  localAi: LocalAiService;
  req: IncomingMessage;
  res: ServerResponse;
  method: string;
  path: string;
  origin?: string | null;
}): Promise<boolean> {
  const { cfg, localAi, req, res, method, path, origin } = opts;
  if (!path.startsWith('/api/local-ai')) return false;

  try {
    // Public-ish safety status still requires principal in production auth mode
    if (method === 'GET' && path === '/api/local-ai/health') {
      await requirePrincipal(req, cfg);
      send(res, 200, { ok: true, ...localAi.safetyStatus() }, origin);
      return true;
    }

    if (method === 'GET' && path === '/api/local-ai/flags') {
      await requirePrincipal(req, cfg);
      send(res, 200, { flags: localAi.getFlags(), safety: localAi.safetyStatus() }, origin);
      return true;
    }

    if (method === 'GET' && path === '/api/local-ai/command-center') {
      await requirePrincipal(req, cfg);
      send(res, 200, { commandCenter: localAi.commandCenterSnapshot() }, origin);
      return true;
    }

    if (method === 'GET' && path === '/api/local-ai/jobs') {
      await requirePrincipal(req, cfg);
      const url = new URL(req.url || '', 'http://local');
      const status = url.searchParams.get('status') || undefined;
      send(res, 200, { jobs: localAi.listJobs({ status }) }, origin);
      return true;
    }

    const jobMatch = path.match(/^\/api\/local-ai\/jobs\/([^/]+)$/);
    if (method === 'GET' && jobMatch) {
      await requirePrincipal(req, cfg);
      const job = localAi.getJob(jobMatch[1]);
      send(
        res,
        200,
        { job, audit: localAi.listAudit(job.aiJobId) },
        origin,
      );
      return true;
    }

    if (method === 'POST' && path === '/api/local-ai/jobs') {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      const result = localAi.createJob({
        sourceRecordType: String(body.sourceRecordType || ''),
        sourceRecordId: String(body.sourceRecordId || ''),
        requestedOperation: String(body.requestedOperation || ''),
        requestedBy: body.requestedBy ? String(body.requestedBy) : undefined,
        workValueTier: body.workValueTier as never,
        inputPayloadReference: body.inputPayloadReference
          ? String(body.inputPayloadReference)
          : undefined,
        requiresMannyApproval:
          typeof body.requiresMannyApproval === 'boolean'
            ? body.requiresMannyApproval
            : undefined,
        idempotencyKey: String(body.idempotencyKey || ''),
        mockScenario: body.mockScenario as never,
        assignedAiRole: body.assignedAiRole as never,
      });
      send(res, result.duplicate ? 200 : 201, result, origin);
      return true;
    }

    const queueMatch = path.match(/^\/api\/local-ai\/jobs\/([^/]+)\/queue$/);
    if (method === 'POST' && queueMatch) {
      await requirePrincipal(req, cfg);
      send(res, 200, { job: localAi.queueJob(queueMatch[1]) }, origin);
      return true;
    }

    const processMatch = path.match(/^\/api\/local-ai\/jobs\/([^/]+)\/process$/);
    if (method === 'POST' && processMatch) {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      const force = Boolean(body.force);
      send(res, 200, { job: localAi.processJob(processMatch[1], { force }) }, origin);
      return true;
    }

    const retryMatch = path.match(/^\/api\/local-ai\/jobs\/([^/]+)\/retry$/);
    if (method === 'POST' && retryMatch) {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      send(res, 200, { job: localAi.retryJob(retryMatch[1], { force: Boolean(body.force) }) }, origin);
      return true;
    }

    const decideMatch = path.match(/^\/api\/local-ai\/jobs\/([^/]+)\/manny-decision$/);
    if (method === 'POST' && decideMatch) {
      const principal = await requirePrincipal(req, cfg);
      const body = await readJson(req);
      const decision = String(body.decision || '') as 'Approved' | 'Rejected' | 'Returned for Revision';
      const actor = String(body.actor || principal.roles[0] || 'Manny');
      send(res, 200, { job: localAi.mannyDecide(decideMatch[1], decision, actor) }, origin);
      return true;
    }

    const prohibitedMatch = path.match(/^\/api\/local-ai\/jobs\/([^/]+)\/attempt-action$/);
    if (method === 'POST' && prohibitedMatch) {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      const gate = localAi.attemptProhibitedAction(
        prohibitedMatch[1],
        String(body.action || ''),
      );
      send(res, gate.allowed ? 200 : 403, { gate }, origin);
      return true;
    }

    const externalMatch = path.match(/^\/api\/local-ai\/jobs\/([^/]+)\/attempt-external$/);
    if (method === 'POST' && externalMatch) {
      await requirePrincipal(req, cfg);
      const gate = localAi.attemptExternalCommunication(externalMatch[1]);
      send(res, 403, { gate }, origin);
      return true;
    }

    if (method === 'POST' && path === '/api/local-ai/policy/evaluate') {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      const result = localAi.evaluatePolicy(body as never);
      send(res, 200, { policy: result }, origin);
      return true;
    }

    if (method === 'GET' && path === '/api/local-ai/operations-queue') {
      await requirePrincipal(req, cfg);
      send(res, 200, { items: localAi.listOperationsQueue() }, origin);
      return true;
    }

    if (method === 'POST' && path === '/api/local-ai/operations-queue') {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      const item = localAi.createOperationsItem({
        title: String(body.title || ''),
        description: body.description ? String(body.description) : undefined,
        assignee: body.assignee as never,
        priority: body.priority as never,
        deadline: body.deadline === null ? null : body.deadline ? String(body.deadline) : undefined,
        workValueTier: body.workValueTier as never,
        escalationReason: body.escalationReason ? String(body.escalationReason) : undefined,
        dependencyIds: Array.isArray(body.dependencyIds)
          ? body.dependencyIds.map(String)
          : undefined,
        sourceRecordType: String(body.sourceRecordType || ''),
        sourceRecordId: String(body.sourceRecordId || ''),
        requiresMannyApproval:
          typeof body.requiresMannyApproval === 'boolean'
            ? body.requiresMannyApproval
            : undefined,
      });
      send(res, 201, { item }, origin);
      return true;
    }

    const reassignMatch = path.match(/^\/api\/local-ai\/operations-queue\/([^/]+)\/reassign$/);
    if (method === 'POST' && reassignMatch) {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      const item = localAi.reassignOperationsItem(reassignMatch[1], String(body.assignee || ''));
      send(res, 200, { item }, origin);
      return true;
    }

    if (method === 'GET' && path === '/api/local-ai/audit') {
      await requirePrincipal(req, cfg);
      const url = new URL(req.url || '', 'http://local');
      const aiJobId = url.searchParams.get('aiJobId') || undefined;
      send(res, 200, { events: localAi.listAudit(aiJobId) }, origin);
      return true;
    }

    send(res, 404, { error: 'not_found', message: `No local-ai route ${method} ${path}` }, origin);
    return true;
  } catch (err) {
    const { status, body } = errStatus(err);
    send(res, status, body, origin);
    return true;
  }
}
