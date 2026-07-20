import type {
  AdminUser,
  ApplicationSettings,
  EvaAssumptions,
  FinancialSettings,
  PermissionKey,
  ReferenceItem,
} from './types';
import { ALL_PERMISSION_KEYS, PERMISSION_CATALOG } from './types';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

function requireNonEmpty(label: string, value: string) {
  if (!value.trim()) throw new ValidationError(`${label} is required.`);
}

function requireEmail(email: string) {
  requireNonEmpty('Email', email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    throw new ValidationError('Enter a valid email address.');
  }
}

export function validateInviteUser(input: {
  displayName: string;
  email: string;
  roleIds: string[];
  organizationIds: string[];
}) {
  requireNonEmpty('Display name', input.displayName);
  requireEmail(input.email);
  if (!input.roleIds.length) throw new ValidationError('Assign at least one role.');
  if (!input.organizationIds.length) {
    throw new ValidationError('Assign at least one organization.');
  }
}

export function validateReferenceItem(item: Pick<ReferenceItem, 'label' | 'code'>) {
  requireNonEmpty('Label', item.label);
  requireNonEmpty('Code', item.code);
  if (item.code.length > 32) throw new ValidationError('Code must be 32 characters or fewer.');
}

export function validatePermissionKeys(keys: PermissionKey[]) {
  for (const k of keys) {
    if (!ALL_PERMISSION_KEYS.includes(k)) {
      throw new ValidationError(`Permission "${k}" is not in the approved catalog.`);
    }
  }
  if (keys.length === ALL_PERMISSION_KEYS.length) {
    // Allowed for Owner role only — caller must check. Soft note via catalog.
  }
}

export function assertKnownPermissions(keys: string[]): asserts keys is PermissionKey[] {
  for (const k of keys) {
    if (!(k in PERMISSION_CATALOG)) {
      throw new ValidationError(`Unknown permission "${k}". Unrestricted grants are not allowed.`);
    }
  }
}

export function validateApplicationSettings(s: ApplicationSettings) {
  requireNonEmpty('Product name', s.productName);
  requireNonEmpty('Company short name', s.companyShortName);
  requireNonEmpty('Time zone', s.timeZone);
  requireNonEmpty('Locale', s.locale);
  requireNonEmpty('Naming prefix', s.namingPrefix);
  if (!s.namingPrefix.endsWith('_')) {
    throw new ValidationError('Naming prefix should end with an underscore (e.g. HVCG_).');
  }
}

export function validateFinancialSettings(s: FinancialSettings) {
  if (!/^[A-Z]{3}$/.test(s.currency)) {
    throw new ValidationError('Currency must be a 3-letter code (e.g. USD).');
  }
  if (s.invoiceDueDaysDefault < 1 || s.invoiceDueDaysDefault > 120) {
    throw new ValidationError('Invoice due days must be between 1 and 120.');
  }
}

export function validateEvaAssumptions(s: EvaAssumptions) {
  if (s.defaultRevenueMultiple <= 0 || s.defaultRevenueMultiple > 50) {
    throw new ValidationError('Revenue multiple must be between 0 and 50.');
  }
  if (s.defaultEbitdaMultiple <= 0 || s.defaultEbitdaMultiple > 50) {
    throw new ValidationError('EBITDA multiple must be between 0 and 50.');
  }
  if (s.discountRatePercent < 0 || s.discountRatePercent > 100) {
    throw new ValidationError('Discount rate must be between 0 and 100.');
  }
}

export function validateUserActive(user: AdminUser) {
  if (user.status === 'Disabled') {
    throw new ValidationError('This user is disabled. Activate them before changing access.');
  }
}
