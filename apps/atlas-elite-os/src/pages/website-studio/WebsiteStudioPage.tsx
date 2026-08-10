/**
 * Phase 6B-UX — Atlas Website Studio Owner Experience + Expert Website Advisor.
 * Route: /website-studio — governed CMS, not a competing app / not a full website builder.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Button,
  Caption1,
  MessageBar,
  MessageBarBody,
  Spinner,
  Switch,
  Text,
} from '@fluentui/react-components';
import { ModuleScaffold } from '../shared/ModuleScaffold';
import { useMicrosoftAuth } from '../../microsoft/auth/AuthProvider';
import { useHubAuth } from '../../integrations/hub/useHubAuth';
import {
  analyzeWebsiteStudioPage,
  analyzeWebsiteStudioSite,
  bootstrapWebsiteStudioPhase6b,
  decideWebsiteStudioChangeRequest,
  fetchWebsiteStudioBlocks,
  fetchWebsiteStudioChangeRequests,
  fetchWebsiteStudioDashboard,
  fetchWebsiteStudioForms,
  fetchWebsiteStudioHealth,
  fetchWebsiteStudioMedia,
  fetchWebsiteStudioOwnerInbox,
  fetchWebsiteStudioOwnerReview,
  fetchWebsiteStudioPages,
  fetchWebsiteStudioPreviewHealth,
  fetchWebsiteStudioPreviewPage,
  fetchWebsiteStudioPreviewSnapshot,
  fetchWebsiteStudioSeo,
  fetchWebsiteStudioWebsites,
  postWebsiteStudioAdvisorChat,
  postWebsiteStudioAiAssist,
  postWebsiteStudioDeviceReview,
  postWebsiteStudioIgnoreRecommendation,
  postWebsiteStudioNaturalLanguage,
  postWebsiteStudioOwnerApprove,
  postWebsiteStudioOwnerEdit,
  postWebsiteStudioSaveForLater,
  postWebsiteStudioThreeOptions,
  fetchWebsiteStudioLocalSystemStatus,
  restartWebsiteStudioPreview,
  startWebsiteStudioPreview,
} from '../../integrations/hub/api';
import {
  friendlyPageName,
  previewUrlFromWebsite,
  type StudioNavId,
} from './ownerHelpers';
import { ChangeReviewScreen, NeedsReviewHomeCards, OwnerDecisionInbox } from './ChangeReviewScreen';
import {
  AdvancedPanel,
  AnalyticsView,
  ExpertAdvisorPanel,
  FormsView,
  HistoryView,
  LocalSystemStatusPanel,
  MediaLibraryView,
  MetricRow,
  NaturalLanguageBar,
  PageManagerView,
  PublishingView,
  SeoDashboardView,
  StudioSidebar,
  VisualEditorView,
  WebsiteHomeView,
  WebsiteSelector,
} from './WebsiteStudioViews';

const MODE_KEY = 'atlas.websiteStudio.advancedMode.v1';
const WELCOME_KEY = 'atlas.websiteStudio.welcomeSeen.v1';

export function WebsiteStudioPage() {
  const { account, devOwnerActive } = useMicrosoftAuth();
  const hubAuth = useHubAuth();
  const [params, setParams] = useSearchParams();

  const nav = (params.get('view') as StudioNavId) || 'home';
  const [advancedMode, setAdvancedMode] = useState(() => {
    try {
      return sessionStorage.getItem(MODE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [showWelcome, setShowWelcome] = useState(() => {
    try {
      return sessionStorage.getItem(WELCOME_KEY) !== '1';
    } catch {
      return true;
    }
  });

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null);
  const [websites, setWebsites] = useState<Array<Record<string, unknown>>>([]);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState('');
  const [pages, setPages] = useState<Array<Record<string, unknown>>>([]);
  const [blocks, setBlocks] = useState<Array<Record<string, unknown>>>([]);
  const [media, setMedia] = useState<Array<Record<string, unknown>>>([]);
  const [forms, setForms] = useState<Array<Record<string, unknown>>>([]);
  const [changeRequests, setChangeRequests] = useState<Array<Record<string, unknown>>>([]);
  const [seo, setSeo] = useState<Record<string, unknown> | null>(null);
  const [previewHealth, setPreviewHealth] = useState<Record<string, unknown> | null>(null);
  const [pagePreviewUrl, setPagePreviewUrl] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [rightMode, setRightMode] = useState<'advisor' | 'edit'>('advisor');
  const [showFullHealth, setShowFullHealth] = useState(false);
  const previewAutoStarted = useRef(false);

  const [selectedPageId, setSelectedPageId] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState('');
  const [pageSearch, setPageSearch] = useState('');
  const [pageFilter, setPageFilter] = useState('All');
  const [mediaFilter, setMediaFilter] = useState('All');
  const [device, setDevice] = useState<'Desktop' | 'Tablet' | 'Mobile'>('Desktop');
  const [deviceChecks, setDeviceChecks] = useState<Record<string, boolean>>({
    Desktop: false,
    Tablet: false,
    Mobile: false,
  });
  const [nlText, setNlText] = useState('');
  const [analysis, setAnalysis] = useState<Record<string, unknown> | null>(null);
  const [siteAnalysis, setSiteAnalysis] = useState<Record<string, unknown> | null>(null);
  const [showMoreRecs, setShowMoreRecs] = useState(false);
  const [chat, setChat] = useState<Array<{ role: 'user' | 'advisor'; text: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [aiOptions, setAiOptions] = useState<string[]>([]);
  const [ownerInbox, setOwnerInbox] = useState<{
    needsReview: Array<Record<string, unknown>>;
    readyPreview: Array<Record<string, unknown>>;
    saved: Array<Record<string, unknown>>;
    approved: Array<Record<string, unknown>>;
    all: Array<Record<string, unknown>>;
  } | null>(null);
  const reviewCrId = params.get('cr') || '';
  const [ownerReview, setOwnerReview] = useState<Record<string, unknown> | null>(null);
  const [previewMode, setPreviewMode] = useState<'before' | 'after'>('after');
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editText, setEditText] = useState('');
  const [threeOptions, setThreeOptions] = useState<Array<Record<string, unknown>> | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [approvedResult, setApprovedResult] = useState<Record<string, unknown> | null>(null);
  const [localSystemStatus, setLocalSystemStatus] = useState<{
    checkedAt?: string;
    owner?: Record<string, string>;
    advanced?: Record<string, unknown>;
  } | null>(null);

  const setView = (view: StudioNavId, extra?: Record<string, string>) => {
    const next = new URLSearchParams(params);
    next.set('view', view);
    if (view !== 'review') next.delete('cr');
    if (extra) {
      for (const [k, v] of Object.entries(extra)) next.set(k, v);
    }
    setParams(next);
  };

  const openReview = (changeRequestId: string) => {
    setApprovedResult(null);
    setThreeOptions(null);
    setEditOpen(false);
    setApproveOpen(false);
    setPreviewMode('after');
    setView('review', { cr: changeRequestId });
  };

  const selectedWebsite = useMemo(
    () => websites.find((w) => w.websiteId === selectedWebsiteId) || null,
    [websites, selectedWebsiteId],
  );

  const selectedPage = useMemo(
    () => pages.find((p) => p.pageId === selectedPageId) || null,
    [pages, selectedPageId],
  );

  const previewUrl =
    pagePreviewUrl ||
    (previewHealth?.url as string | undefined) ||
    previewUrlFromWebsite(selectedWebsite) ||
    null;

  const previewStatus = String(previewHealth?.status || 'offline');

  const refreshPreviewHealth = useCallback(async () => {
    if (!hubAuth || !selectedWebsiteId) return;
    try {
      const ph = await fetchWebsiteStudioPreviewHealth(hubAuth, selectedWebsiteId);
      setPreviewHealth(ph.previewHealth);
      const pageUrl = await fetchWebsiteStudioPreviewPage(
        hubAuth,
        selectedWebsiteId,
        selectedPageId || undefined,
      );
      setPagePreviewUrl(pageUrl.url);
    } catch {
      setPreviewHealth({ status: 'offline' });
    }
  }, [hubAuth, selectedWebsiteId, selectedPageId]);

  const websiteCrs = useMemo(
    () =>
      changeRequests.filter(
        (c) => !selectedWebsiteId || c.websiteId === selectedWebsiteId,
      ),
    [changeRequests, selectedWebsiteId],
  );

  const refresh = useCallback(async () => {
    if (!hubAuth) return;
    setLoading(true);
    setError(null);
    try {
      const [h, d, w, crs] = await Promise.all([
        fetchWebsiteStudioHealth(hubAuth),
        fetchWebsiteStudioDashboard(hubAuth),
        fetchWebsiteStudioWebsites(hubAuth),
        fetchWebsiteStudioChangeRequests(hubAuth),
      ]);
      setHealth(h);
      setDashboard(d.dashboard as Record<string, unknown>);
      setWebsites(w.websites);
      setChangeRequests(crs.changeRequests);
      try {
        const inbox = await fetchWebsiteStudioOwnerInbox(hubAuth, selectedWebsiteId || undefined);
        setOwnerInbox(inbox);
      } catch {
        setOwnerInbox(null);
      }
      const preferred =
        selectedWebsiteId ||
        w.websites.find((x) => x.websiteId === 'ws_hvcg_real')?.websiteId ||
        w.websites.find((x) => !x.synthetic)?.websiteId ||
        w.websites[0]?.websiteId ||
        '';
      if (preferred && preferred !== selectedWebsiteId) setSelectedWebsiteId(String(preferred));
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
        const [p, m, f, b] = await Promise.all([
          fetchWebsiteStudioPages(hubAuth, selectedWebsiteId),
          fetchWebsiteStudioMedia(hubAuth, selectedWebsiteId),
          fetchWebsiteStudioForms(hubAuth, selectedWebsiteId),
          fetchWebsiteStudioBlocks(hubAuth, selectedWebsiteId),
        ]);
        setPages(p.pages);
        setMedia(m.media);
        setForms(f.forms);
        setBlocks(b.blocks);
        const home =
          p.pages.find((x) => x.route === '/') ||
          p.pages.find((x) => /home/i.test(String(x.pageTitle))) ||
          p.pages.find((x) => String(x.pageId).includes('home')) ||
          p.pages[0];
        const pageId = selectedPageId || (home?.pageId ? String(home.pageId) : '');
        if (pageId && pageId !== selectedPageId) setSelectedPageId(pageId);
        void refreshPreviewHealth();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [hubAuth, selectedWebsiteId, selectedPageId, refreshPreviewHealth]);

  useEffect(() => {
    void refreshPreviewHealth();
  }, [selectedPageId, refreshPreviewHealth]);

  useEffect(() => {
    if (!hubAuth || nav !== 'review' || !reviewCrId) return;
    void (async () => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetchWebsiteStudioOwnerReview(hubAuth, reviewCrId);
        setOwnerReview(res.review);
        setEditText(String(res.review.after || ''));
        const devices = (res.review.deviceReviews || {}) as Record<string, boolean>;
        setDeviceChecks({
          Desktop: Boolean(devices.Desktop),
          Tablet: Boolean(devices.Tablet),
          Mobile: Boolean(devices.Mobile),
        });
        const html = await fetchWebsiteStudioPreviewSnapshot(hubAuth, reviewCrId, previewMode);
        setPreviewHtml(html);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    })();
  }, [hubAuth, nav, reviewCrId]);

  useEffect(() => {
    if (!hubAuth || nav !== 'review' || !reviewCrId) return;
    void (async () => {
      try {
        const html = await fetchWebsiteStudioPreviewSnapshot(hubAuth, reviewCrId, previewMode);
        setPreviewHtml(html);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [hubAuth, nav, reviewCrId, previewMode]);

  useEffect(() => {
    if (!hubAuth || (nav !== 'settings' && nav !== 'advanced')) return;
    void (async () => {
      try {
        const status = await fetchWebsiteStudioLocalSystemStatus(hubAuth);
        setLocalSystemStatus(status);
      } catch {
        setLocalSystemStatus(null);
      }
    })();
  }, [hubAuth, nav]);

  useEffect(() => {
    if (!hubAuth || !selectedWebsiteId || !selectedPageId) return;
    void (async () => {
      try {
        const [pageBlocks, seoRes] = await Promise.all([
          fetchWebsiteStudioBlocks(hubAuth, selectedWebsiteId, selectedPageId),
          fetchWebsiteStudioSeo(hubAuth, selectedWebsiteId, selectedPageId),
        ]);
        setBlocks(pageBlocks.blocks);
        setSeo(seoRes.seo ? { ...seoRes.seo, issues: seoRes.issues } : (seoRes as Record<string, unknown>));
        const headline = pageBlocks.blocks.find((b) => b.blockType === 'headline');
        if (headline) {
          setSelectedBlockId(String(headline.blockId));
          setDraftText(String(headline.currentValue || ''));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [hubAuth, selectedWebsiteId, selectedPageId]);

  const dismissWelcome = () => {
    setShowWelcome(false);
    try {
      sessionStorage.setItem(WELCOME_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const toggleAdvanced = (on: boolean) => {
    setAdvancedMode(on);
    try {
      sessionStorage.setItem(MODE_KEY, on ? '1' : '0');
    } catch {
      /* ignore */
    }
  };

  const startPreview = async () => {
    if (!hubAuth || !selectedWebsiteId) return;
    setPreviewBusy(true);
    setError(null);
    try {
      const res = await startWebsiteStudioPreview(hubAuth, selectedWebsiteId);
      setPreviewHealth({
        ...res.preview,
        status: res.preview.status === 'running' ? 'running' : res.preview.status,
      });
      await refreshPreviewHealth();
      if (String(res.preview.status) !== 'running') {
        setError(String(res.preview.lastError || 'Preview did not become healthy'));
      } else {
        setNotice('Local preview is running.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPreviewBusy(false);
    }
  };

  const restartPreview = async () => {
    if (!hubAuth || !selectedWebsiteId) return;
    setPreviewBusy(true);
    try {
      await restartWebsiteStudioPreview(hubAuth, selectedWebsiteId);
      await refreshPreviewHealth();
      setNotice('Preview restarted.');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPreviewBusy(false);
    }
  };

  useEffect(() => {
    if (nav !== 'editor' || !selectedWebsiteId || previewAutoStarted.current || previewBusy) return;
    if (previewStatus === 'running') {
      previewAutoStarted.current = true;
      return;
    }
    previewAutoStarted.current = true;
    void startPreview();
  }, [nav, selectedWebsiteId, previewStatus, previewBusy]);

  const runNl = async (textOverride?: string) => {
    const text = (textOverride ?? nlText).trim();
    if (!hubAuth || !text) return;
    setBusy(true);
    setError(null);
    try {
      const res = await postWebsiteStudioNaturalLanguage(hubAuth, {
        text,
        websiteId: selectedWebsiteId || undefined,
        pageId: selectedPageId || undefined,
      });
      setNotice(
        `Change request created for your review. Nothing was published. (${res.changeRequest.changeRequestId})`,
      );
      setView('drafts');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const saveDraftFromEditor = async () => {
    if (!hubAuth || !selectedWebsiteId || !selectedBlockId) return;
    const block = blocks.find((b) => b.blockId === selectedBlockId);
    if (!block) return;
    setBusy(true);
    try {
      await postWebsiteStudioNaturalLanguage(hubAuth, {
        text: `Update ${String(block.blockType)} on ${friendlyPageName(selectedPage || {})} to: ${draftText}`,
        websiteId: selectedWebsiteId,
        pageId: selectedPageId || undefined,
      });
      setNotice('Draft change request saved — waiting for your approval. Files were not modified yet.');
      setView('drafts');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const runAiAction = async (action: string) => {
    if (!hubAuth || !selectedWebsiteId) return;
    setBusy(true);
    try {
      const op =
        action.includes('SEO')
          ? 'improve_meta_description'
          : action.includes('CTA')
            ? 'improve_cta'
            : 'improve_headline';
      const res = await postWebsiteStudioAiAssist(hubAuth, {
        websiteId: selectedWebsiteId,
        operation: op,
        content: draftText || undefined,
      });
      const proposal = String(
        (res as { proposal?: string; changeRequest?: { proposedContent?: string } }).proposal ||
          (res as { changeRequest?: { proposedContent?: string } }).changeRequest?.proposedContent ||
          '',
      );
      const options = proposal
        ? [proposal, `${proposal.replace(/\.$/, '')}.`, draftText].filter(Boolean)
        : [];
      setAiOptions(options.slice(0, 3));
      setNotice('AI proposed options — choose, edit, or reject. Nothing publishes until you approve.');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const analyzePage = async (pageIdOverride?: string) => {
    const pageId = pageIdOverride || selectedPageId;
    if (!hubAuth || !selectedWebsiteId || !pageId) return;
    setBusy(true);
    try {
      const res = await analyzeWebsiteStudioPage(hubAuth, selectedWebsiteId, pageId);
      setAnalysis(res.analysis);
      setView('editor');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const analyzeSite = async () => {
    if (!hubAuth || !selectedWebsiteId) return;
    setBusy(true);
    try {
      const res = await analyzeWebsiteStudioSite(hubAuth, selectedWebsiteId);
      setSiteAnalysis(res.analysis);
      setAnalysis(res.analysis);
      setNotice(String(res.analysis.summary || 'Site analysis complete'));
      setView('advisor');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const sendChat = async (msg?: string) => {
    if (!hubAuth || !selectedWebsiteId) return;
    const message = (msg || chatInput).trim();
    if (!message) return;
    setChat((c) => [...c, { role: 'user', text: message }]);
    setChatInput('');
    setBusy(true);
    try {
      const res = await postWebsiteStudioAdvisorChat(hubAuth, selectedWebsiteId, {
        message,
        pageId: selectedPageId || undefined,
      });
      setChat((c) => [...c, { role: 'advisor', text: res.chat.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onRecAction = async (rec: Record<string, unknown>, action: string) => {
    if (action === 'Ignore') {
      if (!hubAuth || !selectedWebsiteId) return;
      const choice =
        typeof window !== 'undefined'
          ? window.prompt(
              'Ignore this recommendation?\n\nType:\n  page — Ignore for this page (default)\n  permanent — Ignore permanently for this recommendation type\n  cancel — Cancel',
              'page',
            )
          : 'page';
      if (!choice || choice.toLowerCase() === 'cancel') return;
      const scope = choice.toLowerCase().startsWith('perm') ? 'permanent' : 'page';
      await postWebsiteStudioIgnoreRecommendation(hubAuth, {
        websiteId: selectedWebsiteId,
        recommendationId: String(rec.id || rec.recommendation),
        scope,
        pageId: selectedPageId || undefined,
      });
      setNotice(`Ignored recommendation (${scope}).`);
      return;
    }
    if (action === 'Save for Later') {
      const crId =
        reviewCrId ||
        String(ownerInbox?.needsReview?.[0]?.changeRequestId || changeRequests[0]?.changeRequestId || '');
      if (hubAuth && crId) {
        await postWebsiteStudioSaveForLater(hubAuth, crId);
        setNotice('Saved for later.');
        await refresh();
      } else {
        setNotice('Saved idea locally — open Draft Changes to continue.');
      }
      return;
    }
    if (action === 'Show Me Options' || action === 'Fix This') {
      const crId =
        reviewCrId ||
        String(
          changeRequests.find((c) => c.phase6bPilot || c.changeRequestId === 'wcr_96016971141f')
            ?.changeRequestId || '',
        );
      if (hubAuth && crId) {
        openReview(crId);
        const res = await postWebsiteStudioThreeOptions(hubAuth, crId);
        setThreeOptions(res.options);
        return;
      }
      setDraftText(String(blocks.find((b) => b.blockType === 'headline')?.currentValue || draftText));
      await runAiAction('Give Me 3 Options');
      setView('editor');
      return;
    }
    if (action === 'Create Change Request') {
      setNlText(String(rec.recommendation));
      setView('advisor');
      await runNl(String(rec.recommendation));
    }
  };

  if (!account && !devOwnerActive) {
    return (
      <ModuleScaffold title="Website Studio" subtitle="Sign in required">
        <Text>Microsoft sign-in required.</Text>
      </ModuleScaffold>
    );
  }

  const advisorPanel = (
    <ExpertAdvisorPanel
      analysis={analysis || siteAnalysis}
      chat={chat}
      chatInput={chatInput}
      showMore={showMoreRecs}
      showFullHealth={showFullHealth}
      busy={busy}
      onChatInput={setChatInput}
      onSend={(m) => void sendChat(m)}
      onAnalyze={() => void analyzePage()}
      onAnalyzeSite={() => void analyzeSite()}
      onShowMore={() => setShowMoreRecs(true)}
      onToggleFullHealth={() => setShowFullHealth((v) => !v)}
      onRecAction={(r, a) => void onRecAction(r, a)}
    />
  );

  return (
    <ModuleScaffold
      title="Website Studio"
      subtitle="Manage your websites, content, SEO, and updates from one place."
      showPendingBanner={false}
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Caption1>{advancedMode ? 'Advanced Mode on' : 'Owner Mode (default)'}</Caption1>
          <Switch
            checked={advancedMode}
            onChange={(_, d) => toggleAdvanced(d.checked)}
            label="Advanced Mode"
          />
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error ? (
          <MessageBar intent="error">
            <MessageBarBody>{error}</MessageBarBody>
          </MessageBar>
        ) : null}
        {notice ? (
          <MessageBar intent="success">
            <MessageBarBody>{notice}</MessageBarBody>
          </MessageBar>
        ) : null}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            alignItems: 'flex-end',
          }}
        >
          <WebsiteSelector
            websites={websites}
            selectedId={selectedWebsiteId}
            showSynthetic={advancedMode}
            onSelect={(id) => {
              setSelectedWebsiteId(id);
              setShowWelcome(true);
            }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button appearance="primary" onClick={() => setView('pages')}>
              Edit Website
            </Button>
            <Button
              onClick={() => {
                setView('advisor');
                dismissWelcome();
              }}
            >
              Ask AI to Make a Change
            </Button>
            <Button appearance="subtle" onClick={() => setView('content')}>
              Create New Content
            </Button>
            <Button appearance="subtle" disabled={loading} onClick={() => void refresh()}>
              Refresh
            </Button>
          </div>
        </div>

        {dashboard && nav !== 'editor' ? (
          <MetricRow
            items={[
              {
                label: 'Websites',
                value: Number(dashboard.registeredWebsites || websites.length),
                onClick: () => setView('home'),
              },
              {
                label: 'Draft Changes',
                value: Number(dashboard.openChangeRequests || websiteCrs.length),
                onClick: () => setView('drafts'),
              },
              {
                label: 'SEO Opportunities',
                value: Number(dashboard.seoIssues || 0),
                onClick: () => setView('seo'),
              },
              {
                label: 'Needs My Approval',
                value: Number(dashboard.mannyApprovalsRequired || 0),
                onClick: () => setView('approvals'),
              },
              {
                label: 'Ready to Preview',
                value: Number(dashboard.previewReady || 0),
                onClick: () => setView('drafts'),
              },
              {
                label: 'Time Saved (min)',
                value: Number(dashboard.estimatedMannyTimeSavedMinutes || 0),
              },
            ]}
          />
        ) : null}

        {loading ? <Spinner label="Loading Website Studio…" /> : null}

        <div style={{ display: 'flex', gap: 0, minHeight: 560, borderTop: '1px solid var(--colorNeutralStroke2)' }}>
          <StudioSidebar
            active={nav === 'editor' ? 'pages' : nav}
            advancedMode={advancedMode}
            onNavigate={(id) => {
              setView(id);
              dismissWelcome();
            }}
          />
          <div style={{ flex: 1, padding: '16px 18px 28px', minWidth: 0 }}>
            {selectedWebsite && nav === 'home' ? (
              <>
                <NeedsReviewHomeCards
                  items={ownerInbox?.needsReview || []}
                  onReview={(id) => openReview(id)}
                />
                {(ownerInbox?.readyPreview?.length || 0) > 0 ? (
                  <NeedsReviewHomeCards
                    title="READY TO PREVIEW"
                    items={ownerInbox?.readyPreview || []}
                    actionLabel="Preview This Change"
                    onReview={(id) => openReview(id)}
                  />
                ) : null}
                {(ownerInbox?.saved?.length || 0) > 0 ? (
                  <NeedsReviewHomeCards
                    title="SAVED FOR LATER"
                    items={ownerInbox?.saved || []}
                    actionLabel="Resume Review"
                    onReview={(id) => openReview(id)}
                  />
                ) : null}
                <WebsiteHomeView
                website={selectedWebsite}
                pagesCount={pages.length}
                draftCount={websiteCrs.length}
                seoIssues={Number(dashboard?.seoIssues || 0)}
                needsApproval={Number(dashboard?.mannyApprovalsRequired || 0)}
                preview={previewHealth}
                showWelcome={showWelcome}
                onEdit={() => {
                  dismissWelcome();
                  setView('pages');
                }}
                onAskAi={() => {
                  dismissWelcome();
                  setView('advisor');
                }}
                onCreate={() => {
                  dismissWelcome();
                  setView('content');
                }}
                onManage={() => {
                  dismissWelcome();
                  setView('pages');
                }}
                onFirstRun={(action) => {
                  dismissWelcome();
                  if (action === 'editor') setView('editor');
                  else if (action === 'drafts' && (ownerInbox?.needsReview?.[0]?.changeRequestId)) {
                    openReview(String(ownerInbox.needsReview[0].changeRequestId));
                  } else setView(action);
                }}
              />
              </>
            ) : null}

            {nav === 'review' ? (
              <ChangeReviewScreen
                review={ownerReview}
                busy={busy}
                previewMode={previewMode}
                previewHtml={previewHtml}
                device={device}
                editOpen={editOpen}
                editText={editText}
                options={threeOptions}
                approveOpen={approveOpen}
                approvedResult={approvedResult}
                onBack={() => setView('home')}
                onRefresh={() => {
                  setApprovedResult(null);
                  void refresh();
                  if (hubAuth && reviewCrId) {
                    void fetchWebsiteStudioOwnerReview(hubAuth, reviewCrId).then((r) =>
                      setOwnerReview(r.review),
                    );
                  }
                }}
                onPreviewMode={setPreviewMode}
                onDevice={setDevice}
                onLooksGood={(d) =>
                  void (async () => {
                    if (!hubAuth || !reviewCrId) return;
                    await postWebsiteStudioDeviceReview(hubAuth, reviewCrId, {
                      device: d,
                      looksGood: true,
                    });
                    setDeviceChecks((prev) => ({ ...prev, [d]: true }));
                    const r = await fetchWebsiteStudioOwnerReview(hubAuth, reviewCrId);
                    setOwnerReview(r.review);
                    setNotice(`${d} marked Looks Good.`);
                  })()
                }
                onOpenEdit={() => setEditOpen(true)}
                onCloseEdit={() => setEditOpen(false)}
                onEditText={setEditText}
                onSaveEdit={() =>
                  void (async () => {
                    if (!hubAuth || !reviewCrId) return;
                    setBusy(true);
                    try {
                      await postWebsiteStudioOwnerEdit(hubAuth, reviewCrId, editText);
                      setEditOpen(false);
                      setNotice('Draft updated — previous approval invalidated if any.');
                      const r = await fetchWebsiteStudioOwnerReview(hubAuth, reviewCrId);
                      setOwnerReview(r.review);
                      const html = await fetchWebsiteStudioPreviewSnapshot(
                        hubAuth,
                        reviewCrId,
                        'after',
                      );
                      setPreviewHtml(html);
                      setPreviewMode('after');
                    } catch (e) {
                      setError(e instanceof Error ? e.message : String(e));
                    } finally {
                      setBusy(false);
                    }
                  })()
                }
                onShowOptions={() =>
                  void (async () => {
                    if (!hubAuth || !reviewCrId) return;
                    const res = await postWebsiteStudioThreeOptions(hubAuth, reviewCrId);
                    setThreeOptions(res.options);
                  })()
                }
                onUseOption={(text) => {
                  setEditText(text);
                  setEditOpen(true);
                  setThreeOptions(null);
                }}
                onSaveForLater={() =>
                  void (async () => {
                    if (!hubAuth || !reviewCrId) return;
                    await postWebsiteStudioSaveForLater(hubAuth, reviewCrId);
                    setNotice('Saved for later.');
                    setView('drafts');
                    await refresh();
                  })()
                }
                onReject={() =>
                  void (async () => {
                    if (!hubAuth || !reviewCrId) return;
                    await decideWebsiteStudioChangeRequest(hubAuth, reviewCrId, 'reject');
                    setNotice('Change rejected.');
                    setView('home');
                    await refresh();
                  })()
                }
                onOpenApprove={() => setApproveOpen(true)}
                onCloseApprove={() => setApproveOpen(false)}
                onConfirmApprove={() =>
                  void (async () => {
                    if (!hubAuth || !reviewCrId) return;
                    setBusy(true);
                    try {
                      const result = await postWebsiteStudioOwnerApprove(hubAuth, reviewCrId, {
                        confirmed: true,
                        previewReviewed: true,
                        deviceReviews: deviceChecks,
                      });
                      setApproveOpen(false);
                      setApprovedResult(result);
                      setNotice('Change approved — not published. Production unchanged.');
                      await refresh();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : String(e));
                    } finally {
                      setBusy(false);
                    }
                  })()
                }
                onStartPreview={() => void startPreview()}
              />
            ) : null}

            {nav === 'pages' ? (
              <PageManagerView
                pages={pages}
                changeRequests={websiteCrs}
                search={pageSearch}
                filter={pageFilter}
                onSearch={setPageSearch}
                onFilter={setPageFilter}
                previewUrl={previewUrl}
                onEdit={(pageId) => {
                  setSelectedPageId(pageId);
                  setView('editor');
                  void analyzePage(pageId);
                }}
                onSeo={(pageId) => {
                  setSelectedPageId(pageId);
                  setView('seo');
                }}
              />
            ) : null}

            {nav === 'editor' && selectedPage ? (
              <VisualEditorView
                websiteName={String(selectedWebsite?.websiteName || 'Website')}
                pages={pages}
                page={selectedPage}
                blocks={blocks}
                selectedBlockId={selectedBlockId}
                draftText={draftText}
                previewUrl={previewUrl}
                previewStatus={previewStatus}
                previewBusy={previewBusy}
                device={device}
                analysis={analysis}
                rightMode={rightMode}
                advancedMode={advancedMode}
                onSelectPage={(pageId) => {
                  setSelectedPageId(pageId);
                  setRightMode('advisor');
                  void analyzePage(pageId);
                }}
                onSelectBlock={(id) => {
                  setSelectedBlockId(id);
                  const b = blocks.find((x) => x.blockId === id);
                  setDraftText(String(b?.currentValue || ''));
                  setRightMode('edit');
                }}
                onDraftChange={setDraftText}
                onSaveDraft={() => void saveDraftFromEditor()}
                onDevice={setDevice}
                onAiAction={(a) => void runAiAction(a)}
                onRightMode={setRightMode}
                onStartPreview={() => void startPreview()}
                onRestartPreview={() => void restartPreview()}
                onOpenFullscreen={() => {
                  if (previewUrl) window.open(previewUrl, '_blank', 'noopener,noreferrer');
                }}
                advisor={advisorPanel}
              />
            ) : null}

            {nav === 'advisor' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <NaturalLanguageBar
                    value={nlText}
                    busy={busy}
                    onChange={setNlText}
                    onSubmit={() => void runNl()}
                  />
                  {aiOptions.length ? (
                    <div>
                      <Text weight="semibold">AI content options</Text>
                      {aiOptions.map((opt, i) => (
                        <div
                          key={i}
                          style={{
                            borderTop: '1px solid var(--colorNeutralStroke2)',
                            padding: '10px 0',
                          }}
                        >
                          <Caption1>Option {i + 1}{i === 0 ? ' · Recommended' : ''}</Caption1>
                          <Text style={{ display: 'block' }}>{opt}</Text>
                          <Button
                            size="small"
                            style={{ marginTop: 6 }}
                            onClick={() => {
                              setDraftText(opt);
                              setView('editor');
                            }}
                          >
                            Choose Option {i + 1}
                          </Button>
                        </div>
                      ))}
                      <Button size="small" appearance="subtle" onClick={() => setAiOptions([])}>
                        Reject all
                      </Button>
                    </div>
                  ) : null}
                  {siteAnalysis ? (
                    <MessageBar intent="info">
                      <MessageBarBody>{String(siteAnalysis.summary)}</MessageBarBody>
                    </MessageBar>
                  ) : null}
                </div>
                {advisorPanel}
              </div>
            ) : null}

            {nav === 'content' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <NaturalLanguageBar
                  value={nlText}
                  busy={busy}
                  onChange={setNlText}
                  onSubmit={() => void runNl()}
                />
                <Caption1>
                  Select a page from Pages to edit content blocks visually, or describe a change above.
                </Caption1>
                <Button appearance="primary" onClick={() => setView('pages')}>
                  Open Page Manager
                </Button>
              </div>
            ) : null}

            {nav === 'seo' ? (
              <SeoDashboardView
                pages={pages}
                seo={seo}
                selectedPageId={selectedPageId}
                onSelectPage={(id) => setSelectedPageId(id)}
                onImprove={(kind) => void runAiAction(kind === 'title' ? 'Improve SEO' : 'Give Me 3 Options')}
              />
            ) : null}

            {nav === 'media' ? (
              <MediaLibraryView media={media} filter={mediaFilter} onFilter={setMediaFilter} />
            ) : null}

            {nav === 'blog' ? (
              <Caption1>
                Blog management uses the same governed change-request workflow. Open Pages and filter for Blog.
              </Caption1>
            ) : null}

            {nav === 'forms' ? <FormsView forms={forms} advancedMode={advancedMode} /> : null}

            {nav === 'analytics' && selectedWebsite ? (
              <AnalyticsView website={selectedWebsite} advancedMode={advancedMode} />
            ) : null}

            {nav === 'drafts' || nav === 'approvals' ? (
              <OwnerDecisionInbox
                mode={nav === 'approvals' ? 'approvals' : 'drafts'}
                inbox={ownerInbox}
                onReview={(id) => openReview(id)}
              />
            ) : null}

            {nav === 'publishing' ? (
              <PublishingView
                changeRequests={ownerInbox?.approved || websiteCrs}
                onReview={(id) => openReview(id)}
              />
            ) : null}

            {nav === 'history' ? (
              <HistoryView
                changeRequests={ownerInbox?.all || websiteCrs}
                advancedMode={advancedMode}
                onReview={(id) => openReview(id)}
              />
            ) : null}

            {(nav === 'advanced' || nav === 'settings') && selectedWebsite ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {nav === 'settings' ? (
                  <LocalSystemStatusPanel
                    status={localSystemStatus}
                    advancedMode={advancedMode}
                    busy={busy}
                    onRefresh={() =>
                      void (async () => {
                        if (!hubAuth) return;
                        setBusy(true);
                        try {
                          setLocalSystemStatus(await fetchWebsiteStudioLocalSystemStatus(hubAuth));
                        } catch (e) {
                          setError(e instanceof Error ? e.message : String(e));
                        } finally {
                          setBusy(false);
                        }
                      })()
                    }
                  />
                ) : null}
                <AdvancedPanel
                website={selectedWebsite}
                health={health}
                busy={busy}
                onBootstrap={() =>
                  void (async () => {
                    setBusy(true);
                    try {
                      await bootstrapWebsiteStudioPhase6b(hubAuth, {});
                      setNotice('Bootstrap completed (no Production changes).');
                      await refresh();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : String(e));
                    } finally {
                      setBusy(false);
                    }
                  })()
                }
              />
              </div>
            ) : null}
          </div>
        </div>

        <Caption1>
          <Link to="/ai-operations">← AI Operations</Link>
          {' · '}
          Production publishing always requires separate Manny authorization.
        </Caption1>
      </div>
    </ModuleScaffold>
  );
}
