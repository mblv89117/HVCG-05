/**
 * Capital Operations HTTP errors. Never include secrets or PII dumps.
 */

export const CAPITAL_BACKEND_UNAVAILABLE = 'CAPITAL_BACKEND_UNAVAILABLE';

export class CapitalHttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly classification?: string;
  constructor(status: number, code: string, message: string, classification?: string) {
    super(message);
    this.name = 'CapitalHttpError';
    this.status = status;
    this.code = code;
    this.classification = classification;
  }
}

export function capitalInfrastructureError(
  code = CAPITAL_BACKEND_UNAVAILABLE,
  message = 'SharePoint capital backend is unavailable.',
): CapitalHttpError {
  return new CapitalHttpError(503, code, message, 'unavailable');
}

export function forbidden(message = 'Access denied: client not in principal scope'): never {
  throw new CapitalHttpError(403, 'forbidden', message);
}

export function notFound(message = 'Capital opportunity not found'): never {
  throw new CapitalHttpError(404, 'not_found', message);
}

export function conflict(message: string, code = 'conflict'): never {
  throw new CapitalHttpError(409, code, message);
}

export function unprocessable(message: string): never {
  throw new CapitalHttpError(422, 'unprocessable', message);
}

export function badRequest(message: string, code = 'malformed_json'): never {
  throw new CapitalHttpError(400, code, message);
}

export function toCapitalErrorBody(err: CapitalHttpError): Record<string, unknown> {
  return {
    error: err.code,
    code: err.code,
    message: err.message,
    ...(err.classification ? { classification: err.classification } : {}),
  };
}
