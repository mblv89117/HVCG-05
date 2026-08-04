/**
 * Ollama executor configuration types (no machine secrets).
 */

export interface OllamaExecutorConfig {
  baseUrl: string;
  model: string;
  timeoutMs: number;
  maxRetries: number;
  allowNonLoopback: boolean;
  formatJson: boolean;
}

export const DEFAULT_OLLAMA_EXECUTOR_CONFIG: OllamaExecutorConfig = {
  baseUrl: 'http://127.0.0.1:11434',
  model: '', // must be discovered or set — never assumed in code defaults for production use
  timeoutMs: 120_000,
  maxRetries: 1,
  allowNonLoopback: false,
  formatJson: true,
};

export function isLoopbackUrl(urlString: string): boolean {
  try {
    const u = new URL(urlString);
    const host = u.hostname.toLowerCase();
    return host === '127.0.0.1' || host === 'localhost' || host === '::1';
  } catch {
    return false;
  }
}

export function assertLoopbackBaseUrl(baseUrl: string, allowNonLoopback: boolean): void {
  if (allowNonLoopback) return;
  if (!isLoopbackUrl(baseUrl)) {
    throw Object.assign(
      new Error(`Ollama base URL must be loopback-only (got ${baseUrl})`),
      { status: 400, code: 'non_loopback_rejected' },
    );
  }
}

export interface OllamaDiscoverySnapshot {
  discoveredAt: string;
  baseUrl: string;
  version?: string;
  loopbackBound: boolean;
  models: Array<{
    name: string;
    size?: number;
    parameterSize?: string;
    quantization?: string;
    contextLength?: number;
  }>;
  selectedModel: string | null;
  openWebUiDetected: boolean;
  openWebUiNote: string;
  authRequired: boolean;
  healthy: boolean;
  error?: string;
}
