/**
 * Dynamic document checklist engine.
 * Configurable rule sets by transaction type. Human override is audited.
 */

import type {
  ChecklistItem,
  ChecklistStatus,
  TransactionType,
  VerificationState,
} from './types.ts';

export interface ChecklistRule {
  itemKey: string;
  name: string;
  category: string;
  transactionTypes: TransactionType[] | '*';
  requiredness: 'REQUIRED' | 'OPTIONAL' | 'CONDITIONAL';
  condition?: string;
  responsibleParty: ChecklistItem['responsibleParty'];
  applies?: (ctx: ChecklistContext) => boolean;
}

export interface ChecklistContext {
  transactionType: TransactionType;
  realEstateComponent?: boolean;
  equipmentComponent?: boolean;
  constructionComponent?: boolean;
  acquisition?: boolean;
  personalGuaranteeExpected?: boolean;
  sba?: boolean;
}

const COMMON: ChecklistRule[] = [
  {
    itemKey: 'org-formation',
    name: 'Formation / organizational documents',
    category: 'Corporate',
    transactionTypes: '*',
    requiredness: 'REQUIRED',
    responsibleParty: 'client',
  },
  {
    itemKey: 'org-ownership',
    name: 'Ownership / cap table / operating agreement',
    category: 'Ownership',
    transactionTypes: '*',
    requiredness: 'REQUIRED',
    responsibleParty: 'client',
  },
  {
    itemKey: 'fin-pl-ytd',
    name: 'Year-to-date profit & loss',
    category: 'Current Financials',
    transactionTypes: '*',
    requiredness: 'REQUIRED',
    responsibleParty: 'client',
  },
  {
    itemKey: 'fin-bs-ytd',
    name: 'Year-to-date balance sheet',
    category: 'Current Financials',
    transactionTypes: '*',
    requiredness: 'REQUIRED',
    responsibleParty: 'client',
  },
  {
    itemKey: 'fin-tax-3yr',
    name: 'Business tax returns (3 years)',
    category: 'Tax Returns',
    transactionTypes: '*',
    requiredness: 'REQUIRED',
    responsibleParty: 'client',
  },
  {
    itemKey: 'bank-3mo',
    name: 'Business bank statements (3 months)',
    category: 'Bank Statements',
    transactionTypes: '*',
    requiredness: 'REQUIRED',
    responsibleParty: 'client',
  },
  {
    itemKey: 'debt-schedule',
    name: 'Current debt schedule',
    category: 'Debt Schedule',
    transactionTypes: '*',
    requiredness: 'REQUIRED',
    responsibleParty: 'client',
  },
  {
    itemKey: 'id-owners',
    name: 'Owner government ID',
    category: 'Ownership',
    transactionTypes: '*',
    requiredness: 'REQUIRED',
    responsibleParty: 'client',
  },
  {
    itemKey: 'ins-gl',
    name: 'General liability insurance certificate',
    category: 'Insurance',
    transactionTypes: '*',
    requiredness: 'OPTIONAL',
    responsibleParty: 'client',
  },
];

const CONDITIONAL: ChecklistRule[] = [
  {
    itemKey: 'sba-1919',
    name: 'SBA Form 1919 (or current successor borrower information)',
    category: 'SBA',
    transactionTypes: ['sba', 'sba_working_capital', 'sba_express'],
    requiredness: 'REQUIRED',
    responsibleParty: 'client',
  },
  {
    itemKey: 'sba-413',
    name: 'Personal financial statement (SBA 413 or equivalent)',
    category: 'SBA',
    transactionTypes: ['sba', 'sba_working_capital', 'sba_express', 'acquisition', 'conventional_bank_loan'],
    requiredness: 'CONDITIONAL',
    condition: 'Required when personal guarantee is expected',
    responsibleParty: 'client',
    applies: (ctx) => ctx.personalGuaranteeExpected !== false,
  },
  {
    itemKey: 'pfs',
    name: 'Personal financial statement',
    category: 'Ownership',
    transactionTypes: '*',
    requiredness: 'CONDITIONAL',
    condition: 'Required when personal guarantee is expected',
    responsibleParty: 'client',
    applies: (ctx) => ctx.personalGuaranteeExpected === true,
  },
  {
    itemKey: 'ar-aging',
    name: 'AR aging',
    category: 'AR',
    transactionTypes: ['ar_financing', 'asset_based_lending', 'working_capital_loc', 'sba_working_capital'],
    requiredness: 'REQUIRED',
    responsibleParty: 'client',
  },
  {
    itemKey: 'ap-aging',
    name: 'AP aging',
    category: 'AP',
    transactionTypes: ['ar_financing', 'asset_based_lending', 'working_capital_loc', 'sba_working_capital'],
    requiredness: 'REQUIRED',
    responsibleParty: 'client',
  },
  {
    itemKey: 'inventory-detail',
    name: 'Inventory listing / ineligibility schedule',
    category: 'Current Financials',
    transactionTypes: ['inventory', 'asset_based_lending'],
    requiredness: 'REQUIRED',
    responsibleParty: 'client',
  },
  {
    itemKey: 'eq-invoice',
    name: 'Equipment invoice / quote',
    category: 'Contracts',
    transactionTypes: ['equipment'],
    requiredness: 'REQUIRED',
    responsibleParty: 'client',
  },
  {
    itemKey: 're-psa',
    name: 'Purchase and sale agreement / LOI',
    category: 'Real Estate',
    transactionTypes: ['commercial_real_estate', 'acquisition', 'construction'],
    requiredness: 'REQUIRED',
    responsibleParty: 'client',
  },
  {
    itemKey: 're-appraisal',
    name: 'Appraisal (or order status)',
    category: 'Real Estate',
    transactionTypes: ['commercial_real_estate', 'construction', 'acquisition'],
    requiredness: 'CONDITIONAL',
    condition: 'Required when real-estate collateral is in the structure',
    responsibleParty: 'third_party',
    applies: (ctx) => ctx.realEstateComponent !== false,
  },
  {
    itemKey: 're-lease',
    name: 'Lease / landlord information',
    category: 'Real Estate',
    transactionTypes: ['commercial_real_estate', 'working_capital_loc', 'sba', 'sba_working_capital'],
    requiredness: 'OPTIONAL',
    responsibleParty: 'client',
  },
  {
    itemKey: 'construction-budget',
    name: 'Construction budget / plans / GC contract',
    category: 'Real Estate',
    transactionTypes: ['construction'],
    requiredness: 'REQUIRED',
    responsibleParty: 'client',
  },
  {
    itemKey: 'acq-quality-of-earnings',
    name: 'Quality of earnings / trailing financials of target',
    category: 'Historical Financials',
    transactionTypes: ['acquisition', 'recapitalization'],
    requiredness: 'REQUIRED',
    responsibleParty: 'client',
  },
  {
    itemKey: 'refi-notes',
    name: 'Existing notes, payoff letters, and recorded liens',
    category: 'Debt Schedule',
    transactionTypes: ['refinance', 'bridge'],
    requiredness: 'REQUIRED',
    responsibleParty: 'client',
  },
  {
    itemKey: 'ucc-search',
    name: 'UCC / lien search',
    category: 'Legal',
    transactionTypes: ['asset_based_lending', 'equipment', 'refinance', 'acquisition'],
    requiredness: 'OPTIONAL',
    responsibleParty: 'hvcg',
  },
];

export const CHECKLIST_RULES: ChecklistRule[] = [...COMMON, ...CONDITIONAL];

function ruleApplies(rule: ChecklistRule, ctx: ChecklistContext): boolean {
  const typeOk = rule.transactionTypes === '*' || rule.transactionTypes.includes(ctx.transactionType);
  if (!typeOk) return false;
  if (rule.applies) return rule.applies(ctx);
  return true;
}

export function generateChecklist(
  ctx: ChecklistContext,
  now = new Date().toISOString(),
): ChecklistItem[] {
  return CHECKLIST_RULES.filter((rule) => ruleApplies(rule, ctx)).map((rule) => ({
    id: `chk-${rule.itemKey}`,
    itemKey: rule.itemKey,
    name: rule.name,
    category: rule.category,
    transactionTypes: rule.transactionTypes === '*' ? [ctx.transactionType] : rule.transactionTypes,
    requiredness: rule.requiredness,
    condition: rule.condition,
    responsibleParty: rule.responsibleParty,
    status: rule.requiredness === 'OPTIONAL' ? 'MISSING' : 'MISSING',
    requestedAt: now,
    verification: 'MISSING' as VerificationState,
    version: 1,
  }));
}

export function isBlockingStatus(status: ChecklistStatus): boolean {
  return status === 'MISSING' || status === 'REQUESTED' || status === 'INCOMPLETE' || status === 'OUTDATED' || status === 'NEEDS_REVIEW';
}

export function requiredOpenItems(items: ChecklistItem[]): ChecklistItem[] {
  return items.filter(
    (i) => i.requiredness !== 'OPTIONAL' && i.status !== 'NOT_APPLICABLE' && i.status !== 'ACCEPTED' && isBlockingStatus(i.status),
  );
}

export function completenessPercent(items: ChecklistItem[]): number {
  const counted = items.filter((i) => i.requiredness !== 'OPTIONAL' && i.status !== 'NOT_APPLICABLE');
  if (counted.length === 0) return 100;
  const accepted = counted.filter((i) => i.status === 'ACCEPTED').length;
  return Math.round((accepted / counted.length) * 100);
}

export function markOutdated(items: ChecklistItem[], now = new Date()): ChecklistItem[] {
  return items.map((item) => {
    if (!item.expiration || item.status === 'NOT_APPLICABLE') return item;
    const exp = Date.parse(item.expiration);
    if (Number.isFinite(exp) && now.getTime() > exp && item.status === 'ACCEPTED') {
      return { ...item, status: 'OUTDATED' as const, deficiency: 'Document past current-through / expiration date' };
    }
    return item;
  });
}

export function overrideChecklistItem(
  item: ChecklistItem,
  patch: Partial<Pick<ChecklistItem, 'status' | 'notes' | 'deficiency'>> & {
    overrideReason: string;
    overrideBy: string;
    overrideAt?: string;
  },
): ChecklistItem {
  if (!patch.overrideReason.trim()) {
    throw new Error('Checklist override requires an audit reason');
  }
  return {
    ...item,
    ...patch,
    overrideReason: patch.overrideReason,
    overrideBy: patch.overrideBy,
    overrideAt: patch.overrideAt || new Date().toISOString(),
  };
}

export interface MissingDocumentRequest {
  subject: string;
  items: Array<{ name: string; category: string; status: ChecklistStatus; deficiency?: string }>;
  body: string;
}

export function consolidateMissingRequest(items: ChecklistItem[], clientCode: string): MissingDocumentRequest | null {
  const open = requiredOpenItems(items);
  if (open.length === 0) return null;
  const names = open.map((i) => i.name);
  return {
    subject: `${clientCode} — outstanding capital documents (${open.length})`,
    items: open.map((i) => ({ name: i.name, category: i.category, status: i.status, deficiency: i.deficiency })),
    body: [
      `Please provide the following items in one package (do not send piecemeal unless an item is delayed):`,
      ...names.map((n, idx) => `${idx + 1}. ${n}`),
      '',
      'Upload to the secure HVCG client repository. Original files only — do not edit source PDFs.',
    ].join('\n'),
  };
}
