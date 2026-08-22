/**
 * Per-client recovered operating records.
 *
 * Stitches CONFIRMED HVS folders + indexed filenames + recovered projects
 * + proposed actions into one record Manny can act from.
 * Not Hub MI HVCG_Clients. No invented balances, completion, or obligations.
 */

import { hvsActionableClientKnowledge } from './hvsActionableClientKnowledge.ts';
import type {
  ActionableDecision,
  ActionableMissingDocument,
  ActionableResponsibility,
  ActionableWaitingItem,
} from './hvsActionableClientKnowledge.ts';
import {
  hvsRecoveredActions,
  hvsRecoveredDocumentsFor,
  type HvsDocumentClass,
} from './hvsRecoveredDocuments.ts';
import { hvsRecoveredProjects } from './hvsRecoveredProjects.ts';
import { hvsConfirmedClientFolders } from './hvsRecoveryInventory.ts';

export type HvsRecoveredClientRecord = {
  client: string;
  clientCode: string;
  provenance: 'CONFIRMED';
  hubMiOperationalized: false;
  knowledgeOperationalized: boolean;
  documentCount: number;
  fileCount: number;
  documentClasses: HvsDocumentClass[];
  projectTitles: string[];
  capitalPacketNames: string[];
  invoiceFilenames: string[];
  nextActions: string[];
  decisionsRequired: string[];
  waitingItems: ActionableWaitingItem[];
  missingDocuments: ActionableMissingDocument[];
  hvcgResponsibilities: ActionableResponsibility[];
  clientResponsibilities: ActionableResponsibility[];
  decisions: ActionableDecision[];
  nextAction: string;
};

export type HvsRecoveredCapitalPacket = {
  client: string;
  clientCode: string;
  name: string;
  provenance: 'CONFIRMED';
  queue: 'Needs Action';
  amountsExtracted: false;
  nextAction: string;
};

function basename(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

export function hvsRecoveredClientRecords(): HvsRecoveredClientRecord[] {
  const actionableByClient = new Map(
    hvsActionableClientKnowledge().map((row) => [row.client, row]),
  );
  return hvsConfirmedClientFolders().map((folder) => {
    const docs = hvsRecoveredDocumentsFor(folder.client);
    const files = docs.filter((row) => row.kind === 'file');
    const projects = hvsRecoveredProjects().filter((row) => row.client === folder.client);
    const actions = hvsRecoveredActions().filter((row) => row.client === folder.client);
    const capitalPacketNames = files
      .filter((row) => row.documentClass === 'capital_package')
      .map((row) => basename(row.name));
    const invoiceFilenames = files
      .filter((row) => row.documentClass === 'invoice')
      .map((row) => basename(row.name));
    const nextActions = actions.filter((row) => row.queue === 'Needs Action').map((row) => row.title);
    const decisionsRequired = actions
      .filter((row) => row.queue === 'Decision Required')
      .map((row) => row.title);
    const knowledgeOperationalized =
      files.length > 0 &&
      (projects.length > 0 || actions.length > 0 || capitalPacketNames.length > 0);
    const nextAction = knowledgeOperationalized
      ? nextActions[0] ||
        decisionsRequired[0] ||
        projects[0]?.nextAction ||
        'Review recovered filenames as reference-only knowledge. Do not invent Hub MI rows or amounts.'
      : folder.nextAction;
    const actionable = actionableByClient.get(folder.client) || {
      waitingItems: [],
      missingDocuments: [],
      hvcgResponsibilities: [],
      clientResponsibilities: [],
      decisions: [],
    };
    return {
      client: folder.client,
      clientCode: folder.clientCode,
      provenance: 'CONFIRMED' as const,
      hubMiOperationalized: false as const,
      knowledgeOperationalized,
      documentCount: docs.length,
      fileCount: files.length,
      documentClasses: [...new Set(docs.map((row) => row.documentClass))],
      projectTitles: projects.map((row) => row.title),
      capitalPacketNames,
      invoiceFilenames,
      nextActions,
      decisionsRequired,
      waitingItems: actionable.waitingItems,
      missingDocuments: actionable.missingDocuments,
      hvcgResponsibilities: actionable.hvcgResponsibilities,
      clientResponsibilities: actionable.clientResponsibilities,
      decisions: actionable.decisions,
      nextAction,
    };
  });
}

export function hvsRecoveredCapitalPackets(): HvsRecoveredCapitalPacket[] {
  const seen = new Set<string>();
  const out: HvsRecoveredCapitalPacket[] = [];
  for (const folder of hvsConfirmedClientFolders()) {
    for (const row of hvsRecoveredDocumentsFor(folder.client)) {
      if (row.kind !== 'file' || row.documentClass !== 'capital_package') continue;
      const name = basename(row.name);
      const key = `${folder.client}\0${name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        client: folder.client,
        clientCode: folder.clientCode,
        name,
        provenance: 'CONFIRMED',
        queue: 'Needs Action',
        amountsExtracted: false,
        nextAction:
          'Review recovered capital-packet filename only. Do not invent lender criteria, amounts, or funding status.',
      });
    }
  }
  return out;
}

export function recoveredClientsKnowledgeOperationalized(): string[] {
  return hvsRecoveredClientRecords()
    .filter((row) => row.knowledgeOperationalized)
    .map((row) => row.clientCode || row.client)
    .sort();
}
