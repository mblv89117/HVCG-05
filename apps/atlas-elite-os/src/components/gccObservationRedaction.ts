/**
 * Elite render-path redaction for GCC observation summaries.
 * Same rules as redactFinancialDollars in atlas-integration-api gccValueSignal.ts.
 * Finding text may remain. Dollar, cash, and runway amounts may not.
 */
const CURRENCY_CODES = 'USD|EUR|GBP|CAD|AUD|NZD|CHF|JPY';
const MONEY_NUMBER = '\\d{1,3}(?:,\\d{3})+(?:\\.\\d+)?|\\d+(?:\\.\\d+)?';
const CASH_WORD = 'runway|cash|forecast';
const CASH_UNIT = 'months?|days?|weeks?|years?';

function neutralizeCashRunwayAmounts(text: string): string {
  const leading = new RegExp(
    `\\b(?:${CASH_WORD})\\b(?:\\s+(?:of|on|hand|balance|is|at))*\\s+(?:${MONEY_NUMBER})(?:\\s+(?:${CASH_UNIT}))?`,
    'gi',
  );
  const trailing = new RegExp(
    `\\b(?:${MONEY_NUMBER})(?:\\s+(?:${CASH_UNIT}))?\\s+(?:${CASH_WORD})\\b`,
    'gi',
  );
  return text.replace(leading, '').replace(trailing, '');
}

export function redactGccObservationSummary(text: string): string {
  let out = text.replace(new RegExp(`\\$[ \\t]{0,2}(?:${MONEY_NUMBER})`, 'g'), '');
  out = out.replace(new RegExp(`\\b(?:${CURRENCY_CODES})[ \\t]{0,2}(?:${MONEY_NUMBER})`, 'gi'), '');
  out = neutralizeCashRunwayAmounts(out);
  out = out.replace(/\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b/g, '');
  out = out.replace(/\b\d{4,}(?:\.\d+)?\b/g, '');
  return out.replace(/\s{2,}/g, ' ').trim();
}
