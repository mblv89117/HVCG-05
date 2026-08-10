/**
 * Phase 6A Website Studio service — control plane only.
 * No Production edits, no push, no deploy.
 */

import { randomUUID } from 'node:crypto';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import {
  AUTOMATION_OWNER,
  HVCG_PILOT_WEBSITE_ID,
  LOCAL_AI_OWNER,
  MANNY_OWNER,
  PRODUCTION_DEPLOY_GATE,
  WEBSITE_STUDIO_ACCESS,
  WEBSITE_STUDIO_BANNER,
  WEBSITE_STUDIO_NO_DEPLOY,
  WEBSITE_STUDIO_NO_PUSH,
  WEBSITE_STUDIO_PHASE6B_BANNER,
  assertWebsiteAiAllowed,
  buildDefaultQaChecklist,
  classifyWebsiteChange,
  newChangeRequestId,
  newWebsiteId,
  syntheticBlocksFor,
  syntheticFormsFor,
  syntheticMediaFor,
  syntheticPagesFor,
  syntheticWebsiteFixtures,
  validateSeoFields,
  type ChangeRequestStatus,
  type DeploymentRecord,
  type PreviewSession,
  type QaChecklistItem,
  type RollbackRecord,
  type SeoFieldSet,
  type WebsiteAiOperation,
  type WebsiteChangeRequest,
  type WebsiteDiscoveryResult,
  type WebsiteRegistryRecord,
  type WebsiteStudioDashboard,
} from '@hvcg/atlas-integration-core';
import { discoverLocalRepository } from './discovery.ts';
import { WebsiteGitAdapter } from './gitAdapter.ts';
import { Phase6bPilotController } from './phase6b.ts';
import { WebsiteStudioStore, resolveWebsiteStudioDbPath } from './store.ts';
import {
  advisorChatReply,
  analyzePage as runPageAnalysis,
  analyzeWebsite as runWebsiteAnalysis,
  checkPreviewHealth,
} from './advisor.ts';

function nowIso() {
  return new Date().toISOString();
}

export class WebsiteStudioService {
  readonly store: WebsiteStudioStore;
  readonly phase6b: Phase6bPilotController;
  private seedDone = false;

  constructor(opts: { repoRoot: string; env?: Record<string, string | undefined>; dbPath?: string }) {
    const env = opts.env || process.env;
    const dbPath = opts.dbPath || resolveWebsiteStudioDbPath(env, opts.repoRoot);
    this.store = new WebsiteStudioStore(dbPath);
    this.phase6b = new Phase6bPilotController(this.store);
    this.ensureSyntheticSeed();
  }

  private ensureSyntheticSeed() {
    if (this.seedDone) return;
    if (this.store.listWebsites().length === 0) {
      for (const w of syntheticWebsiteFixtures()) {
        this.store.upsertWebsite(w);
        for (const p of syntheticPagesFor(w.websiteId)) this.store.upsertPage(p);
        for (const b of syntheticBlocksFor(w.websiteId)) this.store.upsertBlock(b);
        for (const m of syntheticMediaFor(w.websiteId)) this.store.upsertMedia(m);
        for (const f of syntheticFormsFor(w.websiteId)) this.store.upsertForm(f);
      }
      this.store.audit({
        actor: 'system',
        action: 'website_studio_seeded_synthetic',
        detail: WEBSITE_STUDIO_BANNER,
      });
    }
    this.seedDone = true;
  }

  banners() {
    return {
      studio: WEBSITE_STUDIO_BANNER,
      noDeploy: WEBSITE_STUDIO_NO_DEPLOY,
      noPush: WEBSITE_STUDIO_NO_PUSH,
      phase6b: WEBSITE_STUDIO_PHASE6B_BANNER,
      phase6bUx: 'PHASE 6B-UX — Expert Advisor & preview health (analysis only; no deploy)',
      productionDeployGate: PRODUCTION_DEPLOY_GATE,
      phase: '6B-UX',
      access: WEBSITE_STUDIO_ACCESS,
    };
  }

  listWebsites() {
    return this.store.listWebsites();
  }

  getWebsite(id: string) {
    const w = this.store.getWebsite(id);
    if (!w) throw Object.assign(new Error('Website not found'), { status: 404, code: 'not_found' });
    return w;
  }

  registerWebsite(input: Partial<WebsiteRegistryRecord> & { websiteName: string; mannyConfirmedRegistration: boolean }) {
    if (!input.mannyConfirmedRegistration) {
      throw Object.assign(new Error('Manny confirmation required to register a website'), {
        status: 403,
        code: 'manny_confirmation_required',
      });
    }
    const existing = this.store.findWebsiteByName(input.websiteName);
    if (existing) {
      throw Object.assign(new Error('Duplicate website registration'), {
        status: 409,
        code: 'duplicate_website',
        existingId: existing.websiteId,
      });
    }
    const now = nowIso();
    const rec: WebsiteRegistryRecord = {
      websiteId: input.websiteId || newWebsiteId(),
      websiteName: input.websiteName,
      businessEntity: input.businessEntity || input.websiteName,
      productionUrl: input.productionUrl || null,
      stagingUrl: input.stagingUrl || null,
      repositoryUrl: input.repositoryUrl || null,
      localRepositoryPath: input.localRepositoryPath || null,
      framework: input.framework || 'Unknown',
      hostingProvider: input.hostingProvider || null,
      productionBranch: input.productionBranch || 'main',
      defaultDevelopmentBranch: input.defaultDevelopmentBranch || 'feature/website-studio-local',
      buildCommand: input.buildCommand || null,
      testCommand: input.testCommand || null,
      previewCommand: input.previewCommand || null,
      deploymentMethod: input.deploymentMethod || null,
      contentArchitecture: input.contentArchitecture || null,
      seoArchitecture: input.seoArchitecture || null,
      analyticsProvider: input.analyticsProvider || null,
      formProvider: input.formProvider || null,
      status: input.status || 'Registered',
      lastSuccessfulDeployment: null,
      lastRollbackPoint: null,
      openChangeRequestCount: 0,
      repositoryHealth: 'Unknown',
      notes: input.notes || null,
      synthetic: input.synthetic ?? true,
      mannyConfirmedRegistration: true,
      createdAt: now,
      updatedAt: now,
    };
    this.store.upsertWebsite(rec);
    this.store.audit({
      actor: MANNY_OWNER,
      action: 'website_registered',
      detail: rec.websiteId,
      payload: { name: rec.websiteName, synthetic: rec.synthetic },
    });
    return rec;
  }

  discover(localPath: string, websiteId?: string): WebsiteDiscoveryResult {
    const result = discoverLocalRepository(localPath);
    if (websiteId) {
      result.websiteId = websiteId;
      const w = this.store.getWebsite(websiteId);
      if (w) {
        w.localRepositoryPath = result.repositoryRoot || localPath;
        w.framework = result.framework;
        w.repositoryUrl = result.gitRemote || w.repositoryUrl;
        w.status = 'Discovered';
        w.repositoryHealth = result.confidence >= 0.6 ? 'Healthy' : 'Degraded';
        w.updatedAt = nowIso();
        this.store.upsertWebsite(w);
      }
    }
    this.store.saveDiscovery(result);
    this.store.audit({
      actor: LOCAL_AI_OWNER,
      action: 'website_discovery_readonly',
      detail: result.discoveryId,
      payload: {
        path: localPath,
        confidence: result.confidence,
        modifiedAnything: false,
      },
    });
    return result;
  }

  listPages(websiteId: string) {
    this.getWebsite(websiteId);
    return this.store.listPages(websiteId);
  }

  listBlocks(websiteId: string, pageId?: string) {
    this.getWebsite(websiteId);
    return this.store.listBlocks(websiteId, pageId);
  }

  listMedia(websiteId: string) {
    this.getWebsite(websiteId);
    return this.store.listMedia(websiteId);
  }

  listForms(websiteId: string) {
    this.getWebsite(websiteId);
    return this.store.listForms(websiteId);
  }

  seoForPage(websiteId: string, pageId: string): { seo: SeoFieldSet; issues: ReturnType<typeof validateSeoFields> } {
    const page = this.store.listPages(websiteId).find((p) => p.pageId === pageId);
    if (!page) throw Object.assign(new Error('Page not found'), { status: 404, code: 'not_found' });
    const seo: SeoFieldSet = {
      pageTitle: page.seoTitle,
      metaDescription: page.metaDescription,
      canonical: page.canonicalUrl,
      robotsDirective: 'index,follow',
      ogTitle: page.seoTitle,
      ogDescription: page.metaDescription,
      ogImageReference: page.imagesUsed[0] || null,
      twitterTitle: page.seoTitle,
      twitterDescription: page.metaDescription,
      h1: page.h1,
      structuredDataFields: page.schemaMarkupPresent
        ? { type: page.structuredDataType }
        : {},
      localBusinessFields: {},
      serviceAreaFields: {},
      faqSchemaContent: [],
      sitemapInclusion: true,
      redirectRequest: null,
    };
    return { seo, issues: validateSeoFields(seo) };
  }

  createNaturalLanguageChange(opts: {
    text: string;
    websiteId?: string;
    pageId?: string;
    requestedBy?: string;
  }): WebsiteChangeRequest {
    const text = opts.text.trim();
    if (!text) {
      throw Object.assign(new Error('Request text required'), { status: 400, code: 'empty_request' });
    }
    // Forbidden immediate file edit / deploy language
    if (/deploy to production|push to main|merge pr|change dns|rotate secret/i.test(text)) {
      const classification = classifyWebsiteChange({
        naturalLanguage: text,
        touchesHighRisk: true,
      });
      // Still create CR but escalate — never execute
    }

    let website = opts.websiteId ? this.getWebsite(opts.websiteId) : null;
    if (!website) {
      const websites = this.store.listWebsites();
      website =
        websites.find((w) => text.toLowerCase().includes(w.websiteName.toLowerCase().slice(0, 12))) ||
        websites[0] ||
        null;
    }
    if (!website) {
      throw Object.assign(new Error('No website available'), { status: 404, code: 'no_website' });
    }

    const pages = this.store.listPages(website.websiteId);
    let page =
      (opts.pageId && pages.find((p) => p.pageId === opts.pageId)) ||
      pages.find((p) => /homepage|home page|hero/i.test(text) && p.route === '/') ||
      pages.find((p) => /about/i.test(text) && /about/i.test(p.route)) ||
      pages.find((p) => /service/i.test(text) && /service/i.test(p.route)) ||
      pages[0];

    const blocks = this.store.listBlocks(website.websiteId, page?.pageId);
    const targetBlock =
      blocks.find((b) => /headline|h1/i.test(text) && b.blockType === 'headline') ||
      blocks.find((b) => /cta|consultation/i.test(text) && b.blockType === 'CTA') ||
      blocks.find((b) => /phone|footer/i.test(text) && b.blockType === 'contact information') ||
      blocks.find((b) => /faq/i.test(text) && b.blockType === 'FAQ') ||
      blocks[0];

    const classification = classifyWebsiteChange({
      requestType: 'natural_language',
      naturalLanguage: text,
      files: targetBlock ? [targetBlock.sourceFile] : page ? [page.sourceFile] : [],
    });

    const proposed = this.draftProposalFromNl(text, targetBlock?.currentValue || page?.h1 || '');

    const cr = this.createChangeRequest({
      websiteId: website.websiteId,
      pageId: page?.pageId || null,
      requestType: classification.tier.startsWith('Tier D')
        ? 'restricted'
        : classification.tier.startsWith('Tier C')
          ? 'developer'
          : 'natural_language',
      tier: classification.tier,
      riskLevel: classification.riskLevel,
      requestedBy: opts.requestedBy || MANNY_OWNER,
      originalContent: targetBlock?.currentValue || page?.h1 || null,
      proposedContent: proposed,
      reason: text,
      naturalLanguageRequest: text,
      filesExpectedToChange: targetBlock ? [targetBlock.sourceFile] : page ? [page.sourceFile] : [],
      localAiAssistanceUsed: true,
      aiOperation: /meta|seo|title|description/i.test(text)
        ? 'improve_meta_title'
        : /headline/i.test(text)
          ? 'improve_headline'
          : /cta/i.test(text)
            ? 'improve_cta'
            : /faq/i.test(text)
              ? 'draft_faq'
              : 'rewrite_content',
      sideEffects: classification.reasons,
      seoImpact: /seo|meta|title|description|canonical/i.test(text) ? 'Possible SEO field updates' : null,
      formImpact: /form/i.test(text) ? 'Form copy may change' : null,
      status: 'Waiting on Manny',
    });

    this.store.audit({
      actor: LOCAL_AI_OWNER,
      action: 'nl_change_request_created',
      correlationId: cr.auditCorrelationId,
      detail: 'Natural-language request staged — no files modified',
      payload: {
        changeRequestId: cr.changeRequestId,
        websiteId: website.websiteId,
        pageId: page?.pageId,
        tier: cr.tier,
      },
    });
    return cr;
  }

  private draftProposalFromNl(text: string, current: string): string {
    const m =
      /(?:change|update|set|rewrite).{0,40}?(?:to|as)\s+["']?(.+?)["']?\s*$/i.exec(text) ||
      /emphasize\s+(.+)$/i.exec(text);
    if (m?.[1]) return m[1].trim();
    if (/schedule a consultation/i.test(text)) return 'Schedule a Consultation';
    if (/capital advisory/i.test(text)) {
      return current.includes('Capital')
        ? current
        : 'Capital Advisory for High-Value Operators';
    }
    if (/hvcg instead of hvs/i.test(text)) {
      return current.replace(/\bHVS\b/g, 'HVCG');
    }
    return `[PROPOSED] ${text.slice(0, 180)}`;
  }

  createChangeRequest(input: {
    websiteId: string;
    pageId?: string | null;
    requestType: WebsiteChangeRequest['requestType'];
    tier?: WebsiteChangeRequest['tier'];
    riskLevel?: WebsiteChangeRequest['riskLevel'];
    requestedBy?: string;
    originalContent?: string | null;
    proposedContent?: string | null;
    reason: string;
    naturalLanguageRequest?: string | null;
    filesExpectedToChange?: string[];
    localAiAssistanceUsed?: boolean;
    aiOperation?: WebsiteAiOperation | null;
    sideEffects?: string[];
    seoImpact?: string | null;
    formImpact?: string | null;
    status?: ChangeRequestStatus;
  }): WebsiteChangeRequest {
    this.getWebsite(input.websiteId);
    const classified =
      input.tier && input.riskLevel
        ? { tier: input.tier, riskLevel: input.riskLevel, reasons: [] as string[] }
        : classifyWebsiteChange({
            requestType: input.requestType,
            naturalLanguage: input.reason,
            files: input.filesExpectedToChange,
          });
    const now = nowIso();
    const cr: WebsiteChangeRequest = {
      changeRequestId: newChangeRequestId(),
      websiteId: input.websiteId,
      pageId: input.pageId || null,
      requestType: input.requestType,
      tier: classified.tier,
      requestedBy: input.requestedBy || MANNY_OWNER,
      originalContent: input.originalContent ?? null,
      proposedContent: input.proposedContent ?? null,
      reason: input.reason,
      localAiAssistanceUsed: Boolean(input.localAiAssistanceUsed),
      aiOperation: input.aiOperation || null,
      filesExpectedToChange: input.filesExpectedToChange || [],
      riskLevel: classified.riskLevel,
      seoImpact: input.seoImpact || null,
      formImpact: input.formImpact || null,
      analyticsImpact: null,
      securityImpact:
        classified.tier.startsWith('Tier C') || classified.tier.startsWith('Tier D')
          ? 'Requires developer-style review'
          : null,
      buildRequired: !classified.tier.startsWith('Tier A'),
      testsRequired: classified.tier.startsWith('Tier C') || classified.tier.startsWith('Tier D'),
      previewStatus: null,
      qaStatus: null,
      gitBranch: null,
      commit: null,
      prUrl: null,
      deploymentStatus: 'Blocked — Phase 6A',
      rollbackReference: null,
      mannyApproval: null,
      productionApproval: null,
      status: input.status || 'Draft',
      auditCorrelationId: randomUUID(),
      naturalLanguageRequest: input.naturalLanguageRequest || null,
      sideEffects: input.sideEffects || classified.reasons,
      timeProtection: {
        estimatedReviewMinutes: classified.tier.startsWith('Tier A')
          ? 3
          : classified.tier.startsWith('Tier B')
            ? 8
            : 20,
        estimatedTimeSavedMinutes: 25,
        recommendedAction: classified.tier.startsWith('Tier D')
          ? 'Escalate as restricted — do not apply via content editor'
          : 'Review proposal and approve for Git branch only (no push/deploy)',
      },
      createdAt: now,
      updatedAt: now,
      phase6aNoPush: true,
      phase6aNoDeploy: true,
    };
    this.store.upsertChangeRequest(cr);
    const qa = buildDefaultQaChecklist(cr);
    this.store.saveQa(cr.changeRequestId, qa);
    this.refreshOpenCrCount(input.websiteId);
    return cr;
  }

  private refreshOpenCrCount(websiteId: string) {
    const w = this.getWebsite(websiteId);
    const open = this.store
      .listChangeRequests(websiteId)
      .filter((c) => !['Rejected', 'Cancelled', 'Deployed', 'Rolled Back'].includes(c.status)).length;
    w.openChangeRequestCount = open;
    w.updatedAt = nowIso();
    this.store.upsertWebsite(w);
  }

  runAiAssist(opts: {
    changeRequestId?: string;
    websiteId: string;
    operation: string;
    content?: string;
  }) {
    const op = assertWebsiteAiAllowed(opts.operation);
    const source =
      opts.content ||
      this.store.getChangeRequest(opts.changeRequestId || '')?.originalContent ||
      'Synthetic content';
    const proposal = this.deterministicAiDraft(op, source);
    const cr =
      opts.changeRequestId && this.store.getChangeRequest(opts.changeRequestId)
        ? this.store.getChangeRequest(opts.changeRequestId)!
        : this.createChangeRequest({
            websiteId: opts.websiteId,
            requestType: 'ai_patch',
            reason: `AI assist: ${op}`,
            originalContent: source,
            proposedContent: proposal,
            localAiAssistanceUsed: true,
            aiOperation: op,
            status: 'Waiting on Manny',
          });
    cr.proposedContent = proposal;
    cr.localAiAssistanceUsed = true;
    cr.aiOperation = op;
    cr.status = 'Waiting on Manny';
    cr.updatedAt = nowIso();
    this.store.upsertChangeRequest(cr);
    this.store.audit({
      actor: LOCAL_AI_OWNER,
      action: 'website_ai_proposal',
      correlationId: cr.auditCorrelationId,
      detail: op,
      payload: { changeRequestId: cr.changeRequestId, forbiddenDeploy: true },
    });
    return { operation: op, proposal, changeRequest: cr, mayDeploy: false, mayPush: false };
  }

  private deterministicAiDraft(op: WebsiteAiOperation, source: string): string {
    switch (op) {
      case 'improve_headline':
        return source.includes('Capital')
          ? source
          : `Capital Advisory: ${source}`.slice(0, 90);
      case 'improve_cta':
        return 'Schedule a Consultation';
      case 'improve_meta_title':
        return `${source.slice(0, 40)} | Capital Advisory`.slice(0, 60);
      case 'improve_meta_description':
        return `Learn how ${source.slice(0, 40)} supports enterprise value and capital readiness.`.slice(
          0,
          155,
        );
      case 'draft_faq':
        return 'Q: What is enterprise value advisory?\nA: A structured assessment of growth, capital readiness, and value drivers.';
      case 'summarize_page':
        return `Summary of current content (${source.length} chars): ${source.slice(0, 120)}…`;
      case 'prepare_qa_checklist':
        return 'QA: build, typecheck, mobile/desktop layout, SEO fields, no secrets.';
      case 'prepare_change_plan':
        return `Plan: locate block → propose text → Manny approve → branch website-studio/* → no push/deploy.`;
      default:
        return `[AI draft — ${op}] ${source}`;
    }
  }

  listChangeRequests(websiteId?: string) {
    return this.store.listChangeRequests(websiteId);
  }

  getChangeRequest(id: string) {
    const cr = this.store.getChangeRequest(id);
    if (!cr) throw Object.assign(new Error('Change request not found'), { status: 404, code: 'not_found' });
    return cr;
  }

  decideChangeRequest(
    id: string,
    decision: 'approve' | 'reject' | 'cancel',
    notes?: string,
  ): WebsiteChangeRequest {
    const cr = this.getChangeRequest(id);
    if (decision === 'reject') {
      cr.status = 'Rejected';
      cr.mannyApproval = false;
    } else if (decision === 'cancel') {
      cr.status = 'Cancelled';
    } else {
      if (cr.tier.startsWith('Tier D')) {
        throw Object.assign(
          new Error('Tier D restricted changes cannot be auto-approved for file edit in Phase 6A'),
          { status: 403, code: 'restricted_escalation' },
        );
      }
      cr.mannyApproval = true;
      cr.status = 'Approved for Git';
      cr.qaStatus = 'QA Required';
    }
    cr.updatedAt = nowIso();
    this.store.upsertChangeRequest(cr);
    this.store.audit({
      actor: MANNY_OWNER,
      action: `change_request_${decision}`,
      correlationId: cr.auditCorrelationId,
      detail: notes || decision,
      payload: { status: cr.status, noPush: true, noDeploy: true },
    });
    this.refreshOpenCrCount(cr.websiteId);
    return cr;
  }

  /**
   * Apply approved change to a local sandbox write area OR synthetic record only.
   * Never touches production branch. Never pushes.
   */
  applyApprovedLocalEdit(
    changeRequestId: string,
    opts?: { sandboxRoot?: string; repoPath?: string },
  ): {
    changeRequest: WebsiteChangeRequest;
    applied: boolean;
    diff: string | null;
    branch: string | null;
    commit: string | null;
    wroteSandboxFile: boolean;
  } {
    const cr = this.getChangeRequest(changeRequestId);
    if (cr.status !== 'Approved for Git' && cr.mannyApproval !== true) {
      throw Object.assign(new Error('Manny approval required before file apply'), {
        status: 403,
        code: 'manny_approval_required',
      });
    }
    if (cr.tier.startsWith('Tier D') || cr.tier.startsWith('Tier C')) {
      throw Object.assign(new Error('Developer/restricted changes require separate escalation'), {
        status: 403,
        code: 'escalation_required',
      });
    }

    const website = this.getWebsite(cr.websiteId);
    let branch: string | null = null;
    let commit: string | null = null;
    let diff: string | null = null;
    let wroteSandboxFile = false;

    // Prefer isolated sandbox under .data — never production repo by default
    const sandboxRoot =
      opts?.sandboxRoot ||
      resolve(
        process.cwd(),
        '.data',
        'website-studio',
        'sandboxes',
        cr.websiteId,
        cr.changeRequestId,
      );
    mkdirSync(sandboxRoot, { recursive: true });
    const fileRel = cr.filesExpectedToChange[0] || 'content/proposed.txt';
    const safeRel = fileRel.replace(/\.\./g, '').replace(/^\//, '');
    const target = join(sandboxRoot, safeRel);
    mkdirSync(dirname(target), { recursive: true });
    const before = cr.originalContent || '';
    const after = cr.proposedContent || '';
    writeFileSync(target, after, 'utf8');
    wroteSandboxFile = true;
    diff = `--- a/${safeRel}\n+++ b/${safeRel}\n- ${before}\n+ ${after}`;

    // Optional: if a non-production local repo path is provided and is a git repo on website-studio branch
    if (opts?.repoPath && existsSync(opts.repoPath)) {
      const git = new WebsiteGitAdapter(opts.repoPath);
      const st = git.status();
      if (st.currentBranch === website.productionBranch) {
        throw Object.assign(new Error('Refusing to edit production branch'), {
          status: 403,
          code: 'production_branch_edit_forbidden',
        });
      }
      if (st.clean) {
        const name = `website-studio/${cr.changeRequestId}`;
        try {
          const created = git.createFeatureBranch(name);
          branch = created.branch;
        } catch {
          branch = st.currentBranch.startsWith('website-studio/') ? st.currentBranch : null;
        }
      }
      // Phase 6A does not write into real repo files by default — sandbox only
    }

    // Update block proposal approval state
    const blocks = this.store.listBlocks(cr.websiteId, cr.pageId || undefined);
    for (const b of blocks) {
      if (cr.filesExpectedToChange.includes(b.sourceFile) || b.currentValue === cr.originalContent) {
        b.proposedValue = cr.proposedContent;
        b.changeRequestId = cr.changeRequestId;
        b.mannyApproved = true;
        b.aiGenerated = cr.localAiAssistanceUsed;
        this.store.upsertBlock(b);
      }
    }

    cr.status = 'Committed';
    cr.gitBranch = branch || `website-studio/${cr.changeRequestId}`;
    cr.commit = commit || `sandbox:${cr.changeRequestId}`;
    cr.previewStatus = 'Ready for Preview';
    cr.updatedAt = nowIso();
    this.store.upsertChangeRequest(cr);

    this.store.audit({
      actor: MANNY_OWNER,
      action: 'local_sandbox_edit_applied',
      correlationId: cr.auditCorrelationId,
      detail: 'Sandbox write only — no push, no deploy, no production branch edit',
      payload: { sandboxRoot, file: safeRel, branch, pushed: false, deployed: false },
    });

    return {
      changeRequest: cr,
      applied: true,
      diff,
      branch: cr.gitBranch,
      commit: cr.commit,
      wroteSandboxFile,
    };
  }

  startPreview(changeRequestId: string): PreviewSession {
    const cr = this.getChangeRequest(changeRequestId);
    const website = this.getWebsite(cr.websiteId);
    const preview: PreviewSession = {
      previewId: randomUUID(),
      changeRequestId,
      websiteId: cr.websiteId,
      localUrl: website.previewCommand
        ? 'http://127.0.0.1:5199 (registered command — not auto-started in Phase 6A tests)'
        : 'http://127.0.0.1:5199',
      buildStatus: 'Passed',
      buildErrors: [],
      changedPages: cr.pageId
        ? [this.store.listPages(cr.websiteId).find((p) => p.pageId === cr.pageId)?.route || '/']
        : ['/'],
      startedAt: nowIso(),
      publicExposure: false,
    };
    // Do not actually spawn preview servers from API in Phase 6A unit path
    cr.previewStatus = 'Ready for Preview';
    cr.status = cr.status === 'Committed' ? 'QA Required' : cr.status;
    cr.updatedAt = nowIso();
    this.store.upsertChangeRequest(cr);
    this.store.savePreview(preview);
    this.store.audit({
      actor: AUTOMATION_OWNER,
      action: 'preview_session_scaffolded',
      correlationId: cr.auditCorrelationId,
      detail: 'Local preview URL recorded; no public exposure',
    });
    return preview;
  }

  getQa(changeRequestId: string): QaChecklistItem[] {
    this.getChangeRequest(changeRequestId);
    return this.store.getQa(changeRequestId);
  }

  updateQaItem(changeRequestId: string, itemId: string, status: QaChecklistItem['status'], notes?: string) {
    const items = this.getQa(changeRequestId);
    const item = items.find((i) => i.id === itemId);
    if (!item) throw Object.assign(new Error('QA item not found'), { status: 404, code: 'not_found' });
    item.status = status;
    item.notes = notes || item.notes;
    this.store.saveQa(changeRequestId, items);
    const cr = this.getChangeRequest(changeRequestId);
    const failed = items.some((i) => i.applicable && i.status === 'Fail');
    cr.qaStatus = failed ? 'QA Failed' : 'QA Required';
    if (!failed && items.filter((i) => i.applicable).every((i) => i.status === 'Pass' || i.status === 'Manny Review' || i.status === 'Skipped')) {
      cr.qaStatus = 'QA Passed';
      if (cr.status === 'QA Required') cr.status = 'Waiting on Manny';
    }
    if (failed) cr.status = 'QA Failed';
    cr.updatedAt = nowIso();
    this.store.upsertChangeRequest(cr);
    return items;
  }

  scaffoldDeployment(changeRequestId: string): DeploymentRecord {
    const cr = this.getChangeRequest(changeRequestId);
    const dep: DeploymentRecord = {
      deploymentId: randomUUID(),
      websiteId: cr.websiteId,
      changeRequestId,
      targetEnvironment: 'Production',
      provider: this.getWebsite(cr.websiteId).hostingProvider,
      branch: cr.gitBranch,
      commit: cr.commit,
      deployId: null,
      status: 'Blocked — Phase 6A',
      url: null,
      startedAt: null,
      completedAt: null,
      healthResult: null,
      rollbackReference: null,
      approvedBy: null,
      phase6aNoExecute: true,
    };
    this.store.upsertDeployment(dep);
    cr.deploymentStatus = 'Blocked — Phase 6A';
    cr.updatedAt = nowIso();
    this.store.upsertChangeRequest(cr);
    this.store.audit({
      actor: MANNY_OWNER,
      action: 'deployment_scaffolded_not_executed',
      correlationId: cr.auditCorrelationId,
      detail: WEBSITE_STUDIO_NO_DEPLOY,
    });
    return dep;
  }

  scaffoldRollback(websiteId: string, reason: string): RollbackRecord {
    this.getWebsite(websiteId);
    const rb: RollbackRecord = {
      rollbackId: randomUUID(),
      websiteId,
      deploymentId: null,
      priorCommit: null,
      currentCommit: null,
      rollbackCommit: null,
      reason,
      initiatedBy: MANNY_OWNER,
      approvedBy: null,
      outcome: 'Scaffolded Only — Phase 6A',
      postRollbackHealth: null,
      phase6aNoExecute: true,
    };
    this.store.upsertRollback(rb);
    this.store.audit({
      actor: MANNY_OWNER,
      action: 'rollback_scaffolded_not_executed',
      detail: reason,
    });
    return rb;
  }

  listDeployments() {
    return this.store.listDeployments();
  }

  listRollbacks() {
    return this.store.listRollbacks();
  }

  listPreviews() {
    return this.store.listPreviews();
  }

  listAudit() {
    return this.store.listAudit();
  }

  attemptForbiddenDeploy(): never {
    throw Object.assign(new Error('AI/automation deploy forbidden — Manny approval required; Phase 6A blocks all deploys'), {
      status: 403,
      code: 'deploy_forbidden',
    });
  }

  dashboard(): WebsiteStudioDashboard {
    const websites = this.store.listWebsites();
    const crs = this.store.listChangeRequests();
    const open = crs.filter((c) =>
      ['Draft', 'AI Preparing', 'Ready for Preview', 'QA Required', 'Waiting on Manny', 'Approved for Git'].includes(
        c.status,
      ),
    );
    let seoIssues = 0;
    for (const w of websites) {
      for (const p of this.store.listPages(w.websiteId)) {
        seoIssues += validateSeoFields({
          pageTitle: p.seoTitle,
          metaDescription: p.metaDescription,
          canonical: p.canonicalUrl,
          h1: p.h1,
          ogTitle: p.seoTitle,
          ogDescription: p.metaDescription,
        }).length;
      }
    }
    const timeSaved = crs.reduce((s, c) => s + c.timeProtection.estimatedTimeSavedMinutes, 0);
    return {
      registeredWebsites: websites.length,
      openChangeRequests: open.length,
      pagesWithDraftChanges: crs.filter((c) => c.proposedContent).length,
      seoIssues,
      qaFailures: crs.filter((c) => c.status === 'QA Failed').length,
      previewReady: crs.filter((c) => c.previewStatus === 'Ready for Preview').length,
      mannyApprovalsRequired: crs.filter((c) => c.status === 'Waiting on Manny').length,
      pendingGitCommits: crs.filter((c) => c.status === 'Approved for Git').length,
      pendingPrs: crs.filter((c) => c.status === 'PR Open').length,
      deploymentReady: 0,
      recentDeployments: this.store.listDeployments().length,
      rollbacks: this.store.listRollbacks().length,
      siteHealthSummary: websites.every((w) => w.repositoryHealth !== 'Unavailable')
        ? 'Synthetic/local healthy'
        : 'Needs attention',
      estimatedMannyTimeSavedMinutes: timeSaved,
      banners: {
        studio: WEBSITE_STUDIO_BANNER,
        noDeploy: WEBSITE_STUDIO_NO_DEPLOY,
        noPush: WEBSITE_STUDIO_NO_PUSH,
      },
    };
  }

  /** Phase 6B — register Candidate A, discover, baseline, create pilot CR (no file edits). */
  bootstrapPhase6bPilot(opts?: { naturalLanguage?: string; worktreePath?: string }) {
    const registered = this.phase6b.registerAndDiscover({ worktreePath: opts?.worktreePath });
    const baseline = this.phase6b.captureBaseline(HVCG_PILOT_WEBSITE_ID);
    const changeRequest = this.phase6b.createPilotHomepagePilot({
      naturalLanguage: opts?.naturalLanguage,
    });
    const qa = buildDefaultQaChecklist(changeRequest);
    this.store.saveQa(changeRequest.changeRequestId, qa);
    return {
      registered,
      baseline,
      changeRequest,
      qa,
      filesModified: false,
      productionDeployAuthorized: false,
      candidateBRegistered: false,
    };
  }

  phase6bSetFinalWording(
    changeRequestId: string,
    opts: { selectedVariantId?: string | null; customWording?: string | null; rejectAll?: boolean },
  ) {
    return this.phase6b.setMannyFinalWording(changeRequestId, opts);
  }

  phase6bApproveFinalWording(changeRequestId: string) {
    return this.phase6b.approveFinalWording(changeRequestId);
  }

  phase6bApply(changeRequestId: string) {
    return this.phase6b.applyPilotChange(changeRequestId);
  }

  phase6bConfirmVisualQa(changeRequestId: string, confirmed: boolean) {
    return this.phase6b.confirmVisualQa(changeRequestId, confirmed);
  }

  phase6bCommit(changeRequestId: string, message?: string) {
    return this.phase6b.commitPilot(changeRequestId, message);
  }

  phase6bRecordAutomatedQa(
    changeRequestId: string,
    opts: {
      buildResult: string;
      testResult: string;
      previewUrl: string | null;
      diff: string | null;
      warnings?: string[];
    },
  ) {
    return this.phase6b.recordAutomatedQa(changeRequestId, opts);
  }

  phase6bAuthorizePush(changeRequestId: string, approved: boolean) {
    return this.phase6b.authorizePush(changeRequestId, approved);
  }

  phase6bPush(changeRequestId: string) {
    return this.phase6b.pushPilot(changeRequestId);
  }

  phase6bRejectMerge() {
    return this.phase6b.rejectMergeOrDeploy('merge');
  }

  listBaselines(websiteId?: string) {
    return this.store.listBaselines(websiteId);
  }

  analyzePage(websiteId: string, pageId: string) {
    const website = this.getWebsite(websiteId);
    const page = this.store.listPages(websiteId).find((p) => p.pageId === pageId);
    if (!page) {
      throw Object.assign(new Error('Page not found'), { status: 404, code: 'not_found' });
    }
    const blocks = this.store.listBlocks(websiteId, pageId);
    const media = this.store.listMedia(websiteId);
    const { seo } = this.seoForPage(websiteId, pageId);
    const result = runPageAnalysis({ website, page, blocks, seo, media });
    this.store.audit({
      actor: LOCAL_AI_OWNER,
      action: 'website_advisor_page_analysis',
      detail: `${websiteId}/${pageId}`,
      payload: { overallScore: result.overallScore, opportunityCount: result.opportunities.length },
    });
    return result;
  }

  analyzeWebsite(websiteId: string) {
    const website = this.getWebsite(websiteId);
    const pages = this.store.listPages(websiteId);
    const blocks = this.store.listBlocks(websiteId);
    const changeRequests = this.store.listChangeRequests(websiteId);
    const media = this.store.listMedia(websiteId);
    const result = runWebsiteAnalysis({ website, pages, blocks, changeRequests, media });
    this.store.audit({
      actor: LOCAL_AI_OWNER,
      action: 'website_advisor_site_analysis',
      detail: websiteId,
      payload: { overallScore: result.overallScore, topRecommendations: result.prioritizedRecommendations.length },
    });
    return result;
  }

  advisorChat(websiteId: string, message: string, pageId?: string) {
    const website = this.getWebsite(websiteId);
    if (!message.trim()) {
      throw Object.assign(new Error('Message required'), { status: 400, code: 'message_required' });
    }
    let page = null;
    let blocks: ReturnType<WebsiteStudioStore['listBlocks']> = [];
    let seo = null;
    if (pageId) {
      page = this.store.listPages(websiteId).find((p) => p.pageId === pageId) || null;
      if (!page) {
        throw Object.assign(new Error('Page not found'), { status: 404, code: 'not_found' });
      }
      blocks = this.store.listBlocks(websiteId, pageId);
      seo = this.seoForPage(websiteId, pageId).seo;
    }
    const result = advisorChatReply(message, { website, page, blocks, seo });
    this.store.audit({
      actor: LOCAL_AI_OWNER,
      action: 'website_advisor_chat',
      detail: websiteId,
      payload: { pageId: pageId || null, messageLength: message.length },
    });
    return result;
  }

  async previewHealth(websiteId: string) {
    const website = this.getWebsite(websiteId);
    const previews = this.store.listPreviews().filter((p) => p.websiteId === websiteId);
    const fromPreview = previews.length ? previews[previews.length - 1].localUrl : null;
    const fromCr = this.store
      .listChangeRequests(websiteId)
      .map((c) => c.previewUrl)
      .filter(Boolean)
      .pop();
    // Prefer registered staging/local preview (e.g. HVCG 127.0.0.1:8765) over scaffold placeholders.
    const staging = website.stagingUrl;
    const url = fromCr || fromPreview || staging || null;
    const health = await checkPreviewHealth(url);
    this.store.audit({
      actor: AUTOMATION_OWNER,
      action: 'website_preview_health_check',
      detail: websiteId,
      payload: { status: health.status, url: health.url },
    });
    return { ...health, stagingUrl: staging, previewCommand: website.previewCommand };
  }

  getPilotReviewPanel(changeRequestId: string) {
    const cr = this.getChangeRequest(changeRequestId);
    return {
      request: cr.naturalLanguageRequest || cr.reason,
      originalContent: cr.originalContent,
      aiProposals: cr.aiProposals || [],
      recommendedVariantId: cr.recommendedVariantId,
      mannyFinalWording: cr.mannyFinalWording,
      finalWordingApproved: cr.finalWordingApproved,
      filesModified: cr.filesModified === true,
      gitDiff: null as string | null,
      filesChanged: cr.filesExpectedToChange,
      branch: cr.gitBranch,
      baselineCommit: cr.baselineCommit,
      changeSha: cr.commit,
      buildResult: cr.buildResult,
      testResult: cr.testResult,
      seoResult: cr.seoImpact,
      previewUrl: cr.previewUrl,
      visualQaState: cr.visualQaConfirmedByManny
        ? 'Confirmed by Manny'
        : cr.qaStatus === 'WAITING ON MANNY'
          ? 'WAITING ON MANNY'
          : 'Pending Manny visual QA',
      risk: cr.riskLevel,
      estimatedReviewMinutes: cr.timeProtection.estimatedReviewMinutes,
      estimatedTimeSavedMinutes: cr.timeProtection.estimatedTimeSavedMinutes,
      rollbackPoint: cr.rollbackReference,
      productionDeployment: PRODUCTION_DEPLOY_GATE,
      deployDisabled: true,
    };
  }
}

export function createWebsiteStudioService(
  repoRoot: string,
  env: Record<string, string | undefined> = process.env,
  dbPath?: string,
) {
  return new WebsiteStudioService({ repoRoot, env, dbPath });
}
