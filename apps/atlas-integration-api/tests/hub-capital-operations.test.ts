import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { AI_DISCLAIMER, LEGAL_COMPLIANCE_REVIEW_REQUIRED } from '@hvcg/atlas-capital-core';
import { loadConfig, type AppConfig } from '../src/config.ts';
import { buildRegistry } from '../src/connectors/registry.ts';
import { handleRequest } from '../src/http/router.ts';
import { createLocalAiAdapter } from '../src/local-ai/adapter.ts';
import { createAuthorizedPmRepository } from '../src/pm/backend.ts';
import { IntegrationRepository } from '../src/store/repository.ts';
import { CapitalStore } from '../src/capital/store.ts';

function invalidToken(): never {
  const err = new Error('Invalid or expired Microsoft token') as Error & { status: number; code: string };
  err.status = 401;
  err.code = 'invalid_token';
  throw err;
}

async function syntheticVerify(token: string): Promise<Record<string, unknown>> {
  if (token === 'valid-member') {
    return { oid: 'user-1', preferred_username: 'member@example.com', roles: ['HVCG Team Member'], scp: 'access_as_user' };
  }
  if (token === 'valid-owner') {
    return { oid: 'user-owner', preferred_username: 'manny@example.com', roles: ['HVCG Owner'], scp: 'access_as_user' };
  }
  if (token === 'valid-admin') {
    return { oid: 'user-admin', preferred_username: 'admin@example.com', roles: ['Administrator'], scp: 'access_as_user' };
  }
  if (token === 'valid-other') {
    return { oid: 'user-other', preferred_username: 'other@example.com', roles: ['HVCG Team Member'], scp: 'access_as_user' };
  }
  if (token === 'valid-empty') {
    return { oid: 'user-empty', preferred_username: 'empty@example.com', roles: ['HVCG Team Member'], scp: 'access_as_user' };
  }
  if (token === 'valid-star') {
    return { oid: 'user-star', preferred_username: 'star@example.com', roles: ['HVCG Owner'], scp: 'access_as_user' };
  }
  invalidToken();
}

async function resolveAllowedClientIds(oid: string | undefined): Promise<string[]> {
  if (oid === 'user-1' || oid === 'user-owner') return ['SYN01'];
  if (oid === 'user-other') return ['ACCG01'];
  if (oid === 'user-star') return ['*'];
  return [];
}

function headers(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
}

async function withCapitalHub(fn: (ctx: { base: string; dataDir: string }) => Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-capital-hub-'));
  const prev = {
    NODE_ENV: process.env.NODE_ENV,
    REQUIRE: process.env.INTEGRATION_REQUIRE_AUTH,
    INSECURE: process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH,
    HOST: process.env.INTEGRATION_HOST,
    KEY: process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY,
    TENANT: process.env.MICROSOFT_TENANT_ID,
    DATA: process.env.INTEGRATION_DATA_DIR,
    CAPITAL: process.env.INTEGRATION_CAPITAL_BACKEND,
  };
  process.env.NODE_ENV = 'development';
  process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
  process.env.INTEGRATION_HOST = '127.0.0.1';
  process.env.MICROSOFT_TENANT_ID = '11111111-1111-1111-1111-111111111111';
  process.env.INTEGRATION_DATA_DIR = dir;
  process.env.INTEGRATION_CAPITAL_BACKEND = 'development-json';
  delete process.env.INTEGRATION_REQUIRE_AUTH;
  delete process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH;
  const cfg: AppConfig = {
    ...loadConfig(),
    verifyAccessToken: syntheticVerify,
    resolveAllowedClientIds,
  };
  const repo = new IntegrationRepository(dir, cfg.tokenEncryptionKeyB64);
  const pm = createAuthorizedPmRepository(cfg);
  const app = buildRegistry(cfg, repo);
  const capital = new CapitalStore(dir, { seedSyntheticLenders: true });
  const localAi = createLocalAiAdapter({
    env: { LOCAL_AI_ENABLED: undefined },
    secretsFileEnv: {},
  });
  const server = createServer((req, res) => {
    handleRequest({ cfg, repo, app, pm, localAi, capital }, req, res).catch((err) => {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'server_error', message: String(err) }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as AddressInfo).port;
  try {
    await fn({ base: `http://127.0.0.1:${port}`, dataDir: dir });
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    rmSync(dir, { recursive: true, force: true });
    if (prev.NODE_ENV === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prev.NODE_ENV;
    if (prev.REQUIRE === undefined) delete process.env.INTEGRATION_REQUIRE_AUTH;
    else process.env.INTEGRATION_REQUIRE_AUTH = prev.REQUIRE;
    if (prev.INSECURE === undefined) delete process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH;
    else process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH = prev.INSECURE;
    if (prev.HOST === undefined) delete process.env.INTEGRATION_HOST;
    else process.env.INTEGRATION_HOST = prev.HOST;
    if (prev.KEY === undefined) delete process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY;
    else process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = prev.KEY;
    if (prev.TENANT === undefined) delete process.env.MICROSOFT_TENANT_ID;
    else process.env.MICROSOFT_TENANT_ID = prev.TENANT;
    if (prev.DATA === undefined) delete process.env.INTEGRATION_DATA_DIR;
    else process.env.INTEGRATION_DATA_DIR = prev.DATA;
    if (prev.CAPITAL === undefined) delete process.env.INTEGRATION_CAPITAL_BACKEND;
    else process.env.INTEGRATION_CAPITAL_BACKEND = prev.CAPITAL;
  }
}

const SYN_OPP = {
  title: 'SYNTHETIC Capital Co working capital',
  clientCode: 'SYN01',
  clientId: 'SYN01',
  transactionType: 'working_capital_loc',
  need: { requestedAmount: 500_000, purpose: 'working capital', useOfFunds: 'payroll and inventory' },
  business: {
    industry: 'manufacturing',
    annualRevenue: { value: 4_200_000, verification: 'VERIFIED', confidence: 1, sourceRef: { sourceSystem: 'synthetic-fixture', capturedAt: '2026-08-01T00:00:00.000Z' } },
  },
  transaction: { workingCapitalComponent: true },
  idempotencyKey: 'syn-cap-001',
};

describe('Hub capital operations API', () => {
  it('requires auth on capital routes', async () => {
    await withCapitalHub(async ({ base }) => {
      const res = await fetch(`${base}/api/capital/opportunities`);
      assert.equal(res.status, 401);
      const body = (await res.json()) as { error: string };
      assert.equal(body.error, 'unauthorized');
    });
  });

  it('returns 400 for malformed JSON without leaking a stack', async () => {
    await withCapitalHub(async ({ base }) => {
      const res = await fetch(`${base}/api/capital/opportunities`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: '{"title":',
      });
      assert.equal(res.status, 400);
      const body = (await res.json()) as { error: string; code?: string; stack?: string };
      assert.equal(body.error, 'malformed_json');
      assert.equal(body.code, 'malformed_json');
      assert.equal(body.stack, undefined);
      assert.doesNotMatch(JSON.stringify(body), /at /);
    });
  });

  it('enforces client isolation and empty staff scope', async () => {
    await withCapitalHub(async ({ base }) => {
      const empty = await fetch(`${base}/api/capital/opportunities`, { headers: headers('valid-empty') });
      assert.equal(empty.status, 403);

      const created = await fetch(`${base}/api/capital/opportunities`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: JSON.stringify(SYN_OPP),
      });
      assert.equal(created.status, 200);
      const createdBody = (await created.json()) as { opportunity: { id: string; clientCode: string } };
      assert.equal(createdBody.opportunity.clientCode, 'SYN01');

      const otherCreate = await fetch(`${base}/api/capital/opportunities`, {
        method: 'POST',
        headers: headers('valid-other'),
        body: JSON.stringify({ ...SYN_OPP, idempotencyKey: 'other-attempt' }),
      });
      assert.equal(otherCreate.status, 403);

      const otherList = await fetch(`${base}/api/capital/opportunities`, { headers: headers('valid-other') });
      assert.equal(otherList.status, 200);
      const otherListBody = (await otherList.json()) as { opportunities: Array<{ clientCode: string }> };
      assert.equal(otherListBody.opportunities.length, 0);

      const otherGet = await fetch(`${base}/api/capital/opportunities/${createdBody.opportunity.id}`, {
        headers: headers('valid-other'),
      });
      assert.equal(otherGet.status, 404);
    });
  });

  it('creates, transitions, checklists, documents, strategy, matching, application, submission, fees, and handoffs', async () => {
    await withCapitalHub(async ({ base, dataDir }) => {
      const created = await fetch(`${base}/api/capital/opportunities`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: JSON.stringify(SYN_OPP),
      });
      assert.equal(created.status, 200);
      const { opportunity } = (await created.json()) as {
        opportunity: { id: string; title: string; clientCode: string; stage: string };
      };
      assert.equal(opportunity.clientCode, 'SYN01');
      assert.match(opportunity.title, /SYNTHETIC Capital Co/);
      assert.equal(opportunity.stage, 'NeedIdentified');

      const again = await fetch(`${base}/api/capital/opportunities`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: JSON.stringify(SYN_OPP),
      });
      const againBody = (await again.json()) as { opportunity: { id: string } };
      assert.equal(againBody.opportunity.id, opportunity.id);

      const skip = await fetch(`${base}/api/capital/opportunities/${opportunity.id}/transition`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: JSON.stringify({ to: 'Funded' }),
      });
      assert.equal(skip.status, 409);
      const skipBody = (await skip.json()) as { error: string };
      assert.equal(skipBody.error, 'invalid_stage_transition');

      const step = await fetch(`${base}/api/capital/opportunities/${opportunity.id}/transition`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: JSON.stringify({ to: 'InitialQualification' }),
      });
      assert.equal(step.status, 200);

      const gen = await fetch(`${base}/api/capital/opportunities/${opportunity.id}/checklist/generate`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: '{}',
      });
      assert.equal(gen.status, 200);
      const genBody = (await gen.json()) as { checklist: Array<{ itemKey: string; id: string }> };
      assert.ok(genBody.checklist.some((i) => i.itemKey === 'ar-aging'));
      const itemId = genBody.checklist[0].id;

      const listed = await fetch(`${base}/api/capital/opportunities/${opportunity.id}/checklist`, {
        headers: headers('valid-member'),
      });
      assert.equal(listed.status, 200);

      const over = await fetch(`${base}/api/capital/opportunities/${opportunity.id}/checklist/${itemId}/override`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: JSON.stringify({ status: 'NOT_APPLICABLE', overrideReason: 'Synthetic fixture override' }),
      });
      assert.equal(over.status, 200);

      const missing = await fetch(`${base}/api/capital/opportunities/${opportunity.id}/missing-request`, {
        headers: headers('valid-member'),
      });
      assert.equal(missing.status, 200);

      const doc = await fetch(`${base}/api/capital/opportunities/${opportunity.id}/documents`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: JSON.stringify({
          fileName: 'SYNTHETIC Capital Co P&L YTD.pdf',
          contentType: 'application/pdf',
          sizeBytes: 12,
          sha256: 'abc',
        }),
      });
      assert.equal(doc.status, 200);
      const docBody = (await doc.json()) as { document: { id: string }; duplicateOf?: string };
      assert.equal(docBody.duplicateOf, undefined);

      const dup = await fetch(`${base}/api/capital/opportunities/${opportunity.id}/documents`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: JSON.stringify({
          fileName: 'copy.pdf',
          contentType: 'application/pdf',
          sizeBytes: 12,
          sha256: 'abc',
        }),
      });
      assert.equal(dup.status, 200);
      const dupBody = (await dup.json()) as { duplicateOf?: string };
      assert.equal(dupBody.duplicateOf, docBody.document.id);

      const review = await fetch(
        `${base}/api/capital/opportunities/${opportunity.id}/documents/${docBody.document.id}/review`,
        {
          method: 'POST',
          headers: headers('valid-member'),
          body: JSON.stringify({
            extractedFacts: [
              {
                field: 'revenue',
                value: 4_200_000,
                verification: 'VERIFIED',
                confidence: 0.9,
                sourceRef: { sourceSystem: 'ai', capturedAt: '2026-08-01T00:00:00.000Z' },
              },
            ],
          }),
        },
      );
      assert.equal(review.status, 200);
      const reviewBody = (await review.json()) as {
        review: { extractedFacts: Array<{ verification: string }>; disclaimer: string; reviewer: string };
      };
      assert.equal(reviewBody.review.extractedFacts[0].verification, 'UNVERIFIED');
      assert.equal(reviewBody.review.reviewer, 'ai');
      assert.ok(reviewBody.review.disclaimer.includes('unverified'));
      assert.ok(AI_DISCLAIMER.length > 10);

      const intel = await fetch(`${base}/api/capital/opportunities/${opportunity.id}/document-intelligence`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: JSON.stringify({ includeUnderwriting: true }),
      });
      assert.equal(intel.status, 200);
      const intelBody = (await intel.json()) as {
        report: { clientRequest?: { sendAttempted?: boolean }; underwriting?: { disclaimer?: string } };
        clientRequestSendAttempted: boolean;
      };
      assert.equal(intelBody.clientRequestSendAttempted, false);
      assert.ok(intelBody.report.underwriting?.disclaimer);

      const sendBlocked = await fetch(`${base}/api/capital/opportunities/${opportunity.id}/document-intelligence`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: JSON.stringify({ send: true }),
      });
      assert.equal(sendBlocked.status, 422);

      const uw = await fetch(`${base}/api/capital/opportunities/${opportunity.id}/underwriting`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: '{}',
      });
      assert.equal(uw.status, 200);

      const strat = await fetch(`${base}/api/capital/opportunities/${opportunity.id}/strategy`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: '{}',
      });
      assert.equal(strat.status, 200);
      const stratBody = (await strat.json()) as { strategy: { mannyApproval: string; disclaimer: string } };
      assert.equal(stratBody.strategy.mannyApproval, 'PENDING');
      assert.ok(stratBody.strategy.disclaimer.toLowerCase().includes('does not guarantee'));

      const staffApprove = await fetch(`${base}/api/capital/opportunities/${opportunity.id}/strategy/decision`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: JSON.stringify({ decision: 'APPROVED' }),
      });
      assert.equal(staffApprove.status, 403);

      const ownerApprove = await fetch(`${base}/api/capital/opportunities/${opportunity.id}/strategy/decision`, {
        method: 'POST',
        headers: headers('valid-owner'),
        body: JSON.stringify({ decision: 'APPROVED' }),
      });
      assert.equal(ownerApprove.status, 200);
      const ownerBody = (await ownerApprove.json()) as { strategy: { mannyApproval: string } };
      assert.equal(ownerBody.strategy.mannyApproval, 'APPROVED');

      const match = await fetch(`${base}/api/capital/opportunities/${opportunity.id}/match`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: '{}',
      });
      assert.equal(match.status, 200);
      const matchBody = (await match.json()) as {
        matches: Array<{
          band: string;
          stale: boolean;
          lenderName: string;
          explanations?: Array<{ sourceRef?: { sourceSystem?: string } }>;
        }>;
        review?: { status: string };
      };
      assert.ok(matchBody.matches.some((m) => m.band === 'BEST_FIT' && m.lenderName.includes('SYNTHETIC')));
      assert.equal(matchBody.review?.status, 'PENDING_MANNY');
      const best = matchBody.matches.find((m) => m.band === 'BEST_FIT');
      assert.ok(best?.explanations?.every((e) => e.sourceRef?.sourceSystem));

      const catalog = await fetch(`${base}/api/capital/lenders`, { headers: headers('valid-member') });
      assert.equal(catalog.status, 200);
      const catalogBody = (await catalog.json()) as {
        lenders: Array<{ name: string; products: Array<{ freshness: string }>; historicalExperience?: unknown }>;
        inventedCriteria: boolean;
      };
      assert.equal(catalogBody.inventedCriteria, false);
      assert.ok(catalogBody.lenders.some((l) => l.name.includes('SYNTHETIC') && l.products.length > 0));

      const staleLender = await fetch(`${base}/api/capital/lenders`, {
        method: 'POST',
        headers: headers('valid-owner'),
        body: JSON.stringify({ name: 'SYNTHETIC Stale Bank' }),
      });
      assert.equal(staleLender.status, 200);
      const staleLenderBody = (await staleLender.json()) as { lender: { id: string } };
      const staleProduct = await fetch(`${base}/api/capital/lenders/${staleLenderBody.lender.id}/products`, {
        method: 'POST',
        headers: headers('valid-owner'),
        body: JSON.stringify({
          productName: 'SYNTHETIC Stale WC',
          minAmount: 100_000,
          maxAmount: 1_000_000,
          minRevenue: 2_000_000,
          freshness: 'CURRENT',
          lastVerifiedAt: '2024-01-01T00:00:00.000Z',
          source: 'lender-sheet-synthetic',
          verifiedBy: 'qa',
          confidence: 0.8,
        }),
      });
      assert.equal(staleProduct.status, 200);
      const rematch = await fetch(`${base}/api/capital/opportunities/${opportunity.id}/match`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: '{}',
      });
      const rematchBody = (await rematch.json()) as {
        matches: Array<{ lenderName: string; band: string; stale: boolean }>;
      };
      const staleHit = rematchBody.matches.find((m) => m.lenderName === 'SYNTHETIC Stale Bank');
      assert.ok(staleHit);
      assert.equal(staleHit.stale, true);
      assert.notEqual(staleHit.band, 'BEST_FIT');
      assert.notEqual(staleHit.band, 'POSSIBLE');
      assert.equal(staleHit.band, 'UNKNOWN');

      const shortlistStaff = await fetch(`${base}/api/capital/opportunities/${opportunity.id}/shortlist/decision`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: JSON.stringify({ decision: 'APPROVED' }),
      });
      assert.equal(shortlistStaff.status, 403);

      const shortlistAdmin = await fetch(`${base}/api/capital/opportunities/${opportunity.id}/shortlist/decision`, {
        method: 'POST',
        headers: headers('valid-admin'),
        body: JSON.stringify({ decision: 'APPROVED', lenderIds: ['ln-synthetic-1'] }),
      });
      assert.equal(shortlistAdmin.status, 403);

      const shortlist = await fetch(`${base}/api/capital/opportunities/${opportunity.id}/shortlist/decision`, {
        method: 'POST',
        headers: headers('valid-owner'),
        body: JSON.stringify({ decision: 'APPROVED', lenderIds: ['ln-synthetic-1'] }),
      });
      assert.equal(shortlist.status, 200);

      const incomplete = await fetch(`${base}/api/capital/opportunities`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: JSON.stringify({
          title: 'SYNTHETIC Capital Co incomplete app',
          clientCode: 'SYN01',
          transactionType: 'working_capital_loc',
          need: { requestedAmount: 250_000, purpose: 'wc' },
          business: { annualRevenue: { value: null, verification: 'MISSING', confidence: null } },
          idempotencyKey: 'syn-cap-incomplete',
        }),
      });
      const incompleteOpp = (await incomplete.json()) as { opportunity: { id: string } };
      const appRes = await fetch(`${base}/api/capital/opportunities/${incompleteOpp.opportunity.id}/application`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: JSON.stringify({ lenderId: 'ln-synthetic-1' }),
      });
      assert.equal(appRes.status, 200);
      const appBody = (await appRes.json()) as {
        application: {
          status: string;
          missingFields: Array<{ field: string; requiredFrom: string }>;
          populatedFields: Record<string, unknown>;
        };
      };
      assert.equal(appBody.application.status, 'BLOCKED_MISSING_FIELDS');
      assert.ok(
        appBody.application.missingFields.some(
          (f) => f.field === 'annualRevenue' && f.requiredFrom === 'CLIENT_INPUT_REQUIRED',
        ),
      );
      assert.equal(appBody.application.populatedFields.annualRevenue, undefined);

      const sub = await fetch(`${base}/api/capital/opportunities/${opportunity.id}/submissions`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: JSON.stringify({
          lenderId: 'ln-synthetic-1',
          method: 'portal_instructions',
          status: 'submitted',
          portalInstructions: 'Record only — do not scrape the portal',
        }),
      });
      assert.equal(sub.status, 200);
      const subBody = (await sub.json()) as {
        submission: { status: string };
        recordedOnly: boolean;
        externalSubmitAttempted: boolean;
      };
      assert.equal(subBody.recordedOnly, true);
      assert.equal(subBody.externalSubmitAttempted, false);
      assert.equal(subBody.submission.status, 'submitted');

      const comm = await fetch(`${base}/api/capital/opportunities/${opportunity.id}/communications/classify`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: JSON.stringify({
          text: 'Please provide additional information by 2026-09-01:\n- AR aging\n- Updated P&L',
        }),
      });
      assert.equal(comm.status, 200);
      const commBody = (await comm.json()) as {
        communication: { classification: string; requestedItems: string[]; dueDate?: string };
      };
      assert.equal(commBody.communication.classification, 'REQUEST_FOR_INFORMATION');
      assert.deepEqual(commBody.communication.requestedItems, ['AR aging', 'Updated P&L']);
      assert.equal(commBody.communication.dueDate, '2026-09-01');

      const offerA = await fetch(`${base}/api/capital/opportunities/${opportunity.id}/offers`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: JSON.stringify({
          lenderId: 'ln-synthetic-1',
          lenderName: 'SYNTHETIC Bank',
          interestRate: 9,
          assumptions: ['30-day close'],
        }),
      });
      assert.equal(offerA.status, 200);
      await fetch(`${base}/api/capital/opportunities/${opportunity.id}/offers`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: JSON.stringify({
          lenderId: 'ln-synthetic-stale',
          lenderName: 'SYNTHETIC Stale Bank',
          interestRate: 11,
          assumptions: [],
        }),
      });
      const cmp = await fetch(`${base}/api/capital/opportunities/${opportunity.id}/offers/compare`, {
        headers: headers('valid-member'),
      });
      assert.equal(cmp.status, 200);
      const cmpBody = (await cmp.json()) as { notes: string[]; disclaimer: string };
      assert.ok(cmpBody.notes.some((n) => n.includes('no assumptions')));
      assert.ok(cmpBody.disclaimer.toLowerCase().includes('does not guarantee'));

      const closing = await fetch(`${base}/api/capital/opportunities/${opportunity.id}/closing/generate`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: '{}',
      });
      assert.equal(closing.status, 200);
      const closingBody = (await closing.json()) as { conditions: Array<{ name: string }> };
      assert.ok(closingBody.conditions.length > 0);

      const fee = await fetch(`${base}/api/capital/fees`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: JSON.stringify({
          clientCode: 'SYN01',
          capitalOpportunityId: opportunity.id,
          feeType: 'equity-related success fee',
        }),
      });
      assert.equal(fee.status, 200);
      const feeBody = (await fee.json()) as {
        fee: { legalComplianceReviewRequired: boolean; notes?: string };
      };
      assert.equal(feeBody.fee.legalComplianceReviewRequired, true);
      assert.ok(feeBody.fee.notes?.includes(LEGAL_COMPLIANCE_REVIEW_REQUIRED));

      const evaLow = await fetch(`${base}/api/capital/handoffs/eva`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: JSON.stringify({ clientCode: 'SYN01', annualRevenue: 500_000 }),
      });
      assert.equal(evaLow.status, 200);
      const evaLowBody = (await evaLow.json()) as {
        route: string;
        opportunity: { id: string } | null;
      };
      assert.equal(evaLowBody.route, 'nurture_360');
      assert.equal(evaLowBody.opportunity, null);

      const beforeCount = await fetch(`${base}/api/capital/opportunities`, { headers: headers('valid-member') });
      const beforeList = (await beforeCount.json()) as { opportunities: unknown[] };
      const countAfterNurture = beforeList.opportunities.length;

      const evaHigh = await fetch(`${base}/api/capital/handoffs/eva`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: JSON.stringify({
          clientCode: 'SYN01',
          annualRevenue: 2_000_000,
          title: 'SYNTHETIC Capital Co EVA qualify',
        }),
      });
      const evaHighBody = (await evaHigh.json()) as { route: string; opportunity: { id: string } | null };
      assert.equal(evaHighBody.route, 'atlas_hvcg');
      assert.ok(evaHighBody.opportunity);

      const afterCount = await fetch(`${base}/api/capital/opportunities`, { headers: headers('valid-member') });
      const afterList = (await afterCount.json()) as { opportunities: unknown[] };
      assert.equal(afterList.opportunities.length, countAfterNurture + 1);

      const copilot = await fetch(`${base}/api/capital/handoffs/agent-copilot`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: JSON.stringify({ clientCode: 'SYN01', notes: 'SYNTHETIC copilot brief' }),
      });
      assert.equal(copilot.status, 200);

      const attr = await fetch(`${base}/api/capital/handoffs/attribution`, {
        method: 'POST',
        headers: headers('valid-owner'),
        body: JSON.stringify({
          clientCode: 'SYN01',
          attribution: { source: 'synthetic', campaign: 'qa' },
        }),
      });
      assert.equal(attr.status, 200);

      const cc = await fetch(`${base}/api/capital/command-center`, { headers: headers('valid-member') });
      assert.equal(cc.status, 200);
      const ccBody = (await cc.json()) as { kpis: { activeOpportunities: number } };
      assert.ok(ccBody.kpis.activeOpportunities >= 1);

      const storePath = join(dataDir, 'capital-operations.json');
      assert.equal(existsSync(storePath), true);
      const raw = readFileSync(storePath, 'utf8');
      assert.ok(raw.includes('SYNTHETIC Capital Co'));
      assert.ok(raw.includes('SYN01'));
      assert.equal(raw.toLowerCase().includes('ssn'), false);
    });
  });

  it('rejects wildcard principal, unapproved submission, and member catalog writes', async () => {
    await withCapitalHub(async ({ base }) => {
      const star = await fetch(`${base}/api/capital/opportunities`, { headers: headers('valid-star') });
      assert.equal(star.status, 403);

      const created = await fetch(`${base}/api/capital/opportunities`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: JSON.stringify({ ...SYN_OPP, idempotencyKey: 'syn-cap-gate' }),
      });
      assert.equal(created.status, 200);
      const { opportunity } = (await created.json()) as { opportunity: { id: string } };

      const earlySub = await fetch(`${base}/api/capital/opportunities/${opportunity.id}/submissions`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: JSON.stringify({ lenderId: 'ln-synthetic-1', externalSubmit: true }),
      });
      assert.equal(earlySub.status, 403);

      const memberLender = await fetch(`${base}/api/capital/lenders`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: JSON.stringify({ name: 'SYNTHETIC Blocked Bank' }),
      });
      assert.equal(memberLender.status, 403);

      const memberAttr = await fetch(`${base}/api/capital/handoffs/attribution`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: JSON.stringify({ clientCode: 'SYN01' }),
      });
      assert.equal(memberAttr.status, 403);
    });
  });

  it('runs document intelligence as a draft-only, fail-closed package review', async () => {
    await withCapitalHub(async ({ base }) => {
      const created = await fetch(`${base}/api/capital/opportunities`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: JSON.stringify({ ...SYN_OPP, idempotencyKey: 'syn-cap-docint' }),
      });
      assert.equal(created.status, 200);
      const { opportunity } = (await created.json()) as { opportunity: { id: string } };

      const gen = await fetch(`${base}/api/capital/opportunities/${opportunity.id}/checklist/generate`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: '{}',
      });
      assert.equal(gen.status, 200);

      const doc = await fetch(`${base}/api/capital/opportunities/${opportunity.id}/documents`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: JSON.stringify({
          fileName: 'SYN01 Bank Statement 2024-01.pdf',
          contentType: 'application/pdf',
          sizeBytes: 20,
          sha256: 'docint-1',
        }),
      });
      assert.equal(doc.status, 200);
      const docBody = (await doc.json()) as { document: { id: string; documentType: string } };
      assert.equal(docBody.document.documentType, 'bank_statement');

      const blockedSend = await fetch(`${base}/api/capital/opportunities/${opportunity.id}/document-intelligence`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: JSON.stringify({ sendToClient: true }),
      });
      assert.equal(blockedSend.status, 422);

      const intel = await fetch(`${base}/api/capital/opportunities/${opportunity.id}/document-intelligence`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: JSON.stringify({
          extractedFactsByDocumentId: {
            [docBody.document.id]: [
              {
                field: 'endingBalance',
                value: 12_000,
                verification: 'VERIFIED',
                confidence: 0.8,
                sourceRef: { sourceSystem: 'ai', capturedAt: '2026-08-17T00:00:00.000Z', field: 'endingBalance' },
              },
            ],
          },
        }),
      });
      assert.equal(intel.status, 200);
      const intelBody = (await intel.json()) as {
        clientRequestSendAttempted: boolean;
        report: {
          documents: Array<{
            classification: { documentType: string; verification: string; sourceRef: { field?: string } };
            extraction: { facts: Array<{ verification: string; sourceRef: { sourceSystem: string } }>; ocr: string };
            freshness: { stale: boolean; verification: string };
          }>;
          missingDocuments: Array<{ itemKey: string }>;
          clientRequestSendAttempted: false;
          disclaimer: string;
        };
        checklist: Array<{ status: string; verification: string }>;
      };
      assert.equal(intelBody.clientRequestSendAttempted, false);
      assert.equal(intelBody.report.documents[0].classification.documentType, 'bank_statement');
      assert.equal(intelBody.report.documents[0].extraction.ocr, 'STUBBED_NOT_RUN');
      assert.equal(intelBody.report.documents[0].extraction.facts[0].verification, 'UNVERIFIED');
      assert.ok(intelBody.report.documents[0].extraction.facts[0].sourceRef.sourceSystem);
      assert.equal(intelBody.report.documents[0].freshness.stale, true);
      assert.ok(intelBody.report.missingDocuments.length > 0);
      assert.ok(intelBody.report.disclaimer.toLowerCase().includes('unverified'));
      assert.ok(intelBody.checklist.every((i) => i.verification !== 'VERIFIED'));
      assert.ok(intelBody.checklist.every((i) => i.status !== 'ACCEPTED'));
    });
  });

  it('unauthenticated capital requests remain 401 when the backend is unavailable', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-capital-unavail-'));
    const prev = {
      NODE_ENV: process.env.NODE_ENV,
      KEY: process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY,
      HOST: process.env.INTEGRATION_HOST,
      TENANT: process.env.MICROSOFT_TENANT_ID,
      DATA: process.env.INTEGRATION_DATA_DIR,
      CAPITAL: process.env.INTEGRATION_CAPITAL_BACKEND,
    };
    process.env.NODE_ENV = 'development';
    process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
    process.env.INTEGRATION_HOST = '127.0.0.1';
    process.env.MICROSOFT_TENANT_ID = '11111111-1111-1111-1111-111111111111';
    process.env.INTEGRATION_DATA_DIR = dir;
    process.env.INTEGRATION_CAPITAL_BACKEND = 'unavailable';
    delete process.env.INTEGRATION_REQUIRE_AUTH;
    delete process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH;
    const cfg: AppConfig = {
      ...loadConfig(),
      verifyAccessToken: syntheticVerify,
      resolveAllowedClientIds,
    };
    const repo = new IntegrationRepository(dir, cfg.tokenEncryptionKeyB64);
    const pm = createAuthorizedPmRepository(cfg);
    const app = buildRegistry(cfg, repo);
    const localAi = createLocalAiAdapter({ env: { LOCAL_AI_ENABLED: undefined }, secretsFileEnv: {} });
    const server = createServer((req, res) => {
      handleRequest({ cfg, repo, app, pm, localAi, capital: null }, req, res).catch((err) => {
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'server_error', message: String(err) }));
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as AddressInfo).port;
    const base = `http://127.0.0.1:${port}`;
    try {
      const unauth = await fetch(`${base}/api/capital/opportunities`);
      assert.equal(unauth.status, 401);
      const authed = await fetch(`${base}/api/capital/opportunities`, { headers: headers('valid-member') });
      assert.equal(authed.status, 503);
      const body = (await authed.json()) as { error: string; code: string };
      assert.equal(body.error, 'CAPITAL_BACKEND_UNAVAILABLE');
      assert.equal(body.code, 'CAPITAL_BACKEND_UNAVAILABLE');
    } finally {
      await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
      rmSync(dir, { recursive: true, force: true });
      if (prev.NODE_ENV === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = prev.NODE_ENV;
      if (prev.KEY === undefined) delete process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY;
      else process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = prev.KEY;
      if (prev.HOST === undefined) delete process.env.INTEGRATION_HOST;
      else process.env.INTEGRATION_HOST = prev.HOST;
      if (prev.TENANT === undefined) delete process.env.MICROSOFT_TENANT_ID;
      else process.env.MICROSOFT_TENANT_ID = prev.TENANT;
      if (prev.DATA === undefined) delete process.env.INTEGRATION_DATA_DIR;
      else process.env.INTEGRATION_DATA_DIR = prev.DATA;
      if (prev.CAPITAL === undefined) delete process.env.INTEGRATION_CAPITAL_BACKEND;
      else process.env.INTEGRATION_CAPITAL_BACKEND = prev.CAPITAL;
    }
  });
});
