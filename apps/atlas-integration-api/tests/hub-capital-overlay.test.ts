import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildSyntheticPdf } from '@hvcg/atlas-capital-core';
import { CapitalService } from '../src/capital/service.ts';
import { AsyncCapitalStore, GraphCapitalStore } from '../src/capital/sharepoint/repository.ts';
import type { CapitalGraphTransport, GraphListItem, GraphListPage } from '../src/capital/sharepoint/graph.ts';
import type { SharePointCapitalSettings } from '../src/capital/sharepoint/settings.ts';
import { MemoryCapitalFileSource } from '../src/capital/sharepoint/files.ts';
import { CapitalHttpError } from '../src/capital/errors.ts';
import {
  applyOverlayToState,
  overlayFromState,
  readCapitalOverlay,
  resolveCapitalOverlayDir,
  writeCapitalOverlay,
} from '../src/capital/overlay.ts';
import { emptyState } from '../src/capital/store.ts';
import type { AtlasPrincipal } from '../src/middleware/auth.ts';

const SITE =
  'contoso.sharepoint.com,11111111-1111-4111-8111-111111111011,22222222-2222-4222-8222-222222222022';
const OPPORTUNITIES = '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const DOCUMENT_REQUESTS = '22222222-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
const LENDER_OUTREACH = '33333333-cccc-4ccc-8ccc-ccccccccccc1';
const LENDERS = '44444444-dddd-4ddd-8ddd-ddddddddddd1';
const CLIENTS = '55555555-eeee-4eee-8eee-eeeeeeeeeee1';
const MI = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1';

class MemoryGraph implements CapitalGraphTransport {
  readonly lists = new Map<string, GraphListItem[]>();
  nextId = 1;
  etagN = 1;

  constructor() {
    this.lists.set(OPPORTUNITIES, []);
    this.lists.set(DOCUMENT_REQUESTS, []);
    this.lists.set(LENDER_OUTREACH, []);
    this.lists.set(LENDERS, []);
    this.lists.set(CLIENTS, []);
  }

  seed(listId: string, fields: Record<string, unknown>, id?: string): GraphListItem {
    const item: GraphListItem = {
      id: id || String(this.nextId++),
      etag: `"etag-${this.etagN++}"`,
      fields: { ...fields },
    };
    const arr = this.lists.get(listId) || [];
    arr.push(item);
    this.lists.set(listId, arr);
    return item;
  }

  async listItems(listId: string): Promise<GraphListPage> {
    return { items: this.lists.get(listId) || [] };
  }

  async getItem(listId: string, itemId: string): Promise<GraphListItem | null> {
    return (this.lists.get(listId) || []).find((i) => i.id === itemId) || null;
  }

  async createItem(listId: string, fields: Record<string, unknown>): Promise<GraphListItem> {
    return this.seed(listId, fields);
  }

  async patchItemFields(
    listId: string,
    itemId: string,
    fields: Record<string, unknown>,
    etag: string,
  ): Promise<GraphListItem> {
    const item = (this.lists.get(listId) || []).find((i) => i.id === itemId);
    if (!item) throw new CapitalHttpError(404, 'not_found', 'not_found');
    if (etag !== item.etag) {
      throw new CapitalHttpError(412, 'CAPITAL_ETAG_CONFLICT', 'The SharePoint item was updated by another request.');
    }
    item.fields = { ...item.fields, ...fields };
    item.etag = `"etag-${this.etagN++}"`;
    return item;
  }
}

const SETTINGS: SharePointCapitalSettings = {
  siteId: SITE,
  opportunitiesListId: OPPORTUNITIES,
  documentRequestsListId: DOCUMENT_REQUESTS,
  lenderOutreachListId: LENDER_OUTREACH,
  lendersListId: LENDERS,
  clientsListId: CLIENTS,
  managedIdentityClientId: MI,
  allowSyntheticGraph: false,
  optionalColumns: [
    'Stage',
    'StageEnteredAt',
    'NextAction',
    'MannyStrategyApproval',
    'MannyShortlistApproval',
    'ClientApproval',
    'TransactionType',
    'ChecklistItemKey',
    'ChecklistStatus',
    'SubmissionStatus',
    'SubmissionMethod',
    'SubmittedAt',
    'SubmittedBy',
  ],
};

const OWNER: AtlasPrincipal = {
  userId: 'user-owner',
  email: 'manny@example.com',
  organizationId: 'hvcg',
  allowedClientIds: ['ACCG01'],
  roles: ['HVCG Owner'],
};

const MEMBER: AtlasPrincipal = {
  userId: 'user-member',
  email: 'member@example.com',
  organizationId: 'hvcg',
  allowedClientIds: ['ACCG01'],
  roles: ['HVCG Team Member'],
};

function pnlPdf(revenue = 1_850_000, net = 210_000): Buffer {
  return buildSyntheticPdf([
    'Alder & Co P&L YTD July 2026',
    `Revenue: $${revenue}`,
    `Gross profit: $740000`,
    `Net income: $${net}`,
  ]);
}

describe('capital overlay persistence', () => {
  it('resolves App Service /home/data before wwwroot', () => {
    assert.equal(
      resolveCapitalOverlayDir('/tmp/wwwroot', {
        INTEGRATION_CAPITAL_OVERLAY_DIR: '/custom/overlay',
      } as NodeJS.ProcessEnv),
      '/custom/overlay',
    );
    assert.equal(
      resolveCapitalOverlayDir('/tmp/wwwroot', {
        INTEGRATION_DATA_DIR: '/tmp/data',
        HOME: '/Users/qa',
      } as NodeJS.ProcessEnv),
      join('/tmp/data', 'capital-overlay'),
    );
  });

  it('writes and reloads facts, reviews, SourceRefs, and audits', () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-overlay-unit-'));
    try {
      const state = emptyState();
      state.documents.push({
        id: 'doc-1',
        capitalOpportunityId: 'cap-1',
        clientCode: 'ACCG01',
        documentType: 'pnl',
        fileName: 'pnl.pdf',
        contentType: 'application/pdf',
        sizeBytes: 12,
        sha256: 'abc',
        version: 1,
        source: 'sharepoint-library',
        associatedAt: '2026-08-17T00:00:00.000Z',
        associatedBy: 'qa',
        originalPreserved: true,
        driveId: 'd1',
        itemId: 'i1',
      });
      state.reviews.push({
        id: 'rev-1',
        capitalOpportunityId: 'cap-1',
        documentId: 'doc-1',
        classifiedType: 'pnl',
        summary: 'pnl',
        extractedFacts: [
          {
            id: 'fact-doc-1-revenue',
            field: 'revenue',
            value: 1_850_000,
            verification: 'VERIFIED',
            confidence: 0.9,
            sourceRef: {
              sourceSystem: 'atlas-document-intelligence',
              capturedAt: '2026-08-17T00:00:00.000Z',
              field: 'revenue',
              sourceRecordId: 'd1:i1',
            },
            reviewer: 'manny@example.com',
            reviewerDecision: 'VERIFY',
          },
        ],
        incompletePages: false,
        stale: false,
        inconsistentPeriod: false,
        conflicts: [],
        confidence: 0.9,
        reviewer: 'human',
        createdAt: '2026-08-17T00:00:00.000Z',
        disclaimer: 'test',
      });
      state.factReviews.push({
        id: 'fra-1',
        clientCode: 'ACCG01',
        capitalOpportunityId: 'cap-1',
        factId: 'fact-doc-1-revenue',
        previousState: 'UNVERIFIED',
        newState: 'VERIFIED',
        originalValue: 1_850_000,
        finalValue: 1_850_000,
        sourceRef: {
          sourceSystem: 'atlas-document-intelligence',
          capturedAt: '2026-08-17T00:00:00.000Z',
          field: 'revenue',
          sourceRecordId: 'd1:i1',
        },
        reviewer: 'manny@example.com',
        timestamp: '2026-08-17T00:00:00.000Z',
        decision: 'VERIFY',
      });
      writeCapitalOverlay(dir, overlayFromState(state));
      assert.equal(existsSync(join(dir, 'capital-intelligence-overlay.json')), true);
      const loaded = emptyState();
      applyOverlayToState(loaded, readCapitalOverlay(dir));
      assert.equal(loaded.documents[0].itemId, 'i1');
      assert.equal(loaded.reviews[0].extractedFacts[0].verification, 'VERIFIED');
      assert.equal(loaded.reviews[0].extractedFacts[0].sourceRef.sourceRecordId, 'd1:i1');
      assert.equal(loaded.factReviews[0].decision, 'VERIFY');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('SharePoint overlay recycle + ingest identity', () => {
  it('survives a new store (recycle), does not duplicate, and preserves reviews', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-overlay-recycle-'));
    const overlayDir = join(dir, 'capital-overlay');
    const graph = new MemoryGraph();
    graph.seed(CLIENTS, { Title: 'Alder & Co.', ClientCode: 'ACCG01' }, '1');
    const files = new MemoryCapitalFileSource();
    const driveId = 'drive-accg';
    const pnlItem = 'item-pnl';
    const loanItem = 'item-loan';
    const copyItem = 'item-pnl-copy';
    files.seed(
      {
        driveId,
        itemId: pnlItem,
        name: 'ACCG01 P&L YTD July 2026.pdf',
        mimeType: 'application/pdf',
        size: 1,
        eTag: '"v1"',
        parentPath: '/drives/drive-accg/root:/HVCG_ACCG01/04 - Current Financials',
        libraryClientCode: 'ACCG01',
        webUrl: 'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients/HVCG_ACCG01/pnl.pdf',
      },
      pnlPdf(),
    );
    files.seed(
      {
        driveId,
        itemId: loanItem,
        name: 'ACCG01 Loan Statement.pdf',
        mimeType: 'application/pdf',
        size: 1,
        parentPath: '/drives/drive-accg/root:/HVCG_ACCG01/07 - Debt Schedule',
        libraryClientCode: 'ACCG01',
        webUrl: 'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients/HVCG_ACCG01/loan.pdf',
      },
      buildSyntheticPdf(['Alder & Co loan statement', 'Outstanding loan balance: $450000']),
    );
    files.seed(
      {
        driveId,
        itemId: copyItem,
        name: 'ACCG01 P&L YTD July 2026.pdf',
        mimeType: 'application/pdf',
        size: 1,
        parentPath: '/drives/drive-accg/root:/HVCG_ACCG01/04 - Current Financials',
        libraryClientCode: 'ACCG01',
      },
      pnlPdf(),
    );

    const store1 = new AsyncCapitalStore(new GraphCapitalStore(SETTINGS, graph), { overlayDir });
    const svc1 = new CapitalService(store1, files);
    const created = await svc1.create(OWNER, {
      title: 'ACCG working capital',
      clientCode: 'ACCG01',
      clientId: 'ACCG01',
      transactionType: 'working_capital_loc',
      need: { requestedAmount: 250_000 },
      business: {
        annualRevenue: {
          value: 1_850_000,
          verification: 'VERIFIED',
          confidence: 1,
          sourceRef: { sourceSystem: 'synthetic-fixture', capturedAt: '2026-08-01T00:00:00.000Z' },
        },
      },
      idempotencyKey: 'accg-overlay-001',
    });
    const id = created.opportunity.id;
    await svc1.generateChecklist(OWNER, id);

    const first = await svc1.ingestSharePointFile(OWNER, id, { driveId, itemId: pnlItem });
    assert.equal(first.duplicate, false);
    const factCount = first.report.documents[0].extraction.facts.length;
    assert.ok(factCount >= 2);
    const replay = await svc1.ingestSharePointFile(OWNER, id, { driveId, itemId: pnlItem });
    assert.equal(replay.replayed, true);
    assert.equal(replay.document.id, first.document.id);
    const afterReplay = await svc1.evidenceReview(OWNER, id);
    assert.equal(afterReplay.cards.length, (await svc1.evidenceReview(OWNER, id)).cards.length);

    const [p1, p2] = await Promise.all([
      svc1.ingestSharePointFile(OWNER, id, { driveId, itemId: pnlItem }),
      svc1.ingestSharePointFile(OWNER, id, { driveId, itemId: pnlItem }),
    ]);
    assert.equal(p1.document.id, first.document.id);
    assert.equal(p2.document.id, first.document.id);

    const copy = await svc1.ingestSharePointFile(OWNER, id, { driveId, itemId: copyItem });
    assert.equal(copy.duplicate, true);
    assert.equal(copy.document.duplicateOf, first.document.id);
    const cardsAfterCopy = await svc1.evidenceReview(OWNER, id);
    const revenueCards = cardsAfterCopy.cards.filter((c) => c.field === 'revenue');
    assert.equal(revenueCards.length, 1);

    const loan = await svc1.ingestSharePointFile(OWNER, id, { driveId, itemId: loanItem });
    const debtItem = loan.checklist.find((i) => i.itemKey === 'debt-schedule' || /debt schedule/i.test(i.name || ''));
    assert.ok(
      debtItem,
      JSON.stringify(loan.checklist.map((i) => ({ key: i.itemKey, status: i.status, support: i.requestSupport, name: i.name }))),
    );
    assert.equal(debtItem.status, 'NEEDS_REVIEW');
    assert.notEqual(debtItem.status, 'ACCEPTED');
    assert.equal(debtItem.requestSupport, 'PARTIAL_SUPPORT_ONLY');
    assert.ok(debtItem.fileLink);

    const cards = await svc1.evidenceReview(OWNER, id);
    const revenue = cards.cards.find((c) => c.field === 'revenue');
    const net = cards.cards.find((c) => c.field === 'netIncome');
    const gp = cards.cards.find((c) => c.field === 'grossProfit');
    assert.ok(revenue && net && gp);
    await svc1.reviewFact(OWNER, id, revenue.factId, { decision: 'VERIFY' });
    await svc1.reviewFact(OWNER, id, gp.factId, {
      decision: 'CORRECT',
      correctedValue: 741_000,
      reason: 'synthetic QA correction',
    });
    await svc1.reviewFact(OWNER, id, net.factId, { decision: 'REJECT', reason: 'synthetic QA reject' });

    files.seed(
      {
        driveId,
        itemId: pnlItem,
        name: 'ACCG01 P&L YTD July 2026.pdf',
        mimeType: 'application/pdf',
        size: 2,
        eTag: '"v2"',
        parentPath: '/drives/drive-accg/root:/HVCG_ACCG01/04 - Current Financials',
        libraryClientCode: 'ACCG01',
      },
      pnlPdf(2_000_000, 210_000),
    );
    const versioned = await svc1.ingestSharePointFile(OWNER, id, { driveId, itemId: pnlItem });
    assert.equal(versioned.versionChanged, true);
    assert.equal(versioned.document.id, first.document.id);
    assert.equal(versioned.document.version, 2);

    const store2 = new AsyncCapitalStore(new GraphCapitalStore(SETTINGS, graph), { overlayDir });
    const svc2 = new CapitalService(store2, files);
    const recovered = await svc2.evidenceReview(OWNER, id);
    const recRev = recovered.cards.find((c) => c.field === 'revenue');
    const recGp = recovered.cards.find((c) => c.field === 'grossProfit');
    const recNet = recovered.cards.find((c) => c.field === 'netIncome');
    assert.equal(recRev?.verificationState, 'VERIFIED');
    assert.equal(recRev?.extractedValue, 1_850_000);
    assert.equal(recRev?.sourceRef.sourceRecordId, `${driveId}:${pnlItem}`);
    assert.equal(recGp?.verificationState, 'VERIFIED');
    assert.equal(recGp?.extractedValue, 741_000);
    assert.equal(recGp?.originalValue, 740_000);
    assert.equal(recGp?.correctedValue, 741_000);
    assert.equal(recNet?.verificationState, 'REJECTED');
    const got = await svc2.get(OWNER, id);
    assert.ok(got.underwriting);
    assert.equal(got.documents.length, 3);
    const stolen = await svc2
      .reviewFact(MEMBER, id, recRev!.factId, { decision: 'VERIFY' })
      .then(() => 'ok')
      .catch((err: unknown) => err);
    assert.ok(stolen instanceof CapitalHttpError);
    assert.equal((stolen as CapitalHttpError).status, 403);

    rmSync(dir, { recursive: true, force: true });
  });
});
