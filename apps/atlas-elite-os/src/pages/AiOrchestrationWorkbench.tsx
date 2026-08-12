/**
 * AI Orchestration + Second Brain — Elite surface (Development).
 * One governance plane. Not 18 chatbots. Sources visible. BL-C1 active.
 */
import { useMemo, useState } from 'react';
import { AtlasCard, EmptyState, SectionHeader, StatusChip } from '@hvcg/atlas-design-system';
import { Button, Caption1, Field, Input, Text, Textarea } from '@fluentui/react-components';
import { ModuleScaffold } from './shared/ModuleScaffold';

type Panel = 'ask' | 'requests' | 'approvals' | 'agents' | 'brief' | 'history';

const MATURITY: Array<{ code: string; name: string; highest: string; gate?: string }> = [
  { code: 'AGT-INTAKE', name: 'Client Intake', highest: 'CONFIG_ONLY' },
  { code: 'AGT-DOC-CHECKLIST', name: 'Document Checklist', highest: 'FULL_DEV_RUNTIME' },
  { code: 'AGT-CAP-READY', name: 'Capital Readiness', highest: 'FULL_DEV_RUNTIME' },
  { code: 'AGT-FIN-PKG', name: 'Financial Package', highest: 'FULL_DEV_RUNTIME' },
  { code: 'AGT-PROCURE', name: 'Contract Procurement', highest: 'FULL_DEV_RUNTIME' },
  { code: 'AGT-GOV-REG', name: 'Government Registration', highest: 'FULL_DEV_RUNTIME' },
  { code: 'AGT-TAX-APPEAL', name: 'Tax Appeal Support', highest: 'FULL_DEV_RUNTIME', gate: 'GATE-RISK-ELEVATED-ACL-PROD' },
  { code: 'AGT-UE-CLAIM', name: 'Unemployment Claim', highest: 'FULL_DEV_RUNTIME', gate: 'GATE-RISK-ELEVATED-ACL-PROD' },
  { code: 'AGT-INS-REVIEW', name: 'Insurance Review', highest: 'FULL_DEV_RUNTIME', gate: 'GATE-RISK-ELEVATED-ACL-PROD' },
  { code: 'AGT-CLAIMS', name: 'Claims & Recovery', highest: 'FULL_DEV_RUNTIME', gate: 'GATE-RISK-ELEVATED-ACL-PROD' },
  { code: 'AGT-HR-DOCS', name: 'HR Documentation', highest: 'DOMAIN_INTEGRATED', gate: 'GATE-RISK-ELEVATED-ACL-PROD' },
  { code: 'AGT-PROPOSAL', name: 'Proposal & Pricing', highest: 'FULL_DEV_RUNTIME' },
  { code: 'AGT-CRM', name: 'CRM Update', highest: 'DOMAIN_INTEGRATED' },
  { code: 'AGT-INVOICE', name: 'Invoice Reconciliation', highest: 'SERVICE_RUNTIME' },
  { code: 'AGT-REFERRAL', name: 'Referral Partner', highest: 'SERVICE_RUNTIME' },
  { code: 'AGT-SUCCESS', name: 'Client Success', highest: 'DOMAIN_INTEGRATED' },
  { code: 'AGT-CONCIERGE', name: 'Executive Concierge', highest: 'CONFIG_ONLY' },
  { code: 'AGT-SECOND-BRAIN', name: 'AI Second Brain', highest: 'FULL_DEV_RUNTIME' },
];

const DEMO_SOURCES = [
  { id: 'REV-1', kind: 'SOURCE_FACT', title: 'Pipeline', text: 'Qualified pipeline (Revenue OS)' },
  { id: 'CFO-1', kind: 'CALCULATION', title: 'Forecast', text: '13-week forecast — not actual' },
  { id: 'CAP-1', kind: 'SOURCE_FACT', title: 'Capital blockers', text: 'Missing tax return' },
  { id: 'GRW-1', kind: 'SOURCE_FACT', title: 'Priorities', text: 'CRM · SOP · Weekly cadence' },
];

export function AiOrchestrationWorkbench() {
  const [panel, setPanel] = useState<Panel>('ask');
  const [client, setClient] = useState('ClientA (Dev)');
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [lastAnswer, setLastAnswer] = useState<string | null>(null);

  const tabs: Array<[Panel, string]> = [
    ['ask', 'Ask Atlas'],
    ['requests', 'Agent Requests'],
    ['approvals', 'Approvals'],
    ['agents', '18 Agents'],
    ['brief', 'Owner Brief'],
    ['history', 'History'],
  ];

  const ask = () => {
    if (!client.trim()) {
      setToast('Client context required — no ambiguous retrieval.');
      return;
    }
    if (!query.trim()) {
      setToast('Enter a question or request.');
      return;
    }
    const lower = query.toLowerCase();
    if (lower.includes('send') || lower.includes('email the') || lower.includes('submit')) {
      setLastAnswer('ACTION_REQUEST → blocked / needs approval. BL-C1 prevents external side effects.');
      setToast('BL-C1: external action blocked before side effects.');
      return;
    }
    if (lower.includes('client b') || lower.includes('another client')) {
      setLastAnswer('BLOCKED_PERMISSION — agent context must never cross client boundaries.');
      setToast('Cross-client retrieval blocked.');
      return;
    }
    setLastAnswer(
      `INFORMATION_REQUEST · client ${client} · evidence PARTIALLY_SUPPORTED (Dev fixture). AI summaries are not facts.`,
    );
    setToast('Second Brain draft ready — sources shown. No Production mutation.');
  };

  const briefSections = useMemo(
    () => [
      ['Revenue', 'Source: Revenue OS — no fabricated totals'],
      ['Cash / CFO', 'Source: CFO — forecast ≠ actual'],
      ['Capital', 'Source: Capital — blockers only when recorded'],
      ['Procurement', 'NO_DATA until bound'],
      ['Risk', 'RESTRICTED without elevated ACL (GATE-RISK-ELEVATED-ACL-PROD)'],
      ['Growth', 'Source: Growth OS'],
      ['Approvals', 'Source: HVCG_Approvals'],
      ['Decisions Required', 'Human only'],
    ],
    [],
  );

  return (
    <ModuleScaffold
      title="AI Orchestration + Second Brain"
      subtitle="One governance plane · 18 agents · policy before prompts · Development only"
      showPendingBanner={false}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {tabs.map(([id, label]) => (
          <Button key={id} appearance={panel === id ? 'primary' : 'secondary'} onClick={() => setPanel(id)}>
            {label}
          </Button>
        ))}
      </div>

      {toast ? (
        <Caption1 style={{ display: 'block', marginBottom: 12 }}>{toast}</Caption1>
      ) : null}

      {panel === 'ask' ? (
        <>
          <AtlasCard title="Ask Atlas" subtitle="Permission-aware · source-cited · client-scoped">
            <Field label="Client context" style={{ marginBottom: 12 }}>
              <Input value={client} onChange={(_, d) => setClient(d.value)} />
            </Field>
            <Field label="Question">
              <Textarea
                value={query}
                onChange={(_, d) => setQuery(d.value)}
                placeholder="e.g. What are the open capital blockers?"
                rows={3}
              />
            </Field>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Button appearance="primary" onClick={ask}>
                Ask
              </Button>
              <Button
                appearance="secondary"
                onClick={() => {
                  setToast('External send blocked by BL-C1 (policy engine).');
                  setLastAnswer(null);
                }}
              >
                Attempt external send
              </Button>
            </div>
            {lastAnswer ? (
              <Text size={300} style={{ display: 'block', marginTop: 14 }}>
                {lastAnswer}
              </Text>
            ) : (
              <EmptyState title="No answer yet" description="Select client, ask a question. Read ≠ write." />
            )}
          </AtlasCard>
          <SectionHeader title="Sources" subtitle="Answer → source record navigation" />
          <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
            {DEMO_SOURCES.map((s) => (
              <AtlasCard key={s.id} title={s.title} subtitle={`${s.kind} · ${s.id}`}>
                <Text size={300}>{s.text}</Text>
                <Caption1 style={{ display: 'block', marginTop: 6 }}>atlas://{s.id}</Caption1>
              </AtlasCard>
            ))}
          </div>
          <Caption1 style={{ display: 'block', marginTop: 12 }}>
            Related: Revenue · CFO · Capital · Growth. Recommended actions remain RECOMMENDATION until human action.
          </Caption1>
        </>
      ) : null}

      {panel === 'requests' ? (
        <AtlasCard title="Agent Request Center" subtitle="Request/event-driven — no silent autonomy loops">
          {[
            'Summarize client',
            'Prepare proposal',
            'Prepare Capital review',
            'Create document checklist',
            'Prepare CFO review',
            'Review procurement readiness',
            'Prepare Risk matter summary',
            'Generate meeting agenda',
            'Draft SOP',
            'Find missing documents',
          ].map((r) => (
            <div key={r} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
              <Text size={300}>{r}</Text>
              <StatusChip label="Dev queue" tone="neutral" />
            </div>
          ))}
          <Caption1>Status · Risk · Sources · Approval · Result tracked on HVCG_AIJobs / Approvals.</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'approvals' ? (
        <AtlasCard title="Approval Router" subtitle="Single plane → HVCG_Approvals (not per-agent mechanisms)">
          <Text size={300} style={{ display: 'block' }}>
            Filter by Client · Domain · Risk · Due Date · Agent · Reviewer
          </Text>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {['Proposal', 'PricingOverride', 'CapitalPackage', 'ProcurementSubmission', 'RiskCommunication', 'CFOReport', 'SOPActivation'].map(
              (t) => (
                <StatusChip key={t} label={t} tone="gold" />
              ),
            )}
          </div>
          <Caption1 style={{ display: 'block', marginTop: 12 }}>
            APPROVED_TO_SEND does not bypass BL-C1. Supporting evidence gathered for reviewers when available.
          </Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'agents' ? (
        <>
          <SectionHeader title="Canonical 18" subtitle="AGT-CFO-OPS is domain binding — not Agent 19" />
          <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
            {MATURITY.map((a) => (
              <AtlasCard key={a.code} title={a.name} subtitle={a.code}>
                <StatusChip label={a.highest} tone="neutral" />
                {a.gate ? <Caption1 style={{ display: 'block', marginTop: 6 }}>Gate: {a.gate}</Caption1> : null}
                <Caption1 style={{ display: 'block', marginTop: 4 }}>Production: GATED · never PRODUCTION_READY in S11</Caption1>
              </AtlasCard>
            ))}
          </div>
        </>
      ) : null}

      {panel === 'brief' ? (
        <AtlasCard title="Owner Brief" subtitle="Material changes only · Development fixture">
          {briefSections.map(([k, v]) => (
            <div key={k} style={{ marginBottom: 10 }}>
              <Text weight="semibold">{k}</Text>
              <Caption1 style={{ display: 'block' }}>{v}</Caption1>
            </div>
          ))}
        </AtlasCard>
      ) : null}

      {panel === 'history' ? (
        <AtlasCard title="Run history" subtitle="Auditable runs · tool calls · feedback marks">
          <EmptyState
            title="No live runs in this shell"
            description="Orchestrator run records live in Development AI lists / engine tests. Feedback: APPROVED · EDITED · REJECTED · INCORRECT · MISSING_CONTEXT · POLICY_ISSUE — no auto Production prompt mutation."
          />
        </AtlasCard>
      ) : null}
    </ModuleScaffold>
  );
}

/** Client 360 AI assist — permission-aware stubs. */
export function Client360AiAssist({ clientHint }: { clientHint?: string }) {
  const [q, setQ] = useState('');
  const [out, setOut] = useState<string | null>(null);
  return (
    <AtlasCard title="Client 360 AI" subtitle="Same permissions as the signed-in user · canonical truth">
      <Caption1 style={{ display: 'block', marginBottom: 8 }}>Client: {clientHint || 'Select client'}</Caption1>
      <Field label="Ask about this account">
        <Input value={q} onChange={(_, d) => setQ(d.value)} placeholder="Biggest blockers? Contracted price?" />
      </Field>
      <Button
        appearance="primary"
        style={{ marginTop: 10 }}
        onClick={() =>
          setOut(
            clientHint
              ? `Draft for ${clientHint}: blockers/sources from bound domains only. Contracted price from Revenue/pricing SoR. No restricted Risk without elevated ACL.`
              : 'Client context required.',
          )
        }
      >
        Ask
      </Button>
      {out ? (
        <Text size={300} style={{ display: 'block', marginTop: 10 }}>
          {out}
        </Text>
      ) : null}
    </AtlasCard>
  );
}
