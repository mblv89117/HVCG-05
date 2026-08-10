/**
 * Phase 6A — Atlas Website Studio foundation schemas.
 * Local/synthetic only. No Production website edits. No deploy.
 */

import { createHash, randomUUID } from 'node:crypto';
import { MANNY_OWNER, LOCAL_AI_OWNER, FUTURE_OPERATOR_OWNER, AUTOMATION_OWNER } from '../local-ai/ownership.ts';

export const WEBSITE_STUDIO_SCHEMA_VERSION = '1.1.0-phase6b';
export const WEBSITE_STUDIO_BANNER = 'WEBSITE STUDIO — LOCAL CONTROL PLANE ONLY';
export const WEBSITE_STUDIO_NO_DEPLOY = 'NO PRODUCTION DEPLOY IN PHASE 6A/6B';
export const WEBSITE_STUDIO_NO_PUSH = 'NO PUSH / MERGE / PRODUCTION BRANCH EDIT';
export const WEBSITE_STUDIO_PHASE6B_BANNER =
  'PHASE 6B — HVCG REAL REPO PILOT (NO PRODUCTION DEPLOY)';
export const HVCG_PILOT_WEBSITE_ID = 'ws_hvcg_real';
export const HVCG_PILOT_BRANCH = 'website-studio/hvcg-pilot';
export const PRODUCTION_DEPLOY_GATE =
  'PRODUCTION DEPLOYMENT REQUIRES SEPARATE MANNY AUTHORIZATION';

export const WEBSITE_FRAMEWORKS = [
  'Next.js',
  'Vite/React',
  'Astro',
  'Static HTML',
  'Unknown',
] as const;
export type WebsiteFramework = (typeof WEBSITE_FRAMEWORKS)[number];

export const WEBSITE_STATUSES = [
  'Registered',
  'Discovery Pending',
  'Discovered',
  'Healthy',
  'Needs Attention',
  'Archived',
] as const;
export type WebsiteStatus = (typeof WEBSITE_STATUSES)[number];

export const CONTENT_BLOCK_TYPES = [
  'headline',
  'subheadline',
  'paragraph',
  'CTA',
  'service description',
  'FAQ',
  'testimonial',
  'statistic',
  'contact information',
  'footer content',
  'header content',
  'announcement',
  'trust badge text',
  'pricing-display text',
  'disclosure',
  'location/service-area content',
  'blog/article content',
] as const;
export type ContentBlockType = (typeof CONTENT_BLOCK_TYPES)[number];

export const CHANGE_REQUEST_TYPES = [
  'content_edit',
  'seo_edit',
  'media_proposal',
  'form_copy_edit',
  'natural_language',
  'ai_patch',
  'structured_site',
  'developer',
  'restricted',
] as const;
export type ChangeRequestType = (typeof CHANGE_REQUEST_TYPES)[number];

export const CHANGE_TIERS = [
  'Tier A — Safe Content Change',
  'Tier B — Structured Site Change',
  'Tier C — Developer Change',
  'Tier D — Restricted Production Change',
] as const;
export type ChangeTier = (typeof CHANGE_TIERS)[number];

export const CHANGE_REQUEST_STATUSES = [
  'Draft',
  'AI Preparing',
  'Ready for Preview',
  'Preview Failed',
  'QA Required',
  'QA Failed',
  'Waiting on Manny',
  'Approved for Git',
  'Committed',
  'PR Open',
  'Approved for Deployment',
  'Deployment In Progress',
  'Deployed',
  'Deployment Failed',
  'Rolled Back',
  'Rejected',
  'Cancelled',
] as const;
export type ChangeRequestStatus = (typeof CHANGE_REQUEST_STATUSES)[number];

export const WEBSITE_AI_OPERATIONS = [
  'rewrite_content',
  'improve_headline',
  'improve_cta',
  'improve_service_description',
  'draft_faq',
  'improve_meta_title',
  'improve_meta_description',
  'suggest_internal_links',
  'identify_seo_gaps',
  'summarize_page',
  'compare_page_versions',
  'prepare_change_plan',
  'prepare_qa_checklist',
  'explain_code_change',
  'generate_content_patch',
] as const;
export type WebsiteAiOperation = (typeof WEBSITE_AI_OPERATIONS)[number];

export const WEBSITE_AI_FORBIDDEN_OPERATIONS = [
  'deploy',
  'merge',
  'push_to_production',
  'change_secrets',
  'change_authentication',
  'change_payment_logic',
  'change_databases',
  'change_dns',
  'alter_hosting_credentials',
  'enable_external_integrations',
  'publish_without_manny_approval',
] as const;

export const HIGH_RISK_CHANGE_KEYWORDS = [
  'authentication',
  'api',
  'payment',
  'database',
  'crm',
  'eva',
  'webhook',
  'environment variable',
  'env var',
  'dns',
  'hosting',
  'deployment config',
  'security header',
  'csp',
  'cookie',
  'session',
  'analytics credential',
  'secret',
  'third-party credential',
] as const;

export interface WebsiteRegistryRecord {
  websiteId: string;
  websiteName: string;
  businessEntity: string;
  productionUrl: string | null;
  stagingUrl: string | null;
  repositoryUrl: string | null;
  localRepositoryPath: string | null;
  framework: WebsiteFramework;
  hostingProvider: string | null;
  productionBranch: string;
  defaultDevelopmentBranch: string;
  buildCommand: string | null;
  testCommand: string | null;
  previewCommand: string | null;
  deploymentMethod: string | null;
  contentArchitecture: string | null;
  seoArchitecture: string | null;
  analyticsProvider: string | null;
  formProvider: string | null;
  status: WebsiteStatus;
  lastSuccessfulDeployment: string | null;
  lastRollbackPoint: string | null;
  openChangeRequestCount: number;
  repositoryHealth: 'Unknown' | 'Healthy' | 'Degraded' | 'Unavailable';
  notes: string | null;
  synthetic: boolean;
  mannyConfirmedRegistration: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WebsiteDiscoveryResult {
  discoveryId: string;
  websiteId: string | null;
  localPath: string;
  repositoryRoot: string | null;
  gitRemote: string | null;
  currentBranch: string | null;
  productionBranchGuess: string | null;
  framework: WebsiteFramework;
  packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun' | 'unknown';
  buildScripts: string[];
  deploymentConfigFiles: string[];
  pages: string[];
  routes: string[];
  contentFiles: string[];
  componentFiles: string[];
  seoFiles: string[];
  mediaDirectories: string[];
  formDefinitions: string[];
  redirects: string[];
  sitemapRobotsFiles: string[];
  envVarReferences: string[];
  deploymentProviderConfig: string[];
  confidence: number;
  readOnly: true;
  modifiedAnything: false;
  discoveredAt: string;
  notes: string[];
}

export interface WebsitePageRecord {
  pageId: string;
  websiteId: string;
  route: string;
  pageTitle: string;
  pageType: string;
  sourceFile: string;
  layout: string | null;
  status: 'Draft' | 'Published' | 'Archived' | 'Unknown';
  lastModified: string | null;
  seoTitle: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  h1: string | null;
  majorSections: string[];
  ctaLabels: string[];
  formsPresent: string[];
  imagesUsed: string[];
  schemaMarkupPresent: boolean;
  structuredDataType: string | null;
  publishState: string;
}

export interface ContentBlockRecord {
  blockId: string;
  websiteId: string;
  pageId: string;
  blockType: ContentBlockType;
  sourceFile: string;
  sourceLocation: string | null;
  currentValue: string;
  proposedValue: string | null;
  characterCount: number;
  lastModified: string | null;
  changeRequestId: string | null;
  aiGenerated: boolean;
  mannyApproved: boolean;
  validationStatus: 'Valid' | 'Warning' | 'Invalid' | 'Pending';
}

export interface SeoFieldSet {
  pageTitle: string | null;
  metaDescription: string | null;
  canonical: string | null;
  robotsDirective: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageReference: string | null;
  twitterTitle: string | null;
  twitterDescription: string | null;
  h1: string | null;
  structuredDataFields: Record<string, unknown>;
  localBusinessFields: Record<string, unknown>;
  serviceAreaFields: Record<string, unknown>;
  faqSchemaContent: unknown[];
  sitemapInclusion: boolean;
  redirectRequest: string | null;
}

export interface SeoValidationIssue {
  code: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  field?: string;
}

export interface MediaAssetRecord {
  mediaId: string;
  websiteId: string;
  filename: string;
  fileType: string;
  dimensions: string | null;
  sizeBytes: number | null;
  altText: string | null;
  pagesUsed: string[];
  unused: boolean;
  proposedReplacement: string | null;
  compressionRecommendation: string | null;
  duplicateOf: string | null;
  missingAltText: boolean;
}

export interface FormInventoryRecord {
  formId: string;
  websiteId: string;
  formName: string;
  pageId: string | null;
  sourceFile: string;
  fields: Array<{ name: string; label: string; required: boolean }>;
  requiredFields: string[];
  submissionEndpoint: string | null;
  successBehavior: string | null;
  spamProtection: string | null;
  analyticsEvent: string | null;
  currentIntegration: string | null;
  status: string;
  endpointIsHighRisk: boolean;
}

export interface AiCopyProposalVariant {
  variantId: string;
  label: string;
  text: string;
  recommended: boolean;
  recommendationReason: string | null;
  brandConsistencyNotes: string;
  seoImplications: string;
  ctaImplications: string;
  readabilityNotes: string;
  risks: string[];
  factualClaimsNeedingVerification: string[];
}

export interface WebsiteProductionBaseline {
  baselineId: string;
  websiteId: string;
  productionBranch: string;
  baselineCommit: string;
  pageInventoryCount: number;
  seoInventoryCount: number;
  formInventoryCount: number;
  mediaInventoryCount: number;
  deploymentConfigFingerprint: string;
  buildResult: string | null;
  capturedAt: string;
  worktreePath: string | null;
  pilotBranch: string | null;
  notes: string[];
}

export interface WebsiteChangeRequest {
  changeRequestId: string;
  websiteId: string;
  pageId: string | null;
  requestType: ChangeRequestType;
  tier: ChangeTier;
  requestedBy: string;
  originalContent: string | null;
  proposedContent: string | null;
  reason: string;
  localAiAssistanceUsed: boolean;
  aiOperation: WebsiteAiOperation | null;
  filesExpectedToChange: string[];
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  seoImpact: string | null;
  formImpact: string | null;
  analyticsImpact: string | null;
  securityImpact: string | null;
  buildRequired: boolean;
  testsRequired: boolean;
  previewStatus: string | null;
  qaStatus: string | null;
  gitBranch: string | null;
  commit: string | null;
  prUrl: string | null;
  deploymentStatus: string | null;
  rollbackReference: string | null;
  mannyApproval: boolean | null;
  productionApproval: boolean | null;
  status: ChangeRequestStatus;
  auditCorrelationId: string;
  naturalLanguageRequest: string | null;
  sideEffects: string[];
  timeProtection: {
    estimatedReviewMinutes: number;
    estimatedTimeSavedMinutes: number;
    recommendedAction: string;
  };
  createdAt: string;
  updatedAt: string;
  /** Default true; Phase 6B may set false only after explicit Manny push approval. */
  phase6aNoPush: boolean;
  phase6aNoDeploy: true;
  /** Phase 6B pilot extensions */
  phase6bPilot?: boolean;
  aiProposals?: AiCopyProposalVariant[];
  recommendedVariantId?: string | null;
  selectedVariantId?: string | null;
  mannyFinalWording?: string | null;
  finalWordingApproved?: boolean;
  filesModified?: boolean;
  baselineCommit?: string | null;
  worktreePath?: string | null;
  previewUrl?: string | null;
  buildResult?: string | null;
  testResult?: string | null;
  visualQaConfirmedByManny?: boolean;
  mannyPushApproved?: boolean;
  productionDeploymentAuthorized?: false;
}

export interface QaChecklistItem {
  id: string;
  label: string;
  applicable: boolean;
  automated: boolean;
  status: 'Pending' | 'Pass' | 'Fail' | 'Skipped' | 'Manny Review';
  notes: string | null;
}

export interface PreviewSession {
  previewId: string;
  changeRequestId: string;
  websiteId: string;
  localUrl: string | null;
  buildStatus: 'Not Started' | 'Running' | 'Passed' | 'Failed';
  buildErrors: string[];
  changedPages: string[];
  startedAt: string;
  publicExposure: false;
}

export interface DeploymentRecord {
  deploymentId: string;
  websiteId: string;
  changeRequestId: string | null;
  targetEnvironment: 'Staging' | 'Production' | 'Preview';
  provider: string | null;
  branch: string | null;
  commit: string | null;
  deployId: string | null;
  status: 'Scaffolded' | 'Pending Approval' | 'Blocked — Phase 6A';
  url: string | null;
  startedAt: string | null;
  completedAt: string | null;
  healthResult: string | null;
  rollbackReference: string | null;
  approvedBy: string | null;
  phase6aNoExecute: true;
}

export interface RollbackRecord {
  rollbackId: string;
  websiteId: string;
  deploymentId: string | null;
  priorCommit: string | null;
  currentCommit: string | null;
  rollbackCommit: string | null;
  reason: string;
  initiatedBy: string;
  approvedBy: string | null;
  outcome: 'Scaffolded Only — Phase 6A';
  postRollbackHealth: string | null;
  phase6aNoExecute: true;
}

export interface WebsiteStudioDashboard {
  registeredWebsites: number;
  openChangeRequests: number;
  pagesWithDraftChanges: number;
  seoIssues: number;
  qaFailures: number;
  previewReady: number;
  mannyApprovalsRequired: number;
  pendingGitCommits: number;
  pendingPrs: number;
  deploymentReady: number;
  recentDeployments: number;
  rollbacks: number;
  siteHealthSummary: string;
  estimatedMannyTimeSavedMinutes: number;
  banners: {
    studio: typeof WEBSITE_STUDIO_BANNER;
    noDeploy: typeof WEBSITE_STUDIO_NO_DEPLOY;
    noPush: typeof WEBSITE_STUDIO_NO_PUSH;
  };
}

export function isWebsiteAiOperation(op: string): op is WebsiteAiOperation {
  return (WEBSITE_AI_OPERATIONS as readonly string[]).includes(op);
}

export function assertWebsiteAiAllowed(op: string): WebsiteAiOperation {
  if ((WEBSITE_AI_FORBIDDEN_OPERATIONS as readonly string[]).includes(op)) {
    throw Object.assign(new Error(`Forbidden Website Studio AI operation: ${op}`), {
      status: 403,
      code: 'website_ai_forbidden',
    });
  }
  if (!isWebsiteAiOperation(op)) {
    throw Object.assign(new Error(`Unknown Website Studio AI operation: ${op}`), {
      status: 400,
      code: 'website_ai_unknown',
    });
  }
  return op;
}

export function classifyWebsiteChange(input: {
  requestType?: string;
  naturalLanguage?: string;
  files?: string[];
  touchesHighRisk?: boolean;
}): { tier: ChangeTier; riskLevel: WebsiteChangeRequest['riskLevel']; reasons: string[] } {
  const blob = `${input.requestType || ''} ${input.naturalLanguage || ''} ${(input.files || []).join(' ')}`.toLowerCase();
  const reasons: string[] = [];
  const highRisk =
    input.touchesHighRisk ||
    HIGH_RISK_CHANGE_KEYWORDS.some((k) => {
      const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`\\b${escaped}\\b`, 'i').test(blob);
    });
  if (highRisk || /\b(dns|secret|\.env|auth provider|payment provider|migration)\b/.test(blob)) {
    reasons.push('Restricted / high-risk keywords detected');
    return { tier: 'Tier D — Restricted Production Change', riskLevel: 'Critical', reasons };
  }
  if (
    /\b(api|integration|webhook|database|authentication|payment|deploy|hosting config)\b/.test(blob) ||
    input.requestType === 'developer'
  ) {
    reasons.push('Developer-style code/integration change');
    return { tier: 'Tier C — Developer Change', riskLevel: 'High', reasons };
  }
  if (
    /redirect|schema|media|form layout|section|blog|structured/.test(blob) ||
    input.requestType === 'structured_site' ||
    input.requestType === 'media_proposal'
  ) {
    reasons.push('Structured site change');
    return { tier: 'Tier B — Structured Site Change', riskLevel: 'Medium', reasons };
  }
  reasons.push('Safe content / metadata change');
  return { tier: 'Tier A — Safe Content Change', riskLevel: 'Low', reasons };
}

export function validateSeoFields(seo: Partial<SeoFieldSet>): SeoValidationIssue[] {
  const issues: SeoValidationIssue[] = [];
  const title = seo.pageTitle || '';
  const desc = seo.metaDescription || '';
  if (title && (title.length < 30 || title.length > 60)) {
    issues.push({
      code: 'title_length',
      severity: 'warning',
      message: `Title length ${title.length} (prefer 30–60)`,
      field: 'pageTitle',
    });
  }
  if (desc && (desc.length < 70 || desc.length > 160)) {
    issues.push({
      code: 'description_length',
      severity: 'warning',
      message: `Meta description length ${desc.length} (prefer 70–160)`,
      field: 'metaDescription',
    });
  }
  if (!seo.h1) {
    issues.push({ code: 'missing_h1', severity: 'warning', message: 'Missing H1', field: 'h1' });
  }
  if (seo.canonical) {
    try {
      // eslint-disable-next-line no-new
      new URL(seo.canonical);
    } catch {
      issues.push({
        code: 'malformed_canonical',
        severity: 'error',
        message: 'Malformed canonical URL',
        field: 'canonical',
      });
    }
  }
  if (seo.robotsDirective && /noindex/i.test(seo.robotsDirective)) {
    issues.push({
      code: 'noindex_warning',
      severity: 'warning',
      message: 'Robots directive includes noindex',
      field: 'robotsDirective',
    });
  }
  if (!seo.ogTitle || !seo.ogDescription) {
    issues.push({
      code: 'missing_og_fields',
      severity: 'info',
      message: 'Missing Open Graph title/description',
    });
  }
  return issues;
}

export function buildDefaultQaChecklist(change: WebsiteChangeRequest): QaChecklistItem[] {
  const items: Array<Omit<QaChecklistItem, 'id'>> = [
    { label: 'build passes', applicable: change.buildRequired, automated: true, status: 'Pending', notes: null },
    { label: 'typecheck passes', applicable: change.buildRequired, automated: true, status: 'Pending', notes: null },
    { label: 'tests pass', applicable: change.testsRequired, automated: true, status: 'Pending', notes: null },
    { label: 'desktop layout', applicable: true, automated: false, status: 'Manny Review', notes: null },
    { label: 'mobile layout', applicable: true, automated: false, status: 'Manny Review', notes: null },
    { label: 'tablet layout', applicable: true, automated: false, status: 'Manny Review', notes: null },
    { label: 'links', applicable: true, automated: false, status: 'Manny Review', notes: null },
    { label: 'CTA', applicable: true, automated: false, status: 'Manny Review', notes: null },
    { label: 'forms', applicable: Boolean(change.formImpact), automated: false, status: 'Manny Review', notes: null },
    { label: 'page title', applicable: Boolean(change.seoImpact), automated: true, status: 'Pending', notes: null },
    { label: 'meta description', applicable: Boolean(change.seoImpact), automated: true, status: 'Pending', notes: null },
    { label: 'canonical', applicable: Boolean(change.seoImpact), automated: true, status: 'Pending', notes: null },
    { label: 'Open Graph', applicable: Boolean(change.seoImpact), automated: true, status: 'Pending', notes: null },
    { label: 'schema', applicable: Boolean(change.seoImpact), automated: true, status: 'Pending', notes: null },
    { label: 'images', applicable: true, automated: false, status: 'Manny Review', notes: null },
    { label: 'alt text', applicable: true, automated: true, status: 'Pending', notes: null },
    { label: 'analytics markup preserved', applicable: true, automated: false, status: 'Manny Review', notes: null },
    { label: 'robots behavior', applicable: Boolean(change.seoImpact), automated: true, status: 'Pending', notes: null },
    { label: 'sitemap impact', applicable: Boolean(change.seoImpact), automated: true, status: 'Pending', notes: null },
    { label: 'redirects', applicable: /redirect/i.test(change.reason + (change.naturalLanguageRequest || '')), automated: true, status: 'Pending', notes: null },
    { label: 'no broken imports', applicable: true, automated: true, status: 'Pending', notes: null },
    { label: 'no secret exposure', applicable: true, automated: true, status: 'Pending', notes: null },
    { label: 'no environment-variable breakage', applicable: true, automated: true, status: 'Pending', notes: null },
  ];
  return items.map((i) => ({ ...i, id: randomUUID() }));
}

export function hashContent(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

export function newChangeRequestId(): string {
  return `wcr_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

export function newWebsiteId(): string {
  return `ws_${randomUUID().replace(/-/g, '').slice(0, 10)}`;
}

export function newBaselineId(): string {
  return `wbl_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

export function buildHeadlinePilotProposals(original: string): {
  variants: AiCopyProposalVariant[];
  recommendedVariantId: string;
} {
  const v1: AiCopyProposalVariant = {
    variantId: 'variant_a',
    label: 'Variant A — Strategic growth emphasis',
    text: 'Strategic capital advisory that helps your business grow, qualify for capital, and increase enterprise value.',
    recommended: false,
    recommendationReason: null,
    brandConsistencyNotes:
      'Keeps HVCG capital + growth language; slightly more advisory tone than the diagnostic original.',
    seoImplications:
      'Adds “strategic capital advisory” and “enterprise value” phrases useful for advisory intent queries; longer than current H1.',
    ctaImplications:
      'Supports EVA / consultation CTAs by framing advisory outcomes rather than only a diagnostic question.',
    readabilityNotes: 'Single sentence, clear benefit stack; moderate length.',
    risks: ['Slightly less “curiosity gap” than the current question-form H1'],
    factualClaimsNeedingVerification: [],
  };
  const v2: AiCopyProposalVariant = {
    variantId: 'variant_b',
    label: 'Variant B — Recommended (balanced)',
    text: 'Strategic capital advisory for business growth — find what is holding you back from capital and higher enterprise value.',
    recommended: true,
    recommendationReason:
      'Balances brand diagnostic voice with explicit strategic capital advisory and growth framing Manny requested, without inventing credentials or outcomes.',
    brandConsistencyNotes:
      'Preserves HVCG “find what is holding you back” motif while elevating strategic capital advisory.',
    seoImplications:
      'Targets strategic capital advisory + business growth + enterprise value; should not change title/meta unless separately requested.',
    ctaImplications:
      'Pairs well with Schedule / EVA CTAs; does not alter CTA labels.',
    readabilityNotes: 'Readable at a glance; em dash separates promise and diagnostic hook.',
    risks: ['Em dash may wrap awkwardly on very small mobile widths'],
    factualClaimsNeedingVerification: [],
  };
  const v3: AiCopyProposalVariant = {
    variantId: 'variant_c',
    label: 'Variant C — Concise advisory',
    text: 'Strategic capital advisory to grow your business and increase enterprise value.',
    recommended: false,
    recommendationReason: null,
    brandConsistencyNotes: 'Most concise; drops the diagnostic question style of the current homepage.',
    seoImplications: 'Strong head-term focus; may reduce long-tail “what is preventing” query overlap.',
    ctaImplications: 'More declarative; CTA must carry the diagnostic invitation.',
    readabilityNotes: 'Short and scannable; good mobile fit.',
    risks: ['Largest departure from the proven current H1 pattern'],
    factualClaimsNeedingVerification: [],
  };
  void original;
  return { variants: [v1, v2, v3], recommendedVariantId: v2.variantId };
}

export { MANNY_OWNER, LOCAL_AI_OWNER, FUTURE_OPERATOR_OWNER, AUTOMATION_OWNER };

export const WEBSITE_STUDIO_ACCESS = {
  Manny: {
    fullControl: true,
    deployProduction: true, // still requires explicit future approval gate; Phase 6A never executes
  },
  [LOCAL_AI_OWNER]: {
    read: true,
    analyze: true,
    draft: true,
    propose: true,
    preparePatches: true,
    prepareQa: true,
    publish: false,
    deploy: false,
    merge: false,
  },
  [FUTURE_OPERATOR_OWNER]: {
    configurable: true,
    productionDeployDefault: false,
  },
  [AUTOMATION_OWNER]: {
    buildTestQaOnly: true,
    productionPublishWithoutApproval: false,
  },
} as const;
