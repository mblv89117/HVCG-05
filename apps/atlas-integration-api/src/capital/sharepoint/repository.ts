/**
 * SharePoint Graph capital repository.
 *
 * Writes only allowlisted capital lists. Save is not a full dump: dirty
 * opportunities, checklists, and submissions are persisted individually.
 * Never auto-submits to lenders. Never seeds SYNTHETIC Bank into HVCG_Lenders.
 */

import type {
  CapitalOpportunity,
  ChecklistItem,
  FinancingStrategy,
  LenderSubmission,
} from '@hvcg/atlas-capital-core';
import { FINANCING_DISCLAIMER, isSyntheticCapitalRecord, mergeSourcedLenderCatalog } from '@hvcg/atlas-capital-core';
import { CapitalHttpError, capitalInfrastructureError, forbidden } from '../errors.ts';
import { emptyState, type CapitalPersistence, type CapitalState } from '../store.ts';
import type { CapitalGraphTransport, GraphListItem } from './graph.ts';
import {
  checklistItemFromItem,
  checklistItemToFields,
  lenderFromItem,
  lookupIdFromFields,
  opportunityFromItem,
  opportunityToFields,
  pickWritableFields,
  submissionFromItem,
  submissionToFields,
  type FieldWriteOptions,
} from './map.ts';
import type { SharePointCapitalSettings } from './settings.ts';

export { isSyntheticCapitalRecord };

function cloneState(state: CapitalState): CapitalState {
  return JSON.parse(JSON.stringify(state)) as CapitalState;
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export class GraphCapitalStore {
  private readonly etags = new Map<string, string>();
  private readonly writeOpts: FieldWriteOptions;

  constructor(
    private readonly settings: SharePointCapitalSettings,
    private readonly graph: CapitalGraphTransport,
  ) {
    this.writeOpts = settings.optionalColumns?.length
      ? { availableColumns: new Set(settings.optionalColumns), includeAdditive: true }
      : { includeAdditive: false };
  }

  private etagKey(listId: string, itemId: string): string {
    return `${listId}:${itemId}`;
  }

  private remember(listId: string, item: GraphListItem): void {
    if (item.id && item.etag) this.etags.set(this.etagKey(listId, item.id), item.etag);
  }

  private requireEtag(listId: string, itemId: string): string {
    const etag = this.etags.get(this.etagKey(listId, itemId));
    if (!etag || etag === '*') {
      throw new CapitalHttpError(400, 'CAPITAL_ETAG_REQUIRED', 'If-Match is required for SharePoint capital updates.');
    }
    return etag;
  }

  private assertGraphWriteAllowed(input: { clientCode?: string; title?: string }): void {
    if (isSyntheticCapitalRecord(input) && !this.settings.allowSyntheticGraph) {
      forbidden('Synthetic capital records cannot be written to SharePoint.');
    }
  }

  private async listAll(listId: string): Promise<GraphListItem[]> {
    const items: GraphListItem[] = [];
    let nextLink: string | undefined;
    do {
      const page = await this.graph.listItems(listId, { nextLink, top: 100 });
      for (const item of page.items) this.remember(listId, item);
      items.push(...page.items);
      nextLink = page.nextLink;
    } while (nextLink);
    return items;
  }

  private async resolveClientItemId(clientCode: string): Promise<string | undefined> {
    if (!this.settings.clientsListId) return undefined;
    const items = await this.listAll(this.settings.clientsListId);
    const hit = items.find((i) => String(i.fields.ClientCode || '').trim() === clientCode);
    return hit?.id;
  }

  async listOpportunities(): Promise<CapitalOpportunity[]> {
    const items = await this.listAll(this.settings.opportunitiesListId);
    return items.map(opportunityFromItem).filter((o): o is CapitalOpportunity => Boolean(o));
  }

  async getOpportunity(id: string): Promise<CapitalOpportunity | null> {
    const item = await this.graph.getItem(this.settings.opportunitiesListId, id);
    if (!item) return null;
    this.remember(this.settings.opportunitiesListId, item);
    return opportunityFromItem(item);
  }

  async createOpportunity(opp: CapitalOpportunity): Promise<CapitalOpportunity> {
    this.assertGraphWriteAllowed(opp);
    if (opp.idempotencyKey) {
      const existing = (await this.listOpportunities()).find((o) => o.idempotencyKey === opp.idempotencyKey);
      if (existing) return existing;
    }
    const clientSharePointItemId = await this.resolveClientItemId(opp.clientCode);
    const fields = pickWritableFields(
      opportunityToFields(opp, { ...this.writeOpts, clientSharePointItemId }),
      this.writeOpts,
    );
    const item = await this.graph.createItem(this.settings.opportunitiesListId, fields);
    this.remember(this.settings.opportunitiesListId, item);
    const mapped = opportunityFromItem(item);
    if (!mapped) {
      throw capitalInfrastructureError('CAPITAL_BACKEND_UNAVAILABLE', 'Created capital opportunity could not be mapped.');
    }
    return mapped;
  }

  async patchOpportunity(opp: CapitalOpportunity): Promise<CapitalOpportunity> {
    this.assertGraphWriteAllowed(opp);
    const etag = this.requireEtag(this.settings.opportunitiesListId, opp.id);
    const clientSharePointItemId = await this.resolveClientItemId(opp.clientCode);
    const fields = pickWritableFields(
      opportunityToFields(opp, { ...this.writeOpts, clientSharePointItemId }),
      this.writeOpts,
    );
    const item = await this.graph.patchItemFields(this.settings.opportunitiesListId, opp.id, fields, etag);
    this.remember(this.settings.opportunitiesListId, item);
    const mapped = opportunityFromItem(item);
    if (!mapped) {
      throw capitalInfrastructureError('CAPITAL_BACKEND_UNAVAILABLE', 'Patched capital opportunity could not be mapped.');
    }
    return mapped;
  }

  async replaceChecklist(opportunityId: string, clientCode: string, items: ChecklistItem[]): Promise<ChecklistItem[]> {
    this.assertGraphWriteAllowed({ clientCode });
    const existing = (await this.listAll(this.settings.documentRequestsListId)).filter(
      (row) => lookupIdFromFields(row.fields, 'CapitalOpportunityId') === opportunityId,
    );
    const byKey = new Map<string, GraphListItem>();
    for (const row of existing) {
      const key = String(
        row.fields.TemplateItemKey || row.fields.ChecklistItemKey || row.fields.Title || '',
      ).trim();
      if (key) byKey.set(key, row);
    }
    const out: ChecklistItem[] = [];
    for (const item of items) {
      const fields = pickWritableFields(
        checklistItemToFields(item, opportunityId, clientCode, this.writeOpts),
        this.writeOpts,
      );
      const found = byKey.get(item.itemKey) || byKey.get(item.name);
      let row: GraphListItem;
      if (found) {
        row = await this.graph.patchItemFields(
          this.settings.documentRequestsListId,
          found.id,
          fields,
          this.requireEtag(this.settings.documentRequestsListId, found.id),
        );
      } else {
        row = await this.graph.createItem(this.settings.documentRequestsListId, fields);
      }
      this.remember(this.settings.documentRequestsListId, row);
      const mapped = checklistItemFromItem(row, item);
      if (mapped) out.push(mapped);
    }
    return out;
  }

  async createSubmission(sub: LenderSubmission, ownerEmail?: string): Promise<LenderSubmission> {
    const opp = await this.getOpportunity(sub.capitalOpportunityId);
    this.assertGraphWriteAllowed({ clientCode: opp?.clientCode, title: opp?.title });
    const idempotencyKey = `cap-sub|${sub.capitalOpportunityId}|${sub.lenderId}|${sub.packageVersion || 'v1'}`;
    const existing = (await this.listAll(this.settings.lenderOutreachListId)).find(
      (row) => String(row.fields.HVCG_IdempotencyKey || '').trim() === idempotencyKey,
    );
    const fields = pickWritableFields(
      submissionToFields(sub, sub.capitalOpportunityId, { ...this.writeOpts, ownerEmail }),
      this.writeOpts,
    );
    let item: GraphListItem;
    if (existing) {
      const etag = existing.etag || this.requireEtag(this.settings.lenderOutreachListId, existing.id);
      this.remember(this.settings.lenderOutreachListId, existing);
      item = await this.graph.patchItemFields(
        this.settings.lenderOutreachListId,
        existing.id,
        fields,
        etag,
      );
    } else {
      item = await this.graph.createItem(this.settings.lenderOutreachListId, fields);
    }
    this.remember(this.settings.lenderOutreachListId, item);
    const mapped = submissionFromItem(item);
    if (!mapped) {
      throw capitalInfrastructureError('CAPITAL_BACKEND_UNAVAILABLE', 'Created capital submission could not be mapped.');
    }
    mapped.capitalOpportunityId = sub.capitalOpportunityId;
    mapped.documentIds = sub.documentIds;
    mapped.lenderId = sub.lenderId;
    return mapped;
  }

  async load(): Promise<CapitalState> {
    const state = emptyState();
    state.opportunities = await this.listOpportunities();

    const docs = await this.listAll(this.settings.documentRequestsListId);
    for (const row of docs) {
      const oppId = lookupIdFromFields(row.fields, 'CapitalOpportunityId');
      if (!oppId) continue;
      const mapped = checklistItemFromItem(row);
      if (!mapped) continue;
      if (!state.checklists[oppId]) state.checklists[oppId] = [];
      state.checklists[oppId].push(mapped);
    }

    const outreach = await this.listAll(this.settings.lenderOutreachListId);
    for (const row of outreach) {
      const mapped = submissionFromItem(row);
      if (mapped) state.submissions.push(mapped);
    }

    if (this.settings.lendersListId) {
      const lenders = await this.listAll(this.settings.lendersListId);
      for (const row of lenders) {
        const mapped = lenderFromItem(row);
        if (!mapped) continue;
        if (mapped.name.toUpperCase().includes('SYNTHETIC')) continue;
        state.lenders.push(mapped);
      }
    }

    for (const opp of state.opportunities) {
      if (opp.mannyStrategyApproval === 'NOT_REQUIRED') continue;
      if (state.strategies.some((s) => s.capitalOpportunityId === opp.id)) continue;
      const strat: FinancingStrategy = {
        id: `strat-${opp.id}`,
        capitalOpportunityId: opp.id,
        clientCode: opp.clientCode,
        needSummary: opp.title,
        paths: [],
        strengths: [],
        risks: [],
        missingInformation: [],
        lenderCandidates: [],
        rationale: 'Hydrated from SharePoint opportunity Notes / Manny flags. HVCG_CapitalStrategies is not used.',
        mannyApproval: opp.mannyStrategyApproval,
        createdAt: opp.updatedAt,
        disclaimer: FINANCING_DISCLAIMER,
      };
      state.strategies.push(strat);
    }
    return state;
  }
}

/**
 * CapitalService-compatible wrapper: hydrate on load(), persist dirty
 * opportunities / checklists / submissions on save(). Not a full dump.
 */
export class AsyncCapitalStore implements CapitalPersistence {
  private snapshot: CapitalState | null = null;
  private overlay: Pick<
    CapitalState,
    | 'strategies'
    | 'documents'
    | 'reviews'
    | 'applications'
    | 'offers'
    | 'closing'
    | 'fees'
    | 'attributions'
    | 'copilotHandoffs'
    | 'underwriting'
    | 'products'
    | 'checklists'
    | 'factReviews'
  > | null = null;

  constructor(private readonly graph: GraphCapitalStore) {}

  async load(): Promise<CapitalState> {
    const state = await this.graph.load();
    if (this.overlay) {
      state.strategies = this.overlay.strategies.length ? this.overlay.strategies : state.strategies;
      state.documents = this.overlay.documents;
      state.reviews = this.overlay.reviews;
      state.applications = this.overlay.applications;
      state.offers = this.overlay.offers;
      state.closing = this.overlay.closing;
      state.fees = this.overlay.fees;
      state.attributions = this.overlay.attributions;
      state.copilotHandoffs = this.overlay.copilotHandoffs;
      state.underwriting = this.overlay.underwriting;
      for (const product of this.overlay.products) {
        if (!state.products.some((p) => p.id === product.id)) state.products.push(product);
      }
      if (this.overlay.checklists) {
        for (const [id, items] of Object.entries(this.overlay.checklists)) {
          if (items?.length) state.checklists[id] = items;
        }
      }
      if (this.overlay.factReviews?.length) state.factReviews = this.overlay.factReviews;
    }
    mergeSourcedLenderCatalog(state);
    this.snapshot = cloneState(state);
    return state;
  }

  async save(state: CapitalState): Promise<void> {
    const snap = this.snapshot || emptyState();
    const snapOpps = new Map(snap.opportunities.map((o) => [o.id, o]));

    for (const opp of state.opportunities) {
      const prior = snapOpps.get(opp.id);
      if (!prior) {
        const created = await this.graph.createOpportunity(opp);
        if (created.id !== opp.id) {
          const oldId = opp.id;
          opp.id = created.id;
          if (state.checklists[oldId] && !state.checklists[created.id]) {
            state.checklists[created.id] = state.checklists[oldId];
            delete state.checklists[oldId];
          }
          for (const sub of state.submissions) {
            if (sub.capitalOpportunityId === oldId) sub.capitalOpportunityId = created.id;
          }
        }
        continue;
      }
      if (!sameJson(prior, opp)) {
        const patched = await this.graph.patchOpportunity(opp);
        opp.updatedAt = patched.updatedAt;
      }
    }

    const allOppIds = new Set(state.opportunities.map((o) => o.id));
    for (const id of allOppIds) {
      const next = state.checklists[id] || [];
      const prev = snap.checklists[id] || [];
      if (!sameJson(prev, next) && next.length) {
        const opp = state.opportunities.find((o) => o.id === id);
        if (isSyntheticCapitalRecord({ clientCode: opp?.clientCode, title: opp?.title })) {
          try {
            const persisted = await this.graph.replaceChecklist(id, opp?.clientCode || '', next);
            state.checklists[id] = persisted;
          } catch (err) {
            if (err instanceof CapitalHttpError && err.status === 403) {
              /* SYN* Graph writes stay closed; checklist remains Hub overlay. */
            } else {
              throw err;
            }
          }
        } else {
          const persisted = await this.graph.replaceChecklist(id, opp?.clientCode || '', next);
          state.checklists[id] = persisted;
        }
      }
    }

    const snapSubIds = new Set(snap.submissions.map((s) => s.id));
    for (const sub of state.submissions) {
      if (snapSubIds.has(sub.id)) continue;
      const created = await this.graph.createSubmission(sub);
      sub.id = created.id;
    }

    this.overlay = {
      strategies: state.strategies,
      documents: state.documents,
      reviews: state.reviews,
      applications: state.applications,
      offers: state.offers,
      closing: state.closing,
      fees: state.fees,
      attributions: state.attributions,
      copilotHandoffs: state.copilotHandoffs,
      underwriting: state.underwriting,
      products: state.products,
      checklists: state.checklists,
      factReviews: state.factReviews,
    };
    this.snapshot = cloneState(state);
  }
}
