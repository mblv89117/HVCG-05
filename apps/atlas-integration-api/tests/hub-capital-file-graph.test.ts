import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_INGEST_BYTES } from '@hvcg/atlas-capital-core';
import {
  createGraphCapitalFileSource,
  isAllowedSharePointContentDownloadUrl,
} from '../src/capital/sharepoint/files.ts';
import { CapitalHttpError } from '../src/capital/errors.ts';

const DRIVE = 'b!A4KEE0R0mkSWNLuE9NymGXXmyN1qqvhGn9aG-R3Oco5fYtAf1UUmTLEW549Mv-Mb';
const ITEM = '01OCOIJZ5EJP7WHBAAJJAILMDH6BRFQMWC';
const TOKEN = 'test-capital-file-token-do-not-forward';
const PREAUTH =
  'https://highvaluecapitalgroup.sharepoint.com/_layouts/15/download.aspx?UniqueId=abc&tempauth=super-secret-download-token';
const GRAPH_CONTENT = `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(DRIVE)}/items/${encodeURIComponent(ITEM)}/content`;
const GRAPH_ITEM = `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(DRIVE)}/items/${encodeURIComponent(ITEM)}?$select=id,name,size,file,webUrl,parentReference,createdDateTime,lastModifiedDateTime`;

function assertNoLeak(err: unknown): asserts err is CapitalHttpError {
  assert.ok(err instanceof CapitalHttpError);
  const blob = `${err.message}\n${err.stack || ''}\n${err.code}\n${JSON.stringify(err)}`;
  assert.equal(blob.includes(TOKEN), false);
  assert.equal(blob.includes('tempauth'), false);
  assert.equal(blob.includes('super-secret-download-token'), false);
  assert.equal(blob.toLowerCase().includes('authorization'), false);
  assert.equal(blob.includes(PREAUTH), false);
}

function source(
  fetchImpl: typeof fetch,
  extra?: { timeoutMs?: number },
) {
  return createGraphCapitalFileSource({ getToken: async () => TOKEN }, { fetch: fetchImpl, ...extra });
}

describe('Graph capital file content download', () => {
  it('allows only HTTPS SharePoint/Graph download hosts without userinfo', () => {
    assert.equal(isAllowedSharePointContentDownloadUrl(PREAUTH), true);
    assert.equal(isAllowedSharePointContentDownloadUrl('https://graph.microsoft.com/v1.0/drives/x/items/y/content'), true);
    assert.equal(isAllowedSharePointContentDownloadUrl(''), false);
    assert.equal(isAllowedSharePointContentDownloadUrl('not a url'), false);
    assert.equal(isAllowedSharePointContentDownloadUrl('http://highvaluecapitalgroup.sharepoint.com/x'), false);
    assert.equal(isAllowedSharePointContentDownloadUrl('https://evil.example/file.pdf'), false);
    assert.equal(
      isAllowedSharePointContentDownloadUrl('https://evil@highvaluecapitalgroup.sharepoint.com/x'),
      false,
    );
    assert.equal(isAllowedSharePointContentDownloadUrl('https://highvaluecapitalgroup.sharepoint.com.evil.com/x'), false);
  });

  it('returns Graph 200 content bytes without a redirect', async () => {
    const calls: Array<{ url: string; hasAuth: boolean }> = [];
    const bytes = await source(async (url, init) => {
      const headers = new Headers(init?.headers);
      calls.push({ url: String(url), hasAuth: headers.has('authorization') });
      assert.equal(String(url), GRAPH_CONTENT);
      return new Response(Buffer.from('%PDF-1.4 direct'), {
        status: 200,
        headers: { 'content-type': 'application/pdf' },
      });
    }).getContent(DRIVE, ITEM);
    assert.equal(bytes.toString(), '%PDF-1.4 direct');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].hasAuth, true);
  });

  it('follows exactly one Graph 302 Location without forwarding the Graph token', async () => {
    const calls: Array<{ url: string; hasAuth: boolean; logged: string }> = [];
    const bytes = await source(async (url, init) => {
      const href = String(url);
      const headers = new Headers(init?.headers);
      calls.push({ url: href, hasAuth: headers.has('authorization'), logged: JSON.stringify(init) });
      if (href.startsWith('https://graph.microsoft.com/')) {
        return new Response(null, { status: 302, headers: { location: PREAUTH } });
      }
      return new Response(Buffer.from('%PDF-1.4 synthetic'), { status: 200 });
    }).getContent(DRIVE, ITEM);
    assert.equal(bytes.toString(), '%PDF-1.4 synthetic');
    assert.equal(calls.length, 2);
    assert.equal(calls[0].url, GRAPH_CONTENT);
    assert.equal(calls[0].hasAuth, true);
    assert.equal(calls[1].url, PREAUTH);
    assert.equal(calls[1].hasAuth, false);
    assert.equal(calls[1].logged.includes(TOKEN), false);
  });

  it('fail-closes 302 without Location', async () => {
    await assert.rejects(
      () =>
        source(async () => new Response(null, { status: 302 })).getContent(DRIVE, ITEM),
      (err: unknown) => {
        assertNoLeak(err);
        assert.equal(err.code, 'CAPITAL_BACKEND_UNAVAILABLE');
        return true;
      },
    );
  });

  it('rejects non-HTTPS Location', async () => {
    await assert.rejects(
      () =>
        source(async () =>
          new Response(null, {
            status: 302,
            headers: { location: 'http://highvaluecapitalgroup.sharepoint.com/x' },
          }),
        ).getContent(DRIVE, ITEM),
      (err: unknown) => {
        assertNoLeak(err);
        return true;
      },
    );
  });

  it('rejects a second redirect', async () => {
    await assert.rejects(
      () =>
        source(async (url) => {
          const href = String(url);
          if (href.startsWith('https://graph.microsoft.com/')) {
            return new Response(null, { status: 302, headers: { location: PREAUTH } });
          }
          return new Response(null, {
            status: 302,
            headers: { location: 'https://highvaluecapitalgroup.sharepoint.com/second' },
          });
        }).getContent(DRIVE, ITEM),
      (err: unknown) => {
        assertNoLeak(err);
        assert.equal(err.code, 'CAPITAL_BACKEND_UNAVAILABLE');
        return true;
      },
    );
  });

  it('rejects off-domain content redirects and metadata redirects', async () => {
    await assert.rejects(
      () =>
        source(async () =>
          new Response(null, { status: 302, headers: { location: PREAUTH } }),
        ).getItem(DRIVE, ITEM),
      (err: unknown) => {
        assertNoLeak(err);
        return true;
      },
    );
    await assert.rejects(
      () =>
        source(async () =>
          new Response(null, { status: 302, headers: { location: 'https://evil.example/steal' } }),
        ).getContent(DRIVE, ITEM),
      (err: unknown) => {
        assertNoLeak(err);
        return true;
      },
    );
  });

  it('does not accept a user-supplied download URL as a Graph request', async () => {
    const calls: string[] = [];
    await source(async (url) => {
      calls.push(String(url));
      return new Response(Buffer.from('%PDF-1.4'), { status: 200 });
    }).getContent(DRIVE, ITEM);
    assert.deepEqual(calls, [GRAPH_CONTENT]);
    assert.equal(calls.some((u) => u.includes('evil.example')), false);
  });

  it('rejects oversized content-length on the download', async () => {
    await assert.rejects(
      () =>
        source(async (url) => {
          if (String(url).startsWith('https://graph.microsoft.com/')) {
            return new Response(null, { status: 302, headers: { location: PREAUTH } });
          }
          return new Response(Buffer.from('x'), {
            status: 200,
            headers: { 'content-length': String(MAX_INGEST_BYTES + 1) },
          });
        }).getContent(DRIVE, ITEM),
      (err: unknown) => {
        assert.ok(err instanceof CapitalHttpError);
        assert.equal(err.status, 422);
        assertNoLeak(err);
        return true;
      },
    );
  });

  it('times out safely without leaking URLs', async () => {
    await assert.rejects(
      () =>
        source(
          (_url, init) =>
            new Promise((_, reject) => {
              init?.signal?.addEventListener('abort', () => {
                const err = new Error('aborted');
                err.name = 'AbortError';
                reject(err);
              });
            }),
          { timeoutMs: 20 },
        ).getContent(DRIVE, ITEM),
      (err: unknown) => {
        assertNoLeak(err);
        assert.equal((err as CapitalHttpError).code, 'CAPITAL_BACKEND_UNAVAILABLE');
        assert.match((err as CapitalHttpError).message, /timed out|failed/i);
        return true;
      },
    );
  });

  it('maps Graph 401/403 to fail-closed unavailable and 404 to not_found', async () => {
    await assert.rejects(
      () => source(async () => new Response('nope', { status: 401 })).getContent(DRIVE, ITEM),
      (err: unknown) => {
        assertNoLeak(err);
        assert.equal((err as CapitalHttpError).code, 'CAPITAL_BACKEND_UNAVAILABLE');
        return true;
      },
    );
    await assert.rejects(
      () => source(async () => new Response('nope', { status: 403 })).getContent(DRIVE, ITEM),
      (err: unknown) => {
        assertNoLeak(err);
        assert.equal((err as CapitalHttpError).code, 'CAPITAL_BACKEND_UNAVAILABLE');
        return true;
      },
    );
    await assert.rejects(
      () => source(async () => new Response('missing', { status: 404 })).getContent(DRIVE, ITEM),
      (err: unknown) => {
        assertNoLeak(err);
        assert.equal((err as CapitalHttpError).status, 404);
        return true;
      },
    );
    await assert.rejects(
      () => source(async () => new Response('boom', { status: 503 })).getContent(DRIVE, ITEM),
      (err: unknown) => {
        assertNoLeak(err);
        assert.equal((err as CapitalHttpError).code, 'CAPITAL_BACKEND_UNAVAILABLE');
        return true;
      },
    );
  });

  it('returns item metadata on Graph 200 JSON', async () => {
    const meta = await source(async (url) => {
      assert.equal(String(url), GRAPH_ITEM);
      return new Response(
        JSON.stringify({
          id: ITEM,
          name: 'SYN01 P&L YTD July 2026.pdf',
          size: 780,
          file: { mimeType: 'application/pdf' },
          webUrl: 'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients/HVCG_SYN01/file.pdf',
          parentReference: { path: '/drives/x/root:/HVCG_SYN01/04 - Current Financials' },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }).getItem(DRIVE, ITEM);
    assert.equal(meta.libraryClientCode, 'SYN01');
    assert.equal(meta.name, 'SYN01 P&L YTD July 2026.pdf');
  });
});
