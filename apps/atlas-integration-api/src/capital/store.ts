import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type {
  ApplicationPackage,
  Attribution,
  CapitalDocument,
  CapitalOpportunity,
  ChecklistItem,
  ClosingCondition,
  DocumentReview,
  FeeRecord,
  FinancingStrategy,
  LenderOrganization,
  LenderProduct,
  LenderSubmission,
  TermSheetOffer,
  UnderwritingSummary,
} from '@hvcg/atlas-capital-core';

export interface CopilotHandoffRecord {
  id: string;
  clientCode?: string;
  organizationName?: string;
  assessmentId?: string;
  recommendedPackage?: string;
  observationOnly: true;
  createdAt: string;
}

export interface CapitalState {
  opportunities: CapitalOpportunity[];
  checklists: Record<string, ChecklistItem[]>;
  documents: CapitalDocument[];
  reviews: DocumentReview[];
  lenders: LenderOrganization[];
  products: LenderProduct[];
  strategies: FinancingStrategy[];
  applications: ApplicationPackage[];
  submissions: LenderSubmission[];
  offers: TermSheetOffer[];
  closing: Record<string, ClosingCondition[]>;
  fees: FeeRecord[];
  attributions: Attribution[];
  copilotHandoffs: CopilotHandoffRecord[];
  underwriting: UnderwritingSummary[];
}

/** JSON store is sync; Graph persistence is async. `await` works on both. */
export interface CapitalPersistence {
  load(): CapitalState | Promise<CapitalState>;
  save(state: CapitalState): void | Promise<void>;
}

export interface CapitalStoreOptions {
  /** Default false. Tests and development-json may opt in. Never used for SharePoint. */
  seedSyntheticLenders?: boolean;
}

export function emptyState(): CapitalState {
  return {
    opportunities: [],
    checklists: {},
    documents: [],
    reviews: [],
    lenders: [],
    products: [],
    strategies: [],
    applications: [],
    submissions: [],
    offers: [],
    closing: {},
    fees: [],
    attributions: [],
    copilotHandoffs: [],
    underwriting: [],
  };
}

function seedLenders(state: CapitalState): void {
  if (state.lenders.length) return;
  state.lenders.push({
    id: 'ln-syn-001',
    name: 'SYNTHETIC Bank',
    organizationType: 'Bank',
    geography: 'US',
    relationshipStatus: 'active',
  });
  state.products.push({
    id: 'pr-syn-001',
    lenderId: 'ln-syn-001',
    productName: 'SYNTHETIC WC LOC',
    minAmount: 100_000,
    maxAmount: 2_000_000,
    minRevenue: 2_000_000,
    sbaParticipation: true,
    freshness: 'CURRENT',
    lastVerifiedAt: '2026-07-01T00:00:00.000Z',
    source: 'synthetic-criteria',
    verifiedBy: 'qa',
    confidence: 0.8,
  });
  state.products.push({
    id: 'pr-syn-stale',
    lenderId: 'ln-syn-001',
    productName: 'SYNTHETIC Stale Product',
    minAmount: 100_000,
    maxAmount: 2_000_000,
    minRevenue: 2_000_000,
    freshness: 'CURRENT',
    lastVerifiedAt: '2024-01-01T00:00:00.000Z',
    source: 'synthetic-stale',
    verifiedBy: 'qa',
    confidence: 0.4,
  });
}

export class CapitalStore implements CapitalPersistence {
  constructor(
    private readonly dataDir: string,
    private readonly options: CapitalStoreOptions = {},
  ) {}

  filePath(): string {
    return join(this.dataDir, 'capital-operations.json');
  }

  load(): CapitalState {
    const path = this.filePath();
    if (!existsSync(path)) {
      const state = emptyState();
      if (this.options.seedSyntheticLenders) seedLenders(state);
      this.save(state);
      return state;
    }
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as CapitalState;
    const state = { ...emptyState(), ...parsed };
    if (this.options.seedSyntheticLenders) seedLenders(state);
    return state;
  }

  save(state: CapitalState): void {
    const path = this.filePath();
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(state, null, 2), { mode: 0o600 });
  }
}
