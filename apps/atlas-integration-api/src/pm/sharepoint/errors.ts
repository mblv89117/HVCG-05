/**
 * SharePoint PM HTTP / infrastructure errors.
 * Never include tokens or secrets in messages.
 */

export class PmHttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly classification?: string;

  constructor(status: number, code: string, message: string, classification?: string) {
    super(message);
    this.name = 'PmHttpError';
    this.status = status;
    this.code = code;
    this.classification = classification;
  }
}

export function pmInfrastructureError(
  code = 'PM_BACKEND_UNAVAILABLE',
  message = 'SharePoint PM backend is unavailable.',
): PmHttpError {
  return new PmHttpError(503, code, message, 'unavailable');
}

export type ListWalkTruncationReason = 'repeated_next_link' | 'page_cap' | 'scope_not_honored';

/** Configured HVCG_* name only. Never a nextLink, token, GUID, or item title. */
export function safeListWalkKey(raw: string): string {
  const trimmed = raw.trim();
  if (/^HVCG_[A-Za-z0-9_]{1,40}$/.test(trimmed)) return trimmed;
  if (/^[A-Za-z][A-Za-z0-9_]{0,40}$/.test(trimmed)) return trimmed;
  return 'configured_list';
}

/**
 * Graph list walk stopped on a repeated nextLink or the page cap.
 * Not a complete list. The body names the list and the stop reason only.
 */
export class ListWalkTruncatedError extends PmHttpError {
  readonly reason: ListWalkTruncationReason;
  readonly listKey: string;
  readonly pagesFetched: number;

  constructor(opts: {
    reason: ListWalkTruncationReason;
    listKey: string;
    pagesFetched: number;
  }) {
    const listKey = safeListWalkKey(opts.listKey);
    const pagesFetched =
      Number.isInteger(opts.pagesFetched) && opts.pagesFetched >= 0 && opts.pagesFetched <= 10_000
        ? opts.pagesFetched
        : 0;
    super(
      503,
      'LIST_WALK_TRUNCATED',
      `SharePoint list walk stopped before the list was complete. list=${listKey}; reason=${opts.reason}; pagesFetched=${pagesFetched}.`,
      'unavailable',
    );
    this.name = 'ListWalkTruncatedError';
    this.reason = opts.reason;
    this.listKey = listKey;
    this.pagesFetched = pagesFetched;
  }
}

/**
 * Client-scoped walk hit the page cap. Same fail-closed truncation as
 * ListWalkTruncatedError, plus a count of items observed (no titles).
 */
export class ScopedListWalkTruncatedError extends ListWalkTruncatedError {
  readonly itemsFetched: number;

  constructor(opts: {
    reason: ListWalkTruncationReason;
    listKey: string;
    pagesFetched: number;
    itemsFetched: number;
  }) {
    super({ reason: opts.reason, listKey: opts.listKey, pagesFetched: opts.pagesFetched });
    this.name = 'ScopedListWalkTruncatedError';
    const n = opts.itemsFetched;
    this.itemsFetched = Number.isInteger(n) && n >= 0 && n <= 1_000_000 ? n : 0;
  }
}

/**
 * Indexed ClientCode equality was not applied.
 * Not a workspace token failure and not a finished list.
 */
export class IndexedClientCodeScopeRejectedError extends Error {
  readonly code = 'INDEXED_CLIENT_CODE_SCOPE_REJECTED';

  constructor() {
    super('Indexed ClientCode list scope was rejected.');
    this.name = 'IndexedClientCodeScopeRejectedError';
  }
}

export function pmNotImplemented(message = 'This PM operation is not implemented for the SharePoint MVP.'): PmHttpError {
  return new PmHttpError(501, 'PM_OPERATION_NOT_IMPLEMENTED', message, 'unsupported');
}

export function toErrorBody(err: PmHttpError): Record<string, unknown> {
  const body: Record<string, unknown> = {
    error: err.code,
    code: err.code,
    message: err.message,
    ...(err.classification ? { classification: err.classification } : {}),
  };
  if (err instanceof ListWalkTruncatedError) {
    body.listDisplayName = err.listKey;
    body.listKey = err.listKey;
    body.reason = err.reason;
    body.pagesFetched = err.pagesFetched;
  }
  return body;
}
