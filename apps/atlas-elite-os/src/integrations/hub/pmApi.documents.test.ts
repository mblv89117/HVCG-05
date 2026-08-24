import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { HubHttpError } from './hubFetch';
import { normalizePmDocumentsResponse } from './pmApi';

function assertIterableDocuments(res: ReturnType<typeof normalizePmDocumentsResponse>) {
  assert.equal(Array.isArray(res.documents), true);
  assert.doesNotThrow(() => {
    for (const doc of res.documents) void doc.id;
    res.documents.map((doc) => doc.title);
  });
}

describe('PM documents response normalization', () => {
  it('handles an empty document collection', () => {
    const res = normalizePmDocumentsResponse({ documents: [], restrictedOmitted: 0 });
    assert.deepEqual(res.documents, []);
    assert.equal(res.count, 0);
    assertIterableDocuments(res);
  });

  it('handles one legacy operating document', () => {
    const res = normalizePmDocumentsResponse({
      documents: [
        {
          id: 'doc-1',
          title: 'HVCG engagement letter.pdf',
          kind: 'agreement',
          webUrl: 'https://contoso.sharepoint.com/doc-1',
          clientId: 'PDG01',
          clientName: 'Prodigy Games',
          sourceSystem: 'sharepoint',
          confidentiality: 'internal',
          sensitivityRestricted: false,
        },
      ],
    });
    assert.equal(res.documents.length, 1);
    assert.equal(res.documents[0]?.clientId, 'PDG01');
    assert.equal(res.documents[0]?.confidentiality, 'internal');
    assertIterableDocuments(res);
  });

  it('handles multiple Hub knowledge-ledger documents nested under documents', () => {
    const res = normalizePmDocumentsResponse({
      documents: {
        kind: 'knowledge_ledger_v1',
        source: 'sharepoint_hub_mi',
        graphSitesSearch: false,
        items: [
          {
            id: 'library-PDG01',
            clientCode: 'PDG01',
            title: 'Client SharePoint library',
            webUrl: 'https://contoso.sharepoint.com/sites/pdg',
            kind: 'library',
            provenanceLabel: 'CONFIRMED',
          },
          {
            id: 'file-1',
            clientCode: 'PDG01',
            title: 'Capital packet.pdf',
            kind: 'file',
            provenanceLabel: 'CONFIRMED',
          },
        ],
      },
    });
    assert.equal(res.sourceKind, 'knowledge_ledger_v1');
    assert.equal(res.documents.length, 2);
    assert.equal(res.documents.every((doc) => doc.sourceSystem === 'sharepoint_hub_mi'), true);
    assertIterableDocuments(res);
  });

  it('normalizes a top-level knowledge_ledger_v1 object so for-of never sees a non-array', () => {
    const res = normalizePmDocumentsResponse({
      kind: 'knowledge_ledger_v1',
      items: [
        {
          id: 'file-2',
          clientCode: 'CCB01',
          title: 'Operating agreement.pdf',
          kind: 'file',
          provenanceLabel: 'CONFIRMED',
        },
      ],
    });
    assert.equal(res.sourceKind, 'knowledge_ledger_v1');
    assert.equal(res.documents.length, 1);
    assert.equal(res.documents[0]?.clientId, 'CCB01');
    assertIterableDocuments(res);
  });

  it('skips malformed rows without replacing a bad contract with fake records', () => {
    const res = normalizePmDocumentsResponse({
      documents: {
        kind: 'knowledge_ledger_v1',
        items: [
          null,
          'bad',
          { clientCode: 'HVS01' },
          { id: 'doc-partial', clientCode: 'HVS01', provenanceLabel: 'LIKELY' },
        ],
      },
    });
    assert.equal(res.documents.length, 1);
    assert.equal(res.documents[0]?.id, 'doc-partial');
    assert.equal(res.documents[0]?.classification, 'LIKELY');
    assertIterableDocuments(res);
  });

  it('does not promote LIKELY or PROPOSED to CONFIRMED', () => {
    const res = normalizePmDocumentsResponse({
      kind: 'knowledge_ledger_v1',
      items: [
        { id: 'likely-doc', title: 'Likely packet.pdf', provenanceLabel: 'LIKELY' },
        { id: 'proposed-doc', title: 'Proposed draft.pdf', classification: 'PROPOSED' },
      ],
    });
    assert.equal(res.documents[0]?.classification, 'LIKELY');
    assert.equal(res.documents[1]?.classification, 'PROPOSED');
    assert.equal(
      res.documents.some((doc) => doc.classification === 'CONFIRMED'),
      false,
    );
  });

  it('preserves HVCG source document provenance', () => {
    const res = normalizePmDocumentsResponse({
      documents: [
        {
          id: 'hvcg-doc',
          title: 'HVCG proposal.docx',
          sourceSystem: 'HVCG SharePoint',
          classification: 'CONFIRMED',
          clientId: 'ACCG01',
          sensitivityRestricted: false,
        },
      ],
    });
    assert.equal(res.documents[0]?.sourceSystem, 'HVCG SharePoint');
    assert.equal(res.documents[0]?.classification, 'CONFIRMED');
  });

  it('preserves HVS historical source document provenance', () => {
    const res = normalizePmDocumentsResponse({
      documents: {
        kind: 'knowledge_ledger_v1',
        items: [
          {
            id: 'hvs-doc',
            title: 'HVS recovered engagement.pdf',
            clientCode: 'HVS01',
            source: 'hvs_admin / HIGH VALUE SOLUTION Documents',
            provenanceLabel: 'CONFIRMED',
          },
        ],
      },
    });
    assert.equal(res.documents[0]?.sourceSystem, 'hvs_admin / HIGH VALUE SOLUTION Documents');
    assert.equal(res.documents[0]?.clientId, 'HVS01');
  });

  it('reports unavailable source as an honest empty state', () => {
    const res = normalizePmDocumentsResponse({
      documents: { kind: 'knowledge_ledger_v1', empty: true, items: [] },
    });
    assert.deepEqual(res.documents, []);
    assert.equal(res.unavailableReason, 'authorized source returned no document items');
    assertIterableDocuments(res);
  });

  it('honest-empty for an empty top-level knowledge_ledger_v1 object', () => {
    const res = normalizePmDocumentsResponse({ kind: 'knowledge_ledger_v1', items: [] });
    assert.deepEqual(res.documents, []);
    assert.equal(res.unavailableReason, 'authorized source returned no document items');
    assertIterableDocuments(res);
  });

  it('does not normalize unauthorized Hub failures into visible documents', () => {
    const err = new HubHttpError(401, 'unauthorized', { error: 'unauthorized' }, 'unauthorized');
    assert.equal(err.status, 401);
    assert.equal(err.code, 'unauthorized');

    const res = normalizePmDocumentsResponse({
      error: 'unauthorized',
      documents: {
        kind: 'knowledge_ledger_v1',
        items: [{ id: 'secret', title: 'Should not render', provenanceLabel: 'CONFIRMED' }],
      },
    });
    assert.deepEqual(res.documents, []);
    assert.equal(res.unavailableReason, 'unauthorized');
    assertIterableDocuments(res);
  });
});
