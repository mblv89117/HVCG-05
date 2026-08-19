import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyDriveItem, classifyFabricRecord, stripSecrets } from '../src/pm/sharepoint/fabric/classify.ts';
import { extractSearchDriveItems } from '../src/pm/sharepoint/fabric/files.ts';
import { extractSourceUrl, isFileIndexRow, fileIndexSummary } from '../src/pm/sharepoint/fabric/fileIndex.ts';
import { isAllowedFabricGraphPath } from '../src/pm/sharepoint/fabric/graph.ts';
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
    assert.ok(mannyHits.results.some((r) => r.id === 'opp-open' && r.href === '/capital'));
  });
});
