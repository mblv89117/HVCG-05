import type {
  ClientIdentityMapping,
  DualResolveResult,
  ModuleSystem,
  ResolveOutcome,
} from './types.ts';
import { entraGroupForClientCode, isCanonicalClientCode } from './validate.ts';

export class ClientIdentityRegistry {
  private byCode = new Map<string, ClientIdentityMapping>();
  private byLocal = new Map<string, { system: ModuleSystem; clientCode: string }>();

  constructor(rows: readonly ClientIdentityMapping[] = []) {
    for (const row of rows) this.upsert(row);
  }

  upsert(row: ClientIdentityMapping): void {
    if (!isCanonicalClientCode(row.clientCode)) {
      throw new Error(`Refuse non-canonical ClientCode: ${row.clientCode}`);
    }
    const expected = entraGroupForClientCode(row.clientCode);
    if (row.entraGroupDisplayName !== expected) {
      throw new Error(`Entra group must be ${expected}, got ${row.entraGroupDisplayName}`);
    }
    this.byCode.set(row.clientCode, row);
    this.indexLocal('gcc', row.gccOrganizationId, row.clientCode);
    this.indexLocal('growth_360', row.growth360OrganizationId, row.clientCode);
    this.indexLocal(
      'growth_360',
      row.growth360Slug ? `slug:${row.growth360Slug}` : null,
      row.clientCode,
    );
    this.indexLocal('copilot_mri', row.copilotOrganizationId, row.clientCode);
    this.indexLocal('client360', row.client360Id, row.clientCode);
    this.indexLocal('website_lead', row.websiteLeadProspectKey, row.clientCode);
    this.indexLocal('atlas_sharepoint', row.hvcgClientsItemId, row.clientCode);
    this.indexLocal('entra_group', row.entraGroupDisplayName, row.clientCode);
    for (const k of row.entityLocationKeys ?? []) {
      this.indexLocal('entity_location', k, row.clientCode);
    }
    for (const k of row.userKeys ?? []) this.indexLocal('user', k, row.clientCode);
  }

  private indexLocal(
    system: ModuleSystem,
    localId: string | null | undefined,
    clientCode: string,
  ): void {
    if (!localId) return;
    const key = `${system}|${localId}`;
    const existing = this.byLocal.get(key);
    if (existing && existing.clientCode !== clientCode) {
      throw new Error(`Ambiguous local id ${key}: ${existing.clientCode} vs ${clientCode}`);
    }
    this.byLocal.set(key, { system, clientCode });
  }

  getByClientCode(clientCode: string): ClientIdentityMapping | null {
    if (!isCanonicalClientCode(clientCode)) return null;
    return this.byCode.get(clientCode) ?? null;
  }

  resolveFromLocal(system: ModuleSystem, localId: string): ResolveOutcome {
    if (!localId || typeof localId !== 'string') {
      return { ok: false, reason: 'UNKNOWN_LOCAL_ID', detail: 'empty local id' };
    }
    const hit = this.byLocal.get(`${system}|${localId}`);
    if (!hit) {
      return { ok: false, reason: 'UNKNOWN_LOCAL_ID', detail: `${system}|${localId}` };
    }
    const mapping = this.byCode.get(hit.clientCode);
    if (!mapping) {
      return { ok: false, reason: 'UNKNOWN_CLIENT_CODE', detail: hit.clientCode };
    }
    return {
      ok: true,
      result: {
        clientCode: hit.clientCode,
        mapping,
        resolvedFrom: system,
        localId,
      },
    };
  }

  dualResolve(input: {
    clientCode?: string | null;
    system?: ModuleSystem;
    localId?: string | null;
  }): ResolveOutcome {
    const code = input.clientCode ?? null;
    const localId = input.localId ?? null;
    const system = input.system;

    if (code) {
      if (!isCanonicalClientCode(code)) {
        return { ok: false, reason: 'MALFORMED_CLIENT_CODE', detail: String(code) };
      }
      const mapping = this.byCode.get(code);
      if (!mapping) {
        return { ok: false, reason: 'UNKNOWN_CLIENT_CODE', detail: code };
      }
      if (system && localId) {
        const fromLocal = this.resolveFromLocal(system, localId);
        if (!fromLocal.ok) {
          return {
            ok: false,
            reason: 'UNKNOWN_LOCAL_ID',
            detail: `ClientCode ${code} known but local ${system}|${localId} not mapped`,
          };
        }
        if (fromLocal.result.clientCode !== code) {
          return {
            ok: false,
            reason: 'AMBIGUOUS',
            detail: `ClientCode ${code} disagrees with local ${system}|${localId}→${fromLocal.result.clientCode}`,
          };
        }
      }
      const result: DualResolveResult = {
        clientCode: code,
        mapping,
        resolvedFrom: system ?? 'atlas_sharepoint',
        localId: localId ?? code,
      };
      return { ok: true, result };
    }

    if (system && localId) {
      return this.resolveFromLocal(system, localId);
    }

    return {
      ok: false,
      reason: 'UNKNOWN_CLIENT_CODE',
      detail: 'no ClientCode or local id provided',
    };
  }

  list(): ClientIdentityMapping[] {
    return [...this.byCode.values()].sort((a, b) => a.clientCode.localeCompare(b.clientCode));
  }
}
