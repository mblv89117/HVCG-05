/**
 * Phase 5A — Local EVA Sandbox (synthetic test data only).
 * Available in Elite OS under /ai-operations/eva — not a competing app.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AtlasCard, StatusChip } from '@hvcg/atlas-design-system';
import {
  Button,
  Caption1,
  Input,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
  Text,
  Textarea,
} from '@fluentui/react-components';
import { ModuleScaffold } from '../shared/ModuleScaffold';
import { useMicrosoftAuth } from '../../microsoft/auth/AuthProvider';
import { useHubAuth } from '../../integrations/hub/useHubAuth';
import {
  cancelLocalAiEvaSubmission,
  decideLocalAiEvaSubmission,
  fetchLocalAiEvaAudit,
  fetchLocalAiEvaPerformance,
  fetchLocalAiEvaQueue,
  fetchLocalAiEvaSandbox,
  fetchLocalAiEvaScenarios,
  fetchLocalAiEvaSubmissions,
  fetchLocalAiFlags,
  retryLocalAiEvaAi,
  submitLocalAiEvaIntake,
} from '../../integrations/hub/api';

const MANNY_DECISIONS = [
  'Qualified for Consultation',
  'Needs More Information',
  'Not a Fit',
  'Hold for Later',
  'Duplicate',
  'Return AI Review for Revision',
  'Archive Synthetic Record',
] as const;

const emptyForm = () => ({
  company: {
    legalCompanyName: '',
    dba: '',
    industry: '',
    website: '',
    address: '',
    yearsInBusiness: '',
    numberOfEmployees: '',
  },
  contact: {
    firstName: '',
    lastName: '',
    title: '',
    email: '',
    phone: '',
  },
  financial: {
    annualRevenue: '',
    grossProfit: '',
    ebitdaOrNetIncome: '',
    outstandingDebt: '',
    monthlyDebtPayments: '',
    availableCash: '',
    accountsReceivable: '',
    accountsPayable: '',
  },
  businessProfile: {
    ownershipStructure: '',
    keyPersonDependency: '',
    recurringRevenue: '',
    customerConcentration: '',
    operationalMaturity: '',
    financialReportingQuality: '',
    managementDepth: '',
    growthGoals: '',
    desiredCapital: '',
    intendedUseOfFunds: '',
    primaryBusinessChallenges: '',
  },
  assessment: {
    salesAndMarketing: '',
    operations: '',
    finance: '',
    leadership: '',
    technology: '',
    risk: '',
    growthReadiness: '',
    enterpriseValueReadiness: '',
  },
  consent: {
    consentAcknowledgment: true,
    referralSource: 'Local sandbox',
    utmSource: 'local',
    utmMedium: 'sandbox',
    utmCampaign: 'phase5a',
    submissionSource: 'Local EVA Sandbox',
    syntheticTestAcknowledgment: true,
  },
  idempotencyKey: '',
});

function numOrNull(v: string): number | null {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : Number.NaN;
}

export function EvaSandboxPage() {
  const { account } = useMicrosoftAuth();
  const hubAuth = useHubAuth();
  const signedIn = Boolean(account && hubAuth.userId);
  const isLocalDev =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      import.meta.env.DEV);

  const [flags, setFlags] = useState<Record<string, boolean> | null>(null);
  const [scenarios, setScenarios] = useState<
    Array<{ kind: string; payload: Record<string, unknown> }>
  >([]);
  const [form, setForm] = useState(emptyForm);
  const [queue, setQueue] = useState<Array<Record<string, unknown>>>([]);
  const [revisionQueue, setRevisionQueue] = useState<Array<Record<string, unknown>>>([]);
  const [submissions, setSubmissions] = useState<Array<Record<string, unknown>>>([]);
  const [perf, setPerf] = useState<Record<string, unknown> | null>(null);
  const [audit, setAudit] = useState<Array<Record<string, unknown>>>([]);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [lastResult, setLastResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState('');
  const [reviewMode, setReviewMode] = useState<
    'Deterministic Intake Test' | 'Full Local AI End-to-End Test'
  >('Full Local AI End-to-End Test');

  const refresh = useCallback(async () => {
    if (!signedIn) return;
    const [sb, sc, fl, q, subs, pf, au] = await Promise.all([
      fetchLocalAiEvaSandbox(hubAuth),
      fetchLocalAiEvaScenarios(hubAuth),
      fetchLocalAiFlags(hubAuth),
      fetchLocalAiEvaQueue(hubAuth),
      fetchLocalAiEvaSubmissions(hubAuth),
      fetchLocalAiEvaPerformance(hubAuth),
      fetchLocalAiEvaAudit(hubAuth),
    ]);
    setFlags(fl.flags);
    setScenarios(sc.scenarios);
    setQueue(q.queue);
    setRevisionQueue(q.revisionQueue || []);
    setSubmissions(subs.submissions);
    setPerf(pf.performance);
    setAudit(au.events);
    void sb;
  }, [signedIn, hubAuth]);

  useEffect(() => {
    void refresh().catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [refresh]);

  const loadScenario = (kind: string) => {
    const sc = scenarios.find((s) => s.kind === kind);
    if (!sc?.payload) return;
    const p = sc.payload as {
      company?: Record<string, unknown>;
      contact?: Record<string, unknown>;
      financial?: Record<string, unknown>;
      businessProfile?: Record<string, unknown>;
      assessment?: Record<string, unknown>;
      consent?: Record<string, unknown>;
    };
    const base = emptyForm();
    setForm({
      ...base,
      company: {
        ...base.company,
        legalCompanyName: String(p.company?.legalCompanyName ?? ''),
        dba: String(p.company?.dba ?? ''),
        industry: String(p.company?.industry ?? ''),
        website: String(p.company?.website ?? ''),
        address: String(p.company?.address ?? ''),
        yearsInBusiness:
          p.company?.yearsInBusiness == null ? '' : String(p.company.yearsInBusiness),
        numberOfEmployees:
          p.company?.numberOfEmployees == null ? '' : String(p.company.numberOfEmployees),
      },
      contact: {
        ...base.contact,
        firstName: String(p.contact?.firstName ?? ''),
        lastName: String(p.contact?.lastName ?? ''),
        title: String(p.contact?.title ?? ''),
        email: String(p.contact?.email ?? ''),
        phone: String(p.contact?.phone ?? ''),
      },
      financial: Object.fromEntries(
        Object.keys(base.financial).map((k) => [
          k,
          p.financial?.[k] == null ? '' : String(p.financial[k]),
        ]),
      ) as typeof base.financial,
      businessProfile: Object.fromEntries(
        Object.keys(base.businessProfile).map((k) => [
          k,
          p.businessProfile?.[k] == null ? '' : String(p.businessProfile[k]),
        ]),
      ) as typeof base.businessProfile,
      assessment: Object.fromEntries(
        Object.keys(base.assessment).map((k) => [
          k,
          p.assessment?.[k] == null ? '' : String(p.assessment[k]),
        ]),
      ) as typeof base.assessment,
      consent: {
        ...base.consent,
        referralSource: String(p.consent?.referralSource ?? base.consent.referralSource),
        utmSource: String(p.consent?.utmSource ?? base.consent.utmSource),
        utmMedium: String(p.consent?.utmMedium ?? base.consent.utmMedium),
        utmCampaign: String(p.consent?.utmCampaign ?? base.consent.utmCampaign),
        submissionSource: String(p.consent?.submissionSource ?? base.consent.submissionSource),
        consentAcknowledgment: true,
        syntheticTestAcknowledgment: true,
      },
      idempotencyKey: '',
    });
  };

  const submit = async (mode: 'Deterministic Intake Test' | 'Full Local AI End-to-End Test') => {
    setBusy(true);
    setError(null);
    setReviewMode(mode);
    try {
      const body = {
        company: {
          ...form.company,
          yearsInBusiness: numOrNull(form.company.yearsInBusiness),
          numberOfEmployees: numOrNull(form.company.numberOfEmployees),
          dba: form.company.dba || null,
          industry: form.company.industry || null,
          website: form.company.website || null,
          address: form.company.address || null,
        },
        contact: {
          ...form.contact,
          title: form.contact.title || null,
          phone: form.contact.phone || null,
        },
        financial: Object.fromEntries(
          Object.entries(form.financial).map(([k, v]) => [k, numOrNull(v)]),
        ),
        businessProfile: Object.fromEntries(
          Object.entries(form.businessProfile).map(([k, v]) => [k, v || null]),
        ),
        assessment: Object.fromEntries(
          Object.entries(form.assessment).map(([k, v]) => [k, v || null]),
        ),
        consent: form.consent,
        idempotencyKey: form.idempotencyKey || undefined,
        reviewMode: mode,
      };
      const result = await submitLocalAiEvaIntake(hubAuth, body);
      setLastResult(result as unknown as Record<string, unknown>);
      if (result.submission) setSelected(result.submission);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!isLocalDev) {
    return (
      <ModuleScaffold title="EVA Sandbox" subtitle="Local development only">
        <MessageBar intent="error">
          <MessageBarBody>
            LOCAL EVA SANDBOX is available only in local development. Production EVA remains disabled.
          </MessageBarBody>
        </MessageBar>
      </ModuleScaffold>
    );
  }

  return (
    <ModuleScaffold
      title="LOCAL EVA SANDBOX"
      subtitle="Phase 5A — synthetic Enterprise Value Assessment intake"
      showPendingBanner={false}
    >
      <MessageBar intent="warning">
        <MessageBarBody>
          <MessageBarTitle>LOCAL EVA SANDBOX</MessageBarTitle>
          SYNTHETIC TEST DATA ONLY · NO PRODUCTION RECORDS · NO EMAILS · NO CLIENT ACTIVATION ·
          TEST — DO NOT CONTACT · TEST — SYNTHETIC EVA · EvaIntakeEnabled must remain false
        </MessageBarBody>
      </MessageBar>

      <Caption1 style={{ display: 'block', marginTop: 8 }}>
        <Link to="/ai-operations">← AI Operations</Link>
        {flags ? (
          <>
            {' '}
            · LocalAIEnabled={String(flags.LocalAIEnabled)} · EvaIntakeEnabled=
            {String(flags.EvaIntakeEnabled)} · ClientEmailsEnabled=
            {String(flags.ClientEmailsEnabled)} · Writes=
            {String(flags.LocalAIWritesEnabled)}
          </>
        ) : null}
      </Caption1>

      {error ? (
        <MessageBar intent="error" style={{ marginTop: 12 }}>
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      ) : null}

      <AtlasCard title="Synthetic scenarios" subtitle="Load fixture into form" style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {scenarios.map((s) => (
            <Button key={s.kind} size="small" onClick={() => loadScenario(s.kind)}>
              {s.kind}
            </Button>
          ))}
        </div>
      </AtlasCard>

      <AtlasCard
        title="Synthetic EVA form"
        subtitle="TEST — SYNTHETIC EVA · TEST — DO NOT CONTACT"
        style={{ marginTop: 12 }}
      >
        <Text weight="semibold">Company</Text>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
          {(
            [
              ['legalCompanyName', 'Legal company name'],
              ['dba', 'DBA'],
              ['industry', 'Industry'],
              ['website', 'Website'],
              ['address', 'Address'],
              ['yearsInBusiness', 'Years in business'],
              ['numberOfEmployees', 'Number of employees'],
            ] as const
          ).map(([k, label]) => (
            <Input
              key={k}
              placeholder={label}
              value={form.company[k]}
              onChange={(_, d) =>
                setForm((f) => ({ ...f, company: { ...f.company, [k]: d.value } }))
              }
            />
          ))}
        </div>

        <Text weight="semibold" style={{ display: 'block', marginTop: 12 }}>
          Contact
        </Text>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
          {(
            [
              ['firstName', 'First name'],
              ['lastName', 'Last name'],
              ['title', 'Title'],
              ['email', 'Email'],
              ['phone', 'Phone'],
            ] as const
          ).map(([k, label]) => (
            <Input
              key={k}
              placeholder={label}
              value={form.contact[k]}
              onChange={(_, d) =>
                setForm((f) => ({ ...f, contact: { ...f.contact, [k]: d.value } }))
              }
            />
          ))}
        </div>

        <Text weight="semibold" style={{ display: 'block', marginTop: 12 }}>
          Financial profile
        </Text>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
          {(
            [
              ['annualRevenue', 'Annual revenue'],
              ['grossProfit', 'Gross profit'],
              ['ebitdaOrNetIncome', 'EBITDA / net income'],
              ['outstandingDebt', 'Outstanding debt'],
              ['monthlyDebtPayments', 'Monthly debt payments'],
              ['availableCash', 'Available cash'],
              ['accountsReceivable', 'Accounts receivable'],
              ['accountsPayable', 'Accounts payable'],
            ] as const
          ).map(([k, label]) => (
            <Input
              key={k}
              placeholder={label}
              value={form.financial[k]}
              onChange={(_, d) =>
                setForm((f) => ({ ...f, financial: { ...f.financial, [k]: d.value } }))
              }
            />
          ))}
        </div>

        <Text weight="semibold" style={{ display: 'block', marginTop: 12 }}>
          Business profile
        </Text>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
          {Object.keys(form.businessProfile).map((k) => (
            <Input
              key={k}
              placeholder={k}
              value={form.businessProfile[k as keyof typeof form.businessProfile]}
              onChange={(_, d) =>
                setForm((f) => ({
                  ...f,
                  businessProfile: { ...f.businessProfile, [k]: d.value },
                }))
              }
            />
          ))}
        </div>

        <Text weight="semibold" style={{ display: 'block', marginTop: 12 }}>
          Assessment
        </Text>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
          {Object.keys(form.assessment).map((k) => (
            <Input
              key={k}
              placeholder={k}
              value={form.assessment[k as keyof typeof form.assessment]}
              onChange={(_, d) =>
                setForm((f) => ({
                  ...f,
                  assessment: { ...f.assessment, [k]: d.value },
                }))
              }
            />
          ))}
        </div>

        <Text weight="semibold" style={{ display: 'block', marginTop: 12 }}>
          Consent & source
        </Text>
        <Caption1 style={{ display: 'block', marginTop: 4 }}>
          Consent acknowledgment: {String(form.consent.consentAcknowledgment)} · Synthetic-test
          acknowledgment: {String(form.consent.syntheticTestAcknowledgment)} · Source:{' '}
          {form.consent.submissionSource}
        </Caption1>
        <Input
          style={{ marginTop: 8 }}
          placeholder="Idempotency key (optional)"
          value={form.idempotencyKey}
          onChange={(_, d) => setForm((f) => ({ ...f, idempotencyKey: d.value }))}
        />

        <Caption1 style={{ display: 'block', marginTop: 12 }}>
          Selected acceptance mode: <strong>{reviewMode}</strong> (recorded in audit history)
        </Caption1>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            appearance="secondary"
            disabled={busy || !signedIn}
            onClick={() => void submit('Deterministic Intake Test')}
          >
            Deterministic Intake Test
          </Button>
          <Button
            appearance="primary"
            disabled={busy || !signedIn}
            onClick={() => void submit('Full Local AI End-to-End Test')}
          >
            Run Live Local AI Review
          </Button>
          {busy ? <Spinner size="tiny" /> : null}
          <StatusChip tone="warning" label="TEST — DO NOT CONTACT" />
          <StatusChip tone="warning" label="TEST — SYNTHETIC EVA" />
        </div>
        <Caption1 style={{ display: 'block', marginTop: 8 }}>
          Full Local AI End-to-End uses Fast ({`qwen2.5:7b-instruct`}) preliminary + Deep (
          {`glm-4.7-flash:q4_K_M`}) complete review. Deterministic mode skips Ollama for fast intake
          tests only.
        </Caption1>
      </AtlasCard>

      {lastResult ? (
        <AtlasCard title="Submission result" style={{ marginTop: 12 }}>
          <Caption1>
            ok={String(lastResult.ok)} · duplicate={String(lastResult.duplicate)} · correlationId=
            {String(lastResult.correlationId)} · reviewMode=
            {String(lastResult.reviewMode || (lastResult.submission as { reviewMode?: string })?.reviewMode || '—')}{' '}
            · error={String(lastResult.error || 'none')}
          </Caption1>
          {(lastResult.errors as string[] | undefined)?.length ? (
            <Caption1 style={{ display: 'block', color: 'crimson' }}>
              {(lastResult.errors as string[]).join('; ')}
            </Caption1>
          ) : null}
          {lastResult.submission ? (
            <Caption1 style={{ display: 'block', marginTop: 4 }}>
              submissionId={String((lastResult.submission as { submissionId?: string }).submissionId)}{' '}
              · match=
              {String((lastResult.submission as { matchClass?: string }).matchClass)} · status=
              {String((lastResult.submission as { status?: string }).status)}
            </Caption1>
          ) : null}
        </AtlasCard>
      ) : null}

      <AtlasCard title="Local UAT checklist" subtitle="Phase 5A acceptance" style={{ marginTop: 12 }}>
        {(() => {
          const uat = (selected?.uatChecklist ||
            (lastResult?.submission as { uatChecklist?: Record<string, unknown> } | null)
              ?.uatChecklist) as Record<string, unknown> | undefined;
          if (!uat) {
            return <Caption1>Submit a synthetic EVA to populate the checklist.</Caption1>;
          }
          const rows: Array<[string, unknown]> = [
            ['intake accepted', uat.intakeAccepted],
            ['submission persisted', uat.submissionPersisted],
            ['company match completed', uat.companyMatchCompleted],
            ['contact match completed', uat.contactMatchCompleted],
            ['prospect created', uat.prospectCreated],
            ['AI job created', uat.aiJobCreated],
            ['AI processing completed', uat.aiProcessingCompleted],
            ['schema validated', uat.schemaValidated],
            ['prohibited claims cleared', uat.prohibitedClaimsCleared],
            ['Manny package created', uat.mannyPackageCreated],
            ['decision recorded', uat.decisionRecorded],
            ['audit complete', uat.auditComplete],
            ['no external actions occurred', uat.noExternalActionsOccurred],
          ];
          return (
            <>
              <StatusChip
                tone={
                  uat.overall === 'PASS'
                    ? 'success'
                    : uat.overall === 'PASS WITH WARNINGS'
                      ? 'warning'
                      : 'danger'
                }
                label={`Overall: ${String(uat.overall)}`}
              />
              <ul>
                {rows.map(([label, val]) => (
                  <li key={label}>
                    <Caption1>
                      {val ? '✓' : '✗'} {label}
                    </Caption1>
                  </li>
                ))}
              </ul>
              {(uat.warnings as string[] | undefined)?.length ? (
                <Caption1>Warnings: {JSON.stringify(uat.warnings)}</Caption1>
              ) : null}
            </>
          );
        })()}
      </AtlasCard>

      <AtlasCard title="EVA Review Queue" subtitle="Manny ready — Failed excluded" style={{ marginTop: 12 }}>
        {queue.length === 0 ? <Caption1>No items awaiting Manny.</Caption1> : null}
        {queue.map((item) => (
          <div
            key={String(item.submissionId)}
            style={{
              borderTop: '1px solid var(--colorNeutralStroke2)',
              padding: '8px 0',
            }}
          >
            <Text weight="semibold">
              {String(item.company)} — {String(item.contact)}
            </Text>
            <Caption1 style={{ display: 'block' }}>
              {String(item.submissionTime)} · duplicate={String(item.duplicateStatus)} · confidence=
              {String(item.confidence)} · model={String(item.modelUsed)} · durationMs=
              {String(item.processingDurationMs)} · review min=
              {String(item.estimatedReviewMinutes)}
            </Caption1>
            <Caption1 style={{ display: 'block' }}>
              Summary: {String(item.evaSummary || '—')}
            </Caption1>
            <Caption1 style={{ display: 'block' }}>
              Strengths: {JSON.stringify(item.strengths)} · Risks: {JSON.stringify(item.risks)}
            </Caption1>
            <Caption1 style={{ display: 'block' }}>
              Missing: {JSON.stringify(item.missingInformation)} · Services:{' '}
              {JSON.stringify(item.recommendedServices)} · Next:{' '}
              {String(item.recommendedNextAction)}
            </Caption1>
            <Caption1 style={{ display: 'block' }}>
              Warnings: {JSON.stringify(item.aiWarnings)} · Time protection:{' '}
              {JSON.stringify(item.timeProtection)}
            </Caption1>
            <Textarea
              style={{ marginTop: 8, width: '100%' }}
              placeholder="Manny notes (local only)"
              value={selected?.submissionId === item.submissionId ? notes : ''}
              onChange={(_, d) => {
                setSelected(item);
                setNotes(d.value);
              }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {MANNY_DECISIONS.map((d) => (
                <Button
                  key={d}
                  size="small"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true);
                    void decideLocalAiEvaSubmission(hubAuth, String(item.submissionId), d, notes)
                      .then(() => refresh())
                      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
                      .finally(() => setBusy(false));
                  }}
                >
                  {d}
                </Button>
              ))}
              <Button
                size="small"
                onClick={() => {
                  void retryLocalAiEvaAi(hubAuth, String(item.submissionId))
                    .then(() => refresh())
                    .catch((e) => setError(e instanceof Error ? e.message : String(e)));
                }}
              >
                Retry AI
              </Button>
              <Button
                size="small"
                onClick={() => {
                  void cancelLocalAiEvaSubmission(hubAuth, String(item.submissionId))
                    .then(() => refresh())
                    .catch((e) => setError(e instanceof Error ? e.message : String(e)));
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ))}
      </AtlasCard>

      <AtlasCard
        title="Revision / recovery queue"
        subtitle="Failed & pending — not ready for Manny until corrected"
        style={{ marginTop: 12 }}
      >
        {revisionQueue.length === 0 ? <Caption1>No revision items.</Caption1> : null}
        {revisionQueue.map((item) => (
          <div key={String(item.submissionId)} style={{ padding: '8px 0' }}>
            <Caption1>
              {String(item.company)} · status={String(item.status)} · error=
              {String(item.errorDetail || '—')} · mode={String(item.reviewMode || '—')}
            </Caption1>
            <Button
              size="small"
              onClick={() => {
                void retryLocalAiEvaAi(hubAuth, String(item.submissionId))
                  .then(() => refresh())
                  .catch((e) => setError(e instanceof Error ? e.message : String(e)));
              }}
            >
              Governed Retry AI
            </Button>
          </div>
        ))}
      </AtlasCard>

      <AtlasCard title="EVA Performance" style={{ marginTop: 12 }}>
        <Caption1>{JSON.stringify(perf || {}, null, 0)}</Caption1>
      </AtlasCard>

      <AtlasCard title="Submissions + audit" style={{ marginTop: 12 }}>
        <Caption1>
          Submissions: {submissions.length} · Recent audit events: {audit.length}
        </Caption1>
        <ul>
          {submissions.slice(0, 15).map((s) => (
            <li key={String(s.submissionId)}>
              <Button
                appearance="transparent"
                size="small"
                onClick={() => setSelected(s)}
              >
                {String((s.payload as { company?: { legalCompanyName?: string } })?.company?.legalCompanyName || s.submissionId)}{' '}
                — {String(s.status)} — {String(s.matchClass)}
              </Button>
            </li>
          ))}
        </ul>
        {selected ? (
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, maxHeight: 320, overflow: 'auto' }}>
            {JSON.stringify(selected, null, 2)}
          </pre>
        ) : null}
      </AtlasCard>
    </ModuleScaffold>
  );
}
