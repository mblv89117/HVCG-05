import { isCanonicalClientCode } from '@hvcg/atlas-identity-map';
import { getIdentityRegistry } from '../../identity/registry.ts';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export type LeadConversionPrepare = {
  leadId: string;
  proposedClientCode: string;
  displayName: string;
  status: 'PREPARED_AWAITING_APPROVAL';
  authorityClass: 'PREPARE';
  preparedAt: string;
  preparedBy: string;
  notes: string[];
};

export function prepareLeadClientConversion(input: {
  dataDir: string;
  leadId: string;
  proposedClientCode: string;
  displayName: string;
  preparedBy: string;
}):
  | { ok: true; record: LeadConversionPrepare }
  | { ok: false; status: number; code: string; message: string } {
  if (!input.leadId.trim()) {
    return { ok: false, status: 400, code: 'MISSING_LEAD_ID', message: 'leadId required.' };
  }
  if (!isCanonicalClientCode(input.proposedClientCode)) {
    return {
      ok: false,
      status: 403,
      code: 'MALFORMED_CLIENT_CODE',
      message: 'Canonical ClientCode required.',
    };
  }
  if (!getIdentityRegistry().getByClientCode(input.proposedClientCode)) {
    return {
      ok: false,
      status: 403,
      code: 'CLIENTCODE_UNMAPPED',
      message: 'Unknown ClientCode — conversion prepare fail closed.',
    };
  }
  const record: LeadConversionPrepare = {
    leadId: input.leadId.trim(),
    proposedClientCode: input.proposedClientCode,
    displayName: input.displayName.trim() || input.proposedClientCode,
    status: 'PREPARED_AWAITING_APPROVAL',
    authorityClass: 'PREPARE',
    preparedAt: new Date().toISOString(),
    preparedBy: input.preparedBy,
    notes: [
      'Does not create HVCG_Clients.',
      'Does not mutate SharePoint until Owner/admin approval path executes.',
      'MRI enrichment may attach after approval.',
    ],
  };
  const dir = join(input.dataDir, 'lead-conversions');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${record.leadId}.json`), JSON.stringify(record, null, 2), 'utf8');
  return { ok: true, record };
}

export function readLeadConversionPrepare(
  dataDir: string,
  leadId: string,
): LeadConversionPrepare | null {
  const file = join(dataDir, 'lead-conversions', `${leadId}.json`);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as LeadConversionPrepare;
  } catch {
    return null;
  }
}
