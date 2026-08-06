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
        sourceContent: body.sourceContent ? String(body.sourceContent) : undefined,
        executorMode: body.executorMode as 'mock' | 'ollama' | undefined,
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
      send(res, 200, { job: await localAi.processJob(processMatch[1], { force }) }, origin);
      return true;
    }

    const retryMatch = path.match(/^\/api\/local-ai\/jobs\/([^/]+)\/retry$/);
    if (method === 'POST' && retryMatch) {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      send(
        res,
        200,
        { job: await localAi.retryJob(retryMatch[1], { force: Boolean(body.force) }) },
        origin,
      );
      return true;
    }

    const cancelMatch = path.match(/^\/api\/local-ai\/jobs\/([^/]+)\/cancel$/);
    if (method === 'POST' && cancelMatch) {
      await requirePrincipal(req, cfg);
      send(res, 200, { job: localAi.cancelJob(cancelMatch[1]) }, origin);
      return true;
    }

    if (method === 'GET' && path === '/api/local-ai/ollama/discovery') {
      await requirePrincipal(req, cfg);
      const snap = await localAi.refreshOllamaDiscovery(false);
      send(res, 200, { discovery: snap, executor: localAi.safetyStatus().executor }, origin);
      return true;
    }

    if (method === 'GET' && path === '/api/local-ai/fixtures') {
      await requirePrincipal(req, cfg);
      const { SYNTHETIC_FIXTURES } = await import('./syntheticFixtures.ts');
      send(res, 200, { fixtures: SYNTHETIC_FIXTURES }, origin);
      return true;
    }

    if (method === 'GET' && path === '/api/local-ai/documents') {
      await requirePrincipal(req, cfg);
      send(res, 200, { documents: localAi.listStagedDocuments() }, origin);
      return true;
    }

    if (method === 'GET' && path === '/api/local-ai/documents/fixtures') {
      await requirePrincipal(req, cfg);
      send(res, 200, { fixtures: localAi.listDocumentFixtures() }, origin);
      return true;
    }

    if (method === 'POST' && path === '/api/local-ai/documents/stage') {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      const rec = await localAi.stageDocument({
        originalFilename: String(body.originalFilename || ''),
        contentBase64: String(body.contentBase64 || ''),
        declaredMime: body.declaredMime ? String(body.declaredMime) : undefined,
      });
      send(res, 201, { document: rec }, origin);
      return true;
    }

    if (method === 'POST' && path === '/api/local-ai/documents/search') {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      send(res, 200, { documents: localAi.searchStagedDocuments(body || {}) }, origin);
      return true;
    }

    if (method === 'GET' && path === '/api/local-ai/documents/recovery') {
      await requirePrincipal(req, cfg);
      send(
        res,
        200,
        {
          interrupted: localAi.listInterruptedDocumentJobs(),
          recoveryNote: 'Interrupted jobs are not auto-reprocessed',
        },
        origin,
      );
      return true;
    }
    const resumeMatchEarly = path.match(/^\/api\/local-ai\/documents\/recovery\/([^/]+)\/resume$/);
    if (method === 'POST' && resumeMatchEarly) {
      await requirePrincipal(req, cfg);
      send(res, 200, localAi.resumeInterruptedDocumentJob(resumeMatchEarly[1]), origin);
      return true;
    }
    const cancelRecMatchEarly = path.match(
      /^\/api\/local-ai\/documents\/recovery\/([^/]+)\/cancel$/,
    );
    if (method === 'POST' && cancelRecMatchEarly) {
      await requirePrincipal(req, cfg);
      send(res, 200, localAi.cancelInterruptedDocumentJob(cancelRecMatchEarly[1]), origin);
      return true;
    }

    if (method === 'GET' && path === '/api/local-ai/documents/storage/health') {
      await requirePrincipal(req, cfg);
      send(
        res,
        200,
        {
          health: localAi.storageHealthExtended(),
          migration: localAi.documentMigrationStatus(),
        },
        origin,
      );
      return true;
    }
    if (method === 'GET' && path === '/api/local-ai/documents/storage/integrity') {
      await requirePrincipal(req, cfg);
      send(res, 200, { report: localAi.documentIntegrityCheck() }, origin);
      return true;
    }
    if (method === 'POST' && path === '/api/local-ai/documents/storage/repair-dry-run') {
      await requirePrincipal(req, cfg);
      send(res, 200, localAi.documentRepairDryRun(), origin);
      return true;
    }
    if (method === 'POST' && path === '/api/local-ai/documents/storage/repair') {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      send(
        res,
        200,
        localAi.documentAuthorizedRepair({
          authorized: Boolean(body.authorized),
          action: body.action ? String(body.action) : 'note_only',
        }),
        origin,
      );
      return true;
    }
    if (method === 'GET' && path === '/api/local-ai/documents/storage/retention-preview') {
      await requirePrincipal(req, cfg);
      send(res, 200, { candidates: localAi.retentionPreviewDocuments() }, origin);
      return true;
    }
    if (method === 'GET' && path === '/api/local-ai/documents/storage/retention-policies') {
      await requirePrincipal(req, cfg);
      send(res, 200, { policies: localAi.listRetentionPolicies() }, origin);
      return true;
    }
    if (method === 'POST' && path === '/api/local-ai/documents/storage/retention-batch') {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      send(
        res,
        201,
        { batch: localAi.createRetentionBatch(body.notes ? String(body.notes) : undefined) },
        origin,
      );
      return true;
    }
    if (method === 'POST' && path === '/api/local-ai/documents/storage/retention-batch/approve') {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      send(
        res,
        200,
        {
          batch: localAi.approveRetentionBatch(String(body.batchId || ''), {
            authorized: Boolean(body.authorized),
            execute: Boolean(body.execute),
          }),
        },
        origin,
      );
      return true;
    }
    if (method === 'GET' && path === '/api/local-ai/documents/storage/retention-batches') {
      await requirePrincipal(req, cfg);
      send(res, 200, { batches: localAi.listRetentionBatches() }, origin);
      return true;
    }
    if (method === 'POST' && path === '/api/local-ai/documents/storage/holds') {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      send(
        res,
        201,
        {
          hold: localAi.createDocumentHold({
            reviewId: body.reviewId ? String(body.reviewId) : null,
            packId: body.packId ? String(body.packId) : null,
            holdType: String(body.holdType || 'Manny Hold') as never,
            reason: String(body.reason || 'Manny hold'),
            expiresAt: body.expiresAt ? String(body.expiresAt) : null,
          }),
        },
        origin,
      );
      return true;
    }
    if (method === 'GET' && path === '/api/local-ai/documents/storage/holds') {
      await requirePrincipal(req, cfg);
      send(res, 200, { holds: localAi.listDocumentHolds(true) }, origin);
      return true;
    }
    const holdRelease = path.match(/^\/api\/local-ai\/documents\/storage\/holds\/([^/]+)\/release$/);
    if (method === 'POST' && holdRelease) {
      await requirePrincipal(req, cfg);
      send(res, 200, { hold: localAi.releaseDocumentHold(holdRelease[1]) }, origin);
      return true;
    }
    if (method === 'POST' && path === '/api/local-ai/documents/storage/backup') {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      send(
        res,
        200,
        {
          backup: localAi.backupDocumentReviews({
            dryRun: Boolean(body.dryRun),
            profile: (String(body.profile || 'Metadata Only') as
              | 'Metadata Only'
              | 'Metadata Plus Extracted Content'
              | 'Full Local Review Backup'),
            encrypted: Boolean(body.encrypted),
            passphrase: body.passphrase ? String(body.passphrase) : undefined,
            includeStagedOriginals: Boolean(body.includeStagedOriginals),
          }),
        },
        origin,
      );
      return true;
    }
    if (method === 'GET' && path === '/api/local-ai/documents/storage/backups') {
      await requirePrincipal(req, cfg);
      send(res, 200, { backups: localAi.listDocumentBackups() }, origin);
      return true;
    }
    if (method === 'POST' && path === '/api/local-ai/documents/storage/backup-verify') {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      send(
        res,
        200,
        localAi.verifyDocumentBackup(
          String(body.manifestPath || body.backupPath || ''),
          body.passphrase ? String(body.passphrase) : undefined,
        ),
        origin,
      );
      return true;
    }
    if (method === 'POST' && path === '/api/local-ai/documents/storage/restore-validate') {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      send(
        res,
        200,
        { validation: localAi.validateDocumentRestore(String(body.backupPath || '')) },
        origin,
      );
      return true;
    }
    if (method === 'POST' && path === '/api/local-ai/documents/storage/restore') {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      send(
        res,
        200,
        localAi.restoreDocumentReviews(String(body.backupPath || ''), {
          dryRun: Boolean(body.dryRun),
          authorized: Boolean(body.authorized),
          confirmOverwrite: Boolean(body.confirmOverwrite),
          passphrase: body.passphrase ? String(body.passphrase) : undefined,
          tempValidationOnly: Boolean(body.tempValidationOnly),
        }),
        origin,
      );
      return true;
    }

    if (method === 'POST' && path === '/api/local-ai/documents/multi-pack') {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      const pack = localAi.createMultiDocumentReview({
        stagedFileIds: Array.isArray(body.stagedFileIds)
          ? body.stagedFileIds.map(String)
          : [],
        clientLabel: String(body.clientLabel || 'Unknown Client'),
        title: body.title ? String(body.title) : undefined,
        projectLabel: body.projectLabel ? String(body.projectLabel) : null,
        purpose: body.purpose ? String(body.purpose) : null,
      });
      send(res, 201, { pack }, origin);
      return true;
    }

    if (method === 'GET' && path === '/api/local-ai/documents/multi-pack') {
      await requirePrincipal(req, cfg);
      send(res, 200, { packs: localAi.listMultiDocumentReviews() }, origin);
      return true;
    }

    const packMatchEarly = path.match(/^\/api\/local-ai\/documents\/multi-pack\/([^/]+)$/);
    if (method === 'GET' && packMatchEarly) {
      await requirePrincipal(req, cfg);
      send(res, 200, { pack: localAi.getMultiDocumentReview(packMatchEarly[1]) }, origin);
      return true;
    }
    if (method === 'PATCH' && packMatchEarly) {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      const pack = localAi.updateMultiDocumentReview(packMatchEarly[1], {
        addStagedFileIds: Array.isArray(body.addStagedFileIds)
          ? body.addStagedFileIds.map(String)
          : undefined,
        removeStagedFileIds: Array.isArray(body.removeStagedFileIds)
          ? body.removeStagedFileIds.map(String)
          : undefined,
        title: body.title ? String(body.title) : undefined,
      });
      send(res, 200, { pack }, origin);
      return true;
    }
    const packDecideMatchEarly = path.match(
      /^\/api\/local-ai\/documents\/multi-pack\/([^/]+)\/decision$/,
    );
    if (method === 'POST' && packDecideMatchEarly) {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      const pack = localAi.decideMultiDocumentReview(
        packDecideMatchEarly[1],
        String(body.decision || 'No Action'),
        body.notes ? String(body.notes) : undefined,
      );
      send(res, 200, { pack }, origin);
      return true;
    }

    const packWorkspace = path.match(/^\/api\/local-ai\/documents\/multi-pack\/([^/]+)\/workspace$/);
    if (method === 'GET' && packWorkspace) {
      await requirePrincipal(req, cfg);
      send(res, 200, { workspace: localAi.getPackWorkspace(packWorkspace[1]) }, origin);
      return true;
    }
    if (method === 'POST' && packWorkspace) {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      send(
        res,
        200,
        { workspace: localAi.configurePackWorkspace(packWorkspace[1], body || {}) },
        origin,
      );
      return true;
    }
    const packAnalyze = path.match(/^\/api\/local-ai\/documents\/multi-pack\/([^/]+)\/analyze$/);
    if (method === 'POST' && packAnalyze) {
      await requirePrincipal(req, cfg);
      send(res, 200, { analysis: localAi.analyzeMultiDocumentPack(packAnalyze[1]) }, origin);
      return true;
    }
    const packRel = path.match(/^\/api\/local-ai\/documents\/multi-pack\/([^/]+)\/relationships$/);
    if (method === 'POST' && packRel) {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      send(
        res,
        201,
        {
          relationship: localAi.upsertPackRelationship(packRel[1], {
            relationshipId: body.relationshipId ? String(body.relationshipId) : undefined,
            fromReviewId: String(body.fromReviewId || ''),
            toReviewId: body.toReviewId ? String(body.toReviewId) : null,
            relationshipType: String(body.relationshipType || 'relationship unknown') as never,
            label: body.label ? String(body.label) : null,
            historyNote: body.historyNote ? String(body.historyNote) : undefined,
          }),
        },
        origin,
      );
      return true;
    }
    const packRelDel = path.match(
      /^\/api\/local-ai\/documents\/multi-pack\/relationships\/([^/]+)$/,
    );
    if (method === 'DELETE' && packRelDel) {
      await requirePrincipal(req, cfg);
      send(res, 200, localAi.deletePackRelationship(packRelDel[1]), origin);
      return true;
    }

    const resumeElig = path.match(
      /^\/api\/local-ai\/documents\/([^/]+)\/resume-eligibility$/,
    );
    if (method === 'GET' && resumeElig) {
      await requirePrincipal(req, cfg);
      send(res, 200, { eligibility: localAi.documentResumeEligibility(resumeElig[1]) }, origin);
      return true;
    }
    const checkpoints = path.match(/^\/api\/local-ai\/documents\/([^/]+)\/checkpoints$/);
    if (method === 'GET' && checkpoints) {
      await requirePrincipal(req, cfg);
      send(res, 200, { checkpoints: localAi.listDocumentCheckpoints(checkpoints[1]) }, origin);
      return true;
    }
    const resumeJob = path.match(/^\/api\/local-ai\/documents\/([^/]+)\/resume$/);
    if (method === 'POST' && resumeJob) {
      await requirePrincipal(req, cfg);
      send(res, 200, { document: await localAi.resumeDocumentFromCheckpoint(resumeJob[1]) }, origin);
      return true;
    }
    const restartJob = path.match(/^\/api\/local-ai\/documents\/([^/]+)\/restart$/);
    if (method === 'POST' && restartJob) {
      await requirePrincipal(req, cfg);
      send(res, 200, { document: await localAi.restartDocumentReview(restartJob[1]) }, origin);
      return true;
    }
    const malwareFp = path.match(/^\/api\/local-ai\/documents\/([^/]+)\/malware-fingerprint$/);
    if (method === 'GET' && malwareFp) {
      await requirePrincipal(req, cfg);
      send(res, 200, localAi.getMalwareFingerprint(malwareFp[1]), origin);
      return true;
    }
    const extractFp = path.match(/^\/api\/local-ai\/documents\/([^/]+)\/extraction-fingerprint$/);
    if (method === 'GET' && extractFp) {
      await requirePrincipal(req, cfg);
      send(res, 200, localAi.getExtractionFingerprint(extractFp[1]), origin);
      return true;
    }

    if (method === 'POST' && path === '/api/local-ai/documents/compare') {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      const comparison = localAi.compareStagedDocumentVersions(
        String(body.leftStagedFileId || ''),
        String(body.rightStagedFileId || ''),
      );
      send(res, 200, { comparison }, origin);
      return true;
    }

    const docMatch = path.match(/^\/api\/local-ai\/documents\/([^/]+)$/);
    if (method === 'GET' && docMatch) {
      await requirePrincipal(req, cfg);
      send(res, 200, { document: localAi.getStagedDocument(docMatch[1]) }, origin);
      return true;
    }

    const docProcessMatch = path.match(/^\/api\/local-ai\/documents\/([^/]+)\/process$/);
    if (method === 'POST' && docProcessMatch) {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      const document = await localAi.processStagedDocument({
        stagedFileId: docProcessMatch[1],
        clientLabel: body.clientLabel ? String(body.clientLabel) : undefined,
        projectLabel: body.projectLabel ? String(body.projectLabel) : null,
        forceOcr: Boolean(body.forceOcr),
      });
      send(res, 200, { document }, origin);
      return true;
    }

    const docCancelMatch = path.match(/^\/api\/local-ai\/documents\/([^/]+)\/cancel$/);
    if (method === 'POST' && docCancelMatch) {
      await requirePrincipal(req, cfg);
      send(res, 200, localAi.cancelStagedDocumentProcess(docCancelMatch[1]), origin);
      return true;
    }

    const docDecideMatch = path.match(/^\/api\/local-ai\/documents\/([^/]+)\/decision$/);
    if (method === 'POST' && docDecideMatch) {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      const document = await localAi.decideStagedDocument(
        docDecideMatch[1],
        String(body.decision || '') as never,
        (body.corrections as Record<string, unknown>) || undefined,
      );
      send(res, 200, { document }, origin);
      return true;
    }

    const corrMatch = path.match(/^\/api\/local-ai\/documents\/([^/]+)\/corrections$/);
    if (method === 'GET' && corrMatch) {
      await requirePrincipal(req, cfg);
      send(res, 200, { corrections: localAi.listDocumentCorrections(corrMatch[1]) }, origin);
      return true;
    }
    const decHistMatch = path.match(/^\/api\/local-ai\/documents\/([^/]+)\/decisions$/);
    if (method === 'GET' && decHistMatch) {
      await requirePrincipal(req, cfg);
      send(res, 200, { decisions: localAi.listDocumentDecisions(decHistMatch[1]) }, origin);
      return true;
    }

    const docPurgeMatch = path.match(/^\/api\/local-ai\/documents\/([^/]+)\/purge$/);
    if (method === 'POST' && docPurgeMatch) {
      await requirePrincipal(req, cfg);
      const body = (await readJson(req).catch(() => ({}))) as Record<string, unknown>;
      send(
        res,
        200,
        {
          document: localAi.purgeStagedDocument(docPurgeMatch[1], {
            authorized: body.authorized !== false,
            reason: body.reason ? String(body.reason) : undefined,
          }),
        },
        origin,
      );
      return true;
    }

    if (method === 'GET' && path === '/api/local-ai/model-routing') {
      await requirePrincipal(req, cfg);
      await localAi.refreshOllamaDiscovery(false);
      send(res, 200, { routing: localAi.getModelRouting() }, origin);
      return true;
    }

    if (method === 'GET' && path === '/api/local-ai/performance') {
      await requirePrincipal(req, cfg);
      send(res, 200, { dashboard: localAi.performanceDashboard() }, origin);
      return true;
    }

    if (method === 'POST' && path === '/api/local-ai/model-compare') {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      const comparison = await localAi.compareModelsSideBySide({
        operation: String(body.operation || 'summarize_text'),
        sourceContent: String(body.sourceContent || ''),
        force: Boolean(body.force),
      });
      send(res, 200, { comparison }, origin);
      return true;
    }

    if (method === 'GET' && path === '/api/local-ai/approval-queue') {
      await requirePrincipal(req, cfg);
      send(res, 200, localAi.approvalQueue(), origin);
      return true;
    }

    if (method === 'GET' && path === '/api/local-ai/content-packs') {
      await requirePrincipal(req, cfg);
      send(res, 200, { packs: localAi.listContentPacks() }, origin);
      return true;
    }

    if (method === 'POST' && path === '/api/local-ai/content-packs') {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      const pack = localAi.createContentPack({
        sourceKind: body.sourceKind as never,
        sourceConfirmed: Boolean(body.sourceConfirmed),
        clientId: String(body.clientId || ''),
        clientLabel: String(body.clientLabel || ''),
        projectId: body.projectId ? String(body.projectId) : null,
        projectLabel: body.projectLabel ? String(body.projectLabel) : null,
        sensitivity: body.sensitivity as never,
        requestedOperation: String(body.requestedOperation || ''),
        originalContent: String(body.originalContent || ''),
        modelProfileOverride: body.modelProfileOverride as never,
        notes: body.notes ? String(body.notes) : undefined,
        ownerApprovedLiveContent: Boolean(body.ownerApprovedLiveContent),
      });
      send(res, 201, { pack }, origin);
      return true;
    }

    const packMatch = path.match(/^\/api\/local-ai\/content-packs\/([^/]+)$/);
    if (method === 'GET' && packMatch) {
      await requirePrincipal(req, cfg);
      send(res, 200, { pack: localAi.getContentPack(packMatch[1]) }, origin);
      return true;
    }

    const packRedactionMatch = path.match(
      /^\/api\/local-ai\/content-packs\/([^/]+)\/redaction-decision$/,
    );
    if (method === 'POST' && packRedactionMatch) {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      const pack = localAi.decideContentPackRedaction(
        packRedactionMatch[1],
        String(body.decision || '') as never,
        {
          editedRedactedContent: body.editedRedactedContent
            ? String(body.editedRedactedContent)
            : undefined,
        },
      );
      send(res, 200, { pack }, origin);
      return true;
    }

    const packProcessMatch = path.match(/^\/api\/local-ai\/content-packs\/([^/]+)\/process$/);
    if (method === 'POST' && packProcessMatch) {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      const result = await localAi.processContentPack(packProcessMatch[1], {
        force: Boolean(body.force),
        processNow: body.processNow !== false,
      });
      send(res, 200, result, origin);
      return true;
    }

    const decideMatch = path.match(/^\/api\/local-ai\/jobs\/([^/]+)\/manny-decision$/);
    if (method === 'POST' && decideMatch) {
      const principal = await requirePrincipal(req, cfg);
      const body = await readJson(req);
      const decision = String(body.decision || '') as never;
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
