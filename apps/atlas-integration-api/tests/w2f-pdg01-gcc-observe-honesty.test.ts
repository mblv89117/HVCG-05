/**
 * W2F PDG01 gcc.value_signal.v1 observe-honesty.
 * Signed OBSERVE ingest hydrates into Ask Atlas finance + Live Client text.
 * No Approval Center item. canExecute stays false. Dollar fields are not copied.
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EVENT_GCC_VALUE_SIGNAL, type AtlasIntegrationEnvelope } from '@hvcg/atlas-integration-contracts';
import { handleModuleEnvelope } from '../src/modules/ingest/handlers.ts';
import { projectModuleEnvelopeToOverlay } from '../src/modules/ingest/projectToCommercialOverlay.ts';
import { listGrowth360ApprovalRequests } from '../src/modules/ingest/campaignApproval.ts';
import { loadOverlay } from '../src/pm/commercialContext/store.ts';
import { buildOperatorCommercialContext } from '../src/pm/commercialContext/build.ts';
import { composeClientTruth } from '../src/pm/commercialContext/clientTruth.ts';
import { buildLiveClientPilotBrief } from '../src/pm/commercialContext/liveClientPilot.ts';
import { answerClientOperatingBrief } from '../src/pm/operatorDesk/askAtlasClientOperatingBrief.ts';
import { resetIdentityRegistry } from '../src/identity/registry.ts';
import type { AtlasPrincipal } from '../src/middleware/auth.ts';

const IMPACT = 424242;
const FINDING = `Vendor concentration is elevated ${IMPACT} and $424,242`;
const EVIDENCE = 'Three suppliers cover most recurring delivery';
const SUMMARY = 'Delivery depends on a small supplier set';

function principal(codes: string[]): AtlasPrincipal {
  return {
    userId: 'w2f-pdg01',
    organizationId: 'org-hvcg',
    allowedClientIds: codes,
    roles: ['HVCG Team Member'],
  };
}

function gccEnvelope(partial: Record<string, unknown> = {}): AtlasIntegrationEnvelope {
  const now = '2026-09-22T18:00:00.000Z';
  const payload = {
    organizationId: 'org-prodigy-games-llc',
    signalType: 'constraint',
    summary: SUMMARY,
    finding: FINDING,
    evidence: EVIDENCE,
    financialImpact: IMPACT,
    autoProvision: false,
    ...((partial.payload as Record<string, unknown> | undefined) || {}),
  };
  const { payload: _payload, ...rest } = partial;
  return {
    clientCode: 'PDG01',
    source: 'growth_command_center',
    sourceRecordId: 'gcc-pdg-1',
    schemaVersion: 'gcc-value-signal.v1',
    eventType: EVENT_GCC_VALUE_SIGNAL,
    timestamp: now,
    provenance: { system: 'gcc', observedAt: now, confidence: 'VERIFIED' },
    confidence: 'VERIFIED',
    correlationId: 'corr-w2f-pdg',
    idempotencyKey: 'gcc|PDG01|w2f|1',
    actor: 'gcc-worker',
    authorityClass: 'OBSERVE',
    payload,
    ...rest,
  } as AtlasIntegrationEnvelope;
}

function financeAnswer(clientCode: string, ctx: ReturnType<typeof buildOperatorCommercialContext>): string {
  return answerClientOperatingBrief(`What is the finance picture for ${clientCode}?`, {
    entitledCodes: ['PDG01', 'HFD01', 'ACCG01'],
    explicitClientCode: clientCode,
    commercial: ctx,
  });
}

describe('W2F PDG01 GCC observe-honesty', () => {
  beforeEach(() => {
    resetIdentityRegistry();
  });

  it('hydrates a verified PDG01 signal into finance text without dollars or execute', () => {
    const dir = mkdtempSync(join(tmpdir(), 'w2f-pdg-'));
    const env = gccEnvelope();
    const handled = handleModuleEnvelope(env);
    assert.equal(handled.ok, true);
    if (!handled.ok) return;
    const projected = projectModuleEnvelopeToOverlay(dir, handled.envelope);
    assert.equal(projected.projected, true);
    assert.equal(projected.fixtureOnly, false);

    const overlay = loadOverlay(dir);
    assert.equal(overlay.gccSignals.length, 1);
    assert.equal(overlay.attributions.length, 0);
    const signal = overlay.gccSignals[0]!;
    assert.equal(signal.clientCode, 'PDG01');
    assert.equal(signal.signalType, 'constraint');
    assert.equal(signal.copiesLedger, false);
    assert.match(signal.summary || '', /Delivery depends on a small supplier set/);
    assert.match(signal.summary || '', /Finding: Vendor concentration is elevated and/);
    assert.equal((signal.summary || '').includes('$'), false);
    assert.match(signal.summary || '', /Evidence: Three suppliers cover most recurring delivery/);
    assert.equal(JSON.stringify(signal).includes(String(IMPACT)), false);
    assert.equal(JSON.stringify(signal).includes('org-apex'), false);
    assert.equal('financialImpact' in signal, false);
    assert.equal(listGrowth360ApprovalRequests(dir).length, 0);

    const ctx = buildOperatorCommercialContext({
      principal: principal(['PDG01', 'HFD01', 'ACCG01']),
      overlay,
      clientCode: 'PDG01',
    });
    const truth = composeClientTruth({ clientCode: 'PDG01', commercial: ctx });
    assert.equal('failClosed' in truth, false);
    if ('failClosed' in truth) return;
    assert.equal(truth.canExecute, false);
    assert.equal(truth.capitalSubmit, false);
    assert.match(truth.financialContext.summary, /signalType=constraint/);
    assert.match(truth.financialContext.summary, /Delivery depends on a small supplier set/);
    assert.match(truth.financialContext.summary, /observation-only/);
    assert.match(truth.financialContext.summary, /copiesLedger=false/);
    assert.match(truth.financialContext.summary, /canExecute=false/);
    assert.match(truth.financialContext.summary, /Not a certified ledger/);
    assert.equal(JSON.stringify(truth).includes(String(IMPACT)), false);
    assert.equal(JSON.stringify(truth).includes('org-apex'), false);

    const finance = financeAnswer('PDG01', ctx);
    assert.match(finance, /signalType=constraint/);
    assert.match(finance, /Delivery depends on a small supplier set/);
    assert.match(finance, /Finding: Vendor concentration is elevated/);
    assert.match(finance, /observation-only/);
    assert.match(finance, /copiesLedger=false/);
    assert.match(finance, /canExecute=false/);
    assert.match(finance, /Not a certified ledger/);
    assert.match(finance, /not a certified ledger/i);
    assert.equal(finance.includes(String(IMPACT)), false);
    assert.equal(finance.includes('org-apex'), false);
    assert.equal(finance.includes('$'), false);

    const brief = buildLiveClientPilotBrief(ctx);
    const briefText = [...brief.whatIsHappening, ...brief.known, ...brief.unknown].join('\n');
    assert.match(briefText, /signalType=constraint/);
    assert.match(briefText, /Delivery depends on a small supplier set/);
    assert.match(briefText, /observation-only/);
    assert.match(briefText, /copiesLedger=false/);
    assert.match(briefText, /canExecute=false/);
    assert.match(briefText, /Not a certified ledger/);
    assert.equal(briefText.includes(String(IMPACT)), false);
    assert.equal(briefText.includes('org-apex'), false);
    assert.equal(truth.canExecute, false);
  });

  it('fail-closes HFD01, ACCG01, fixtures, and other unmapped production codes', () => {
    for (const clientCode of ['HFD01', 'ACCG01', 'CCB01', 'KAVA01', 'CPL01', 'LIEN01', 'MRI01', 'SYN01', 'T360A']) {
      const handled = handleModuleEnvelope(
        gccEnvelope({
          clientCode,
          idempotencyKey: `gcc|${clientCode}|w2f|closed`,
          payload: {
            signalType: 'engagement_health',
            summary: 'must not land',
            autoProvision: false,
            financialImpact: 0,
          },
        }),
      );
      assert.equal(handled.ok, false, clientCode);
      if (!handled.ok) {
        assert.equal(handled.status, 403, clientCode);
        assert.equal(handled.code, 'GCC_UNMAPPED', clientCode);
      }
      const dir = mkdtempSync(join(tmpdir(), 'w2f-closed-'));
      const projected = projectModuleEnvelopeToOverlay(
        dir,
        gccEnvelope({
          clientCode,
          idempotencyKey: `gcc|${clientCode}|w2f|project`,
        }),
      );
      assert.equal(projected.projected, false, clientCode);
      assert.equal(loadOverlay(dir).gccSignals.length, 0, clientCode);
    }
  });

  it('fail-closes cross-org mismatch and never materializes org-apex', () => {
    const mismatch = handleModuleEnvelope(
      gccEnvelope({
        payload: {
          organizationId: 'org-syn01',
          signalType: 'constraint',
          summary: SUMMARY,
          autoProvision: false,
          financialImpact: 0,
        },
      }),
    );
    assert.equal(mismatch.ok, false);
    if (!mismatch.ok) {
      assert.equal(mismatch.status, 403);
      assert.equal(mismatch.code, 'GCC_ORG_CLIENTCODE_MISMATCH');
    }

    const apex = handleModuleEnvelope(
      gccEnvelope({
        idempotencyKey: 'gcc|PDG01|w2f|apex',
        payload: {
          organizationId: 'org-apex',
          signalType: 'constraint',
          summary: SUMMARY,
          autoProvision: false,
          financialImpact: IMPACT,
        },
      }),
    );
    assert.equal(apex.ok, false);
    if (!apex.ok) {
      assert.equal(apex.status, 403);
      assert.equal(apex.code, 'GCC_ORG_CLIENTCODE_MISMATCH');
      assert.equal(apex.message.includes('org-apex'), false);
    }

    const dir = mkdtempSync(join(tmpdir(), 'w2f-apex-'));
    const projected = projectModuleEnvelopeToOverlay(
      dir,
      gccEnvelope({
        idempotencyKey: 'gcc|PDG01|w2f|apex-project',
        payload: {
          organizationId: 'org-apex',
          signalType: 'constraint',
          summary: 'must not project',
          autoProvision: false,
        },
      }),
    );
    assert.equal(projected.projected, false);
    const overlay = loadOverlay(dir);
    assert.equal(overlay.gccSignals.length, 0);
    assert.equal(JSON.stringify(overlay).includes('org-apex'), false);

    const ctx = buildOperatorCommercialContext({
      principal: principal(['PDG01', 'ACCG01']),
      overlay,
      clientCode: 'PDG01',
    });
    const finance = financeAnswer('PDG01', ctx);
    assert.equal(finance.includes('org-apex'), false);
    assert.match(finance, /No value signal is currently projected|NOT_CERTIFIED|observation-only/);
    assert.equal(finance.includes(String(IMPACT)), false);
  });

  it('rejects unknown signal types instead of rewriting them to engagement_health', () => {
    const handled = handleModuleEnvelope(
      gccEnvelope({
        payload: {
          organizationId: 'org-prodigy-games-llc',
          signalType: 'cash_runway',
          summary: 'do not invent this taxonomy',
          autoProvision: false,
          financialImpact: IMPACT,
        },
      }),
    );
    assert.equal(handled.ok, false);
    if (!handled.ok) {
      assert.equal(handled.status, 400);
      assert.equal(handled.code, 'SIGNAL_TYPE_UNMAPPED');
    }
    const dir = mkdtempSync(join(tmpdir(), 'w2f-unmap-'));
    const projected = projectModuleEnvelopeToOverlay(
      dir,
      gccEnvelope({
        idempotencyKey: 'gcc|PDG01|w2f|unmap',
        payload: {
          signalType: 'forecast_delta',
          summary: 'do not invent this taxonomy',
          autoProvision: false,
        },
      }),
    );
    assert.equal(projected.projected, false);
    const overlay = loadOverlay(dir);
    assert.equal(overlay.gccSignals.length, 0);
    assert.equal(JSON.stringify(overlay).includes('engagement_health'), false);
  });

  it('rejects unknown payload keys, autoProvision, and inferred positive impact', () => {
    const unknownKey = handleModuleEnvelope(
      gccEnvelope({
        payload: {
          organizationId: 'org-prodigy-games-llc',
          signalType: 'constraint',
          summary: SUMMARY,
          autoProvision: false,
          runwayMonths: 4,
        },
      }),
    );
    assert.equal(unknownKey.ok, false);
    if (!unknownKey.ok) {
      assert.equal(unknownKey.status, 400);
      assert.equal(unknownKey.code, 'PAYLOAD_FIELD_NOT_ALLOWED');
    }

    const auto = handleModuleEnvelope(
      gccEnvelope({
        idempotencyKey: 'gcc|PDG01|w2f|auto',
        payload: {
          signalType: 'constraint',
          summary: SUMMARY,
          autoProvision: true,
        },
      }),
    );
    assert.equal(auto.ok, false);
    if (!auto.ok) assert.equal(auto.code, 'AUTO_PROVISION_FORBIDDEN');

    const inferred = handleModuleEnvelope(
      gccEnvelope({
        idempotencyKey: 'gcc|PDG01|w2f|inferred',
        confidence: 'INFERRED',
        payload: {
          organizationId: 'org-prodigy-games-llc',
          signalType: 'constraint',
          summary: SUMMARY,
          autoProvision: false,
          financialImpact: 1,
        },
      }),
    );
    assert.equal(inferred.ok, false);
    if (!inferred.ok) assert.equal(inferred.code, 'INFERRED_IMPACT_FORBIDDEN');
  });

  it('keeps absent-signal finance honesty and does not leak PDG text onto ACCG01', () => {
    const absent = answerClientOperatingBrief('What is the finance picture for ACCG01?', {
      entitledCodes: ['PDG01', 'HFD01', 'ACCG01'],
    });
    assert.match(absent, /financialContext=NOT_CERTIFIED/);
    assert.match(absent, /NOT_CERTIFIED/);
    assert.equal(/GCC organization is mapped/i.test(absent), false);
    assert.equal(absent.includes('org-apex'), false);
    assert.match(absent, /canExecute=false/);

    const pdgAbsent = composeClientTruth({ clientCode: 'PDG01' });
    assert.equal('failClosed' in pdgAbsent, false);
    if ('failClosed' in pdgAbsent) return;
    assert.equal(pdgAbsent.canExecute, false);
    assert.equal(pdgAbsent.financialContext.classification, 'NOT_CERTIFIED');
    assert.match(
      pdgAbsent.financialContext.summary,
      /No value signal is currently projected/,
    );

    const dir = mkdtempSync(join(tmpdir(), 'w2f-isolate-'));
    assert.equal(projectModuleEnvelopeToOverlay(dir, gccEnvelope()).projected, true);
    const overlay = loadOverlay(dir);
    const accg = buildOperatorCommercialContext({
      principal: principal(['ACCG01', 'PDG01']),
      overlay,
      clientCode: 'ACCG01',
    });
    const accgFinance = financeAnswer('ACCG01', accg);
    assert.equal(accgFinance.includes(SUMMARY), false);
    assert.equal(accgFinance.includes(String(IMPACT)), false);
    assert.equal(accgFinance.includes('org-prodigy-games-llc'), false);
    assert.equal(accgFinance.includes('org-apex'), false);
    assert.match(accgFinance, /NOT_CERTIFIED/);
    const accgTruth = composeClientTruth({ clientCode: 'ACCG01', commercial: accg });
    assert.equal('failClosed' in accgTruth, false);
    if ('failClosed' in accgTruth) return;
    assert.equal(accgTruth.canExecute, false);
    assert.equal(accgTruth.financialContext.classification, 'NOT_CERTIFIED');
  });
});
