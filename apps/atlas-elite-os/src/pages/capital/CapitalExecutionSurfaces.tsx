/**
 * Post-shortlist operator surfaces — application, recorded submission, RFI,
 * term sheets, closing, funding, fees. Hub remains authoritative. No real send.
 */
import { useState, type CSSProperties } from 'react';
import { AtlasCard, DataTable, EmptyState, SectionRail, StatusChip } from '@hvcg/atlas-design-system';
import {
  Button,
  Caption1,
  Checkbox,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Text,
  Textarea,
} from '@fluentui/react-components';
import type { AtlasHubAuthHeaders } from '../../integrations/hub/api';
import { ATLAS_STATUS } from '../../ui/statusLanguage';
import { ATTEST_LABELS, nextAttestationOptions } from './capitalDetail';
import {
  addTermSheet,
  attestApplicationPackage,
  compareTermSheets,
  extractTermSheet,
  FINANCING_DISCLAIMER,
  formatUsd,
  generateClosingConditions,
  ingestLenderRfi,
  MANNY_GATE_COPY,
  NOT_BORROWER_REPRESENTATION,
  prepareApplication,
  recordClientDecision,
  recordFee,
  recordFundingEvent,
  recordLenderSubmission,
  recommendTermSheet,
  RECORDED_ONLY_COPY,
  titleFromToken,
  type ApplicationAttestation,
  type CapitalDataSource,
  type CapitalOpportunityDetail,
} from './capitalApi';

type RunFn = (
  action: () => Promise<{ detail: CapitalOpportunityDetail; source: CapitalDataSource }>,
  ok: string,
) => Promise<void>;

function attestationTone(value?: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'gold' {
  if (value === 'APPROVED_FOR_SUBMISSION') return 'success';
  if (value === 'CORRECTION_REQUIRED') return 'danger';
  if (value === 'CLIENT_CONFIRMED' || value === 'CLIENT_CONFIRMATION_REQUIRED') return 'gold';
  return 'info';
}

function formGrid(): CSSProperties {
  return { display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' };
}

export function ApplicationExecution({
  detail,
  source,
  auth,
  busy,
  canMutateApprovals,
  run,
}: {
  detail: CapitalOpportunityDetail;
  source: CapitalDataSource;
  auth: AtlasHubAuthHeaders;
  busy: boolean;
  canMutateApprovals: boolean;
  run: RunFn;
}) {
  const o = detail.opportunity;
  const packages = detail.applications?.length ? detail.applications : detail.application ? [detail.application] : [];
  const defaultLender = packages[0]?.lenderId || detail.matches[0]?.lenderId || '';
  const [lenderId, setLenderId] = useState(defaultLender);
  const [productId, setProductId] = useState(packages[0]?.productId || detail.matches[0]?.productId || '');
  const shortlistOk = o.mannyShortlistApproval === 'APPROVED';

  return (
    <SectionRail title="Application" subtitle="Populated fields keep their verification state. HVCG is not a lender.">
      <MessageBar intent="info">
        <MessageBarBody>
          <MessageBarTitle>Not a borrower representation</MessageBarTitle>
          {NOT_BORROWER_REPRESENTATION} {FINANCING_DISCLAIMER}
        </MessageBarBody>
      </MessageBar>

      {!shortlistOk ? (
        <EmptyState
          title="Shortlist gate is still open"
          description="Prepare an application package only after Manny approves the lender shortlist."
        />
      ) : (
        <AtlasCard title="Prepare package" subtitle="Creates or refreshes a Hub application package for one lender">
          <div style={formGrid()}>
            <Field label="Lender id">
              <Input value={lenderId} onChange={(_, d) => setLenderId(d.value)} aria-label="Application lender id" />
            </Field>
            <Field label="Product id (optional)">
              <Input value={productId} onChange={(_, d) => setProductId(d.value)} aria-label="Application product id" />
            </Field>
          </div>
          <div style={{ marginTop: 12 }}>
            <Button
              appearance="primary"
              disabled={busy || !lenderId.trim()}
              aria-label="Prepare application package"
              onClick={() =>
                void run(
                  () => prepareApplication(auth, o.id, { lenderId: lenderId.trim(), productId: productId.trim() || undefined }, { source }),
                  'Package prepared. Missing fields stay missing. Not submitted.',
                )
              }
            >
              Prepare package
            </Button>
          </div>
        </AtlasCard>
      )}

      {packages.length === 0 ? (
        <EmptyState
          title="No application package"
          description="Packages are prepared after Manny approves the shortlist. Missing fields block recorded submission."
        />
      ) : (
        packages.map((pkg) => {
          const attestation = String(pkg.attestation || pkg.status || 'PREPARED');
          const next = nextAttestationOptions(attestation);
          return (
            <AtlasCard
              key={pkg.id}
              title={pkg.status === 'BLOCKED_MISSING_FIELDS' ? 'Blocked — missing fields' : 'Package on file'}
              subtitle={`Lender ${pkg.lenderId}${pkg.productId ? ` · ${pkg.productId}` : ''}`}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                <StatusChip label={titleFromToken(pkg.status)} tone={pkg.status === 'PREPARED' ? 'info' : 'warning'} />
                <StatusChip label={titleFromToken(attestation)} tone={attestationTone(attestation)} />
                {pkg.packageStatus ? <StatusChip label={titleFromToken(pkg.packageStatus)} tone="neutral" /> : null}
                {pkg.notBorrowerRepresentation ? <StatusChip label="Not a borrower representation" tone="info" /> : null}
              </div>
              {Object.entries(pkg.populatedFields || {}).map(([field, cell]) => (
                <div key={field} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <Text weight="semibold">{field}</Text>
                  <Caption1>
                    {String(cell.value)} · {cell.verification}
                    {source === 'synthetic' ? ' · synthetic' : ''}
                  </Caption1>
                </div>
              ))}
              {pkg.missingFields.length ? (
                <ul>
                  {pkg.missingFields.map((m) => (
                    <li key={m.field}>
                      <Text size={300}>
                        {m.field} — {m.requiredFrom}
                      </Text>
                    </li>
                  ))}
                </ul>
              ) : null}
              <Caption1 style={{ display: 'block', margin: '12px 0 8px' }}>
                Attestation is sequential. Approve for recorded submission is a Manny gate.
              </Caption1>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {next.map((state) => {
                  const mannyOnly = state === 'APPROVED_FOR_SUBMISSION';
                  const blocked = mannyOnly && !canMutateApprovals;
                  return (
                    <Button
                      key={state}
                      appearance={state === 'APPROVED_FOR_SUBMISSION' ? 'primary' : 'secondary'}
                      disabled={busy || blocked}
                      aria-label={`${ATTEST_LABELS[state] || state} (application attestation)`}
                      onClick={() =>
                        void run(
                          () =>
                            attestApplicationPackage(
                              auth,
                              o.id,
                              {
                                attestation: state as ApplicationAttestation,
                                applicationId: pkg.id,
                                lenderId: pkg.lenderId,
                              },
                              { source },
                            ),
                          state === 'APPROVED_FOR_SUBMISSION'
                            ? 'Package approved for recorded-only submission. Nothing was sent to a lender.'
                            : `Attestation updated to ${titleFromToken(state)}.`,
                        )
                      }
                    >
                      {ATTEST_LABELS[state] || titleFromToken(state)}
                    </Button>
                  );
                })}
              </div>
              {!canMutateApprovals ? (
                <Caption1 style={{ display: 'block', marginTop: 8 }}>
                  Approve for recorded submission requires mutateApprovals. Hub rejects unauthorized callers.
                </Caption1>
              ) : null}
            </AtlasCard>
          );
        })
      )}
    </SectionRail>
  );
}

export function SubmissionExecution({
  detail,
  source,
  auth,
  busy,
  run,
}: {
  detail: CapitalOpportunityDetail;
  source: CapitalDataSource;
  auth: AtlasHubAuthHeaders;
  busy: boolean;
  run: RunFn;
}) {
  const o = detail.opportunity;
  const packages = detail.applications?.length ? detail.applications : detail.application ? [detail.application] : [];
  const approved = packages.find((p) => p.attestation === 'APPROVED_FOR_SUBMISSION');
  const [lenderId, setLenderId] = useState(approved?.lenderId || packages[0]?.lenderId || detail.matches[0]?.lenderId || '');
  const [confirmation, setConfirmation] = useState('');
  const ready = o.stage === 'ReadyForSubmission' && o.mannyShortlistApproval === 'APPROVED' && o.mannyStrategyApproval === 'APPROVED';

  return (
    <SectionRail title="Submission tracking" subtitle="HVCG tracks packages — HVCG does not lend">
      <MessageBar intent="warning">
        <MessageBarBody>
          <MessageBarTitle>No external send</MessageBarTitle>
          {RECORDED_ONLY_COPY}
        </MessageBarBody>
      </MessageBar>
      <AtlasCard title="Record submission" subtitle="Writes a Hub tracking row. Does not open a portal or send mail.">
        <div style={formGrid()}>
          <Field label="Lender id">
            <Input value={lenderId} onChange={(_, d) => setLenderId(d.value)} aria-label="Submission lender id" />
          </Field>
          <Field label="Confirmation number (optional)">
            <Input value={confirmation} onChange={(_, d) => setConfirmation(d.value)} aria-label="Submission confirmation number" />
          </Field>
        </div>
        <Caption1 style={{ display: 'block', margin: '8px 0 12px' }}>
          Requires Ready for Submission, Manny strategy + shortlist, and package approved for submission.
        </Caption1>
        <Button
          appearance="primary"
          disabled={busy || !lenderId.trim() || !ready || !approved}
          aria-label="Record lender submission without sending"
          onClick={() =>
            void run(
              () =>
                recordLenderSubmission(
                  auth,
                  o.id,
                  { lenderId: lenderId.trim(), confirmationNumber: confirmation.trim() || undefined },
                  { source },
                ),
              'Submission recorded on Hub. No external portal or email send was attempted.',
            )
          }
        >
          Record submission (no send)
        </Button>
      </AtlasCard>
      {detail.submissions.length === 0 ? (
        <EmptyState title="No submissions" description="Tracking rows appear after a package is recorded — not after a live send." />
      ) : (
        <DataTable
          ariaLabel="Lender submission tracking"
          getRowKey={(r) => r.id}
          rows={detail.submissions}
          columns={[
            { key: 'lender', header: 'Lender', render: (r) => r.lenderName || r.lenderId },
            { key: 'method', header: 'Method', render: (r) => r.method },
            { key: 'status', header: 'Status', render: (r) => <StatusChip label={titleFromToken(r.status)} tone="info" /> },
            { key: 'at', header: 'Submitted', render: (r) => (r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '—') },
            { key: 'conf', header: 'Confirmation', render: (r) => r.confirmationNumber || '—' },
            { key: 'notes', header: 'Notes', render: (r) => r.notes || '—' },
          ]}
        />
      )}
    </SectionRail>
  );
}

export function RfiExecution({
  detail,
  source,
  auth,
  busy,
  canMutateApprovals,
  run,
}: {
  detail: CapitalOpportunityDetail;
  source: CapitalDataSource;
  auth: AtlasHubAuthHeaders;
  busy: boolean;
  canMutateApprovals: boolean;
  run: RunFn;
}) {
  const o = detail.opportunity;
  const [text, setText] = useState('');
  const [lenderId, setLenderId] = useState(detail.submissions[0]?.lenderId || detail.matches[0]?.lenderId || '');
  const [applyStage, setApplyStage] = useState(false);
  const rfis = detail.rfis || [];

  return (
    <SectionRail title="Lender RFI" subtitle="Candidate items only — not sent to the client">
      <MessageBar intent="info">
        <MessageBarBody>
          Inbound lender text is decomposed on Hub. Instruction-injection is flagged. Nothing is emailed to the client.
        </MessageBarBody>
      </MessageBar>
      <AtlasCard title="Record inbound RFI" subtitle="Paste lender language. Atlas does not treat this as an authoritative checklist.">
        <div style={{ display: 'grid', gap: 12 }}>
          <Field label="Lender id">
            <Input value={lenderId} onChange={(_, d) => setLenderId(d.value)} aria-label="RFI lender id" />
          </Field>
          <Field label="Lender message">
            <Textarea value={text} onChange={(_, d) => setText(d.value)} rows={6} aria-label="Inbound lender RFI text" />
          </Field>
          {canMutateApprovals ? (
            <Checkbox
              checked={applyStage}
              onChange={(_, d) => setApplyStage(Boolean(d.checked))}
              label="Apply Additional Information Requested stage (Manny)"
              aria-label="Apply Additional Information Requested stage"
            />
          ) : (
            <Caption1>Stage application from RFI requires mutateApprovals.</Caption1>
          )}
        </div>
        <div style={{ marginTop: 12 }}>
          <Button
            appearance="primary"
            disabled={busy || !text.trim()}
            aria-label="Record inbound lender RFI without sending"
            onClick={() =>
              void run(
                () =>
                  ingestLenderRfi(
                    auth,
                    o.id,
                    { text: text.trim(), lenderId: lenderId.trim() || undefined, applyStage: canMutateApprovals && applyStage },
                    { source },
                  ),
                'RFI recorded as candidate items. No client send was attempted.',
              )
            }
          >
            Record RFI (no send)
          </Button>
        </div>
      </AtlasCard>
      {rfis.length === 0 ? (
        <EmptyState title="No RFI items" description="Inbound lender requests appear here after they are recorded." />
      ) : (
        <DataTable
          ariaLabel="Candidate lender RFI items"
          getRowKey={(r) => r.id}
          rows={rfis}
          columns={[
            { key: 'item', header: 'Item', sticky: 'left', render: (r) => r.item },
            { key: 'action', header: 'Action', render: (r) => titleFromToken(r.action) },
            { key: 'due', header: 'Due', render: (r) => r.responseDue || '—' },
            { key: 'owner', header: 'Owner', render: (r) => r.nextActionOwner || '—' },
            {
              key: 'cand',
              header: 'Authority',
              render: (r) => <StatusChip label={r.candidateOnly ? 'Candidate only' : 'Recorded'} tone="warning" />,
            },
          ]}
        />
      )}
    </SectionRail>
  );
}

export function OffersExecution({
  detail,
  source,
  auth,
  busy,
  canMutateApprovals,
  run,
  runComparison,
}: {
  detail: CapitalOpportunityDetail;
  source: CapitalDataSource;
  auth: AtlasHubAuthHeaders;
  busy: boolean;
  canMutateApprovals: boolean;
  run: RunFn;
  runComparison: (
    action: () => Promise<{ comparison: NonNullable<CapitalOpportunityDetail['comparison']>; source: CapitalDataSource }>,
    ok: string,
  ) => Promise<void>;
}) {
  const o = detail.opportunity;
  const [lenderId, setLenderId] = useState(detail.matches[0]?.lenderId || '');
  const [lenderName, setLenderName] = useState(detail.matches[0]?.lenderName || '');
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [term, setTerm] = useState('');
  const [extract, setExtract] = useState('');
  const [recommendation, setRecommendation] = useState(detail.comparison?.mannyRecommendation || '');
  const comparison = detail.comparison;

  return (
    <SectionRail title="Offers" subtitle="Comparison is informational — not a financing guarantee">
      <MessageBar intent="info">
        <MessageBarBody>{FINANCING_DISCLAIMER} Derived metrics are not quoted terms.</MessageBarBody>
      </MessageBar>
      <AtlasCard title="Record term sheet" subtitle="Manual entry stays UNVERIFIED">
        <div style={formGrid()}>
          <Field label="Lender id">
            <Input value={lenderId} onChange={(_, d) => setLenderId(d.value)} aria-label="Term sheet lender id" />
          </Field>
          <Field label="Lender name">
            <Input value={lenderName} onChange={(_, d) => setLenderName(d.value)} aria-label="Term sheet lender name" />
          </Field>
          <Field label="Amount">
            <Input type="number" value={amount} onChange={(_, d) => setAmount(d.value)} aria-label="Term sheet amount" />
          </Field>
          <Field label="Stated rate %">
            <Input type="number" value={rate} onChange={(_, d) => setRate(d.value)} aria-label="Term sheet interest rate" />
          </Field>
          <Field label="Term (months)">
            <Input type="number" value={term} onChange={(_, d) => setTerm(d.value)} aria-label="Term sheet term months" />
          </Field>
        </div>
        <div style={{ marginTop: 12 }}>
          <Button
            appearance="primary"
            disabled={busy || !lenderId.trim() || !lenderName.trim()}
            aria-label="Record term sheet offer"
            onClick={() =>
              void run(
                () =>
                  addTermSheet(
                    auth,
                    o.id,
                    {
                      lenderId: lenderId.trim(),
                      lenderName: lenderName.trim(),
                      amount: amount === '' ? null : Number(amount),
                      interestRate: rate === '' ? null : Number(rate),
                      termMonths: term === '' ? null : Number(term),
                    },
                    { source },
                  ),
                'Term sheet recorded. Comparison is informational — not a financing guarantee.',
              )
            }
          >
            Record offer
          </Button>
        </div>
      </AtlasCard>
      <AtlasCard title="Extract from lender text" subtitle="Unverified extraction. Injection is not persisted as terms.">
        <Field label="Term sheet text">
          <Textarea value={extract} onChange={(_, d) => setExtract(d.value)} rows={5} aria-label="Term sheet extraction text" />
        </Field>
        <div style={{ marginTop: 12 }}>
          <Button
            appearance="secondary"
            disabled={busy || !extract.trim()}
            aria-label="Extract term sheet from text"
            onClick={() =>
              void run(
                () =>
                  extractTermSheet(
                    auth,
                    o.id,
                    { text: extract.trim(), lenderId: lenderId.trim() || undefined, lenderName: lenderName.trim() || undefined },
                    { source },
                  ),
                'Extraction recorded as unverified. Not quoted as complete.',
              )
            }
          >
            Extract terms
          </Button>
        </div>
      </AtlasCard>
      {detail.offers.length === 0 ? (
        <EmptyState title="No offers recorded" description="Term sheets appear when a lender responds. HVCG does not guarantee terms." />
      ) : (
        <DataTable
          ariaLabel="Term sheet offers"
          getRowKey={(r) => r.id}
          rows={detail.offers}
          columns={[
            { key: 'lender', header: 'Lender', sticky: 'left', render: (r) => r.lenderName },
            { key: 'product', header: 'Product', render: (r) => r.product || '—' },
            {
              key: 'amt',
              header: 'Amount',
              render: (r) => (source === 'synthetic' ? `${formatUsd(r.amount)} (synthetic)` : formatUsd(r.amount)),
            },
            { key: 'rate', header: 'Stated rate', render: (r) => (r.interestRate != null ? `${r.interestRate}%` : 'Not recorded') },
            { key: 'term', header: 'Term (mo)', render: (r) => (r.termMonths != null ? String(r.termMonths) : '—') },
            { key: 'assume', header: 'Assumptions', render: (r) => r.assumptions.join('; ') || 'None recorded' },
          ]}
        />
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button
          appearance="secondary"
          disabled={busy || detail.offers.length === 0}
          aria-label="Compare term sheets"
          onClick={() =>
            void runComparison(
              () => compareTermSheets(auth, o.id, { source }),
              'Term comparison refreshed. Derived metrics are not quoted terms.',
            )
          }
        >
          Compare terms
        </Button>
      </div>
      {comparison ? (
        <AtlasCard title="Comparison" subtitle={comparison.derivedNotQuoted ? 'Derived — not quoted' : 'Informational'}>
          <Caption1 style={{ display: 'block', marginBottom: 8 }}>{comparison.disclaimer || FINANCING_DISCLAIMER}</Caption1>
          {Object.entries(comparison.bands || {}).map(([band, value]) => (
            <div key={band} style={{ marginBottom: 6 }}>
              <Text weight="semibold">{titleFromToken(band)}</Text>
              <Caption1> {value}</Caption1>
            </div>
          ))}
          {comparison.mannyRecommendation ? (
            <Caption1 style={{ display: 'block', marginTop: 8 }}>
              Manny note: {comparison.mannyRecommendation}
              {comparison.mannyRecommendationBy ? ` · ${comparison.mannyRecommendationBy}` : ''}
            </Caption1>
          ) : null}
        </AtlasCard>
      ) : null}
      {canMutateApprovals ? (
        <AtlasCard title="Manny recommendation" subtitle={MANNY_GATE_COPY}>
          <Field label="Recommendation (not a client decision)">
            <Input
              value={recommendation}
              onChange={(_, d) => setRecommendation(d.value)}
              aria-label="Manny term sheet recommendation"
            />
          </Field>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button
              appearance="primary"
              disabled={busy || !recommendation.trim()}
              aria-label="Record Manny term recommendation"
              onClick={() =>
                void runComparison(
                  () => recommendTermSheet(auth, o.id, recommendation.trim(), { source }),
                  'Manny recommendation recorded. This is not a client decision.',
                )
              }
            >
              Record Manny note
            </Button>
            <Button
              appearance="secondary"
              disabled={busy || !detail.offers[0]}
              aria-label="Record client selection (not legally binding)"
              onClick={() =>
                void run(
                  () =>
                    recordClientDecision(
                      auth,
                      o.id,
                      { decision: 'SELECTED', selectedTermSheetId: detail.offers[0]?.id, reason: recommendation.trim() || undefined },
                      { source },
                    ),
                  'Client selection recorded. Not legally binding.',
                )
              }
            >
              Record client selection
            </Button>
          </div>
        </AtlasCard>
      ) : (
        <Caption1>Manny recommendation requires mutateApprovals. Hub rejects unauthorized callers.</Caption1>
      )}
    </SectionRail>
  );
}

export function ClosingExecution({
  detail,
  source,
  auth,
  busy,
  canMutateApprovals,
  run,
}: {
  detail: CapitalOpportunityDetail;
  source: CapitalDataSource;
  auth: AtlasHubAuthHeaders;
  busy: boolean;
  canMutateApprovals: boolean;
  run: RunFn;
}) {
  const o = detail.opportunity;
  const [fundedDate, setFundedDate] = useState('');
  const [verifiedBy, setVerifiedBy] = useState(auth.email || '');
  const [sourceSystem, setSourceSystem] = useState('');
  const [capturedAt, setCapturedAt] = useState('');

  return (
    <SectionRail title="Closing" subtitle="Conditions to funding by a third-party lender">
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <Button
          size="small"
          disabled={busy}
          aria-label="Generate closing conditions"
          onClick={() =>
            void run(
              () => generateClosingConditions(auth, o.id, { source }),
              'Closing conditions generated. This is not a legal completeness opinion.',
            )
          }
        >
          Generate conditions
        </Button>
      </div>
      {detail.closing.length === 0 ? (
        <EmptyState title="No closing conditions" description="Conditions generate when the operator seeds the closing checklist." />
      ) : (
        <DataTable
          ariaLabel="Closing conditions"
          getRowKey={(r) => r.id}
          rows={detail.closing}
          columns={[
            { key: 'name', header: 'Condition', render: (r) => r.name },
            { key: 'owner', header: 'Owner', render: (r) => r.owner },
            {
              key: 'status',
              header: 'Status',
              render: (r) => (
                <StatusChip
                  label={titleFromToken(r.status)}
                  tone={r.status === 'satisfied' || r.status === 'waived' ? 'success' : r.status === 'blocked' ? 'danger' : 'warning'}
                />
              ),
            },
            { key: 'due', header: 'Due', render: (r) => r.due || '—' },
            { key: 'block', header: 'Blocker', render: (r) => r.blocker || '—' },
          ]}
        />
      )}
      {detail.funding ? (
        <AtlasCard title="Funding recorded" subtitle="Third-party lender funding — not an HVCG lending event">
          <Text>
            {detail.funding.fundedDate} · {detail.funding.verifiedBy || 'verifier not recorded'}
            {detail.funding.grossAmount != null ? ` · ${formatUsd(detail.funding.grossAmount)}` : ''}
          </Text>
        </AtlasCard>
      ) : canMutateApprovals ? (
        <AtlasCard title="Record funded" subtitle="Manny gate. Expected closing date is not evidence.">
          <div style={formGrid()}>
            <Field label="Funded date">
              <Input type="date" value={fundedDate} onChange={(_, d) => setFundedDate(d.value)} aria-label="Funded date" />
            </Field>
            <Field label="Verified by">
              <Input value={verifiedBy} onChange={(_, d) => setVerifiedBy(d.value)} aria-label="Funding verified by" />
            </Field>
            <Field label="Evidence system">
              <Input value={sourceSystem} onChange={(_, d) => setSourceSystem(d.value)} aria-label="Funding evidence source system" />
            </Field>
            <Field label="Evidence captured at">
              <Input value={capturedAt} onChange={(_, d) => setCapturedAt(d.value)} aria-label="Funding evidence captured at" />
            </Field>
          </div>
          <Caption1 style={{ display: 'block', margin: '8px 0 12px' }}>
            Requires Closing stage plus a SourceRef. Hub will reject an expected date standing alone.
          </Caption1>
          <Button
            appearance="primary"
            disabled={busy || !fundedDate || !verifiedBy.trim() || !sourceSystem.trim() || !capturedAt.trim() || o.stage !== 'Closing'}
            aria-label="Record funded event (Manny gate)"
            onClick={() =>
              void run(
                () =>
                  recordFundingEvent(
                    auth,
                    o.id,
                    {
                      fundedDate,
                      verifiedBy: verifiedBy.trim(),
                      sourceSystem: sourceSystem.trim(),
                      capturedAt: capturedAt.trim(),
                    },
                    { source },
                  ),
                'Funding recorded from evidence. HVCG is not the lender.',
              )
            }
          >
            Record funded
          </Button>
        </AtlasCard>
      ) : (
        <Caption1>Funded verification requires mutateApprovals. Hub rejects unauthorized callers.</Caption1>
      )}
    </SectionRail>
  );
}

export function FeesExecution({
  detail,
  source,
  auth,
  busy,
  run,
}: {
  detail: CapitalOpportunityDetail;
  source: CapitalDataSource;
  auth: AtlasHubAuthHeaders;
  busy: boolean;
  run: RunFn;
}) {
  const o = detail.opportunity;
  const [feeType, setFeeType] = useState('advisory_success');
  const [notes, setNotes] = useState('');

  return (
    <SectionRail title="Fees / receivables" subtitle="HVCG economics — not funded capital">
      <AtlasCard title="Record fee" subtitle={`${ATLAS_STATUS.complianceReview} when the fee type requires legal review`}>
        <div style={formGrid()}>
          <Field label="Fee type">
            <Input value={feeType} onChange={(_, d) => setFeeType(d.value)} aria-label="Fee type" />
          </Field>
          <Field label="Notes">
            <Input value={notes} onChange={(_, d) => setNotes(d.value)} aria-label="Fee notes" />
          </Field>
        </div>
        <div style={{ marginTop: 12 }}>
          <Button
            appearance="primary"
            disabled={busy || !feeType.trim()}
            aria-label="Record capital fee"
            onClick={() =>
              void run(
                () =>
                  recordFee(
                    auth,
                    o.id,
                    { clientCode: o.clientCode, feeType: feeType.trim(), notes: notes.trim() || undefined },
                    { source },
                  ),
                'Fee recorded. Success fee is not lender funding.',
              )
            }
          >
            Record fee
          </Button>
        </div>
      </AtlasCard>
      {detail.fees.length === 0 ? (
        <EmptyState title="No fee records" description="Fees follow the executed HVCG agreement. Success fee ≠ lender funding." />
      ) : (
        <DataTable
          ariaLabel="Capital fee and receivable status"
          getRowKey={(r) => r.id}
          rows={detail.fees}
          columns={[
            { key: 'type', header: 'Fee type', render: (r) => r.feeType },
            { key: 'formula', header: 'Formula', render: (r) => r.feeFormula || '—' },
            { key: 'event', header: 'Earned event', render: (r) => r.earnedEvent || '—' },
            {
              key: 'appr',
              header: 'Approval',
              render: (r) => (
                <StatusChip label={titleFromToken(r.approvalStatus)} tone={r.approvalStatus === 'APPROVED' ? 'success' : 'warning'} />
              ),
            },
            { key: 'inv', header: 'Invoice', render: (r) => r.invoiceStatus },
            { key: 'pay', header: 'Payment', render: (r) => r.paymentStatus },
            {
              key: 'legal',
              header: 'Legal / compliance',
              render: (r) =>
                r.legalComplianceReviewRequired ? <StatusChip label={ATLAS_STATUS.complianceReview} tone="gold" /> : '—',
            },
            { key: 'notes', header: 'Notes', render: (r) => r.notes || '—' },
          ]}
        />
      )}
    </SectionRail>
  );
}
