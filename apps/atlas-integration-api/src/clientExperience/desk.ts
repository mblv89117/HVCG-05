/**
 * Client desk — Hub HTML for the entitled client only.
 * Not the operator desk. Not SharePoint. Fail-closed unsigned.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AppConfig } from '../config.ts';
import { requirePrincipal } from '../middleware/auth.ts';
import { resolveHubCommit } from '../http/hubCommit.ts';
import { isClientOnlyPrincipal } from './roles.ts';
import { ClientExperienceError, buildClientWorkspaceView } from './service.ts';

export function isClientDeskPath(path: string): boolean {
  return path === '/client' || path === '/client.json';
}

function esc(value: string | number | undefined | null): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const SHELL = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>HVCG client workspace</title>
<style>
  :root { color-scheme: dark; --bg:#0c1116; --card:#161d26; --ink:#e8eef4; --muted:#8b98a5; --line:#2a3644; --good:#3dd68c; --accent:#8cb4ff; }
  body { margin:0; font:15px/1.5 ui-sans-serif,system-ui,Segoe UI,sans-serif; background:var(--bg); color:var(--ink); }
  header, main { max-width:980px; margin:0 auto; padding:22px 24px; }
  h1 { font-size:1.3rem; letter-spacing:.01em; margin:0 0 6px; }
  h2 { font-size:1rem; margin:0 0 8px; }
  .muted { color:var(--muted); }
  .card, section { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:16px 18px; margin:14px 0; }
  .off { color:var(--good); font-size:12px; }
  ul { margin:0; padding-left:18px; }
  li { margin:5px 0; }
  .empty { color:var(--muted); margin:0; }
</style>
</head>
<body>
`;

export function renderUnsignedClientDesk(): string {
  return `${SHELL}
<header>
  <h1>HVCG client workspace</h1>
  <p class="muted">Microsoft sign-in required. This workspace is fail-closed and never renders another client's information.</p>
</header>
<main>
  <section>
    <h2>Signed out</h2>
    <p>Use a Hub API access token issued to your invited client identity. Atlas operator desks, Search, and CRM are not available here.</p>
    <p class="empty">No documents. No requests. No projects.</p>
  </section>
</main>
</body></html>`;
}

export function renderForbiddenClientDesk(): string {
  return `${SHELL}
<header>
  <h1>HVCG client workspace</h1>
  <p class="muted">This signed-in identity is not entitled to a client workspace.</p>
</header>
<main>
  <section>
    <h2>Access denied</h2>
    <p>Client workspaces are isolated by ClientCode. Unauthorized requests fail closed.</p>
  </section>
</main>
</body></html>`;
}

export function renderClientDeskHtml(view: ReturnType<typeof buildClientWorkspaceView>, hubSha?: string): string {
  const attention = view.attention
    .map((row) => `<li><strong>${esc(row.title)}</strong> — ${esc(row.detail)}</li>`)
    .join('');
  const documents = view.documents
    .map((row) => `<li>${esc(row.title)} <span class="muted">(${esc(row.fileName)})</span></li>`)
    .join('');
  const projects = view.projects
    .map((row) => `<li>${esc(row.name)} · ${esc(row.priority)} · ${esc(row.nextAction)}</li>`)
    .join('');
  return `${SHELL}
<header>
  <h1>${esc(view.workspace.displayName)}</h1>
  <p class="muted">ClientCode ${esc(view.clientCode)} · isolated workspace · hub ${esc(hubSha || 'unknown')}</p>
  <p class="off">LIVE_GTM_OUTBOUND=OFF · PAID_ADS=OFF · SharePoint is not the client UX</p>
</header>
<main>
  <section>
    <h2>Needs your attention</h2>
    ${attention ? `<ul>${attention}</ul>` : '<p class="empty">No open requests.</p>'}
  </section>
  <section>
    <h2>Documents</h2>
    ${documents ? `<ul>${documents}</ul>` : '<p class="empty">No documents exchanged yet.</p>'}
  </section>
  <section>
    <h2>Projects and priorities</h2>
    ${projects ? `<ul>${projects}</ul>` : '<p class="empty">No entitled project context.</p>'}
  </section>
  <section>
    <h2>Growth Command Center</h2>
    <p>Your isolated GCC workspace is <code>${esc(view.gcc.workspaceKey)}</code>. It cannot see another client.</p>
  </section>
</main>
</body></html>`;
}

function sendHtml(res: ServerResponse, status: number, body: string, origin?: string | null) {
  const headers: Record<string, string> = {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'x-atlas-client-desk': 'v1',
  };
  if (status === 401) headers['www-authenticate'] = 'Bearer';
  if (origin) {
    headers['access-control-allow-origin'] = origin;
    headers['access-control-allow-credentials'] = 'true';
    headers['vary'] = 'Origin';
  }
  res.writeHead(status, headers);
  res.end(body);
}

function sendJson(res: ServerResponse, status: number, body: unknown, origin?: string | null) {
  const headers: Record<string, string> = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'x-atlas-client-desk': 'v1',
  };
  if (status === 401) headers['www-authenticate'] = 'Bearer';
  if (origin) {
    headers['access-control-allow-origin'] = origin;
    headers['access-control-allow-credentials'] = 'true';
    headers['vary'] = 'Origin';
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

export async function handleClientDesk(opts: {
  cfg: AppConfig;
  req: IncomingMessage;
  res: ServerResponse;
  method: string;
  path: string;
  origin?: string | null;
}): Promise<boolean> {
  if (!isClientDeskPath(opts.path)) return false;
  if (opts.method !== 'GET' && opts.method !== 'HEAD') {
    sendJson(opts.res, 405, { error: 'method_not_allowed', code: 'method_not_allowed' }, opts.origin);
    return true;
  }
  const asJson = opts.path === '/client.json';
  let principal;
  try {
    principal = await requirePrincipal(opts.req, opts.cfg);
  } catch (err) {
    const status = (err as { status?: number }).status || 500;
    if (status === 401) {
      if (asJson) {
        sendJson(
          opts.res,
          401,
          { error: 'unauthorized', code: 'unauthorized', message: 'Microsoft sign-in required (Bearer token missing)' },
          opts.origin,
        );
      } else {
        sendHtml(opts.res, 401, renderUnsignedClientDesk(), opts.origin);
      }
      return true;
    }
    throw err;
  }

  if (!isClientOnlyPrincipal(principal)) {
    if (asJson) {
      sendJson(opts.res, 403, { error: 'forbidden', code: 'forbidden', message: 'Client workspace requires a client principal.' }, opts.origin);
    } else {
      sendHtml(opts.res, 403, renderForbiddenClientDesk(), opts.origin);
    }
    return true;
  }

  try {
    const view = buildClientWorkspaceView({ dataDir: opts.cfg.dataDir, principal });
    if (asJson) {
      sendJson(opts.res, 200, { clientDesk: view, hubSha: resolveHubCommit() }, opts.origin);
    } else {
      sendHtml(opts.res, 200, renderClientDeskHtml(view, resolveHubCommit() || undefined), opts.origin);
    }
  } catch (err) {
    if (err instanceof ClientExperienceError) {
      if (asJson) sendJson(opts.res, err.status, { error: err.code, code: err.code, message: err.message }, opts.origin);
      else sendHtml(opts.res, err.status, renderForbiddenClientDesk(), opts.origin);
      return true;
    }
    throw err;
  }
  return true;
}
