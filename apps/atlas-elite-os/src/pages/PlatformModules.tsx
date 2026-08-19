import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AccessDeniedState,
  AtlasCard,
  EmptyState,
  GlobalSearch,
  LoadingState,
  StatusChip,
  type SearchResult,
} from '@hvcg/atlas-design-system';
import { Button, Caption1, Text } from '@fluentui/react-components';
import { BotRegular, DocumentDataRegular } from '@fluentui/react-icons';
import { ModuleScaffold } from './shared/ModuleScaffold';
import { HubHttpError } from '../integrations/hub/hubFetch';
import { searchPm, type PmSearchHit } from '../integrations/hub/pmApi';
import { useHubAuth } from '../integrations/hub/useHubAuth';

const KIND_LABEL: Record<string, string> = {
  client: 'Client',
  project: 'Project',
  task: 'Task',
  opportunity: 'Opportunity',
  capital_opportunity: 'Capital opportunity',
  lead: 'Lead',
  lender: 'Lender',
  document: 'Document',
  communication: 'Communication',
  meeting: 'Meeting',
  engagement: 'Engagement',
  deliverable: 'Deliverable',
  decision: 'Decision',
  vendor: 'Vendor',
};

function kindLabel(kind: string): string {
  return KIND_LABEL[kind] || kind;
}

export function KnowledgePage() {
  const auth = useHubAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<PmSearchHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<string>('');

  useEffect(() => {
    if (!auth.tokenReady) return;
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setError(null);
      setDenied(false);
      setScope('');
      setBusy(false);
      return;
    }
    if (!auth.hasBearer) {
      setHits([]);
      setDenied(true);
      setError('Microsoft sign-in required (Bearer token missing)');
      setBusy(false);
      return;
    }
    let cancelled = false;
    setBusy(true);
    setError(null);
    setDenied(false);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const found = await searchPm(auth, q);
          if (cancelled) return;
          setHits(found.results || []);
          setScope(found.scope || '');
        } catch (err) {
          if (cancelled) return;
          setHits([]);
          const status = err instanceof HubHttpError ? err.status : (err as { status?: number }).status;
          if (status === 401) {
            setDenied(true);
            setError('Authentication failed talking to Integration Hub (401). Bearer was missing or rejected.');
          } else if (status === 403) {
            setDenied(true);
            setError('Authenticated but not authorized for knowledge search (403).');
          } else {
            setDenied(false);
            setError(err instanceof Error ? err.message : String(err));
          }
        } finally {
          if (!cancelled) setBusy(false);
        }
      })();
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, auth]);

  const results: SearchResult[] = useMemo(
    () =>
      hits.map((hit) => ({
        id: `${hit.kind}-${hit.id}`,
        title: hit.title,
        category: kindLabel(hit.kind),
        subtitle: [hit.clientCode, hit.source].filter(Boolean).join(' · '),
        to: hit.href,
      })),
    [hits],
  );

  const hubClosed = auth.tokenReady && !auth.hasBearer;
  const closed = denied || hubClosed;
  const unauthorized = Boolean(error?.includes('403') || error?.includes('not authorized'));

  return (
    <ModuleScaffold
      title="Search / Knowledge"
      subtitle="Authorized Hub search across entitled clients, projects, and documents. ⌘K jumps modules; this page searches records."
      showPendingBanner={false}
    >
      {!auth.tokenReady ? (
        <LoadingState rows={6} label="Connecting to Integration Hub" />
      ) : closed ? (
        <AccessDeniedState
          title={
            unauthorized
              ? 'Not authorized'
              : auth.bootstrapStatus === 'interaction_required'
                ? 'Hub authorization required'
                : 'Sign-in required'
          }
          description={
            error ||
            auth.bootstrapMessage ||
            'Knowledge search is closed without a valid Hub Bearer token. Use ⌘K to jump modules without Hub.'
          }
          actions={
            auth.bootstrapStatus === 'interaction_required' ? (
              <Button appearance="primary" onClick={() => void auth.authorizeHub()}>
                Authorize Hub
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {error ? (
            <AtlasCard title="Knowledge search error">
              <Text>{error}</Text>
            </AtlasCard>
          ) : null}
          {scope ? (
            <StatusChip
              label={scope === 'manny_tenant' ? 'Manny tenant search' : 'Entitled scope'}
              tone="success"
            />
          ) : null}
          <Caption1>
            Server-side authorization: only entitled ClientCodes are returned. 401/403 fail closed — Hub hits are not
            filtered in the browser.
          </Caption1>
          <AtlasCard variant="quiet">
            <GlobalSearch
              variant="inline"
              open
              onOpenChange={() => undefined}
              query={query}
              onQueryChange={setQuery}
              results={results}
              loading={busy}
              onSelect={(r) => {
                if (r.to) navigate(r.to);
              }}
              placeholder="Search Atlas…"
              idleLabel="Type at least two characters. Hub returns only entitled records — empty is a real answer."
              emptyLabel="No authorized matches in your entitled SharePoint scope."
              loadingLabel="Searching entitled records…"
              inputLabel="Authorized knowledge search"
              listLabel="Authorized search results"
              autoFocus
            />
          </AtlasCard>
        </>
      )}
    </ModuleScaffold>
  );
}

export function AutomationsPage() {
  return (
    <ModuleScaffold
      title="Automation"
      subtitle="Power Automate and Atlas orchestration — status surfaces only."
      showPendingBanner={false}
    >
      <AtlasCard variant="quiet">
        <EmptyState
          title="Not yet configured"
          description="Intended source: Power Automate packages under src/power-automate on HVCG-CommandCenter. MissingDocumentReminders, RenewalReminders, and Eva intake remain Off. No fake run success is shown."
          icon={<BotRegular />}
        />
      </AtlasCard>
      <Caption1>
        Owner setup: review flow packages in Power Platform after security gates — do not enable client email reminders.
      </Caption1>
    </ModuleScaffold>
  );
}

export function ReportsPage() {
  return (
    <ModuleScaffold
      title="Reports"
      subtitle="Executive and operational report entry points — presentation-ready surfaces."
      showPendingBanner={false}
    >
      <AtlasCard title="Available report surfaces" variant="accent">
        <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 8 }}>
          <li>
            <Link to="/">Executive Home</Link>
          </li>
          <li>
            <Link to="/executive">Executive Dashboard</Link>
          </li>
          <li>
            <Link to="/financials">Financial Intelligence</Link>
          </li>
          <li>
            <Link to="/revenue">Revenue & Pipeline</Link>
          </li>
          <li>
            <Link to="/capital">Capital Advisory</Link>
          </li>
          <li>
            <Link to="/enterprise-value">Enterprise Value</Link>
          </li>
        </ul>
      </AtlasCard>
      <EmptyState
        title="Export & scheduled reports"
        description="Scheduled PDF/Excel export is not yet integrated. Values remain pending until verified data sources connect."
        icon={<DocumentDataRegular />}
      />
    </ModuleScaffold>
  );
}
