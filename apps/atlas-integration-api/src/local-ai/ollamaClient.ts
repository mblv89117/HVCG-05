/**
 * Loopback-only Ollama HTTP client.
 */

import {
  assertLoopbackBaseUrl,
  type OllamaExecutorConfig,
} from '@hvcg/atlas-integration-core';

export interface OllamaChatResult {
  rawContent: string;
  model: string;
  evalCount?: number;
  evalDurationNs?: number;
  totalDurationNs?: number;
}

export class OllamaClient {
  constructor(private cfg: OllamaExecutorConfig) {
    assertLoopbackBaseUrl(cfg.baseUrl, cfg.allowNonLoopback);
  }

  getConfig(): OllamaExecutorConfig {
    return { ...this.cfg };
  }

  withModel(model: string): OllamaClient {
    return new OllamaClient({ ...this.cfg, model });
  }

  async health(): Promise<{ ok: boolean; version?: string; error?: string }> {
    try {
      const res = await fetch(`${this.cfg.baseUrl}/api/version`, {
        signal: AbortSignal.timeout(5_000),
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      const body = (await res.json()) as { version?: string };
      return { ok: true, version: body.version };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async listModels(): Promise<string[]> {
    const res = await fetch(`${this.cfg.baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) throw new Error(`Ollama tags failed: HTTP ${res.status}`);
    const body = (await res.json()) as { models?: Array<{ name: string }> };
    return (body.models || []).map((m) => m.name);
  }

  async chat(opts: {
    system: string;
    user: string;
    signal?: AbortSignal;
    model?: string;
  }): Promise<OllamaChatResult> {
    const model = opts.model || this.cfg.model;
    if (!model) {
      throw Object.assign(new Error('Ollama model not configured'), {
        status: 503,
        code: 'model_missing',
      });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort('timeout'), this.cfg.timeoutMs);
    const onAbort = () => controller.abort('cancelled');
    opts.signal?.addEventListener('abort', onAbort);

    try {
      const res = await fetch(`${this.cfg.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          stream: false,
          format: this.cfg.formatJson ? 'json' : undefined,
          messages: [
            { role: 'system', content: opts.system },
            { role: 'user', content: opts.user },
          ],
          options: {
            temperature: 0.2,
          },
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        if (res.status === 404) {
          throw Object.assign(new Error(`Model unavailable or not found: ${model}`), {
            status: 503,
            code: 'model_unavailable',
            detail: text.slice(0, 200),
          });
        }
        throw Object.assign(new Error(`Ollama chat failed: HTTP ${res.status}`), {
          status: 502,
          code: 'ollama_http_error',
          detail: text.slice(0, 200),
        });
      }

      const body = (await res.json()) as {
        message?: { content?: string };
        model?: string;
        eval_count?: number;
        eval_duration?: number;
        total_duration?: number;
      };
      const rawContent = body.message?.content || '';
      if (!rawContent) {
        throw Object.assign(new Error('Ollama returned empty content'), {
          status: 502,
          code: 'empty_response',
        });
      }
      return {
        rawContent,
        model: body.model || model,
        evalCount: body.eval_count,
        evalDurationNs: body.eval_duration,
        totalDurationNs: body.total_duration,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('timeout') || String(err).includes('timeout')) {
        throw Object.assign(new Error('Ollama request timed out'), {
          status: 504,
          code: 'timeout',
        });
      }
      if (msg.includes('cancelled') || opts.signal?.aborted) {
        throw Object.assign(new Error('Ollama request cancelled'), {
          status: 499,
          code: 'cancelled',
        });
      }
      if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed')) {
        throw Object.assign(new Error('Ollama connection refused / offline'), {
          status: 503,
          code: 'ollama_offline',
        });
      }
      throw err;
    } finally {
      clearTimeout(timer);
      opts.signal?.removeEventListener('abort', onAbort);
    }
  }
}
