/**
 * Link-first HVS OneDrive → Atlas (NO copy/move/delete of HVS originals).
 *
 * Reads inventory CSV (preferred) or JSON summary paths, upserts Document
 * source records with full provenance, seeds canonical Client 360 records,
 * and writes an updated migration manifest + review queue.
 *
 * Matching uses path-segment / word-boundary rules so "lien" does not match "clients".
 */
import { createReadStream, existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { loadSecretsFile } from '../src/loadSecrets.ts';
import { loadConfig } from '../src/config.ts';
import { IntegrationRepository } from '../src/store/repository.ts';
import { runClient360Ingestion } from '../src/client360/ingest.ts';
import type { CanonicalRecord } from '@hvcg/atlas-integration-core';
import type { Client360Candidate } from '../src/store/types.ts';

const OUT = join(process.cwd(), 'deployment/reports/hvs-onedrive-inventory');

/** Explicit path prefixes → client (highest confidence). */
const PATH_CLIENT_RULES: Array<{ re: RegExp; client: string; code: string }> = [
  { re: /\/(?:High Value Solution(?: LLC)?)\/ACCG(?:\/|$)/i, client: 'ACCG Inc.', code: 'ACCG01' },
  { re: /\/ACCG(?:\/|$)/i, client: 'ACCG Inc.', code: 'ACCG01' },
  { re: /\/Prodigy(?:\s+Games)?(?:\/|$)/i, client: 'Prodigy Games LLC', code: 'PDG01' },
  { re: /\/That'?s?\s*Kava|\/Kava(?:\/|$)/i, client: "That's Kava LLC", code: 'KAVA01' },
  { re: /\/Christie'?s?\s*Place|\/CLIENTS\/Mortgage\/Christie(?:\/|$)/i, client: "Christie's Place LLC", code: 'CPL01' },
  { re: /\/(?:Irwin\s+)?Falk(?:\/|$)/i, client: 'Irwin Falk', code: 'FALK01' },
  { re: /\/Hart(?:\s+Family)?(?:\s+Dental)?(?:\/|$)/i, client: 'Hart Family Dental', code: 'HFD01' },
  { re: /\/Colorado(?:\s+Craft)?(?:\s+Beef)?|\/CCB(?:\/|$)|\/ColoradoCraftBeef/i, client: 'Colorado Craft Beef', code: 'CCB01' },
  { re: /\/Lien(?:\s+Partners)?(?:\/|$)|\/LienPartners/i, client: 'Lien Partners', code: 'LIEN01' },
];

const CANONICAL_CLIENTS: Array<{
  name: string;
  code: string;
  aliases: string[];
  domains?: string[];
}> = [
  { name: 'ACCG Inc.', code: 'ACCG01', aliases: ['accg', 'accg-inc', 'accg inc'], domains: ['accg-inc.com'] },
  { name: 'Prodigy Games LLC', code: 'PDG01', aliases: ['prodigy games', 'prodigygames'], domains: ['prodigygames.com'] },
  { name: "That's Kava LLC", code: 'KAVA01', aliases: ["that's kava", 'thats kava', 'that’s kava'] },
  { name: "Christie's Place LLC", code: 'CPL01', aliases: ["christie's place", 'christies place'] },
  { name: 'Christie Falk', code: 'CFALK01', aliases: ['christie falk'] },
  { name: 'Irwin Falk', code: 'FALK01', aliases: ['irwin falk'] },
  { name: 'Hart Family Dental', code: 'HFD01', aliases: ['hart family dental', 'hart dental'] },
  { name: 'Colorado Craft Beef', code: 'CCB01', aliases: ['colorado craft beef', 'colorado beef', 'coloradocraftbeef'], domains: ['coloradocraftbeef.com'] },
  { name: 'Lien Partners', code: 'LIEN01', aliases: ['lien partners', 'lienpartners'] },
];

const NOISE_PATH = /node_modules\/|\.git\/|\/\.cursor\/|__pycache__\/|\/dist\/|\/build\//;

function wordBoundaryIncludes(hay: string, needle: string): boolean {
  if (!needle || needle.length < 3) return false;
  const esc = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^a-z0-9])${esc}(?:[^a-z0-9]|$)`, 'i').test(hay);
}

function matchClient(name: string, fullPath: string): {
  client: string | null;
  code: string | null;
  confidence: 'high' | 'review' | 'none';
} {
  const path = fullPath || '';
  for (const rule of PATH_CLIENT_RULES) {
    if (rule.re.test(path)) return { client: rule.client, code: rule.code, confidence: 'high' };
  }
  const hay = `${name} ${path}`.toLowerCase();
  const hits: Array<{ name: string; code: string }> = [];
  for (const c of CANONICAL_CLIENTS) {
    for (const a of c.aliases) {
      if (a.length >= 5 && wordBoundaryIncludes(hay, a)) {
        hits.push({ name: c.name, code: c.code });
        break;
      }
    }
  }
  const uniq = [...new Map(hits.map((h) => [h.name, h])).values()];
  if (uniq.length === 1) return { client: uniq[0].name, code: uniq[0].code, confidence: 'high' };
  if (uniq.length > 1) return { client: uniq[0].name, code: uniq[0].code, confidence: 'review' };
  return { client: null, code: null, confidence: 'none' };
}

function classify(name: string, path: string): string {
  const t = `${name} ${path}`.toLowerCase();
  if (NOISE_PATH.test(t)) return 'Operational documents';
  if (/nda|non.?disclos/.test(t)) return 'NDAs';
  if (/proposal|pitch|sow/.test(t)) return 'Proposals';
  if (/engagement|msa|contract|agreement/.test(t)) return 'Contracts';
  if (/bank.?statement/.test(t)) return 'Bank statements';
  if (/tax|1120|1040|k-?1|w-?2|w-?9/.test(t)) return 'Tax returns';
  if (/payroll/.test(t)) return 'Payroll';
  if (/\bsba\b|loan.?application|lender/.test(t)) return 'SBA documents';
  if (/funding|capital.?raise|investor/.test(t)) return 'Funding documents';
  if (/insurance|claim/.test(t)) return 'Insurance';
  if (/formation|articles|operating.?agreement/.test(t)) return 'Formation documents';
  if (/invoice/.test(t)) return 'Accounts receivable';
  if (/meeting|minutes/.test(t)) return 'Meeting records';
  if (/draft/.test(t)) return 'Draft';
  if (/final/.test(t)) return 'Final';
  return 'Unknown or needs review';
}

function detectSensitivity(name: string, path: string): { restricted: boolean; reasons: string[] } {
  const t = `${name} ${path}`;
  const checks: Array<[string, RegExp]> = [
    ['ssn_hint', /\bssn\b|social.?security/i],
    ['ein_hint', /\bein\b|tax.?id|fein/i],
    ['bank_hint', /bank.?statement|routing|account.?number/i],
    ['tax_return', /form.?1040|form.?1120|tax.?return|w-?2|w-?9/i],
    ['medical', /hipaa|medical|\bphi\b/i],
    ['insurance', /insurance|claim|policy.?number|experian|equifax|transunion|credit.?sesame/i],
    ['credentials', /password|credential|secret|api.?key/i],
    ['legal_privileged', /attorney.?client|privileged/i],
  ];
  const reasons = checks.filter(([, re]) => re.test(t)).map(([l]) => l);
  return { restricted: reasons.length > 0, reasons };
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = false;
      } else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

type Row = {
  sourceTenant: string;
  sourceAccount: string;
  sourceConnectionId?: string;
  itemId: string;
  name: string;
  extension: string;
  isFolder: boolean;
  size: number;
  createdDateTime: string;
  modifiedDateTime: string;
  owner: string;
  fullPath: string;
  webUrl: string;
};

async function loadCsvRows(csvPath: string): Promise<Row[]> {
  const rl = createInterface({ input: createReadStream(csvPath), crlfDelay: Infinity });
  let headers: string[] | null = null;
  const rows: Row[] = [];
  for await (const line of rl) {
    if (!headers) {
      headers = parseCsvLine(line);
      continue;
    }
    const cols = parseCsvLine(line);
    const get = (k: string) => cols[headers!.indexOf(k)] || '';
    if (get('isFolder') === 'true') continue;
    if (NOISE_PATH.test(get('fullPath'))) continue;
    rows.push({
      sourceTenant: get('sourceTenant'),
      sourceAccount: get('sourceAccount'),
      itemId: get('itemId'),
      name: get('name'),
      extension: get('extension'),
      isFolder: false,
      size: Number(get('size') || 0),
      createdDateTime: get('createdDateTime'),
      modifiedDateTime: get('modifiedDateTime'),
      owner: get('owner'),
      fullPath: get('fullPath'),
      webUrl: get('webUrl'),
    });
  }
  return rows;
}

function emptyAssociations(): Client360Candidate['associations'] {
  return {
    emails: [],
    conversations: [],
    attachments: [],
    documents: [],
    meetings: [],
    notes: [],
    projects: [],
    invoices: [],
    proposals: [],
    fundingRequests: [],
    agreements: [],
    deliverables: [],
  };
}

function ensureCanonicalClients(repo: IntegrationRepository, connectionIds: string[]) {
  const existing = repo.listClient360();
  const byName = new Map(existing.map((c) => [c.displayName.toLowerCase(), c]));
  const now = new Date().toISOString();
  for (const c of CANONICAL_CLIENTS) {
    const key = c.name.toLowerCase();
    let cand = byName.get(key);
    if (!cand) {
      cand = {
        id: `client-${c.code.toLowerCase()}`,
        displayName: c.name,
        legalName: c.name,
        lifecycle: 'active',
        matchKeys: [c.name.toLowerCase(), c.code.toLowerCase(), ...(c.domains || [])],
        emails: [],
        domains: c.domains || [],
        phones: [],
        contacts: [],
        sourceRefs: [],
        associations: emptyAssociations(),
        timeline: [],
        completenessScore: 20,
        missingInformation: ['Review HVS linked documents'],
        recommendedNextActions: ['Open HVS source links for active work'],
        confidence: 'high',
        duplicateCandidateIds: [],
        connectionIds: [...connectionIds],
        businessEntities: ['HVS', 'HVCG'],
        updatedAt: now,
      };
      existing.push(cand);
      byName.set(key, cand);
    } else {
      cand.legalName = cand.legalName || c.name;
      cand.lifecycle = cand.lifecycle || 'active';
      cand.confidence = 'high';
      cand.domains = [...new Set([...(cand.domains || []), ...(c.domains || [])])];
      cand.connectionIds = [...new Set([...(cand.connectionIds || []), ...connectionIds])];
      cand.updatedAt = now;
    }
  }
  repo.saveClient360(existing);
  return existing;
}

async function main() {
  loadSecretsFile();
  const cfg = loadConfig();
  const repo = new IntegrationRepository(cfg.dataDir, cfg.tokenEncryptionKeyB64);

  const csvCandidates = [
    join(OUT, 'inventory-2026-07-21T053754039Z.csv'),
    join(OUT, 'inventory-latest.csv'),
  ];
  const csvPath = csvCandidates.find((p) => existsSync(p));
  if (!csvPath) throw new Error('No inventory CSV found — run inventoryHvsOneDrive.ts first');

  const hvsConns = repo
    .listConnections()
    .filter((c) => c.providerId === 'microsoft' && (c.tenantOrOrg || '').includes('highvaluesolution'));
  const connByAccount = new Map(hvsConns.map((c) => [c.accountName, c]));
  const defaultConn = hvsConns[0];

  console.log(JSON.stringify({ phase: 'load_csv', csvPath }));
  const files = await loadCsvRows(csvPath);
  console.log(JSON.stringify({ phase: 'loaded', files: files.length }));

  ensureCanonicalClients(
    repo,
    hvsConns.map((c) => c.id),
  );

  const clients = repo.listClient360();
  const clientByName = new Map(clients.map((c) => [c.displayName.toLowerCase(), c]));

  const priorityNames = new Set(CANONICAL_CLIENTS.map((c) => c.name.toLowerCase()));
  const records: CanonicalRecord[] = [];
  const manifest: Record<string, unknown>[] = [];
  const reviewQueue: Record<string, unknown>[] = [];
  const byClient: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  let linked = 0;
  let skippedUnmatched = 0;
  let restricted = 0;

  const now = new Date().toISOString();

  for (const f of files) {
    const match = matchClient(f.name, f.fullPath);
    const classification = classify(f.name, f.fullPath);
    const sensitivity = detectSensitivity(f.name, f.fullPath);
    if (sensitivity.restricted) restricted++;

    const isPriority = match.client && priorityNames.has(match.client.toLowerCase());
    const shouldLink = match.confidence === 'high' && isPriority;
    const needsReview = match.confidence === 'review' || (match.confidence === 'none' && false);

    if (needsReview || (match.confidence === 'review' && match.client)) {
      reviewQueue.push({
        itemId: f.itemId,
        name: f.name,
        fullPath: f.fullPath,
        webUrl: f.webUrl,
        proposedClient: match.client,
        confidence: match.confidence,
        classification,
        sensitivity,
      });
    }

    if (!shouldLink) {
      skippedUnmatched++;
      const entry = {
        atlasClientId: match.code ? `client-${match.code.toLowerCase()}` : null,
        atlasClientName: match.client,
        sourceTenant: f.sourceTenant || 'highvaluesolution.com',
        sourceAccount: f.sourceAccount,
        originalOneDriveItemId: f.itemId,
        originalSourcePath: f.fullPath,
        originalSourceUrl: f.webUrl,
        originalFileName: f.name,
        destinationLocation: null,
        fileHash: null,
        fileSize: f.size,
        createdDate: f.createdDateTime,
        modifiedDate: f.modifiedDateTime,
        importDate: now,
        classification,
        sensitivity: sensitivity.restricted ? 'restricted' : 'standard',
        sensitivityReasons: sensitivity.reasons,
        duplicateStatus: 'unknown',
        migrationStatus: match.client ? 'matched_not_linked' : 'unmatched',
        errorStatus: null,
        reviewStatus: match.confidence === 'review' ? 'needs_review' : 'pending',
        matchConfidence: match.confidence,
      };
      // Only keep priority-sized manifest rows for unmatched to limit size — sample
      if (match.client || Math.random() < 0.002) manifest.push(entry);
      continue;
    }

    const conn = connByAccount.get(f.sourceAccount) || defaultConn;
    const connectionId = conn?.id || 'hvs-unknown';
    const cand = clientByName.get(match.client!.toLowerCase());
    const atlasClientId = cand?.id || `client-${match.code!.toLowerCase()}`;

    const kind =
      classification === 'Proposals'
        ? 'Proposal'
        : classification === 'Contracts' || classification === 'NDAs'
          ? 'Agreement'
          : classification === 'Funding documents' || classification === 'SBA documents'
            ? 'FundingRequest'
            : 'Document';

    const record: CanonicalRecord = {
      kind: kind as CanonicalRecord['kind'],
      id: randomUUID(),
      title: f.name,
      summary: `HVS OneDrive link-first · ${match.client} · ${classification}`,
      fields: {
        connectionId,
        itemId: f.itemId,
        webUrl: f.webUrl,
        size: f.size,
        path: f.fullPath,
        documentClass: classification,
        atlasClassification: classification,
        sensitivityRestricted: sensitivity.restricted,
        sensitivityReasons: sensitivity.reasons,
        atlasClientId,
        atlasClientName: match.client,
        atlasClientCode: match.code,
        businessEntity: 'HVS',
        accountEmail: conn?.accountEmail || f.sourceAccount,
        sourceTenant: 'highvaluesolution.com',
        migrationStatus: 'link_only',
        occurredAt: f.modifiedDateTime || f.createdDateTime,
        // Exclude restricted from broad search payloads
        searchVisible: !sensitivity.restricted,
      },
      provenance: {
        provider: 'microsoft',
        sourceSystem: 'onedrive',
        sourceAccount: connectionId,
        sourceRecordId: f.itemId,
        sourceUrl: f.webUrl,
        originalModifiedAt: f.modifiedDateTime || undefined,
        originalCreatedAt: f.createdDateTime || undefined,
        importedAt: now,
        lastSynchronizedAt: now,
        contentHash: undefined,
        atlasRecordId: randomUUID(),
        confidenceLevel: 1,
        permissionClassification: 'managed_synchronization',
      },
    };
    records.push(record);
    linked++;
    byClient[match.client!] = (byClient[match.client!] || 0) + 1;
    byStatus['link_only'] = (byStatus['link_only'] || 0) + 1;

    manifest.push({
      atlasClientId,
      atlasClientName: match.client,
      atlasProjectId: null,
      sourceTenant: 'highvaluesolution.com',
      sourceAccount: f.sourceAccount,
      sourceConnectionId: connectionId,
      originalOneDriveItemId: f.itemId,
      originalSourcePath: f.fullPath,
      originalSourceUrl: f.webUrl,
      originalFileName: f.name,
      destinationLocation: null,
      fileHash: null,
      fileSize: f.size,
      createdDate: f.createdDateTime,
      modifiedDate: f.modifiedDateTime,
      importDate: now,
      classification,
      sensitivity: sensitivity.restricted ? 'restricted' : 'standard',
      sensitivityReasons: sensitivity.reasons,
      duplicateStatus: 'unknown',
      migrationStatus: 'link_only',
      errorStatus: null,
      reviewStatus: sensitivity.restricted ? 'restricted_access' : 'ok',
      matchConfidence: match.confidence,
      originalsUnchanged: true,
    });

    if (cand) {
      cand.associations.documents.push(record.id);
      cand.sourceRefs.push({
        connectionId,
        providerId: 'microsoft',
        sourceAccount: f.sourceAccount,
        sourceRecordId: f.itemId,
        kind: record.kind,
        title: f.name,
        occurredAt: f.modifiedDateTime || f.createdDateTime,
        businessEntity: 'HVS',
      });
    }
  }

  // Cap associations / timeline per client for store size
  for (const cand of clients) {
    cand.associations.documents = [...new Set(cand.associations.documents)].slice(0, 500);
    cand.sourceRefs = cand.sourceRefs.slice(0, 500);
    cand.timeline = cand.sourceRefs
      .filter((s) => s.occurredAt)
      .map((s) => ({
        at: s.occurredAt!,
        kind: s.kind,
        title: s.title,
        sourceRecordId: s.sourceRecordId,
        connectionId: s.connectionId,
      }))
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 200);
    const docs = cand.associations.documents.length;
    cand.completenessScore = Math.min(95, 25 + Math.min(docs, 40));
    cand.missingInformation = docs
      ? cand.missingInformation.filter((m) => !/HVS linked/i.test(m))
      : ['Review HVS linked documents'];
    cand.updatedAt = now;
  }

  console.log(JSON.stringify({ phase: 'upsert', count: records.length }));
  const batch = repo.upsertSourceRecordsBatch(records);
  repo.saveClient360(clients);
  // Rebuild associations from all sources (keeps email graph + our docs)
  runClient360Ingestion(repo);
  // Re-apply canonical names after rebuild (ingest may create domain-based duplicates)
  ensureCanonicalClients(
    repo,
    hvsConns.map((c) => c.id),
  );

  mkdirSync(OUT, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '');
  const summary = {
    generatedAt: now,
    mode: 'link_first',
    originalsUnchanged: true,
    hvsMutated: false,
    inventoryCsv: csvPath,
    totals: {
      inventoryFilesScanned: files.length,
      linked: linked,
      skippedUnmatched,
      restrictedFlagged: restricted,
      reviewQueue: reviewQueue.length,
      upsertImported: batch.imported,
      upsertDuplicates: batch.duplicates,
    },
    linkedByClient: byClient,
    migrationStatusCounts: byStatus,
  };

  writeFileSync(join(OUT, `link-summary-${stamp}.json`), JSON.stringify(summary, null, 2));
  writeFileSync(join(OUT, 'link-summary-latest.json'), JSON.stringify(summary, null, 2));
  writeFileSync(
    join(OUT, `migration-manifest-linked-${stamp}.json`),
    JSON.stringify({ summary, manifest }, null, 2),
  );
  writeFileSync(join(OUT, 'migration-manifest-linked-latest.json'), JSON.stringify({ summary, manifest }, null, 2));
  writeFileSync(
    join(OUT, `review-queue-linked-${stamp}.json`),
    JSON.stringify({ count: reviewQueue.length, items: reviewQueue.slice(0, 5000) }, null, 2),
  );
  writeFileSync(
    join(OUT, 'review-queue-linked-latest.json'),
    JSON.stringify({ count: reviewQueue.length, items: reviewQueue.slice(0, 5000) }, null, 2),
  );

  const md = [
    '# HVS → Atlas Link-First Migration',
    '',
    `- Generated: ${now}`,
    `- Mode: **link-only** — HVS originals not copied, moved, deleted, or permission-changed`,
    `- Files scanned: ${files.length}`,
    `- Linked to Atlas: **${linked}**`,
    `- Review queue: ${reviewQueue.length}`,
    `- Restricted (heuristic): ${restricted}`,
    '',
    '## Linked by client',
    '',
    ...Object.entries(byClient)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `- ${k}: ${v}`),
    '',
  ];
  writeFileSync(join(OUT, 'link-summary-latest.md'), md.join('\n'));

  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
