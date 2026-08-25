/**
 * Resolve Ollama executor config from process env (and optional gitignored secrets file).
 * Never writes .secrets. Never requires Ollama at import/startup.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DEFAULT_OLLAMA_EXECUTOR_CONFIG,
  isLoopbackUrl,
  type OllamaExecutorConfig,
} from '@hvcg/atlas-integration-core';

function parseEnvFile(contents: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const i = trimmed.indexOf('=');
    if (i < 0) continue;
    const key = trimmed.slice(0, i).trim();
    let val = trimmed.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

/**
 * Optional overlay from an explicit path or cwd `.secrets/local-ai.env`.
 * Does not search sibling worktrees or absolute developer paths.
 */
export function loadLocalAiSecretsFile(
  env: Record<string, string | undefined> = process.env,
): Record<string, string> {
  const explicit = env.LOCAL_AI_SECRETS_FILE?.trim();
  const candidates = [
    explicit,
    join(process.cwd(), '.secrets', 'local-ai.env'),
  ].filter((p): p is string => Boolean(p));
  for (const path of candidates) {
    if (existsSync(path)) {
      return parseEnvFile(readFileSync(path, 'utf8'));
    }
  }
  return {};
}

export interface ResolvedOllamaConfig {
  config: OllamaExecutorConfig;
  error?: string;
}

export function resolveOllamaConfig(
  env: Record<string, string | undefined> = process.env,
  fileEnv: Record<string, string> = {},
): ResolvedOllamaConfig {
  const merged = { ...fileEnv, ...env };
  const config: OllamaExecutorConfig = {
    baseUrl: (merged.OLLAMA_BASE_URL || DEFAULT_OLLAMA_EXECUTOR_CONFIG.baseUrl).replace(/\/$/, ''),
    model: merged.OLLAMA_MODEL || '',
    timeoutMs: Number(merged.OLLAMA_TIMEOUT_MS || DEFAULT_OLLAMA_EXECUTOR_CONFIG.timeoutMs),
    maxRetries: Number(merged.OLLAMA_MAX_RETRIES || DEFAULT_OLLAMA_EXECUTOR_CONFIG.maxRetries),
    allowNonLoopback: String(merged.OLLAMA_ALLOW_NON_LOOPBACK || 'false').toLowerCase() === 'true',
    formatJson: String(merged.OLLAMA_FORMAT_JSON || 'true').toLowerCase() !== 'false',
  };

  if (!config.allowNonLoopback && !isLoopbackUrl(config.baseUrl)) {
    return {
      config,
      error: `Ollama base URL must be loopback-only (got ${config.baseUrl})`,
    };
  }
  return { config };
}
