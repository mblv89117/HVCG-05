/**
 * Configurable redaction / preprocessing for Local AI Phase 2.
 * Original unredacted content must not be written to general application logs.
 */

export const REDACTION_POLICY_VERSION = '1.0.0-phase2';

export interface RedactionOptions {
  maskClientNames?: string[];
  maskFinancialValues?: boolean;
}

export interface RedactionFinding {
  type: string;
  count: number;
}

export interface RedactionResult {
  policyVersion: typeof REDACTION_POLICY_VERSION;
  redactedText: string;
  fieldsRedacted: RedactionFinding[];
  redactionCount: number;
  manualReviewRequired: boolean;
  blocked: boolean;
  blockReason?: string;
}

const PATTERNS: Array<{ type: string; re: RegExp; replace: string }> = [
  { type: 'ssn', re: /\b\d{3}-\d{2}-\d{4}\b/g, replace: '[REDACTED_SSN]' },
  { type: 'ssn_compact', re: /\b\d{9}\b/g, replace: '[REDACTED_ID_NUM]' },
  { type: 'credit_card', re: /\b(?:\d[ -]*?){13,19}\b/g, replace: '[REDACTED_CARD]' },
  { type: 'routing_number', re: /\brouting(?:\s*(?:number|#|no\.?))?\s*[:#]?\s*\d{9}\b/gi, replace: '[REDACTED_ROUTING]' },
  { type: 'bank_account', re: /\b(?:account|acct)(?:\s*(?:number|#|no\.?))?\s*[:#]?\s*\d{6,17}\b/gi, replace: '[REDACTED_ACCOUNT]' },
  { type: 'tax_id', re: /\b\d{2}-\d{7}\b/g, replace: '[REDACTED_TAX_ID]' },
  { type: 'email', re: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, replace: '[REDACTED_EMAIL]' },
  { type: 'phone', re: /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g, replace: '[REDACTED_PHONE]' },
  {
    type: 'private_key',
    re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    replace: '[REDACTED_PRIVATE_KEY]',
  },
  {
    type: 'api_key',
    re: /\b(?:sk|pk|api|key|token)[-_]?[A-Za-z0-9]{16,}\b/gi,
    replace: '[REDACTED_API_KEY]',
  },
  {
    type: 'password',
    re: /\b(?:password|passwd|pwd)\s*[:=]\s*\S+/gi,
    replace: '[REDACTED_PASSWORD]',
  },
  {
    type: 'bearer_token',
    re: /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
    replace: '[REDACTED_BEARER]',
  },
  {
    type: 'aws_key',
    re: /\bAKIA[0-9A-Z]{16}\b/g,
    replace: '[REDACTED_AWS_KEY]',
  },
];

const FINANCIAL_VALUE_RE = /\$\s?\d{1,3}(?:,\d{3})+(?:\.\d{2})?|\b\d+\.\d{2}\s*(?:USD|usd)\b/g;

export function redactText(input: string, opts: RedactionOptions = {}): RedactionResult {
  if (typeof input !== 'string') {
    return {
      policyVersion: REDACTION_POLICY_VERSION,
      redactedText: '',
      fieldsRedacted: [],
      redactionCount: 0,
      manualReviewRequired: true,
      blocked: true,
      blockReason: 'Redaction input must be a string',
    };
  }

  let text = input;
  const fieldsRedacted: RedactionFinding[] = [];
  let redactionCount = 0;

  for (const p of PATTERNS) {
    const matches = text.match(p.re);
    if (matches?.length) {
      fieldsRedacted.push({ type: p.type, count: matches.length });
      redactionCount += matches.length;
      text = text.replace(p.re, p.replace);
    }
  }

  if (opts.maskFinancialValues) {
    const matches = text.match(FINANCIAL_VALUE_RE);
    if (matches?.length) {
      fieldsRedacted.push({ type: 'financial_value', count: matches.length });
      redactionCount += matches.length;
      text = text.replace(FINANCIAL_VALUE_RE, '[REDACTED_AMOUNT]');
    }
  }

  for (const name of opts.maskClientNames || []) {
    const trimmed = name.trim();
    if (trimmed.length < 3) continue;
    const re = new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = text.match(re);
    if (matches?.length) {
      fieldsRedacted.push({ type: 'client_name', count: matches.length });
      redactionCount += matches.length;
      text = text.replace(re, '[REDACTED_CLIENT]');
    }
  }

  const credentialHeavy = fieldsRedacted.some((f) =>
    ['private_key', 'api_key', 'password', 'bearer_token', 'aws_key'].includes(f.type),
  );

  return {
    policyVersion: REDACTION_POLICY_VERSION,
    redactedText: text,
    fieldsRedacted,
    redactionCount,
    manualReviewRequired: credentialHeavy || redactionCount > 20,
    blocked: false,
  };
}
