/**
 * Information-fabric classification. AI may suggest; it never authorizes.
 * HIGH auto-associates a ClientCode. MEDIUM needs more evidence. LOW stays ledger.
 */

import { isCanonicalClientCode } from '../../../entitlements/clientCode.ts';

export const FABRIC_CLASSES = [
  'HVCG_BUSINESS',
  'CLIENT',
  'PROSPECT',
  'VENDOR',
  'REFERRAL_PARTNER',
  'INTERNAL',
  'PERSONAL_UNRELATED',
  'RESTRICTED',
  'UNRESOLVED',
] as const;

export type FabricClass = (typeof FABRIC_CLASSES)[number];
export type AssociationConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ClientHint {
  clientCode: string;
  displayName: string;
  dba?: string;
  domains: string[];
}

export interface ClassifyInput {
  subject?: string;
  participants?: string[];
  preview?: string;
  webUrl?: string;
  source?: string;
}

export interface ClassifyResult {
  classification: FabricClass;
  confidence: AssociationConfidence;
  clientCode?: string;
  ingest: 'ordinary' | 'metadata_link' | 'skip';
  reason: string;
}

const RESTRICTED_RE =
  /\b(ssn|social security|itin|passport|driver'?s license|routing number|account number|aba |cvv|cvc|pin\b|password|passwd|mfa|one[- ]time (code|password)|otp\b|magic link|api[_-]?key|secret[_-]?key|bearer |refresh token|private key|w-?2\b|w-?9\b|1099|tax id|ein\b|payroll|health insurance|hipaa|medical record|diagnosis|credit report|pfs\b|personal financial)\b/i;

const SECRET_RE =
  /\b(password|passwd|mfa|otp|one[- ]time|magic link|api[_-]?key|secret[_-]?key|bearer [a-z0-9._-]{12,}|refresh token|private key|cvv|cvc)\b/i;

const PERSONAL_RE =
  /\b(netflix|spotify|amazon\.com order|uber eats|doordash|personal (gmail|icloud)|family photo|birthday party)\b/i;

const VENDOR_RE = /\b(loanspark|kapitus|credibly|capital funding partner)\b/i;
const INTERNAL_RE = /\b(highvaluecapitalgroup\.com|hvcg\b|high value solutions|hvs\b)\b/i;
const CLIENT_LIBRARY_RE = /\bHVCG_([A-Z]{2,8}\d{2})\b/;
const RESTRICTED_PATH_RE =
  /\b(ownership and management|historical financials|current financials|tax returns|bank statements|debt schedule|accounts receivable|accounts payable|payroll and employees)\b/i;

export function classifyDriveItem(
  input: { name?: string; webUrl?: string; parentPath?: string },
  clients: ClientHint[],
): ClassifyResult {
  const hay = [input.name, input.webUrl, input.parentPath].filter(Boolean).join(' ');
  const lib = CLIENT_LIBRARY_RE.exec(hay);
  const libraryCode = lib && clients.some((c) => c.clientCode === lib[1]) ? lib[1] : undefined;
  if (SECRET_RE.test(hay) || RESTRICTED_RE.test(hay) || RESTRICTED_PATH_RE.test(hay)) {
    return {
      classification: 'RESTRICTED',
      confidence: 'HIGH',
      clientCode: libraryCode,
      ingest: 'metadata_link',
      reason: 'Restricted financial/identity folder or content — metadata and source link only.',
    };
  }
  if (libraryCode) {
    return {
      classification: 'CLIENT',
      confidence: 'HIGH',
      clientCode: libraryCode,
      ingest: 'ordinary',
      reason: `HIGH library association HVCG_${libraryCode}.`,
    };
  }
  return classifyFabricRecord(
    { subject: input.name, preview: hay, webUrl: input.webUrl, source: 'sharepoint' },
    clients,
  );
}

export function stripSecrets(text: string): string {
  return text
    .replace(SECRET_RE, '[REDACTED]')
    .replace(/\b[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g, '[JWT_REDACTED]')
    .slice(0, 240);
}

export function classifyFabricRecord(input: ClassifyInput, clients: ClientHint[]): ClassifyResult {
  const hay = [input.subject, input.preview, ...(input.participants || [])].filter(Boolean).join(' ');
  if (SECRET_RE.test(hay) || RESTRICTED_RE.test(hay)) {
    return {
      classification: 'RESTRICTED',
      confidence: 'HIGH',
      ingest: 'metadata_link',
      reason: 'Restricted financial/identity/secret content — metadata and source link only.',
    };
  }
  if (PERSONAL_RE.test(hay)) {
    return {
      classification: 'PERSONAL_UNRELATED',
      confidence: 'HIGH',
      ingest: 'skip',
      reason: 'Personal/unrelated — not ordinary Atlas operating info.',
    };
  }

  const high = matchClient(hay, clients, 'HIGH');
  if (high) {
    return {
      classification: 'CLIENT',
      confidence: 'HIGH',
      clientCode: high.clientCode,
      ingest: 'ordinary',
      reason: `HIGH association to ${high.clientCode}.`,
    };
  }

  if (VENDOR_RE.test(hay)) {
    const borrower = matchClient(hay, clients, 'HIGH');
    return {
      classification: 'VENDOR',
      confidence: borrower ? 'HIGH' : 'MEDIUM',
      clientCode: borrower?.clientCode,
      ingest: 'ordinary',
      reason: borrower
        ? `Vendor/capital partner attached to ${borrower.clientCode} capital matter.`
        : 'Vendor/capital partner — not a client.',
    };
  }

  if (INTERNAL_RE.test(hay) && !high) {
    return {
      classification: 'INTERNAL',
      confidence: 'MEDIUM',
      ingest: 'ordinary',
      reason: 'Internal HVCG/HVS correspondence.',
    };
  }

  const medium = matchClient(hay, clients, 'MEDIUM');
  if (medium) {
    return {
      classification: 'UNRESOLVED',
      confidence: 'MEDIUM',
      ingest: 'skip',
      reason: `MEDIUM mention of ${medium.clientCode} — more evidence required.`,
    };
  }

  return {
    classification: 'UNRESOLVED',
    confidence: 'LOW',
    ingest: 'skip',
    reason: 'No HIGH business association.',
  };
}

function matchClient(
  hay: string,
  clients: ClientHint[],
  level: AssociationConfidence,
): ClientHint | undefined {
  const lower = hay.toLowerCase();
  for (const c of clients) {
    if (!isCanonicalClientCode(c.clientCode)) continue;
    if (hay.includes(c.clientCode)) return c;
    if (level === 'HIGH') {
      for (const domain of c.domains) {
        if (domain && lower.includes(domain.toLowerCase())) return c;
      }
      const name = c.displayName.trim().toLowerCase();
      if (name.length >= 6 && lower.includes(name)) return c;
      const dba = (c.dba || '').trim().toLowerCase();
      if (dba.length >= 6 && lower.includes(dba)) return c;
    }
  }
  return undefined;
}
