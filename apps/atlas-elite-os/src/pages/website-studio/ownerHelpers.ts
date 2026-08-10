/**
 * Owner-facing helpers for Website Studio (Phase 6B-UX).
 * Keeps Git/source details out of default Owner Mode.
 */

const ROUTE_LABELS: Record<string, string> = {
  '/': 'Home',
  '/about': 'About Us',
  '/funding': 'Funding',
  '/capital-advisory': 'Capital Advisory',
  '/case-studies': 'Case Studies',
  '/faq': 'FAQ',
  '/contact': 'Contact',
  '/book-appointment': 'Book a Strategy Call',
  '/book-strategy-call': 'Book a Strategy Call',
  '/client-portal': 'Client Portal',
  '/blog': 'Blog',
  '/careers': 'Careers',
  '/privacy': 'Privacy',
  '/terms': 'Terms',
  '/accessibility': 'Accessibility',
};

export type StudioNavId =
  | 'home'
  | 'pages'
  | 'content'
  | 'media'
  | 'blog'
  | 'seo'
  | 'forms'
  | 'analytics'
  | 'drafts'
  | 'approvals'
  | 'publishing'
  | 'history'
  | 'advisor'
  | 'advanced'
  | 'settings'
  | 'editor'
  | 'review';

export const STUDIO_NAV: Array<{
  group: string;
  items: Array<{ id: StudioNavId; label: string }>;
}> = [
  { group: 'OVERVIEW', items: [{ id: 'home', label: 'Website Home' }] },
  {
    group: 'EDIT',
    items: [
      { id: 'pages', label: 'Pages' },
      { id: 'content', label: 'Content' },
      { id: 'media', label: 'Media' },
      { id: 'blog', label: 'Blog' },
    ],
  },
  {
    group: 'GROWTH',
    items: [
      { id: 'seo', label: 'SEO' },
      { id: 'forms', label: 'Forms' },
      { id: 'analytics', label: 'Analytics' },
    ],
  },
  {
    group: 'CHANGES',
    items: [
      { id: 'drafts', label: 'Draft Changes' },
      { id: 'approvals', label: 'Approvals' },
      { id: 'publishing', label: 'Publishing' },
      { id: 'history', label: 'History' },
    ],
  },
  { group: 'TOOLS', items: [{ id: 'advisor', label: 'AI Website Assistant' }] },
  {
    group: 'ADVANCED',
    items: [
      { id: 'advanced', label: 'Developer Details' },
      { id: 'settings', label: 'Website Settings' },
    ],
  },
];

export function friendlyPageName(page: {
  route?: unknown;
  pageTitle?: unknown;
}): string {
  const route = String(page.route || '/');
  if (ROUTE_LABELS[route]) return ROUTE_LABELS[route];
  const title = String(page.pageTitle || '')
    .replace(/\.html$/i, '')
    .trim();
  if (title && !/^[\w.-]+\.html$/i.test(title) && title !== route) {
    return title
      .split(/[-_/ ]+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  const slug = route.replace(/^\//, '') || 'home';
  return slug
    .split(/[-_/]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function displayHost(url: unknown): string {
  try {
    const u = new URL(String(url || ''));
    return u.host.replace(/^www\./, '');
  } catch {
    return String(url || '—').replace(/^https?:\/\//, '').replace(/\/$/, '');
  }
}

export function ownerChangeTitle(cr: Record<string, unknown>): string {
  if (cr.phase6bPilot || cr.changeRequestId === 'wcr_96016971141f') {
    return 'Homepage Headline Updated';
  }
  const reason = String(cr.reason || cr.naturalLanguageRequest || 'Website change');
  if (/headline|h1/i.test(reason)) return 'Homepage Hero Headline';
  if (/meta description/i.test(reason)) return 'SEO Meta Description';
  if (/cta/i.test(reason)) return 'Call-to-Action Update';
  if (/faq/i.test(reason)) return 'FAQ Update';
  return reason.length > 64 ? `${reason.slice(0, 61)}…` : reason;
}

export function ownerChangeStatus(cr: Record<string, unknown>): string {
  if (cr.phase6bPilot || cr.changeRequestId === 'wcr_96016971141f') {
    if (cr.visualQaConfirmedByManny) return 'Visual Approval Complete';
    if (cr.status === 'Committed' || cr.qaStatus === 'WAITING ON MANNY') {
      return 'Waiting for Visual Approval';
    }
  }
  const status = String(cr.status || '');
  const map: Record<string, string> = {
    Draft: 'Draft',
    'AI Preparing': 'AI Preparing',
    'Ready for Preview': 'Ready to Preview',
    'QA Required': 'Needs Review',
    'Waiting on Manny': 'Needs My Approval',
    'Approved for Git': 'Approved',
    Committed: 'Saved locally',
    'PR Open': 'Ready to Publish',
    Rejected: 'Rejected',
    Cancelled: 'Cancelled',
    Deployed: 'Published',
  };
  return map[status] || status;
}

export function ownerRiskLabel(tierOrRisk: unknown): string {
  const t = String(tierOrRisk || '');
  if (/Tier A|Low/i.test(t)) return 'Low';
  if (/Tier B|Medium/i.test(t)) return 'Medium';
  if (/Tier C|High/i.test(t)) return 'Higher — developer review';
  if (/Tier D|Critical/i.test(t)) return 'Restricted';
  return t || 'Low';
}

export function inferSections(blocks: Array<Record<string, unknown>>): string[] {
  const order = [
    'Hero',
    'About',
    'Services',
    'Capital Advisory',
    'How It Works',
    'Testimonials',
    'FAQ',
    'CTA',
    'Footer',
  ];
  const found = new Set<string>();
  for (const b of blocks) {
    const type = String(b.blockType || '');
    if (type === 'headline' || type === 'subheadline') found.add('Hero');
    else if (type === 'service description') found.add('Services');
    else if (type === 'testimonial') found.add('Testimonials');
    else if (type === 'FAQ') found.add('FAQ');
    else if (type === 'CTA') found.add('CTA');
    else if (type === 'footer content') found.add('Footer');
    else if (type === 'paragraph') found.add('About');
  }
  if (found.size === 0) found.add('Hero');
  return order.filter((s) => found.has(s));
}

export function sectionForBlock(block: Record<string, unknown>): string {
  const type = String(block.blockType || '');
  if (type === 'headline' || type === 'subheadline') return 'Hero';
  if (type === 'service description') return 'Services';
  if (type === 'testimonial') return 'Testimonials';
  if (type === 'FAQ') return 'FAQ';
  if (type === 'CTA') return 'CTA';
  if (type === 'footer content') return 'Footer';
  return 'Content';
}

export function previewUrlFromWebsite(website: Record<string, unknown> | null | undefined): string | null {
  if (!website) return null;
  const staging = String(website.stagingUrl || '');
  const m = staging.match(/https?:\/\/127\.0\.0\.1:\d+|https?:\/\/localhost:\d+/i);
  if (m) return m[0].endsWith('/') ? m[0] : `${m[0]}/`;
  for (const key of ['previewUrl']) {
    const v = String((website as Record<string, unknown>)[key] || '');
    if (/127\.0\.0\.1|localhost/i.test(v)) {
      const x = v.match(/https?:\/\/[^ )\s]+/);
      if (x) return x[0];
    }
  }
  return null;
}

export const ADVISOR_PROMPTS = [
  'How can I make this page convert better?',
  'What would you change first?',
  'Is this headline strong enough?',
  'Does this page clearly explain what HVCG does?',
  'What SEO opportunities am I missing?',
  'Should I add more credibility here?',
  'Make this feel more premium.',
  'Would a business owner understand this immediately?',
  'What is the highest-value change on this page?',
];
