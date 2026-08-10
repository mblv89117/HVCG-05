/**
 * Website Studio QA Agent gate — Phase 6B-QA.
 * Gate values are the only owner-facing readiness vocabulary for READY FOR MANNY.
 */

export const OWNER_QA_GATES = [
  'NOT TESTED',
  'TESTING',
  'FAILED QA',
  'READY FOR MANNY',
  'OWNER APPROVED',
] as const;

export type OwnerQaGate = (typeof OWNER_QA_GATES)[number];

export const QA_RUN_TYPES = ['SMOKE', 'FULL OWNER QA', 'TARGETED RETEST', 'RELEASE GATE'] as const;
export type QaRunType = (typeof QA_RUN_TYPES)[number];

export type QaSeverity = 'BLOCKER' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface QaDefect {
  id: string;
  title: string;
  severity: QaSeverity;
  ownerWorkflowStep: string;
  expected: string;
  actual: string;
  screenshot?: string | null;
  trace?: string | null;
  consoleError?: string | null;
  networkError?: string | null;
  affectedComponent: string;
  suggestedFix: string;
  retestRequired: boolean;
  fixed?: boolean;
  retestPassed?: boolean | null;
}

export interface QaCheckResult {
  id: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP' | 'WARN';
  detail?: string;
  durationMs?: number;
}

export interface WebsiteStudioQaResult {
  schemaVersion: 1;
  runId: string;
  runType: QaRunType;
  gate: OwnerQaGate;
  verdict:
    | 'WEBSITE STUDIO QA GATE — READY FOR MANNY'
    | 'WEBSITE STUDIO QA GATE — READY WITH NON-BLOCKING ITEMS'
    | 'WEBSITE STUDIO QA GATE — FAILED';
  testedCommit: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  changeRequestId: string;
  websiteId: string;
  checks: QaCheckResult[];
  defects: QaDefect[];
  buttonInventory: {
    total: number;
    functional: number;
    disabledWithExplanation: number;
    comingLater: number;
    failures: string[];
  };
  beforeAfter: {
    baselineCommit: string;
    pilotCommit: string;
    beforeH1: string;
    afterH1: string;
    visualDifferenceVerified: boolean;
  };
  aiAdvisor: {
    mode: 'live' | 'mock' | 'deterministic';
    threeOptionsOk: boolean;
    failures: string[];
  };
  approval: {
    confirmationOk: boolean;
    persistenceOk: boolean;
    invalidationOk: boolean;
    productionUnchanged: boolean;
  };
  safety: {
    localAiWritesEnabled: boolean;
    localAiExternalMessagesEnabled: boolean;
    evaIntakeEnabled: boolean;
    clientEmailsEnabled: boolean;
    productionChanged: boolean;
    unexpectedExternalHosts: string[];
  };
  performance: {
    ownerFlowMs: number;
    previewStartupMs: number;
    aiOperationMs: number;
    pageLoadMs: number;
    retries: number;
    retestCount: number;
  };
  evidenceDir: string;
  screenshots: string[];
  traces: string[];
  ownerPackage?: {
    title: string;
    website: string;
    change: string;
    estimatedReviewMinutes: number;
    openReviewPath: string;
    lines: string[];
  };
  summary: Record<string, string>;
}

export function computeGateFromResult(result: Omit<WebsiteStudioQaResult, 'gate' | 'verdict'>): {
  gate: OwnerQaGate;
  verdict: WebsiteStudioQaResult['verdict'];
} {
  const blockers = result.defects.filter((d) =>
    ['BLOCKER', 'CRITICAL', 'HIGH'].includes(d.severity) && !d.fixed,
  );
  const failedChecks = result.checks.filter((c) => c.status === 'FAIL');
  if (blockers.length || failedChecks.length || result.safety.productionChanged) {
    return { gate: 'FAILED QA', verdict: 'WEBSITE STUDIO QA GATE — FAILED' };
  }
  const nonBlocking = result.defects.filter(
    (d) => ['MEDIUM', 'LOW'].includes(d.severity) && !d.fixed,
  );
  if (nonBlocking.length) {
    return {
      gate: 'READY FOR MANNY',
      verdict: 'WEBSITE STUDIO QA GATE — READY WITH NON-BLOCKING ITEMS',
    };
  }
  return { gate: 'READY FOR MANNY', verdict: 'WEBSITE STUDIO QA GATE — READY FOR MANNY' };
}

export function ownerPackageForPass(opts: {
  changeRequestId: string;
  websiteName?: string;
}): WebsiteStudioQaResult['ownerPackage'] {
  return {
    title: 'READY FOR YOUR REVIEW',
    website: opts.websiteName || 'High Value Capital Group',
    change: 'Homepage headline',
    estimatedReviewMinutes: 1,
    openReviewPath: `/website-studio?view=review&cr=${opts.changeRequestId}&mode=compare`,
    lines: [
      'Automated QA: Passed',
      'Browser owner flow: Passed',
      'Before / After: Verified',
      'Preview: Verified',
      'AI Advisor: Passed',
      'Desktop / Tablet / Mobile: Passed',
      'Approval workflow: Passed',
      'Production changed: No',
      '',
      "Manny's only task:",
      'Look at the draft and decide whether you like it.',
    ],
  };
}

export const HVCG_QA_FIXTURE = {
  websiteId: 'ws_hvcg_real',
  websiteName: 'High Value Capital Group',
  changeRequestId: 'wcr_96016971141f',
  baselineCommit: '97e3a913bc2ec7f8884d8bc7035864069122d06e',
  pilotBranch: 'website-studio/hvcg-pilot',
  pilotCommit: 'fd4e05d1a634d53a5442d9865487ec76b7a21258',
  beforeH1:
    'Find out what is preventing your business from growing, qualifying for capital, or becoming more valuable.',
  afterH1:
    'Strategic capital advisory to help your business grow, qualify for capital, and build enterprise value.',
} as const;
