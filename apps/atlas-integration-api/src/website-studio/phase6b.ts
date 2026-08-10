/**
 * Phase 6B — HVCG real-repository pilot helpers.
 * Candidate A only. No Production deploy. No main checkout edits.
 */

import { createHash, randomUUID } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import {
  AUTOMATION_OWNER,
  HVCG_PILOT_BRANCH,
  HVCG_PILOT_WEBSITE_ID,
  LOCAL_AI_OWNER,
  MANNY_OWNER,
  PRODUCTION_DEPLOY_GATE,
  WEBSITE_STUDIO_PHASE6B_BANNER,
  buildHeadlinePilotProposals,
  classifyWebsiteChange,
  hashContent,
  newBaselineId,
  newChangeRequestId,
  type ContentBlockRecord,
  type FormInventoryRecord,
  type MediaAssetRecord,
  type WebsiteChangeRequest,
  type WebsitePageRecord,
  type WebsiteProductionBaseline,
  type WebsiteRegistryRecord,
} from '@hvcg/atlas-integration-core';
import { discoverLocalRepository } from './discovery.ts';
import { WebsiteGitAdapter } from './gitAdapter.ts';
import type { WebsiteStudioStore } from './store.ts';

export const HVCG_REPO_PATH = '/Volumes/MacMiniPro2TB/Autonomous Marketing';
export const HVCG_SITE_ROOT = '/Volumes/MacMiniPro2TB/Autonomous Marketing/website';
export const HVCG_WORKTREE_PATH = '/Volumes/MacMiniPro2TB/.worktrees/hvcg-website-studio-pilot';
export const HVCG_REMOTE = 'https://github.com/mblv89117/hvcg-atlas-autonomous-marketing.git';
export const HVCG_PRODUCTION_URL = 'https://www.highvaluecapitalgroup.com/';
export const HVCG_PRODUCTION_BRANCH = 'main';

const ALLOWED_PREVIEW = ['npm', 'run', 'preview'] as const;
const ALLOWED_SMOKE = ['npm', 'run', 'smoke'] as const;
const ALLOWED_VALIDATE = ['npm', 'run', 'validate:eva'] as const;

const CURRENT_H1 =
  'Find out what is preventing your business from growing, qualifying for capital, or becoming more valuable.';

const PILOT_FILES = [
  'website/scripts/generate_pages.py',
  'website/staging/index.html',
  'website/preview/index.html',
] as const;

function nowIso() {
  return new Date().toISOString();
}

function allowedRoots(): string[] {
  const roots = [
    '/Volumes/MacMiniPro2TB',
    resolve(tmpdir()),
    '/tmp',
    '/private/tmp',
    '/var/folders',
  ];
  const extra = (process.env.WEBSITE_STUDIO_ALLOWED_ROOT || '').trim();
  if (extra) roots.push(resolve(extra));
  return roots;
}

function assertAllowedRepoPath(candidate: string) {
  const c = resolve(candidate);
  const ok = allowedRoots().some((root) => c === root || c.startsWith(root + '/'));
  if (!ok) {
    throw Object.assign(new Error('Repository path not in allow-listed roots'), {
      status: 403,
      code: 'path_not_allowed',
    });
  }
  // Never allow writing to Production main checkout via apply path checks elsewhere
  return c;
}

function assertPathUnder(root: string, candidate: string) {
  const r = resolve(root);
  const c = resolve(candidate);
  if (c !== r && !c.startsWith(r + '/')) {
    throw Object.assign(new Error('Path escapes allowed repository root'), {
      status: 403,
      code: 'path_traversal_blocked',
    });
  }
}

function fingerprintDeployConfig(siteRoot: string): string {
  const names = [
    'AZURE_SWA_DEPLOYMENT.md',
    'DEPLOYMENT.md',
    'GODADDY_CUTOVER_RUNBOOK.md',
    'package.json',
  ];
  const parts: string[] = [];
  for (const n of names) {
    const p = join(siteRoot, n);
    if (existsSync(p)) {
      parts.push(`${n}:${hashContent(readFileSync(p, 'utf8'))}`);
    }
  }
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 24);
}

function extractH1(html: string): string | null {
  const m = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  if (!m) return null;
  return m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function listHtmlPages(stagingDir: string): string[] {
  const out: string[] = [];
  const stack = [stagingDir];
  while (stack.length) {
    const dir = stack.pop()!;
    let entries: string[] = [];
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of entries) {
      if (name === 'node_modules' || name === '.git') continue;
      const full = join(dir, name);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) stack.push(full);
      else if (/\.html?$/i.test(name)) out.push(full.replace(stagingDir + '/', ''));
    }
  }
  return out.slice(0, 200);
}

export function buildHvcgRegistryRecord(opts: {
  worktreePath: string;
  baselineCommit: string;
}): WebsiteRegistryRecord {
  const now = nowIso();
  return {
    websiteId: HVCG_PILOT_WEBSITE_ID,
    websiteName: 'High Value Capital Group',
    businessEntity: 'High Value Capital Group',
    productionUrl: HVCG_PRODUCTION_URL,
    stagingUrl: 'http://127.0.0.1:8765/ (local preview only)',
    repositoryUrl: HVCG_REMOTE,
    localRepositoryPath: opts.worktreePath,
    framework: 'Static HTML',
    hostingProvider: 'Azure Static Web Apps',
    productionBranch: HVCG_PRODUCTION_BRANCH,
    defaultDevelopmentBranch: HVCG_PILOT_BRANCH,
    buildCommand: 'npm run generate (python3 scripts/generate_pages.py)',
    testCommand: 'npm run smoke && npm run validate:eva',
    previewCommand: 'npm run preview',
    deploymentMethod: 'Azure SWA (inspect only in Phase 6B — no deploy)',
    contentArchitecture: 'Static elite pack: website/staging + generate_pages.py',
    seoArchitecture: 'Per-page title/meta + JSON-LD in HTML; robots/sitemap in staging',
    analyticsProvider: 'Inspected via markup references only',
    formProvider: 'EVA / contact forms (high-risk — not editable in Tier A pilot)',
    status: 'Discovered',
    lastSuccessfulDeployment: null,
    lastRollbackPoint: opts.baselineCommit,
    openChangeRequestCount: 0,
    repositoryHealth: 'Healthy',
    notes: `${WEBSITE_STUDIO_PHASE6B_BANNER}; Candidate A only; site root website/; worktree ${opts.worktreePath}`,
    synthetic: false,
    mannyConfirmedRegistration: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function inventoryHvcgFromWorktree(
  worktreePath: string,
  websiteId: string,
): {
  pages: WebsitePageRecord[];
  blocks: ContentBlockRecord[];
  media: MediaAssetRecord[];
  forms: FormInventoryRecord[];
  currentH1: string;
} {
  const staging = join(worktreePath, 'website', 'staging');
  const indexPath = join(staging, 'index.html');
  const html = readFileSync(indexPath, 'utf8');
  const h1 = extractH1(html) || CURRENT_H1;
  const titleMatch = /<title>([^<]*)<\/title>/i.exec(html);
  const metaMatch = /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i.exec(html);
  const now = nowIso();
  const pageFiles = listHtmlPages(staging);
  const pages: WebsitePageRecord[] = pageFiles.map((rel, i) => {
    const isHome = rel === 'index.html' || rel === './index.html';
    return {
      pageId: isHome ? 'pg_hvcg_home_real' : `pg_hvcg_${hashContent(rel)}`,
      websiteId,
      route: isHome ? '/' : `/${rel.replace(/index\.html$/i, '').replace(/\.html$/i, '')}`,
      pageTitle: isHome ? 'Home | High Value Capital Group' : rel,
      pageType: isHome ? 'home' : 'page',
      sourceFile: `website/staging/${rel}`,
      layout: 'website/staging shared chrome',
      status: 'Published',
      lastModified: now,
      seoTitle: isHome ? titleMatch?.[1] || null : null,
      metaDescription: isHome ? metaMatch?.[1] || null : null,
      canonicalUrl: isHome ? HVCG_PRODUCTION_URL : null,
      h1: isHome ? h1 : null,
      majorSections: isHome ? ['Hero', 'Services', 'Trust', 'CTA'] : [],
      ctaLabels: isHome ? ['Enterprise Value Assessment', 'Book appointment'] : [],
      formsPresent: [],
      imagesUsed: [],
      schemaMarkupPresent: isHome && html.includes('application/ld+json'),
      structuredDataType: isHome ? 'Organization' : null,
      publishState: 'Baseline captured — not edited',
    };
  });

  const blocks: ContentBlockRecord[] = [
    {
      blockId: 'blk_hvcg_home_h1',
      websiteId,
      pageId: 'pg_hvcg_home_real',
      blockType: 'headline',
      sourceFile: 'website/scripts/generate_pages.py',
      sourceLocation: 'homepage H1 template + staging/preview mirrors',
      currentValue: h1,
      proposedValue: null,
      characterCount: h1.length,
      lastModified: now,
      changeRequestId: null,
      aiGenerated: false,
      mannyApproved: false,
      validationStatus: 'Valid',
    },
  ];

  const mediaDir = join(staging, 'assets');
  const media: MediaAssetRecord[] = [];
  if (existsSync(mediaDir)) {
    for (const name of readdirSync(mediaDir).slice(0, 50)) {
      if (!/\.(png|jpe?g|gif|svg|webp)$/i.test(name)) continue;
      media.push({
        mediaId: `med_${hashContent(name)}`,
        websiteId,
        filename: name,
        fileType: name.split('.').pop() || 'unknown',
        dimensions: null,
        sizeBytes: null,
        altText: null,
        pagesUsed: ['/'],
        unused: false,
        proposedReplacement: null,
        compressionRecommendation: null,
        duplicateOf: null,
        missingAltText: true,
      });
    }
  }

  const forms: FormInventoryRecord[] = [
    {
      formId: 'form_hvcg_eva',
      websiteId,
      formName: 'Enterprise Value Assessment',
      pageId: null,
      sourceFile: 'website/staging/assessments/eva/',
      fields: [],
      requiredFields: [],
      submissionEndpoint: '(high-risk — inspect only)',
      successBehavior: 'Confirmation page',
      spamProtection: null,
      analyticsEvent: null,
      currentIntegration: 'Atlas / CRM intake (not editable in Tier A)',
      status: 'Inventory only — endpoint changes forbidden in Phase 6B pilot',
      endpointIsHighRisk: true,
    },
  ];

  return { pages, blocks, media, forms, currentH1: h1 };
}

export class Phase6bPilotController {
  constructor(private store: WebsiteStudioStore) {}

  registerAndDiscover(opts?: { worktreePath?: string }) {
    const worktree = assertAllowedRepoPath(opts?.worktreePath || HVCG_WORKTREE_PATH);
    if (!existsSync(worktree)) {
      throw Object.assign(new Error(`Pilot worktree missing: ${worktree}`), {
        status: 404,
        code: 'worktree_missing',
      });
    }
    const git = new WebsiteGitAdapter(worktree);
    const st = git.status();
    if (st.currentBranch !== HVCG_PILOT_BRANCH) {
      throw Object.assign(
        new Error(`Expected branch ${HVCG_PILOT_BRANCH}, found ${st.currentBranch}`),
        { status: 409, code: 'wrong_pilot_branch' },
      );
    }
    if (String(st.currentBranch) === String(HVCG_PRODUCTION_BRANCH)) {
      throw Object.assign(new Error('Refusing to operate on production branch'), {
        status: 403,
        code: 'production_branch_edit_forbidden',
      });
    }

    // Discover repository root (worktree) and site root (website/)
    const repoDiscovery = discoverLocalRepository(worktree);
    const siteDiscovery = discoverLocalRepository(join(worktree, 'website'));
    siteDiscovery.websiteId = HVCG_PILOT_WEBSITE_ID;
    siteDiscovery.notes.push(
      'Phase 6B Candidate A — read-only discovery; production main checkout not modified',
    );
    this.store.saveDiscovery(repoDiscovery);
    this.store.saveDiscovery(siteDiscovery);

    const website = buildHvcgRegistryRecord({
      worktreePath: worktree,
      baselineCommit: st.head,
    });
    this.store.upsertWebsite(website);

    const inv = inventoryHvcgFromWorktree(worktree, website.websiteId);
    for (const p of inv.pages) this.store.upsertPage(p);
    for (const b of inv.blocks) this.store.upsertBlock(b);
    for (const m of inv.media) this.store.upsertMedia(m);
    for (const f of inv.forms) this.store.upsertForm(f);

    this.store.audit({
      actor: MANNY_OWNER,
      action: 'phase6b_hvcg_registered',
      detail: website.websiteId,
      payload: {
        remote: HVCG_REMOTE,
        worktree,
        branch: st.currentBranch,
        baseline: st.head,
        candidateBRegistered: false,
      },
    });

    return {
      website,
      repoDiscovery,
      siteDiscovery,
      inventory: {
        pages: inv.pages.length,
        blocks: inv.blocks.length,
        media: inv.media.length,
        forms: inv.forms.length,
        currentH1: inv.currentH1,
      },
      git: st,
    };
  }

  captureBaseline(websiteId = HVCG_PILOT_WEBSITE_ID): WebsiteProductionBaseline {
    const website = this.store.getWebsite(websiteId);
    if (!website) {
      throw Object.assign(new Error('Website not registered'), { status: 404, code: 'not_found' });
    }
    const worktree = website.localRepositoryPath || HVCG_WORKTREE_PATH;
    const git = new WebsiteGitAdapter(worktree);
    const st = git.status();
    const siteRoot = join(worktree, 'website');
    const baseline: WebsiteProductionBaseline = {
      baselineId: newBaselineId(),
      websiteId,
      productionBranch: HVCG_PRODUCTION_BRANCH,
      baselineCommit: st.head,
      pageInventoryCount: this.store.listPages(websiteId).length,
      seoInventoryCount: this.store.listPages(websiteId).filter((p) => p.seoTitle).length,
      formInventoryCount: this.store.listForms(websiteId).length,
      mediaInventoryCount: this.store.listMedia(websiteId).length,
      deploymentConfigFingerprint: fingerprintDeployConfig(siteRoot),
      buildResult: 'Not run at baseline capture — Phase 6B defers build to post-approval QA',
      capturedAt: nowIso(),
      worktreePath: worktree,
      pilotBranch: HVCG_PILOT_BRANCH,
      notes: [
        WEBSITE_STUDIO_PHASE6B_BANNER,
        'No Production tag created',
        'Baseline for diff/rollback comparison only',
      ],
    };
    this.store.upsertBaseline(baseline);
    website.lastRollbackPoint = baseline.baselineCommit;
    website.updatedAt = nowIso();
    this.store.upsertWebsite(website);
    this.store.audit({
      actor: AUTOMATION_OWNER,
      action: 'phase6b_baseline_captured',
      detail: baseline.baselineId,
      payload: { commit: baseline.baselineCommit, fingerprint: baseline.deploymentConfigFingerprint },
    });
    return baseline;
  }

  createPilotHomepagePilot(opts?: { naturalLanguage?: string }): WebsiteChangeRequest {
    const website = this.store.getWebsite(HVCG_PILOT_WEBSITE_ID);
    if (!website) {
      throw Object.assign(new Error('HVCG not registered'), { status: 404, code: 'not_found' });
    }
    const block = this.store.listBlocks(HVCG_PILOT_WEBSITE_ID).find((b) => b.blockType === 'headline');
    const original = block?.currentValue || CURRENT_H1;
    const nl =
      opts?.naturalLanguage ||
      'Update the HVCG homepage headline to emphasize strategic capital advisory and business growth.';
    const classified = classifyWebsiteChange({
      requestType: 'natural_language',
      naturalLanguage: nl,
      files: [...PILOT_FILES],
    });
    if (!classified.tier.startsWith('Tier A')) {
      throw Object.assign(new Error('Pilot must remain Tier A content-only'), {
        status: 400,
        code: 'pilot_not_tier_a',
      });
    }
    const { variants, recommendedVariantId } = buildHeadlinePilotProposals(original);
    const recommended = variants.find((v) => v.variantId === recommendedVariantId)!;
    const baseline = this.store.latestBaseline(HVCG_PILOT_WEBSITE_ID);
    const now = nowIso();
    const cr: WebsiteChangeRequest = {
      changeRequestId: newChangeRequestId(),
      websiteId: HVCG_PILOT_WEBSITE_ID,
      pageId: 'pg_hvcg_home_real',
      requestType: 'natural_language',
      tier: 'Tier A — Safe Content Change',
      requestedBy: MANNY_OWNER,
      originalContent: original,
      proposedContent: recommended.text,
      reason: nl,
      localAiAssistanceUsed: true,
      aiOperation: 'improve_headline',
      filesExpectedToChange: [...PILOT_FILES],
      riskLevel: 'Low',
      seoImpact:
        'H1 wording only — title/meta/canonical/JSON-LD unchanged unless separately requested',
      formImpact: null,
      analyticsImpact: 'Analytics markup must remain unchanged',
      securityImpact: null,
      buildRequired: true,
      testsRequired: true,
      previewStatus: null,
      qaStatus: 'QA Required',
      gitBranch: HVCG_PILOT_BRANCH,
      commit: null,
      prUrl: null,
      deploymentStatus: PRODUCTION_DEPLOY_GATE,
      rollbackReference: baseline?.baselineCommit || null,
      mannyApproval: null,
      productionApproval: false,
      status: 'Waiting on Manny',
      auditCorrelationId: randomUUID(),
      naturalLanguageRequest: nl,
      sideEffects: [
        'May affect homepage hero emphasis',
        'Does not change forms, APIs, EVA, CRM, DNS, secrets, or deploy config',
      ],
      timeProtection: {
        estimatedReviewMinutes: 4,
        estimatedTimeSavedMinutes: 35,
        recommendedAction:
          'Select/edit one of 3 AI variants — no files will change until exact final wording is approved',
      },
      createdAt: now,
      updatedAt: now,
      phase6aNoPush: true,
      phase6aNoDeploy: true,
      phase6bPilot: true,
      aiProposals: variants,
      recommendedVariantId,
      selectedVariantId: null,
      mannyFinalWording: null,
      finalWordingApproved: false,
      filesModified: false,
      baselineCommit: baseline?.baselineCommit || null,
      worktreePath: website.localRepositoryPath,
      previewUrl: null,
      buildResult: null,
      testResult: null,
      visualQaConfirmedByManny: false,
      mannyPushApproved: false,
      productionDeploymentAuthorized: false,
    };
    this.store.upsertChangeRequest(cr);
    this.store.audit({
      actor: LOCAL_AI_OWNER,
      action: 'phase6b_pilot_cr_created',
      correlationId: cr.auditCorrelationId,
      detail: '3 AI variants proposed — awaiting Manny final wording; no files modified',
      payload: {
        changeRequestId: cr.changeRequestId,
        recommendedVariantId,
        filesModified: false,
      },
    });
    return cr;
  }

  /**
   * Manny selects a variant, edits, combines, rejects all, or supplies custom wording.
   * Does NOT modify website files.
   */
  setMannyFinalWording(
    changeRequestId: string,
    opts: {
      selectedVariantId?: string | null;
      customWording?: string | null;
      rejectAll?: boolean;
    },
  ): WebsiteChangeRequest {
    const cr = this.store.getChangeRequest(changeRequestId);
    if (!cr) {
      throw Object.assign(new Error('Change request not found'), { status: 404, code: 'not_found' });
    }
    if (opts.rejectAll) {
      cr.status = 'Rejected';
      cr.mannyApproval = false;
      cr.selectedVariantId = null;
      cr.mannyFinalWording = null;
      cr.finalWordingApproved = false;
      cr.updatedAt = nowIso();
      this.store.upsertChangeRequest(cr);
      this.store.audit({
        actor: MANNY_OWNER,
        action: 'phase6b_proposals_rejected',
        correlationId: cr.auditCorrelationId,
        detail: 'All AI proposals rejected — no files modified',
      });
      return cr;
    }
    let final = (opts.customWording || '').trim();
    if (!final && opts.selectedVariantId) {
      const v = (cr.aiProposals || []).find((x) => x.variantId === opts.selectedVariantId);
      if (!v) {
        throw Object.assign(new Error('Unknown variant'), { status: 400, code: 'unknown_variant' });
      }
      final = v.text;
      cr.selectedVariantId = v.variantId;
    }
    if (!final) {
      throw Object.assign(new Error('Final wording required (select, edit, or custom)'), {
        status: 400,
        code: 'final_wording_required',
      });
    }
    cr.mannyFinalWording = final;
    cr.proposedContent = final;
    cr.finalWordingApproved = false; // explicit approve step still required
    cr.status = 'Waiting on Manny';
    cr.updatedAt = nowIso();
    this.store.upsertChangeRequest(cr);
    this.store.audit({
      actor: MANNY_OWNER,
      action: 'phase6b_final_wording_staged',
      correlationId: cr.auditCorrelationId,
      detail: 'Final wording staged — not yet approved for file apply',
      payload: { length: final.length, selectedVariantId: cr.selectedVariantId },
    });
    return cr;
  }

  /**
   * Explicit approval of exact final wording. Still does not apply until applyPilotChange.
   */
  approveFinalWording(changeRequestId: string): WebsiteChangeRequest {
    const cr = this.store.getChangeRequest(changeRequestId);
    if (!cr?.mannyFinalWording) {
      throw Object.assign(new Error('Set final wording before approval'), {
        status: 400,
        code: 'final_wording_required',
      });
    }
    cr.finalWordingApproved = true;
    cr.mannyApproval = true;
    cr.status = 'Approved for Git';
    cr.updatedAt = nowIso();
    this.store.upsertChangeRequest(cr);
    this.store.audit({
      actor: MANNY_OWNER,
      action: 'phase6b_final_wording_approved',
      correlationId: cr.auditCorrelationId,
      detail: 'Exact final wording approved — ready for controlled pilot apply',
      payload: { wording: cr.mannyFinalWording, filesModified: false },
    });
    return cr;
  }

  applyPilotChange(changeRequestId: string): {
    changeRequest: WebsiteChangeRequest;
    diff: string;
    filesChanged: string[];
  } {
    const cr = this.store.getChangeRequest(changeRequestId);
    if (!cr) {
      throw Object.assign(new Error('Change request not found'), { status: 404, code: 'not_found' });
    }
    if (!cr.finalWordingApproved || !cr.mannyFinalWording) {
      throw Object.assign(new Error('Exact final wording must be approved before file apply'), {
        status: 403,
        code: 'final_wording_not_approved',
      });
    }
    if (!cr.tier.startsWith('Tier A')) {
      throw Object.assign(new Error('Only Tier A pilot apply allowed'), {
        status: 403,
        code: 'tier_blocked',
      });
    }
    const worktree = assertAllowedRepoPath(cr.worktreePath || HVCG_WORKTREE_PATH);
    // Never touch Production main checkout
    if (resolve(worktree) === resolve(HVCG_REPO_PATH)) {
      throw Object.assign(new Error('Refusing to edit Production main checkout'), {
        status: 403,
        code: 'main_checkout_forbidden',
      });
    }
    const git = new WebsiteGitAdapter(worktree);
    const st = git.status();
    if (st.currentBranch !== HVCG_PILOT_BRANCH) {
      throw Object.assign(new Error('Pilot branch required'), {
        status: 403,
        code: 'wrong_pilot_branch',
      });
    }
    if (!st.clean) {
      throw Object.assign(new Error('Pilot worktree dirty — refuse apply'), {
        status: 409,
        code: 'dirty_tree',
      });
    }
    const original = cr.originalContent || CURRENT_H1;
    const final = cr.mannyFinalWording;
    const changed: string[] = [];
    const diffs: string[] = [];
    for (const rel of PILOT_FILES) {
      const full = join(worktree, rel);
      assertPathUnder(worktree, full);
      if (!existsSync(full)) continue;
      const before = readFileSync(full, 'utf8');
      if (!before.includes(original)) {
        continue;
      }
      const after = before.split(original).join(final);
      if (after === before) continue;
      writeFileSync(full, after, 'utf8');
      changed.push(rel);
      diffs.push(`--- a/${rel}\n+++ b/${rel}\n- ${original}\n+ ${final}`);
    }
    if (!changed.length) {
      throw Object.assign(new Error('Original H1 not found in pilot files'), {
        status: 500,
        code: 'patch_miss',
      });
    }
    cr.filesModified = true;
    cr.filesExpectedToChange = changed;
    cr.status = 'Approved for Git';
    cr.previewStatus = 'Ready for Preview';
    cr.updatedAt = nowIso();
    this.store.upsertChangeRequest(cr);
    for (const b of this.store.listBlocks(cr.websiteId)) {
      if (b.blockId === 'blk_hvcg_home_h1') {
        b.proposedValue = final;
        b.currentValue = final;
        b.mannyApproved = true;
        b.aiGenerated = true;
        b.changeRequestId = cr.changeRequestId;
        this.store.upsertBlock(b);
      }
    }
    this.store.audit({
      actor: MANNY_OWNER,
      action: 'phase6b_pilot_files_applied',
      correlationId: cr.auditCorrelationId,
      detail: 'Controlled H1 replace in pilot worktree only',
      payload: { files: changed, pushed: false, deployed: false },
    });
    return { changeRequest: cr, diff: diffs.join('\n\n'), filesChanged: changed };
  }

  runAllowlistedCommand(
    worktreePath: string,
    kind: 'preview' | 'smoke' | 'validate',
  ): { ok: boolean; command: string[]; cwd: string; output: string; localUrl?: string } {
    const worktree = assertAllowedRepoPath(worktreePath);
    const cwd = join(worktree, 'website');
    assertPathUnder(worktree, cwd);
    const args =
      kind === 'preview'
        ? [...ALLOWED_PREVIEW]
        : kind === 'smoke'
          ? [...ALLOWED_SMOKE]
          : [...ALLOWED_VALIDATE];
    // Do not accept user-supplied shell strings
    try {
      if (kind === 'preview') {
        // Start preview detached briefly then leave URL recorded; caller manages lifecycle in live UI
        const child = spawn(args[0], args.slice(1), {
          cwd,
          detached: true,
          stdio: 'ignore',
        });
        child.unref();
        return {
          ok: true,
          command: [...args],
          cwd,
          output: `Started preview pid=${child.pid}`,
          localUrl: 'http://127.0.0.1:8765/',
        };
      }
      const output = execFileSync(args[0], args.slice(1), {
        cwd,
        encoding: 'utf8',
        timeout: 120_000,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      return { ok: true, command: [...args], cwd, output: String(output).slice(0, 4000) };
    } catch (err) {
      return {
        ok: false,
        command: [...args],
        cwd,
        output: err instanceof Error ? err.message : String(err),
      };
    }
  }

  commitPilot(changeRequestId: string, message?: string) {
    const cr = this.store.getChangeRequest(changeRequestId);
    if (!cr?.filesModified) {
      throw Object.assign(new Error('Apply approved change before commit'), {
        status: 400,
        code: 'not_applied',
      });
    }
    // Automated QA must pass; Manny visual QA may still be pending (WAITING ON MANNY)
    if (cr.buildResult === 'FAIL' || cr.testResult === 'FAIL') {
      throw Object.assign(new Error('Automated QA failed — refuse commit'), {
        status: 403,
        code: 'automated_qa_failed',
      });
    }
    const worktree = assertAllowedRepoPath(cr.worktreePath || HVCG_WORKTREE_PATH);
    const git = new WebsiteGitAdapter(worktree);
    const result = git.commitApproved(
      message ||
        `website-studio: HVCG homepage H1 pilot (Tier A) — ${cr.changeRequestId}`,
    );
    cr.commit = result.commit;
    cr.gitBranch = result.branch;
    cr.status = 'Committed';
    cr.phase6aNoPush = true;
    cr.visualQaConfirmedByManny = false;
    cr.qaStatus = 'WAITING ON MANNY';
    cr.updatedAt = nowIso();
    this.store.upsertChangeRequest(cr);
    this.store.audit({
      actor: MANNY_OWNER,
      action: 'phase6b_pilot_committed',
      correlationId: cr.auditCorrelationId,
      detail: result.commit,
      payload: {
        pushed: false,
        branch: result.branch,
        visualQa: 'WAITING ON MANNY',
        automatedQa: cr.testResult || cr.buildResult,
      },
    });
    return result;
  }

  recordAutomatedQa(
    changeRequestId: string,
    opts: {
      buildResult: string;
      testResult: string;
      previewUrl: string | null;
      diff: string | null;
      warnings?: string[];
    },
  ) {
    const cr = this.store.getChangeRequest(changeRequestId)!;
    cr.buildResult = opts.buildResult;
    cr.testResult = opts.testResult;
    cr.previewUrl = opts.previewUrl;
    cr.previewStatus = opts.previewUrl ? 'Ready for Preview' : cr.previewStatus;
    cr.qaStatus = 'WAITING ON MANNY';
    cr.visualQaConfirmedByManny = false;
    cr.updatedAt = nowIso();
    this.store.upsertChangeRequest(cr);
    this.store.audit({
      actor: AUTOMATION_OWNER,
      action: 'phase6b_automated_qa_recorded',
      correlationId: cr.auditCorrelationId,
      detail: opts.testResult,
      payload: {
        buildResult: opts.buildResult,
        testResult: opts.testResult,
        previewUrl: opts.previewUrl,
        visualQa: 'WAITING ON MANNY',
        warnings: opts.warnings || [],
        diffChars: opts.diff?.length || 0,
      },
    });
    return cr;
  }

  confirmVisualQa(changeRequestId: string, confirmed: boolean) {
    const cr = this.store.getChangeRequest(changeRequestId)!;
    cr.visualQaConfirmedByManny = confirmed;
    cr.qaStatus = confirmed ? 'QA Passed' : 'QA Required';
    cr.updatedAt = nowIso();
    this.store.upsertChangeRequest(cr);
    return cr;
  }

  authorizePush(changeRequestId: string, approved: boolean) {
    const cr = this.store.getChangeRequest(changeRequestId)!;
    if (!approved) {
      cr.mannyPushApproved = false;
      cr.phase6aNoPush = true;
    } else {
      if (cr.status !== 'Committed' || !cr.commit) {
        throw Object.assign(new Error('Commit required before push authorization'), {
          status: 400,
          code: 'commit_required',
        });
      }
      cr.mannyPushApproved = true;
      cr.phase6aNoPush = false;
    }
    cr.updatedAt = nowIso();
    this.store.upsertChangeRequest(cr);
    this.store.audit({
      actor: MANNY_OWNER,
      action: approved ? 'phase6b_push_authorized' : 'phase6b_push_denied',
      correlationId: cr.auditCorrelationId,
      detail: String(approved),
    });
    return cr;
  }

  pushPilot(changeRequestId: string) {
    const cr = this.store.getChangeRequest(changeRequestId)!;
    if (!cr.mannyPushApproved || cr.phase6aNoPush) {
      throw Object.assign(new Error('Manny push approval required'), {
        status: 403,
        code: 'push_not_authorized',
      });
    }
    const worktree = assertAllowedRepoPath(cr.worktreePath || HVCG_WORKTREE_PATH);
    const git = new WebsiteGitAdapter(worktree);
    const pushed = git.pushFeatureBranch();
    this.store.audit({
      actor: MANNY_OWNER,
      action: 'phase6b_feature_branch_pushed',
      correlationId: cr.auditCorrelationId,
      detail: pushed.remoteBranch,
      payload: { merge: false, deploy: false },
    });
    return pushed;
  }

  rejectMergeOrDeploy(action: 'merge' | 'deploy'): never {
    throw Object.assign(
      new Error(
        action === 'merge'
          ? 'Website merge forbidden in Phase 6B'
          : PRODUCTION_DEPLOY_GATE,
      ),
      { status: 403, code: action === 'merge' ? 'merge_forbidden' : 'deploy_forbidden' },
    );
  }
}

export { CURRENT_H1, PILOT_FILES };
