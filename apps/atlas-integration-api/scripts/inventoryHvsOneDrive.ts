/**
 * HVS OneDrive inventory — READ-ONLY discovery.
 * Does not move, delete, rename, or change permissions on source files.
 *
 * Usage (from repo root / worktree):
 *   INTEGRATION_REQUIRE_AUTH=false node --import tsx apps/atlas-integration-api/scripts/inventoryHvsOneDrive.ts
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { loadSecretsFile } from '../src/loadSecrets.ts';
import { loadConfig } from '../src/config.ts';
import { IntegrationRepository } from '../src/store/repository.ts';
import { refreshMicrosoftToken } from '../src/oauth/microsoft.ts';

const KNOWN_CLIENTS = [
  { name: 'ACCG Inc.', aliases: ['accg', 'accg-inc', 'accg inc'] },
  { name: 'Prodigy Games LLC', aliases: ['prodigy', 'prodigygames', 'prodigy games'] },
  { name: "That's Kava LLC", aliases: ['kava', "that's kava", 'thats kava', 'that’s kava'] },
  { name: "Christie's Place LLC", aliases: ['christie', "christie's place", 'christies place', 'falk'] },
  { name: 'Christie Falk', aliases: ['christie falk'] },
  { name: 'Irwin Falk', aliases: ['irwin falk', 'irwin'] },
  { name: 'Hart Family Dental', aliases: ['hart', 'hart family', 'hart dental'] },
  { name: 'Colorado Craft Beef', aliases: ['colorado beef', 'colorado craft', 'ccb', 'beef'] },
  { name: 'Lien Partners', aliases: ['lien', 'lienpartners', 'lien partners'] },
];

const SENSITIVE_PATTERNS: Array<{ label: string; re: RegExp }> = [
  { label: 'ssn_hint', re: /\bssn\b|social.?security/i },
  { label: 'ein_hint', re: /\bein\b|tax.?id|fein/i },
  { label: 'bank_hint', re: /bank.?statement|routing|account.?number|ach|wire.?instr/i },
  { label: 'tax_return', re: /form.?1040|form.?1120|k-?1\b|tax.?return|w-?2|w-?9/i },
  { label: 'medical', re: /hipaa|medical|phi\b|patient/i },
  { label: 'insurance', re: /insurance|claim|policy.?number/i },
  { label: 'credit', re: /credit.?report|fico|experian|equifax|transunion/i },
  { label: 'id_docs', re: /passport|driver.?license|id.?card|birth.?cert/i },
  { label: 'credentials', re: /password|credential|secret|api.?key|\.pem\b|\.pfx\b/i },
  { label: 'legal_privileged', re: /attorney.?client|privileged|legal.?hold/i },
];

function classify(name: string, path: string): string {
  const t = `${name} ${path}`.toLowerCase();
  if (/nda|non.?disclos/.test(t)) return 'NDAs';
  if (/proposal|pitch|sow|statement.?of.?work/.test(t)) return 'Proposals';
  if (/engagement|msa|master.?service|agreement|contract/.test(t)) return 'Contracts';
  if (/invoice|billing/.test(t)) return 'Financial statements';
  if (/bank.?statement/.test(t)) return 'Bank statements';
  if (/tax|1120|1040|k-?1|w-?2|w-?9/.test(t)) return 'Tax returns';
  if (/payroll|adp|paychex|gusto/.test(t)) return 'Payroll';
  if (/sba|loan|lender|funding|capital.?raise/.test(t)) return 'Funding documents';
  if (/investor|term.?sheet|cap.?table/.test(t)) return 'Investor documents';
  if (/insurance|claim/.test(t)) return 'Insurance';
  if (/formation|articles|operating.?agreement|ein/.test(t)) return 'Formation documents';
  if (/ownership|membership.?interest|stock/.test(t)) return 'Ownership information';
  if (/ar\b|accounts.?receivable|aging/.test(t)) return 'Accounts receivable';
  if (/ap\b|accounts.?payable/.test(t)) return 'Accounts payable';
  if (/meeting|minutes|agenda|transcript/.test(t)) return 'Meeting records';
  if (/marketing|logo|brand|flyer/.test(t)) return 'Marketing';
  if (/draft/.test(t)) return 'Draft';
  if (/final/.test(t)) return 'Final';
  if (/email|attachment|outlook/.test(t)) return 'Email attachments';
  if (/financial|p&l|balance.?sheet|cash.?flow|pnl/.test(t)) return 'Financial statements';
  if (/legal|lawsuit|subpoena/.test(t)) return 'Legal correspondence';
  return 'Unknown or needs review';
}

function detectSensitivity(name: string, path: string): { restricted: boolean; reasons: string[] } {
  const t = `${name} ${path}`;
  const reasons = SENSITIVE_PATTERNS.filter((p) => p.re.test(t)).map((p) => p.label);
  return { restricted: reasons.length > 0, reasons };
}

function matchClient(name: string, path: string): { client: string | null; confidence: 'high' | 'review' | 'none'; aliasesHit: string[] } {
  const t = `${name} ${path}`.toLowerCase();
  const hits: Array<{ client: string; alias: string }> = [];
  for (const c of KNOWN_CLIENTS) {
    for (const a of c.aliases) {
      if (t.includes(a.toLowerCase())) hits.push({ client: c.name, alias: a });
    }
  }
  if (!hits.length) return { client: null, confidence: 'none', aliasesHit: [] };
  const byClient = [...new Set(hits.map((h) => h.client))];
  if (byClient.length === 1) {
    // Require path segment-ish match for high confidence when alias is short
    const short = hits.every((h) => h.alias.length < 5);
    return {
      client: byClient[0],
      confidence: short ? 'review' : 'high',
      aliasesHit: hits.map((h) => h.alias),
    };
  }
  return { client: byClient[0], confidence: 'review', aliasesHit: hits.map((h) => `${h.client}:${h.alias}`) };
}

function extOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(i + 1).toLowerCase() : '';
}

async function main() {
  loadSecretsFile();
  const cfg = loadConfig();
  const repo = new IntegrationRepository(cfg.dataDir, cfg.tokenEncryptionKeyB64);
  const hvsConns = repo
    .listConnections()
    .filter((c) => c.providerId === 'microsoft' && (c.tenantOrOrg || '').includes('highvaluesolution') && c.status === 'Connected');

  if (!hvsConns.length) {
    throw new Error('No connected HVS Microsoft accounts. Connect manny@ / connect@ highvaluesolution.com first.');
  }

  const outDir = join(process.cwd(), 'deployment/reports/hvs-onedrive-inventory');
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '');

  type InvItem = Record<string, unknown>;
  const items: InvItem[] = [];
  const errors: Array<{ account: string; path: string; error: string }> = [];
  const reviewQueue: InvItem[] = [];

  for (const conn of hvsConns) {
    let creds = repo.getCredentials(conn.id);
    if (!creds?.accessToken) {
      errors.push({ account: conn.accountName, path: '/', error: 'no_token' });
      continue;
    }
    if (creds.refreshToken) {
      try {
        const refreshed = await refreshMicrosoftToken(cfg, creds.refreshToken);
        creds = {
          ...creds,
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token || creds.refreshToken,
          expiresAt: new Date(Date.now() + (refreshed.expires_in || 3600) * 1000).toISOString(),
        };
        repo.saveCredentials(conn.id, creds);
      } catch (e) {
        errors.push({ account: conn.accountName, path: '/', error: `refresh_failed:${String(e).slice(0, 120)}` });
      }
    }

    const token = creds.accessToken;
    async function g(path: string): Promise<any> {
      const r = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      const text = await r.text();
      let j: any;
      try {
        j = JSON.parse(text);
      } catch {
        j = { raw: text.slice(0, 400) };
      }
      if (!r.ok) throw new Error(`${r.status} ${path} ${text.slice(0, 240)}`);
      return j;
    }

    // Drive root meta
    let drive: any;
    try {
      drive = await g('/me/drive');
    } catch (e) {
      errors.push({ account: conn.accountName, path: '/me/drive', error: String(e).slice(0, 200) });
      continue;
    }

    const select =
      'id,name,size,createdDateTime,lastModifiedDateTime,webUrl,file,folder,parentReference,createdBy,lastModifiedBy,shared,fileSystemInfo,hashes';
    // Prefer delta for complete inventory; fall back to recursive children
    const queue: string[] = [];
    let deltaLink: string | null = `/me/drive/root/delta?$top=200&$select=${select}`;
    let page = 0;
    try {
      while (deltaLink) {
        page += 1;
        const data = await g(deltaLink.replace('https://graph.microsoft.com/v1.0', ''));
        for (const it of data.value || []) {
          if (it.deleted) continue;
          const name = it.name || '';
          const parentPath = it.parentReference?.path || '';
          const fullPath = `${parentPath}/${name}`.replace(/\/+/g, '/');
          const isFolder = Boolean(it.folder);
          const match = matchClient(name, fullPath);
          const classification = isFolder ? 'Folder' : classify(name, fullPath);
          const sensitivity = detectSensitivity(name, fullPath);
          const row: InvItem = {
            sourceTenant: 'highvaluesolution.com',
            sourceAccount: conn.accountName,
            sourceConnectionId: conn.id,
            driveId: drive.id,
            driveType: drive.driveType,
            itemId: it.id,
            name,
            extension: isFolder ? '' : extOf(name),
            isFolder,
            size: it.size ?? 0,
            createdDateTime: it.createdDateTime || it.fileSystemInfo?.createdDateTime || null,
            modifiedDateTime: it.lastModifiedDateTime || it.fileSystemInfo?.lastModifiedDateTime || null,
            owner:
              it.createdBy?.user?.displayName ||
              it.createdBy?.user?.email ||
              it.lastModifiedBy?.user?.displayName ||
              null,
            webUrl: it.webUrl || null,
            parentPath,
            fullPath,
            mimeType: it.file?.mimeType || null,
            hashes: it.file?.hashes || null,
            contentHash:
              it.file?.hashes?.quickXorHash ||
              it.file?.hashes?.sha1Hash ||
              it.file?.hashes?.sha256Hash ||
              null,
            shared: Boolean(it.shared),
            clientCandidate: match.client,
            matchConfidence: match.confidence,
            matchAliases: match.aliasesHit,
            classification,
            sensitivityRestricted: sensitivity.restricted,
            sensitivityReasons: sensitivity.reasons,
            unreadable: false,
            passwordProtectedSuspect: /\.zip$|\.7z$|\.rar$/i.test(name) && /pass|protect|encrypt/i.test(name),
            migrationStatus: 'inventoried',
            duplicateStatus: 'unknown',
            reviewStatus: match.confidence === 'review' || sensitivity.restricted ? 'needs_review' : 'ok',
          };
          items.push(row);
          if (row.reviewStatus === 'needs_review') reviewQueue.push(row);
        }
        if (data['@odata.nextLink']) {
          deltaLink = data['@odata.nextLink'];
        } else if (data['@odata.deltaLink']) {
          // finished; persist delta for resume
          writeFileSync(
            join(outDir, `delta-link-${conn.id}.txt`),
            data['@odata.deltaLink'],
            'utf8',
          );
          deltaLink = null;
        } else {
          deltaLink = null;
        }
        if (page % 10 === 0) {
          console.log(JSON.stringify({ account: conn.accountName, page, items: items.length }));
        }
      }
    } catch (e) {
      errors.push({ account: conn.accountName, path: 'delta', error: String(e).slice(0, 240) });
      // Fallback: BFS children
      queue.push('root');
      const seen = new Set<string>();
      while (queue.length) {
        const id = queue.shift()!;
        if (seen.has(id)) continue;
        seen.add(id);
        try {
          const path =
            id === 'root'
              ? `/me/drive/root/children?$top=200&$select=${select}`
              : `/me/drive/items/${encodeURIComponent(id)}/children?$top=200&$select=${select}`;
          let next: string | null = path;
          while (next) {
            const data = await g(next.replace('https://graph.microsoft.com/v1.0', ''));
            for (const it of data.value || []) {
              const name = it.name || '';
              const parentPath = it.parentReference?.path || '';
              const fullPath = `${parentPath}/${name}`.replace(/\/+/g, '/');
              const isFolder = Boolean(it.folder);
              const match = matchClient(name, fullPath);
              const sensitivity = detectSensitivity(name, fullPath);
              items.push({
                sourceTenant: 'highvaluesolution.com',
                sourceAccount: conn.accountName,
                sourceConnectionId: conn.id,
                driveId: drive.id,
                itemId: it.id,
                name,
                extension: isFolder ? '' : extOf(name),
                isFolder,
                size: it.size ?? 0,
                createdDateTime: it.createdDateTime || null,
                modifiedDateTime: it.lastModifiedDateTime || null,
                owner: it.createdBy?.user?.displayName || null,
                webUrl: it.webUrl || null,
                parentPath,
                fullPath,
                mimeType: it.file?.mimeType || null,
                hashes: it.file?.hashes || null,
                contentHash: it.file?.hashes?.quickXorHash || null,
                clientCandidate: match.client,
                matchConfidence: match.confidence,
                classification: isFolder ? 'Folder' : classify(name, fullPath),
                sensitivityRestricted: sensitivity.restricted,
                sensitivityReasons: sensitivity.reasons,
                migrationStatus: 'inventoried',
                reviewStatus: match.confidence === 'review' || sensitivity.restricted ? 'needs_review' : 'ok',
              });
              if (isFolder && it.id) queue.push(it.id);
            }
            next = data['@odata.nextLink'] || null;
          }
        } catch (err) {
          errors.push({ account: conn.accountName, path: id, error: String(err).slice(0, 200) });
        }
      }
    }
  }

  // Duplicate candidates by name+size
  const dupKey = new Map<string, string[]>();
  for (const it of items) {
    if (it.isFolder) continue;
    const k = `${String(it.name).toLowerCase()}|${it.size}`;
    const arr = dupKey.get(k) || [];
    arr.push(String(it.itemId));
    dupKey.set(k, arr);
  }
  for (const it of items) {
    if (it.isFolder) continue;
    const k = `${String(it.name).toLowerCase()}|${it.size}`;
    const ids = dupKey.get(k) || [];
    it.duplicateStatus = ids.length > 1 ? 'duplicate_candidate' : 'unique';
    it.duplicateGroupSize = ids.length;
  }

  // Manifest (link-first)
  const manifest = items
    .filter((i) => !i.isFolder)
    .map((i) => ({
      atlasClientId: null,
      atlasClientName: i.clientCandidate,
      atlasProjectId: null,
      sourceTenant: i.sourceTenant,
      sourceAccount: i.sourceAccount,
      originalOneDriveItemId: i.itemId,
      originalSourcePath: i.fullPath,
      originalSourceUrl: i.webUrl,
      originalFileName: i.name,
      destinationLocation: null,
      fileHash: i.contentHash,
      fileSize: i.size,
      createdDate: i.createdDateTime,
      modifiedDate: i.modifiedDateTime,
      importDate: new Date().toISOString(),
      classification: i.classification,
      sensitivity: i.sensitivityRestricted ? 'restricted' : 'standard',
      sensitivityReasons: i.sensitivityReasons,
      duplicateStatus: i.duplicateStatus,
      migrationStatus: 'link_only_pending',
      errorStatus: null,
      reviewStatus: i.reviewStatus,
      matchConfidence: i.matchConfidence,
    }));

  const files = items.filter((i) => !i.isFolder);
  const folders = items.filter((i) => i.isFolder);
  const byClient: Record<string, number> = {};
  const byClass: Record<string, number> = {};
  for (const f of files) {
    const c = String(f.clientCandidate || 'Unmatched');
    byClient[c] = (byClient[c] || 0) + 1;
    const cl = String(f.classification || 'Unknown');
    byClass[cl] = (byClass[cl] || 0) + 1;
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: 'read_only_inventory',
    originalsUnchanged: true,
    hvsAccounts: hvsConns.map((c) => ({ id: c.id, account: c.accountName, tenant: c.tenantOrOrg })),
    totals: {
      items: items.length,
      folders: folders.length,
      files: files.length,
      restrictedFiles: files.filter((f) => f.sensitivityRestricted).length,
      duplicateCandidates: files.filter((f) => f.duplicateStatus === 'duplicate_candidate').length,
      reviewQueue: reviewQueue.length,
      errors: errors.length,
      unmatchedFiles: files.filter((f) => !f.clientCandidate).length,
    },
    filesByClient: byClient,
    filesByClassification: byClass,
    priorityClients: KNOWN_CLIENTS.map((c) => ({
      name: c.name,
      files: byClient[c.name] || 0,
    })),
  };

  const jsonPath = join(outDir, `inventory-${stamp}.json`);
  const latestJson = join(outDir, 'inventory-latest.json');
  const csvPath = join(outDir, `inventory-${stamp}.csv`);
  const mdPath = join(outDir, `inventory-${stamp}.md`);
  const manifestPath = join(outDir, `migration-manifest-${stamp}.json`);
  const reviewPath = join(outDir, `review-queue-${stamp}.json`);
  const summaryPath = join(outDir, 'summary-latest.json');

  writeFileSync(jsonPath, JSON.stringify({ summary, items, errors }, null, 2));
  writeFileSync(latestJson, JSON.stringify({ summary, items, errors }, null, 2));
  writeFileSync(manifestPath, JSON.stringify({ summary, manifest }, null, 2));
  writeFileSync(reviewPath, JSON.stringify({ count: reviewQueue.length, items: reviewQueue }, null, 2));
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  // CSV
  const cols = [
    'sourceTenant',
    'sourceAccount',
    'itemId',
    'name',
    'extension',
    'isFolder',
    'size',
    'createdDateTime',
    'modifiedDateTime',
    'owner',
    'fullPath',
    'webUrl',
    'clientCandidate',
    'matchConfidence',
    'classification',
    'sensitivityRestricted',
    'duplicateStatus',
    'reviewStatus',
  ];
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const csv = [cols.join(',')]
    .concat(items.map((it) => cols.map((c) => esc(it[c])).join(',')))
    .join('\n');
  writeFileSync(csvPath, csv);

  const md = [
    '# HVS OneDrive Inventory (Read-Only)',
    '',
    `- Generated: ${summary.generatedAt}`,
    `- Mode: **read-only** — originals not moved, deleted, renamed, or permission-changed`,
    `- Accounts: ${summary.hvsAccounts.map((a: any) => a.account).join(', ')}`,
    '',
    '## Totals',
    '',
    `- Items: ${summary.totals.items}`,
    `- Folders: ${summary.totals.folders}`,
    `- Files: ${summary.totals.files}`,
    `- Restricted (name/path heuristics): ${summary.totals.restrictedFiles}`,
    `- Duplicate candidates: ${summary.totals.duplicateCandidates}`,
    `- Review queue: ${summary.totals.reviewQueue}`,
    `- Unmatched files: ${summary.totals.unmatchedFiles}`,
    `- Errors: ${summary.totals.errors}`,
    '',
    '## Priority clients',
    '',
    ...summary.priorityClients.map((c: any) => `- ${c.name}: **${c.files}** files`),
    '',
    '## Files by classification (top)',
    '',
    ...Object.entries(byClass)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([k, v]) => `- ${k}: ${v}`),
    '',
    '## Artifacts',
    '',
    `- JSON: \`${jsonPath}\``,
    `- CSV: \`${csvPath}\``,
    `- Manifest: \`${manifestPath}\``,
    `- Review queue: \`${reviewPath}\``,
  ];
  writeFileSync(mdPath, md.join('\n') + '\n');
  writeFileSync(join(outDir, 'inventory-latest.md'), md.join('\n') + '\n');

  console.log(JSON.stringify({ ok: true, summary, jsonPath, csvPath, mdPath, manifestPath, reviewPath }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
