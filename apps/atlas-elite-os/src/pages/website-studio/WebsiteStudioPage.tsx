/**
 * Phase 6A — Atlas Website Studio (control plane only).
 * Route: /website-studio — not a competing app.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
  applyWebsiteStudioLocal,
  decideWebsiteStudioChangeRequest,
  fetchWebsiteStudioBlocks,
  fetchWebsiteStudioChangeRequests,
  fetchWebsiteStudioDashboard,
  fetchWebsiteStudioDeployments,
  fetchWebsiteStudioForms,
  fetchWebsiteStudioHealth,
  fetchWebsiteStudioMedia,
  fetchWebsiteStudioPages,
  fetchWebsiteStudioRollbacks,
  fetchWebsiteStudioSeo,
  fetchWebsiteStudioWebsites,
  postWebsiteStudioAiAssist,
  postWebsiteStudioNaturalLanguage,
  postWebsiteStudioPreview,
  scaffoldWebsiteStudioDeployment,
} from '../../integrations/hub/api';

const SECTIONS = [
  'Websites',
  'Pages',
  'Content',
  'SEO',
  'Media',
  'Forms',
  'Change Requests',
  'Preview & QA',
  'Deployments',
  'Rollback History',
  'Settings',
] as const;

type Section = (typeof SECTIONS)[number];

export function WebsiteStudioPage() {
  const { account } = useMicrosoftAuth();
  const hubAuth = useHubAuth();
  const [params, setParams] = useSearchParams();
  const section = (params.get('section') as Section) || 'Websites';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null);
  const [websites, setWebsites] = useState<Array<Record<string, unknown>>>([]);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>('');
  const [pages, setPages] = useState<Array<Record<string, unknown>>>([]);
  const [blocks, setBlocks] = useState<Array<Record<string, unknown>>>([]);
  const [media, setMedia] = useState<Array<Record<string, unknown>>>([]);
  const [forms, setForms] = useState<Array<Record<string, unknown>>>([]);
  const [changeRequests, setChangeRequests] = useState<Array<Record<string, unknown>>>([]);
  const [deployments, setDeployments] = useState<Array<Record<string, unknown>>>([]);
  const [rollbacks, setRollbacks] = useState<Array<Record<string, unknown>>>([]);
  const [seo, setSeo] = useState<Record<string, unknown> | null>(null);
  const [nlText, setNlText] = useState(
    'Change the homepage headline to emphasize capital advisory.',
  );
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const setSection = (s: Section) => {
    const next = new URLSearchParams(params);
    next.set('section', s);
    setParams(next);
  };

  const refresh = useCallback(async () => {
    if (!hubAuth) return;
    setLoading(true);
    setError(null);
    try {
      const [h, d, w, crs, deps, rbs] = await Promise.all([
        fetchWebsiteStudioHealth(hubAuth),
        fetchWebsiteStudioDashboard(hubAuth),
        fetchWebsiteStudioWebsites(hubAuth),
        fetchWebsiteStudioChangeRequests(hubAuth),
        fetchWebsiteStudioDeployments(hubAuth),
        fetchWebsiteStudioRollbacks(hubAuth),
      ]);
      setHealth(h);
      setDashboard(d.dashboard as Record<string, unknown>);
      setWebsites(w.websites);
      setChangeRequests(crs.changeRequests);
      setDeployments(deps.deployments);
      setRollbacks(rbs.rollbacks);
      const firstId =
        selectedWebsiteId ||
        (w.websites[0]?.websiteId as string | undefined) ||
        '';
      if (firstId && firstId !== selectedWebsiteId) setSelectedWebsiteId(firstId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [hubAuth, selectedWebsiteId]);

  useEffect(() => {
    void refresh();
  }, [hubAuth]);

  useEffect(() => {
    if (!hubAuth || !selectedWebsiteId) return;
    void (async () => {
      try {
        const [p, b, m, f] = await Promise.all([
          fetchWebsiteStudioPages(hubAuth, selectedWebsiteId),
          fetchWebsiteStudioBlocks(hubAuth, selectedWebsiteId),
          fetchWebsiteStudioMedia(hubAuth, selectedWebsiteId),
          fetchWebsiteStudioForms(hubAuth, selectedWebsiteId),
        ]);
        setPages(p.pages);
        setBlocks(b.blocks);
        setMedia(m.media);
        setForms(f.forms);
        const home = p.pages.find((x) => x.route === '/') || p.pages[0];
        if (home?.pageId) {
          const s = await fetchWebsiteStudioSeo(
            hubAuth,
            selectedWebsiteId,
            String(home.pageId),
          );
          setSeo(s as Record<string, unknown>);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [hubAuth, selectedWebsiteId]);

  const selectedWebsite = useMemo(
    () => websites.find((w) => w.websiteId === selectedWebsiteId),
    [websites, selectedWebsiteId],
  );

  const runNl = async () => {
    if (!hubAuth) return;
    setBusy(true);
    setLastResult(null);
    try {
      const res = await postWebsiteStudioNaturalLanguage(hubAuth, {
        text: nlText,
        websiteId: selectedWebsiteId || undefined,
      });
      setLastResult(
        `Change request ${res.changeRequest.changeRequestId} created — filesModified=${res.filesModified}`,
      );
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const decide = async (id: string, decision: 'approve' | 'reject') => {
    if (!hubAuth) return;
    setBusy(true);
    try {
      await decideWebsiteStudioChangeRequest(hubAuth, id, decision);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const applyLocal = async (id: string) => {
    if (!hubAuth) return;
    setBusy(true);
    try {
      const res = await applyWebsiteStudioLocal(hubAuth, id);
      setLastResult(
        `Sandbox apply: pushed=${String(res.pushed)} deployed=${String(res.deployed)}`,
      );
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const preview = async (id: string) => {
    if (!hubAuth) return;
    setBusy(true);
    try {
      const res = await postWebsiteStudioPreview(hubAuth, id);
      setLastResult(`Preview: ${String((res.preview as { localUrl?: string }).localUrl || '')}`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const scaffoldDeploy = async (id: string) => {
    if (!hubAuth) return;
    setBusy(true);
    try {
      const res = await scaffoldWebsiteStudioDeployment(hubAuth, id);
      setLastResult(`Deployment scaffolded (executed=${String(res.executed)})`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const improveHeadline = async () => {
    if (!hubAuth || !selectedWebsiteId) return;
    setBusy(true);
    try {
      const block = blocks.find((b) => b.blockType === 'headline');
      const res = await postWebsiteStudioAiAssist(hubAuth, {
        websiteId: selectedWebsiteId,
        operation: 'improve_headline',
        content: block ? String(block.currentValue) : 'Capital Advisory',
      });
      setLastResult(`AI proposal staged on ${res.changeRequest.changeRequestId}`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!account) {
    return (
      <ModuleScaffold title="Website Studio" subtitle="Sign in required">
        <Text>Microsoft sign-in required.</Text>
      </ModuleScaffold>
    );
  }

  return (
    <ModuleScaffold
      title="Website Studio"
      subtitle="Governed content & SEO control plane — Phase 6A (no Production deploy)"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <MessageBar intent="warning">
          <MessageBarBody>
            <MessageBarTitle>LOCAL CONTROL PLANE ONLY</MessageBarTitle>
            No Production website edits, no push, no merge, no deploy in Phase 6A. Manny remains
            final approval authority.
          </MessageBarBody>
        </MessageBar>

        {error ? (
          <MessageBar intent="error">
            <MessageBarBody>{error}</MessageBarBody>
          </MessageBar>
        ) : null}
        {lastResult ? (
          <MessageBar intent="success">
            <MessageBarBody>{lastResult}</MessageBarBody>
          </MessageBar>
        ) : null}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SECTIONS.map((s) => (
            <Button
              key={s}
              appearance={section === s ? 'primary' : 'secondary'}
              size="small"
              onClick={() => setSection(s)}
            >
              {s}
            </Button>
          ))}
          <Button appearance="subtle" size="small" onClick={() => void refresh()} disabled={loading}>
            Refresh
          </Button>
        </div>

        {loading ? <Spinner label="Loading Website Studio…" /> : null}

        {dashboard ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 12,
            }}
          >
            {[
              ['Websites', dashboard.registeredWebsites],
              ['Open CRs', dashboard.openChangeRequests],
              ['SEO issues', dashboard.seoIssues],
              ['Manny approvals', dashboard.mannyApprovalsRequired],
              ['Preview ready', dashboard.previewReady],
              ['Time saved (min)', dashboard.estimatedMannyTimeSavedMinutes],
            ].map(([label, value]) => (
              <AtlasCard key={String(label)}>
                <Caption1>{label}</Caption1>
                <Text weight="semibold" size={500}>
                  {String(value ?? '—')}
                </Text>
              </AtlasCard>
            ))}
          </div>
        ) : null}

        <AtlasCard>
          <Text weight="semibold">Active website</Text>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {websites.map((w) => (
              <Button
                key={String(w.websiteId)}
                size="small"
                appearance={selectedWebsiteId === w.websiteId ? 'primary' : 'secondary'}
                onClick={() => setSelectedWebsiteId(String(w.websiteId))}
              >
                {String(w.websiteName)}
              </Button>
            ))}
          </div>
          {selectedWebsite ? (
            <Caption1 style={{ display: 'block', marginTop: 8 }}>
              {String(selectedWebsite.framework)} · {String(selectedWebsite.status)} · synthetic=
              {String(selectedWebsite.synthetic)}
            </Caption1>
          ) : null}
        </AtlasCard>

        {section === 'Websites' || section === 'Settings' ? (
          <AtlasCard>
            <Text weight="semibold">{section}</Text>
            <Caption1 style={{ display: 'block', marginTop: 4 }}>
              Multi-website registry. Real repositories require Manny confirmation. Phase:{' '}
              {String(health?.phase || '6A')}
            </Caption1>
            <ul>
              {websites.map((w) => (
                <li key={String(w.websiteId)}>
                  <strong>{String(w.websiteName)}</strong> — {String(w.businessEntity)} — open CRs:{' '}
                  {String(w.openChangeRequestCount)}
                </li>
              ))}
            </ul>
            {section === 'Settings' ? (
              <Caption1>
                Access: Manny full control; Local AI Operations Agent draft/propose only; Automation
                build/QA only. Production deploy always requires explicit Manny approval (blocked in
                6A).
              </Caption1>
            ) : null}
          </AtlasCard>
        ) : null}

        {section === 'Pages' ? (
          <AtlasCard>
            <Text weight="semibold">Page inventory</Text>
            <ul>
              {pages.map((p) => (
                <li key={String(p.pageId)}>
                  <code>{String(p.route)}</code> — {String(p.pageTitle)} —{' '}
                  <StatusChip label={String(p.status)} tone="neutral" />
                </li>
              ))}
            </ul>
          </AtlasCard>
        ) : null}

        {section === 'Content' ? (
          <AtlasCard>
            <Text weight="semibold">Content blocks</Text>
            <Caption1>No raw code editing via normal blocks.</Caption1>
            <ul>
              {blocks.map((b) => (
                <li key={String(b.blockId)}>
                  [{String(b.blockType)}] {String(b.currentValue).slice(0, 80)}
                  {b.proposedValue ? ` → proposed: ${String(b.proposedValue).slice(0, 60)}` : ''}
                </li>
              ))}
            </ul>
            <Button appearance="primary" onClick={() => void improveHeadline()} disabled={busy}>
              AI: improve headline (propose only)
            </Button>
          </AtlasCard>
        ) : null}

        {section === 'SEO' ? (
          <AtlasCard>
            <Text weight="semibold">SEO editor (controlled fields)</Text>
            {seo ? (
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>
                {JSON.stringify(seo, null, 2)}
              </pre>
            ) : (
              <Caption1>Select a website with pages to load SEO fields.</Caption1>
            )}
          </AtlasCard>
        ) : null}

        {section === 'Media' ? (
          <AtlasCard>
            <Text weight="semibold">Media inventory (local preview only)</Text>
            <ul>
              {media.map((m) => (
                <li key={String(m.mediaId)}>
                  {String(m.filename)} — alt:{' '}
                  {m.missingAltText ? 'MISSING' : String(m.altText || '—')} — unused=
                  {String(m.unused)}
                </li>
              ))}
            </ul>
          </AtlasCard>
        ) : null}

        {section === 'Forms' ? (
          <AtlasCard>
            <Text weight="semibold">Forms inventory</Text>
            <Caption1>
              Labels/help text may be edited via change requests. Endpoints/auth/payments require
              developer-style CRs.
            </Caption1>
            <ul>
              {forms.map((f) => (
                <li key={String(f.formId)}>
                  {String(f.formName)} — highRiskEndpoint={String(f.endpointIsHighRisk)} —{' '}
                  {String(f.status)}
                </li>
              ))}
            </ul>
          </AtlasCard>
        ) : null}

        {section === 'Change Requests' || section === 'Preview & QA' ? (
          <>
            <AtlasCard>
              <Text weight="semibold">Natural-language edit</Text>
              <Caption1>
                Creates a change request only — does not modify files until Manny approves.
              </Caption1>
              <Textarea
                value={nlText}
                onChange={(_, d) => setNlText(d.value)}
                style={{ width: '100%', marginTop: 8, minHeight: 80 }}
              />
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <Button appearance="primary" onClick={() => void runNl()} disabled={busy}>
                  Propose change request
                </Button>
              </div>
            </AtlasCard>

            <AtlasCard>
              <Text weight="semibold">Change requests</Text>
              {changeRequests.length === 0 ? (
                <Caption1>No change requests yet.</Caption1>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {changeRequests.map((cr) => (
                    <li
                      key={String(cr.changeRequestId)}
                      style={{
                        borderTop: '1px solid var(--colorNeutralStroke2)',
                        padding: '12px 0',
                      }}
                    >
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <StatusChip label={String(cr.status)} tone="neutral" />
                        <Caption1>{String(cr.tier)}</Caption1>
                        <Caption1>{String(cr.changeRequestId)}</Caption1>
                      </div>
                      <Text>{String(cr.reason)}</Text>
                      <Caption1 style={{ display: 'block' }}>
                        {String(cr.originalContent || '—')} → {String(cr.proposedContent || '—')}
                      </Caption1>
                      <Caption1>
                        Review ~{String((cr.timeProtection as { estimatedReviewMinutes?: number })?.estimatedReviewMinutes)}{' '}
                        min · {String((cr.timeProtection as { recommendedAction?: string })?.recommendedAction)}
                      </Caption1>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                        <Button
                          size="small"
                          onClick={() => void decide(String(cr.changeRequestId), 'approve')}
                          disabled={busy || cr.status !== 'Waiting on Manny'}
                        >
                          Approve for Git
                        </Button>
                        <Button
                          size="small"
                          onClick={() => void decide(String(cr.changeRequestId), 'reject')}
                          disabled={busy}
                        >
                          Reject
                        </Button>
                        <Button
                          size="small"
                          onClick={() => void applyLocal(String(cr.changeRequestId))}
                          disabled={busy || cr.status !== 'Approved for Git'}
                        >
                          Apply sandbox
                        </Button>
                        <Button
                          size="small"
                          onClick={() => void preview(String(cr.changeRequestId))}
                          disabled={busy}
                        >
                          Preview scaffold
                        </Button>
                        <Button
                          size="small"
                          onClick={() => void scaffoldDeploy(String(cr.changeRequestId))}
                          disabled={busy}
                        >
                          Deploy scaffold (no execute)
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </AtlasCard>
          </>
        ) : null}

        {section === 'Deployments' ? (
          <AtlasCard>
            <Text weight="semibold">Deployments (scaffolding only)</Text>
            {deployments.length === 0 ? (
              <Caption1>No deployment records. Phase 6A never executes deploys.</Caption1>
            ) : (
              <ul>
                {deployments.map((d) => (
                  <li key={String(d.deploymentId)}>
                    {String(d.deploymentId)} — {String(d.status)} — execute=
                    {String(d.phase6aNoExecute)}
                  </li>
                ))}
              </ul>
            )}
          </AtlasCard>
        ) : null}

        {section === 'Rollback History' ? (
          <AtlasCard>
            <Text weight="semibold">Rollback history (scaffolding only)</Text>
            {rollbacks.length === 0 ? (
              <Caption1>No rollback records. Phase 6A never executes rollbacks.</Caption1>
            ) : (
              <ul>
                {rollbacks.map((r) => (
                  <li key={String(r.rollbackId)}>
                    {String(r.rollbackId)} — {String(r.outcome)}
                  </li>
                ))}
              </ul>
            )}
          </AtlasCard>
        ) : null}

        <Caption1>
          <Link to="/ai-operations">← AI Operations</Link>
          {' · '}
          Hub: Integration API <code>/api/website-studio/*</code>
        </Caption1>
      </div>
    </ModuleScaffold>
  );
}
