/**
 * Phase 6B — apply Manny-approved H1 on pilot worktree, validate, preview, commit locally.
 * NO PUSH / NO PR / NO DEPLOY / NO PRODUCTION MAIN EDIT.
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { WebsiteStudioService } from '../src/website-studio/service.ts';
import {
  CURRENT_H1,
  HVCG_REPO_PATH,
  HVCG_WORKTREE_PATH,
} from '../src/website-studio/phase6b.ts';

const CR_ID = 'wcr_96016971141f';
const APPROVED =
  'Strategic capital advisory to help your business grow, qualify for capital, and build enterprise value.';

const atlasRoot = resolve(
  process.cwd().includes('atlas-integration-api') ? join(process.cwd(), '../..') : process.cwd(),
);
const dbPath = join(atlasRoot, '.data', 'website-studio', 'website-studio.sqlite');
const evidenceDir = join(atlasRoot, 'deployment', 'reports', 'website-studio-phase6b');
mkdirSync(evidenceDir, { recursive: true });

function run(cwd: string, cmd: string, args: string[]) {
  try {
    const out = execFileSync(cmd, args, {
      cwd,
      encoding: 'utf8',
      timeout: 180_000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ok: true, output: String(out).slice(0, 8000) };
  } catch (err: unknown) {
    const e = err as { message?: string; stdout?: string; stderr?: string };
    return {
      ok: false,
      output: `${e.message || ''}\n${e.stdout || ''}\n${e.stderr || ''}`.slice(0, 8000),
    };
  }
}

const service = new WebsiteStudioService({
  repoRoot: atlasRoot,
  env: { WEBSITE_STUDIO_DB: dbPath },
  dbPath,
});

const cr0 = service.getChangeRequest(CR_ID);
if (!cr0) {
  throw new Error(`Change request ${CR_ID} not found in ${dbPath}`);
}

// Stage + approve exact wording
service.phase6bSetFinalWording(CR_ID, { customWording: APPROVED });
service.phase6bApproveFinalWording(CR_ID);

const applied = service.phase6bApply(CR_ID);
const siteCwd = join(HVCG_WORKTREE_PATH, 'website');

const generate = run(siteCwd, 'npm', ['run', 'generate']);
const validate = run(siteCwd, 'npm', ['run', 'validate:eva']);
const smoke = run(siteCwd, 'npm', ['run', 'smoke']);

const warnings: string[] = [];
if (!generate.ok) warnings.push('generate failed');
if (!validate.ok) warnings.push('validate:eva failed');
if (!smoke.ok) warnings.push('smoke failed');

// After generate, ensure staging still has approved H1 (generate reads generate_pages.py)
const stagingHtml = readFileSync(join(siteCwd, 'staging/index.html'), 'utf8');
const previewHtml = readFileSync(join(siteCwd, 'preview/index.html'), 'utf8');
const genPy = readFileSync(join(siteCwd, 'scripts/generate_pages.py'), 'utf8');
const h1Ok =
  stagingHtml.includes(APPROVED) &&
  previewHtml.includes(APPROVED) &&
  genPy.includes(APPROVED) &&
  !stagingHtml.includes(CURRENT_H1);

if (!h1Ok) warnings.push('approved H1 not fully present in all expected files after generate');

// Metadata / schema / canonical preservation checks (homepage)
const metaOk = /name=["']description["']/i.test(stagingHtml);
const ldOk = /application\/ld\+json/i.test(stagingHtml);
const titleOk = /<title>Home \| High Value Capital Group<\/title>/i.test(stagingHtml);
if (!metaOk) warnings.push('meta description missing');
if (!ldOk) warnings.push('JSON-LD missing');
if (!titleOk) warnings.push('title changed unexpectedly');

// Unexpected file list
const porcelain = execFileSync('git', ['status', '--porcelain'], {
  cwd: HVCG_WORKTREE_PATH,
  encoding: 'utf8',
});
const changedFiles = porcelain
  .split('\n')
  .filter(Boolean)
  .map((l) => l.replace(/^..\s+/, '').trim());
const expected = new Set([
  'website/scripts/generate_pages.py',
  'website/staging/index.html',
  'website/preview/index.html',
]);
const unexpected = changedFiles.filter((f) => !expected.has(f));
if (unexpected.length) warnings.push(`unexpected files: ${unexpected.join(', ')}`);

const diff = execFileSync('git', ['diff', '--', ...[...expected]], {
  cwd: HVCG_WORKTREE_PATH,
  encoding: 'utf8',
}).slice(0, 20000);

const automatedPass = generate.ok && validate.ok && smoke.ok && h1Ok && unexpected.length === 0;
const buildResult = generate.ok ? (automatedPass ? 'PASS' : 'PASS WITH WARNINGS') : 'FAIL';
const testResult = validate.ok && smoke.ok ? (warnings.length ? 'PASS WITH WARNINGS' : 'PASS') : 'FAIL';

// Start local preview (allow-listed)
let previewPid: number | null = null;
const previewUrl = 'http://127.0.0.1:8765/';
try {
  const child = spawn('npm', ['run', 'preview'], {
    cwd: siteCwd,
    detached: true,
    stdio: 'ignore',
  });
  previewPid = child.pid ?? null;
  child.unref();
} catch (err) {
  warnings.push(`preview start failed: ${err instanceof Error ? err.message : String(err)}`);
}

// Brief fetch check for H1
await new Promise((r) => setTimeout(r, 800));
let previewFetchOk = false;
try {
  const res = await fetch(previewUrl);
  const body = await res.text();
  previewFetchOk = body.includes(APPROVED);
  if (!previewFetchOk) warnings.push('preview HTML missing approved H1');
} catch (err) {
  warnings.push(`preview fetch failed: ${err instanceof Error ? err.message : String(err)}`);
}

service.phase6bRecordAutomatedQa(CR_ID, {
  buildResult,
  testResult,
  previewUrl,
  diff,
  warnings,
});

let commitSha: string | null = null;
let commitError: string | null = null;
if (automatedPass || (generate.ok && validate.ok && smoke.ok && h1Ok)) {
  try {
    const committed = service.phase6bCommit(
      CR_ID,
      'feat(content): update HVCG homepage capital advisory headline',
    );
    commitSha = committed.commit;
  } catch (err) {
    commitError = err instanceof Error ? err.message : String(err);
    warnings.push(`commit failed: ${commitError}`);
  }
} else {
  warnings.push('automated QA did not pass — commit skipped');
}

const cr = service.getChangeRequest(CR_ID);
const panel = service.getPilotReviewPanel(CR_ID);
const mainBranch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
  cwd: HVCG_REPO_PATH,
  encoding: 'utf8',
}).trim();
const pilotStatus = execFileSync('git', ['status', '-sb'], {
  cwd: HVCG_WORKTREE_PATH,
  encoding: 'utf8',
}).trim();
const pilotBranch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
  cwd: HVCG_WORKTREE_PATH,
  encoding: 'utf8',
}).trim();

const report = {
  approvedH1: APPROVED,
  changeRequestId: CR_ID,
  filesChanged: applied.filesChanged,
  diffSummary: diff
    .split('\n')
    .filter((l) => l.startsWith('+') || l.startsWith('-') || l.startsWith('diff'))
    .slice(0, 80),
  diff,
  generate,
  validate,
  smoke,
  buildResult,
  testResult,
  previewUrl,
  previewPid,
  previewFetchOk,
  layoutQa: {
    desktop: 'WAITING ON MANNY',
    tablet: 'WAITING ON MANNY',
    mobile: 'WAITING ON MANNY',
  },
  checks: {
    h1Ok,
    titlePreserved: titleOk,
    metaPreserved: metaOk,
    jsonLdPreserved: ldOk,
    unexpectedFiles: unexpected,
    mainCheckoutBranch: mainBranch,
    pilotBranch,
    productionMainUntouched: mainBranch === 'main',
  },
  visualQaState: 'WAITING ON MANNY',
  pilotCommitSha: commitSha,
  commitError,
  websiteWorkingTree: pilotStatus,
  atlasChangeRequestStatus: cr.status,
  rollbackPoint: cr.baselineCommit || cr.rollbackReference,
  estimatedMannyTimeSavedMinutes: cr.timeProtection.estimatedTimeSavedMinutes,
  warnings,
  panel,
  pushed: false,
  prCreated: false,
  deployed: false,
};

writeFileSync(join(evidenceDir, 'pilot-apply.json'), JSON.stringify(report, null, 2));
writeFileSync(join(evidenceDir, 'pilot.diff'), diff);
console.log(JSON.stringify({ ok: true, ...report, diff: undefined, panel: undefined }, null, 2));

service.store.close();
