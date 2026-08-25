import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { HubHttpError } from './hubFetch';
import { normalizePmDocumentsResponse } from './pmApi';

describe('PM documents response normalization', () => {
  it('handles an empty document collection', () => {
    const res = normalizePmDocumentsResponse({ documents: [], restrictedOmitted: 0 });
    assert.deepEqual(res.documents, []);
    assert.equal(res.count, 0);
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
  });

  it('handles multiple Hub knowledge-ledger documents', () => {
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
  });

  it('does not normalize unauthorized Hub failures into visible documents', () => {
    const err = new HubHttpError(401, 'unauthorized', { error: 'unauthorized' }, 'unauthorized');
    assert.equal(err.status, 401);
    assert.equal(err.code, 'unauthorized');
  });
});
