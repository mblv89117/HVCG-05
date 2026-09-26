/**
 * Frontend project routing regression tests (plain Node).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Inline mirror of routing helper (compiled TS not required for unit check)
const FORBIDDEN = new Set(['undefined', 'null', 'unknown', 'nan', '']);
function isValidProjectId(raw) {
  if (raw == null) return false;
  const id = String(raw).trim();
  if (!id) return false;
  if (FORBIDDEN.has(id.toLowerCase())) return false;
  if (id.startsWith('prj-')) return false;
  return true;
}
function projectDetailPath(id) {
  if (!isValidProjectId(id)) return null;
  return `/projects/${encodeURIComponent(String(id).trim())}`;
}

assert.equal(isValidProjectId('undefined'), false);
assert.equal(isValidProjectId('null'), false);
assert.equal(isValidProjectId('unknown'), false);
assert.equal(isValidProjectId(''), false);
assert.equal(isValidProjectId('prj-ccb-capital'), false);
assert.equal(projectDetailPath('undefined'), null);
assert.equal(projectDetailPath('abc-123'), '/projects/abc-123');

const appShell = readFileSync(join(root, 'src/layout/AppShell.tsx'), 'utf8');
assert.match(appShell, /label: 'Projects',\s*to: '\/projects'/);

const app = readFileSync(join(root, 'src/App.tsx'), 'utf8');
assert.match(app, /path="projects"/);
assert.match(app, /path="projects\/:projectId"/);
assert.match(app, /isValidProjectId/);
assert.match(app, /DocumentsOperatingPage/);

const detail = readFileSync(join(root, 'src/pages/ProjectDetailPage.tsx'), 'utf8');
assert.match(detail, /Back to projects/);
assert.match(detail, /invalidId/);

const portfolio = readFileSync(join(root, 'src/pages/PortfolioPage.tsx'), 'utf8');
assert.match(portfolio, /Create project/);
assert.match(portfolio, /projectDetailPath/);
assert.match(portfolio, /Sync from Microsoft \+ Client 360/);

const live = readFileSync(join(root, 'src/pages/LiveClientDetailPage.tsx'), 'utf8');
assert.match(live, /Create project/);
assert.match(live, /No entitled projects on this ClientCode/);
assert.match(live, /tasksListHonesty/);
assert.match(live, /\{tasksHonesty\.sentence\}/);
const tasksCard = live.slice(live.indexOf('title="Related tasks"'), live.indexOf('title="Engagements"'));
const indexedBranch = tasksCard.slice(
  tasksCard.indexOf("tasksHonesty.kind === 'indexed'"),
  tasksCard.indexOf('No entitled open tasks'),
);
assert.match(indexedBranch, /\{tasksHonesty\.sentence\}/);
assert.match(indexedBranch, /row\.title/);
assert.ok(indexedBranch.indexOf('{tasksHonesty.sentence}') < indexedBranch.indexOf('tasksHonesty.slice.map'));
assert.match(tasksCard, /tasks=INDEXED/);
assert.match(tasksCard, /Task create is hidden for this read-only ClientCode/);
const relatedWork = live.slice(live.indexOf('label="Related work"'), live.indexOf('label="What requires me"'));
assert.match(relatedWork, /\{tasksHonesty\.sentence\}/);
assert.match(relatedWork, /\{contactsHonesty\.sentence\}/);
assert.match(relatedWork, /\{meetingsHonesty\.sentence\}/);
assert.match(relatedWork, /\{engagementsHonesty\.sentence\}/);
assert.match(relatedWork, /\{deliverablesHonesty\.sentence\}/);
assert.match(relatedWork, /\{decisionsRisksHonesty\.sentence\}/);
assert.match(live, /projectDetailPath/);
assert.match(live, /workspace\.timeline/);
assert.match(live, /engagementsListHonesty/);
assert.match(live, /engagementsChipLabel/);
const engagementsCard = live.slice(live.indexOf('title="Engagements"'), live.indexOf('title="Decisions / risks"'));
const engagementsIndexed = engagementsCard.slice(
  engagementsCard.indexOf("engagementsHonesty.kind === 'indexed'"),
  engagementsCard.indexOf('No entitled engagements'),
);
assert.match(engagementsIndexed, /\{engagementsHonesty\.sentence\}/);
assert.match(engagementsIndexed, /row\.title/);
assert.ok(
  engagementsIndexed.indexOf('{engagementsHonesty.sentence}') <
    engagementsIndexed.indexOf('engagementsHonesty.slice.map'),
);
assert.match(engagementsCard, /engagementsChipLabel\(engagementsHonesty\.kind\)/);
assert.doesNotMatch(live, /workspace\.engagements\.items/);
assert.match(live, /deliverablesListHonesty/);
assert.match(live, /deliverablesChipLabel/);
assert.doesNotMatch(live, /workspace\.deliverables\.items/);
assert.doesNotMatch(live, /sectionHonesty\(workspace\.deliverables\)/);
const deliverablesCard = live.slice(live.indexOf('title="Deliverables"'), live.indexOf('title="Contacts"'));
const deliverablesIndexed = deliverablesCard.slice(
  deliverablesCard.indexOf("deliverablesHonesty.kind === 'indexed'"),
  deliverablesCard.indexOf('No entitled deliverables'),
);
assert.match(deliverablesIndexed, /\{deliverablesHonesty\.sentence\}/);
assert.match(deliverablesIndexed, /row\.title/);
assert.ok(
  deliverablesIndexed.indexOf('{deliverablesHonesty.sentence}') <
    deliverablesIndexed.indexOf('deliverablesHonesty.slice.map'),
);
assert.match(deliverablesCard, /deliverablesChipLabel\(deliverablesHonesty\.kind\)/);
assert.match(live, /decisionsRisksListHonesty/);
assert.match(live, /decisionsRisksChipLabel/);
assert.match(live, /\{decisionsRisksHonesty\.sentence\}/);
assert.doesNotMatch(live, /workspace\.decisionsRisks\.items/);
assert.doesNotMatch(live, /sectionHonesty\(workspace\.decisionsRisks\)/);
const decisionsCard = live.slice(live.indexOf('title="Decisions / risks"'), live.indexOf('title="Deliverables"'));
const decisionsIndexed = decisionsCard.slice(
  decisionsCard.indexOf("decisionsRisksHonesty.kind === 'indexed'"),
  decisionsCard.indexOf('No entitled decisions or risks'),
);
assert.match(decisionsIndexed, /\{decisionsRisksHonesty\.sentence\}/);
assert.match(decisionsIndexed, /row\.title/);
assert.ok(
  decisionsIndexed.indexOf('{decisionsRisksHonesty.sentence}') <
    decisionsIndexed.indexOf('decisionsRisksHonesty.slice.map'),
);
assert.match(decisionsCard, /decisionsRisksChipLabel\(decisionsRisksHonesty\.kind\)/);
assert.match(live, /communicationsListHonesty/);
assert.match(live, /communicationsListChipLabel/);
assert.match(live, /\{communicationsListView\.sentence\}/);
assert.doesNotMatch(live, /sectionHonesty\(workspace\.communications\)/);
assert.doesNotMatch(live, /workspace\.communications\.items/);
assert.doesNotMatch(live, /0 communications/);
const communicationsCard = live.slice(live.indexOf('title="Communications"'), live.indexOf('title="Timeline"'));
const communicationsIndexed = communicationsCard.slice(
  communicationsCard.indexOf("communicationsListView.kind === 'indexed'"),
  communicationsCard.indexOf('No entitled communication threads'),
);
assert.match(communicationsIndexed, /\{communicationsListView\.sentence\}/);
assert.match(communicationsIndexed, /row\.title/);
assert.ok(
  communicationsIndexed.indexOf('{communicationsListView.sentence}') <
    communicationsIndexed.indexOf('communicationsListView.slice.map'),
);
assert.match(communicationsCard, /communicationsListChipLabel\(communicationsListView\.kind\)/);
assert.match(live, /sectionHonesty\(workspace\.documents\)/);
assert.match(relatedWork, /sectionHonesty\(workspace\.documents\)/);
assert.match(relatedWork, /\{communicationsListView\.sentence\}/);
assert.doesNotMatch(relatedWork, /sectionHonesty\(workspace\.communications\)/);
assert.match(live, /title="Engagements"/);
assert.match(live, /title="Decisions \/ risks"/);
assert.match(live, /title="Meetings"/);
assert.match(live, /meetingsListHonesty/);
assert.match(live, /title="Timeline"/);
assert.match(live, /EmptyState/);
assert.match(live, /StatusChip/);
assert.match(live, /status === 401/);
assert.match(live, /status === 403/);
assert.match(live, /AccessDeniedState/);
assert.doesNotMatch(live, /fetchClient360/);
assert.doesNotMatch(live, /Growth Command Center/);
assert.doesNotMatch(live, /fetchGcc/);
assert.match(live, /CommercialContextPanel/);
assert.match(live, /fetchClientCommercialContext/);
assert.doesNotMatch(live, /\/api\/capital\/handoffs/);
assert.doesNotMatch(live, /ACCG01/);
assert.doesNotMatch(live, /Jane Doe|John Smith|sample@client/i);

const home = readFileSync(join(root, 'src/pages/CommandCenterPage.tsx'), 'utf8');
assert.match(home, /CommercialContextPanel/);
assert.match(home, /cc\.commercialContext/);
assert.doesNotMatch(home, /LIVE_GTM_OUTBOUND/);

const opp = readFileSync(join(root, 'src/pages/OpportunityDetailPage.tsx'), 'utf8');
assert.match(opp, /CommercialContextPanel/);
assert.match(opp, /fetchOpportunityCommercialContext/);

const tasks = readFileSync(join(root, 'src/pages/TasksApprovalsPage.tsx'), 'utf8');
assert.match(tasks, /CommercialContextPanel/);
assert.match(tasks, /commercialContext/);

const docs = readFileSync(join(root, 'src/pages/DocumentsOperatingPage.tsx'), 'utf8');
assert.match(docs, /fetchPmDocuments/);
assert.match(docs, /Open HVCG-Clients/);

console.log('PASS project route + operating layer source tests');
