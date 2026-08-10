/**
 * Phase 6B-UX — Expert Website Advisor (deterministic, local).
 * Analyzes / recommends only. Never deploys, pushes, merges, or edits Production.
 */

import type {
  ContentBlockRecord,
  MediaAssetRecord,
  WebsiteChangeRequest,
  WebsitePageRecord,
  WebsiteRegistryRecord,
  SeoFieldSet,
} from '@hvcg/atlas-integration-core';

export type AdvisorCategory =
  | 'Growth / Conversion'
  | 'Messaging'
  | 'SEO'
  | 'Trust & Credibility'
  | 'Content'
  | 'User Experience'
  | 'Accessibility'
  | 'Technical / Advanced';

export type ImpactEffort = 'High' | 'Medium' | 'Low';

export interface AdvisorRecommendation {
  id: string;
  recommendation: string;
  category: AdvisorCategory;
  impact: ImpactEffort;
  effort: ImpactEffort;
  confidence: number;
  reason: string;
  expectedBusinessBenefit: string;
  affectedPage: string;
  affectedSection: string;
  mannyApprovalRequired: true;
  safelyHandleable: boolean;
  developerReviewRequired: boolean;
  suggestedActions: string[];
  verificationRequired?: boolean;
}

export interface PageAnalysisResult {
  overallScore: number;
  label: string;
  health: {
    messaging: number;
    conversion: number;
    seo: number;
    trust: number;
    content: number;
    ux: number;
    accessibility: number;
  };
  opportunities: AdvisorRecommendation[];
  quickWins: AdvisorRecommendation[];
  higherEffort: AdvisorRecommendation[];
  warnings: string[];
  pagePurpose: string;
  analyzedAt: string;
  verificationRequiredClaims: string[];
  estimateDisclaimer: 'AI Website Health Estimate — not an external certification';
}

export interface SiteAnalysisResult {
  overallScore: number;
  label: string;
  categoryScores: PageAnalysisResult['health'];
  prioritizedRecommendations: AdvisorRecommendation[];
  summary: string;
  pagesAnalyzed: number;
  analyzedAt: string;
  estimateDisclaimer: 'AI Website Health Estimate — not an external certification';
}

function nowIso() {
  return new Date().toISOString();
}

function isHvcg(website: WebsiteRegistryRecord): boolean {
  return (
    website.websiteId === 'ws_hvcg_real' ||
    /high value capital group/i.test(website.websiteName) ||
    /highvaluecapitalgroup/i.test(website.productionUrl || '')
  );
}

function scoreLabel(score: number): string {
  if (score >= 90) return 'Excellent — strong fundamentals with room for polish';
  if (score >= 80) return 'Good, with several high-value opportunities';
  if (score >= 70) return 'Solid foundation — prioritize conversion and clarity wins';
  if (score >= 55) return 'Needs attention — focus on messaging and SEO gaps';
  return 'Significant opportunities — start with high-impact quick wins';
}

function impactRank(i: ImpactEffort): number {
  return i === 'High' ? 3 : i === 'Medium' ? 2 : 1;
}
function effortRank(e: ImpactEffort): number {
  return e === 'Low' ? 3 : e === 'Medium' ? 2 : 1;
}

function sortRecs(recs: AdvisorRecommendation[]): AdvisorRecommendation[] {
  return [...recs].sort((a, b) => {
    const score =
      impactRank(b.impact) * 10 +
      effortRank(b.effort) -
      (impactRank(a.impact) * 10 + effortRank(a.effort));
    if (score !== 0) return score;
    return b.confidence - a.confidence;
  });
}

function friendlyPageName(page: WebsitePageRecord): string {
  if (page.route === '/' || /home/i.test(page.pageTitle)) return 'Home';
  const t = (page.pageTitle || '').replace(/\.html$/i, '').trim();
  if (t && !/^[\w.-]+\.html$/i.test(t) && t !== page.route) {
    return t
      .split(/[-_/]/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  const route = page.route.replace(/^\//, '') || 'home';
  return route
    .split(/[-_/]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

export function analyzePage(input: {
  website: WebsiteRegistryRecord;
  page: WebsitePageRecord;
  blocks: ContentBlockRecord[];
  seo?: Partial<SeoFieldSet> | null;
  media?: MediaAssetRecord[];
}): PageAnalysisResult {
  const { website, page, blocks } = input;
  const seo = input.seo || {
    pageTitle: page.seoTitle,
    metaDescription: page.metaDescription,
    h1: page.h1,
    canonical: page.canonicalUrl,
  };
  const pageName = friendlyPageName(page);
  const hvcg = isHvcg(website);
  const headlines = blocks.filter((b) => b.blockType === 'headline');
  const ctas = blocks.filter((b) => b.blockType === 'CTA');
  const faqs = blocks.filter((b) => b.blockType === 'FAQ');
  const testimonials = blocks.filter((b) => b.blockType === 'testimonial');
  const paragraphs = blocks.filter((b) => b.blockType === 'paragraph');
  const primaryHeadline = headlines[0]?.currentValue || page.h1 || '';
  const opportunities: AdvisorRecommendation[] = [];
  const warnings: string[] = [];
  const verificationRequiredClaims: string[] = [];

  let messaging = 82;
  let conversion = 76;
  let seoScore = 78;
  let trust = 74;
  let content = 80;
  let ux = 84;
  let accessibility = 80;

  if (!primaryHeadline || primaryHeadline.length < 24) {
    messaging -= 12;
    conversion -= 8;
    opportunities.push({
      id: 'rec_headline_missing',
      recommendation:
        pageName === 'Home'
          ? 'Add a clear, outcome-driven homepage headline'
          : `Add a clear, outcome-driven ${pageName} headline`,
      category: 'Messaging',
      impact: 'High',
      effort: 'Low',
      confidence: 0.9,
      reason: 'Visitors need an immediate statement of what you help them achieve.',
      expectedBusinessBenefit: 'Stronger first impression and clearer positioning.',
      affectedPage: pageName,
      affectedSection: 'Hero',
      mannyApprovalRequired: true,
      safelyHandleable: true,
      developerReviewRequired: false,
      suggestedActions: ['Show Me Options', 'Fix This', 'Create Change Request'],
    });
  } else if (
    /find out what is preventing/i.test(primaryHeadline) ||
    (hvcg &&
      !/capital|advisory|growth|enterprise value|SBA|funding/i.test(primaryHeadline) &&
      primaryHeadline.length > 40)
  ) {
    messaging -= 6;
    conversion -= 5;
    opportunities.push({
      id: 'rec_headline_outcome',
      recommendation: 'Headline could be more outcome-driven',
      category: 'Growth / Conversion',
      impact: 'High',
      effort: 'Low',
      confidence: 0.86,
      reason: hvcg
        ? 'The headline should lead with strategic capital advisory outcomes for business owners — growth, capital access, and enterprise value — rather than a diagnostic question alone.'
        : 'The headline explains presence but could communicate the desired visitor outcome faster.',
      expectedBusinessBenefit: 'Clearer positioning and stronger first-impression conversion.',
      affectedPage: pageName,
      affectedSection: 'Hero',
      mannyApprovalRequired: true,
      safelyHandleable: true,
      developerReviewRequired: false,
      suggestedActions: ['Show Me Options', 'Fix This', 'Create Change Request'],
    });
  } else if (hvcg && /strategic capital advisory/i.test(primaryHeadline)) {
    // Strong HVCG wording — slight polish opportunity only
    opportunities.push({
      id: 'rec_headline_polish',
      recommendation: 'Test a complementary subheadline that names who this is for',
      category: 'Messaging',
      impact: 'Medium',
      effort: 'Low',
      confidence: 0.72,
      reason:
        'Your H1 already states strategic capital advisory clearly. A supporting line for business owners seeking capital or enterprise-value growth can sharpen audience fit.',
      expectedBusinessBenefit: 'Faster recognition for the right visitor and lower bounce on first scroll.',
      affectedPage: pageName,
      affectedSection: 'Hero',
      mannyApprovalRequired: true,
      safelyHandleable: true,
      developerReviewRequired: false,
      suggestedActions: ['Show Me Options', 'Create Change Request'],
    });
  }

  const ctaLabels = [...ctas.map((c) => c.currentValue), ...(page.ctaLabels || [])];
  if (ctaLabels.length === 0) {
    conversion -= 14;
    opportunities.push({
      id: 'rec_cta_missing',
      recommendation: 'Add a primary call-to-action on this page',
      category: 'Growth / Conversion',
      impact: 'High',
      effort: 'Low',
      confidence: 0.88,
      reason: 'Without a clear next step, interested visitors stall.',
      expectedBusinessBenefit: 'More consultations and clearer conversion path.',
      affectedPage: pageName,
      affectedSection: 'CTA',
      mannyApprovalRequired: true,
      safelyHandleable: true,
      developerReviewRequired: false,
      suggestedActions: ['Review CTA', 'Show Me Options', 'Create Change Request'],
    });
  } else if (ctaLabels.some((t) => /learn more|click here|submit/i.test(t))) {
    conversion -= 6;
    opportunities.push({
      id: 'rec_cta_clarity',
      recommendation: 'Primary CTA could be clearer',
      category: 'Growth / Conversion',
      impact: 'Medium',
      effort: 'Low',
      confidence: 0.8,
      reason: hvcg
        ? 'Prefer consultation-oriented wording (for example Schedule a Strategy Call) over generic Learn More.'
        : 'Generic CTA labels underperform specific, value-led actions.',
      expectedBusinessBenefit: 'Higher click-through on the primary conversion path.',
      affectedPage: pageName,
      affectedSection: 'CTA',
      mannyApprovalRequired: true,
      safelyHandleable: true,
      developerReviewRequired: false,
      suggestedActions: ['Review CTA', 'Show Me Options'],
    });
  }

  if (!seo.metaDescription || String(seo.metaDescription).length < 50) {
    seoScore -= 12;
    opportunities.push({
      id: 'rec_meta_desc',
      recommendation: 'Meta description is missing or too generic',
      category: 'SEO',
      impact: 'Medium',
      effort: 'Low',
      confidence: 0.9,
      reason: 'Search snippets need a specific benefit statement to earn clicks.',
      expectedBusinessBenefit: 'Better search click-through without changing page design.',
      affectedPage: pageName,
      affectedSection: 'SEO',
      mannyApprovalRequired: true,
      safelyHandleable: true,
      developerReviewRequired: false,
      suggestedActions: ['Improve SEO', 'Give Me 3 Options'],
    });
  } else if (String(seo.metaDescription).length > 160) {
    seoScore -= 4;
    warnings.push('Meta description may truncate in search results (over ~160 characters).');
  }

  if (!seo.pageTitle || String(seo.pageTitle).length < 12) {
    seoScore -= 10;
    opportunities.push({
      id: 'rec_seo_title',
      recommendation: 'Improve the SEO title for clearer search positioning',
      category: 'SEO',
      impact: 'Medium',
      effort: 'Low',
      confidence: 0.85,
      reason: 'Titles should include the brand and the advisory/service intent.',
      expectedBusinessBenefit: 'Stronger branded search presence.',
      affectedPage: pageName,
      affectedSection: 'SEO',
      mannyApprovalRequired: true,
      safelyHandleable: true,
      developerReviewRequired: false,
      suggestedActions: ['Improve SEO Title', 'Give Me 3 Options'],
    });
  }

  if (faqs.length === 0 && (page.route === '/' || /home|funding|capital|about/i.test(page.route))) {
    content -= 5;
    trust -= 3;
    opportunities.push({
      id: 'rec_faq',
      recommendation: hvcg
        ? 'Add FAQs about capital strategy, SBA/debt options, and what an advisory engagement looks like'
        : 'Add FAQs that answer common buyer objections',
      category: 'Content',
      impact: 'Medium',
      effort: 'Medium',
      confidence: 0.75,
      reason: 'FAQs reduce friction and can support FAQ schema for search visibility.',
      expectedBusinessBenefit: 'Fewer stalled visitors and more qualified inquiries.',
      affectedPage: pageName,
      affectedSection: 'FAQ',
      mannyApprovalRequired: true,
      safelyHandleable: true,
      developerReviewRequired: false,
      suggestedActions: ['Show Me Options', 'Create Change Request'],
    });
  }

  if (testimonials.length === 0 && page.route === '/') {
    trust -= 8;
    opportunities.push({
      id: 'rec_trust',
      recommendation: 'Strengthen trust and credibility on this page',
      category: 'Trust & Credibility',
      impact: 'High',
      effort: 'Medium',
      confidence: 0.7,
      reason:
        'Business owners evaluating capital advisory look for proof, process clarity, and credible authority signals — without inventing results.',
      expectedBusinessBenefit: 'Higher confidence before booking a consultation.',
      affectedPage: pageName,
      affectedSection: 'Trust',
      mannyApprovalRequired: true,
      safelyHandleable: true,
      developerReviewRequired: false,
      suggestedActions: ['Create Change Request', 'Save for Later'],
      verificationRequired: true,
    });
    verificationRequiredClaims.push(
      'Any numeric outcomes (capital raised, approval rates, clients served) require VERIFICATION REQUIRED before publishing.',
    );
  }

  const missingAlt = (input.media || []).filter((m) => m.missingAltText).length;
  if (missingAlt > 0) {
    accessibility -= Math.min(15, missingAlt * 3);
    seoScore -= Math.min(8, missingAlt * 2);
    opportunities.push({
      id: 'rec_alt',
      recommendation: `Add alt text for ${missingAlt} image${missingAlt === 1 ? '' : 's'}`,
      category: 'Accessibility',
      impact: 'Medium',
      effort: 'Low',
      confidence: 0.92,
      reason: 'Missing alt text hurts accessibility and image SEO.',
      expectedBusinessBenefit: 'Better inclusivity and search coverage for visual assets.',
      affectedPage: pageName,
      affectedSection: 'Media',
      mannyApprovalRequired: true,
      safelyHandleable: true,
      developerReviewRequired: false,
      suggestedActions: ['Fix This', 'Create Change Request'],
    });
  }

  const claimPattern =
    /\$[\d.,]+[kmb]?\+?\s*(raised|funded|closed)?|\$[\d.,]+\s*(m|mm|million|b|billion)\+?|\d+\+?\s*%|\d+\+?\s*(clients|businesses|transactions|lenders|years)|approval rate|capital raised/i;
  for (const b of blocks) {
    if (b.blockType === 'statistic' || claimPattern.test(b.currentValue)) {
      const claim = b.currentValue.slice(0, 120);
      verificationRequiredClaims.push(claim);
      warnings.push(`VERIFICATION REQUIRED before publishing claim: “${claim}”`);
      opportunities.push({
        id: `rec_verify_${b.blockId}`,
        recommendation: 'Verify factual marketing claims before any publish',
        category: 'Trust & Credibility',
        impact: 'High',
        effort: 'Medium',
        confidence: 0.95,
        reason:
          'Numeric outcomes (capital raised, approval rates, clients served, years, deal volume) must be source-verified. Do not invent or publish unverified metrics.',
        expectedBusinessBenefit: 'Protect credibility and avoid inaccurate marketing claims.',
        affectedPage: pageName,
        affectedSection: b.blockType === 'statistic' ? 'Statistics' : 'Content',
        mannyApprovalRequired: true,
        safelyHandleable: false,
        developerReviewRequired: false,
        suggestedActions: ['Ignore', 'Save for Later'],
        verificationRequired: true,
      });
    }
  }

  if (paragraphs.some((p) => p.currentValue.length > 600)) {
    ux -= 4;
    opportunities.push({
      id: 'rec_scannability',
      recommendation: 'Break long sections into shorter, scannable paragraphs',
      category: 'User Experience',
      impact: 'Low',
      effort: 'Low',
      confidence: 0.68,
      reason: 'Dense blocks slow scanning on desktop and mobile.',
      expectedBusinessBenefit: 'Better comprehension of your offer.',
      affectedPage: pageName,
      affectedSection: 'Content',
      mannyApprovalRequired: true,
      safelyHandleable: true,
      developerReviewRequired: false,
      suggestedActions: ['Show Me Options'],
    });
  }

  if (!page.schemaMarkupPresent) {
    opportunities.push({
      id: 'rec_schema',
      recommendation: 'Consider structured data (Organization / FAQ / Service) where accurate',
      category: 'Technical / Advanced',
      impact: 'Medium',
      effort: 'Medium',
      confidence: 0.65,
      reason: 'Schema can improve how services appear in search — only with verified facts.',
      expectedBusinessBenefit: 'Richer search presentation when claims are verified.',
      affectedPage: pageName,
      affectedSection: 'SEO',
      mannyApprovalRequired: true,
      safelyHandleable: false,
      developerReviewRequired: true,
      suggestedActions: ['Save for Later'],
      verificationRequired: true,
    });
  }

  const sorted = sortRecs(opportunities).slice(0, 8);
  const lowEffortWins = sorted.filter((r) => r.effort === 'Low');
  const quickWins =
    lowEffortWins.length > 0
      ? lowEffortWins.slice(0, 4)
      : sorted.filter((r) => r.impact === 'High').slice(0, 3);
  const health = {
    messaging: clamp(messaging),
    conversion: clamp(conversion),
    seo: clamp(seoScore),
    trust: clamp(trust),
    content: clamp(content),
    ux: clamp(ux),
    accessibility: clamp(accessibility),
  };
  const overallScore = clamp(
    (health.messaging +
      health.conversion +
      health.seo +
      health.trust +
      health.content +
      health.ux +
      health.accessibility) /
      7,
  );

  const pagePurpose = hvcg
    ? page.route === '/' || /home/i.test(pageName)
      ? 'Position High Value Capital Group as a strategic capital advisory for business owners seeking growth, capital access, and enterprise value — then convert to consultation.'
      : `Support HVCG’s advisory positioning on the ${pageName} page and guide visitors toward a qualified conversation.`
    : `Help visitors understand the offer on ${pageName} and take the next step.`;

  return {
    overallScore,
    label: scoreLabel(overallScore),
    health,
    opportunities: sorted,
    quickWins,
    higherEffort: sorted.filter((r) => r.effort !== 'Low').slice(0, 4),
    warnings,
    pagePurpose,
    analyzedAt: nowIso(),
    verificationRequiredClaims,
    estimateDisclaimer: 'AI Website Health Estimate — not an external certification',
  };
}

export function analyzeWebsite(input: {
  website: WebsiteRegistryRecord;
  pages: WebsitePageRecord[];
  blocks: ContentBlockRecord[];
  changeRequests: WebsiteChangeRequest[];
  media: MediaAssetRecord[];
}): SiteAnalysisResult {
  const { website, pages, blocks, media } = input;
  const core = pages.filter((p) =>
    ['/', '/about', '/funding', '/capital-advisory', '/contact', '/book-strategy-call', '/book-appointment'].some(
      (r) => p.route === r || p.route.startsWith(r),
    ),
  );
  const sample = (core.length ? core : pages.slice(0, 8)).slice(0, 12);
  const pageResults = sample.map((page) =>
    analyzePage({
      website,
      page,
      blocks: blocks.filter((b) => b.pageId === page.pageId),
      media: media.filter((m) => m.pagesUsed.includes(page.route) || m.pagesUsed.includes(page.pageId)),
    }),
  );
  const avg = (key: keyof PageAnalysisResult['health']) =>
    pageResults.length
      ? clamp(pageResults.reduce((s, p) => s + p.health[key], 0) / pageResults.length)
      : 70;
  const categoryScores = {
    messaging: avg('messaging'),
    conversion: avg('conversion'),
    seo: avg('seo'),
    trust: avg('trust'),
    content: avg('content'),
    ux: avg('ux'),
    accessibility: avg('accessibility'),
  };
  const merged = sortRecs(pageResults.flatMap((p) => p.opportunities)).slice(0, 10);
  const overallScore = clamp(
    Object.values(categoryScores).reduce((a, b) => a + b, 0) / Object.values(categoryScores).length,
  );
  const drafts = input.changeRequests.filter((c) =>
    ['Draft', 'Waiting on Manny', 'Ready for Preview', 'QA Required', 'Committed'].includes(c.status),
  ).length;

  return {
    overallScore,
    label: scoreLabel(overallScore),
    categoryScores,
    prioritizedRecommendations: merged,
    summary: isHvcg(website)
      ? `Website Improvement Plan for ${website.websiteName}: prioritize conversion clarity on Home, consultation CTAs, SEO metadata gaps, and verified trust signals. ${drafts} draft change(s) already in flight. Analysis is read-only — no deploy and no Production publishing from this plan.`
      : `Prioritized plan for ${website.websiteName} across messaging, SEO, and conversion. ${drafts} draft change(s) in flight. Read-only analysis — no deploy.`,
    pagesAnalyzed: pageResults.length,
    analyzedAt: nowIso(),
    estimateDisclaimer: 'AI Website Health Estimate — not an external certification',
  };
}

export function advisorChatReply(
  message: string,
  context: {
    website: WebsiteRegistryRecord;
    page?: WebsitePageRecord | null;
    blocks?: ContentBlockRecord[];
    analysis?: PageAnalysisResult | null;
    seo?: unknown;
  },
): { reply: string; suggestedFollowUps: string[] } {
  const hvcg = isHvcg(context.website);
  const pageName = context.page ? friendlyPageName(context.page) : 'this website';
  const headline =
    context.blocks?.find((b) => b.blockType === 'headline')?.currentValue ||
    context.page?.h1 ||
    '';
  const top = context.analysis?.opportunities?.[0];
  const lower = message.toLowerCase();

  if (
    /\$[\d.,]+[kmb]?\+?\s*(raised|million|mm)?|raised|approval rate|\d+\s*clients served|years of experience/i.test(
      message,
    )
  ) {
    return {
      reply: `VERIFICATION REQUIRED. I will not insert or publish factual marketing claims such as capital raised, approval rates, clients served, or years of experience until you provide a verified source. I can instead suggest credible, non-invented trust language (process clarity, advisory scope, consultation framing) for ${pageName}.`,
      suggestedFollowUps: [
        'Suggest safe trust language instead',
        'What would you change first?',
        'How can I make this page convert better?',
        'Is this headline strong enough?',
      ],
    };
  }

  let reply: string;
  if (/convert|conversion|cta/i.test(lower)) {
    reply = hvcg
      ? `On ${pageName}, conversion improves when the first screen states the capital-advisory outcome, names the business-owner audience, and offers one clear consultation CTA. Current headline context: “${headline.slice(0, 120) || 'not set'}”. ${top ? `Highest-value next step: ${top.recommendation}.` : ''} I will only propose changes — nothing publishes without your approval.`
      : `Focus ${pageName} on one primary outcome and one primary CTA. ${top ? `Start with: ${top.recommendation}.` : ''}`;
  } else if (/headline|h1/i.test(lower)) {
    reply = headline
      ? `Your current headline is: “${headline}”. ${hvcg ? 'It should reinforce strategic capital advisory, growth, capital access, and enterprise value without inventing performance claims.' : 'Judge it on clarity, outcome, and audience fit.'} I can draft 3 options for you to choose or edit.`
      : `I do not see a strong headline on ${pageName} yet. I can propose 3 options for your review.`;
  } else if (/seo/i.test(lower)) {
    reply = `SEO opportunities on ${pageName} usually start with title/meta clarity, H1 alignment, and alt text — not keyword stuffing. ${context.analysis?.quickWins?.find((q) => q.category === 'SEO')?.recommendation || 'Run Analyze This Page for a prioritized list.'} No metadata changes apply until you approve exact wording.`;
  } else if (/credibility|trust|proof/i.test(lower)) {
    reply = `Credibility should come from process clarity, positioning, and verified proof only. ${hvcg ? 'Do not add capital raised, approval rates, or client counts unless a source is verified — those require VERIFICATION REQUIRED.' : 'Avoid unverified statistics.'} I can suggest safe trust elements (process steps, advisory scope, consultation framing).`;
  } else if (/premium|brand/i.test(lower)) {
    reply = `A more premium feel usually comes from tighter messaging hierarchy, confident advisory tone, restrained claims, and a single strong CTA — not denser copy. On ${pageName}, start by sharpening the hero and removing generic filler.`;
  } else {
    reply = `Based on ${pageName} for ${context.website.websiteName}: ${top ? `I would change this first — ${top.recommendation} (${top.impact} impact, ${top.effort} effort). ${top.reason}` : 'Run Analyze This Page to get a scored opportunity list.'} I recommend and draft only; Production publishing always needs your explicit authorization.`;
  }

  return {
    reply,
    suggestedFollowUps: [
      'What would you change first?',
      'Is this headline strong enough?',
      'How can I make this page convert better?',
      'What SEO opportunities am I missing?',
      'Give me 3 headline options',
    ],
  };
}

export async function checkPreviewHealth(previewUrl: string | null): Promise<{
  status: 'running' | 'offline' | 'unknown';
  url: string | null;
  checkedAt: string;
}> {
  const checkedAt = nowIso();
  if (!previewUrl) return { status: 'unknown', url: null, checkedAt };
  const match = previewUrl.match(/https?:\/\/(?:127\.0\.0\.1|localhost)(:\d+)?\/?/i);
  if (!match) {
    // Non-local URLs are not probed from Hub for safety
    return { status: 'unknown', url: previewUrl, checkedAt };
  }
  const url = match[0].endsWith('/') ? match[0] : `${match[0]}/`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(url, { method: 'GET', signal: controller.signal });
    clearTimeout(timer);
    return { status: res.ok ? 'running' : 'offline', url, checkedAt };
  } catch {
    return { status: 'offline', url, checkedAt };
  }
}

export { friendlyPageName };
