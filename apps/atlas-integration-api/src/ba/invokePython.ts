/**
 * Thin BA Python bridge — Integration Hub is the only HTTP API.
 * Spawns config/business/ba_bridge.py with JSON stdin. No second API architecture.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Resolve BA config/business directory across worktree layouts. */
export function resolveBaBusinessDir(): string {
  const env = process.env.HVCG_BA_BUSINESS_DIR;
  if (env && fs.existsSync(path.join(env, 'ba_bridge.py'))) return env;

  const candidates = [
    // Sibling worktree from atlas-usable-operating-layer
    path.resolve(here, '../../../../../../hvcg-business-architecture-v2/config/business'),
    path.resolve(here, '../../../../../hvcg-business-architecture-v2/config/business'),
    path.resolve(process.cwd(), '../hvcg-business-architecture-v2/config/business'),
    path.resolve(process.cwd(), '../../hvcg-business-architecture-v2/config/business'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'ba_bridge.py'))) return c;
  }
  throw new Error('BA business dir not found — set HVCG_BA_BUSINESS_DIR');
}

export type BaBridgeRequest = {
  op: string;
  principal: Record<string, unknown>;
  payload?: Record<string, unknown>;
  correlationId?: string;
};

export type BaBridgeResponse = {
  ok?: boolean;
  status?: string;
  message?: string;
  correlationId?: string;
  [key: string]: unknown;
};

export function invokeBaBridge(req: BaBridgeRequest, timeoutMs = 15000): Promise<BaBridgeResponse> {
  const businessDir = resolveBaBusinessDir();
  const bridge = path.join(businessDir, 'ba_bridge.py');
  return new Promise((resolve, reject) => {
    const child = spawn('python3', [bridge], {
      cwd: businessDir,
      env: { ...process.env, PYTHONPATH: businessDir },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('BA bridge timeout'));
    }, timeoutMs);
    child.stdout.on('data', (d) => {
      stdout += String(d);
    });
    child.stderr.on('data', (d) => {
      stderr += String(d);
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', () => {
      clearTimeout(timer);
      try {
        const line = stdout.trim().split('\n').filter(Boolean).pop() || '{}';
        resolve(JSON.parse(line) as BaBridgeResponse);
      } catch (e) {
        reject(new Error(`BA bridge parse failed: ${stderr || String(e)}`));
      }
    });
    child.stdin.write(JSON.stringify(req));
    child.stdin.end();
  });
}

export function httpStatusForBa(result: BaBridgeResponse): number {
  const s = result.status || '';
  if (result.ok && (s === 'SUCCESS' || s === 'OK' || !s)) return 200;
  if (s === 'UNAUTHORIZED' || s === 'MISSING_CONTEXT') return 401;
  if (s === 'WRONG_CLIENT' || s === 'BLOCKED_PERMISSION' || s === 'FORBIDDEN' || s === 'RESTRICTED_MATTER')
    return 403;
  if (s === 'BLOCKED_POLICY' || s === 'PRODUCTION_GATED') return 403;
  if (s === 'NEEDS_HUMAN') return 202;
  return result.ok ? 200 : 403;
}
