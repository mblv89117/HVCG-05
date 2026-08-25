/**
 * Provenance-preserving HVS recovery inventory.
 *
 * Source of truth for these rows is the HVS admin app (HVCG-V3-HVS-Admin),
 * not Hub managed identity. Hub MI HVCG_Clients stay fail-closed: these rows
 * are references + metadata only. Atlas does not copy binaries, invent
 * balances, deadlines, or obligations, or mint SharePoint client rows.
 *
 * Evidence cycle: 2026-08-22 HVS-admin Graph Sites.Read.All / Files.Read.All.
 */

import type { RecoveryLedgerRow } from './knowledgeClassification.ts';

export type HvsAccessStatus = 'AVAILABLE' | 'PARTIAL' | 'BLOCKED';

export const HVS_ADMIN_DISPLAY_NAME = 'HVCG-V3-HVS-Admin';

export const HVS_ACCESSIBLE_SITES = [
  'HIGH VALUE SOLUTION',
  'HVS Operations Hub',
  'HVS Engagements',
  'Capital Access HUB',
  'Investor Portal',
  'HVS Sales Team',
] as const;

export type HvsInventoryRow = RecoveryLedgerRow & {
  identity: 'hvs_admin_app';
  site: string;
  path?: string;
  list?: string;
  hubMiAccessible: false;
  nextAction: string;
};

const HVS_CLIENT_FILES =
  'HIGH VALUE SOLUTION / Documents / 4_Engagements / 00_Client Files';

function hvsRow(
  partial: Omit<HvsInventoryRow, 'identity' | 'hubMiAccessible' | 'discovered' | 'classified' | 'operationalized'>,
): HvsInventoryRow {
  return {
    ...partial,
    identity: 'hvs_admin_app',
    hubMiAccessible: false,
    discovered: true,
    classified: true,
    operationalized: false,
  };
}

function confirmedFolder(input: {
  client: string;
  clientCode: string;
  folderName: string;
  extra?: string;
}): HvsInventoryRow {
  return hvsRow({
    source: 'hvs_admin / HIGH VALUE SOLUTION Documents',
    site: 'HIGH VALUE SOLUTION',
    path: `${HVS_CLIENT_FILES} / ${input.folderName}`,
    client: input.client,
    clientCode: input.clientCode,
    dataType: 'HVS_CLIENT_FOLDER',
    accessible: true,
    indexed: true,
    validated: true,
    exceptions: input.extra || 'Folder metadata only. No Hub MI HVCG_Clients row. No invented financials.',
    blocker: 'Hub MI cannot see this HVS folder. Do not invent an entitled HVCG_Clients row.',
    provenance: 'CONFIRMED',
    nextAction: 'Keep as reference-only until an entitled Hub MI HVCG_Clients row exists for this principal.',
  });
}

/** CONFIRMED HVS-admin-discovered sources. Not Hub MI operationalizations. */
export const HVS_ADMIN_INVENTORY: readonly HvsInventoryRow[] = [
  hvsRow({
    source: 'hvs_admin / sites',
    site: 'HIGH VALUE SOLUTION',
    client: 'HVS SharePoint sites (admin identity)',
    clientCode: '',
    dataType: 'HVS_SITES',
    accessible: true,
    indexed: true,
    validated: true,
    exceptions: `Accessible to ${HVS_ADMIN_DISPLAY_NAME}: ${HVS_ACCESSIBLE_SITES.join(', ')}. Hub MI remains fail-closed.`,
    blocker: 'Hub managed identity HVS access stays BLOCKED. Do not expand Hub MI onto HVCG-Client-* groups.',
    provenance: 'CONFIRMED',
    nextAction: 'Use HVS-admin inventory as the honest PARTIAL picture. Do not treat Hub MI empty HVCG lists as HVS absence.',
  }),
  confirmedFolder({ client: 'ACCG Inc', clientCode: 'ACCG01', folderName: 'ACCG Inc' }),
  confirmedFolder({
    client: "Christie's Place",
    clientCode: 'CPL01',
    folderName: "Christie's Place",
    extra: "Client folder CONFIRMED. Christie Falk / Irwin Falk are related persons, not a second client code.",
  }),
  confirmedFolder({
    client: 'Prodigy Games',
    clientCode: 'PDG01',
    folderName: 'Prodigy Games',
    extra: 'Client folder CONFIRMED. Transaction workbooks exist at Documents root. Do not invent balances.',
  }),
  confirmedFolder({
    client: "Pierlo Inc (DBA Baker's Travertine Power Clean)",
    clientCode: '',
    folderName: "Pierlo Inc (DBA Baker's Travertine Power Clean)",
  }),
  confirmedFolder({
    client: 'Colorado Beef',
    clientCode: 'CCB01',
    folderName: 'Colorado Beef',
    extra: 'HVS folder name is Colorado Beef. Catalog code CCB01 is Colorado Craft Beef. No invented funding status.',
  }),
  confirmedFolder({ client: 'Comic Books', clientCode: '', folderName: 'Comic Books' }),
  confirmedFolder({ client: 'Frocovery', clientCode: '', folderName: 'Frocovery' }),
  confirmedFolder({
    client: 'Integrity Lift Solutions LLC',
    clientCode: '',
    folderName: 'Integrity Lift Solutions LLC',
  }),
  confirmedFolder({
    client: 'Lien Partners LLC',
    clientCode: 'LIEN01',
    folderName: 'Lien Partners LLC',
  }),
  confirmedFolder({ client: 'LV Appraisals', clientCode: '', folderName: 'LV Appraisals' }),
  confirmedFolder({ client: 'Victory Contracting', clientCode: '', folderName: 'Victory Contracting' }),
  confirmedFolder({
    client: 'Final Installment',
    clientCode: '',
    folderName: 'Final Installment',
    extra: 'Second-level engagement letter 8.27.25 CONFIRMED. No Hub client code. No invented deal terms.',
  }),
  hvsRow({
    source: 'hvs_admin / HIGH VALUE SOLUTION Documents',
    site: 'HIGH VALUE SOLUTION',
    path: 'HIGH VALUE SOLUTION / Documents / 4_Engagements / Generational Group / Kaurina',
    client: 'Kaurina',
    clientCode: '',
    dataType: 'HVS_GENERATIONAL_GROUP_FOLDER',
    accessible: true,
    indexed: true,
    validated: true,
    exceptions: 'Generational Group subfolder. No Hub client code. No invented obligations.',
    blocker: 'Hub MI cannot see this HVS folder. Do not invent an entitled HVCG_Clients row.',
    provenance: 'CONFIRMED',
    nextAction: 'Keep as reference-only. Do not merge into a Hub client record without an entitled row.',
  }),
  hvsRow({
    source: 'hvs_admin / HIGH VALUE SOLUTION Documents',
    site: 'HIGH VALUE SOLUTION',
    path: 'HIGH VALUE SOLUTION / Documents / 4_Engagements / Generational Group / Titan',
    client: 'Titan',
    clientCode: '',
    dataType: 'HVS_GENERATIONAL_GROUP_FOLDER',
    accessible: true,
    indexed: true,
    validated: true,
    exceptions: 'Generational Group subfolder. No Hub client code. No invented obligations.',
    blocker: 'Hub MI cannot see this HVS folder. Do not invent an entitled HVCG_Clients row.',
    provenance: 'CONFIRMED',
    nextAction: 'Keep as reference-only. Do not merge into a Hub client record without an entitled row.',
  }),
  hvsRow({
    source: 'hvs_admin / Capital Access HUB',
    site: 'Capital Access HUB',
    path: 'Capital Access HUB / 00_Client Files / 00_Generational Group / 144029.15Dec25-Nabro Holdings, LLC',
    client: 'Nabro Holdings, LLC',
    clientCode: '',
    dataType: 'HVS_CAPITAL_ACCESS_FOLDER',
    accessible: true,
    indexed: true,
    validated: true,
    exceptions: 'Capital Access HUB folder metadata only. No invented deal terms.',
    blocker: 'Hub MI cannot see this HVS folder. Do not invent an entitled HVCG_Clients row.',
    provenance: 'CONFIRMED',
    nextAction: 'Keep as reference-only.',
  }),
  hvsRow({
    source: 'hvs_admin / Capital Access HUB',
    site: 'Capital Access HUB',
    path: 'Capital Access HUB / 00_Client Files / 00_Generational Group / 150112.15Dec25-Triarc Construction, LLC',
    client: 'Triarc Construction, LLC',
    clientCode: '',
    dataType: 'HVS_CAPITAL_ACCESS_FOLDER',
    accessible: true,
    indexed: true,
    validated: true,
    exceptions: 'Capital Access HUB folder metadata only. No invented deal terms.',
    blocker: 'Hub MI cannot see this HVS folder. Do not invent an entitled HVCG_Clients row.',
    provenance: 'CONFIRMED',
    nextAction: 'Keep as reference-only.',
  }),
  hvsRow({
    source: 'hvs_admin / HVS Operations Hub lists',
    site: 'HVS Operations Hub',
    list: 'Master Client List',
    client: 'Pierlo Inc.',
    clientCode: '',
    dataType: 'HVS_MASTER_CLIENT_LIST',
    accessible: true,
    indexed: true,
    validated: true,
    exceptions: 'CONFIRMED list row. Status recorded as Closed. No invented revenue, fees, or contacts.',
    blocker: 'Hub MI cannot see HVS Operations Hub lists. Do not copy this row into HVCG_Clients.',
    provenance: 'CONFIRMED',
    nextAction: 'Keep as reference-only. Do not treat Closed as an Atlas operating obligation.',
  }),
  hvsRow({
    source: 'hvs_admin / HVS Operations Hub lists',
    site: 'HVS Operations Hub',
    list: 'Clients',
    client: 'HVS Operations Hub Clients list',
    clientCode: '',
    dataType: 'HVS_EMPTY_LIST',
    accessible: true,
    indexed: true,
    validated: true,
    exceptions: 'List is empty. Honest empty — not a Hub MI visibility failure.',
    blocker: '',
    provenance: 'CONFIRMED',
    nextAction: 'Do not invent Clients list rows.',
  }),
  hvsRow({
    source: 'hvs_admin / HVS Operations Hub lists',
    site: 'HVS Operations Hub',
    list: 'Opportunities',
    client: 'HVS Operations Hub Opportunities list',
    clientCode: '',
    dataType: 'HVS_EMPTY_LIST',
    accessible: true,
    indexed: true,
    validated: true,
    exceptions: 'List is empty. Honest empty — not a Hub MI visibility failure.',
    blocker: '',
    provenance: 'CONFIRMED',
    nextAction: 'Do not invent Opportunities list rows.',
  }),
  hvsRow({
    source: 'hvs_admin / HVS Operations Hub lists',
    site: 'HVS Operations Hub',
    list: 'Contracts',
    client: 'HVS Operations Hub Contracts list',
    clientCode: '',
    dataType: 'HVS_EMPTY_LIST',
    accessible: true,
    indexed: true,
    validated: true,
    exceptions: 'List is empty. Honest empty — not a Hub MI visibility failure.',
    blocker: '',
    provenance: 'CONFIRMED',
    nextAction: 'Do not invent Contracts list rows.',
  }),
  hvsRow({
    source: 'hvs_admin / HVS Operations Hub lists',
    site: 'HVS Operations Hub',
    list: 'Proposals',
    client: 'HVS Operations Hub Proposals list',
    clientCode: '',
    dataType: 'HVS_EMPTY_LIST',
    accessible: true,
    indexed: true,
    validated: true,
    exceptions: 'List is empty. Honest empty — not a Hub MI visibility failure.',
    blocker: '',
    provenance: 'CONFIRMED',
    nextAction: 'Do not invent Proposals list rows.',
  }),
  hvsRow({
    source: 'hvs_admin / HVS Operations Hub lists',
    site: 'HVS Operations Hub',
    list: 'Capital Deals',
    client: 'HVS Operations Hub Capital Deals list',
    clientCode: '',
    dataType: 'HVS_EMPTY_LIST',
    accessible: true,
    indexed: true,
    validated: true,
    exceptions: 'List is empty. Honest empty — not a Hub MI visibility failure.',
    blocker: '',
    provenance: 'CONFIRMED',
    nextAction: 'Do not invent Capital Deals list rows.',
  }),
  hvsRow({
    source: 'hvs_admin / HVS Engagements lists',
    site: 'HVS Engagements',
    list: 'Client Engagements',
    client: 'HVS Engagements Client Engagements list',
    clientCode: '',
    dataType: 'HVS_EMPTY_LIST',
    accessible: true,
    indexed: true,
    validated: true,
    exceptions: 'List is empty. Honest empty — not a Hub MI visibility failure.',
    blocker: '',
    provenance: 'CONFIRMED',
    nextAction: 'Do not invent Client Engagements list rows.',
  }),
  hvsRow({
    source: 'hvs_admin / HVS Operations Hub lists',
    site: 'HVS Operations Hub',
    list: 'Lead Intake',
    client: 'High V Test',
    clientCode: '',
    dataType: 'HVS_LEAD_INTAKE',
    accessible: true,
    indexed: true,
    validated: false,
    exceptions: 'Synthetic-looking Lead Intake row. Do not treat as a real client.',
    blocker: 'STALE_OR_UNCERTAIN / synthetic-looking. Not a customer operating record.',
    provenance: 'STALE_OR_UNCERTAIN',
    nextAction: 'Leave unlabeled as a real client. Do not operationalize.',
  }),
  hvsRow({
    source: 'hvs_admin / HVS Operations Hub lists',
    site: 'HVS Operations Hub',
    list: 'Lead Intake',
    client: 'Testing',
    clientCode: '',
    dataType: 'HVS_LEAD_INTAKE',
    accessible: true,
    indexed: true,
    validated: false,
    exceptions: 'Synthetic-looking Lead Intake row. Do not treat as a real client.',
    blocker: 'STALE_OR_UNCERTAIN / synthetic-looking. Not a customer operating record.',
    provenance: 'STALE_OR_UNCERTAIN',
    nextAction: 'Leave unlabeled as a real client. Do not operationalize.',
  }),
  hvsRow({
    source: 'hvs_admin / HVS Operations Hub lists',
    site: 'HVS Operations Hub',
    list: 'Lead Intake',
    client: 'Helping Hands',
    clientCode: '',
    dataType: 'HVS_LEAD_INTAKE',
    accessible: true,
    indexed: true,
    validated: false,
    exceptions: 'Synthetic-looking Lead Intake row. Do not treat as a real client.',
    blocker: 'STALE_OR_UNCERTAIN / synthetic-looking. Not a customer operating record.',
    provenance: 'STALE_OR_UNCERTAIN',
    nextAction: 'Leave unlabeled as a real client. Do not operationalize.',
  }),
  hvsRow({
    source: 'hvs_admin / HIGH VALUE SOLUTION Documents',
    site: 'HIGH VALUE SOLUTION',
    path: 'HIGH VALUE SOLUTION / Documents / Prodigy Games, LLC_Transaction Detail by Account *.xlsx',
    client: 'Prodigy Games',
    clientCode: 'PDG01',
    dataType: 'HVS_TRANSACTION_WORKBOOK',
    accessible: true,
    indexed: true,
    validated: true,
    exceptions: 'Workbook filenames CONFIRMED at Documents root. Balances are not extracted and must not be invented.',
    blocker: 'Reference + provenance only. Do not dump workbooks into Atlas.',
    provenance: 'CONFIRMED',
    nextAction: 'Leave binaries in SharePoint. Do not invent account balances from the filenames.',
  }),
  hvsRow({
    source: 'hvs_admin / HIGH VALUE SOLUTION search',
    site: 'HIGH VALUE SOLUTION',
    path: 'HIGH VALUE SOLUTION Documents (no 00_Client Files folder)',
    client: "That's Kava LLC",
    clientCode: 'KAVA01',
    dataType: 'HVS_MATERIALS_NOT_ON_CLIENT_ROSTER',
    accessible: true,
    indexed: true,
    validated: false,
    exceptions:
      'HVS-admin search found That\'s Kava materials. No folder under 00_Client Files and no Master Client List row. Not Hub-operationalized.',
    blocker: 'Client-roster status remains STALE_OR_UNCERTAIN. Do not invent a Hub client row.',
    provenance: 'STALE_OR_UNCERTAIN',
    nextAction: 'Do not operationalize until a CONFIRMED 00_Client Files folder or entitled Hub MI row exists.',
  }),
  hvsRow({
    source: 'hvs_admin / HIGH VALUE SOLUTION search',
    site: 'HIGH VALUE SOLUTION',
    client: 'Hart Family Dental',
    clientCode: 'HFD01',
    dataType: 'HVS_ABSENT_FROM_ROSTER',
    accessible: false,
    indexed: false,
    validated: false,
    exceptions: 'No HVS 00_Client Files folder, no Master Client List row, and no hart-named files this cycle.',
    blocker: 'STALE_OR_UNCERTAIN. Do not operationalize from the Hub entitlement catalog alone.',
    provenance: 'STALE_OR_UNCERTAIN',
    nextAction: 'Leave as catalog-only until authoritative HVS/HVCG evidence appears.',
  }),
  hvsRow({
    source: 'hvs_admin / related-person evidence',
    site: 'HIGH VALUE SOLUTION',
    path: "HIGH VALUE SOLUTION / Documents / 4_Engagements / 00_Client Files / Christie's Place",
    client: 'Christie Falk',
    clientCode: '',
    dataType: 'RELATED_PERSON',
    accessible: true,
    indexed: true,
    validated: false,
    exceptions: "Related person to Christie's Place. Not a second client. Hardship/legal filenames exist; no standalone client folder.",
    blocker: 'STALE_OR_UNCERTAIN as a client. Keep distinct from CPL01.',
    provenance: 'STALE_OR_UNCERTAIN',
    nextAction: "Do not mint a client code. Associate only to Christie's Place when a Hub row exists.",
  }),
  hvsRow({
    source: 'hvs_admin / related-person evidence',
    site: 'HIGH VALUE SOLUTION',
    path: "HIGH VALUE SOLUTION / Documents / 4_Engagements / 00_Client Files / Christie's Place",
    client: 'Irwin Falk',
    clientCode: '',
    dataType: 'RELATED_PERSON',
    accessible: true,
    indexed: true,
    validated: false,
    exceptions: "Related person documents exist near Christie's Place / Falk hardship materials. Not a client folder.",
    blocker: 'STALE_OR_UNCERTAIN as a client. Keep distinct from CPL01.',
    provenance: 'STALE_OR_UNCERTAIN',
    nextAction: "Do not mint a client code. Associate only to Christie's Place when a Hub row exists.",
  }),
  hvsRow({
    source: 'hvs_admin / HIGH VALUE SOLUTION Documents',
    site: 'HIGH VALUE SOLUTION',
    path: `${HVS_CLIENT_FILES} / 0_Client_Folder (Template)`,
    client: '0_Client_Folder (Template)',
    clientCode: '',
    dataType: 'HVS_TEMPLATE_FOLDER',
    accessible: true,
    indexed: true,
    validated: true,
    exceptions: 'Template/upload folder. Not a client.',
    blocker: '',
    provenance: 'CONFIRMED',
    nextAction: 'Do not classify as a client.',
  }),
  hvsRow({
    source: 'hvs_admin / HIGH VALUE SOLUTION Documents',
    site: 'HIGH VALUE SOLUTION',
    path: `${HVS_CLIENT_FILES} / 00_HVS Connect_Client Secure Document Upload`,
    client: '00_HVS Connect_Client Secure Document Upload',
    clientCode: '',
    dataType: 'HVS_TEMPLATE_FOLDER',
    accessible: true,
    indexed: true,
    validated: true,
    exceptions: 'Template/upload folder. Not a client.',
    blocker: '',
    provenance: 'CONFIRMED',
    nextAction: 'Do not classify as a client.',
  }),
];

export type HvsAccessPicture = {
  status: HvsAccessStatus;
  hvsAdminIdentity: typeof HVS_ADMIN_DISPLAY_NAME;
  hubManagedIdentity: 'BLOCKED';
  graphSitesSearch: false;
  binariesInAtlas: false;
  confirmedClientFolderCount: number;
  referenceOnly: true;
  reason: string;
};

export function hvsConfirmedClientFolders(): HvsInventoryRow[] {
  return HVS_ADMIN_INVENTORY.filter((row) => row.dataType === 'HVS_CLIENT_FOLDER' && row.provenance === 'CONFIRMED');
}

export function resolveHvsDataAccess(override?: HvsAccessStatus): HvsAccessStatus {
  if (override) return override;
  return hvsConfirmedClientFolders().length > 0 ? 'PARTIAL' : 'BLOCKED';
}

export function hvsAccessMissingData(status: HvsAccessStatus): string {
  if (status === 'AVAILABLE') return 'HVS_DATA_ACCESS=AVAILABLE.';
  if (status === 'PARTIAL') {
    return 'HVS_DATA_ACCESS=PARTIAL for HVS-admin-discovered sources. Hub MI HVCG_Clients stay fail-closed; Atlas does not invent unseen SharePoint rows.';
  }
  return 'Historical HVS repositories are not accessible to this principal (HVS_DATA_ACCESS=BLOCKED).';
}

export function buildHvsAccessPicture(status: HvsAccessStatus): HvsAccessPicture {
  return {
    status,
    hvsAdminIdentity: HVS_ADMIN_DISPLAY_NAME,
    hubManagedIdentity: 'BLOCKED',
    graphSitesSearch: false,
    binariesInAtlas: false,
    confirmedClientFolderCount: hvsConfirmedClientFolders().length,
    referenceOnly: true,
    reason: hvsAccessMissingData(status),
  };
}

export function hvsInventoryLedgerRows(): RecoveryLedgerRow[] {
  return HVS_ADMIN_INVENTORY.map((row) => ({
    source: row.source,
    client: row.client,
    clientCode: row.clientCode,
    dataType: row.dataType,
    discovered: row.discovered,
    accessible: row.accessible,
    indexed: row.indexed,
    classified: row.classified,
    operationalized: false,
    validated: row.validated,
    exceptions: row.exceptions,
    blocker: row.blocker,
    provenance: row.provenance,
  }));
}

export function hvsInventoryCoversBoundary(input: {
  clientCode?: string;
  legalName: string;
}): boolean {
  const code = (input.clientCode || '').trim();
  const name = input.legalName.trim().toLowerCase();
  return HVS_ADMIN_INVENTORY.some((row) => {
    if (code && row.clientCode === code) return true;
    return row.client.trim().toLowerCase() === name;
  });
}

