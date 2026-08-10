/**
 * Owner Change Review — Phase 6B-UX before/after approval workflow UI.
 * Before = Production baseline snapshot. After = pilot draft. Never the same iframe.
 */

import { AtlasCard, StatusChip } from '@hvcg/atlas-design-system';
import {
  Button,
  Caption1,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Text,
  Textarea,
} from '@fluentui/react-components';

const border = '1px solid var(--colorNeutralStroke2)';
const muted = 'var(--colorNeutralForeground3)';

export type ReviewPreviewMode = 'before' | 'after' | 'compare';

export function ChangeReviewScreen(props: {
  review: Record<string, unknown> | null;
  busy: boolean;
  previewMode: ReviewPreviewMode;
  previewHtmlBefore: string | null;
  previewHtmlAfter: string | null;
  device: 'Desktop' | 'Tablet' | 'Mobile';
  editOpen: boolean;
  editText: string;
  options: Array<Record<string, unknown>> | null;
  approveOpen: boolean;
  approvedResult: Record<string, unknown> | null;
  onBack: () => void;
  onRefresh: () => void;
  onPreviewMode: (m: ReviewPreviewMode) => void;
  onDevice: (d: 'Desktop' | 'Tablet' | 'Mobile') => void;
  onLooksGood: (d: 'Desktop' | 'Tablet' | 'Mobile') => void;
  onOpenEdit: () => void;
  onCloseEdit: () => void;
  onEditText: (v: string) => void;
  onSaveEdit: () => void;
  onShowOptions: () => void;
  onUseOption: (text: string) => void;
  onSaveForLater: () => void;
  onReject: () => void;
  onOpenApprove: () => void;
  onCloseApprove: () => void;
  onConfirmApprove: () => void;
  onStartPreview: () => void;
}) {
  const r = props.review;
  if (!r) {
    return (
      <AtlasCard>
        <Caption1>Loading change review…</Caption1>
      </AtlasCard>
    );
  }

  const identity = (r.previewIdentity || {}) as Record<string, unknown>;
  const devices = (r.deviceReviews || {}) as Record<string, boolean>;
  const width = props.device === 'Mobile' ? 390 : props.device === 'Tablet' ? 768 : '100%';
  const mismatch = identity.ok === false;
  const beforeText = String(r.before || '');
  const afterText = String(r.after || '');
  const baseline = String(r.baselineCommit || '').slice(0, 12);
  const pilot = String(r.pilotCommit || '').slice(0, 12);
  const sameHeadline = beforeText.trim() === afterText.trim();

  if (props.approvedResult) {
    return (
      <AtlasCard>
        <Text weight="semibold" size={600}>
          CHANGE APPROVED
        </Text>
        <Text style={{ display: 'block', marginTop: 8 }}>{String(r.ownerTitle)}</Text>
        <Caption1 style={{ display: 'block', marginTop: 8 }}>Approved by: Manny</Caption1>
        <Caption1 style={{ display: 'block' }}>Status: Approved — Not Published</Caption1>
        <Caption1 style={{ display: 'block' }}>Next step: Ready for Publishing Review</Caption1>
        <Caption1 style={{ display: 'block', marginTop: 8 }}>Production: UNCHANGED</Caption1>
        <MessageBar intent="success" style={{ marginTop: 12 }}>
          <MessageBarBody>
            This approved the draft only. It did not publish, merge, deploy, or change Production.
          </MessageBarBody>
        </MessageBar>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <Button appearance="primary" onClick={props.onRefresh}>
            View Approved Change
          </Button>
          <Button onClick={props.onBack}>Return to Website Studio</Button>
        </div>
      </AtlasCard>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div>
          <Text weight="semibold" size={600}>
            REVIEWING CHANGE
          </Text>
          <Caption1 style={{ display: 'block', marginTop: 4 }}>
            Website: {String((r.website as { websiteName?: string })?.websiteName)}
          </Caption1>
          <Caption1 style={{ display: 'block' }}>
            {String((r.page as { pageName?: string })?.pageName || 'Home')} → {String(r.section || 'Hero')} →{' '}
            {String(r.ownerTitle)}
          </Caption1>
          <Caption1 style={{ display: 'block' }}>
            Element: Main Headline · Risk: {String(r.risk || 'Low')}
          </Caption1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <StatusChip label={String(r.ownerStatus)} tone="warning" />
          <Caption1 style={{ display: 'block', marginTop: 6 }}>{String(r.liveState)}</Caption1>
          <Button size="small" appearance="subtle" onClick={props.onBack}>
            Back
          </Button>
        </div>
      </div>

      <AtlasCard>
        <Text weight="semibold">Homepage Headline</Text>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12 }}>
          <div style={{ borderLeft: '4px solid #888', paddingLeft: 10 }}>
            <Caption1>BEFORE — Production baseline</Caption1>
            <Text style={{ display: 'block', marginTop: 4 }}>{beforeText}</Text>
          </div>
          <div style={{ borderLeft: '4px solid #b08d57', paddingLeft: 10 }}>
            <Caption1>AFTER — Proposed draft (NOT LIVE)</Caption1>
            <Text weight="semibold" style={{ display: 'block', marginTop: 4 }}>
              {afterText}
            </Text>
          </div>
        </div>
        <Caption1 style={{ display: 'block', marginTop: 12 }}>Changed: 1 text block</Caption1>
        <Caption1 style={{ display: 'block' }}>
          Unchanged: Navigation · Forms · SEO metadata · Analytics · Integrations
        </Caption1>
        {sameHeadline ? (
          <MessageBar intent="error" style={{ marginTop: 10 }}>
            <MessageBarBody>
              Before and After text are identical — this change cannot be approved until they differ.
            </MessageBarBody>
          </MessageBar>
        ) : null}
      </AtlasCard>

      <AtlasCard>
        <Caption1>YOU ASKED</Caption1>
        <Text weight="semibold" style={{ display: 'block', marginTop: 4 }}>
          “{String(r.youAsked)}”
        </Text>
        <Caption1 style={{ display: 'block', marginTop: 10 }}>WHAT WILL CHANGE</Caption1>
        {((r.whatWillChange as Array<Record<string, string>>) || []).map((i, idx) => (
          <Caption1 key={idx} style={{ display: 'block', marginTop: 4 }}>
            {i.page} → {i.section} → {i.field}
          </Caption1>
        ))}
        <div style={{ marginTop: 8 }}>
          {((r.summaryLines as string[]) || []).map((line) => (
            <Caption1 key={line} style={{ display: 'block' }}>
              {line}
            </Caption1>
          ))}
        </div>
      </AtlasCard>

      {mismatch ? (
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>PREVIEW VERSION MISMATCH</MessageBarTitle>
            {((identity.mismatches as string[]) || []).join(' · ')} Approval is blocked until preview
            matches this change.
            <div style={{ marginTop: 8 }}>
              <Button size="small" onClick={props.onStartPreview}>
                Start / Repair Preview
              </Button>
            </div>
          </MessageBarBody>
        </MessageBar>
      ) : (
        <MessageBar intent="success">
          <MessageBarBody>
            Preview identity verified for draft {String(r.changeRequestId)} · Baseline {baseline} · Pilot{' '}
            {pilot} · NOT LIVE
          </MessageBarBody>
        </MessageBar>
      )}

      <div
        style={{
          display: 'flex',
          gap: 0,
          border,
          borderRadius: 10,
          overflow: 'hidden',
          alignSelf: 'flex-start',
        }}
      >
        {(
          [
            { id: 'before' as const, label: 'BEFORE', hint: 'Production baseline' },
            { id: 'after' as const, label: 'AFTER', hint: 'Proposed draft' },
            { id: 'compare' as const, label: 'COMPARE', hint: 'Side by side' },
          ] as const
        ).map((tab) => {
          const selected = props.previewMode === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              data-testid={`ws-preview-mode-${tab.id}`}
              onClick={() => props.onPreviewMode(tab.id)}
              style={{
                border: 'none',
                padding: '12px 18px',
                cursor: 'pointer',
                background: selected ? '#1a1a1a' : '#f5f5f5',
                color: selected ? '#f5e6c8' : '#333',
                fontWeight: 700,
                minWidth: 120,
              }}
            >
              <div>{tab.label}</div>
              <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.85 }}>{tab.hint}</div>
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(240px, 30%) minmax(0, 1fr)',
          gap: 14,
        }}
      >
        <AtlasCard>
          <Text weight="semibold">YOU ARE REVIEWING</Text>
          <Caption1 style={{ display: 'block', marginTop: 6 }}>{String(r.ownerTitle)}</Caption1>
          <Caption1 style={{ display: 'block', marginTop: 8 }}>Selected view</Caption1>
          <Text weight="semibold">
            {props.previewMode === 'before'
              ? 'BEFORE — Production baseline'
              : props.previewMode === 'after'
                ? 'AFTER — Draft (not live)'
                : 'COMPARE — Before | After'}
          </Text>
          <Caption1 style={{ display: 'block', marginTop: 8 }}>Baseline: {baseline || '—'}</Caption1>
          <Caption1 style={{ display: 'block' }}>Pilot: {pilot || '—'}</Caption1>
          <Caption1 style={{ display: 'block' }}>Draft: {String(r.changeRequestId)}</Caption1>

          <Caption1 style={{ display: 'block', marginTop: 14 }}>Device review</Caption1>
          {(['Desktop', 'Tablet', 'Mobile'] as const).map((d) => (
            <div
              key={d}
              style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, gap: 8 }}
            >
              <Button
                size="small"
                appearance={props.device === d ? 'primary' : 'subtle'}
                onClick={() => props.onDevice(d)}
              >
                {d}
              </Button>
              <Button size="small" onClick={() => props.onLooksGood(d)}>
                {devices[d] ? '✓ Looks Good' : 'Looks Good'}
              </Button>
            </div>
          ))}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
            <Button
              appearance="primary"
              disabled={props.busy}
              onClick={() => props.onPreviewMode('after')}
            >
              Preview This Change
            </Button>
            <Button
              appearance="primary"
              disabled={props.busy || mismatch || sameHeadline}
              onClick={props.onOpenApprove}
              title={
                mismatch
                  ? 'Preview version mismatch blocks approval'
                  : sameHeadline
                    ? 'Before and After must differ'
                    : undefined
              }
            >
              Review & Approve
            </Button>
            <Button disabled={props.busy} onClick={props.onOpenEdit}>
              Edit
            </Button>
            <Button disabled={props.busy} onClick={props.onShowOptions}>
              Show Me 3 Options
            </Button>
            <Button disabled={props.busy} onClick={props.onSaveForLater}>
              Save for Later
            </Button>
            <Button disabled={props.busy} onClick={props.onReject}>
              Reject
            </Button>
            <Button disabled title="Production publishing will be enabled in a later approved phase.">
              Publish (disabled)
            </Button>
          </div>

          <details style={{ marginTop: 12 }}>
            <summary style={{ cursor: 'pointer' }}>Developer Details</summary>
            <Caption1 style={{ display: 'block' }}>ID: {String(r.changeRequestId)}</Caption1>
            <Caption1 style={{ display: 'block' }}>Branch: {String(r.pilotBranch || '—')}</Caption1>
            <Caption1 style={{ display: 'block' }}>
              Pilot commit: {String(r.pilotCommit || '—')}
            </Caption1>
            <Caption1 style={{ display: 'block' }}>
              Baseline: {String(r.baselineCommit || '—')}
            </Caption1>
            <Caption1 style={{ display: 'block' }}>Tier: {String(r.tier)}</Caption1>
          </details>
        </AtlasCard>

        <div>
          {props.previewMode === 'compare' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <PreviewFrame
                title="PRODUCTION BASELINE PREVIEW · NOT LIVE EDITING"
                subtitle={`Baseline ${baseline} · BEFORE`}
                html={props.previewHtmlBefore}
                frameKey={`before-${baseline}-${beforeText.slice(0, 24)}`}
                width="100%"
                height={520}
                onStartPreview={props.onStartPreview}
              />
              <PreviewFrame
                title="DRAFT PREVIEW — NOT LIVE"
                subtitle={`Draft ${String(r.changeRequestId)} · Pilot ${pilot} · AFTER`}
                html={props.previewHtmlAfter}
                frameKey={`after-${pilot}-${afterText.slice(0, 24)}`}
                width="100%"
                height={520}
                onStartPreview={props.onStartPreview}
              />
            </div>
          ) : (
            <PreviewFrame
              title={
                props.previewMode === 'before'
                  ? 'PRODUCTION BASELINE PREVIEW · NOT LIVE EDITING'
                  : 'DRAFT PREVIEW — NOT LIVE'
              }
              subtitle={
                props.previewMode === 'before'
                  ? `Baseline ${baseline} · ${String((r.website as { websiteName?: string })?.websiteName)} · Home → Homepage Headline`
                  : `Draft ${String(r.changeRequestId)} · Pilot ${pilot} · NOT LIVE`
              }
              html={props.previewMode === 'before' ? props.previewHtmlBefore : props.previewHtmlAfter}
              frameKey={
                props.previewMode === 'before'
                  ? `before-${baseline}-${beforeText.slice(0, 24)}`
                  : `after-${pilot}-${afterText.slice(0, 24)}`
              }
              width={width}
              height={560}
              onStartPreview={props.onStartPreview}
            />
          )}
        </div>
      </div>

      {props.editOpen ? (
        <AtlasCard>
          <Text weight="semibold">Edit · {String(r.ownerTitle)}</Text>
          <Caption1 style={{ display: 'block', marginTop: 6 }}>Homepage → Hero → Headline</Caption1>
          <Textarea
            value={props.editText}
            onChange={(_, d) => props.onEditText(d.value)}
            style={{ width: '100%', minHeight: 100, marginTop: 8 }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <Button appearance="primary" disabled={props.busy} onClick={props.onSaveEdit}>
              Save Draft
            </Button>
            <Button disabled={props.busy} onClick={() => props.onEditText(beforeText)}>
              Revert to current website wording
            </Button>
            <Button disabled={props.busy} onClick={props.onShowOptions}>
              Ask AI for 3 alternatives
            </Button>
            <Button onClick={props.onCloseEdit}>Cancel</Button>
          </div>
        </AtlasCard>
      ) : null}

      {props.options ? (
        <AtlasCard>
          <Text weight="semibold">Show Me 3 Options</Text>
          {props.options.map((o) => (
            <div key={String(o.id)} style={{ borderTop: border, padding: '12px 0' }}>
              <Text weight="semibold">
                {String(o.label)}
                {o.recommended ? ' · RECOMMENDED' : ''}
              </Text>
              <Text style={{ display: 'block', marginTop: 4 }}>{String(o.text)}</Text>
              <Caption1 style={{ display: 'block', marginTop: 4 }}>WHY: {String(o.why)}</Caption1>
              <Button
                size="small"
                appearance="primary"
                style={{ marginTop: 8 }}
                onClick={() => props.onUseOption(String(o.text))}
              >
                Use This
              </Button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Button onClick={props.onShowOptions}>Try Again</Button>
            <Button onClick={props.onOpenEdit}>Edit</Button>
          </div>
        </AtlasCard>
      ) : null}

      <Dialog open={props.approveOpen} onOpenChange={(_, d) => !d.open && props.onCloseApprove()}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Approve this website change?</DialogTitle>
            <DialogContent>
              <Text weight="semibold">WHAT IS BEING APPROVED</Text>
              <Caption1 style={{ display: 'block', marginTop: 6 }}>
                Website: {String((r.website as { websiteName?: string })?.websiteName)}
              </Caption1>
              <Caption1 style={{ display: 'block' }}>
                Page: {String((r.page as { pageName?: string })?.pageName)}
              </Caption1>
              <Caption1 style={{ display: 'block' }}>Section: {String(r.section || 'Hero')}</Caption1>
              <Caption1 style={{ display: 'block' }}>Element: Main Headline</Caption1>
              <Caption1 style={{ display: 'block', marginTop: 8 }}>BEFORE:</Caption1>
              <Text>{beforeText}</Text>
              <Caption1 style={{ display: 'block', marginTop: 8 }}>AFTER:</Caption1>
              <Text weight="semibold">{afterText}</Text>
              <Caption1 style={{ display: 'block', marginTop: 10 }}>
                Preview reviewed: Yes · QA result: {String(r.ownerQaGate || r.qaStatus || 'Pending')} ·
                Production impact: NONE YET
              </Caption1>
              <MessageBar intent="success" style={{ marginTop: 12 }}>
                <MessageBarBody>
                  <MessageBarTitle>WHAT APPROVAL WILL DO</MessageBarTitle>
                  Approve the exact draft wording, preserve approved content and evidence, and move this
                  change to Ready for Publishing Review.
                </MessageBarBody>
              </MessageBar>
              <MessageBar intent="warning" style={{ marginTop: 8 }}>
                <MessageBarBody>
                  <MessageBarTitle>WHAT APPROVAL WILL NOT DO</MessageBarTitle>
                  It will NOT publish, merge, deploy, email, change DNS, or modify integrations.
                  Production remains unchanged.
                </MessageBarBody>
              </MessageBar>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={props.onCloseApprove}>
                Cancel
              </Button>
              <Button
                appearance="primary"
                disabled={props.busy || mismatch || sameHeadline}
                onClick={props.onConfirmApprove}
                data-testid="ws-yes-approve-change"
              >
                Yes, Approve Change
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}

function PreviewFrame(props: {
  title: string;
  subtitle: string;
  html: string | null;
  frameKey: string;
  width: string | number;
  height: number;
  onStartPreview: () => void;
}) {
  return (
    <div>
      <div
        style={{
          border,
          borderRadius: 10,
          padding: '8px 12px',
          marginBottom: 8,
          background: '#1a1a1a',
          color: '#f5e6c8',
        }}
      >
        <Text weight="semibold">{props.title}</Text>
        <Caption1 style={{ display: 'block', color: '#ddd' }}>{props.subtitle}</Caption1>
      </div>
      <div
        style={{
          margin: '0 auto',
          width: props.width,
          maxWidth: '100%',
          border,
          borderRadius: 12,
          overflow: 'hidden',
          minHeight: props.height,
          background: '#fff',
        }}
      >
        {props.html ? (
          <iframe
            key={props.frameKey}
            title={props.title}
            srcDoc={props.html}
            style={{ width: '100%', height: props.height, border: 'none' }}
          />
        ) : (
          <div style={{ padding: 24 }}>
            <Caption1>Loading preview snapshot…</Caption1>
            <Button style={{ marginTop: 12 }} onClick={props.onStartPreview}>
              Start Preview
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function NeedsReviewHomeCards(props: {
  title?: string;
  items: Array<Record<string, unknown>>;
  actionLabel?: string;
  onReview: (id: string) => void;
  tone?: 'ready' | 'not-ready';
}) {
  if (!props.items.length) return null;
  const notReady = props.tone === 'not-ready';
  return (
    <AtlasCard>
      <Text weight="semibold">{props.title || 'NEEDS YOUR REVIEW'}</Text>
      {notReady ? (
        <Caption1 style={{ display: 'block', marginTop: 6, color: muted }}>
          Automated QA has not passed yet. These are not ready for owner review.
        </Caption1>
      ) : null}
      {props.items.map((c) => (
        <div
          key={String(c.changeRequestId)}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            borderTop: border,
            padding: '12px 0',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <Text weight="semibold">{String(c.ownerTitle || 'Website change')}</Text>
            <Caption1 style={{ display: 'block' }}>
              {String(c.websiteName || 'High Value Capital Group')} ·{' '}
              {notReady ? 'NOT READY FOR REVIEW' : 'Preview ready'}
            </Caption1>
            <Caption1 style={{ color: muted }}>
              {notReady
                ? String(c.ownerQaGate || 'NOT TESTED')
                : String(c.ownerStatus || 'Waiting for Your Review')}
            </Caption1>
          </div>
          <Button
            appearance={notReady ? 'secondary' : 'primary'}
            onClick={() => props.onReview(String(c.changeRequestId))}
          >
            {props.actionLabel || (notReady ? 'View (not ready)' : 'Review Change')}
          </Button>
        </div>
      ))}
    </AtlasCard>
  );
}

export function OwnerDecisionInbox(props: {
  mode: 'approvals' | 'drafts';
  inbox: {
    needsReview: Array<Record<string, unknown>>;
    readyPreview: Array<Record<string, unknown>>;
    saved: Array<Record<string, unknown>>;
    approved: Array<Record<string, unknown>>;
    all: Array<Record<string, unknown>>;
  } | null;
  onReview: (id: string) => void;
}) {
  if (props.mode === 'approvals') {
    const items = props.inbox?.needsReview || [];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Text weight="semibold" size={500}>
          Approvals — needs your decision
        </Text>
        {items.length === 0 ? (
          <AtlasCard>
            <Caption1>Nothing waiting for your decision.</Caption1>
          </AtlasCard>
        ) : (
          items.map((c) => (
            <AtlasCard key={String(c.changeRequestId)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <Text weight="semibold">{String(c.ownerTitle || 'Website change')}</Text>
                  <Caption1 style={{ display: 'block' }}>
                    {String(c.websiteName || 'High Value Capital Group')} · Home · Low Risk · 1-minute
                    review
                  </Caption1>
                  <Caption1>{String(c.ownerStatus)}</Caption1>
                </div>
                <Button appearance="primary" onClick={() => props.onReview(String(c.changeRequestId))}>
                  Review
                </Button>
              </div>
            </AtlasCard>
          ))
        )}
      </div>
    );
  }

  const sections: Array<{ title: string; items: Array<Record<string, unknown>> }> = [
    { title: 'Waiting for Review', items: props.inbox?.needsReview || [] },
    { title: 'Ready to Preview', items: props.inbox?.readyPreview || [] },
    { title: 'Approved — Not Published', items: props.inbox?.approved || [] },
    { title: 'Saved for Later', items: props.inbox?.saved || [] },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Text weight="semibold" size={500}>
        Draft Changes
      </Text>
      {sections.map((section) => (
        <div key={section.title}>
          <Caption1 style={{ display: 'block', marginBottom: 8 }}>{section.title}</Caption1>
          {section.items.length === 0 ? (
            <Caption1 style={{ color: muted }}>None</Caption1>
          ) : (
            section.items.map((c) => (
              <div key={String(c.changeRequestId)} style={{ marginBottom: 8 }}>
                <AtlasCard>
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}
                  >
                    <div>
                      <Text weight="semibold">{String(c.ownerTitle || 'Website change')}</Text>
                      <Caption1 style={{ display: 'block' }}>
                        {String(c.websiteName || 'High Value Capital Group')} · Home → Hero
                      </Caption1>
                      <Caption1>{String(c.ownerStatus)}</Caption1>
                      <Caption1 style={{ color: muted }}>
                        Next: {String(c.nextAction || 'Review & Approve')}
                      </Caption1>
                    </div>
                    <Button appearance="primary" onClick={() => props.onReview(String(c.changeRequestId))}>
                      {String(c.ownerStatus).includes('Approved')
                        ? 'View Approved Change'
                        : 'Review & Approve'}
                    </Button>
                  </div>
                </AtlasCard>
              </div>
            ))
          )}
        </div>
      ))}
    </div>
  );
}
