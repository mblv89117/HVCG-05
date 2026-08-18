/**
 * Lender matching — decision support only.
 * Never invents criteria. Stale or missing criteria cannot produce BEST_FIT.
 */

import type {
  CapitalOpportunity,
  LenderMatch,
  LenderOrganization,
  LenderProduct,
  MatchBand,
} from './types.ts';

const STALE_DAYS = 180;

export function productFreshness(product: LenderProduct, now = new Date()): LenderProduct {
  if (!product.lastVerifiedAt) {
    return { ...product, freshness: product.freshness === 'CURRENT' ? 'UNKNOWN' : product.freshness };
  }
  const verified = Date.parse(product.lastVerifiedAt);
  if (!Number.isFinite(verified)) return { ...product, freshness: 'UNKNOWN' };
  const days = (now.getTime() - verified) / 86_400_000;
  if (days > STALE_DAYS) return { ...product, freshness: 'STALE' };
  return product;
}

export function matchProduct(
  opportunity: CapitalOpportunity,
  lender: LenderOrganization,
  product: LenderProduct,
  now = new Date(),
): LenderMatch {
  const fresh = productFreshness(product, now);
  const reasons: string[] = [];
  const missing: string[] = [];
  let ineligible = false;
  let unknown = false;

  const amount = opportunity.need.requestedAmount;
  if (amount == null) {
    missing.push('requested amount');
    unknown = true;
  } else {
    if (fresh.minAmount != null && amount < fresh.minAmount) {
      ineligible = true;
      reasons.push(`Requested amount below product minimum (${fresh.minAmount})`);
    } else if (fresh.minAmount != null) {
      reasons.push(`Amount meets stated minimum (${fresh.minAmount})`);
    } else {
      missing.push('product minimum amount');
      unknown = true;
    }
    if (fresh.maxAmount != null && amount > fresh.maxAmount) {
      ineligible = true;
      reasons.push(`Requested amount above product maximum (${fresh.maxAmount})`);
    } else if (fresh.maxAmount != null) {
      reasons.push(`Amount within stated maximum (${fresh.maxAmount})`);
    }
  }

  const revenue = opportunity.business.annualRevenue;
  if (!revenue || revenue.verification === 'MISSING' || revenue.value == null) {
    missing.push('verified annual revenue');
    unknown = true;
  } else if (fresh.minRevenue != null && revenue.value < fresh.minRevenue) {
    ineligible = true;
    reasons.push(`Revenue below stated minimum (${fresh.minRevenue})`);
  } else if (fresh.minRevenue != null) {
    reasons.push(`Revenue meets stated minimum (verification=${revenue.verification})`);
  }

  const industry = opportunity.business.industry?.toLowerCase();
  if (industry && fresh.industriesRestricted?.some((i) => industry.includes(i.toLowerCase()))) {
    ineligible = true;
    reasons.push('Industry is on the product restricted list');
  } else if (fresh.industriesPreferred?.length && industry) {
    if (fresh.industriesPreferred.some((i) => industry.includes(i.toLowerCase()))) {
      reasons.push('Industry appears on preferred list');
    } else {
      reasons.push('Industry not on preferred list (not automatically ineligible)');
    }
  }

  const type = opportunity.transactionType;
  if (type === 'acquisition' && fresh.acquisitionAppetite === false) {
    ineligible = true;
    reasons.push('Product has no acquisition appetite');
  }
  if (type === 'construction' && fresh.constructionAppetite === false) {
    ineligible = true;
    reasons.push('Product has no construction appetite');
  }
  if (type === 'equipment' && fresh.equipmentAppetite === false) {
    ineligible = true;
    reasons.push('Product has no equipment appetite');
  }
  if ((type === 'sba' || type === 'sba_working_capital' || type === 'sba_express') && fresh.sbaParticipation === false) {
    ineligible = true;
    reasons.push('Product does not participate in SBA');
  }
  if ((type === 'ar_financing' || type === 'asset_based_lending') && fresh.arEligible === false) {
    ineligible = true;
    reasons.push('AR is not eligible for this product');
  }

  if (!fresh.source && !fresh.lastVerifiedAt) {
    missing.push('criteria source / last verified date');
    unknown = true;
  }

  let band: MatchBand;
  if (ineligible) band = 'INELIGIBLE';
  else if (fresh.freshness === 'STALE') {
    band = 'UNKNOWN';
    reasons.push('Criteria are STALE — not ranked as a definitive match');
  } else if (unknown || fresh.freshness === 'UNKNOWN') {
    band = missing.length && reasons.length === 0 ? 'UNKNOWN' : 'UNKNOWN';
    if (fresh.freshness === 'UNKNOWN') reasons.push('Criteria freshness is UNKNOWN');
  } else if (missing.length === 0 && reasons.length >= 2) {
    band = 'BEST_FIT';
  } else if (missing.length <= 2) {
    band = 'POSSIBLE';
  } else {
    band = 'LOW_FIT';
  }

  if (band === 'BEST_FIT' && (fresh.freshness !== 'CURRENT' || unknown)) {
    band = 'UNKNOWN';
    reasons.push('BEST_FIT blocked: criteria not CURRENT or incomplete');
  }

  return {
    lenderId: lender.id,
    lenderName: lender.name,
    productId: fresh.id,
    productName: fresh.productName,
    band,
    reasons: reasons.length ? reasons : ['Insufficient stated criteria to score'],
    missingCriteria: missing,
    stale: fresh.freshness === 'STALE',
  };
}

export function rankMatches(matches: LenderMatch[]): LenderMatch[] {
  const order: Record<MatchBand, number> = {
    BEST_FIT: 0,
    POSSIBLE: 1,
    LOW_FIT: 2,
    UNKNOWN: 3,
    INELIGIBLE: 4,
  };
  return matches.slice().sort((a, b) => order[a.band] - order[b.band] || a.lenderName.localeCompare(b.lenderName));
}

export function matchLenders(
  opportunity: CapitalOpportunity,
  lenders: LenderOrganization[],
  products: LenderProduct[],
  now = new Date(),
): LenderMatch[] {
  const byLender = new Map(lenders.map((l) => [l.id, l]));
  const results: LenderMatch[] = [];
  for (const product of products) {
    const lender = byLender.get(product.lenderId);
    if (!lender) continue;
    results.push(matchProduct(opportunity, lender, product, now));
  }
  return rankMatches(results);
}
