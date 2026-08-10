/**
 * Phase 6B-UX — restricted local website preview process adapter.
 * Allow-listed registry commands only. Localhost-only. No Production changes.
 */

import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { WebsiteRegistryRecord } from '@hvcg/atlas-integration-core';
import { checkPreviewHealth } from './advisor.ts';

const ALLOWED_PREVIEW_COMMANDS = new Set(['npm run preview']);

const ALLOWED_ROOTS = [
  '/Volumes/MacMiniPro2TB',
  '/tmp',
  '/private/tmp',
  '/var/folders',
];

export type PreviewRuntimeStatus =
  | 'running'
  | 'offline'
  | 'starting'
  | 'stopping'
  | 'failed'
  | 'unknown';

export interface ManagedPreviewState {
  websiteId: string;
  status: PreviewRuntimeStatus;
  url: string | null;
  port: number | null;
  pid: number | null;
  cwd: string | null;
  command: string | null;
  startedAt: string | null;
  lastHealthAt: string | null;
  lastError: string | null;
  logTail: string[];
  managedByStudio: boolean;
}

function nowIso() {
  return new Date().toISOString();
}

function assertAllowedPath(candidate: string) {
  const c = resolve(candidate);
  const ok = ALLOWED_ROOTS.some((root) => c === root || c.startsWith(root + '/'));
  if (!ok) {
    throw Object.assign(new Error('Preview working directory not in allow-listed roots'), {
      status: 403,
      code: 'preview_path_not_allowed',
    });
  }
  return c;
}

function parsePreviewPort(website: WebsiteRegistryRecord): number {
  const staging = String(website.stagingUrl || '');
  const m = staging.match(/127\.0\.0\.1:(\d+)|localhost:(\d+)/i);
  if (m) return Number(m[1] || m[2]);
  const cmd = String(website.previewCommand || '');
  const pm = cmd.match(/\b(\d{4,5})\b/);
  if (pm) return Number(pm[1]);
  return 8765;
}

function previewBaseUrl(port: number): string {
  return `http://127.0.0.1:${port}/`;
}

/** Resolve npm-run cwd: prefer <repo>/website when package.json lives there. */
export function resolvePreviewCwd(website: WebsiteRegistryRecord): string {
  const root = website.localRepositoryPath;
  if (!root) {
    throw Object.assign(new Error('Website has no registered local repository path'), {
      status: 400,
      code: 'preview_path_missing',
    });
  }
  const base = assertAllowedPath(root);
  const websitePkg = join(base, 'website', 'package.json');
  if (existsSync(websitePkg)) return resolve(base, 'website');
  if (existsSync(join(base, 'package.json'))) return base;
  throw Object.assign(new Error('No package.json found for registered preview command'), {
    status: 400,
    code: 'preview_package_missing',
  });
}

export function assertAllowlistedPreviewCommand(cmd: string | null | undefined): string {
  const normalized = String(cmd || '').trim().replace(/\s+/g, ' ');
  if (!ALLOWED_PREVIEW_COMMANDS.has(normalized)) {
    throw Object.assign(
      new Error(
        `Preview command not allow-listed. Registered command must be one of: ${[
          ...ALLOWED_PREVIEW_COMMANDS,
        ].join(', ')}`,
      ),
      { status: 403, code: 'preview_command_not_allowed' },
    );
  }
  return normalized;
}

export function buildPreviewPageUrl(
  baseUrl: string | null,
  page?: { route?: string | null; sourceFile?: string | null } | null,
): string | null {
  if (!baseUrl) return null;
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  if (!page) return base;
  const route = String(page.route || '/');
  if (route === '/' || route === '') return base;
  const source = String(page.sourceFile || '');
  if (/\.html?$/i.test(source)) {
    const file = source.split('/').pop()!;
    return `${base}${file}`;
  }
  const slug = route.replace(/^\//, '');
  return `${base}${slug}.html`;
}

type Internal = ManagedPreviewState & {
  child: ChildProcessWithoutNullStreams | null;
};

export class WebsitePreviewManager {
  private states = new Map<string, Internal>();

  getState(websiteId: string): ManagedPreviewState | null {
    const s = this.states.get(websiteId);
    if (!s) return null;
    const { child: _c, ...rest } = s;
    return rest;
  }

  private ensure(website: WebsiteRegistryRecord): Internal {
    const existing = this.states.get(website.websiteId);
    if (existing) return existing;
    const port = parsePreviewPort(website);
    const created: Internal = {
      websiteId: website.websiteId,
      status: 'offline',
      url: previewBaseUrl(port),
      port,
      pid: null,
      cwd: null,
      command: null,
      startedAt: null,
      lastHealthAt: null,
      lastError: null,
      logTail: [],
      managedByStudio: false,
      child: null,
    };
    this.states.set(website.websiteId, created);
    return created;
  }

  private pushLog(state: Internal, line: string) {
    state.logTail.push(line.slice(0, 500));
    if (state.logTail.length > 80) state.logTail = state.logTail.slice(-80);
  }

  async health(website: WebsiteRegistryRecord): Promise<ManagedPreviewState & { healthOk: boolean }> {
    const state = this.ensure(website);
    const url = state.url || previewBaseUrl(parsePreviewPort(website));
    const result = await checkPreviewHealth(url);
    state.lastHealthAt = result.checkedAt;
    state.url = result.url || url;
    if (result.status === 'running') {
      state.status = 'running';
      // Keep PID if we own it; otherwise mark as externally running
      if (!state.pid) state.managedByStudio = false;
      return { ...this.public(state), healthOk: true };
    }
    if (state.status === 'starting') {
      return { ...this.public(state), healthOk: false };
    }
    if (state.child && state.pid) {
      try {
        process.kill(state.pid, 0);
        // Process alive but not healthy yet
        return { ...this.public(state), healthOk: false };
      } catch {
        state.child = null;
        state.pid = null;
        state.managedByStudio = false;
      }
    }
    state.status = 'offline';
    return { ...this.public(state), healthOk: false };
  }

  async start(website: WebsiteRegistryRecord): Promise<ManagedPreviewState> {
    const cmd = assertAllowlistedPreviewCommand(website.previewCommand);
    const cwd = resolvePreviewCwd(website);
    const state = this.ensure(website);
    const already = await this.health(website);
    if (already.healthOk) {
      state.status = 'running';
      state.lastError = null;
      return this.public(state);
    }

    if (state.child) {
      await this.stop(website.websiteId);
    }

    state.status = 'starting';
    state.cwd = cwd;
    state.command = cmd;
    state.lastError = null;
    state.managedByStudio = true;
    this.pushLog(state, `Starting: ${cmd} (cwd=${cwd})`);

    const child = spawn('npm', ['run', 'preview'], {
      cwd,
      env: { ...process.env, HOST: '127.0.0.1' },
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    }) as unknown as import('node:child_process').ChildProcessWithoutNullStreams;
    state.child = child;
    state.pid = child.pid ?? null;
    state.startedAt = nowIso();

    child.stdout.on('data', (buf: Buffer) => this.pushLog(state, buf.toString('utf8').trim()));
    child.stderr.on('data', (buf: Buffer) => this.pushLog(state, buf.toString('utf8').trim()));
    child.on('exit', (code, signal) => {
      this.pushLog(state, `Preview exited code=${code} signal=${signal}`);
      if (state.child === child) {
        state.child = null;
        state.pid = null;
        if (state.status !== 'stopping') state.status = 'offline';
        state.managedByStudio = false;
      }
    });

    // Wait for health (up to ~8s)
    for (let i = 0; i < 16; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const h = await checkPreviewHealth(state.url);
      state.lastHealthAt = h.checkedAt;
      if (h.status === 'running') {
        state.status = 'running';
        state.lastError = null;
        return this.public(state);
      }
      if (!state.child) break;
    }

    state.status = 'failed';
    state.lastError = 'Preview process started but health check did not succeed on localhost';
    return this.public(state);
  }

  async stop(websiteId: string): Promise<ManagedPreviewState> {
    const state = this.states.get(websiteId);
    if (!state) {
      return {
        websiteId,
        status: 'offline',
        url: null,
        port: null,
        pid: null,
        cwd: null,
        command: null,
        startedAt: null,
        lastHealthAt: null,
        lastError: null,
        logTail: [],
        managedByStudio: false,
      };
    }
    state.status = 'stopping';
    if (state.child && state.pid) {
      try {
        state.child.kill('SIGTERM');
        await new Promise((r) => setTimeout(r, 400));
        try {
          process.kill(state.pid, 0);
          state.child.kill('SIGKILL');
        } catch {
          /* already dead */
        }
      } catch (e) {
        state.lastError = e instanceof Error ? e.message : String(e);
      }
    }
    state.child = null;
    state.pid = null;
    state.managedByStudio = false;
    state.status = 'offline';
    this.pushLog(state, 'Preview stopped');
    return this.public(state);
  }

  async restart(website: WebsiteRegistryRecord): Promise<ManagedPreviewState> {
    await this.stop(website.websiteId);
    return this.start(website);
  }

  private public(state: Internal): ManagedPreviewState {
    const { child: _c, ...rest } = state;
    return { ...rest, logTail: [...rest.logTail] };
  }
}

export const websitePreviewManager = new WebsitePreviewManager();
