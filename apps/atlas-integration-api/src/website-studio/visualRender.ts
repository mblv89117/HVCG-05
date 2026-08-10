/**
 * Phase 6B-QA — FULL VISUAL RENDER probes for Before/After compare.
 * Localhost preview only. Never fetches Production.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import { extname, normalize } from 'node:path';
import type { AddressInfo } from 'node:net';

export const PILOT_PREVIEW_PORT = 8765;
export const BASELINE_PREVIEW_PORT = 8766;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
};

export interface VisualRenderProbe {
  ok: boolean;
  mode: 'before' | 'after';
  url: string;
  port: number;
  commit: string | null;
  healthOk: boolean;
  h1: string | null;
  stylesCssStatus: number;
  stylesCssLooksLikeCss: boolean;
  logoStatus: number;
  critical404s: string[];
  unstyled: boolean;
  mismatches: string[];
  htmlSnippetOk: boolean;
  documentRoot: string | null;
}

export interface ComparePreviewUrls {
  before: {
    url: string;
    port: number;
    commit: string | null;
    healthOk: boolean;
    mode: 'before';
  };
  after: {
    url: string;
    port: number;
    commit: string | null;
    healthOk: boolean;
    mode: 'after';
  };
  visualRender: {
    ok: boolean;
    before: VisualRenderProbe;
    after: VisualRenderProbe;
    mismatches: string[];
  };
  source: 'local-preview-only';
}

function extractH1(html: string): string | null {
  const m = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  if (!m) return null;
  return m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

export function baselineCacheRoot(): string {
  return (
    process.env.WEBSITE_STUDIO_BASELINE_PREVIEW_DIR ||
    join(tmpdir(), 'atlas-ws-baseline-previews')
  );
}

/** Materialize baseline `website/staging` via git archive — read-only local assets. */
export function materializeBaselineStaging(opts: {
  worktreePath: string;
  baselineCommit: string;
  cacheRoot?: string;
}): string {
  const worktree = resolve(opts.worktreePath);
  const sha = String(opts.baselineCommit || '').trim();
  if (!sha) {
    throw Object.assign(new Error('Baseline commit required to materialize BEFORE preview'), {
      status: 400,
      code: 'baseline_commit_missing',
    });
  }
  if (!existsSync(worktree)) {
    throw Object.assign(new Error('Pilot worktree missing for baseline materialize'), {
      status: 400,
      code: 'worktree_missing',
    });
  }
  const root = opts.cacheRoot || baselineCacheRoot();
  const dest = join(root, sha);
  const marker = join(dest, '.atlas-baseline-commit');
  if (
    existsSync(join(dest, 'index.html')) &&
    existsSync(join(dest, 'styles.css')) &&
    existsSync(marker) &&
    readFileSync(marker, 'utf8').trim() === sha
  ) {
    return dest;
  }
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  // `git archive <sha>:website/staging` emits staging root files (index.html, styles.css, …)
  const archive = execFileSync('git', ['archive', `${sha}:website/staging`], {
    cwd: worktree,
    maxBuffer: 80 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  execFileSync('tar', ['-x', '-C', dest], {
    input: archive,
    maxBuffer: 80 * 1024 * 1024,
    stdio: ['pipe', 'ignore', 'pipe'],
  });
  if (!existsSync(join(dest, 'index.html'))) {
    throw Object.assign(
      new Error(`Baseline archive missing index.html at ${sha.slice(0, 12)}`),
      { status: 500, code: 'baseline_materialize_failed' },
    );
  }
  writeFileSync(marker, sha, 'utf8');
  writeFileSync(
    join(dest, '.atlas-preview-identity.json'),
    JSON.stringify({
      mode: 'before',
      baselineCommit: sha,
      notLive: true,
      source: 'local-git-archive',
    }),
    'utf8',
  );
  return dest;
}

type BaselineServerState = {
  commit: string;
  documentRoot: string;
  port: number;
  url: string;
  server: Server | null;
  startedAt: string | null;
  lastError: string | null;
};

const baselineServers = new Map<string, BaselineServerState>();

function contentType(filePath: string): string {
  return MIME[extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function safeJoin(root: string, reqPath: string): string | null {
  const cleaned = decodeURIComponent(reqPath.split('?')[0] || '/');
  const rel = cleaned === '/' ? 'index.html' : cleaned.replace(/^\//, '');
  const abs = normalize(join(root, rel));
  if (!abs.startsWith(normalize(root))) return null;
  return abs;
}

async function listenLoopback(server: Server, port: number): Promise<number> {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve());
  });
  return (server.address() as AddressInfo).port;
}

export async function ensureBaselinePreviewServer(opts: {
  worktreePath: string;
  baselineCommit: string;
  port?: number;
}): Promise<BaselineServerState> {
  const port = opts.port || BASELINE_PREVIEW_PORT;
  const key = `${opts.baselineCommit}@${port}`;
  const existing = baselineServers.get(key);
  if (existing?.server) {
    const health = await checkPreviewHttp(`http://127.0.0.1:${port}/`);
    if (health) return existing;
  }

  const documentRoot = materializeBaselineStaging({
    worktreePath: opts.worktreePath,
    baselineCommit: opts.baselineCommit,
  });

  // If something else already serves this port healthily with our marker, reuse it.
  const already = await checkPreviewHttp(`http://127.0.0.1:${port}/`);
  if (already) {
    const markerOk = await fetchText(`http://127.0.0.1:${port}/.atlas-preview-identity.json`).then(
      (t) => t.includes(opts.baselineCommit),
    ).catch(() => false);
    if (markerOk) {
      const reused: BaselineServerState = {
        commit: opts.baselineCommit,
        documentRoot,
        port,
        url: `http://127.0.0.1:${port}/`,
        server: existing?.server || null,
        startedAt: existing?.startedAt || new Date().toISOString(),
        lastError: null,
      };
      baselineServers.set(key, reused);
      return reused;
    }
  }

  if (existing?.server) {
    await new Promise<void>((resolve) => existing.server!.close(() => resolve()));
    existing.server = null;
  }

  const server = createServer((req, res) => {
    const abs = safeJoin(documentRoot, req.url || '/');
    if (!abs || !existsSync(abs)) {
      res.writeHead(404, {
        'content-type': 'text/plain; charset=utf-8',
        'x-atlas-preview-mode': 'before',
        'x-atlas-not-live': 'true',
        'x-atlas-baseline-commit': opts.baselineCommit,
      });
      res.end('Not found');
      return;
    }
    try {
      const body = readFileSync(abs);
      res.writeHead(200, {
        'content-type': contentType(abs),
        'cache-control': 'no-store',
        'x-atlas-preview-mode': 'before',
        'x-atlas-not-live': 'true',
        'x-atlas-baseline-commit': opts.baselineCommit,
      });
      res.end(body);
    } catch {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Read error');
    }
  });

  try {
    await listenLoopback(server, port);
  } catch (e) {
    // Port busy — if healthy baseline already present, accept it
    const healthy = await checkPreviewHttp(`http://127.0.0.1:${port}/`);
    if (healthy) {
      const state: BaselineServerState = {
        commit: opts.baselineCommit,
        documentRoot,
        port,
        url: `http://127.0.0.1:${port}/`,
        server: null,
        startedAt: new Date().toISOString(),
        lastError: null,
      };
      baselineServers.set(key, state);
      return state;
    }
    throw Object.assign(
      new Error(
        `Baseline preview failed to bind 127.0.0.1:${port}: ${e instanceof Error ? e.message : String(e)}`,
      ),
      { status: 500, code: 'baseline_preview_bind_failed' },
    );
  }

  const state: BaselineServerState = {
    commit: opts.baselineCommit,
    documentRoot,
    port,
    url: `http://127.0.0.1:${port}/`,
    server,
    startedAt: new Date().toISOString(),
    lastError: null,
  };
  baselineServers.set(key, state);
  return state;
}

export async function stopBaselinePreviewServer(baselineCommit?: string, port = BASELINE_PREVIEW_PORT) {
  for (const [key, state] of baselineServers) {
    if (baselineCommit && !key.startsWith(baselineCommit)) continue;
    if (state.port !== port) continue;
    if (state.server) {
      await new Promise<void>((resolve) => state.server!.close(() => resolve()));
      state.server = null;
    }
    baselineServers.delete(key);
  }
}

async function checkPreviewHttp(url: string): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

async function fetchText(url: string): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

async function fetchStatus(url: string): Promise<{ status: number; body: string; contentType: string }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    const body = await res.text();
    return {
      status: res.status,
      body,
      contentType: res.headers.get('content-type') || '',
    };
  } catch {
    return { status: 0, body: '', contentType: '' };
  } finally {
    clearTimeout(t);
  }
}

/** Probe a localhost preview for real CSS/assets — fails closed on unstyled HTML. */
export async function probeVisualRender(opts: {
  mode: 'before' | 'after';
  url: string;
  port: number;
  commit: string | null;
  expectedH1?: string | null;
  documentRoot?: string | null;
}): Promise<VisualRenderProbe> {
  const mismatches: string[] = [];
  const critical404s: string[] = [];
  const base = opts.url.endsWith('/') ? opts.url : `${opts.url}/`;

  if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//i.test(base)) {
    mismatches.push('Preview URL is not loopback — Production/remote fetch blocked');
  }

  const htmlRes = await fetchStatus(base);
  const healthOk = htmlRes.status === 200 && /<html/i.test(htmlRes.body);
  if (!healthOk) mismatches.push(`${opts.mode} preview HTML not healthy (${htmlRes.status})`);

  const h1 = healthOk ? extractH1(htmlRes.body) : null;
  if (opts.expectedH1 && h1 && h1.trim() !== opts.expectedH1.trim()) {
    mismatches.push(
      `${opts.mode} H1 mismatch: expected “${opts.expectedH1.slice(0, 48)}…”, got “${(h1 || '').slice(0, 48)}…”`,
    );
  }
  if (opts.expectedH1 && !h1) {
    mismatches.push(`${opts.mode} H1 missing from rendered HTML`);
  }

  const cssRes = await fetchStatus(`${base}styles.css`);
  const stylesCssLooksLikeCss =
    cssRes.status === 200 &&
    (/text\/css/i.test(cssRes.contentType) ||
      /--bg\s*:|font-family|Cormorant|:root\s*\{/i.test(cssRes.body)) &&
    !/<html/i.test(cssRes.body);
  if (cssRes.status !== 200) critical404s.push('styles.css');
  if (!stylesCssLooksLikeCss) {
    mismatches.push(`${opts.mode} styles.css missing or not real CSS (unstyled HTML risk)`);
  }

  const logoRes = await fetchStatus(`${base}assets/brand/hvcg-logo-nav.png`);
  if (logoRes.status !== 200) critical404s.push('assets/brand/hvcg-logo-nav.png');

  const jsRes = await fetchStatus(`${base}js/site.js`);
  if (jsRes.status !== 200) critical404s.push('js/site.js');

  // Relative stylesheet link must be present (proves we are not looking at text-only extract)
  const htmlSnippetOk =
    /rel=["']stylesheet["'][^>]*href=["']styles\.css["']/i.test(htmlRes.body) ||
    /href=["']styles\.css["'][^>]*rel=["']stylesheet["']/i.test(htmlRes.body);
  if (!htmlSnippetOk) mismatches.push(`${opts.mode} HTML missing styles.css stylesheet link`);

  // Browser-default smell: HTML has no linked CSS or CSS 404
  const unstyled = !stylesCssLooksLikeCss || critical404s.includes('styles.css') || !htmlSnippetOk;
  if (unstyled) {
    mismatches.push(`${opts.mode} render is UNSTYLED — owner must see real HVCG page with CSS`);
  }

  if (critical404s.length) {
    mismatches.push(`${opts.mode} critical asset 404s: ${critical404s.join(', ')}`);
  }

  return {
    ok: mismatches.length === 0 && healthOk && !unstyled,
    mode: opts.mode,
    url: base,
    port: opts.port,
    commit: opts.commit,
    healthOk,
    h1,
    stylesCssStatus: cssRes.status,
    stylesCssLooksLikeCss,
    logoStatus: logoRes.status,
    critical404s,
    unstyled,
    mismatches,
    htmlSnippetOk,
    documentRoot: opts.documentRoot || null,
  };
}

export function fingerprintUrlPair(beforeUrl: string, afterUrl: string): string {
  return createHash('sha256').update(`${beforeUrl}|${afterUrl}`).digest('hex').slice(0, 16);
}
