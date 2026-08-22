/**
 * Optional Local AI adapter.
 *
 * Atlas boots without Ollama, models, or Local AI .data.
 * This adapter never creates sqlite stores, never writes .secrets,
 * and never probes the provider at construction time.
 */

import {
  loadLocalAiFeatureFlags,
  redactText,
  scanForInjection,
  buildLocalAiPrompt,
  extractJsonObject,
  validatePhase2OllamaOutput,
  isPhase3AllowedOperation,
  type LocalAiFeatureFlags,
  type OllamaExecutorConfig,
} from '@hvcg/atlas-integration-core';
import { OllamaClient } from './ollamaClient.ts';
import { loadLocalAiSecretsFile, resolveOllamaConfig } from './ollamaConfigLoader.ts';

export type LocalAiAvailability =
  | 'disabled'
  | 'misconfigured'
  | 'unavailable'
  | 'ready';

export interface LocalAiStatus {
  enabled: boolean;
  available: boolean;
  availability: LocalAiAvailability;
  reason: string;
  flags: LocalAiFeatureFlags;
  provider: {
    kind: 'ollama';
    baseUrl: string;
    modelConfigured: boolean;
    loopbackOnly: boolean;
  };
  probed: boolean;
}

export interface LocalAiCompleteInput {
  operation: string;
  sourceContent: string;
  sourceRecordType?: string;
  sourceRecordId?: string;
  jobId?: string;
}

export interface LocalAiAdapterDeps {
  env?: Record<string, string | undefined>;
  flags?: LocalAiFeatureFlags;
  ollamaClient?: OllamaClient;
  secretsFileEnv?: Record<string, string>;
}

export class LocalAiAdapter {
  private flags: LocalAiFeatureFlags;
  private ollamaConfig: OllamaExecutorConfig;
  private configError?: string;
  private client: OllamaClient | null;
  private env: Record<string, string | undefined>;

  constructor(deps: LocalAiAdapterDeps = {}) {
    this.env = deps.env ?? process.env;
    this.flags = deps.flags ?? loadLocalAiFeatureFlags(this.env);
    const fileEnv = deps.secretsFileEnv ?? loadLocalAiSecretsFile(this.env);
    const resolved = resolveOllamaConfig(this.env, fileEnv);
    this.ollamaConfig = resolved.config;
    this.configError = resolved.error;
    if (deps.ollamaClient) {
      this.client = deps.ollamaClient;
      this.configError = undefined;
    } else if (this.configError) {
      this.client = null;
    } else {
      try {
        this.client = new OllamaClient(this.ollamaConfig);
      } catch (err) {
        this.client = null;
        this.configError = err instanceof Error ? err.message : String(err);
      }
    }
  }

  getFlags(): LocalAiFeatureFlags {
    return { ...this.flags };
  }

  /**
   * Cheap status used by Hub /health. Does not contact Ollama.
   */
  snapshot(): LocalAiStatus {
    if (!this.flags.LocalAIEnabled) {
      return this.buildStatus('disabled', 'Local AI is disabled', false);
    }
    if (this.configError || !this.client) {
      return this.buildStatus(
        'misconfigured',
        this.configError || 'Ollama client is not configured',
        false,
      );
    }
    return this.buildStatus(
      'unavailable',
      'Provider not probed on this endpoint; use GET /api/local-ai/health',
      false,
    );
  }

  /**
   * Optional short health probe. Never throws. Never downloads models.
   */
  async health(opts?: { probe?: boolean }): Promise<LocalAiStatus> {
    const probe = opts?.probe !== false;
    if (!this.flags.LocalAIEnabled) {
      return this.buildStatus('disabled', 'Local AI is disabled', false);
    }
    if (this.configError || !this.client) {
      return this.buildStatus(
        'misconfigured',
        this.configError || 'Ollama client is not configured',
        false,
      );
    }
    if (!probe) {
      return this.buildStatus('unavailable', 'Provider probe skipped', false);
    }
    const result = await this.client.health();
    if (!result.ok) {
      return this.buildStatus(
        'unavailable',
        result.error || 'Ollama connection refused / offline',
        true,
      );
    }
    return this.buildStatus('ready', result.version ? `ollama ${result.version}` : 'ollama healthy', true);
  }

  async complete(input: LocalAiCompleteInput): Promise<{
    status: number;
    body: Record<string, unknown>;
  }> {
    if (!this.flags.LocalAIEnabled) {
      return {
        status: 503,
        body: {
          error: 'local_ai_disabled',
          message: 'Local AI is disabled. Atlas continues without a local model provider.',
        },
      };
    }
    if (this.configError || !this.client) {
      return {
        status: 503,
        body: {
          error: 'local_ai_misconfigured',
          message: this.configError || 'Ollama client is not configured',
        },
      };
    }
    if (!this.ollamaConfig.model) {
      return {
        status: 503,
        body: {
          error: 'model_missing',
          message: 'No Ollama model is configured. Set OLLAMA_MODEL; Atlas will not download models.',
        },
      };
    }
    if (!isPhase3AllowedOperation(input.operation)) {
      return {
        status: 400,
        body: {
          error: 'operation_not_allowed',
          message: `Operation "${input.operation}" is not allowed`,
        },
      };
    }

    const redacted = redactText(input.sourceContent || '');
    if (redacted.blocked) {
      return {
        status: 400,
        body: { error: 'redaction_blocked', message: redacted.blockReason || 'Redaction blocked input' },
      };
    }
    const injection = scanForInjection(redacted.redactedText);
    const prompt = buildLocalAiPrompt({
      jobId: input.jobId || 'adhoc',
      operation: input.operation,
      redactedSourceContent: redacted.redactedText,
      sourceRecordType: input.sourceRecordType || 'Note',
      sourceRecordId: input.sourceRecordId || 'adhoc',
    });

    try {
      const chat = await this.client.chat({
        system: prompt.system,
        user: prompt.user,
      });
      let parsed: unknown;
      try {
        parsed = JSON.parse(chat.rawContent);
      } catch {
        parsed = extractJsonObject(chat.rawContent);
      }
      const validated = validatePhase2OllamaOutput(parsed, {
        expectedOperation: input.operation,
        expectedJobId: input.jobId,
      });
      if (!validated.ok || !validated.output) {
        return {
          status: 502,
          body: {
            error: 'invalid_model_output',
            message: 'Model output failed the Local AI contract',
            details: validated.errors,
          },
        };
      }
      return {
        status: 200,
        body: {
          output: validated.output,
          injection,
          redaction: {
            redactionCount: redacted.redactionCount,
            fieldsRedacted: redacted.fieldsRedacted,
            manualReviewRequired: redacted.manualReviewRequired,
          },
          model: chat.model,
        },
      };
    } catch (err) {
      const e = err as Error & { status?: number; code?: string };
      return {
        status: typeof e.status === 'number' ? e.status : 503,
        body: {
          error: e.code || 'ollama_unavailable',
          message: e.message || 'Local AI provider unavailable',
        },
      };
    }
  }

  private buildStatus(
    availability: LocalAiAvailability,
    reason: string,
    probed: boolean,
  ): LocalAiStatus {
    return {
      enabled: this.flags.LocalAIEnabled,
      available: availability === 'ready',
      availability,
      reason,
      flags: this.getFlags(),
      provider: {
        kind: 'ollama',
        baseUrl: this.ollamaConfig.baseUrl,
        modelConfigured: Boolean(this.ollamaConfig.model),
        loopbackOnly: !this.ollamaConfig.allowNonLoopback,
      },
      probed,
    };
  }
}

export function createLocalAiAdapter(deps?: LocalAiAdapterDeps): LocalAiAdapter {
  return new LocalAiAdapter(deps);
}
