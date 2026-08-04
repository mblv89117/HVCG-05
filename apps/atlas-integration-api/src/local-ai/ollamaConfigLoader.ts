/**
 * Load Ollama executor config from env / optional .secrets/local-ai.env
 * Never commits machine-specific discovery — write discovery to .secrets/
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  DEFAULT_OLLAMA_EXECUTOR_CONFIG,
  assertLoopbackBaseUrl,
  type OllamaDiscoverySnapshot,
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

export function loadLocalAiSecretsFile(repoRootHints: string[]): Record<string, string> {
  for (const root of repoRootHints) {
    const path = join(root, '.secrets', 'local-ai.env');
    if (existsSync(path)) {
      return parseEnvFile(readFileSync(path, 'utf8'));
    }
  }
  return {};
}

export function resolveOllamaConfig(
  env: Record<string, string | undefined> = process.env,
  fileEnv: Record<string, string> = {},
): OllamaExecutorConfig {
  const merged = { ...fileEnv, ...env };
  const cfg: OllamaExecutorConfig = {
    baseUrl: (merged.OLLAMA_BASE_URL || DEFAULT_OLLAMA_EXECUTOR_CONFIG.baseUrl).replace(/\/$/, ''),
    model: merged.OLLAMA_MODEL || '',
    timeoutMs: Number(merged.OLLAMA_TIMEOUT_MS || DEFAULT_OLLAMA_EXECUTOR_CONFIG.timeoutMs),
    maxRetries: Number(merged.OLLAMA_MAX_RETRIES || DEFAULT_OLLAMA_EXECUTOR_CONFIG.maxRetries),
    allowNonLoopback: String(merged.OLLAMA_ALLOW_NON_LOOPBACK || 'false').toLowerCase() === 'true',
    formatJson: String(merged.OLLAMA_FORMAT_JSON || 'true').toLowerCase() !== 'false',
  };
  assertLoopbackBaseUrl(cfg.baseUrl, cfg.allowNonLoopback);
  return cfg;
}

export async function discoverOllama(
  cfg: OllamaExecutorConfig,
  opts?: { openWebUiCheckUrl?: string },
): Promise<OllamaDiscoverySnapshot> {
  const discoveredAt = new Date().toISOString();
  const snapshot: OllamaDiscoverySnapshot = {
    discoveredAt,
    baseUrl: cfg.baseUrl,
    loopbackBound: true,
    models: [],
    selectedModel: cfg.model || null,
    openWebUiDetected: false,
    openWebUiNote:
      'Open WebUI (if present) is optional chat UI only — not used by Atlas executor.',
    authRequired: false,
    healthy: false,
  };

  try {
    const versionRes = await fetch(`${cfg.baseUrl}/api/version`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (versionRes.ok) {
      const v = (await versionRes.json()) as { version?: string };
      snapshot.version = v.version;
    }

    const tagsRes = await fetch(`${cfg.baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!tagsRes.ok) {
      snapshot.error = `tags HTTP ${tagsRes.status}`;
      return snapshot;
    }
    const tags = (await tagsRes.json()) as {
      models?: Array<{
        name: string;
        size?: number;
        details?: {
          parameter_size?: string;
          quantization_level?: string;
          context_length?: number;
        };
      }>;
    };
    snapshot.models = (tags.models || []).map((m) => ({
      name: m.name,
      size: m.size,
      parameterSize: m.details?.parameter_size,
      quantization: m.details?.quantization_level,
      contextLength: m.details?.context_length,
    }));
    snapshot.healthy = true;
    if (!snapshot.selectedModel && snapshot.models[0]) {
      snapshot.selectedModel = snapshot.models[0].name;
    }
  } catch (err) {
    snapshot.healthy = false;
    snapshot.error = err instanceof Error ? err.message : String(err);
  }

  try {
    const webui = opts?.openWebUiCheckUrl || 'http://127.0.0.1:3000';
    const res = await fetch(webui, { signal: AbortSignal.timeout(2_000) });
    if (res.ok) {
      snapshot.openWebUiDetected = true;
      snapshot.openWebUiNote =
        'Open WebUI detected on local port 3000 — optional; Atlas executor talks to Ollama directly on loopback.';
    }
  } catch {
    /* optional */
  }

  return snapshot;
}

export function writeDiscoverySnapshot(repoRoot: string, snapshot: OllamaDiscoverySnapshot) {
  const dir = join(repoRoot, '.secrets');
  mkdirSync(dir, { recursive: true });
  const path = join(dir, 'local-ai.discovery.json');
  writeFileSync(path, JSON.stringify(snapshot, null, 2), { mode: 0o600 });
  return path;
}

export function writeLocalAiEnvExample(repoRoot: string, selectedModel: string) {
  const dir = join(repoRoot, '.secrets');
  mkdirSync(dir, { recursive: true });
  const path = join(dir, 'local-ai.env');
  if (existsSync(path)) return path;
  const body = `# Local-only — gitignored. Do not commit.
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=${selectedModel}
OLLAMA_TIMEOUT_MS=120000
OLLAMA_MAX_RETRIES=1
OLLAMA_ALLOW_NON_LOOPBACK=false
OLLAMA_FORMAT_JSON=true
# Keep these false in Phase 2:
LOCAL_AI_WRITES_ENABLED=false
LOCAL_AI_EXTERNAL_MESSAGES_ENABLED=false
EVA_INTAKE_ENABLED=false
CLIENT_EMAILS_ENABLED=false
# Enable only after Phase 2 tests pass (local Dev):
LOCAL_AI_ENABLED=false
`;
  writeFileSync(path, body, { mode: 0o600 });
  return path;
}

export function findRepoRootFromApi(): string {
  // apps/atlas-integration-api/src/local-ai -> repo root = ../../../../
  const here = dirname(new URL(import.meta.url).pathname);
  return join(here, '..', '..', '..', '..');
}
