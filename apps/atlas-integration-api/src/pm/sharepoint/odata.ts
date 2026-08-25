/**
 * OData helpers for Hub-side list-item matching.
 * Graph list GETs never receive $filter (Lists.SelectedOperations.Selected
 * rejects field filters as 403). Hub applies these predicates in memory.
 * Never interpolate unsanitized caller strings into Graph URLs.
 */

/** Escape a string for OData single-quoted literals. */
export function odataString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export function fieldsEq(field: string, value: string): string {
  return `fields/${field} eq ${odataString(value)}`;
}

export function fieldsEqTrue(field: string): string {
  return `fields/${field} eq 1`;
}

export function itemMatchesFieldsFilter(
  item: { fields: Record<string, unknown> },
  filter: string,
): boolean {
  const eq = /^fields\/(\w+) eq (.+)$/.exec(filter.trim());
  if (!eq) return false;
  const field = eq[1];
  let expected = eq[2];
  const actual = item.fields[field];
  if (expected === '1' || expected === 'true') {
    return actual === true || actual === 1 || actual === '1' || actual === 'true';
  }
  if (expected.startsWith("'") && expected.endsWith("'")) {
    expected = expected.slice(1, -1).replace(/''/g, "'");
    return String(actual ?? '') === expected;
  }
  return String(actual ?? '') === expected;
}
