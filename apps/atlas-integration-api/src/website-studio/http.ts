/**
 * HTTP routes for Website Studio Phase 6A.
 * Mounted at /api/website-studio/*
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AppConfig } from '../config.ts';
import { requirePrincipal } from '../middleware/auth.ts';
import type { WebsiteStudioService } from './service.ts';

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
      error: e.code || 'website_studio_error',
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

export async function handleWebsiteStudioRoutes(opts: {
  cfg: AppConfig;
  websiteStudio: WebsiteStudioService;
  req: IncomingMessage;
  res: ServerResponse;
  method: string;
  path: string;
  origin?: string | null;
}): Promise<boolean> {
  const { cfg, websiteStudio: ws, req, res, method, path, origin } = opts;
  if (!path.startsWith('/api/website-studio')) return false;

  try {
    if (method === 'GET' && path === '/api/website-studio/health') {
      await requirePrincipal(req, cfg);
      send(res, 200, { ok: true, ...ws.banners(), phase: '6A' }, origin);
      return true;
    }

    if (method === 'GET' && path === '/api/website-studio/dashboard') {
      await requirePrincipal(req, cfg);
      send(res, 200, { dashboard: ws.dashboard() }, origin);
      return true;
    }

    if (method === 'GET' && path === '/api/website-studio/websites') {
      await requirePrincipal(req, cfg);
      send(res, 200, { websites: ws.listWebsites() }, origin);
      return true;
    }

    if (method === 'POST' && path === '/api/website-studio/websites') {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      const website = ws.registerWebsite({
        websiteName: String(body.websiteName || ''),
        businessEntity: body.businessEntity ? String(body.businessEntity) : undefined,
        productionUrl: body.productionUrl ? String(body.productionUrl) : null,
        stagingUrl: body.stagingUrl ? String(body.stagingUrl) : null,
        repositoryUrl: body.repositoryUrl ? String(body.repositoryUrl) : null,
        localRepositoryPath: body.localRepositoryPath
          ? String(body.localRepositoryPath)
          : null,
        framework: (body.framework as never) || undefined,
        hostingProvider: body.hostingProvider ? String(body.hostingProvider) : null,
        notes: body.notes ? String(body.notes) : null,
        synthetic: body.synthetic !== false,
        mannyConfirmedRegistration: Boolean(body.mannyConfirmedRegistration),
      });
      send(res, 201, { website }, origin);
      return true;
    }

    const websiteMatch = path.match(/^\/api\/website-studio\/websites\/([^/]+)$/);
    if (method === 'GET' && websiteMatch) {
      await requirePrincipal(req, cfg);
      send(res, 200, { website: ws.getWebsite(websiteMatch[1]) }, origin);
      return true;
    }

    if (method === 'GET' && websiteMatch && path.endsWith(websiteMatch[0])) {
      /* handled above */
    }

    const pagesMatch = path.match(/^\/api\/website-studio\/websites\/([^/]+)\/pages$/);
    if (method === 'GET' && pagesMatch) {
      await requirePrincipal(req, cfg);
      send(res, 200, { pages: ws.listPages(pagesMatch[1]) }, origin);
      return true;
    }

    const blocksMatch = path.match(/^\/api\/website-studio\/websites\/([^/]+)\/blocks$/);
    if (method === 'GET' && blocksMatch) {
      await requirePrincipal(req, cfg);
      const url = new URL(req.url || '', 'http://local');
      const pageId = url.searchParams.get('pageId') || undefined;
      send(res, 200, { blocks: ws.listBlocks(blocksMatch[1], pageId) }, origin);
      return true;
    }

    const mediaMatch = path.match(/^\/api\/website-studio\/websites\/([^/]+)\/media$/);
    if (method === 'GET' && mediaMatch) {
      await requirePrincipal(req, cfg);
      send(res, 200, { media: ws.listMedia(mediaMatch[1]) }, origin);
      return true;
    }

    const formsMatch = path.match(/^\/api\/website-studio\/websites\/([^/]+)\/forms$/);
    if (method === 'GET' && formsMatch) {
      await requirePrincipal(req, cfg);
      send(res, 200, { forms: ws.listForms(formsMatch[1]) }, origin);
      return true;
    }

    const seoMatch = path.match(/^\/api\/website-studio\/websites\/([^/]+)\/pages\/([^/]+)\/seo$/);
    if (method === 'GET' && seoMatch) {
      await requirePrincipal(req, cfg);
      send(res, 200, ws.seoForPage(seoMatch[1], seoMatch[2]), origin);
      return true;
    }

    const previewHealthMatch = path.match(
      /^\/api\/website-studio\/websites\/([^/]+)\/preview-health$/,
    );
    if (method === 'GET' && previewHealthMatch) {
      await requirePrincipal(req, cfg);
      const health = await ws.previewHealth(previewHealthMatch[1]);
      send(res, 200, { previewHealth: health }, origin);
      return true;
    }

    const previewStartMatch = path.match(
      /^\/api\/website-studio\/websites\/([^/]+)\/preview\/start$/,
    );
    if (method === 'POST' && previewStartMatch) {
      await requirePrincipal(req, cfg);
      const preview = await ws.startWebsitePreview(previewStartMatch[1]);
      send(res, 200, { preview }, origin);
      return true;
    }

    const previewStopMatch = path.match(
      /^\/api\/website-studio\/websites\/([^/]+)\/preview\/stop$/,
    );
    if (method === 'POST' && previewStopMatch) {
      await requirePrincipal(req, cfg);
      const preview = await ws.stopWebsitePreview(previewStopMatch[1]);
      send(res, 200, { preview }, origin);
      return true;
    }

    const previewRestartMatch = path.match(
      /^\/api\/website-studio\/websites\/([^/]+)\/preview\/restart$/,
    );
    if (method === 'POST' && previewRestartMatch) {
      await requirePrincipal(req, cfg);
      const preview = await ws.restartWebsitePreview(previewRestartMatch[1]);
      send(res, 200, { preview }, origin);
      return true;
    }

    const previewPageMatch = path.match(
      /^\/api\/website-studio\/websites\/([^/]+)\/preview-page$/,
    );
    if (method === 'GET' && previewPageMatch) {
      await requirePrincipal(req, cfg);
      const url = new URL(req.url || '', 'http://local');
      const pageId = url.searchParams.get('pageId') || undefined;
      send(res, 200, ws.previewPageUrl(previewPageMatch[1], pageId), origin);
      return true;
    }

    if (method === 'GET' && path === '/api/website-studio/owner/inbox') {
      await requirePrincipal(req, cfg);
      const url = new URL(req.url || '', 'http://local');
      const websiteId = url.searchParams.get('websiteId') || undefined;
      send(res, 200, ws.ownerInbox(websiteId), origin);
      return true;
    }

    if (method === 'GET' && path === '/api/website-studio/qa/readiness') {
      await requirePrincipal(req, cfg);
      const url = new URL(req.url || '', 'http://local');
      const websiteId = url.searchParams.get('websiteId') || undefined;
      send(res, 200, ws.getWebsiteStudioReadiness(websiteId), origin);
      return true;
    }

    if (method === 'GET' && path === '/api/website-studio/qa/latest') {
      await requirePrincipal(req, cfg);
      const url = new URL(req.url || '', 'http://local');
      const websiteId = url.searchParams.get('websiteId') || undefined;
      send(res, 200, { result: ws.getLatestQaResult(websiteId) }, origin);
      return true;
    }

    if (method === 'GET' && path === '/api/website-studio/qa/runs') {
      await requirePrincipal(req, cfg);
      const url = new URL(req.url || '', 'http://local');
      const websiteId = url.searchParams.get('websiteId') || undefined;
      send(res, 200, { runs: ws.listQaRuns(websiteId) }, origin);
      return true;
    }

    if (method === 'POST' && path === '/api/website-studio/qa/begin') {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      send(
        res,
        200,
        ws.beginQaRun({
          websiteId: body.websiteId ? String(body.websiteId) : undefined,
          changeRequestId: body.changeRequestId ? String(body.changeRequestId) : undefined,
          runType: body.runType ? String(body.runType) : undefined,
        }),
        origin,
      );
      return true;
    }

    if (method === 'POST' && path === '/api/website-studio/qa/record') {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      const sealed = ws.recordQaResult(body as never);
      send(res, 200, { result: sealed }, origin);
      return true;
    }

    if (method === 'POST' && path === '/api/website-studio/qa/restore-pilot') {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      const changeRequest = ws.restorePilotForOwnerReview(
        body.changeRequestId ? String(body.changeRequestId) : 'wcr_96016971141f',
        body.ownerQaGate ? { ownerQaGate: String(body.ownerQaGate) } : undefined,
      );
      send(res, 200, { changeRequest }, origin);
      return true;
    }

    if (method === 'GET' && path === '/api/website-studio/local-system-status') {
      await requirePrincipal(req, cfg);
      send(res, 200, await ws.localSystemStatus(), origin);
      return true;
    }

    const ownerReviewMatch = path.match(
      /^\/api\/website-studio\/change-requests\/([^/]+)\/owner-review$/,
    );
    if (method === 'GET' && ownerReviewMatch) {
      await requirePrincipal(req, cfg);
      const review = await ws.getOwnerReviewLive(ownerReviewMatch[1]);
      send(res, 200, { review }, origin);
      return true;
    }

    const ownerSnapshotMatch = path.match(
      /^\/api\/website-studio\/change-requests\/([^/]+)\/preview-snapshot$/,
    );
    if (method === 'GET' && ownerSnapshotMatch) {
      await requirePrincipal(req, cfg);
      const url = new URL(req.url || '', 'http://local');
      const mode = url.searchParams.get('mode') === 'before' ? 'before' : 'after';
      // Legacy text/HTML extract — owner UI must use preview-urls (real localhost renders).
      const html = ws.getChangePreviewHtml(ownerSnapshotMatch[1], mode);
      const headers: Record<string, string> = {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        'x-atlas-preview-mode': mode,
        'x-atlas-not-live': 'true',
        'x-atlas-preview-kind': 'legacy-srcdoc-snapshot',
        'x-atlas-prefer-preview-urls': 'true',
      };
      if (origin) {
        headers['access-control-allow-origin'] = origin;
        headers['access-control-allow-credentials'] = 'true';
      }
      res.writeHead(200, headers);
      res.end(html);
      return true;
    }

    const previewUrlsMatch = path.match(
      /^\/api\/website-studio\/change-requests\/([^/]+)\/preview-urls$/,
    );
    if (method === 'GET' && previewUrlsMatch) {
      await requirePrincipal(req, cfg);
      const urls = await ws.getChangePreviewUrls(previewUrlsMatch[1]);
      send(res, 200, { previewUrls: urls, source: 'local-preview-only' }, origin);
      return true;
    }

    const ensureCompareMatch = path.match(
      /^\/api\/website-studio\/change-requests\/([^/]+)\/ensure-compare-previews$/,
    );
    if (method === 'POST' && ensureCompareMatch) {
      await requirePrincipal(req, cfg);
      const urls = await ws.ensureComparePreviews(ensureCompareMatch[1]);
      send(res, 200, { previewUrls: urls, source: 'local-preview-only' }, origin);
      return true;
    }

    const deviceReviewMatch = path.match(
      /^\/api\/website-studio\/change-requests\/([^/]+)\/device-review$/,
    );
    if (method === 'POST' && deviceReviewMatch) {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      const device = String(body.device || '') as 'Desktop' | 'Tablet' | 'Mobile';
      if (!['Desktop', 'Tablet', 'Mobile'].includes(device)) {
        send(res, 400, { error: 'invalid_device', message: 'device must be Desktop|Tablet|Mobile' }, origin);
        return true;
      }
      const changeRequest = ws.setDeviceReview(deviceReviewMatch[1], device, Boolean(body.looksGood));
      send(res, 200, { changeRequest }, origin);
      return true;
    }

    const ownerApproveMatch = path.match(
      /^\/api\/website-studio\/change-requests\/([^/]+)\/owner-approve$/,
    );
    if (method === 'POST' && ownerApproveMatch) {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      const result = await ws.approveOwnerChange(ownerApproveMatch[1], {
        previewReviewed: Boolean(body.previewReviewed),
        confirmed: Boolean(body.confirmed),
        deviceReviews: (body.deviceReviews as never) || undefined,
      });
      send(res, 200, { ...result, deployed: false, published: false, merged: false }, origin);
      return true;
    }

    const ownerEditMatch = path.match(
      /^\/api\/website-studio\/change-requests\/([^/]+)\/owner-edit$/,
    );
    if (method === 'POST' && ownerEditMatch) {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      const changeRequest = ws.updateOwnerDraftContent(
        ownerEditMatch[1],
        String(body.proposedContent || ''),
      );
      send(res, 200, { changeRequest, filesModified: false }, origin);
      return true;
    }

    const threeOptionsMatch = path.match(
      /^\/api\/website-studio\/change-requests\/([^/]+)\/three-options$/,
    );
    if (method === 'POST' && threeOptionsMatch) {
      await requirePrincipal(req, cfg);
      send(res, 200, ws.showMeThreeOptions(threeOptionsMatch[1]), origin);
      return true;
    }

    const saveLaterMatch = path.match(
      /^\/api\/website-studio\/change-requests\/([^/]+)\/save-for-later$/,
    );
    if (method === 'POST' && saveLaterMatch) {
      await requirePrincipal(req, cfg);
      send(res, 200, { changeRequest: ws.saveChangeForLater(saveLaterMatch[1]) }, origin);
      return true;
    }

    if (method === 'POST' && path === '/api/website-studio/owner/ignore-recommendation') {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      const result = ws.ignoreRecommendation({
        websiteId: String(body.websiteId || ''),
        recommendationId: String(body.recommendationId || ''),
        scope: body.scope === 'permanent' ? 'permanent' : 'page',
        pageId: body.pageId ? String(body.pageId) : undefined,
      });
      send(res, 200, result, origin);
      return true;
    }

    const pageAnalyzeMatch = path.match(
      /^\/api\/website-studio\/websites\/([^/]+)\/pages\/([^/]+)\/analyze$/,
    );
    if (method === 'POST' && pageAnalyzeMatch) {
      await requirePrincipal(req, cfg);
      const analysis = ws.analyzePage(pageAnalyzeMatch[1], pageAnalyzeMatch[2]);
      send(res, 200, { analysis }, origin);
      return true;
    }

    const websiteAnalyzeMatch = path.match(/^\/api\/website-studio\/websites\/([^/]+)\/analyze$/);
    if (method === 'POST' && websiteAnalyzeMatch) {
      await requirePrincipal(req, cfg);
      const analysis = ws.analyzeWebsite(websiteAnalyzeMatch[1]);
      send(res, 200, { analysis }, origin);
      return true;
    }

    const advisorChatMatch = path.match(/^\/api\/website-studio\/websites\/([^/]+)\/advisor\/chat$/);
    if (method === 'POST' && advisorChatMatch) {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      const chat = ws.advisorChat(
        advisorChatMatch[1],
        String(body.message || ''),
        body.pageId ? String(body.pageId) : undefined,
      );
      send(res, 200, { chat }, origin);
      return true;
    }

    if (method === 'POST' && path === '/api/website-studio/discover') {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      const localPath = String(body.localPath || '');
      if (!localPath) {
        send(res, 400, { error: 'local_path_required', message: 'localPath required' }, origin);
        return true;
      }
      const discovery = ws.discover(
        localPath,
        body.websiteId ? String(body.websiteId) : undefined,
      );
      send(res, 200, { discovery }, origin);
      return true;
    }

    if (method === 'GET' && path === '/api/website-studio/change-requests') {
      await requirePrincipal(req, cfg);
      const url = new URL(req.url || '', 'http://local');
      const websiteId = url.searchParams.get('websiteId') || undefined;
      // Enrich so ownerStatus stays authoritative for History / Rejected persistence.
      send(res, 200, { changeRequests: ws.listOwnerChangeRequests(websiteId) }, origin);
      return true;
    }

    if (method === 'POST' && path === '/api/website-studio/change-requests') {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      const cr = ws.createChangeRequest({
        websiteId: String(body.websiteId || ''),
        pageId: body.pageId ? String(body.pageId) : null,
        requestType: (body.requestType as never) || 'content_edit',
        reason: String(body.reason || ''),
        originalContent: body.originalContent != null ? String(body.originalContent) : null,
        proposedContent: body.proposedContent != null ? String(body.proposedContent) : null,
        filesExpectedToChange: Array.isArray(body.filesExpectedToChange)
          ? body.filesExpectedToChange.map(String)
          : [],
        localAiAssistanceUsed: Boolean(body.localAiAssistanceUsed),
        status: (body.status as never) || 'Waiting on Manny',
      });
      send(res, 201, { changeRequest: cr }, origin);
      return true;
    }

    if (method === 'POST' && path === '/api/website-studio/natural-language') {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      const cr = ws.createNaturalLanguageChange({
        text: String(body.text || body.request || ''),
        websiteId: body.websiteId ? String(body.websiteId) : undefined,
        pageId: body.pageId ? String(body.pageId) : undefined,
      });
      send(res, 201, { changeRequest: cr, filesModified: false }, origin);
      return true;
    }

    if (method === 'POST' && path === '/api/website-studio/ai/assist') {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      const result = ws.runAiAssist({
        websiteId: String(body.websiteId || ''),
        changeRequestId: body.changeRequestId ? String(body.changeRequestId) : undefined,
        operation: String(body.operation || ''),
        content: body.content != null ? String(body.content) : undefined,
        pageId: body.pageId ? String(body.pageId) : undefined,
      });
      send(res, 200, result, origin);
      return true;
    }

    const crMatch = path.match(/^\/api\/website-studio\/change-requests\/([^/]+)$/);
    if (method === 'GET' && crMatch) {
      await requirePrincipal(req, cfg);
      const cr = ws.enrichChangeRequest(ws.getChangeRequest(crMatch[1]));
      send(res, 200, { changeRequest: cr, qa: ws.getQa(cr.changeRequestId) }, origin);
      return true;
    }

    const decideMatch = path.match(/^\/api\/website-studio\/change-requests\/([^/]+)\/decision$/);
    if (method === 'POST' && decideMatch) {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      const decision = String(body.decision || '') as 'approve' | 'reject' | 'cancel';
      const cr = ws.decideChangeRequest(decideMatch[1], decision, body.notes ? String(body.notes) : undefined);
      send(res, 200, { changeRequest: cr }, origin);
      return true;
    }

    const applyMatch = path.match(/^\/api\/website-studio\/change-requests\/([^/]+)\/apply-local$/);
    if (method === 'POST' && applyMatch) {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      const result = ws.applyApprovedLocalEdit(applyMatch[1], {
        sandboxRoot: body.sandboxRoot ? String(body.sandboxRoot) : undefined,
        repoPath: body.repoPath ? String(body.repoPath) : undefined,
      });
      send(res, 200, { ...result, pushed: false, deployed: false }, origin);
      return true;
    }

    const previewMatch = path.match(/^\/api\/website-studio\/change-requests\/([^/]+)\/preview$/);
    if (method === 'POST' && previewMatch) {
      await requirePrincipal(req, cfg);
      const preview = ws.startPreview(previewMatch[1]);
      send(res, 200, { preview }, origin);
      return true;
    }

    const qaMatch = path.match(/^\/api\/website-studio\/change-requests\/([^/]+)\/qa$/);
    if (method === 'GET' && qaMatch) {
      await requirePrincipal(req, cfg);
      send(res, 200, { qa: ws.getQa(qaMatch[1]) }, origin);
      return true;
    }

    if (method === 'POST' && qaMatch) {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      const qa = ws.updateQaItem(
        qaMatch[1],
        String(body.itemId || ''),
        body.status as never,
        body.notes ? String(body.notes) : undefined,
      );
      send(res, 200, { qa }, origin);
      return true;
    }

    const deployMatch = path.match(
      /^\/api\/website-studio\/change-requests\/([^/]+)\/deployment-scaffold$/,
    );
    if (method === 'POST' && deployMatch) {
      await requirePrincipal(req, cfg);
      const deployment = ws.scaffoldDeployment(deployMatch[1]);
      send(res, 200, { deployment, executed: false }, origin);
      return true;
    }

    if (method === 'POST' && path === '/api/website-studio/rollbacks/scaffold') {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      const rollback = ws.scaffoldRollback(
        String(body.websiteId || ''),
        String(body.reason || 'Phase 6A scaffold'),
      );
      send(res, 200, { rollback, executed: false }, origin);
      return true;
    }

    if (method === 'GET' && path === '/api/website-studio/deployments') {
      await requirePrincipal(req, cfg);
      send(res, 200, { deployments: ws.listDeployments() }, origin);
      return true;
    }

    if (method === 'GET' && path === '/api/website-studio/rollbacks') {
      await requirePrincipal(req, cfg);
      send(res, 200, { rollbacks: ws.listRollbacks() }, origin);
      return true;
    }

    if (method === 'GET' && path === '/api/website-studio/previews') {
      await requirePrincipal(req, cfg);
      send(res, 200, { previews: ws.listPreviews() }, origin);
      return true;
    }

    if (method === 'GET' && path === '/api/website-studio/audit') {
      await requirePrincipal(req, cfg);
      send(res, 200, { audit: ws.listAudit() }, origin);
      return true;
    }

    if (method === 'POST' && path === '/api/website-studio/forbidden/deploy') {
      await requirePrincipal(req, cfg);
      ws.attemptForbiddenDeploy();
      return true;
    }

    if (method === 'POST' && path === '/api/website-studio/phase6b/bootstrap') {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      const result = ws.bootstrapPhase6bPilot({
        naturalLanguage: body.naturalLanguage ? String(body.naturalLanguage) : undefined,
        worktreePath: body.worktreePath ? String(body.worktreePath) : undefined,
      });
      send(res, 201, result, origin);
      return true;
    }

    if (method === 'GET' && path === '/api/website-studio/baselines') {
      await requirePrincipal(req, cfg);
      const url = new URL(req.url || '', 'http://local');
      const websiteId = url.searchParams.get('websiteId') || undefined;
      send(res, 200, { baselines: ws.listBaselines(websiteId) }, origin);
      return true;
    }

    const reviewMatch = path.match(/^\/api\/website-studio\/change-requests\/([^/]+)\/review-panel$/);
    if (method === 'GET' && reviewMatch) {
      await requirePrincipal(req, cfg);
      send(res, 200, { panel: ws.getPilotReviewPanel(reviewMatch[1]) }, origin);
      return true;
    }

    const finalMatch = path.match(/^\/api\/website-studio\/change-requests\/([^/]+)\/final-wording$/);
    if (method === 'POST' && finalMatch) {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      const cr = ws.phase6bSetFinalWording(finalMatch[1], {
        selectedVariantId: body.selectedVariantId != null ? String(body.selectedVariantId) : null,
        customWording: body.customWording != null ? String(body.customWording) : null,
        rejectAll: Boolean(body.rejectAll),
      });
      send(res, 200, { changeRequest: cr, filesModified: false }, origin);
      return true;
    }

    const approveFinalMatch = path.match(
      /^\/api\/website-studio\/change-requests\/([^/]+)\/approve-final-wording$/,
    );
    if (method === 'POST' && approveFinalMatch) {
      await requirePrincipal(req, cfg);
      const cr = ws.phase6bApproveFinalWording(approveFinalMatch[1]);
      send(res, 200, { changeRequest: cr, filesModified: false }, origin);
      return true;
    }

    const applyPilotMatch = path.match(
      /^\/api\/website-studio\/change-requests\/([^/]+)\/apply-pilot$/,
    );
    if (method === 'POST' && applyPilotMatch) {
      await requirePrincipal(req, cfg);
      const result = ws.phase6bApply(applyPilotMatch[1]);
      send(res, 200, { ...result, pushed: false, deployed: false }, origin);
      return true;
    }

    const visualQaMatch = path.match(
      /^\/api\/website-studio\/change-requests\/([^/]+)\/visual-qa$/,
    );
    if (method === 'POST' && visualQaMatch) {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      const cr = ws.phase6bConfirmVisualQa(visualQaMatch[1], Boolean(body.confirmed));
      send(res, 200, { changeRequest: cr }, origin);
      return true;
    }

    const commitPilotMatch = path.match(/^\/api\/website-studio\/change-requests\/([^/]+)\/commit$/);
    if (method === 'POST' && commitPilotMatch) {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      const result = ws.phase6bCommit(
        commitPilotMatch[1],
        body.message ? String(body.message) : undefined,
      );
      send(res, 200, { ...result, pushed: false }, origin);
      return true;
    }

    const pushAuthMatch = path.match(
      /^\/api\/website-studio\/change-requests\/([^/]+)\/authorize-push$/,
    );
    if (method === 'POST' && pushAuthMatch) {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      const cr = ws.phase6bAuthorizePush(pushAuthMatch[1], Boolean(body.approved));
      send(res, 200, { changeRequest: cr }, origin);
      return true;
    }

    const pushMatch = path.match(/^\/api\/website-studio\/change-requests\/([^/]+)\/push$/);
    if (method === 'POST' && pushMatch) {
      await requirePrincipal(req, cfg);
      const result = ws.phase6bPush(pushMatch[1]);
      send(res, 200, result, origin);
      return true;
    }

    if (method === 'POST' && path === '/api/website-studio/forbidden/merge') {
      await requirePrincipal(req, cfg);
      ws.phase6bRejectMerge();
      return true;
    }

    send(res, 404, { error: 'not_found', message: `Unknown Website Studio route: ${path}` }, origin);
    return true;
  } catch (err) {
    const { status, body } = errStatus(err);
    send(res, status, body, origin);
    return true;
  }
}
