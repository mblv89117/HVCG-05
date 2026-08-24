import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { classifyDriveItem, classifyFabricRecord, stripSecrets } from '../src/pm/sharepoint/fabric/classify.ts';
import { extractSearchDriveItems } from '../src/pm/sharepoint/fabric/files.ts';
import { extractSourceUrl, isFileIndexRow, fileIndexSummary } from '../src/pm/sharepoint/fabric/fileIndex.ts';
import { createFabricGraphClient, isAllowedFabricGraphPath } from '../src/pm/sharepoint/fabric/graph.ts';
import { runFabricSync } from '../src/pm/sharepoint/fabric/sync.ts';
import { searchSharePointPm } from '../src/pm/sharepoint/search.ts';
import { assertMannyOnly, isMannyPrincipal, MANNY_ENTRA_OID } from '../src/pm/sharepoint/manny.ts';
import { PmHttpError } from '../src/pm/sharepoint/errors.ts';
import type { AtlasPrincipal } from '../src/middleware/auth.ts';
import type { SharePointPmService } from '../src/pm/sharepoint/repository.ts';

const clients = [
  { clientCode: 'CCB01', displayName: 'Colorado Craft Beef', dba: 'Colorado Craft Beef', domains: [] },
  { clientCode: 'HFD01', displayName: 'Hart Family Dental', dba: 'Hart Family Dental', domains: [] },
];

function principal(oid: string, roles = ['HVCG Owner']): AtlasPrincipal {
  return {
    userId: oid,
    organizationId: 'org',
    allowedClientIds: ['CCB01'],
    roles,
  };
}

describe('Manny-only authorization', () => {
  it('accepts only the authenticated Manny Entra oid', () => {
    assert.equal(isMannyPrincipal(principal(MANNY_ENTRA_OID)), true);
    assert.equal(isMannyPrincipal(principal('11111111-1111-4111-8111-111111111001')), false);
    assert.throws(
      () => assertMannyOnly(principal('11111111-1111-4111-8111-111111111001', ['HVCG Owner', 'Administrator']), 'write'),
      (err: unknown) => err instanceof PmHttpError && err.status === 403 && err.code === 'PM_MANNY_ONLY',
    );
    assertMannyOnly(principal(MANNY_ENTRA_OID), 'write');
  });
});

describe('Information fabric classification', () => {
  it('HIGH-associates known client names and does not treat Loanspark as a client', () => {
    const clientHit = classifyFabricRecord(
      { subject: 'Colorado Craft Beef capital update', participants: ['ops@example.com'] },
      clients,
    );
    assert.equal(clientHit.classification, 'CLIENT');
    assert.equal(clientHit.clientCode, 'CCB01');
    assert.equal(clientHit.confidence, 'HIGH');
    assert.equal(clientHit.ingest, 'ordinary');

    const vendor = classifyFabricRecord(
      { subject: 'Loanspark term sheet', participants: ['deals@loanspark.com'] },
      clients,
    );
    assert.equal(vendor.classification, 'VENDOR');
    assert.equal(vendor.clientCode, undefined);
    assert.notEqual(vendor.classification, 'CLIENT');
  });

  it('keeps restricted content as metadata-only and redacts secrets', () => {
    const restricted = classifyFabricRecord(
      { subject: 'W-2 and routing number', preview: 'password hunter2' },
      clients,
    );
    assert.equal(restricted.classification, 'RESTRICTED');
    assert.equal(restricted.ingest, 'metadata_link');
    assert.match(stripSecrets('password hunter2 and a token'), /REDACTED/);
  });

  it('skips personal/unrelated mail', () => {
    const personal = classifyFabricRecord({ subject: 'Netflix billing' }, clients);
    assert.equal(personal.classification, 'PERSONAL_UNRELATED');
    assert.equal(personal.ingest, 'skip');
  });

  it('HIGH-associates HVCG_{ClientCode} libraries and marks restricted folders', () => {
    const lib = classifyDriveItem(
      {
        name: 'HVCG_CCB01',
        webUrl: 'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients/HVCG_CCB01',
      },
      clients,
    );
    assert.equal(lib.classification, 'CLIENT');
    assert.equal(lib.clientCode, 'CCB01');
    assert.equal(lib.confidence, 'HIGH');

    const tax = classifyDriveItem(
      {
        name: '2023 return.pdf',
        webUrl: 'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients/HVCG_CCB01/05%20-%20Tax%20Returns/2023%20return.pdf',
        parentPath: 'HVCG_CCB01 / 05 - Tax Returns',
      },
      clients,
    );
    assert.equal(tax.classification, 'RESTRICTED');
    assert.equal(tax.ingest, 'metadata_link');
    assert.equal(tax.clientCode, 'CCB01');
  });
});

describe('File index markers', () => {
  it('does not treat Channel=Other email as a document', () => {
    assert.equal(isFileIndexRow({ channel: 'Other', summary: 'Called the client' }), false);
    assert.equal(
      isFileIndexRow({
        summary: fileIndexSummary({
          restricted: false,
          webUrl: 'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients/HVCG_CCB01',
          idempotencyKey: 'file:abc',
        }),
        sourceItemId: 'abc',
      }),
      true,
    );
    assert.equal(extractSourceUrl('File metadata index. Source: https://example.com/doc Key:file:1'), 'https://example.com/doc');
  });
});

describe('Fabric Graph allowlist', () => {
  it('allows known site/drive reads and Search POST, rejects tenant-wide site search', () => {
    assert.equal(
      isAllowedFabricGraphPath(
        '/v1.0/sites/highvaluecapitalgroup.sharepoint.com,92b2d35f-6f09-4ec2-8cba-28469e3588d9,ddc8e675-aa6a-46f8-9fd6-86f91dce728e/drives',
      ),
      true,
    );
    assert.equal(
      isAllowedFabricGraphPath('/v1.0/sites/highvaluecapitalgroup.sharepoint.com:/sites/HVCG-Clients'),
      true,
    );
    assert.equal(isAllowedFabricGraphPath('/v1.0/drives/b!abc/root/delta'), true);
    assert.equal(isAllowedFabricGraphPath('/v1.0/search/query', 'POST'), true);
    assert.equal(isAllowedFabricGraphPath('/v1.0/sites'), false);
    assert.equal(isAllowedFabricGraphPath('/v1.0/search/query'), false);
  });

  it('allows owner mailbox inbox messages delta but keeps other mailbox delta blocked', () => {
    assert.equal(
      isAllowedFabricGraphPath(`/v1.0/users/${MANNY_ENTRA_OID}/mailFolders/inbox/messages/delta?$top=50`),
      true,
    );
    assert.equal(
      isAllowedFabricGraphPath('/v1.0/users/11111111-1111-4111-8111-111111111001/mailFolders/inbox/messages/delta'),
      true,
      'shape allowlist accepts user GUID; runtime owner guard rejects non-Manny paths',
    );
  });

  it('returns status 0 for transport failures without weakening unsafe-path rejection', async () => {
    const client = createFabricGraphClient(
      { getToken: async () => 'token' },
      {
        fetch: async () => {
          throw new Error('network down');
        },
      },
    );
    const result = await client.getJson(`/v1.0/users/${MANNY_ENTRA_OID}/mailFolders/inbox/messages/delta?$top=1`);
    assert.equal(result.status, 0);
    assert.equal((result.json.error as { code?: string }).code, 'graph_request_failed');
    await assert.rejects(
      () => client.getJson('/v1.0/sites?search=*'),
      (err: unknown) => err instanceof PmHttpError && err.code === 'PM_BACKEND_UNAVAILABLE',
    );
  });
});

describe('Fabric mail delta checkpointing', () => {
  function service() {
    const communications: Array<Record<string, unknown>> = [];
    return {
      communications,
      async listClientHints() {
        return [{ clientCode: 'CCB01', displayName: 'Colorado Craft Beef', dba: 'Colorado Craft Beef' }];
      },
      async upsertCommunicationIndex(row: Record<string, unknown>) {
        communications.push(row);
      },
      async upsertMeetingIndex() {
        /* not exercised */
      },
      async upsertContactIndex() {
        /* not exercised */
      },
    };
  }

  function graph(paths: string[], firstMailStatus = 200) {
    return {
      paths,
      async getJson(path: string) {
        paths.push(path);
        if (path.includes('/mailFolders/inbox/messages/delta') && paths.filter((p) => p.includes('/mailFolders/inbox/messages/delta')).length === 1) {
          if (firstMailStatus !== 200) return { status: firstMailStatus, json: {} };
          return {
            status: 200,
            json: {
              value: [
                {
                  id: 'm1',
                  conversationId: 'conv-1',
                  subject: 'Colorado Craft Beef capital update',
                  bodyPreview: 'Please review the packet.',
                  receivedDateTime: '2026-08-24T00:00:00Z',
                  from: { emailAddress: { address: 'client@example.com' } },
                  toRecipients: [{ emailAddress: { address: 'manny@highvaluecapitalgroup.com' } }],
                  webLink: 'https://outlook.office.com/mail/m1',
                },
              ],
              '@odata.deltaLink': `/v1.0/users/${MANNY_ENTRA_OID}/mailFolders/inbox/messages/delta?$deltatoken=abc`,
            },
          };
        }
        if (path.includes('/messages?')) {
          return {
            status: 200,
            json: {
              value: [
                {
                  id: 'legacy-1',
                  conversationId: 'legacy-conv',
                  subject: 'Colorado Craft Beef fallback',
                  bodyPreview: 'Fallback recent message.',
                  receivedDateTime: '2026-08-24T00:00:00Z',
                },
              ],
            },
          };
        }
        return { status: 404, json: {} };
      },
      async postJson(path: string) {
        paths.push(`POST ${path}`);
        return { status: 403, json: {} };
      },
    };
  }

  it('stores a durable inbox delta link instead of rescanning recent mail', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'fabric-mail-delta-'));
    const svc = service();
    const paths: string[] = [];
    try {
      const result = await runFabricSync({
        service: svc as unknown as SharePointPmService,
        fabric: graph(paths) as never,
        dataDir: dir,
        bootstrap: true,
      });
      assert.equal(result.indexed.mailThreads, 1);
      assert.equal(result.checkpoint.mailMode, 'delta');
      assert.equal(result.checkpoint.mailDeltaReady, true);
      assert.match(result.checkpoint.mailSkip || '', /deltatoken=abc/);
      assert.equal(paths[0]?.includes('/mailFolders/inbox/messages/delta'), true);
      assert.equal(svc.communications[0]?.idempotencyKey, 'mail:conv-1');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('falls back to recent messages for the run when inbox delta is unavailable', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'fabric-mail-fallback-'));
    const svc = service();
    const paths: string[] = [];
    try {
      const result = await runFabricSync({
        service: svc as unknown as SharePointPmService,
        fabric: graph(paths, 404) as never,
        dataDir: dir,
        bootstrap: true,
      });
      assert.equal(result.indexed.mailThreads, 1);
      assert.equal(result.checkpoint.mailMode, 'page');
      assert.equal(result.checkpoint.mailDeltaReady, undefined);
      assert.ok(result.notes.some((note) => /Mail delta unavailable/.test(note)));
      assert.equal(paths.some((path) => path.includes('/messages?')), true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('Search extracts drive items and includes Atlas records', () => {
  it('parses Graph search hits without copying binaries', () => {
    const items = extractSearchDriveItems({
      value: [
        {
          hitsContainers: [
            {
              hits: [
                {
                  resource: {
                    id: 'item-1',
                    name: 'term-sheet.pdf',
                    webUrl: 'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients/doc',
                  },
                },
              ],
            },
          ],
        },
      ],
    });
    assert.equal(items[0]?.name, 'term-sheet.pdf');
    assert.equal(items[0]?.id, 'item-1');
  });

  it('returns entitled engagements/files and keeps other ClientCodes out', async () => {
    const service = {
      async listAuthorizedClients() {
        return [{ clientCode: 'CCB01', displayName: 'Colorado Craft Beef', dba: 'Colorado Craft Beef' }];
      },
      async listAuthorizedProjects() {
        return [];
      },
      async listAuthorizedTasks() {
        return [];
      },
      async listWorkspaceCollections() {
        return {
          communications: {
            queried: true,
            status: 'COMPLETE',
            items: [
              {
                id: 'f1',
                title: 'HVCG_CCB01',
                summary: fileIndexSummary({
                  restricted: false,
                  webUrl: 'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients/HVCG_CCB01',
                  idempotencyKey: 'file:lib',
                }),
                sourceItemId: 'file:lib',
              },
            ],
          },
          meetings: { queried: true, status: 'COMPLETE', items: [] },
          engagements: {
            queried: true,
            status: 'COMPLETE',
            items: [{ id: 'e1', title: 'CCB capital engagement', summary: 'active' }],
          },
          deliverables: { queried: true, status: 'COMPLETE', items: [] },
          decisionsRisks: { queried: true, status: 'COMPLETE', items: [] },
          contacts: { queried: true, status: 'COMPLETE', items: [] },
        };
      },
      async listVendors() {
        return [{ id: '1', title: 'Loanspark', category: 'Professional Services', notes: 'vendor' }];
      },
      async listOpportunities() {
        return [{ id: '2', title: 'Hidden other opp', clientCode: 'PDG01' }];
      },
      async listIndexedFiles() {
        return [];
      },
    } as unknown as SharePointPmService;
    const found = await searchSharePointPm(service, principal(MANNY_ENTRA_OID), 'CCB');
    assert.ok(found.results.some((r) => r.kind === 'document' && r.clientCode === 'CCB01'));
    assert.ok(found.results.some((r) => r.kind === 'engagement' && r.clientCode === 'CCB01'));
    const entitledOnly = await searchSharePointPm(
      service,
      principal('11111111-1111-4111-8111-111111111001'),
      'Loanspark',
    );
    assert.equal(entitledOnly.results.some((r) => r.kind === 'vendor'), false);
  });

  it('keeps non-entitled ClientCodes out of opportunity/lead/capital hits and does not use /pipeline', async () => {
    const service = {
      async listAuthorizedClients() {
        return [{ clientCode: 'CCB01', displayName: 'Colorado Craft Beef', dba: 'Colorado Craft Beef' }];
      },
      async listAuthorizedProjects() {
        return [];
      },
      async listAuthorizedTasks() {
        return [];
      },
      async listWorkspaceCollections() {
        return {
          communications: { queried: true, status: 'COMPLETE', items: [] },
          meetings: { queried: true, status: 'COMPLETE', items: [] },
          engagements: { queried: true, status: 'COMPLETE', items: [] },
          deliverables: { queried: true, status: 'COMPLETE', items: [] },
          decisionsRisks: { queried: true, status: 'COMPLETE', items: [] },
          contacts: { queried: true, status: 'COMPLETE', items: [] },
        };
      },
      async listVendors() {
        return [];
      },
      async listOpportunities() {
        return [
          { id: 'opp-ccb', title: 'Bridge facility', clientCode: 'CCB01' },
          { id: 'opp-pdg', title: 'Bridge facility', clientCode: 'PDG01' },
          { id: 'opp-open', title: 'Unclassified bridge' },
        ];
      },
      async listIndexedFiles() {
        return [];
      },
      async listLeads() {
        return [
          { id: 'lead-ccb', title: 'Bridge inquiry', clientCode: 'CCB01' },
          { id: 'lead-pdg', title: 'Bridge inquiry', clientCode: 'PDG01' },
        ];
      },
      async listCapitalOpportunities() {
        return [
          { id: 'cap-ccb', title: 'Bridge capital', clientCode: 'CCB01', projectId: '70' },
          { id: 'cap-pdg', title: 'Bridge capital', clientCode: 'PDG01' },
        ];
      },
      async listLenders() {
        return [{ id: 'ln-1', title: 'Bridge lender', notes: 'catalog' }];
      },
    } as unknown as SharePointPmService;

    const entitled = await searchSharePointPm(
      service,
      principal('11111111-1111-4111-8111-111111111001'),
      'Bridge',
    );
    assert.ok(entitled.results.every((r) => r.kind && r.source));
    assert.ok(entitled.results.every((r) => !r.clientCode || r.clientCode === 'CCB01'));
    assert.equal(entitled.results.some((r) => r.clientCode === 'PDG01'), false);
    assert.equal(entitled.results.some((r) => r.kind === 'lender'), false);
    assert.equal(entitled.results.some((r) => r.id === 'opp-open'), false);
    assert.ok(entitled.results.some((r) => r.kind === 'opportunity' && r.clientCode === 'CCB01'));
    assert.ok(entitled.results.some((r) => r.kind === 'lead' && r.clientCode === 'CCB01'));
    assert.ok(
      entitled.results.some(
        (r) => r.kind === 'capital_opportunity' && r.href === '/capital?opportunity=cap-ccb',
      ),
    );
    assert.ok(entitled.results.every((r) => !r.href.includes('/pipeline')));

    const mannyHits = await searchSharePointPm(service, principal(MANNY_ENTRA_OID), 'Bridge');
    assert.equal(mannyHits.scope, 'manny_tenant');
    assert.ok(mannyHits.results.some((r) => r.kind === 'opportunity' && r.clientCode === 'PDG01'));
    assert.ok(mannyHits.results.some((r) => r.kind === 'lender' && r.href === '/capital'));
    assert.ok(mannyHits.results.some((r) => r.id === 'opp-open' && r.href === '/opportunities/opp-open'));
  });
});
