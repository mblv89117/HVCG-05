/**
 * Sourced in-app lender / product catalog.
 * Official websites and SBA documentation only. No guessed minima.
 * Not a SharePoint list. Historical HVCG outreach stays context.
 */

import type {
  LenderCriterionRecord,
  LenderOrganization,
  LenderProduct,
  LenderSourceType,
  SourceRef,
} from './types.ts';

export const CATALOG_VERIFIED_AT = '2026-08-17T00:00:00.000Z';
export const CATALOG_VERIFIED_BY = 'atlas-catalog-official';

const SBA_7A = 'https://www.sba.gov/loans/7a-loans/';
const SBA_504 = 'https://www.sba.gov/funding-programs/loans/504-loans';
const LIVE_OAK_7A = 'https://www.liveoak.bank/business-loans/sba-loans/';
const LIVE_OAK_EXPRESS = 'https://www.liveoak.bank/business-loans/live-oak-express/';
const JPM_ABL = 'https://www.jpmorgan.com/credit-and-financing/asset-based-lending';

function ref(productId: string, field: string, url: string): SourceRef {
  return {
    sourceSystem: url,
    sourceRecordId: productId,
    field,
    capturedAt: CATALOG_VERIFIED_AT,
    capturedBy: CATALOG_VERIFIED_BY,
  };
}

function criterion(opts: {
  lender: LenderOrganization;
  product: LenderProduct;
  criterion: string;
  value: string | number | boolean | null;
  field: string;
  sourceType: LenderSourceType;
  url: string;
}): LenderCriterionRecord {
  return {
    lenderId: opts.lender.id,
    lenderName: opts.lender.name,
    productId: opts.product.id,
    productName: opts.product.productName,
    criterion: opts.criterion,
    value: opts.value,
    sourceRef: ref(opts.product.id, opts.field, opts.url),
    sourceType: opts.sourceType,
    sourceDate: CATALOG_VERIFIED_AT,
    lastVerified: CATALOG_VERIFIED_AT,
    confidence: 0.9,
    freshness: 'CURRENT',
  };
}

function officialLender(id: string, name: string, url: string, organizationType: string): LenderOrganization {
  return {
    id,
    name,
    organizationType,
    website: url,
    geography: 'US',
    relationshipStatus: 'catalog',
    lastVerifiedAt: CATALOG_VERIFIED_AT,
    freshness: 'CURRENT',
    verificationSource: url,
  };
}

function officialProduct(
  over: Omit<LenderProduct, 'freshness' | 'lastVerifiedAt' | 'verifiedBy' | 'confidence'> &
    Partial<Pick<LenderProduct, 'freshness' | 'confidence'>>,
): LenderProduct {
  return {
    freshness: 'CURRENT',
    lastVerifiedAt: CATALOG_VERIFIED_AT,
    verifiedBy: CATALOG_VERIFIED_BY,
    confidence: 0.9,
    ...over,
  };
}

const sba = officialLender('ln-catalog-sba', 'U.S. Small Business Administration (program envelope)', SBA_7A, 'Government');
const liveOak = officialLender('ln-catalog-liveoak', 'Live Oak Bank', LIVE_OAK_7A, 'Bank');
const jpm = officialLender('ln-catalog-jpm', 'J.P. Morgan', JPM_ABL, 'Bank');

const sba7a = officialProduct({
  id: 'pr-catalog-sba-7a',
  lenderId: sba.id,
  productName: 'SBA 7(a) standard program envelope',
  productCategory: 'sba',
  maxAmount: 5_000_000,
  sbaParticipation: true,
  geography: 'US',
  source: SBA_7A,
  otherCriteria: 'Official individual 7(a) maximum is $5,000,000. Lender-specific overlays are unknown.',
});

const sbaWcp = officialProduct({
  id: 'pr-catalog-sba-wcp',
  lenderId: sba.id,
  productName: 'SBA 7(a) Working Capital Pilot',
  productCategory: 'sba_working_capital',
  maxAmount: 5_000_000,
  timeInBusinessMonths: 12,
  sbaParticipation: true,
  arEligible: true,
  inventoryEligible: true,
  geography: 'US',
  source: SBA_7A,
  otherCriteria: 'Official WCP: LOC up to $5,000,000; at least one year operating history; max maturity 60 months; guarantee 85%/75%.',
});

const sba504 = officialProduct({
  id: 'pr-catalog-sba-504',
  lenderId: sba.id,
  productName: 'SBA 504 CDC / debenture',
  productCategory: 'sba',
  maxAmount: 5_500_000,
  sbaParticipation: true,
  realEstateAppetite: true,
  equipmentAppetite: true,
  geography: 'US',
  source: SBA_504,
  otherCriteria: 'Official: cannot be used for working capital or inventory. Fixed assets only.',
});

const liveOak7a = officialProduct({
  id: 'pr-catalog-liveoak-7a',
  lenderId: liveOak.id,
  productName: 'Live Oak SBA 7(a)',
  productCategory: 'sba',
  maxAmount: 5_000_000,
  sbaParticipation: true,
  acquisitionAppetite: true,
  creditExpectations: 'Official site: minimum FICO 680 to be considered',
  source: LIVE_OAK_7A,
  otherCriteria: 'Up to $5 million; acquisitions / partner buyouts / real estate / refinance cited on official page.',
});

const liveOakExpress = officialProduct({
  id: 'pr-catalog-liveoak-express',
  lenderId: liveOak.id,
  productName: 'Live Oak Express 7(a)',
  productCategory: 'sba_express',
  minAmount: 10_000,
  maxAmount: 350_000,
  timeInBusinessMonths: 24,
  sbaParticipation: true,
  source: LIVE_OAK_EXPRESS,
  otherCriteria: 'Official: $10,000–$350,000; at least two years in business; non-real-estate 7(a) term loan.',
});

const jpmAbl = officialProduct({
  id: 'pr-catalog-jpm-abl',
  lenderId: jpm.id,
  productName: 'J.P. Morgan asset-based lending',
  productCategory: 'asset_based_lending',
  minAmount: 5_000_000,
  maxAmount: 1_000_000_000,
  arEligible: true,
  inventoryEligible: true,
  source: JPM_ABL,
  otherCriteria: 'Official: lines of credit accommodated from $5 million to more than $1 billion.',
});

export const SOURCED_LENDERS: LenderOrganization[] = [sba, liveOak, jpm];

export const SOURCED_PRODUCTS: LenderProduct[] = [sba7a, sbaWcp, sba504, liveOak7a, liveOakExpress, jpmAbl];

export const SOURCED_CRITERIA: LenderCriterionRecord[] = [
  criterion({ lender: sba, product: sba7a, criterion: 'maxAmount', value: 5_000_000, field: 'MaxAmount', sourceType: 'sba_government', url: SBA_7A }),
  criterion({ lender: sba, product: sba7a, criterion: 'sbaParticipation', value: true, field: 'SBAParticipation', sourceType: 'sba_government', url: SBA_7A }),
  criterion({ lender: sba, product: sbaWcp, criterion: 'maxAmount', value: 5_000_000, field: 'MaxAmount', sourceType: 'sba_government', url: SBA_7A }),
  criterion({ lender: sba, product: sbaWcp, criterion: 'timeInBusinessMonths', value: 12, field: 'TimeInBusinessMonths', sourceType: 'sba_government', url: SBA_7A }),
  criterion({ lender: sba, product: sba504, criterion: 'maxAmount', value: 5_500_000, field: 'MaxAmount', sourceType: 'sba_government', url: SBA_504 }),
  criterion({
    lender: sba,
    product: sba504,
    criterion: 'workingCapitalEligible',
    value: false,
    field: 'OtherCriteria',
    sourceType: 'sba_government',
    url: SBA_504,
  }),
  criterion({ lender: liveOak, product: liveOak7a, criterion: 'maxAmount', value: 5_000_000, field: 'MaxAmount', sourceType: 'official_website', url: LIVE_OAK_7A }),
  criterion({
    lender: liveOak,
    product: liveOak7a,
    criterion: 'creditExpectations',
    value: 'FICO 680 minimum',
    field: 'CreditExpectations',
    sourceType: 'official_website',
    url: LIVE_OAK_7A,
  }),
  criterion({ lender: liveOak, product: liveOakExpress, criterion: 'minAmount', value: 10_000, field: 'MinAmount', sourceType: 'official_website', url: LIVE_OAK_EXPRESS }),
  criterion({ lender: liveOak, product: liveOakExpress, criterion: 'maxAmount', value: 350_000, field: 'MaxAmount', sourceType: 'official_website', url: LIVE_OAK_EXPRESS }),
  criterion({
    lender: liveOak,
    product: liveOakExpress,
    criterion: 'timeInBusinessMonths',
    value: 24,
    field: 'TimeInBusinessMonths',
    sourceType: 'official_website',
    url: LIVE_OAK_EXPRESS,
  }),
  criterion({ lender: jpm, product: jpmAbl, criterion: 'minAmount', value: 5_000_000, field: 'MinAmount', sourceType: 'official_website', url: JPM_ABL }),
  criterion({ lender: jpm, product: jpmAbl, criterion: 'maxAmount', value: 1_000_000_000, field: 'MaxAmount', sourceType: 'official_website', url: JPM_ABL }),
];

export function sourcedLenderCatalog(): {
  lenders: LenderOrganization[];
  products: LenderProduct[];
  criteria: LenderCriterionRecord[];
} {
  return {
    lenders: SOURCED_LENDERS.map((l) => ({ ...l })),
    products: SOURCED_PRODUCTS.map((p) => ({ ...p })),
    criteria: SOURCED_CRITERIA.map((c) => ({ ...c })),
  };
}

export function mergeSourcedLenderCatalog<T extends { lenders: LenderOrganization[]; products: LenderProduct[] }>(state: T): T {
  const catalog = sourcedLenderCatalog();
  for (const lender of catalog.lenders) {
    if (!state.lenders.some((l) => l.id === lender.id)) state.lenders.push(lender);
  }
  for (const product of catalog.products) {
    if (!state.products.some((p) => p.id === product.id)) state.products.push(product);
  }
  return state;
}
