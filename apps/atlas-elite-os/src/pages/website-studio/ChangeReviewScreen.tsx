/**
 * Owner Change Review — Phase 6B-UX approval workflow UI.
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

export function ChangeReviewScreen(props: {
  review: Record<string, unknown> | null;
  busy: boolean;
  previewMode: 'before' | 'after';
  previewHtml: string | null;
  device: 'Desktop' | 'Tablet' | 'Mobile';
  editOpen: boolean;
  editText: string;
  options: Array<Record<string, unknown>> | null;
  approveOpen: boolean;
  approvedResult: Record<string, unknown> | null;
  onBack: () => void;
  onRefresh: () => void;
  onPreviewMode: (m: 'before' | 'after') => void;
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
        <SpinnerLike />
        <Caption1>Loading change review…</Caption1>
      </AtlasCard>
    );
  }

  const identity = (r.previewIdentity || {}) as Record<string, unknown>;
  const devices = (r.deviceReviews || {}) as Record<string, boolean>;
  const width = props.device === 'Mobile' ? 390 : props.device === 'Tablet' ? 768 : '100%';
  const mismatch = identity.ok === false;

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
            REVIEW WEBSITE CHANGE
          </Text>
          <Caption1 style={{ display: 'block', marginTop: 4 }}>
            Website: {String((r.website as { websiteName?: string })?.websiteName)}
          </Caption1>
          <Caption1 style={{ display: 'block' }}>
            Page: {String((r.page as { pageName?: string })?.pageName)} · Section: {String(r.section)}
          </Caption1>
          <Caption1 style={{ display: 'block' }}>Change: {String(r.ownerTitle)}</Caption1>
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
        <Caption1>YOU ASKED</Caption1>
        <Text weight="semibold" style={{ display: 'block', marginTop: 4 }}>
          “{String(r.youAsked)}”
        </Text>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 14 }}>
          <div>
            <Caption1>CURRENT WEBSITE</Caption1>
            <Text style={{ display: 'block', marginTop: 4 }}>{String(r.before)}</Text>
          </div>
          <div>
            <Caption1>PROPOSED CHANGE</Caption1>
            <Text weight="semibold" style={{ display: 'block', marginTop: 4 }}>
              {String(r.after)}
            </Text>
          </div>
        </div>
      </AtlasCard>

      <AtlasCard>
        <Text weight="semibold">WHAT WILL CHANGE</Text>
        {((r.whatWillChange as Array<Record<string, string>>) || []).map((i, idx) => (
          <Caption1 key={idx} style={{ display: 'block', marginTop: 6 }}>
            {i.page} → {i.section} → {i.field}
          </Caption1>
        ))}
        <div style={{ marginTop: 10 }}>
          {((r.summaryLines as string[]) || []).map((line) => (
            <Caption1 key={line} style={{ display: 'block' }}>
              {line}
            </Caption1>
          ))}
        </div>
        <Caption1 style={{ display: 'block', marginTop: 8 }}>Risk: {String(r.risk)}</Caption1>
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
            Preview identity verified for draft {String(r.changeRequestId)} · NOT LIVE
          </MessageBarBody>
        </MessageBar>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(240px, 32%) minmax(0, 1fr)',
          gap: 14,
        }}
      >
        <AtlasCard>
          <Text weight="semibold">YOU ARE REVIEWING</Text>
          <Caption1 style={{ display: 'block', marginTop: 6 }}>{String(r.ownerTitle)}</Caption1>
          <Caption1 style={{ display: 'block', marginTop: 8 }}>Before</Caption1>
          <Text>“{String(r.before).slice(0, 90)}{String(r.before).length > 90 ? '…' : ''}”</Text>
          <Caption1 style={{ display: 'block', marginTop: 8 }}>After</Caption1>
          <Text weight="semibold">
            “{String(r.after).slice(0, 90)}{String(r.after).length > 90 ? '…' : ''}”
          </Text>
          <Caption1 style={{ display: 'block', marginTop: 8 }}>Status: Draft — Not Live</Caption1>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
            <Button
              size="small"
              appearance={props.previewMode === 'before' ? 'primary' : 'secondary'}
              onClick={() => props.onPreviewMode('before')}
            >
              View Before
            </Button>
            <Button
              size="small"
              appearance={props.previewMode === 'after' ? 'primary' : 'secondary'}
              onClick={() => props.onPreviewMode('after')}
            >
              View After
            </Button>
            <Button
              size="small"
              onClick={() =>
                props.onPreviewMode(props.previewMode === 'after' ? 'before' : 'after')
              }
            >
              Compare (toggle)
            </Button>
          </div>

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
              disabled={props.busy || mismatch}
              onClick={props.onOpenApprove}
              title={mismatch ? 'Preview version mismatch blocks approval' : undefined}
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
              Pilot commit: {String(r.pilotCommit || '—').slice(0, 12)}
            </Caption1>
            <Caption1 style={{ display: 'block' }}>
              Baseline: {String(r.baselineCommit || '—').slice(0, 12)}
            </Caption1>
            <Caption1 style={{ display: 'block' }}>Tier: {String(r.tier)}</Caption1>
          </details>
        </AtlasCard>

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
            <Text weight="semibold">
              {props.previewMode === 'before' ? 'BEFORE — Production baseline' : 'DRAFT PREVIEW — NOT LIVE'}
            </Text>
            <Caption1 style={{ display: 'block', color: '#ddd' }}>
              {String((r.website as { websiteName?: string })?.websiteName)} ·{' '}
              {String((r.page as { pageName?: string })?.pageName)} → {String(r.ownerTitle)} · Draft:{' '}
              {String(r.changeRequestId)}
            </Caption1>
          </div>
          <div
            style={{
              margin: '0 auto',
              width,
              maxWidth: '100%',
              border,
              borderRadius: 12,
              overflow: 'hidden',
              minHeight: 520,
              background: '#fff',
            }}
          >
            {props.previewHtml ? (
              <iframe
                title="Change preview"
                srcDoc={props.previewHtml}
                style={{ width: '100%', height: 560, border: 'none' }}
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
      </div>

      {props.editOpen ? (
        <AtlasCard>
          <Text weight="semibold">Edit · {String(r.ownerTitle)}</Text>
          <Caption1 style={{ display: 'block', marginTop: 6 }}>
            Homepage → Hero → Headline
          </Caption1>
          <Textarea
            value={props.editText}
            onChange={(_, d) => props.onEditText(d.value)}
            style={{ width: '100%', minHeight: 100, marginTop: 8 }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <Button appearance="primary" disabled={props.busy} onClick={props.onSaveEdit}>
              Save Draft
            </Button>
            <Button
              disabled={props.busy}
              onClick={() => props.onEditText(String(r.before || ''))}
            >
              Revert to current website wording
            </Button>
            <Button disabled={props.busy} onClick={props.onShowOptions}>
              Ask AI for 3 alternatives
            </Button>
            <Button onClick={props.onCloseEdit}>Cancel</Button>
          </div>
          <Caption1 style={{ display: 'block', marginTop: 8 }}>
            Saving a draft invalidates prior visual approval and requires review again.
          </Caption1>
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
              <Caption1>Website: {String((r.website as { websiteName?: string })?.websiteName)}</Caption1>
              <Caption1 style={{ display: 'block' }}>
                Page: {String((r.page as { pageName?: string })?.pageName)}
              </Caption1>
              <Caption1 style={{ display: 'block' }}>Change: {String(r.ownerTitle)}</Caption1>
              <Caption1 style={{ display: 'block', marginTop: 8 }}>BEFORE:</Caption1>
              <Text>{String(r.before)}</Text>
              <Caption1 style={{ display: 'block', marginTop: 8 }}>AFTER:</Caption1>
              <Text weight="semibold">{String(r.after)}</Text>
              <Caption1 style={{ display: 'block', marginTop: 10 }}>
                Preview reviewed: Yes · Production impact: NONE YET
              </Caption1>
              <MessageBar intent="warning" style={{ marginTop: 12 }}>
                <MessageBarBody>
                  <MessageBarTitle>WHAT HAPPENS NEXT</MessageBarTitle>
                  Approving will mark this draft approved by Manny and preserve evidence. It will NOT
                  publish, merge to main, deploy, send email, change DNS, or modify integrations.
                </MessageBarBody>
              </MessageBar>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={props.onCloseApprove}>
                Cancel
              </Button>
              <Button
                appearance="primary"
                disabled={props.busy || mismatch}
                onClick={props.onConfirmApprove}
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

function SpinnerLike() {
  return <Caption1>…</Caption1>;
}

export function NeedsReviewHomeCards(props: {
  title?: string;
  items: Array<Record<string, unknown>>;
  actionLabel?: string;
  onReview: (id: string) => void;
}) {
  if (!props.items.length) return null;
  return (
    <AtlasCard>
      <Text weight="semibold">{props.title || 'NEEDS YOUR REVIEW'}</Text>
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
              {String(c.websiteName || 'High Value Capital Group')} · Preview ready
            </Caption1>
            <Caption1 style={{ color: muted }}>{String(c.ownerStatus || 'Waiting for Your Review')}</Caption1>
          </div>
          <Button appearance="primary" onClick={() => props.onReview(String(c.changeRequestId))}>
            {props.actionLabel || 'Review Change'}
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
                    {String(c.websiteName || 'High Value Capital Group')} · Home · Low Risk · 1-minute review
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
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
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
                    {String(c.ownerStatus).includes('Approved') ? 'View Approved Change' : 'Review & Approve'}
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
