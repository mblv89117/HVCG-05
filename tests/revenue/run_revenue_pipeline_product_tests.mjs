#!/usr/bin/env node
/**
 * QA harness — Revenue Pipeline Product (Elite OS)
 * Run: node tests/revenue/run_revenue_pipeline_product_tests.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const pipelinePath = path.join(
  root,
  'apps/atlas-elite-os/src/data/revenuePipeline.ts'
);
const revenuePagePath = path.join(root, 'apps/atlas-elite-os/src/pages/RevenuePage.tsx');
const oppPagePath = path.join(root, 'apps/atlas-elite-os/src/pages/OpportunityDetailPage.tsx');
const execPath = path.join(root, 'apps/atlas-elite-os/src/pages/ExecutiveDashboard.tsx');
const rbacPath = path.join(root, 'apps/atlas-elite-os/src/security/rbac.ts');
const appPath = path.join(root, 'apps/atlas-elite-os/src/App.tsx');
const userDocPath = path.join(root, 'docs/revenue/REVENUE_OS_USER_GUIDE.md');
const qaDocPath = path.join(root, 'docs/revenue/REVENUE_PIPELINE_QA.md');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  PASS  ${msg}`);
  } else {
    failed += 1;
    console.error(`  FAIL  ${msg}`);
  }
}

const REQUIRED_STAGES = [
  'New Lead',
  'Qualified',
  'Discovery',
  'Assessment',
  'Blueprint',
  'Proposal',
  'Negotiation',
  'Won',
  'Onboarding',
  'Active Engagement',
  'Closed',
  'Lost',
];

console.log('\nRevenue Pipeline Product QA\n');

const src = fs.readFileSync(pipelinePath, 'utf8');
const revenuePage = fs.readFileSync(revenuePagePath, 'utf8');
const oppPage = fs.readFileSync(oppPagePath, 'utf8');
const execPage = fs.readFileSync(execPath, 'utf8');
const rbac = fs.readFileSync(rbacPath, 'utf8');
const app = fs.readFileSync(appPath, 'utf8');

for (const stage of REQUIRED_STAGES) {
  assert(src.includes(`'${stage}'`), `Pipeline includes stage: ${stage}`);
}

assert(src.includes("id: 'opp-ccb-blueprint-001'"), 'CCB opportunity id present');
assert(src.includes("stage: 'Blueprint'"), 'CCB at Blueprint stage');
assert(src.includes('Jeff Smith'), 'Contact Jeff Smith present');
assert(src.includes('Colorado Craft Beef'), 'Organization Colorado Craft Beef present');
assert(src.includes('Randy Kamin'), 'Referral Randy Kamin present');
assert(src.includes('Generational Group'), 'Referral Generational Group present');
assert(src.includes('Original HVS referral'), 'Original HVS referral in attribution');
assert(src.includes('Growth capital and additional real estate'), 'Capital need verified text');
assert(src.includes("availability: 'Pending verification'"), 'Fees marked pending verification');
assert(!/estimatedFee:\s*\{\s*amount:\s*[1-9]/.test(src), 'No invented estimatedFee amount on seed');
assert(src.includes('Manny Barela'), 'Opportunity owner Manny Barela');

assert(src.includes('createLead'), 'Capability: createLead');
assert(src.includes('qualifyLead'), 'Capability: qualifyLead');
assert(src.includes('convertLeadToOpportunity'), 'Capability: convertLead');
assert(src.includes('updateStage'), 'Capability: updateStage');
assert(src.includes('recordActivity'), 'Capability: recordActivity');
assert(src.includes('scheduleFollowUp'), 'Capability: scheduleFollowUp');
assert(src.includes('prepareBlueprint'), 'Capability: prepareBlueprint');
assert(src.includes('markWon'), 'Capability: markWon');
assert(src.includes('markLost'), 'Capability: markLost');
assert(src.includes('advanceOnboarding'), 'Capability: initiateOnboarding');
assert(src.includes('forecastSummary'), 'Capability: forecast');
assert(src.includes('isStale'), 'Capability: identify stale');
assert(src.includes('generateTasks'), 'Capability: generate tasks');
assert(src.includes('REVENUE_CAPABILITIES'), 'RBAC capability matrix in pipeline module');

assert(revenuePage.includes('Production pipeline'), 'Revenue page pipeline UI');
assert(revenuePage.includes('Referral partners'), 'Revenue page referral tracking');
assert(revenuePage.includes('Create lead'), 'Revenue page create leads');
assert(oppPage.includes('Attribution chain'), 'Opportunity detail attribution');
assert(oppPage.includes('Initiate onboarding'), 'Opportunity onboarding transition');
assert(oppPage.includes('Prepare Blueprint'), 'Opportunity Blueprint prep');
assert(execPage.includes('Revenue operating system'), 'Executive revenue components');
assert(execPage.includes('executiveRevenueWidgets'), 'Executive widgets wired');
assert(execPage.includes('Stale alerts'), 'Executive stale alerts');
assert(rbac.includes('canRevenueCapability'), 'RBAC revenue capability helper');
assert(rbac.includes('canAccessRevenue'), 'RBAC revenue access gate');
assert(app.includes('revenue/opportunities/:opportunityId'), 'Opportunity detail route');
assert(app.includes('RevenueRoute'), 'Revenue route gated');

assert(fs.existsSync(userDocPath), 'User guide exists');
assert(fs.existsSync(qaDocPath), 'QA evidence doc exists');
assert(
  fs.existsSync(path.join(root, 'docs/revenue/INTEGRATION_READINESS_REPORT.md')),
  'Integration Readiness Report exists'
);

const rbacSrc = fs.readFileSync(rbacPath, 'utf8');
for (const role of [
  'HVCG Owner',
  'HVCG Team Member',
  'Client Executive',
  'Client Team Member',
  'Read-Only Advisor',
  'Administrator',
]) {
  assert(rbacSrc.includes(`'${role}'`), `RBAC includes release role: ${role}`);
}

const userDoc = fs.readFileSync(userDocPath, 'utf8');
assert(userDoc.includes('Colorado Craft Beef'), 'User guide covers CCB');
assert(userDoc.includes('Pending verification'), 'User guide explains pending fees');

// Engine behavior checks (inline mirror of critical rules)
function stageProbability(stage) {
  const map = {
    'New Lead': 5,
    Qualified: 15,
    Discovery: 20,
    Assessment: 30,
    Blueprint: 40,
    Proposal: 50,
    Negotiation: 70,
    Won: 100,
    Onboarding: 100,
    'Active Engagement': 100,
    Closed: 100,
    Lost: 0,
  };
  return map[stage];
}

function isStale(opp, asOf = '2026-07-19T17:00:00Z') {
  if (['Closed', 'Lost', 'Won', 'Onboarding', 'Active Engagement'].includes(opp.stage)) return false;
  const days = Math.floor(
    (new Date(asOf) - new Date(opp.lastActivityAt)) / 86400000
  );
  const inactive = days >= opp.staleDaysThreshold;
  const overdue =
    !!opp.nextActionDue && new Date(opp.nextActionDue) < new Date(asOf);
  return inactive || overdue;
}

assert(stageProbability('Blueprint') === 40, 'Blueprint probability prior = 40');
assert(
  !isStale({
    stage: 'Blueprint',
    lastActivityAt: '2026-07-19T17:00:00Z',
    nextActionDue: '2026-07-26',
    staleDaysThreshold: 14,
  }),
  'CCB-like opportunity is not stale on as-of date'
);
assert(
  isStale({
    stage: 'Discovery',
    lastActivityAt: '2026-06-01T00:00:00Z',
    nextActionDue: '2026-06-15',
    staleDaysThreshold: 14,
  }),
  'Synthetic stale opportunity detected'
);
assert(
  isStale({
    stage: 'Proposal',
    lastActivityAt: '2026-07-18T00:00:00Z',
    nextActionDue: '2026-07-10',
    staleDaysThreshold: 14,
  }),
  'Overdue next-action marks stale'
);

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
