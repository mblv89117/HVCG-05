/**
 * Phase 6B-UX — owner approval / review workflow helpers.
 * Approves drafts only. Never publishes, merges, pushes, or deploys.
 */

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type {
  WebsiteChangeRequest,
  WebsitePageRecord,
  WebsiteRegistryRecord,
} from '@hvcg/atlas-integration-core';

export type OwnerFriendlyStatus =
  | 'Idea'
  | 'Draft'
  | 'Ready to Preview'
  | 'Waiting for Your Review'
  | 'Changes Requested'
  | 'Approved — Not Published'
  | 'Ready for Publishing Review'
  | 'Published'
  | 'Rejected'
  | 'Saved for Later';

export interface OwnerDeviceReviews {
  Desktop?: boolean;
  Tablet?: boolean;
  Mobile?: boolean;
}

export interface OwnerApprovalRecord {
  approvedBy: string;
  approvedAt: string;
  exactApprovedContent: string;
  contentFingerprint: string;
  websiteId: string;
  pageId: string | null;
  section: string;
  blockLabel: string;
  baselineCommit: string | null;
  pilotCommit: string | null;
  previewCommit: string | null;
  previewReviewed: boolean;
  deviceReviews: OwnerDeviceReviews;
  qaState: string | null;
  auditCorrelationId: string;
  productionImpact: 'NONE YET';
  published: false;
  invalidated?: boolean;
  invalidatedReason?: string | null;
}

export interface PreviewIdentityResult {
  ok: boolean;
  mismatches: string[];
  worktreePath: string | null;
  branch: string | null;
  headCommit: string | null;
  expectedCommit: string | null;
  expectedBranch: string | null;
  expectedContent: string | null;
  observedContent: string | null;
  contentFingerprintExpected: string | null;
  contentFingerprintObserved: string | null;
  previewHealthStatus: string;
  previewUrl: string | null;
}

export function fingerprintContent(text: string | null | undefined): string {
  return createHash('sha256')
    .update(String(text || '').trim())
    .digest('hex')
    .slice(0, 24);
}

export function ownerChangeTitle(cr: WebsiteChangeRequest): string {
  if (cr.phase6bPilot || cr.changeRequestId === 'wcr_96016971141f') return 'Homepage Headline';
  const reason = cr.naturalLanguageRequest || cr.reason || 'Website change';
  if (/headline|h1/i.test(reason)) return 'Homepage Headline';
  if (/cta/i.test(reason)) return 'Call-to-Action';
  if (/meta description/i.test(reason)) return 'SEO Meta Description';
  if (/faq/i.test(reason)) return 'FAQ Update';
  return reason.length > 48 ? `${reason.slice(0, 45)}…` : reason;
}

export function ownerFriendlyStatus(
  cr: WebsiteChangeRequest & Record<string, unknown>,
): OwnerFriendlyStatus {
  if (cr.savedForLater) return 'Saved for Later';
  if (cr.status === 'Rejected') return 'Rejected';
  if (cr.status === 'Deployed') return 'Published';
  const approval = cr.ownerApproval as OwnerApprovalRecord | undefined;
  if (approval?.approvedAt && !approval.invalidated) return 'Approved — Not Published';
  if (approval?.invalidated) return 'Changes Requested';
  if (
    cr.status === 'Committed' ||
    cr.status === 'Waiting on Manny' ||
    cr.qaStatus === 'WAITING ON MANNY'
  ) {
    return 'Waiting for Your Review';
  }
  if (cr.previewStatus === 'Ready for Preview' || cr.status === 'Ready for Preview') {
    return 'Ready to Preview';
  }
  if (cr.status === 'Draft' || cr.status === 'AI Preparing') return 'Draft';
  return 'Draft';
}

export function exactDraftContent(cr: WebsiteChangeRequest): string {
  return String(cr.mannyFinalWording || cr.proposedContent || '').trim();
}

export function whatWillChange(cr: WebsiteChangeRequest): {
  items: Array<{ page: string; section: string; field: string }>;
  summaryLines: string[];
  risk: string;
} {
  const title = ownerChangeTitle(cr);
  const items = [
    {
      page: 'Home',
      section: 'Hero',
      field: title.includes('Headline') ? 'Main Headline' : title,
    },
  ];
  const summaryLines = [
    '1 content change',
    cr.formImpact ? 'Forms may be affected' : 'No forms changed',
    'No navigation changed',
    'No integrations changed',
    /H1 wording only|unchanged|no negative/i.test(String(cr.seoImpact || 'H1 wording only'))
      ? 'No SEO metadata changed'
      : 'SEO metadata may be affected',
    cr.analyticsImpact && !/unchanged|remain/i.test(cr.analyticsImpact)
      ? 'Analytics may be affected'
      : 'No analytics changed',
  ];
  return { items, summaryLines, risk: cr.riskLevel || 'Low' };
}

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    timeout: 10_000,
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function extractH1(html: string): string | null {
  const m = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  if (!m) return null;
  return m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

export function readWorktreePageHtml(opts: {
  worktreePath: string;
  sourceFile?: string | null;
  mode: 'after' | 'before';
  baselineCommit?: string | null;
}): string {
  const worktree = resolve(opts.worktreePath);
  const rel =
    opts.sourceFile && opts.sourceFile.includes('staging/')
      ? opts.sourceFile.replace(/^website\//, '')
      : opts.sourceFile && /\.html$/i.test(opts.sourceFile)
        ? `staging/${opts.sourceFile.split('/').pop()}`
        : 'staging/index.html';
  const fullRel = rel.startsWith('website/') ? rel : `website/${rel}`;

  if (opts.mode === 'before') {
    const sha = opts.baselineCommit;
    if (!sha) {
      throw Object.assign(new Error('Baseline commit required for before preview'), {
        status: 400,
      });
    }
    return git(worktree, ['show', `${sha}:${fullRel}`]);
  }
  const abs = join(worktree, fullRel);
  if (!existsSync(abs)) {
    return readFileSync(join(worktree, 'website/staging/index.html'), 'utf8');
  }
  return readFileSync(abs, 'utf8');
}

export function injectPreviewBanner(html: string, bannerHtml: string): string {
  const bar = `<div id="atlas-ws-preview-banner" style="position:sticky;top:0;z-index:99999;background:#1a1a1a;color:#f5e6c8;padding:10px 14px;font:600 13px/1.4 system-ui,sans-serif;border-bottom:2px solid #b08d57;">${bannerHtml}</div>`;
  if (/<body[^>]*>/i.test(html)) return html.replace(/<body([^>]*)>/i, `<body$1>${bar}`);
  return bar + html;
}

export function verifyPreviewIdentity(opts: {
  cr: WebsiteChangeRequest;
  website: WebsiteRegistryRecord;
  previewHealthStatus: string;
  previewUrl: string | null;
}): PreviewIdentityResult {
  const cr = opts.cr;
  const mismatches: string[] = [];
  const worktree = cr.worktreePath || opts.website.localRepositoryPath;
  const expectedContent = exactDraftContent(cr);
  const expectedFp = fingerprintContent(expectedContent);
  let branch: string | null = null;
  let headCommit: string | null = null;
  let observedContent: string | null = null;

  if (opts.previewHealthStatus !== 'running') {
    mismatches.push('Preview server is not running');
  }
  if (!worktree || !existsSync(worktree)) {
    mismatches.push('Pilot worktree path missing');
  } else {
    try {
      branch = git(worktree, ['rev-parse', '--abbrev-ref', 'HEAD']);
      headCommit = git(worktree, ['rev-parse', 'HEAD']);
    } catch {
      mismatches.push('Unable to read git identity from pilot worktree');
    }
    try {
      const html = readWorktreePageHtml({
        worktreePath: worktree,
        sourceFile: 'website/staging/index.html',
        mode: 'after',
      });
      observedContent = extractH1(html);
    } catch {
      mismatches.push('Unable to read preview page content');
    }
  }

  if (cr.gitBranch && branch && branch !== cr.gitBranch) {
    mismatches.push(`Branch mismatch: expected ${cr.gitBranch}, got ${branch}`);
  }
  if (
    cr.commit &&
    headCommit &&
    headCommit !== cr.commit &&
    !headCommit.startsWith(cr.commit.slice(0, 12))
  ) {
    mismatches.push(
      `Commit mismatch: expected ${cr.commit.slice(0, 12)}, got ${(headCommit || '').slice(0, 12)}`,
    );
  }
  if (expectedContent && observedContent && observedContent.trim() !== expectedContent.trim()) {
    mismatches.push('Preview content does not match the exact draft wording');
  }

  return {
    ok: mismatches.length === 0,
    mismatches,
    worktreePath: worktree || null,
    branch,
    headCommit,
    expectedCommit: cr.commit || null,
    expectedBranch: cr.gitBranch || null,
    expectedContent,
    observedContent,
    contentFingerprintExpected: expectedFp,
    contentFingerprintObserved: fingerprintContent(observedContent),
    previewHealthStatus: opts.previewHealthStatus,
    previewUrl: opts.previewUrl,
  };
}

export function buildOwnerReviewPayload(opts: {
  cr: WebsiteChangeRequest & Record<string, unknown>;
  website: WebsiteRegistryRecord;
  page?: WebsitePageRecord | null;
  previewIdentity: PreviewIdentityResult;
}) {
  const { cr, website, page, previewIdentity } = opts;
  const after = exactDraftContent(cr);
  const before = String(cr.originalContent || '');
  const change = whatWillChange(cr);
  const approval = cr.ownerApproval as OwnerApprovalRecord | undefined;
  const alreadyApproved = Boolean(approval?.approvedAt && !approval.invalidated);
  return {
    changeRequestId: cr.changeRequestId,
    ownerTitle: ownerChangeTitle(cr),
    ownerStatus: ownerFriendlyStatus(cr),
    liveState: alreadyApproved ? 'APPROVED — NOT LIVE' : 'DRAFT — NOT LIVE',
    website: {
      websiteId: website.websiteId,
      websiteName: website.websiteName,
    },
    page: {
      pageId: page?.pageId || cr.pageId,
      pageName: page?.route === '/' ? 'Home' : page?.pageTitle || 'Home',
      route: page?.route || '/',
    },
    section: 'Hero',
    blockLabel: 'Main Headline',
    youAsked: cr.naturalLanguageRequest || cr.reason,
    before,
    after,
    whatWillChange: change.items,
    whatWillNotChange: change.summaryLines.filter((l) => /^No /i.test(l)),
    summaryLines: change.summaryLines,
    risk: change.risk,
    tier: cr.tier,
    baselineCommit: cr.baselineCommit || null,
    pilotCommit: cr.commit || null,
    pilotBranch: cr.gitBranch || null,
    worktreePath: cr.worktreePath || null,
    previewIdentity,
    canApprove: previewIdentity.ok && !alreadyApproved,
    approvalBlockedReason: !previewIdentity.ok
      ? 'PREVIEW VERSION MISMATCH — fix preview before approval'
      : alreadyApproved
        ? 'Already approved — not published'
        : null,
    deviceReviews: (cr.deviceReviews as OwnerDeviceReviews) || {},
    ownerApproval: approval || null,
    productionImpact: 'NONE YET' as const,
    publishingEnabled: false,
    estimatedReviewMinutes: cr.timeProtection?.estimatedReviewMinutes ?? 1,
  };
}

export function buildThreeHeadlineOptions(source: string): Array<{
  id: string;
  label: string;
  text: string;
  recommended: boolean;
  why: string;
}> {
  const base =
    source.trim() ||
    'Strategic capital advisory to help your business grow, qualify for capital, and build enterprise value.';
  return [
    {
      id: 'opt_1',
      label: 'Option 1',
      text: base,
      recommended: true,
      why: 'Clearest outcome-driven positioning for business owners seeking capital and enterprise value.',
    },
    {
      id: 'opt_2',
      label: 'Option 2',
      text: 'Strategic capital advisory that helps business owners grow, secure the right capital, and increase enterprise value.',
      recommended: false,
      why: 'Slightly more explicit about “business owners” and capital fit.',
    },
    {
      id: 'opt_3',
      label: 'Option 3',
      text: 'Grow your business, qualify for capital, and build lasting enterprise value with strategic capital advisory.',
      recommended: false,
      why: 'Leads with outcomes first; still advisory-positioned without inventing claims.',
    },
  ];
}
