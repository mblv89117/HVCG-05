/**
 * Actionable recovered-client knowledge for the Atlas operator desk.
 *
 * Derived only from CONFIRMED HVS folder/filename inventory already in-repo.
 * Classifications stay honest: CONFIRMED / LIKELY / PROPOSED.
 * Atlas does not invent Hub MI rows, amounts, LTV, completion, or
 * checklist line items whose contents were not extracted.
 */

import type { KnowledgeProvenance } from './knowledgeClassification.ts';
import {
  hvsRecoveredActions,
  hvsRecoveredDocumentsFor,
  type HvsDocumentClass,
} from './hvsRecoveredDocuments.ts';
import { hvsRecoveredProjects } from './hvsRecoveredProjects.ts';
import { hvsConfirmedClientFolders } from './hvsRecoveryInventory.ts';

export type ActionableClassification = Extract<
  KnowledgeProvenance,
  'CONFIRMED' | 'LIKELY' | 'PROPOSED'
>;

export type ResponsibilityParty = 'HVCG' | 'CLIENT';

export type ActionableResponsibility = {
  party: ResponsibilityParty;
  title: string;
  classification: ActionableClassification;
  evidence: string;
};

export type ActionableMissingDocument = {
  title: string;
  classification: ActionableClassification;
  evidence: string;
};

export type ActionableWaitingItem = {
  id: string;
  client: string;
  clientCode: string;
  title: string;
  party: ResponsibilityParty;
  classification: ActionableClassification;
  evidence: string;
};

export type ActionableDecision = {
  id: string;
  client: string;
  clientCode: string;
  title: string;
  classification: ActionableClassification;
  evidence: string;
};

export type ActionableOverdueItem = {
  id: string;
  client: string;
  clientCode: string;
  title: string;
  party: ResponsibilityParty;
  classification: ActionableClassification;
  evidence: string;
  filename: string;
};

export type ActionableCapitalItem = {
  id: string;
  client: string;
  clientCode: string;
  title: string;
  party: ResponsibilityParty;
  classification: Extract<ActionableClassification, 'CONFIRMED'>;
  evidence: string;
  filename: string;
};

export type ActionableClientKnowledge = {
  client: string;
  clientCode: string;
  provenance: 'CONFIRMED';
  hubMiOperationalized: false;
  waitingItems: ActionableWaitingItem[];
  overdueItems: ActionableOverdueItem[];
  missingDocuments: ActionableMissingDocument[];
  hvcgResponsibilities: ActionableResponsibility[];
  clientResponsibilities: ActionableResponsibility[];
  decisions: ActionableDecision[];
};

const OPERATING_FOLDER = /^(00|0[1-7])_/;
const SKIP_FOLDER = /archive|99_internal|06_personal/i;
const CHECKLIST_FILE = /checklist|next steps instructions/i;
const PAST_DUE = /past due/i;

function basename(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

function fileStem(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.(docx|pdf|xlsx|doc)$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'uncoded';
}

function isOperatingFolder(name: string): boolean {
  const folder = name.split('/')[0] || name;
  return OPERATING_FOLDER.test(folder) && !SKIP_FOLDER.test(folder);
}

function filesUnder(files: Array<{ name: string }>, folder: string): number {
  const prefix = `${folder}/`;
  return files.filter((row) => row.name === folder || row.name.startsWith(prefix)).length;
}

function classNames(files: Array<{ documentClass: HvsDocumentClass }>, klass: HvsDocumentClass): string[] {
  return files.filter((row) => row.documentClass === klass).map((row) => basename(row.name));
}

function unique<T>(rows: T[], key: (row: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    const id = key(row);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(row);
  }
  return out;
}

export function hvsActionableClientKnowledge(): ActionableClientKnowledge[] {
  return hvsConfirmedClientFolders().map((folder) => {
    const docs = hvsRecoveredDocumentsFor(folder.client);
    const files = docs.filter((row) => row.kind === 'file');
    const folders = docs.filter((row) => row.kind === 'folder');
    const projects = hvsRecoveredProjects().filter((row) => row.client === folder.client);
    const actions = hvsRecoveredActions().filter((row) => row.client === folder.client);
    const checklistFiles = files.filter((row) => CHECKLIST_FILE.test(basename(row.name)));
    const invoiceFiles = classNames(files, 'invoice');
    const engagementFiles = [...classNames(files, 'engagement'), ...classNames(files, 'agreement')];
    const capitalFiles = classNames(files, 'capital_package');
    const onboardingFiles = classNames(files, 'onboarding');
    const pastDueFiles = files.filter((row) => PAST_DUE.test(basename(row.name))).map((row) => basename(row.name));
    const templateOnly =
      folders.some((row) => /new client template/i.test(row.name)) && files.length === 0;

    const missingDocuments: ActionableMissingDocument[] = [];
    for (const row of folders) {
      if (!isOperatingFolder(row.name)) continue;
      if (filesUnder(files, row.name) > 0) continue;
      missingDocuments.push({
        title: `No inventoried files under ${row.name}`,
        classification: 'LIKELY',
        evidence: `CONFIRMED folder ${row.name} exists. Second-level filenames were not inventoried in this folder. Do not invent specific missing documents.`,
      });
    }
    if (templateOnly) {
      missingDocuments.push({
        title: 'No inventoried operating files beyond New Client Template',
        classification: 'LIKELY',
        evidence: 'CONFIRMED child is New Client Template only. Do not invent intake documents or a Hub MI row.',
      });
    }
    for (const row of checklistFiles) {
      missingDocuments.push({
        title: `${basename(row.name)} line items are not extracted`,
        classification: 'PROPOSED',
        evidence: `CONFIRMED filename ${basename(row.name)}. Checklist contents were not read. Do not invent missing line items.`,
      });
    }

    const hvcgResponsibilities: ActionableResponsibility[] = [];
    if (engagementFiles.length) {
      hvcgResponsibilities.push({
        party: 'HVCG',
        title: 'Retain and review recovered engagement/agreement filenames',
        classification: 'CONFIRMED',
        evidence: `CONFIRMED filenames: ${engagementFiles.slice(0, 4).join('; ')}`,
      });
    }
    if (capitalFiles.length) {
      hvcgResponsibilities.push({
        party: 'HVCG',
        title: 'Review recovered capital-packet filenames',
        classification: 'CONFIRMED',
        evidence: `CONFIRMED filenames: ${capitalFiles.slice(0, 4).join('; ')}. Amounts are not extracted.`,
      });
    }
    if (invoiceFiles.length) {
      hvcgResponsibilities.push({
        party: 'HVCG',
        title: 'Review recovered invoice filenames',
        classification: 'CONFIRMED',
        evidence: `CONFIRMED filenames: ${invoiceFiles.slice(0, 4).join('; ')}. Amounts are not extracted.`,
      });
    }
    if (folders.some((row) => /99_internal/i.test(row.name))) {
      hvcgResponsibilities.push({
        party: 'HVCG',
        title: 'Keep 99_Internal as HVCG-only',
        classification: 'CONFIRMED',
        evidence: 'CONFIRMED folder 99_Internal (HVS only). Not a client-visible operating item.',
      });
    }
    if (projects.length) {
      hvcgResponsibilities.push({
        party: 'HVCG',
        title: 'Confirm whether recovered project filenames are still live work',
        classification: 'LIKELY',
        evidence: projects.map((row) => row.title).join('; '),
      });
    }
    const clientResponsibilities: ActionableResponsibility[] = [];
    for (const row of checklistFiles) {
      clientResponsibilities.push({
        party: 'CLIENT',
        title: `Complete items named on ${basename(row.name)}`,
        classification: 'PROPOSED',
        evidence: `CONFIRMED filename ${basename(row.name)}. Contents not extracted — do not invent the item list.`,
      });
    }
    for (const name of onboardingFiles) {
      clientResponsibilities.push({
        party: 'CLIENT',
        title: `Complete recovered onboarding items in ${name}`,
        classification: 'PROPOSED',
        evidence: `CONFIRMED filename ${name}. Contents not extracted.`,
      });
    }
    for (const name of pastDueFiles) {
      clientResponsibilities.push({
        party: 'CLIENT',
        title: `Respond to recovered invoice filename ${name}`,
        classification: 'PROPOSED',
        evidence: `CONFIRMED filename ${name}. Amounts and payment status are not extracted.`,
      });
    }

    const clientKey = slug(folder.clientCode || folder.client);
    const overdueItems: ActionableOverdueItem[] = pastDueFiles.map((name) => ({
      id: `hvs-overdue:${clientKey}:${slug(name)}`,
      client: folder.client,
      clientCode: folder.clientCode,
      title: `${folder.client} — recovered past-due invoice filename ${name} (payment status and amounts not extracted)`,
      party: 'CLIENT' as const,
      classification: 'LIKELY' as const,
      evidence: `CONFIRMED filename ${name}. The words Past Due appear in the filename. Payment status and amounts were not extracted. Do not invent a balance.`,
      filename: name,
    }));

    const waitingItems: ActionableWaitingItem[] = [];
    if (checklistFiles.length) {
      waitingItems.push({
        id: `hvs-wait:${clientKey}:client-checklist`,
        client: folder.client,
        clientCode: folder.clientCode,
        title: `${folder.client} — waiting on client checklist/next-steps items (contents not extracted)`,
        party: 'CLIENT',
        classification: 'PROPOSED',
        evidence: checklistFiles.map((row) => basename(row.name)).join('; '),
      });
    }
    if (templateOnly || (files.length === 0 && folders.length > 0)) {
      waitingItems.push({
        id: `hvs-wait:${clientKey}:operating-files`,
        client: folder.client,
        clientCode: folder.clientCode,
        title: `${folder.client} — waiting on inventoried operating files`,
        party: 'HVCG',
        classification: 'LIKELY',
        evidence: templateOnly
          ? 'CONFIRMED New Client Template only. No inventoried operating files.'
          : 'CONFIRMED folders exist. No inventoried first/second-level files.',
      });
    }
    if (!folder.clientCode) {
      waitingItems.push({
        id: `hvs-wait:${clientKey}:hub-code`,
        client: folder.client,
        clientCode: folder.clientCode,
        title: `${folder.client} — waiting on an entitled Hub client code (do not invent one)`,
        party: 'HVCG',
        classification: 'PROPOSED',
        evidence: 'CONFIRMED HVS folder has no Hub client code. realClientsOperationalized stays empty until an entitled Hub MI row exists.',
      });
    }
    if (actions.some((row) => row.queue === 'Needs Action') && waitingItems.length < 2) {
      waitingItems.push({
        id: `hvs-wait:${clientKey}:hvcg-review`,
        client: folder.client,
        clientCode: folder.clientCode,
        title: `${folder.client} — waiting on HVCG review of recovered filenames`,
        party: 'HVCG',
        classification: 'PROPOSED',
        evidence: actions
          .filter((row) => row.queue === 'Needs Action')
          .map((row) => row.title)
          .slice(0, 2)
          .join('; '),
      });
    }

    const decisions: ActionableDecision[] = actions
      .filter((row) => row.queue === 'Decision Required')
      .map((row) => ({
        id: row.id,
        client: folder.client,
        clientCode: folder.clientCode,
        title: row.title,
        classification: row.provenance === 'CONFIRMED' || row.provenance === 'LIKELY' || row.provenance === 'PROPOSED'
          ? row.provenance
          : 'PROPOSED',
        evidence: row.evidence,
      }));
    if (!folder.clientCode) {
      decisions.push({
        id: `hvs-decide:${clientKey}:hub-code`,
        client: folder.client,
        clientCode: folder.clientCode,
        title: `Decide whether ${folder.client} should receive an entitled Hub client code (do not mint a row here)`,
        classification: 'PROPOSED',
        evidence: 'CONFIRMED HVS folder. No Hub MI HVCG_Clients row. Do not invent a client code.',
      });
    }
    if (projects.length > 1 && !decisions.some((row) => /live/i.test(row.title))) {
      decisions.push({
        id: `hvs-decide:${clientKey}:live-projects`,
        client: folder.client,
        clientCode: folder.clientCode,
        title: `Decide which recovered ${folder.client} project filenames are still live work`,
        classification: 'PROPOSED',
        evidence: projects.map((row) => `${row.title} (${row.provenance})`).join('; '),
      });
    }

    return {
      client: folder.client,
      clientCode: folder.clientCode,
      provenance: 'CONFIRMED' as const,
      hubMiOperationalized: false as const,
      waitingItems: unique(waitingItems, (row) => row.id).slice(0, 3),
      overdueItems: unique(overdueItems, (row) => row.id).slice(0, 4),
      missingDocuments: unique(missingDocuments, (row) => row.title).slice(0, 6),
      hvcgResponsibilities: unique(hvcgResponsibilities, (row) => row.title).slice(0, 6),
      clientResponsibilities: unique(clientResponsibilities, (row) => row.title).slice(0, 6),
      decisions: unique(decisions, (row) => row.id).slice(0, 4),
    };
  });
}

export function hvsActionableWaitingItems(): ActionableWaitingItem[] {
  return hvsActionableClientKnowledge().flatMap((row) => row.waitingItems);
}

export function hvsActionableOverdueItems(): ActionableOverdueItem[] {
  return hvsActionableClientKnowledge().flatMap((row) => row.overdueItems);
}

export function hvsActionableDecisions(): ActionableDecision[] {
  const fromRecords = hvsActionableClientKnowledge().flatMap((row) => row.decisions);
  const existing = new Set(hvsRecoveredActions().map((row) => row.id));
  return fromRecords.filter((row) => !existing.has(row.id));
}

export function hvsActionableCapitalItems(): ActionableCapitalItem[] {
  const seen = new Set<string>();
  const out: ActionableCapitalItem[] = [];
  for (const folder of hvsConfirmedClientFolders()) {
    const files = hvsRecoveredDocumentsFor(folder.client).filter(
      (row) => row.kind === 'file' && row.documentClass === 'capital_package',
    );
    const clientKey = slug(folder.clientCode || folder.client);
    for (const row of files) {
      const name = basename(row.name);
      const key = `${folder.client}\0${fileStem(name)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        id: `hvs-capital:${clientKey}:${slug(fileStem(name))}`,
        client: folder.client,
        clientCode: folder.clientCode,
        title: `${folder.client} — recovered capital-packet filename ${name} (amounts and funding status not extracted)`,
        party: 'HVCG',
        classification: 'CONFIRMED',
        evidence: `CONFIRMED filename ${name}. Classified as capital_package from the recovered name. Amounts, lender criteria, and funding status were not extracted.`,
        filename: name,
      });
    }
  }
  return out;
}
