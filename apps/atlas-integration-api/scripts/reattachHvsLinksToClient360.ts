/**
 * Re-attach link-first HVS Document records onto Client 360 after rebuild.
 * Idempotent; does not touch HVS OneDrive.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadSecretsFile } from '../src/loadSecrets.ts';
import { loadConfig } from '../src/config.ts';
import { IntegrationRepository } from '../src/store/repository.ts';
import type { Client360Candidate, Client360SourceRef } from '../src/store/types.ts';

const NAME_ALIASES: Record<string, string[]> = {
  'accg inc.': ['accg', 'accg-inc', 'accg inc'],
  'prodigy games llc': ['prodigy', 'prodigygames', 'prodigy games'],
  "that's kava llc": ['kava', "that's kava", 'thats kava'],
  "christie's place llc": ['christie', "christie's place", 'christies place', 'falk'],
  'hart family dental': ['hart', 'hart family', 'hart dental'],
  'colorado craft beef': ['colorado', 'beef', 'coloradocraftbeef', 'ccb'],
  'lien partners': ['lien', 'lienpartners', 'lien partners'],
  'irwin falk': ['irwin falk', 'irwin'],
  'christie falk': ['christie falk'],
};

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function findClient(list: Client360Candidate[], name: string, code?: string): Client360Candidate | null {
  const n = name.toLowerCase();
  const exact = list.find((c) => c.displayName.toLowerCase() === n || c.legalName?.toLowerCase() === n);
  if (exact) return exact;
  if (code) {
    const byId = list.find((c) => c.id === `client-${code.toLowerCase()}`);
    if (byId) return byId;
  }
  const aliases = NAME_ALIASES[n] || [n];
  let best: Client360Candidate | null = null;
  let bestScore = 0;
  for (const c of list) {
    const hay = normalize(`${c.displayName} ${c.legalName || ''} ${(c.domains || []).join(' ')}`);
    let score = 0;
    for (const a of aliases) {
      const an = normalize(a);
      if (an.length >= 4 && hay.includes(an)) score += an.length;
    }
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return bestScore >= 4 ? best : null;
}

async function main() {
  loadSecretsFile();
  const cfg = loadConfig();
  const repo = new IntegrationRepository(cfg.dataDir, cfg.tokenEncryptionKeyB64);
  const clients = repo.listClient360();
  const records = repo.listAllSourceRecords(500_000).filter(
    (r) => r.fields?.migrationStatus === 'link_only' || r.provenance?.sourceSystem === 'onedrive',
  );

  const byClient: Record<string, number> = {};
  let attached = 0;
  let restrictedHidden = 0;

  for (const r of records) {
    const clientName = String(r.fields.atlasClientName || '');
    const code = String(r.fields.atlasClientCode || '');
    if (!clientName) continue;
    const cand = findClient(clients, clientName, code);
    if (!cand) continue;

    const connectionId = String(r.fields.connectionId || r.provenance.sourceAccount);
    const key = `${connectionId}::${r.provenance.sourceRecordId}`;
    const already = cand.sourceRefs.some(
      (s) => `${s.connectionId}::${s.sourceRecordId}` === key,
    );
    if (!already) {
      const restricted = Boolean(r.fields.sensitivityRestricted);
      if (restricted) {
        restrictedHidden++;
        // Still attach but mark title for owners; exclude from searchVisible docs list in API
      }
      const ref: Client360SourceRef = {
        connectionId,
        providerId: 'microsoft',
        sourceAccount: String(r.fields.accountEmail || r.provenance.sourceAccount),
        sourceRecordId: r.provenance.sourceRecordId,
        kind: r.kind,
        title: restricted ? `[RESTRICTED] ${r.title}` : r.title,
        occurredAt:
          (typeof r.fields.occurredAt === 'string' && r.fields.occurredAt) ||
          r.provenance.originalModifiedAt ||
          r.provenance.importedAt,
        businessEntity: 'HVS',
      };
      cand.sourceRefs.push(ref);
      cand.associations.documents.push(r.id);
      attached++;
    }
    byClient[cand.displayName] = (byClient[cand.displayName] || 0) + 1;
  }

  const now = new Date().toISOString();
  for (const c of clients) {
    c.associations.documents = [...new Set(c.associations.documents)].slice(0, 800);
    // Prefer HVS link refs in timeline
    c.sourceRefs = c.sourceRefs.slice(0, 800);
    c.timeline = c.sourceRefs
      .filter((s) => s.occurredAt && s.businessEntity === 'HVS')
      .map((s) => ({
        at: s.occurredAt!,
        kind: s.kind,
        title: s.title,
        sourceRecordId: s.sourceRecordId,
        connectionId: s.connectionId,
      }))
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 200);
    const docs = c.associations.documents.length;
    if (docs > 0) {
      c.completenessScore = Math.min(95, Math.max(c.completenessScore || 0, 30 + Math.min(docs, 50)));
      c.updatedAt = now;
    }
  }

  repo.saveClient360(clients);

  const summary = {
    generatedAt: now,
    attached,
    restrictedHidden,
    byClient,
    prioritySnapshot: clients
      .filter((c) =>
        /accg|prodigy|christie|hart|kava|colorado|lien|falk/i.test(c.displayName),
      )
      .map((c) => ({
        id: c.id,
        name: c.displayName,
        docs: c.associations.documents.length,
        hvsRefs: c.sourceRefs.filter((s) => s.businessEntity === 'HVS').length,
      })),
  };
  mkdirSync('deployment/reports/hvs-onedrive-inventory', { recursive: true });
  writeFileSync(
    join('deployment/reports/hvs-onedrive-inventory/reattach-latest.json'),
    JSON.stringify(summary, null, 2),
  );
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
