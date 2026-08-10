/** Local Hub helpers for Website Studio QA Agent (127.0.0.1 only). */

const HUB = process.env.ATLAS_HUB_URL || 'http://127.0.0.1:8790';

export const FIXTURE = {
  websiteId: 'ws_hvcg_real',
  changeRequestId: 'wcr_96016971141f',
  baselineCommit: '97e3a913bc2ec7f8884d8bc7035864069122d06e',
  pilotCommit: 'fd4e05d1a634d53a5442d9865487ec76b7a21258',
  beforeH1:
    'Find out what is preventing your business from growing, qualifying for capital, or becoming more valuable.',
  afterH1:
    'Strategic capital advisory to help your business grow, qualify for capital, and build enterprise value.',
};

export function hubHeaders() {
  return {
    'content-type': 'application/json',
    'x-atlas-user-id': 'website-studio-qa-agent',
    'x-atlas-organization-id': 'org-hvcg',
    'x-atlas-client-ids': 'hvcg',
    'x-atlas-roles': 'HVCG Owner',
    'x-atlas-user-email': 'qa-agent@local.test',
  };
}

export async function hub(path, opts = {}) {
  let lastErr;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(`${HUB}${path}`, {
        ...opts,
        headers: { ...hubHeaders(), ...(opts.headers || {}) },
      });
      const text = await res.text();
      let body = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = text;
      }
      if (!res.ok) {
        throw new Error(
          `Hub ${path} → ${res.status}: ${typeof body === 'string' ? body : JSON.stringify(body)}`,
        );
      }
      return body;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw lastErr;
}

export async function probe(url, timeoutMs = 2500) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    return { ok: res.ok || res.status < 500, status: res.status };
  } catch (e) {
    return { ok: false, status: 0, error: String(e) };
  } finally {
    clearTimeout(t);
  }
}

export function extractH1(html) {
  const m = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html || '');
  if (!m) return '';
  return m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}
