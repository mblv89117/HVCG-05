/**
 * Map fabric index rows onto the existing HVCG_Communications / HVCG_Meetings
 * Graph list schema. Do not invent columns, ClientCodes, or Hub-MI lists.
 */

export const COMMUNICATION_CHANNELS = ['Email', 'Teams', 'Phone', 'In Person', 'Portal', 'Other'] as const;
export const COMMUNICATION_DIRECTIONS = ['Inbound', 'Outbound', 'Internal'] as const;
export const MEETING_TYPES = ['Client', 'Internal', 'Lender', 'Investor', 'Advisor', 'Other'] as const;

export const COMMUNICATION_SCHEMA_FIELDS = [
  'Title',
  'ClientId',
  'ClientIdLookupId',
  'ClientCode',
  'Channel',
  'Direction',
  'CommunicationDate',
  'OwnerEmail',
  'Summary',
  'RequiresFollowUp',
  'FollowUpTaskId',
  'FollowUpTaskIdLookupId',
  'IsMeaningfulContact',
  'ApprovalRequiredBeforeSend',
  'SendApproved',
] as const;

export const MEETING_SCHEMA_FIELDS = [
  'Title',
  'ClientId',
  'ClientIdLookupId',
  'ClientCode',
  'MeetingType',
  'MeetingDate',
  'Attendees',
  'Objective',
  'Summary',
  'OutlookEventLink',
] as const;

const KNOWN_WRITE_FIELDS = new Set<string>([
  ...COMMUNICATION_SCHEMA_FIELDS,
  ...MEETING_SCHEMA_FIELDS,
  'HVCG_IdempotencyKey',
  'SourceMessageId',
  'ConversationId',
  'OutlookWebLink',
  'Classification',
  'ProvenanceSource',
  'SourceOrg',
  'TeamsMeetingLink',
  'NotesFileLink',
]);

const UNKNOWN_COMMUNICATION_FIELDS = [
  'HVCG_IdempotencyKey',
  'SourceMessageId',
  'ConversationId',
  'OutlookWebLink',
  'Classification',
  'ProvenanceSource',
  'SourceOrg',
] as const;

const UNKNOWN_MEETING_FIELDS = ['HVCG_IdempotencyKey', 'Classification', 'ProvenanceSource', 'SourceOrg'] as const;

const QUOTED_FIELD_RE = /['`]([A-Za-z][A-Za-z0-9_]{1,63})['`]/g;
const ASSIGNED_FIELD_RE = /field=([A-Za-z][A-Za-z0-9_]{1,63})/g;
const CLIENT_CODE_RE = /\b[A-Z]{2,8}\d{2}\b/g;
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const URL_RE = /https?:\/\/[^\s]+/gi;
const BEARER_RE = /Bearer\s+[A-Za-z0-9._-]+/gi;
const GRAPH_CODE_RE = /^[A-Za-z][A-Za-z0-9._-]{0,63}$/;

export type GraphWriteMismatch =
  | 'unknown_field'
  | 'required_field'
  | 'invalid_type'
  | 'invalid_request'
  | 'server_error'
  | 'other';

export type GraphWriteErrorInfo = {
  graphCode: string;
  fields: string[];
  mismatch: GraphWriteMismatch;
  sanitizedMessage: string;
};

function uniqueFields(names: string[]): string[] {
  return [...new Set(names.filter((name) => KNOWN_WRITE_FIELDS.has(name)))].slice(0, 6);
}

export function sanitizeGraphWriteText(raw: string): string {
  return raw
    .replace(URL_RE, '[url-redacted]')
    .replace(BEARER_RE, 'Bearer [redacted]')
    .replace(EMAIL_RE, '[email-redacted]')
    .replace(CLIENT_CODE_RE, '[client-redacted]')
    .replace(/['"][^'"]{16,}['"]/g, '[text-redacted]')
    .replace(/[A-Za-z0-9._-]{20,}/g, '[token-redacted]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240);
}

export function describeGraphListWriteError(status: number, json: unknown): GraphWriteErrorInfo {
  const err =
    json && typeof json === 'object' && !Array.isArray(json)
      ? (json as { error?: { code?: unknown; message?: unknown } }).error
      : undefined;
  const rawCode = typeof err?.code === 'string' ? err.code.trim() : '';
  const graphCode = GRAPH_CODE_RE.test(rawCode)
    ? rawCode
    : status >= 500
      ? 'server_error'
      : 'invalidRequest';
  const rawMessage = typeof err?.message === 'string' ? err.message : '';
  const fields = uniqueFields([
    ...[...rawMessage.matchAll(QUOTED_FIELD_RE)].map((m) => m[1]),
    ...[...rawMessage.matchAll(ASSIGNED_FIELD_RE)].map((m) => m[1]),
  ]);
  const lower = rawMessage.toLowerCase();
  let mismatch: GraphWriteMismatch = 'other';
  if (/does not exist|not recognized|unknown field|invalid field name|could not be found|is not a valid field/.test(lower)) {
    mismatch = 'unknown_field';
  } else if (/required|must be specified|missing value|cannot be empty/.test(lower)) {
    mismatch = 'required_field';
  } else if (
    /not valid|invalid type|incorrect type|cannot be converted|invalid value|too long|cannot be longer|invalid url/.test(
      lower,
    )
  ) {
    mismatch = 'invalid_type';
  } else if (status >= 500) {
    mismatch = 'server_error';
  } else if (status >= 400) {
    mismatch = 'invalid_request';
  }
  return {
    graphCode,
    fields,
    mismatch,
    sanitizedMessage: sanitizeGraphWriteText(rawMessage),
  };
}

export function formatGraphWriteFailure(status: number, json?: unknown): string {
  const info = describeGraphListWriteError(status, json);
  const fieldPart = info.fields.length ? `; field=${info.fields.join(',')}` : '';
  const messagePart = info.sanitizedMessage ? `; graphMessage=${info.sanitizedMessage}` : '';
  return `SharePoint PM Graph request failed (HTTP ${status}; graphCode=${info.graphCode}${fieldPart}; mismatch=${info.mismatch}${messagePart}).`;
}

export function fieldsFromWriteError(err: unknown): string[] {
  const message = err instanceof Error ? err.message : String(err || '');
  const named = [...message.matchAll(/field=([A-Za-z][A-Za-z0-9_]{1,63})/g)].map((m) => m[1]);
  return uniqueFields(named);
}

export function toSharePointDateTime(raw?: string): string | undefined {
  if (!raw || !raw.trim()) return undefined;
  let value = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value) && !/[zZ]|[+-]\d{2}:\d{2}$/.test(value)) {
    value = `${value.replace(/\.\d+$/, '')}Z`;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

/** SharePoint Hyperlink columns reject URLs longer than 255 characters. */
export const SHAREPOINT_HYPERLINK_MAX = 255;

const MEETING_OPTIONAL_FIELDS = [
  'OutlookEventLink',
  'TeamsMeetingLink',
  'NotesFileLink',
  'Summary',
  'Attendees',
  'Objective',
  'ClientCode',
  'ClientId',
  'ClientIdLookupId',
] as const;

export function asGraphUrlField(url?: string): { Url: string; Description: string } | undefined {
  if (!url || !/^https:\/\//i.test(url.trim())) return undefined;
  const href = url.trim();
  if (href.length > SHAREPOINT_HYPERLINK_MAX) return undefined;
  return { Url: href, Description: 'Source' };
}

export function existingClientLookupId(itemId?: string): number | undefined {
  if (!itemId) return undefined;
  const n = Number(itemId);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}

export function withIndexMeta(summary: string, opts: { webUrl?: string; idempotencyKey: string }): string {
  let out = (summary || '').trim();
  if (opts.webUrl && /^https:\/\//i.test(opts.webUrl) && !/\bSource:\s*https:\/\//i.test(out)) {
    out = `${out} Source: ${opts.webUrl}`.trim();
  }
  if (opts.idempotencyKey && !out.includes(`Key:${opts.idempotencyKey}`)) {
    out = `${out} Key:${opts.idempotencyKey}`.trim();
  }
  return out.slice(0, 2000);
}

export function communicationChannel(raw?: string): (typeof COMMUNICATION_CHANNELS)[number] {
  return COMMUNICATION_CHANNELS.includes(raw as (typeof COMMUNICATION_CHANNELS)[number])
    ? (raw as (typeof COMMUNICATION_CHANNELS)[number])
    : 'Email';
}

export function communicationDirection(raw?: string): (typeof COMMUNICATION_DIRECTIONS)[number] {
  return COMMUNICATION_DIRECTIONS.includes(raw as (typeof COMMUNICATION_DIRECTIONS)[number])
    ? (raw as (typeof COMMUNICATION_DIRECTIONS)[number])
    : 'Inbound';
}

export function meetingTypeForClient(clientCode?: string): (typeof MEETING_TYPES)[number] {
  return clientCode ? 'Client' : 'Other';
}

export function dropUnknownIndexFields(
  fields: Record<string, unknown>,
  kind: 'communication' | 'meeting',
  extra: string[] = [],
): Record<string, unknown> {
  const drop = new Set<string>(
    kind === 'communication' ? UNKNOWN_COMMUNICATION_FIELDS : UNKNOWN_MEETING_FIELDS,
  );
  for (const name of extra) drop.add(name);
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (drop.has(key)) continue;
    next[key] = value;
  }
  return next;
}

function dropMeetingOptionalFields(fields: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if ((MEETING_OPTIONAL_FIELDS as readonly string[]).includes(key)) continue;
    next[key] = value;
  }
  return next;
}

export function correctIndexWriteFields(
  fields: Record<string, unknown>,
  err: unknown,
  kind: 'communication' | 'meeting',
): Record<string, unknown> | null {
  const message = err instanceof Error ? err.message : String(err || '');
  if (/mismatch=required_field/.test(message)) return null;
  const mentioned = fieldsFromWriteError(err);
  let next = dropUnknownIndexFields(fields, kind, mentioned);
  for (const name of mentioned) {
    const value = next[name];
    if (
      (name === 'OutlookEventLink' || name === 'OutlookWebLink' || name === 'TeamsMeetingLink') &&
      typeof value === 'string'
    ) {
      const url = asGraphUrlField(value);
      if (url) next[name] = url;
      else delete next[name];
    }
  }
  if (
    kind === 'meeting' &&
    /mismatch=invalid_request|mismatch=invalid_type/.test(message) &&
    JSON.stringify(next) === JSON.stringify(fields)
  ) {
    next = dropMeetingOptionalFields(fields);
  }
  if (JSON.stringify(next) === JSON.stringify(fields)) return null;
  return next;
}

export async function retryIndexWrite<T>(
  write: (fields: Record<string, unknown>) => Promise<T>,
  fields: Record<string, unknown>,
  kind: 'communication' | 'meeting',
): Promise<T> {
  let current = fields;
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await write(current);
    } catch (err) {
      lastErr = err;
      const next = correctIndexWriteFields(current, err, kind);
      if (!next) throw err;
      current = next;
    }
  }
  throw lastErr;
}
