/**
 * Phase 6B-UX — Owner-facing Website Studio views.
 */

import type { ReactNode } from 'react';
import { AtlasCard, StatusChip } from '@hvcg/atlas-design-system';
import {
  Button,
  Caption1,
  Input,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Text,
  Textarea,
} from '@fluentui/react-components';
import {
  ADVISOR_PROMPTS,
  displayHost,
  friendlyPageName,
  inferSections,
  ownerChangeStatus,
  ownerChangeTitle,
  ownerRiskLabel,
  sectionForBlock,
  type StudioNavId,
  STUDIO_NAV,
} from './ownerHelpers';

const gold = 'var(--colorBrandBackground, #b08d57)';
const border = '1px solid var(--colorNeutralStroke2)';
const muted = 'var(--colorNeutralForeground3)';

export function StudioSidebar(props: {
  active: StudioNavId;
  onNavigate: (id: StudioNavId) => void;
  advancedMode: boolean;
}) {
  return (
    <nav
      style={{
        width: 220,
        flexShrink: 0,
        borderRight: border,
        padding: '8px 12px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {STUDIO_NAV.map((group) => {
        if (group.group === 'ADVANCED' && !props.advancedMode) {
          return (
            <div key={group.group}>
              <Caption1 style={{ letterSpacing: '0.06em', color: muted }}>{group.group}</Caption1>
              <button
                type="button"
                onClick={() => props.onNavigate('advanced')}
                style={navBtn(props.active === 'advanced' || props.active === 'settings')}
              >
                Developer Details
              </button>
            </div>
          );
        }
        return (
          <div key={group.group}>
            <Caption1 style={{ letterSpacing: '0.06em', color: muted }}>{group.group}</Caption1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 6 }}>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => props.onNavigate(item.id)}
                  style={navBtn(props.active === item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

function navBtn(active: boolean): React.CSSProperties {
  return {
    textAlign: 'left',
    border: 'none',
    background: active ? 'color-mix(in srgb, var(--colorBrandBackground) 18%, transparent)' : 'transparent',
    color: 'inherit',
    padding: '8px 10px',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: active ? 600 : 500,
    fontSize: 14,
  };
}

export function WebsiteSelector(props: {
  websites: Array<Record<string, unknown>>;
  selectedId: string;
  onSelect: (id: string) => void;
  showSynthetic: boolean;
}) {
  const list = props.websites.filter((w) => props.showSynthetic || !w.synthetic);
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 260 }}>
      <Caption1 style={{ color: muted }}>Website</Caption1>
      <select
        value={props.selectedId}
        onChange={(e) => props.onSelect(e.target.value)}
        style={{
          padding: '10px 12px',
          borderRadius: 10,
          border,
          background: 'var(--colorNeutralBackground1)',
          fontSize: 15,
          fontWeight: 600,
        }}
      >
        {list.map((w) => (
          <option key={String(w.websiteId)} value={String(w.websiteId)}>
            {String(w.websiteName)}
            {w.synthetic ? ' (TEST WEBSITE)' : ''}
          </option>
        ))}
      </select>
    </label>
  );
}

export function MetricRow(props: {
  items: Array<{ label: string; value: string | number; onClick?: () => void }>;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 12,
      }}
    >
      {props.items.map((m) => (
        <button
          key={m.label}
          type="button"
          onClick={m.onClick}
          style={{
            textAlign: 'left',
            border,
            borderRadius: 12,
            padding: 14,
            background: 'var(--colorNeutralBackground1)',
            cursor: m.onClick ? 'pointer' : 'default',
          }}
        >
          <Caption1 style={{ color: muted }}>{m.label}</Caption1>
          <div style={{ fontSize: 22, fontWeight: 650, marginTop: 4 }}>{m.value}</div>
        </button>
      ))}
    </div>
  );
}

export function WebsiteHomeView(props: {
  website: Record<string, unknown>;
  pagesCount: number;
  draftCount: number;
  seoIssues: number;
  needsApproval: number;
  preview: Record<string, unknown> | null;
  onEdit: () => void;
  onAskAi: () => void;
  onCreate: () => void;
  onManage: () => void;
  onFirstRun: (action: StudioNavId | 'editor') => void;
  showWelcome: boolean;
}) {
  const w = props.website;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <Button appearance="primary" onClick={props.onEdit}>
          Edit Website
        </Button>
        <Button onClick={props.onAskAi}>Ask AI to Make a Change</Button>
        <Button appearance="subtle" onClick={props.onCreate}>
          Create New Content
        </Button>
      </div>

      {props.showWelcome ? (
        <AtlasCard>
          <Text weight="semibold" size={500}>
            Welcome to Website Studio
          </Text>
          <Text style={{ display: 'block', marginTop: 6 }}>
            Manage {String(w.websiteName)}. What would you like to do?
          </Text>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            {(
              [
                ['Edit a Page', 'pages'],
                ['Ask AI to Make a Change', 'advisor'],
                ['Improve SEO', 'seo'],
                ['Update Images', 'media'],
                ['Review Draft Changes', 'drafts'],
              ] as const
            ).map(([label, id]) => (
              <Button key={label} onClick={() => props.onFirstRun(id)}>
                {label}
              </Button>
            ))}
          </div>
        </AtlasCard>
      ) : null}

      <AtlasCard>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <Text weight="semibold" size={600}>
              {String(w.websiteName).toUpperCase()}
            </Text>
            <Caption1 style={{ display: 'block', marginTop: 4 }}>
              {displayHost(w.productionUrl)}
            </Caption1>
            <div style={{ marginTop: 8 }}>
              <StatusChip
                label={w.synthetic ? 'TEST WEBSITE' : 'Live'}
                tone={w.synthetic ? 'warning' : 'success'}
              />
            </div>
            <div
              style={{
                display: 'flex',
                gap: 18,
                marginTop: 14,
                flexWrap: 'wrap',
                fontSize: 14,
              }}
            >
              <span>
                <strong>{props.pagesCount}</strong> Pages
              </span>
              <span>
                <strong>{props.draftCount}</strong> Draft Changes
              </span>
              <span>
                <strong>{props.seoIssues}</strong> SEO Opportunities
              </span>
              <span>
                <strong>{props.needsApproval}</strong> Needs My Approval
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
            <PreviewBadge preview={props.preview} />
            <Button appearance="primary" onClick={props.onManage}>
              Manage Website
            </Button>
          </div>
        </div>
      </AtlasCard>
    </div>
  );
}

export function PreviewBadge(props: { preview: Record<string, unknown> | null }) {
  const status = String(props.preview?.status || 'unknown');
  const running = status === 'running';
  return (
    <Caption1 style={{ color: muted }}>
      {running ? '● Local Preview Running' : status === 'offline' ? '○ Preview Offline' : '○ Preview status unknown'}
    </Caption1>
  );
}

export function PageManagerView(props: {
  pages: Array<Record<string, unknown>>;
  changeRequests: Array<Record<string, unknown>>;
  search: string;
  filter: string;
  onSearch: (v: string) => void;
  onFilter: (v: string) => void;
  onEdit: (pageId: string) => void;
  onSeo: (pageId: string) => void;
  onPreviewPage: (pageId: string) => void;
  previewUrl: string | null;
}) {
  const pendingIds = new Set(
    props.changeRequests.map((c) => String(c.pageId || '')).filter(Boolean),
  );
  let filtered = props.pages.filter((p) => {
    const name = friendlyPageName(p).toLowerCase();
    const q = props.search.toLowerCase().trim();
    if (q && !name.includes(q) && !String(p.route).includes(q)) return false;
    if (props.filter === 'Published') return String(p.status) === 'Published';
    if (props.filter === 'Draft Changes') return pendingIds.has(String(p.pageId));
    if (props.filter === 'SEO Issues') return !p.metaDescription || !p.seoTitle;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <Input
          value={props.search}
          onChange={(_, d) => props.onSearch(d.value)}
          placeholder="Search pages..."
          style={{ minWidth: 220 }}
        />
        {['All', 'Published', 'Draft Changes', 'SEO Issues'].map((f) => (
          <Button
            key={f}
            size="small"
            appearance={props.filter === f ? 'primary' : 'subtle'}
            onClick={() => props.onFilter(f)}
          >
            {f}
          </Button>
        ))}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 14,
        }}
      >
        {filtered.map((p) => {
          const seoOk = Boolean(p.seoTitle && p.metaDescription);
          return (
            <AtlasCard key={String(p.pageId)}>
              <div
                style={{
                  height: 88,
                  borderRadius: 10,
                  background:
                    'linear-gradient(135deg, color-mix(in srgb, var(--colorBrandBackground) 35%, #1a1a1a), #2a2a2a)',
                  marginBottom: 10,
                }}
              />
              <Text weight="semibold">{friendlyPageName(p)}</Text>
              <Caption1 style={{ display: 'block', color: muted }}>{String(p.route)}</Caption1>
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                <StatusChip label={String(p.status || 'Published')} tone="neutral" />
                <StatusChip
                  label={seoOk ? 'SEO OK' : 'SEO Needs Attention'}
                  tone={seoOk ? 'success' : 'warning'}
                />
                {pendingIds.has(String(p.pageId)) ? (
                  <StatusChip label="Pending change" tone="warning" />
                ) : null}
              </div>
              <Caption1 style={{ display: 'block', marginTop: 6 }}>
                Last modified: {String(p.lastModified || '—').slice(0, 10) || '—'}
              </Caption1>
              <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                <Button size="small" appearance="primary" onClick={() => props.onEdit(String(p.pageId))}>
                  Edit
                </Button>
                <Button
                  size="small"
                  onClick={() => props.onPreviewPage(String(p.pageId))}
                >
                  Preview
                </Button>
                <Button size="small" onClick={() => props.onSeo(String(p.pageId))}>
                  SEO
                </Button>
              </div>
            </AtlasCard>
          );
        })}
      </div>
    </div>
  );
}

export function VisualEditorView(props: {
  websiteName: string;
  pages: Array<Record<string, unknown>>;
  page: Record<string, unknown>;
  blocks: Array<Record<string, unknown>>;
  selectedBlockId: string | null;
  draftText: string;
  previewUrl: string | null;
  previewStatus: string;
  previewBusy: boolean;
  device: 'Desktop' | 'Tablet' | 'Mobile';
  analysis: Record<string, unknown> | null;
  rightMode: 'advisor' | 'edit';
  advancedMode: boolean;
  onSelectPage: (pageId: string) => void;
  onSelectBlock: (id: string) => void;
  onDraftChange: (v: string) => void;
  onSaveDraft: () => void;
  onDevice: (d: 'Desktop' | 'Tablet' | 'Mobile') => void;
  onAiAction: (action: string) => void;
  onRightMode: (m: 'advisor' | 'edit') => void;
  onStartPreview: () => void;
  onRestartPreview: () => void;
  onOpenFullscreen: () => void;
  advisor: ReactNode;
}) {
  const sections = inferSections(props.blocks);
  const selected = props.blocks.find((b) => b.blockId === props.selectedBlockId);
  const pageName = friendlyPageName(props.page);
  const running = props.previewStatus === 'running';
  const width = props.device === 'Mobile' ? 390 : props.device === 'Tablet' ? 768 : '100%';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(160px, 15%) minmax(0, 1fr) minmax(280px, 28%)',
        gap: 12,
        minHeight: 640,
        alignItems: 'stretch',
      }}
    >
      {/* Page / sections */}
      <div style={{ borderRight: border, paddingRight: 10, minWidth: 0 }}>
        <Caption1 style={{ color: muted }}>{props.websiteName}</Caption1>
        <Text weight="semibold" style={{ display: 'block' }}>
          › {pageName}
        </Text>
        <Caption1 style={{ display: 'block', marginTop: 4 }}>Page: {pageName}</Caption1>

        <label style={{ display: 'block', marginTop: 14 }}>
          <Caption1 style={{ color: muted }}>Page</Caption1>
          <select
            value={String(props.page.pageId)}
            onChange={(e) => props.onSelectPage(e.target.value)}
            style={{
              width: '100%',
              marginTop: 4,
              padding: '8px 10px',
              borderRadius: 8,
              border,
              background: 'var(--colorNeutralBackground1)',
              fontWeight: 600,
            }}
          >
            {props.pages.map((p) => (
              <option key={String(p.pageId)} value={String(p.pageId)}>
                {friendlyPageName(p)}
              </option>
            ))}
          </select>
        </label>

        <Caption1 style={{ display: 'block', margin: '14px 0 6px', color: muted }}>
          Page Sections
        </Caption1>
        {sections.length === 0 ? (
          <Caption1>No sections mapped yet.</Caption1>
        ) : (
          sections.map((s) => (
            <button
              key={s}
              type="button"
              style={navBtn(selected ? sectionForBlock(selected) === s : s === 'Hero')}
              onClick={() => {
                const block = props.blocks.find((b) => sectionForBlock(b) === s);
                if (block) {
                  props.onSelectBlock(String(block.blockId));
                  props.onRightMode('edit');
                }
              }}
            >
              {s}
            </button>
          ))
        )}

        <Caption1 style={{ display: 'block', marginTop: 14, color: muted }}>Blocks</Caption1>
        {props.blocks.length === 0 ? (
          <div style={{ marginTop: 6 }}>
            <Caption1>No editable blocks mapped yet.</Caption1>
          </div>
        ) : (
          props.blocks.map((b) => (
            <button
              key={String(b.blockId)}
              type="button"
              style={navBtn(props.selectedBlockId === b.blockId)}
              onClick={() => {
                props.onSelectBlock(String(b.blockId));
                props.onRightMode('edit');
              }}
            >
              {String(b.blockType)}
            </button>
          ))
        )}
      </div>

      {/* Dominant preview */}
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {(['Desktop', 'Tablet', 'Mobile'] as const).map((d) => (
            <Button
              key={d}
              size="small"
              appearance={props.device === d ? 'primary' : 'subtle'}
              onClick={() => props.onDevice(d)}
            >
              {d === 'Desktop' ? '🖥 ' : d === 'Tablet' ? '▦ ' : '▭ '}
              {d}
            </Button>
          ))}
          <div style={{ flex: 1 }} />
          {running ? (
            <Caption1 style={{ color: muted }}>● Preview Running</Caption1>
          ) : (
            <Caption1 style={{ color: muted }}>○ Preview Offline</Caption1>
          )}
          <Button size="small" disabled={props.previewBusy} onClick={props.onStartPreview}>
            Start Preview
          </Button>
          <Button size="small" disabled={props.previewBusy} onClick={props.onRestartPreview}>
            Restart Preview
          </Button>
          <Button size="small" disabled={!running} onClick={props.onOpenFullscreen}>
            Open Full Screen
          </Button>
        </div>

        <div
          style={{
            margin: '0 auto',
            width,
            maxWidth: '100%',
            flex: 1,
            border,
            borderRadius: 12,
            overflow: 'hidden',
            background: '#f4f4f4',
            minHeight: 560,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {running && props.previewUrl ? (
            <iframe
              title="Website preview"
              src={props.previewUrl}
              style={{ width: '100%', flex: 1, minHeight: 560, border: 'none', background: '#fff' }}
            />
          ) : (
            <div
              style={{
                flex: 1,
                display: 'grid',
                placeItems: 'center',
                padding: 32,
                textAlign: 'center',
                background: '#fafafa',
              }}
            >
              <div style={{ maxWidth: 420 }}>
                <Text weight="semibold" size={500}>
                  PREVIEW OFFLINE
                </Text>
                <Caption1 style={{ display: 'block', marginTop: 8 }}>
                  The local website preview is not currently running.
                </Caption1>
                <Button
                  appearance="primary"
                  style={{ marginTop: 16 }}
                  disabled={props.previewBusy}
                  onClick={props.onStartPreview}
                >
                  {props.previewBusy ? 'Starting…' : 'Start Preview'}
                </Button>
                {props.advancedMode ? (
                  <Caption1 style={{ display: 'block', marginTop: 12, color: muted }}>
                    Advanced: {props.previewUrl || 'http://127.0.0.1:8765/'}
                  </Caption1>
                ) : null}
                {props.blocks.length > 0 ? (
                  <div style={{ marginTop: 20, textAlign: 'left' }}>
                    <Caption1>Content map (editable while preview starts)</Caption1>
                    {props.blocks.slice(0, 4).map((b) => (
                      <button
                        key={String(b.blockId)}
                        type="button"
                        onClick={() => {
                          props.onSelectBlock(String(b.blockId));
                          props.onRightMode('edit');
                        }}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          border: '1px solid #e5e5e5',
                          borderRadius: 8,
                          padding: 10,
                          marginTop: 8,
                          background: '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        <Caption1>{String(b.blockType)}</Caption1>
                        <div style={{ fontSize: 13 }}>{String(b.currentValue).slice(0, 120)}</div>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Advisor | Edit */}
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <Button
            appearance={props.rightMode === 'advisor' ? 'primary' : 'secondary'}
            onClick={() => props.onRightMode('advisor')}
          >
            AI Advisor
          </Button>
          <Button
            appearance={props.rightMode === 'edit' ? 'primary' : 'secondary'}
            onClick={() => props.onRightMode('edit')}
          >
            Edit
          </Button>
        </div>

        {props.rightMode === 'advisor' ? (
          props.advisor
        ) : (
          <AtlasCard>
            {selected ? (
              <>
                <Text weight="semibold">
                  {String(selected.blockType) === 'headline'
                    ? 'Hero Heading'
                    : String(selected.blockType)}
                </Text>
                <Caption1 style={{ display: 'block', marginTop: 6 }}>Current</Caption1>
                <Text>{String(selected.currentValue)}</Text>
                <Caption1 style={{ display: 'block', marginTop: 10 }}>Proposed</Caption1>
                <Textarea
                  value={props.draftText}
                  onChange={(_, d) => props.onDraftChange(d.value)}
                  style={{ width: '100%', minHeight: 110, marginTop: 4 }}
                />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                  <Button appearance="primary" onClick={props.onSaveDraft}>
                    Save Draft
                  </Button>
                  {['Improve This', 'Give Me 3 Options', 'Make Shorter', 'Make Stronger'].map((a) => (
                    <Button key={a} size="small" onClick={() => props.onAiAction(a)}>
                      {a}
                    </Button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <Text weight="semibold">Edit</Text>
                <Caption1 style={{ display: 'block', marginTop: 8 }}>
                  Select a section or content block to edit. Clicking mapped content opens this panel.
                </Caption1>
                {props.blocks.length === 0 ? (
                  <Caption1 style={{ display: 'block', marginTop: 10 }}>
                    No editable blocks mapped yet. Use AI Advisor → Analyze This Page.
                  </Caption1>
                ) : null}
              </>
            )}
          </AtlasCard>
        )}
      </div>
    </div>
  );
}

export function ExpertAdvisorPanel(props: {
  analysis: Record<string, unknown> | null;
  chat: Array<{ role: 'user' | 'advisor'; text: string }>;
  chatInput: string;
  showMore: boolean;
  showFullHealth: boolean;
  busy: boolean;
  onChatInput: (v: string) => void;
  onSend: (msg?: string) => void;
  onAnalyze: () => void;
  onAnalyzeSite: () => void;
  onShowMore: () => void;
  onToggleFullHealth: () => void;
  onRecAction: (rec: Record<string, unknown>, action: string) => void;
}) {
  const health = (props.analysis?.health || {}) as Record<string, number>;
  const opps = ((props.analysis?.opportunities as Array<Record<string, unknown>>) || []) as Array<
    Record<string, unknown>
  >;
  const top = opps[0];
  const others = opps.slice(1, props.showMore ? 8 : 4);
  const score = Number(props.analysis?.overallScore || 0);
  const scoreLabel =
    score >= 80 ? 'Good' : score >= 65 ? 'Needs Attention' : score > 0 ? 'Needs Attention' : '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <AtlasCard>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
          <Text weight="semibold">Expert Website Advisor</Text>
          {props.analysis ? (
            <Caption1>
              Page Health {score} / 100 · {scoreLabel}
            </Caption1>
          ) : null}
        </div>
        {props.analysis ? (
          props.showFullHealth ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 8 }}>
              {Object.entries(health).map(([k, v]) => (
                <Caption1 key={k}>
                  {k.charAt(0).toUpperCase() + k.slice(1)} {v}
                </Caption1>
              ))}
            </div>
          ) : (
            <Caption1 style={{ display: 'block', marginTop: 6 }}>
              Messaging {health.messaging ?? '—'} · Conversion {health.conversion ?? '—'} · SEO{' '}
              {health.seo ?? '—'}
            </Caption1>
          )
        ) : (
          <Caption1 style={{ display: 'block', marginTop: 8 }}>
            Analyze this page to get a prioritized “what should I change first?” recommendation.
          </Caption1>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <Button appearance="primary" size="small" disabled={props.busy} onClick={props.onAnalyze}>
            Analyze This Page
          </Button>
          <Button size="small" appearance="subtle" onClick={props.onToggleFullHealth}>
            {props.showFullHealth ? 'Hide Full Analysis' : 'View Full Analysis'}
          </Button>
        </div>
      </AtlasCard>

      {top ? (
        <AtlasCard>
          <Caption1 style={{ color: muted }}>TOP RECOMMENDATION</Caption1>
          <Text weight="semibold" style={{ display: 'block', marginTop: 4 }}>
            {String(top.recommendation)}
          </Text>
          <Caption1 style={{ display: 'block', marginTop: 4 }}>
            {String(top.impact)} Impact · {String(top.effort)} Effort
          </Caption1>
          <Caption1 style={{ display: 'block', marginTop: 8 }}>{String(top.reason)}</Caption1>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <Button appearance="primary" onClick={() => props.onRecAction(top, 'Show Me Options')}>
              Show Me 3 Options
            </Button>
            <Button size="small" onClick={() => props.onRecAction(top, 'Save for Later')}>
              Save for Later
            </Button>
            <details>
              <summary style={{ cursor: 'pointer', fontSize: 12 }}>More</summary>
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                <Button size="small" onClick={() => props.onRecAction(top, 'Create Change Request')}>
                  Create Change Request
                </Button>
                <Button size="small" onClick={() => props.onRecAction(top, 'Ignore')}>
                  Ignore
                </Button>
              </div>
            </details>
          </div>
          <details style={{ marginTop: 10 }}>
            <summary style={{ cursor: 'pointer' }}>View Details</summary>
            <Caption1 style={{ display: 'block', marginTop: 6 }}>
              Expected benefit: {String(top.expectedBusinessBenefit)}
            </Caption1>
            <Caption1 style={{ display: 'block' }}>Category: {String(top.category)}</Caption1>
            <Caption1 style={{ display: 'block' }}>
              Confidence: {Math.round(Number(top.confidence || 0) * 100)}%
            </Caption1>
          </details>
        </AtlasCard>
      ) : null}

      {others.length > 0 ? (
        <AtlasCard>
          <Text weight="semibold">Other Opportunities ({others.length})</Text>
          {others.map((r) => (
            <div key={String(r.id)} style={{ borderTop: border, padding: '10px 0' }}>
              <Text weight="semibold">{String(r.recommendation)}</Text>
              <Caption1 style={{ display: 'block' }}>
                {String(r.impact)} Impact · {String(r.effort)} Effort
              </Caption1>
              <Caption1 style={{ display: 'block', marginTop: 4 }}>
                {String(r.reason).slice(0, 140)}
                {String(r.reason).length > 140 ? '…' : ''}
              </Caption1>
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                <Button size="small" appearance="primary" onClick={() => props.onRecAction(r, 'Show Me Options')}>
                  Show Me Options
                </Button>
                <Button size="small" onClick={() => props.onRecAction(r, 'Save for Later')}>
                  Save for Later
                </Button>
              </div>
              <details style={{ marginTop: 6 }}>
                <summary style={{ cursor: 'pointer' }}>View Details</summary>
                <Caption1 style={{ display: 'block', marginTop: 4 }}>
                  {String(r.expectedBusinessBenefit)}
                </Caption1>
              </details>
            </div>
          ))}
          {!props.showMore && opps.length > 5 ? (
            <Button appearance="subtle" size="small" onClick={props.onShowMore}>
              Show More
            </Button>
          ) : null}
        </AtlasCard>
      ) : null}

      <AtlasCard>
        <Text weight="semibold">Ask the Expert Website Advisor</Text>
        <div style={{ maxHeight: 120, overflow: 'auto', marginTop: 8 }}>
          {props.chat.map((m, i) => (
            <Caption1 key={i} style={{ display: 'block', marginBottom: 6 }}>
              <strong>{m.role === 'user' ? 'You' : 'Advisor'}:</strong> {m.text}
            </Caption1>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
          {ADVISOR_PROMPTS.slice(0, 3).map((p) => (
            <Button key={p} size="small" appearance="subtle" onClick={() => props.onSend(p)}>
              {p}
            </Button>
          ))}
        </div>
        <Textarea
          value={props.chatInput}
          onChange={(_, d) => props.onChatInput(d.value)}
          placeholder="What should I change first?"
          style={{ width: '100%', minHeight: 56, marginTop: 8 }}
        />
        <Button
          appearance="primary"
          style={{ marginTop: 8 }}
          disabled={props.busy || !props.chatInput.trim()}
          onClick={() => props.onSend()}
        >
          Send
        </Button>
      </AtlasCard>
    </div>
  );
}

export function ChangeReviewView(props: {
  changeRequests: Array<Record<string, unknown>>;
  advancedMode: boolean;
  previewUrl: string | null;
  deviceChecks: Record<string, boolean>;
  busy: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onPreview: (id: string) => void;
  onVisualApprove: (id: string) => void;
  onEdit: (id: string) => void;
  onToggleDevice: (key: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {props.changeRequests.length === 0 ? (
        <AtlasCard>
          <Caption1>No draft changes yet.</Caption1>
        </AtlasCard>
      ) : (
        props.changeRequests.map((cr) => (
          <AtlasCard key={String(cr.changeRequestId)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <Text weight="semibold">{ownerChangeTitle(cr)}</Text>
              <StatusChip label={ownerChangeStatus(cr)} tone="warning" />
            </div>
            <Caption1 style={{ display: 'block', marginTop: 8 }}>CHANGE SUMMARY</Caption1>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
              <div>
                <Caption1>Before</Caption1>
                <Text>{String(cr.originalContent || '—')}</Text>
              </div>
              <div>
                <Caption1>After</Caption1>
                <Text>{String(cr.mannyFinalWording || cr.proposedContent || '—')}</Text>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12 }}>
              <Caption1>Affected page: Home</Caption1>
              <Caption1>Risk: {ownerRiskLabel(cr.riskLevel || cr.tier)}</Caption1>
              <Caption1>SEO impact: {String(cr.seoImpact || 'No negative impact detected')}</Caption1>
              <Caption1>Forms affected: {cr.formImpact ? 'Yes' : 'No'}</Caption1>
              <Caption1>
                Estimated review:{' '}
                {String((cr.timeProtection as { estimatedReviewMinutes?: number })?.estimatedReviewMinutes ?? 1)}{' '}
                minute
              </Caption1>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              <Button onClick={() => props.onPreview(String(cr.changeRequestId))} disabled={props.busy}>
                Preview
              </Button>
              <Button
                appearance="primary"
                onClick={() => props.onVisualApprove(String(cr.changeRequestId))}
                disabled={props.busy}
              >
                Approve
              </Button>
              <Button onClick={() => props.onEdit(String(cr.changeRequestId))} disabled={props.busy}>
                Edit
              </Button>
              <Button onClick={() => props.onReject(String(cr.changeRequestId))} disabled={props.busy}>
                Reject
              </Button>
            </div>

            <div style={{ marginTop: 14, paddingTop: 10, borderTop: border }}>
              <Text weight="semibold">Does this look right?</Text>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                {['Desktop', 'Tablet', 'Mobile'].map((d) => (
                  <Button
                    key={d}
                    size="small"
                    appearance={props.deviceChecks[d] ? 'primary' : 'secondary'}
                    onClick={() => props.onToggleDevice(d)}
                  >
                    {d} {props.deviceChecks[d] ? '✓' : ''}
                  </Button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <Button
                  appearance="primary"
                  onClick={() => props.onVisualApprove(String(cr.changeRequestId))}
                  disabled={props.busy}
                >
                  Approve Change
                </Button>
                <Button onClick={() => props.onEdit(String(cr.changeRequestId))}>Make Another Edit</Button>
                <Button onClick={() => props.onReject(String(cr.changeRequestId))}>Reject</Button>
                {props.previewUrl ? (
                  <Button
                    onClick={() => window.open(props.previewUrl!, '_blank', 'noopener,noreferrer')}
                  >
                    Open Preview
                  </Button>
                ) : null}
              </div>
            </div>

            {props.advancedMode ? (
              <details style={{ marginTop: 12 }}>
                <summary style={{ cursor: 'pointer' }}>Developer Details</summary>
                <Caption1 style={{ display: 'block', marginTop: 8 }}>
                  ID: {String(cr.changeRequestId)}
                </Caption1>
                <Caption1 style={{ display: 'block' }}>Tier: {String(cr.tier)}</Caption1>
                <Caption1 style={{ display: 'block' }}>Branch: {String(cr.gitBranch || '—')}</Caption1>
                <Caption1 style={{ display: 'block' }}>Commit: {String(cr.commit || '—')}</Caption1>
                <Caption1 style={{ display: 'block' }}>
                  Baseline: {String(cr.baselineCommit || '—')}
                </Caption1>
                <Caption1 style={{ display: 'block' }}>
                  Worktree: {String(cr.worktreePath || '—')}
                </Caption1>
                <Caption1 style={{ display: 'block' }}>
                  Files: {(cr.filesExpectedToChange as string[] | undefined)?.join(', ') || '—'}
                </Caption1>
              </details>
            ) : (
              <details style={{ marginTop: 12 }}>
                <summary style={{ cursor: 'pointer' }}>Developer Details</summary>
                <Caption1 style={{ display: 'block', marginTop: 8 }}>
                  Turn on Advanced Mode for repository, branch, commit, and file details.
                </Caption1>
              </details>
            )}
          </AtlasCard>
        ))
      )}
    </div>
  );
}

export function SeoDashboardView(props: {
  pages: Array<Record<string, unknown>>;
  seo: Record<string, unknown> | null;
  selectedPageId: string;
  onSelectPage: (id: string) => void;
  onImprove: (kind: string) => void;
}) {
  const scored = props.pages.slice(0, 12).map((p) => {
    let score = 70;
    if (p.seoTitle) score += 10;
    if (p.metaDescription) score += 10;
    if (p.h1) score += 5;
    if (p.schemaMarkupPresent) score += 5;
    score = Math.min(100, score);
    const label = score >= 90 ? 'Excellent' : score >= 80 ? 'Good' : 'Needs Attention';
    return { page: p, score, label };
  });
  const missingMeta = props.pages.filter((p) => !p.metaDescription).length;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <MetricRow
        items={[
          { label: 'AI SEO Health Estimate', value: scored[0]?.score ?? '—' },
          { label: 'Pages Needing Attention', value: scored.filter((s) => s.score < 80).length },
          { label: 'Missing Meta Descriptions', value: missingMeta },
          { label: 'Schema Issues', value: props.pages.filter((p) => !p.schemaMarkupPresent).length },
        ]}
      />
      <AtlasCard>
        <Text weight="semibold">Pages</Text>
        {scored.map((s) => (
          <button
            key={String(s.page.pageId)}
            type="button"
            onClick={() => props.onSelectPage(String(s.page.pageId))}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              width: '100%',
              padding: '10px 0',
              border: 'none',
              borderTop: border,
              background: 'transparent',
              cursor: 'pointer',
              color: 'inherit',
            }}
          >
            <span>{friendlyPageName(s.page)}</span>
            <span>
              {s.score} {s.label}
            </span>
          </button>
        ))}
      </AtlasCard>
      {props.seo ? (
        <AtlasCard>
          <Text weight="semibold">Search result preview</Text>
          <div style={{ marginTop: 10 }}>
            <div style={{ color: '#1a0dab', fontSize: 18 }}>
              {String(
                props.seo.pageTitle ||
                  (props.seo as { seo?: { pageTitle?: string } }).seo?.pageTitle ||
                  'Page title',
              )}
            </div>
            <Caption1 style={{ color: '#006621' }}>highvaluecapitalgroup.com</Caption1>
            <Text style={{ display: 'block', marginTop: 4 }}>
              {String(
                (props.seo as { metaDescription?: string }).metaDescription ||
                  (props.seo as { seo?: { metaDescription?: string } }).seo?.metaDescription ||
                  'Meta description',
              )}
            </Text>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <Button size="small" onClick={() => props.onImprove('title')}>
              Improve SEO Title
            </Button>
            <Button size="small" onClick={() => props.onImprove('description')}>
              Improve Description
            </Button>
            <Button size="small" onClick={() => props.onImprove('options')}>
              Give Me 3 Options
            </Button>
          </div>
        </AtlasCard>
      ) : null}
    </div>
  );
}

export function MediaLibraryView(props: {
  media: Array<Record<string, unknown>>;
  filter: string;
  onFilter: (v: string) => void;
}) {
  const filtered = props.media.filter((m) => {
    if (props.filter === 'Missing Alt Text') return Boolean(m.missingAltText);
    if (props.filter === 'Unused') return Boolean(m.unused);
    if (props.filter === 'Images') return /image|jpg|png|webp|svg/i.test(String(m.fileType || m.filename));
    if (props.filter === 'Large Files') return Number(m.sizeBytes || 0) > 500_000;
    return true;
  });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['All', 'Images', 'Used', 'Unused', 'Missing Alt Text', 'Large Files'].map((f) => (
          <Button
            key={f}
            size="small"
            appearance={props.filter === f ? 'primary' : 'subtle'}
            onClick={() => props.onFilter(f)}
          >
            {f}
          </Button>
        ))}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 12,
        }}
      >
        {filtered.map((m) => (
          <AtlasCard key={String(m.mediaId)}>
            <div
              style={{
                height: 100,
                borderRadius: 8,
                background: 'linear-gradient(135deg,#333,#555)',
                marginBottom: 8,
              }}
            />
            <Text weight="semibold">{String(m.filename).replace(/\.[^.]+$/, '')}</Text>
            <Caption1 style={{ display: 'block' }}>{String(m.filename)}</Caption1>
            <Caption1 style={{ display: 'block' }}>
              Alt: {m.missingAltText ? 'Missing' : String(m.altText || '—')}
            </Caption1>
            <Caption1 style={{ display: 'block' }}>
              Used on: {(m.pagesUsed as string[] | undefined)?.join(', ') || '—'}
            </Caption1>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <Button size="small">Replace</Button>
              <Button size="small">Edit Alt Text</Button>
              <Button size="small">View Usage</Button>
            </div>
          </AtlasCard>
        ))}
      </div>
    </div>
  );
}

export function FormsView(props: { forms: Array<Record<string, unknown>>; advancedMode: boolean }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
      {props.forms.map((f) => (
        <AtlasCard key={String(f.formId)}>
          <Text weight="semibold">{String(f.formName)}</Text>
          <Caption1 style={{ display: 'block', marginTop: 4 }}>Location: form page</Caption1>
          <div style={{ marginTop: 8 }}>
            <StatusChip label={String(f.status || 'Working')} tone="success" />
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            <Button size="small">View Fields</Button>
            <Button size="small">Edit Text</Button>
            <Button size="small">Preview</Button>
          </div>
          {props.advancedMode ? (
            <details style={{ marginTop: 10 }}>
              <summary>Advanced Integration Details</summary>
              <Caption1 style={{ display: 'block' }}>
                Endpoint: {String(f.submissionEndpoint || '—')}
              </Caption1>
              <Caption1 style={{ display: 'block' }}>
                Integration: {String(f.currentIntegration || '—')}
              </Caption1>
              <Caption1 style={{ display: 'block' }}>
                High-risk endpoint: {String(f.endpointIsHighRisk)}
              </Caption1>
            </details>
          ) : null}
        </AtlasCard>
      ))}
    </div>
  );
}

export function AnalyticsView(props: { website: Record<string, unknown>; advancedMode: boolean }) {
  const configured = Boolean(props.website.analyticsProvider);
  return (
    <AtlasCard>
      <Text weight="semibold">Analytics</Text>
      <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
        <Caption1>Analytics: {configured ? 'Configured' : 'Not Configured'}</Caption1>
        <Caption1>Tracking: {configured ? 'Healthy' : 'Needs Review'}</Caption1>
        <Caption1>Key CTA tracking: Unknown</Caption1>
      </div>
      <Caption1 style={{ display: 'block', marginTop: 10, color: muted }}>
        Live traffic numbers are not invented when unavailable.
      </Caption1>
      {props.advancedMode ? (
        <details style={{ marginTop: 10 }}>
          <summary>Technical tracking configuration</summary>
          <Caption1 style={{ display: 'block' }}>
            Provider: {String(props.website.analyticsProvider || '—')}
          </Caption1>
        </details>
      ) : null}
    </AtlasCard>
  );
}

export function PublishingView(props: {
  changeRequests: Array<Record<string, unknown>>;
  onReview: (id: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <MessageBar intent="warning">
        <MessageBarBody>
          <MessageBarTitle>Production publishing is not enabled yet</MessageBarTitle>
          Production publishing will be enabled in a later approved phase. Approving a draft does not
          publish.
        </MessageBarBody>
      </MessageBar>
      {props.changeRequests.length === 0 ? (
        <AtlasCard>
          <Caption1>No approved drafts waiting for publishing review.</Caption1>
        </AtlasCard>
      ) : (
        props.changeRequests.map((cr) => (
          <AtlasCard key={String(cr.changeRequestId)}>
            <Text weight="semibold">Ready for Publishing Review</Text>
            <Text style={{ display: 'block', marginTop: 6 }}>
              {String(cr.ownerTitle || ownerChangeTitle(cr))}
            </Text>
            <Caption1 style={{ display: 'block' }}>
              {String(cr.websiteName || 'High Value Capital Group')} · APPROVED — NOT LIVE
            </Caption1>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <Button onClick={() => props.onReview(String(cr.changeRequestId))}>
                View Approved Change
              </Button>
              <Button
                appearance="primary"
                disabled
                title="Production publishing will be enabled in a later approved phase."
              >
                Publish
              </Button>
            </div>
            <Caption1 style={{ display: 'block', marginTop: 8, color: muted }}>
              Publish is disabled — Phase 6C remains separately authorized.
            </Caption1>
          </AtlasCard>
        ))
      )}
    </div>
  );
}

export function HistoryView(props: {
  changeRequests: Array<Record<string, unknown>>;
  advancedMode: boolean;
  onReview: (id: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {props.changeRequests.length === 0 ? (
        <AtlasCard>
          <Caption1>No change history yet.</Caption1>
        </AtlasCard>
      ) : (
        props.changeRequests.map((cr) => (
          <AtlasCard key={String(cr.changeRequestId)}>
            <Text weight="semibold">{String(cr.ownerTitle || ownerChangeTitle(cr))}</Text>
            <Caption1 style={{ display: 'block' }}>
              {String(cr.updatedAt || cr.createdAt || '').slice(0, 10)} ·{' '}
              {ownerChangeStatus(cr)}
            </Caption1>
            <Caption1 style={{ display: 'block' }}>
              Approved by Manny:{' '}
              {(cr.ownerApproval as { approvedAt?: string; invalidated?: boolean } | undefined)
                ?.approvedAt &&
              !(cr.ownerApproval as { invalidated?: boolean }).invalidated
                ? 'Yes (draft only)'
                : 'Pending'}{' '}
              · Production: UNCHANGED unless Published
            </Caption1>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <Button size="small" onClick={() => props.onReview(String(cr.changeRequestId))}>
                View Change
              </Button>
              <Button size="small" onClick={() => props.onReview(String(cr.changeRequestId))}>
                View Before/After
              </Button>
              <Button
                size="small"
                disabled
                title="Rollback from Website Studio is not enabled in this phase."
              >
                Rollback (coming later)
              </Button>
            </div>
            {props.advancedMode ? (
              <details style={{ marginTop: 8 }}>
                <summary>Technical commit information</summary>
                <Caption1 style={{ display: 'block' }}>{String(cr.commit || '—')}</Caption1>
                <Caption1 style={{ display: 'block' }}>
                  Audit: {String(cr.auditCorrelationId || '—')}
                </Caption1>
              </details>
            ) : null}
          </AtlasCard>
        ))
      )}
    </div>
  );
}

export function NaturalLanguageBar(props: {
  value: string;
  busy: boolean;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <AtlasCard>
      <Text weight="semibold">What would you like to change?</Text>
      <Textarea
        value={props.value}
        onChange={(_, d) => props.onChange(d.value)}
        placeholder="Change the homepage headline. Add an FAQ about SBA financing. Improve SEO for this page…"
        style={{ width: '100%', minHeight: 72, marginTop: 8 }}
      />
      <Button appearance="primary" style={{ marginTop: 8 }} disabled={props.busy} onClick={props.onSubmit}>
        Propose Change
      </Button>
      <Caption1 style={{ display: 'block', marginTop: 6 }}>
        Creates a Website Change Request only — nothing publishes until you approve.
      </Caption1>
    </AtlasCard>
  );
}

export function AdvancedPanel(props: {
  website: Record<string, unknown>;
  health: Record<string, unknown> | null;
  onBootstrap: () => void;
  busy: boolean;
}) {
  const w = props.website;
  return (
    <AtlasCard>
      <Text weight="semibold">Developer Details</Text>
      <Caption1 style={{ display: 'block', marginTop: 8 }}>Website ID: {String(w.websiteId)}</Caption1>
      <Caption1 style={{ display: 'block' }}>Repository: {String(w.repositoryUrl || '—')}</Caption1>
      <Caption1 style={{ display: 'block' }}>
        Local path: {String(w.localRepositoryPath || '—')}
      </Caption1>
      <Caption1 style={{ display: 'block' }}>Framework: {String(w.framework || '—')}</Caption1>
      <Caption1 style={{ display: 'block' }}>Synthetic: {String(w.synthetic)}</Caption1>
      <Caption1 style={{ display: 'block' }}>
        Preview command: {String(w.previewCommand || '—')}
      </Caption1>
      <Caption1 style={{ display: 'block' }}>Phase: {String(props.health?.phase || '6B-UX')}</Caption1>
      <details style={{ marginTop: 12 }}>
        <summary style={{ cursor: 'pointer' }}>Settings → Developer Tools</summary>
        <Button style={{ marginTop: 8 }} disabled={props.busy} onClick={props.onBootstrap}>
          Bootstrap HVCG Phase 6B pilot
        </Button>
        <Caption1 style={{ display: 'block', marginTop: 6 }}>
          Hidden from Owner Mode. Does not modify Production.
        </Caption1>
      </details>
    </AtlasCard>
  );
}

export function QaReadinessPanel(props: {
  readiness: {
    gate?: string;
    badge?: string;
    testedCommit?: string | null;
    ownerPackage?: {
      title?: string;
      website?: string;
      change?: string;
      estimatedReviewMinutes?: number;
      openReviewPath?: string;
      lines?: string[];
    } | null;
    latestRun?: Record<string, unknown> | null;
  } | null;
  advancedMode: boolean;
  onOpenReview?: () => void;
}) {
  const gate = String(props.readiness?.gate || 'NOT TESTED');
  const badge = String(props.readiness?.badge || 'NOT READY FOR REVIEW');
  const ready = gate === 'READY FOR MANNY';
  const failed = gate === 'FAILED QA';
  const testing = gate === 'TESTING';
  const ownerApproved = gate === 'OWNER APPROVED';
  const latest = props.readiness?.latestRun || null;
  const defects = (latest?.defects as Array<Record<string, unknown>>) || [];
  const categories = ['NOT TESTED', 'TESTING', 'FAILED QA', 'READY FOR MANNY', 'OWNER APPROVED'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <AtlasCard>
        <Text weight="semibold" size={500}>
          Website Studio Readiness
        </Text>
        <Caption1 style={{ display: 'block', marginTop: 8 }}>
          <span style={{ color: ready || ownerApproved ? '#2f6b3a' : failed ? '#8a1f1f' : muted }}>
            ●
          </span>{' '}
          {ready
            ? 'Automated QA Passed'
            : failed
              ? 'QA Failed'
              : testing
                ? 'QA Testing in progress'
                : ownerApproved
                  ? 'Owner approved draft (not published)'
                  : badge}
        </Caption1>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {categories.map((c) => (
            <StatusChip
              key={c}
              label={c}
              tone={
                gate === c
                  ? c === 'FAILED QA'
                    ? 'danger'
                    : c === 'READY FOR MANNY' || c === 'OWNER APPROVED'
                      ? 'success'
                      : 'warning'
                  : 'neutral'
              }
            />
          ))}
        </div>
        <Caption1 style={{ display: 'block', marginTop: 8 }} data-testid="ws-qa-gate-active">
          Active gate: {gate}
        </Caption1>
        {!ready && !ownerApproved ? (
          <StatusChip label="NOT READY FOR REVIEW" tone="warning" />
        ) : null}
        {failed ? (
          <Caption1 style={{ display: 'block', marginTop: 8 }}>
            {defects.length || 'Some'} issues need to be fixed before your review. Defects escalate —
            READY FOR MANNY is blocked until retest passes.
          </Caption1>
        ) : null}
        {props.readiness?.testedCommit ? (
          <Caption1 style={{ display: 'block', marginTop: 8, color: muted }}>
            Tested commit: {String(props.readiness.testedCommit).slice(0, 12)}
          </Caption1>
        ) : null}
        {ready && props.onOpenReview ? (
          <Button appearance="primary" style={{ marginTop: 12 }} onClick={props.onOpenReview}>
            Open Review
          </Button>
        ) : null}
      </AtlasCard>

      {ready && props.readiness?.ownerPackage ? (
        <AtlasCard>
          <Text weight="semibold">{String(props.readiness.ownerPackage.title || 'READY FOR YOUR REVIEW')}</Text>
          <Caption1 style={{ display: 'block', marginTop: 8 }}>
            Website: {String(props.readiness.ownerPackage.website)}
          </Caption1>
          <Caption1 style={{ display: 'block' }}>
            Change: {String(props.readiness.ownerPackage.change)}
          </Caption1>
          {(props.readiness.ownerPackage.lines || []).map((line) => (
            <Caption1 key={line} style={{ display: 'block', marginTop: line ? 2 : 8 }}>
              {line}
            </Caption1>
          ))}
        </AtlasCard>
      ) : null}

      {props.advancedMode && latest ? (
        <AtlasCard>
          <Text weight="semibold">Advanced QA evidence</Text>
          <Caption1 style={{ display: 'block', marginTop: 8 }}>
            Run: {String(latest.runId || '—')} · {String(latest.runType || '')}
          </Caption1>
          <Caption1 style={{ display: 'block' }}>
            Verdict: {String(latest.verdict || '—')}
          </Caption1>
          <Caption1 style={{ display: 'block' }}>
            Evidence: {String(latest.evidenceDir || '—')}
          </Caption1>
          <Caption1 style={{ display: 'block' }}>
            Defects: {defects.length} · Buttons:{' '}
            {String((latest.buttonInventory as { functional?: number })?.functional ?? '—')}/
            {String((latest.buttonInventory as { total?: number })?.total ?? '—')}
          </Caption1>
        </AtlasCard>
      ) : null}
    </div>
  );
}

export function LocalSystemStatusPanel(props: {
  status: {
    checkedAt?: string;
    owner?: Record<string, string>;
    advanced?: Record<string, unknown>;
  } | null;
  advancedMode: boolean;
  busy: boolean;
  onRefresh: () => void;
}) {
  const owner = props.status?.owner || {};
  const rows: Array<{ label: string; key: string }> = [
    { label: 'Atlas UI', key: 'atlasUi' },
    { label: 'Integration Hub', key: 'integrationHub' },
    { label: 'Local AI / Ollama', key: 'localAi' },
    { label: 'HVCG Preview', key: 'hvcgPreview' },
    { label: 'ClamAV', key: 'clamAv' },
    { label: 'SQLite', key: 'sqlite' },
  ];
  return (
    <AtlasCard>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <Text weight="semibold">Local System</Text>
        <Button size="small" disabled={props.busy} onClick={props.onRefresh}>
          Refresh
        </Button>
      </div>
      <Caption1 style={{ display: 'block', marginTop: 6, color: muted }}>
        Informational only — no Production actions. Website preview starts on demand from Website Studio.
      </Caption1>
      {rows.map((r) => {
        const value = owner[r.key] || 'Unknown';
        const running = /Running|Healthy|Available/i.test(value);
        return (
          <div
            key={r.key}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              borderTop: border,
              padding: '10px 0',
            }}
          >
            <Text>{r.label}</Text>
            <Caption1>
              <span style={{ color: running ? '#2f6b3a' : muted }}>●</span> {value}
            </Caption1>
          </div>
        );
      })}
      {props.status?.checkedAt ? (
        <Caption1 style={{ display: 'block', marginTop: 8, color: muted }}>
          Checked: {String(props.status.checkedAt).replace('T', ' ').slice(0, 19)} UTC
        </Caption1>
      ) : null}
      {props.advancedMode && props.status?.advanced ? (
        <details style={{ marginTop: 12 }}>
          <summary style={{ cursor: 'pointer' }}>Advanced local details</summary>
          <Caption1 style={{ display: 'block', marginTop: 8 }}>
            Logs: {String((props.status.advanced as { logsDir?: string }).logsDir || '—')}
          </Caption1>
          <Caption1 style={{ display: 'block' }}>
            Preview is on-demand (not LaunchAgent-managed).
          </Caption1>
          <Caption1 style={{ display: 'block' }}>
            Safety flags remain false for writes / EVA / emails.
          </Caption1>
        </details>
      ) : null}
    </AtlasCard>
  );
}
