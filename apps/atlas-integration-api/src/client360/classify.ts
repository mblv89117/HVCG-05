import type { CanonicalEntityKind } from '@hvcg/atlas-integration-core';

const RULES: Array<{ kind: CanonicalEntityKind; re: RegExp }> = [
  { kind: 'Invoice', re: /\b(invoice|inv[#\s-]?\d|billing statement|payment due)\b/i },
  { kind: 'Proposal', re: /\b(proposal|rfp|quote|engagement letter|scope of work|sow)\b/i },
  { kind: 'FundingRequest', re: /\b(funding|capital raise|term sheet|investment memo|raise)\b/i },
  { kind: 'Agreement', re: /\b(agreement|contract|msa|nda|mou|statement of work|loa)\b/i },
  { kind: 'Deliverable', re: /\b(deliverable|final report|work product|deck|presentation)\b/i },
  { kind: 'Note', re: /\b(meeting notes|call notes|memo|one-on-one|1:1)\b/i },
  { kind: 'Project', re: /\b(project plan|roadmap|milestone|workstream)\b/i },
];

/** Classify a document / attachment title into a Client 360 entity kind. */
export function classifyByTitle(title: string | undefined | null): CanonicalEntityKind {
  const t = title || '';
  for (const rule of RULES) {
    if (rule.re.test(t)) return rule.kind;
  }
  return 'Document';
}

export const INTERNAL_ORG_DOMAINS = new Set([
  'highvaluecapitalgroup.com',
  'highvaluesolution.com',
  'highvaluesolutions.com',
  'hvcg.com',
]);

/** Marketing / SaaS / platform domains — not client organizations. */
export const VENDOR_NOISE_DOMAINS = new Set([
  'linkedin.com',
  'facebook.com',
  'twitter.com',
  'x.com',
  'instagram.com',
  'youtube.com',
  'google.com',
  'gmail.com',
  'microsoft.com',
  'office365.com',
  'sharepoint.com',
  'adobe.com',
  'adobesign.com',
  'echosign.com',
  'docusign.com',
  'docusign.net',
  'zoom.us',
  'zoom.com',
  'calendly.com',
  'amazon.com',
  'aws.amazon.com',
  'mailchimp.com',
  'constantcontact.com',
  'hubspot.com',
  'salesforce.com',
  'stripe.com',
  'paypal.com',
  'intuit.com',
  'quickbooks.com',
  'dropbox.com',
  'box.com',
  'notion.so',
  'slack.com',
  'atlassian.com',
  'github.com',
  'noreply',
  'email.linkedin.com',
  'linkedin.email',
  'notifications.google.com',
  'accountprotection.microsoft.com',
  'microsoftonline.com',
  'onmicrosoft.com',
  'aircall.io',
  'apollo.io',
  'sendgrid.net',
  'mailgun.org',
  'postmarkapp.com',
]);

export function isInternalDomain(domain: string | undefined | null): boolean {
  if (!domain) return false;
  const d = domain.toLowerCase();
  return INTERNAL_ORG_DOMAINS.has(d) || [...INTERNAL_ORG_DOMAINS].some((x) => d.endsWith(`.${x}`));
}

export function isConsumerDomain(domain: string): boolean {
  return (
    /^(gmail|googlemail|outlook|hotmail|yahoo|icloud|aol|live|msn)\./i.test(domain) ||
    /^(gmail|outlook|hotmail|yahoo|icloud)\.com$/i.test(domain)
  );
}

export function isVendorNoiseDomain(domain: string | undefined | null): boolean {
  if (!domain) return false;
  const d = domain.toLowerCase();
  if (VENDOR_NOISE_DOMAINS.has(d)) return true;
  for (const v of VENDOR_NOISE_DOMAINS) {
    if (d === v || d.endsWith(`.${v}`)) return true;
  }
  // transactional / no-reply style hosts
  if (/^(no-?reply|mailer|notify|notifications|bounce|email)\./i.test(d)) return true;
  return false;
}
