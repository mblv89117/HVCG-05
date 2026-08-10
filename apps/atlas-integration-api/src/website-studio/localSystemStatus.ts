/**
 * Local development system status (informational).
 * Loopback probes only — no secrets, no Production actions.
 */

import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createConnection } from 'node:net';
import { join } from 'node:path';

export type LocalComponentStatus = 'Running' | 'Offline' | 'Available' | 'Healthy' | 'Unknown';

async function probeHttp(url: string, timeoutMs = 1500): Promise<boolean> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

function portListening(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port });
    const done = (ok: boolean) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(800);
    socket.on('connect', () => done(true));
    socket.on('timeout', () => done(false));
    socket.on('error', () => done(false));
  });
}

function clamAvailable(): boolean {
  try {
    execFileSync('which', ['clamscan'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export async function collectLocalSystemStatus(opts: {
  repoRoot: string;
  hubPort?: number;
  elitePort?: number;
  previewPort?: number;
  baselinePreviewPort?: number;
  ollamaBaseUrl?: string;
}) {
  const hubPort = opts.hubPort || Number(process.env.INTEGRATION_API_PORT || 8790);
  const elitePort = opts.elitePort || 5180;
  const previewPort = opts.previewPort || 8765;
  const baselinePreviewPort = opts.baselinePreviewPort || 8766;
  const ollamaUrl = (opts.ollamaBaseUrl || process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(
    /\/$/,
    '',
  );

  const [hubOk, eliteOk, previewListening, baselineListening, ollamaOk] = await Promise.all([
    probeHttp(`http://127.0.0.1:${hubPort}/health`),
    probeHttp(`http://127.0.0.1:${elitePort}/`),
    portListening('127.0.0.1', previewPort),
    portListening('127.0.0.1', baselinePreviewPort),
    probeHttp(`${ollamaUrl}/api/tags`),
  ]);

  const sqlitePath =
    process.env.WEBSITE_STUDIO_DB ||
    join(opts.repoRoot, '.data', 'website-studio', 'website-studio.sqlite');
  const sqliteHealthy = existsSync(sqlitePath);

  const clam = clamAvailable();

  return {
    checkedAt: new Date().toISOString(),
    owner: {
      atlasUi: eliteOk ? 'Running' : 'Offline',
      integrationHub: hubOk ? 'Running' : 'Offline',
      localAi: ollamaOk ? 'Running' : 'Offline',
      hvcgPreview: previewListening ? 'Running' : 'Offline',
      hvcgBaselinePreview: baselineListening ? 'Running' : 'Offline',
      clamAv: clam ? 'Available' : 'Offline',
      sqlite: sqliteHealthy ? 'Healthy' : 'Offline',
    } as Record<string, LocalComponentStatus>,
    advanced: {
      elite: { port: elitePort, bind: '127.0.0.1', healthUrl: `http://127.0.0.1:${elitePort}/` },
      hub: { port: hubPort, bind: '127.0.0.1', healthUrl: `http://127.0.0.1:${hubPort}/health` },
      preview: {
        port: previewPort,
        role: 'AFTER / pilot draft',
        onDemand: true,
        note: 'Start from Website Studio — not LaunchAgent-managed',
      },
      baselinePreview: {
        port: baselinePreviewPort,
        role: 'BEFORE / production baseline',
        onDemand: true,
        note: 'Materialized from baseline commit via git archive — local only',
      },
      ollama: { baseUrl: ollamaUrl },
      sqlitePathPresent: sqliteHealthy,
      clamscan: clam,
      safety: {
        LocalAIWritesEnabled: false,
        LocalAIExternalMessagesEnabled: false,
        EvaIntakeEnabled: false,
        ClientEmailsEnabled: false,
      },
      logsDir: '~/Library/Logs/HVCG-Atlas',
    },
  };
}
