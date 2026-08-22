/**
 * Role-neutral ownership values for Local AI Operations.
 * Never hard-code named former/prospective team members.
 */

export const CONFIGURABLE_OWNERS = [
  'Manny',
  'Local AI Operations Agent',
  'Unassigned Operations',
  'Future Human Operator',
  'Automation',
] as const;

export type ConfigurableOwner = (typeof CONFIGURABLE_OWNERS)[number];

export const DEFAULT_OWNER: ConfigurableOwner = 'Unassigned Operations';
export const MANNY_OWNER: ConfigurableOwner = 'Manny';
export const LOCAL_AI_OWNER: ConfigurableOwner = 'Local AI Operations Agent';
export const AUTOMATION_OWNER: ConfigurableOwner = 'Automation';
export const FUTURE_OPERATOR_OWNER: ConfigurableOwner = 'Future Human Operator';

export function isConfigurableOwner(value: string): value is ConfigurableOwner {
  return (CONFIGURABLE_OWNERS as readonly string[]).includes(value);
}

export function assertConfigurableOwner(value: string): ConfigurableOwner {
  if (!isConfigurableOwner(value)) {
    throw new Error(
      `Invalid owner "${value}". Allowed: ${CONFIGURABLE_OWNERS.join(', ')}`,
    );
  }
  return value;
}

/** Forbidden named individuals in Phase 1 fixtures/source (case-insensitive). */
export const FORBIDDEN_PERSON_NAMES = ['stephen', 'john', 'mason'] as const;

export function containsForbiddenPersonName(text: string): boolean {
  const lower = text.toLowerCase();
  return FORBIDDEN_PERSON_NAMES.some((name) => {
    const re = new RegExp(`\\b${name}\\b`, 'i');
    return re.test(lower);
  });
}
