/**
 * Sourced in-app lender / product catalog.
 * Official websites and SBA documentation only. No guessed minima.
 * Not a SharePoint list. Historical HVCG outreach stays context.
 *
 * Quality rule: smaller verified dataset > large hallucinated dataset.
 * Unstated min revenue, DSCR, FICO, and advance rates are omitted.
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
const SBA_7A_TYPES = 'https://www.sba.gov/partners/lenders/7a-loan-program/types-7a-loans';
const LIVE_OAK_7A = 'https://www.liveoak.bank/business-loans/sba-loans/';
const LIVE_OAK_EXPRESS = 'https://www.liveoak.bank/business-loans/live-oak-express/';
const JPM_ABL = 'https://www.jpmorgan.com/credit-and-financing/asset-based-lending';
const CELTIC_7A = 'https://www.celticbank.com/sba-7a-loans/';
const BYLINE_LOANS = 'https://www.bylinebank.com/business/loans/';
const BYLINE_CAPLINES = 'https://www.bylinebank.com/small-business-capital/sba-caplines/';
const HUNTINGTON_SBA = 'https://www.huntington.com/SmallBusiness/loans/sba-guarantee-business-loans';
const USBANK_CFM =
  'https://www.usbank.com/business-banking/banking-products/business-lending/business-lines-of-credit/cash-flow-manager.html';
const BOFA_LOC = 'https://www.bankofamerica.com/smallbusiness/business-financing/unsecured-business-line-of-credit/';
const BOFA_FINANCING = 'https://www.bankofamerica.com/smallbusiness/business-financing/';
const FIRST_CITIZENS_ABL = 'https://www.firstcitizens.com/commercial/solutions/asset-based-lending';
const NEWTEK_LENDING = 'https://www.newtekone.com/newtek-lending/';

/** Products researched and not added — marketing-only or mixed/unstated criteria. */
export const CATALOG_RESEARCH_REJECTIONS: Array<{ name: string; url: string; reason: string }> = [
  {
    name: 'Newtek SBA 7(a) as a distinct product',
    url: NEWTEK_LENDING,
    reason: 'Official page states mixed term loans $5,000–$15M, not an SBA 7(a)-specific max.',
  },
  {
    name: 'Byline SBA 504',
    url: 'https://www.bylinebank.com/small-business-capital/sba-7a-loan/',
    reason: 'Conflicting official ranges ($400k+ vs $1.5M–$10M rate band). Not recorded as CURRENT min/max.',
  },
  {
    name: 'Celtic Bank FICO / DSCR / TIB overlays',
    url: CELTIC_7A,
    reason: 'Official 7(a) page does not state FICO, DSCR, or time-in-business. Third-party reviews ignored.',
  },
  {
    name: 'Chase / Wells Fargo small-business LOC or equipment',
    url: 'https://www.wellsfargo.com/biz/',
    reason: 'No official min/max captured on a product page during this verification pass.',
  },
  {
    name: 'KeyBank ABL',
    url: 'https://www.key.com/',
    reason: 'No official facility range captured on a product page during this verification pass.',
  },
  {
    name: 'CIT.com ABL as a distinct catalog row',
    url: 'https://www.cit.com/commercial/finance/commercial-finance/asset-based-lending',
    reason: 'CIT page lacked a stated facility min/max; First Citizens ABL page is the sourced range.',
  },
  {
    name: 'U.S. Bank SBA Express LOC $350k',
    url: 'https://www.usbank.com/business-banking/banking-products/business-lending/business-lines-of-credit.html',
    reason: 'Mentioned on a LOC overview; Cash Flow Manager page is the fully fetched official max used here.',
  },
  {
    name: 'Bank of America cash-secured credit line',
    url: BOFA_FINANCING,
    reason: 'Security-deposit product ($1,000) is not an HVCG commercial WC structure.',
  },
];

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
const celtic = officialLender('ln-catalog-celtic', 'Celtic Bank', CELTIC_7A, 'Bank');
const byline = officialLender('ln-catalog-byline', 'Byline Bank', BYLINE_LOANS, 'Bank');
const huntington = officialLender('ln-catalog-huntington', 'Huntington National Bank', HUNTINGTON_SBA, 'Bank');
const usbank = officialLender('ln-catalog-usbank', 'U.S. Bank', USBANK_CFM, 'Bank');
const bofa = officialLender('ln-catalog-bofa', 'Bank of America', BOFA_LOC, 'Bank');
const firstCitizens = officialLender('ln-catalog-firstcitizens', 'First Citizens Bank', FIRST_CITIZENS_ABL, 'Bank');
const newtek = officialLender('ln-catalog-newtek', 'Newtek Bank, N.A. / NewtekOne', NEWTEK_LENDING, 'Bank');

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

const sbaExpress = officialProduct({
  id: 'pr-catalog-sba-express',
  lenderId: sba.id,
  productName: 'SBA Express program envelope',
  productCategory: 'sba_express',
  maxAmount: 500_000,
  sbaParticipation: true,
  geography: 'US',
  source: SBA_7A_TYPES,
  otherCriteria:
    'Official: maximum loan amount $500,000; maximum SBA guarantee 50%; revolving lines of credit up to 10 years. Lender overlays unknown.',
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

const liveOak504 = officialProduct({
  id: 'pr-catalog-liveoak-504',
  lenderId: liveOak.id,
  productName: 'Live Oak SBA 504',
  productCategory: 'sba',
  maxAmount: 15_000_000,
  sbaParticipation: true,
  realEstateAppetite: true,
  equipmentAppetite: true,
  creditExpectations: 'Official SBA loans FAQ: minimum FICO 680 to be considered',
  source: LIVE_OAK_7A,
  otherCriteria:
    'Official: 504 loan amounts up to $15 million; uses cited are commercial real estate, improvements, and large equipment. SBA debenture vs total project split is not separately stated.',
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

const celtic7a = officialProduct({
  id: 'pr-catalog-celtic-7a',
  lenderId: celtic.id,
  productName: 'Celtic Bank SBA 7(a)',
  productCategory: 'sba',
  minAmount: 25_000,
  maxAmount: 5_000_000,
  sbaParticipation: true,
  acquisitionAppetite: true,
  equipmentAppetite: true,
  realEstateAppetite: true,
  source: CELTIC_7A,
  otherCriteria:
    'Official: up to $5M in funding; payment-estimator loan amount bounds $25,000–$5,000,000. Uses include working capital, acquisition, equipment, and commercial real estate. FICO/DSCR/TIB not stated on this page.',
});

const byline7a = officialProduct({
  id: 'pr-catalog-byline-7a',
  lenderId: byline.id,
  productName: 'Byline Bank SBA 7(a)',
  productCategory: 'sba',
  minAmount: 350_000,
  maxAmount: 5_000_000,
  sbaParticipation: true,
  acquisitionAppetite: true,
  equipmentAppetite: true,
  realEstateAppetite: true,
  constructionAppetite: true,
  source: BYLINE_LOANS,
  otherCriteria:
    'Official: SBA 7(a) for businesses seeking $350,000 to $5 million. Product page also states up to $5 million; 51% owner-occupied cited for real-estate uses.',
});

const bylineCaplines = officialProduct({
  id: 'pr-catalog-byline-caplines',
  lenderId: byline.id,
  productName: 'Byline Bank SBA CAPLines',
  productCategory: 'sba_working_capital',
  maxAmount: 5_000_000,
  sbaParticipation: true,
  arEligible: true,
  inventoryEligible: true,
  source: BYLINE_CAPLINES,
  otherCriteria:
    'Official: up to $5 million, 12 months to 10 years; up to 80% of eligible accounts receivable; up to 50% of eligible inventory. Advance rates are stated as product features, not HVCG underwriting policy.',
});

const huntington7a = officialProduct({
  id: 'pr-catalog-huntington-7a',
  lenderId: huntington.id,
  productName: 'Huntington SBA 7(a)',
  productCategory: 'sba',
  maxAmount: 5_000_000,
  sbaParticipation: true,
  acquisitionAppetite: true,
  equipmentAppetite: true,
  source: HUNTINGTON_SBA,
  otherCriteria:
    'Official: maximum loan amounts of $5 million. Uses cited include open/acquire/expand, equipment, working capital, and refinance. Bank-specific min revenue/FICO not stated.',
});

const usbankCfmSecured = officialProduct({
  id: 'pr-catalog-usbank-cfm-secured',
  lenderId: usbank.id,
  productName: 'U.S. Bank Cash Flow Manager (secured)',
  productCategory: 'working_capital_loc',
  maxAmount: 250_000,
  source: USBANK_CFM,
  personalGuarantee: 'Official: personal guaranty required for small business loans and lines of credit',
  otherCriteria: 'Official: secured Cash Flow Manager offers up to $250,000. Minimum amount is not stated.',
});

const bofaUnsecuredLoc = officialProduct({
  id: 'pr-catalog-bofa-unsecured-loc',
  lenderId: bofa.id,
  productName: 'Bank of America Business Advantage Credit Line (unsecured)',
  productCategory: 'working_capital_loc',
  minAmount: 10_000,
  minRevenue: 100_000,
  timeInBusinessMonths: 24,
  creditExpectations: 'Official: personal credit above 700 FICO Score is typically required (not parsed as a hard rule)',
  source: BOFA_LOC,
  otherCriteria:
    'Official: line amount from $10,000; 2 years in business under existing ownership; $100,000 or more in annual revenue. Maximum line amount is not stated.',
});

const bofaEquipment = officialProduct({
  id: 'pr-catalog-bofa-equipment',
  lenderId: bofa.id,
  productName: 'Bank of America equipment loan',
  productCategory: 'equipment',
  minAmount: 25_000,
  minRevenue: 250_000,
  timeInBusinessMonths: 24,
  equipmentAppetite: true,
  source: BOFA_FINANCING,
  otherCriteria:
    'Official: loan amount from $25,000; terms up to 5 years when secured by business assets; minimum 2 years in business; minimum $250,000 in annual revenue. Maximum amount is not stated.',
});

const bofaCre = officialProduct({
  id: 'pr-catalog-bofa-cre',
  lenderId: bofa.id,
  productName: 'Bank of America commercial real estate',
  productCategory: 'commercial_real_estate',
  minAmount: 25_000,
  minRevenue: 250_000,
  timeInBusinessMonths: 24,
  realEstateAppetite: true,
  source: BOFA_FINANCING,
  otherCriteria:
    'Official: loan amount from $25,000; up to 10 years with balloon or 15 years full amortization; minimum 2 years in business; minimum $250,000 in annual revenue. Owner-occupied percentage is not stated.',
});

const firstCitizensAbl = officialProduct({
  id: 'pr-catalog-firstcitizens-abl',
  lenderId: firstCitizens.id,
  productName: 'First Citizens asset-based lending',
  productCategory: 'asset_based_lending',
  minAmount: 15_000_000,
  arEligible: true,
  inventoryEligible: true,
  acquisitionAppetite: true,
  source: FIRST_CITIZENS_ABL,
  otherCriteria:
    'Official: facilities range from $15 million to more than $200 million. Typical advance rates are stated as ranges (AR/inventory NOLV) and are not treated as HVCG underwriting policy. Hard maximum is not a single number.',
});

const newtekRevolving = officialProduct({
  id: 'pr-catalog-newtek-revolving',
  lenderId: newtek.id,
  productName: 'Newtek revolving line of credit (AR / inventory)',
  productCategory: 'asset_based_lending',
  maxAmount: 5_000_000,
  arEligible: true,
  inventoryEligible: true,
  source: NEWTEK_LENDING,
  otherCriteria:
    'Official: revolving lines of credit backed by accounts receivable and inventory; up to $5 million available. Minimum amount is not stated. Not labeled as SBA 7(a).',
});

export const SOURCED_LENDERS: LenderOrganization[] = [
  sba,
  liveOak,
  jpm,
  celtic,
  byline,
  huntington,
  usbank,
  bofa,
  firstCitizens,
  newtek,
];

export const SOURCED_PRODUCTS: LenderProduct[] = [
  sba7a,
  sbaWcp,
  sba504,
  sbaExpress,
  liveOak7a,
  liveOakExpress,
  liveOak504,
  jpmAbl,
  celtic7a,
  byline7a,
  bylineCaplines,
  huntington7a,
  usbankCfmSecured,
  bofaUnsecuredLoc,
  bofaEquipment,
  bofaCre,
  firstCitizensAbl,
  newtekRevolving,
];

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
  criterion({ lender: sba, product: sbaExpress, criterion: 'maxAmount', value: 500_000, field: 'MaxAmount', sourceType: 'sba_government', url: SBA_7A_TYPES }),
  criterion({
    lender: sba,
    product: sbaExpress,
    criterion: 'sbaParticipation',
    value: true,
    field: 'SBAParticipation',
    sourceType: 'sba_government',
    url: SBA_7A_TYPES,
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
  criterion({
    lender: liveOak,
    product: liveOak504,
    criterion: 'maxAmount',
    value: 15_000_000,
    field: 'MaxAmount',
    sourceType: 'official_website',
    url: LIVE_OAK_7A,
  }),
  criterion({
    lender: liveOak,
    product: liveOak504,
    criterion: 'creditExpectations',
    value: 'FICO 680 minimum',
    field: 'CreditExpectations',
    sourceType: 'official_website',
    url: LIVE_OAK_7A,
  }),
  criterion({ lender: jpm, product: jpmAbl, criterion: 'minAmount', value: 5_000_000, field: 'MinAmount', sourceType: 'official_website', url: JPM_ABL }),
  criterion({ lender: jpm, product: jpmAbl, criterion: 'maxAmount', value: 1_000_000_000, field: 'MaxAmount', sourceType: 'official_website', url: JPM_ABL }),
  criterion({ lender: celtic, product: celtic7a, criterion: 'minAmount', value: 25_000, field: 'MinAmount', sourceType: 'official_website', url: CELTIC_7A }),
  criterion({ lender: celtic, product: celtic7a, criterion: 'maxAmount', value: 5_000_000, field: 'MaxAmount', sourceType: 'official_website', url: CELTIC_7A }),
  criterion({
    lender: celtic,
    product: celtic7a,
    criterion: 'sbaParticipation',
    value: true,
    field: 'SBAParticipation',
    sourceType: 'official_website',
    url: CELTIC_7A,
  }),
  criterion({ lender: byline, product: byline7a, criterion: 'minAmount', value: 350_000, field: 'MinAmount', sourceType: 'official_website', url: BYLINE_LOANS }),
  criterion({ lender: byline, product: byline7a, criterion: 'maxAmount', value: 5_000_000, field: 'MaxAmount', sourceType: 'official_website', url: BYLINE_LOANS }),
  criterion({
    lender: byline,
    product: bylineCaplines,
    criterion: 'maxAmount',
    value: 5_000_000,
    field: 'MaxAmount',
    sourceType: 'official_website',
    url: BYLINE_CAPLINES,
  }),
  criterion({
    lender: byline,
    product: bylineCaplines,
    criterion: 'arEligible',
    value: true,
    field: 'AREligible',
    sourceType: 'official_website',
    url: BYLINE_CAPLINES,
  }),
  criterion({
    lender: byline,
    product: bylineCaplines,
    criterion: 'inventoryEligible',
    value: true,
    field: 'InventoryEligible',
    sourceType: 'official_website',
    url: BYLINE_CAPLINES,
  }),
  criterion({
    lender: huntington,
    product: huntington7a,
    criterion: 'maxAmount',
    value: 5_000_000,
    field: 'MaxAmount',
    sourceType: 'official_website',
    url: HUNTINGTON_SBA,
  }),
  criterion({
    lender: usbank,
    product: usbankCfmSecured,
    criterion: 'maxAmount',
    value: 250_000,
    field: 'MaxAmount',
    sourceType: 'official_website',
    url: USBANK_CFM,
  }),
  criterion({ lender: bofa, product: bofaUnsecuredLoc, criterion: 'minAmount', value: 10_000, field: 'MinAmount', sourceType: 'official_website', url: BOFA_LOC }),
  criterion({
    lender: bofa,
    product: bofaUnsecuredLoc,
    criterion: 'minRevenue',
    value: 100_000,
    field: 'MinRevenue',
    sourceType: 'official_website',
    url: BOFA_LOC,
  }),
  criterion({
    lender: bofa,
    product: bofaUnsecuredLoc,
    criterion: 'timeInBusinessMonths',
    value: 24,
    field: 'TimeInBusinessMonths',
    sourceType: 'official_website',
    url: BOFA_LOC,
  }),
  criterion({
    lender: bofa,
    product: bofaEquipment,
    criterion: 'minAmount',
    value: 25_000,
    field: 'MinAmount',
    sourceType: 'official_website',
    url: BOFA_FINANCING,
  }),
  criterion({
    lender: bofa,
    product: bofaEquipment,
    criterion: 'minRevenue',
    value: 250_000,
    field: 'MinRevenue',
    sourceType: 'official_website',
    url: BOFA_FINANCING,
  }),
  criterion({
    lender: bofa,
    product: bofaEquipment,
    criterion: 'timeInBusinessMonths',
    value: 24,
    field: 'TimeInBusinessMonths',
    sourceType: 'official_website',
    url: BOFA_FINANCING,
  }),
  criterion({
    lender: bofa,
    product: bofaCre,
    criterion: 'minAmount',
    value: 25_000,
    field: 'MinAmount',
    sourceType: 'official_website',
    url: BOFA_FINANCING,
  }),
  criterion({
    lender: bofa,
    product: bofaCre,
    criterion: 'minRevenue',
    value: 250_000,
    field: 'MinRevenue',
    sourceType: 'official_website',
    url: BOFA_FINANCING,
  }),
  criterion({
    lender: bofa,
    product: bofaCre,
    criterion: 'timeInBusinessMonths',
    value: 24,
    field: 'TimeInBusinessMonths',
    sourceType: 'official_website',
    url: BOFA_FINANCING,
  }),
  criterion({
    lender: firstCitizens,
    product: firstCitizensAbl,
    criterion: 'minAmount',
    value: 15_000_000,
    field: 'MinAmount',
    sourceType: 'official_website',
    url: FIRST_CITIZENS_ABL,
  }),
  criterion({
    lender: firstCitizens,
    product: firstCitizensAbl,
    criterion: 'arEligible',
    value: true,
    field: 'AREligible',
    sourceType: 'official_website',
    url: FIRST_CITIZENS_ABL,
  }),
  criterion({
    lender: newtek,
    product: newtekRevolving,
    criterion: 'maxAmount',
    value: 5_000_000,
    field: 'MaxAmount',
    sourceType: 'official_website',
    url: NEWTEK_LENDING,
  }),
  criterion({
    lender: newtek,
    product: newtekRevolving,
    criterion: 'arEligible',
    value: true,
    field: 'AREligible',
    sourceType: 'official_website',
    url: NEWTEK_LENDING,
  }),
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
