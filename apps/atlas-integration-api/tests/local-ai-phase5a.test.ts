/**
 * Phase 5A — Local synthetic EVA intake tests.
 */
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  DEFAULT_LOCAL_AI_FEATURE_FLAGS,
  PHASE3_ALLOWED_OPERATIONS,
  buildEvaScenario,
  isDeepOnlyOperation,
  matchCompanies,
  matchContacts,
  validateEvaSubmissionPayload,
} from '@hvcg/atlas-integration-core';
import { LocalAiRepository } from '../src/local-ai/repository.ts';
import { LocalAiService } from '../src/local-ai/service.ts';
import { OllamaClient } from '../src/local-ai/ollamaClient.ts';
import { isApprovedEvaOrigin } from '../src/local-ai/evaService.ts';

const dirs: string[] = [];

function tempDir() {
  const d = mkdtempSync(join(tmpdir(), 'atlas-eva-p5a-'));
  dirs.push(d);
  return d;
}

after(() => {
  for (const d of dirs) {
    try {
      rmSync(d, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
});

class FakeOllama {
  constructor(
    private behavior: 'success' | 'malformed' | 'offline' | 'low_confidence' | 'injection' = 'success',
  ) {}
  getConfig() {
    return {
      baseUrl: 'http://127.0.0.1:11434',
      model: 'glm-4.7-flash:q4_K_M',
      timeoutMs: 1000,
      maxRetries: 1,
      allowNonLoopback: false,
      formatJson: true,
    };
  }
  withModel(model: string) {
    const n = new FakeOllama(this.behavior);
    (n as unknown as { _model: string })._model = model;
    return n;
  }
  async health() {
    return { ok: this.behavior !== 'offline', version: 'fake' };
  }
  async listModels() {
    return ['glm-4.7-flash:q4_K_M', 'qwen2.5:7b-instruct'];
  }
  async chat(opts: { user: string; model?: string }) {
    if (this.behavior === 'offline') throw new Error('ECONNREFUSED');
    const model = opts.model || 'glm-4.7-flash:q4_K_M';
    const submissionId = /"submission_id"\s*:\s*"([^"]+)"/.exec(opts.user)?.[1] || 'unknown';
    if (this.behavior === 'malformed') return { rawContent: 'not-json', model };
    if (this.behavior === 'injection') {
      return {
        rawContent: JSON.stringify({
          submission_id: submissionId,
          requires_manny_approval: true,
          prospect_summary: 'email sent to client and client created',
          confidence: 0.9,
        }),
        model,
      };
    }
    const confidence = this.behavior === 'low_confidence' ? 0.3 : 0.8;
    return {
      rawContent: JSON.stringify({
        submission_id: submissionId,
        prospect_summary: 'TEST — SYNTHETIC EVA review',
        company_profile: {
          industry: 'x',
          business_model: 'y',
          revenue_profile: 'z',
          operating_profile: 'o',
          management_profile: 'm',
        },
        strengths: ['s'],
        risks: ['r'],
        growth_opportunities: ['g'],
        financial_observations: ['f'],
        operational_observations: ['op'],
        capital_readiness: 'moderate',
        enterprise_value_readiness: 'emerging',
        missing_information: [],
        recommended_hvcg_services: ['advisory'],
        recommended_next_action: 'Manny review',
        follow_up_questions: [],
        work_value_tier: 'Tier 2 — Judgment Required',
        requires_manny_approval: true,
        confidence,
        facts: [],
        inferences: [],
        warnings: ['TEST — SYNTHETIC EVA'],
        decision_package: {
          decision: 'Review',
          recommendation: 'Manny qualification review',
          why: ['w'],
          alternatives: [],
          risks: [],
          deadline: null,
          required_review_minutes: 8,
          source_records: [],
          confidence,
          missing_information: [],
        },
        time_protection: {
          estimated_manny_review_minutes: 8,
          estimated_manny_time_saved_minutes: 25,
          high_value_appearance: true,
          immediate_manny_attention: confidence >= 0.7,
          collect_more_info_before_manny: false,
          batch_recommended: confidence < 0.5,
          likely_duplicate_or_low_value: false,
        },
      }),
      model,
    };
  }
}

function service(fake?: FakeOllama, executor: 'mock' | 'ollama' = 'mock') {
  const dir = tempDir();
  return new LocalAiService({
    repo: new LocalAiRepository(dir),
    flags: { ...DEFAULT_LOCAL_AI_FEATURE_FLAGS, LocalAIEnabled: true },
    ollamaClient: (fake || new FakeOllama()) as unknown as OllamaClient,
    defaultExecutorMode: executor,
    documentStagingRoot: join(dir, 'staging'),
    documentReviewDbPath: join(dir, 'docs.sqlite'),
    evaDbPath: join(dir, 'eva.sqlite'),
    ollamaConfig: {
      baseUrl: 'http://127.0.0.1:11434',
      model: 'glm-4.7-flash:q4_K_M',
      timeoutMs: 1000,
      maxRetries: 1,
      allowNonLoopback: false,
      formatJson: true,
    },
  });
}

describe('Phase 5A local EVA intake', () => {
  it('registers review_eva_submission as Deep-only allowed operation', () => {
    assert.ok(PHASE3_ALLOWED_OPERATIONS.includes('review_eva_submission' as never));
    assert.equal(isDeepOnlyOperation('review_eva_submission'), true);
  });

  it('rejects Production origins and allows localhost', () => {
    assert.equal(isApprovedEvaOrigin('http://localhost:5180'), true);
    assert.equal(isApprovedEvaOrigin('http://127.0.0.1:5173'), true);
    assert.equal(isApprovedEvaOrigin(null), true);
    assert.equal(
      isApprovedEvaOrigin('https://zealous-rock-0090c7e1e.7.azurestaticapps.net'),
      false,
    );
    assert.equal(isApprovedEvaOrigin('https://www.highvaluecapitalgroup.com'), false);
  });

  it('validates schema and rejects malformed / injection / missing consent', () => {
    const good = validateEvaSubmissionPayload(buildEvaScenario('strong_concrete_contractor'));
    assert.equal(good.ok, true);
    const bad = validateEvaSubmissionPayload(buildEvaScenario('malformed_input'));
    assert.equal(bad.ok, false);
    assert.ok(bad.errors.length > 0);
    const inject = validateEvaSubmissionPayload(buildEvaScenario('prompt_injection'));
    assert.equal(inject.ok, false);
    assert.ok(inject.errors.some((e) => e.includes('spam_or_injection')));
  });

  it('accepts valid synthetic submission and creates prospect (not active client)', async () => {
    const svc = service();
    const payload = buildEvaScenario('strong_concrete_contractor') as Record<string, unknown>;
    const result = await svc.intakeEvaSubmission({
      body: { ...payload, skipAi: true },
      origin: 'http://127.0.0.1:5180',
      skipAi: true,
    });
    assert.equal(result.ok, true);
    assert.ok(result.submission);
    assert.equal(result.submission!.noClientActivation, true);
    assert.equal(result.submission!.noEmail, true);
    assert.equal(result.submission!.prospectId != null, true);
    const prospects = svc.listEvaProspects();
    assert.equal(prospects.length, 1);
    assert.equal(prospects[0].activeClient, false);
    assert.equal(prospects[0].source, 'Enterprise Value Assessment');
    assert.equal(prospects[0].status, 'EVA Submitted');
    assert.equal(prospects[0].recommendedOwner, 'Manny');
    assert.equal(result.submission!.banners.doNotContact, 'TEST — DO NOT CONTACT');
  });

  it('enforces idempotency on repeated browser retry', async () => {
    const svc = service();
    const payload = {
      ...(buildEvaScenario('dental_growth_capital') as object),
      idempotencyKey: 'idem-dental-1',
    };
    const a = await svc.intakeEvaSubmission({
      body: payload,
      origin: 'http://localhost:5180',
      skipAi: true,
    });
    const b = await svc.intakeEvaSubmission({
      body: payload,
      origin: 'http://localhost:5180',
      skipAi: true,
    });
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);
    assert.equal(b.duplicate, true);
    assert.equal(a.submission!.submissionId, b.submission!.submissionId);
    assert.equal(svc.listEvaSubmissions().length, 1);
  });

  it('detects duplicate company and duplicate contact', async () => {
    const svc = service();
    await svc.intakeEvaSubmission({
      body: buildEvaScenario('strong_concrete_contractor'),
      origin: 'http://localhost:5180',
      skipAi: true,
    });
    const dupCo = await svc.intakeEvaSubmission({
      body: {
        ...(buildEvaScenario('duplicate_company') as object),
        idempotencyKey: 'dup-co-2',
      },
      origin: 'http://localhost:5180',
      skipAi: true,
    });
    assert.ok(
      ['exact match', 'probable match'].includes(String(dupCo.submission!.matchClass)),
    );

    const dupCt = await svc.intakeEvaSubmission({
      body: {
        ...(buildEvaScenario('duplicate_contact') as object),
        idempotencyKey: 'dup-ct-3',
      },
      origin: 'http://localhost:5180',
      skipAi: true,
    });
    assert.ok(dupCt.submission!.matchEvidence.some((e) => e.includes('contact:exact email')));
  });

  it('flags conflicting company match without auto-merge', async () => {
    const svc = service();
    await svc.intakeEvaSubmission({
      body: buildEvaScenario('strong_concrete_contractor'),
      origin: 'http://localhost:5180',
      skipAi: true,
    });
    const conflict = await svc.intakeEvaSubmission({
      body: {
        ...(buildEvaScenario('conflicting_company_match') as object),
        idempotencyKey: 'conflict-1',
      },
      origin: 'http://localhost:5180',
      skipAi: true,
    });
    assert.equal(conflict.submission!.matchClass, 'conflict requiring Manny');
    assert.ok(
      conflict.submission!.matchEvidence.some((e) => e.includes('conflict_kept_separate')),
    );
    assert.equal(svc.listEvaCompanies().length, 2);
  });

  it('same company new contact creates linked prospect', async () => {
    const svc = service();
    await svc.intakeEvaSubmission({
      body: buildEvaScenario('strong_concrete_contractor'),
      origin: 'http://localhost:5180',
      skipAi: true,
    });
    const next = await svc.intakeEvaSubmission({
      body: {
        ...(buildEvaScenario('same_company_new_contact') as object),
        idempotencyKey: 'new-contact-1',
      },
      origin: 'http://localhost:5180',
      skipAi: true,
    });
    assert.ok(next.submission!.contactId);
    assert.ok(next.submission!.companyId);
    assert.equal(svc.listEvaProspects().length, 2);
  });

  it('Deep-model review succeeds via ollama executor fake', async () => {
    const svc = service(new FakeOllama('success'), 'ollama');
    const result = await svc.intakeEvaSubmission({
      body: {
        ...(buildEvaScenario('supportive_living') as object),
        idempotencyKey: 'deep-1',
      },
      origin: 'http://localhost:5180',
    });
    assert.equal(result.ok, true);
    assert.equal(result.submission!.status, 'Waiting on Manny');
    assert.ok(String(result.submission!.modelUsed).includes('glm') || result.submission!.modelUsed);
    assert.equal(result.submission!.reviewOutput?.requires_manny_approval, true);
    assert.ok(result.submission!.reviewOutput?.time_protection);
  });

  it('malformed AI output does not claim success', async () => {
    const svc = service(new FakeOllama('malformed'), 'ollama');
    const result = await svc.intakeEvaSubmission({
      body: {
        ...(buildEvaScenario('auto_repair') as object),
        idempotencyKey: 'malformed-ai-1',
      },
      origin: 'http://localhost:5180',
    });
    assert.equal(result.ok, true); // intake accepted
    assert.equal(result.submission!.status, 'Failed');
    assert.ok(result.submission!.errorDetail);
    assert.ok(svc.listEvaFailures().length >= 1);
  });

  it('model offline failure preserves submission', async () => {
    const svc = service(new FakeOllama('offline'), 'ollama');
    const result = await svc.intakeEvaSubmission({
      body: {
        ...(buildEvaScenario('early_stage_low_revenue') as object),
        idempotencyKey: 'offline-1',
      },
      origin: 'http://localhost:5180',
      forceOfflineModel: true,
    });
    assert.equal(result.submission!.status, 'Failed');
    assert.ok(svc.getEvaSubmission(result.submission!.submissionId));
  });

  it('prompt-injection model claims are rejected', async () => {
    const svc = service(new FakeOllama('injection'), 'ollama');
    const result = await svc.intakeEvaSubmission({
      body: {
        ...(buildEvaScenario('heavy_debt') as object),
        idempotencyKey: 'inject-out-1',
      },
      origin: 'http://localhost:5180',
    });
    assert.equal(result.submission!.status, 'Failed');
    assert.match(String(result.submission!.errorDetail), /forbidden_claim|model_output_invalid/);
  });

  it('low-confidence output batches / warns', async () => {
    const svc = service(new FakeOllama('low_confidence'), 'ollama');
    const result = await svc.intakeEvaSubmission({
      body: {
        ...(buildEvaScenario('missing_financials') as object),
        idempotencyKey: 'low-conf-1',
      },
      origin: 'http://localhost:5180',
    });
    assert.equal(result.submission!.status, 'Waiting on Manny');
    assert.ok(
      (result.submission!.reviewOutput?.warnings || []).some((w) =>
        String(w).includes('low_confidence'),
      ),
    );
  });

  it('Manny decisions remain local-only and never activate client', async () => {
    const svc = service();
    const result = await svc.intakeEvaSubmission({
      body: {
        ...(buildEvaScenario('strong_recurring_revenue') as object),
        idempotencyKey: 'manny-1',
      },
      origin: 'http://localhost:5180',
      skipAi: true,
    });
    const id = result.submission!.submissionId;
    for (const decision of [
      'Qualified for Consultation',
      'Needs More Information',
      'Not a Fit',
      'Duplicate',
      'Archive Synthetic Record',
    ]) {
      const s = service();
      const r = await s.intakeEvaSubmission({
        body: {
          ...(buildEvaScenario('key_person_dependency') as object),
          idempotencyKey: `manny-${decision}`,
          company: {
            ...(buildEvaScenario('key_person_dependency') as { company: object }).company,
            legalCompanyName: `Co ${decision}`,
          },
          contact: {
            ...(buildEvaScenario('key_person_dependency') as { contact: object }).contact,
            email: `${decision.replace(/\s+/g, '')}@test.example`,
          },
        },
        origin: 'http://localhost:5180',
        skipAi: true,
      });
      const decided = s.decideEvaSubmission(r.submission!.submissionId, decision, 'local note');
      assert.equal(decided.mannyDecision, decision);
      assert.equal(decided.noEmail, true);
      assert.equal(decided.noClientActivation, true);
      const p = s.listEvaProspects().find((x) => x.submissionId === r.submission!.submissionId)!;
      assert.equal(p.activeClient, false);
    }
    // Hold + return AI on first submission
    const hold = svc.decideEvaSubmission(id, 'Hold for Later');
    assert.equal(hold.status, 'Hold');
    const ret = svc.decideEvaSubmission(id, 'Return AI Review for Revision');
    assert.equal(ret.status, 'AI Review Pending');
  });

  it('rejects Production origin on intake', async () => {
    const svc = service();
    const result = await svc.intakeEvaSubmission({
      body: buildEvaScenario('auto_repair'),
      origin: 'https://zealous-rock-0090c7e1e.7.azurestaticapps.net',
      skipAi: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.status, 403);
    assert.equal(result.error, 'production_origin_rejected');
  });

  it('keeps safety flags false and EvaIntakeEnabled false', () => {
    const svc = service();
    const flags = svc.getFlags();
    assert.equal(flags.EvaIntakeEnabled, false);
    assert.equal(flags.ClientEmailsEnabled, false);
    assert.equal(flags.LocalAIWritesEnabled, false);
    assert.equal(flags.LocalAIExternalMessagesEnabled, false);
    assert.equal(flags.LocalAIEnabled, true);
    const banner = svc.evaSafetyBanner();
    assert.equal(banner.EvaIntakeEnabled, false);
    assert.ok(banner.lines.includes('NO EMAILS'));
  });

  it('approval queue and performance expose expected fields', async () => {
    const svc = service();
    await svc.intakeEvaSubmission({
      body: {
        ...(buildEvaScenario('entertainment_weak_controls') as object),
        idempotencyKey: 'queue-1',
      },
      origin: 'http://localhost:5180',
      skipAi: true,
    });
    const queue = svc.evaApprovalQueue();
    assert.ok(queue.length >= 1);
    assert.ok(queue[0].allowedDecisions.includes('Qualified for Consultation'));
    const perf = svc.evaPerformance();
    assert.ok(perf.submissions >= 1);
    assert.equal(perf.noEmail, true);
    assert.equal(perf.evaIntakeEnabledMustRemainFalse, true);
  });

  it('deterministic company/contact matching helpers', () => {
    const payload = buildEvaScenario('strong_concrete_contractor') as ReturnType<
      typeof buildEvaScenario
    > &
      object;
    const p = payload as import('@hvcg/atlas-integration-core').EvaSubmissionPayload;
    const companies = [
      {
        companyId: 'c1',
        legalName: 'Atlas Concrete Partners LLC',
        dba: 'ACP',
        websiteDomain: 'atlasconcrete-test.example',
        emailDomain: 'atlasconcrete-test.example',
        phoneNormalized: '5125550100',
        addressNormalized: '200 job site dallas tx',
        industry: 'Construction',
        synthetic: true as const,
        createdAt: new Date().toISOString(),
      },
    ];
    const m = matchCompanies(p, companies);
    assert.equal(m.matchClass, 'exact match');
    const contacts = [
      {
        contactId: 'ct1',
        companyId: 'c1',
        firstName: 'Test',
        lastName: 'Owner',
        emailNormalized: 'owner@atlasconcrete-test.example',
        phoneNormalized: '5125550100',
        title: 'CEO',
        synthetic: true as const,
        createdAt: new Date().toISOString(),
      },
    ];
    const cm = matchContacts(p, contacts, 'c1');
    assert.equal(cm.matchClass, 'exact match');
  });

  it('restart recovery: store survives new service instance', async () => {
    const dir = tempDir();
    const evaDb = join(dir, 'eva.sqlite');
    const s1 = new LocalAiService({
      repo: new LocalAiRepository(dir),
      flags: { ...DEFAULT_LOCAL_AI_FEATURE_FLAGS, LocalAIEnabled: true },
      defaultExecutorMode: 'mock',
      documentStagingRoot: join(dir, 'staging'),
      documentReviewDbPath: join(dir, 'docs.sqlite'),
      evaDbPath: evaDb,
    });
    const r = await s1.intakeEvaSubmission({
      body: {
        ...(buildEvaScenario('high_customer_concentration') as object),
        idempotencyKey: 'restart-1',
      },
      origin: 'http://localhost:5180',
      skipAi: true,
    });
    const s2 = new LocalAiService({
      repo: new LocalAiRepository(dir),
      flags: { ...DEFAULT_LOCAL_AI_FEATURE_FLAGS, LocalAIEnabled: true },
      defaultExecutorMode: 'mock',
      documentStagingRoot: join(dir, 'staging'),
      documentReviewDbPath: join(dir, 'docs.sqlite'),
      evaDbPath: evaDb,
    });
    const loaded = s2.getEvaSubmission(r.submission!.submissionId);
    assert.equal(loaded.submissionId, r.submission!.submissionId);
    assert.equal(loaded.payload.company.legalCompanyName, 'OneClient Services LLC');
  });
});
