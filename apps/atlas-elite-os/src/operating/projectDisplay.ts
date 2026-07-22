/**
 * Honest project field display — never invent healthier/more specific values.
 */

const DEFINE_NEXT_RE = /^define next action\b/i;
const NEXT_REQUIRED_RE = /^next action required\b/i;
const SCOPE_CONFIRMED = /^scope confirmed$/i;

export function normalizeClientMatchKey(name: string | undefined | null): string {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

export function isBootstrapNextAction(value: string | undefined | null): boolean {
  if (!value) return true;
  const t = value.trim();
  return DEFINE_NEXT_RE.test(t) || NEXT_REQUIRED_RE.test(t);
}

export function isBootstrapMilestoneTitle(value: string | undefined | null): boolean {
  return !value || SCOPE_CONFIRMED.test(value.trim());
}

export function displayHealth(
  health: string | undefined | null,
  opts?: { treatHealthyAsUnassessed?: boolean },
): string {
  if (!health || health === 'unknown') return 'Not assessed';
  if (opts?.treatHealthyAsUnassessed && health === 'healthy') return 'Not assessed';
  return health;
}

export function displayMilestone(title: string | undefined | null): string {
  if (isBootstrapMilestoneTitle(title)) return 'No milestone established';
  return title!;
}

export function displayNextAction(value: string | undefined | null): string {
  if (isBootstrapNextAction(value)) return 'Next action required';
  return value!;
}

export function displayDueDate(value: string | undefined | null): string {
  if (!value) return 'No due date';
  return value;
}

export function displayLastActivity(value: string | undefined | null): string {
  if (!value) return 'No activity recorded';
  return value.slice(0, 10);
}

export function projectNeedsReview(row: {
  health?: string | null;
  nextAction?: string | null;
  nextMilestone?: string | null;
  targetCompletionDate?: string | null;
  lastActivityAt?: string | null;
  duplicateCandidate?: boolean;
  needsOwnerReview?: boolean;
}): boolean {
  return Boolean(
    row.duplicateCandidate ||
      row.needsOwnerReview ||
      !row.health ||
      row.health === 'unknown' ||
      isBootstrapNextAction(row.nextAction) ||
      isBootstrapMilestoneTitle(row.nextMilestone) ||
      !row.targetCompletionDate,
  );
}
