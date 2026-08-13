/**
 * OData helpers for Graph list-item $filter.
 * Never interpolate unsanitized caller strings.
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
