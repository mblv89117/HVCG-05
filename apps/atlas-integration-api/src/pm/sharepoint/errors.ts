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

export function pmNotImplemented(message = 'This PM operation is not implemented for the SharePoint MVP.'): PmHttpError {
  return new PmHttpError(501, 'PM_OPERATION_NOT_IMPLEMENTED', message, 'unsupported');
}

export function toErrorBody(err: PmHttpError): Record<string, unknown> {
  return {
    error: err.code,
    code: err.code,
    message: err.message,
    ...(err.classification ? { classification: err.classification } : {}),
  };
}
