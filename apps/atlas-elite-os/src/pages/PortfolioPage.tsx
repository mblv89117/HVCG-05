import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AtlasCard, DataTable, StatusChip, EmptyState, LoadingState, ErrorState, AccessDeniedState } from '@hvcg/atlas-design-system';
import {
  Button,
  Caption1,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Dropdown,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Option,
  Text,
} from '@fluentui/react-components';
import { ModuleScaffold } from './shared/ModuleScaffold';
import {
  createPmProject,
  fetchPmClients,
  fetchPortfolio,
  patchPmProject,
  HubHttpError,
  type PmClient,
  type PortfolioProject,
} from '../integrations/hub/pmApi';
import { useHubAuth } from '../integrations/hub/useHubAuth';
import { projectDetailPath } from '../routing/projectId';
import { isCanonicalClientCode } from '../security/clientCode';
import {
  displayDueDate,
  displayHealth,
  displayLastActivity,
  displayNextAction,
  isBootstrapMilestoneTitle,
  isBootstrapNextAction,
} from '../operating/projectDisplay';
import { ATLAS_STATUS, atlasStatusDisplay, atlasStatusTone } from '../ui/statusLanguage';

type AttentionView = 'all' | 'active' | 'late' | 'blocked' | 'needs_me';

const KNOWN_ATLAS = new Set<string>(Object.values(ATLAS_STATUS));

function titleCaseUnknown(raw: string): string {
  return raw
    .trim()
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function atlasChip(raw: string | undefined | null): { label: string; tone: ReturnType<typeof atlasStatusTone> } {
  if (!raw || !String(raw).trim()) return { label: '—', tone: 'neutral' };
  const mapped = atlasStatusDisplay(raw);
  if (mapped && KNOWN_ATLAS.has(mapped.label)) return mapped;
  return { label: titleCaseUnknown(mapped?.label || raw), tone: mapped?.tone || 'neutral' };
}

function clientPath(row: { clientId?: string; clientCode?: string }): string | null {
  const code = String(row.clientCode || row.clientId || '').trim();
  if (!isCanonicalClientCode(code)) return null;
  return `/clients/${encodeURIComponent(code)}`;
}

function hubStatus(err: unknown): number | undefined {
  if (err instanceof HubHttpError) return err.status;
  return (err as { status?: number }).status;
}

function safeErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}

/** Hub already classified these; UI only reads the payload fields. */
function hubIsActive(row: PortfolioProject): boolean {
  return row.status === 'active';
}

function hubIsLate(row: PortfolioProject): boolean {
  return row.overdueTaskCount > 0;
}

function hubIsBlocked(row: PortfolioProject): boolean {
  return row.status === 'blocked' || row.blockerCount > 0;
}

function hubNeedsMe(row: PortfolioProject): boolean {
  return Boolean(row.dataQuality?.needsOwnerReview);
}

function attentionLabel(row: PortfolioProject): string | null {
  if (hubIsBlocked(row)) return ATLAS_STATUS.blocked;
  if (hubIsLate(row)) return ATLAS_STATUS.overdue;
  if (hubNeedsMe(row)) return ATLAS_STATUS.needsManny;
  if (row.health === 'at_risk' || row.health === 'critical') return ATLAS_STATUS.atRisk;
  return null;
}

function statusLabel(status: string): string {
  return atlasChip(status).label;
}

function requiresMeLabel(row: PortfolioProject): string | null {
  if (row.dataQuality?.needsOwnerReview) return ATLAS_STATUS.needsManny;
  return null;
}

export function PortfolioPage() {
  const auth = useHubAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<PortfolioProject[]>([]);
  const [clients, setClients] = useState<PmClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [authFailure, setAuthFailure] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [attentionView, setAttentionView] = useState<AttentionView>('all');
  const [qualityFilter, setQualityFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<PortfolioProject | null>(null);
  const [form, setForm] = useState({
    name: '',
    clientId: '',
    clientName: '',
    ownerName: '',
    priority: 'normal',
    nextAction: '',
    objective: '',
    status: 'active',
  });

  const refresh = useCallback(async () => {
    if (!auth.tokenReady) return;
    if (!auth.hasBearer) {
      setLoading(false);
      setForbidden(false);
      setLoadError(null);
      setAuthFailure('Microsoft sign-in required (Bearer token missing)');
      setRows([]);
      return;
    }
    setLoading(true);
    setAuthFailure(null);
    setForbidden(false);
    setLoadError(null);
    try {
      const res = await fetchPortfolio(auth);
      setRows(res.portfolio || []);
      try {
        const listed = await fetchPmClients(auth);
        setClients(listed.clients || []);
      } catch {
        const fromRows = (res.portfolio || [])
          .map((p) => ({
            id: String(p.clientId || p.clientCode || '').trim(),
            clientCode: String(p.clientId || p.clientCode || '').trim(),
            displayName: String(p.clientName || p.clientId || '').trim(),
            source: 'sharepoint',
          }))
          .filter((c) => isCanonicalClientCode(c.clientCode));
        const seen = new Set<string>();
        setClients(
          fromRows.filter((c) => {
            if (seen.has(c.clientCode)) return false;
            seen.add(c.clientCode);
            return true;
          }),
        );
      }
    } catch (err) {
      const status = hubStatus(err);
      setRows([]);
      if (status === 401) {
        setAuthFailure(
          safeErrorMessage(err, 'Microsoft sign-in required (Bearer token missing)'),
        );
      } else if (status === 403) {
        setForbidden(true);
      } else {
        setLoadError(safeErrorMessage(err, 'Hub request failed loading projects.'));
      }
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Hooks must run unconditionally before any auth/token early return.
  const owners = useMemo(
    () => Array.from(new Set(rows.map((r) => r.ownerName).filter(Boolean))).sort(),
    [rows],
  );

  const counts = useMemo(
    () => ({
      active: rows.filter(hubIsActive).length,
      late: rows.filter(hubIsLate).length,
      blocked: rows.filter(hubIsBlocked).length,
      needsMe: rows.filter(hubNeedsMe).length,
    }),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (attentionView === 'active' && !hubIsActive(r)) return false;
      if (attentionView === 'late' && !hubIsLate(r)) return false;
      if (attentionView === 'blocked' && !hubIsBlocked(r)) return false;
      if (attentionView === 'needs_me' && !hubNeedsMe(r)) return false;
      if (clientFilter !== 'all' && (r.clientId || r.clientName) !== clientFilter && r.clientName !== clientFilter) {
        if (r.clientId !== clientFilter && r.clientName !== clientFilter) return false;
      }
      if (ownerFilter !== 'all' && r.ownerName !== ownerFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false;
      const dq = r.dataQuality;
      if (qualityFilter === 'needs_review' && !dq?.needsOwnerReview && !dq?.duplicateCandidate) return false;
      if (qualityFilter === 'duplicates' && !dq?.duplicateCandidate) return false;
      if (qualityFilter === 'missing_next' && dq?.nextActionSet !== false) return false;
      if (qualityFilter === 'missing_due' && dq?.dueDateSet !== false) return false;
      if (qualityFilter === 'blocked' && !hubIsBlocked(r)) return false;
      if (qualityFilter === 'no_activity' && r.lastActivityAt) return false;
      if (!q) return true;
      const hay = `${r.name} ${r.clientName || ''} ${r.ownerName} ${r.nextAction || ''} ${r.nextMilestone || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query, clientFilter, ownerFilter, statusFilter, priorityFilter, attentionView, qualityFilter]);

  if (!auth.tokenReady) {
    return (
      <ModuleScaffold title="Projects" subtitle="Preparing Microsoft session…" showPendingBanner={false}>
        <LoadingState rows={6} label="Acquiring Hub access token…" />
      </ModuleScaffold>
    );
  }

  if (auth.bootstrapStatus === 'interaction_required') {
    return (
      <ModuleScaffold
        title="Projects"
        subtitle="Integration Hub authorization required"
        showPendingBanner={false}
      >
        <AccessDeniedState
          title="Authorize Atlas Integration Hub"
          description={
            auth.bootstrapMessage ||
            'Your Microsoft session is active, but Atlas still needs a Hub API access token. This is a one-time authorization for the Integration Hub scope.'
          }
          actions={
            <Button appearance="primary" onClick={() => void auth.authorizeHub()}>
              Authorize Atlas Integration Hub
            </Button>
          }
        />
      </ModuleScaffold>
    );
  }

  if (!auth.hasBearer) {
    return (
      <ModuleScaffold title="Projects" subtitle="Sign-in required" showPendingBanner={false}>
        <AccessDeniedState
          title="Microsoft sign-in required"
          description={
            auth.bootstrapMessage ||
            authFailure ||
            'Atlas could not acquire an Integration Hub access token. The application shell remains available.'
          }
        />
      </ModuleScaffold>
    );
  }

  if (authFailure) {
    return (
      <ModuleScaffold title="Projects" subtitle="Integration Hub rejected the request (401)" showPendingBanner={false}>
        <AccessDeniedState
          title="Bearer token missing or rejected"
          description={authFailure}
          actions={
            <Button appearance="primary" onClick={() => void refresh()}>
              Retry
            </Button>
          }
        />
      </ModuleScaffold>
    );
  }

  if (forbidden) {
    return (
      <ModuleScaffold title="Projects" subtitle="403" showPendingBanner={false}>
        <AccessDeniedState
          title="Insufficient authorization"
          description="Authenticated but not authorized for projects."
          actions={
            <Button appearance="primary" onClick={() => void refresh()}>
              Retry
            </Button>
          }
        />
      </ModuleScaffold>
    );
  }

  if (loadError) {
    return (
      <ModuleScaffold title="Projects" subtitle="Hub request failed" showPendingBanner={false}>
        <ErrorState
          title="Projects could not be loaded"
          description={`${loadError} This is not an empty project list. Retry after Hub access is restored.`}
          actions={
            <Button appearance="primary" onClick={() => void refresh()}>
              Retry
            </Button>
          }
        />
      </ModuleScaffold>
    );
  }

  if (loading && rows.length === 0) {
    return (
      <ModuleScaffold title="Projects" subtitle="Loading record…" showPendingBanner={false}>
        <LoadingState rows={8} label="Loading projects from Integration Hub…" />
      </ModuleScaffold>
    );
  }

  const openCreate = () => {
    setForm({
      name: '',
      clientId: '',
      clientName: '',
      ownerName: '',
      priority: 'normal',
      nextAction: '',
      objective: '',
      status: 'active',
    });
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    if (!form.name.trim()) return;
    setBusy(true);
    setActionError(null);
    try {
      const { project } = await createPmProject(auth, {
        name: form.name.trim(),
        ClientCode: form.clientId || undefined,
        clientCode: form.clientId || undefined,
        ownerName: form.ownerName || undefined,
        priority: form.priority,
        nextAction: form.nextAction || undefined,
        objective: form.objective || undefined,
      });
      setCreateOpen(false);
      await refresh();
      const path = projectDetailPath(project.id);
      if (path) navigate(path);
    } catch (err) {
      setActionError(safeErrorMessage(err, 'Could not create this project.'));
    } finally {
      setBusy(false);
    }
  };

  const submitEdit = async () => {
    if (!editRow) return;
    setBusy(true);
    setActionError(null);
    try {
      await patchPmProject(auth, editRow.id, {
        name: form.name.trim() || editRow.name,
        status: form.status,
        priority: form.priority,
        nextAction: form.nextAction,
        objective: form.objective,
        ownerName: form.ownerName || undefined,
        ...(editRow.etag ? { etag: editRow.etag } : {}),
      });
      setEditRow(null);
      await refresh();
    } catch (err) {
      setActionError(safeErrorMessage(err, 'Could not save this project.'));
    } finally {
      setBusy(false);
    }
  };

  const views: Array<{ id: AttentionView; label: string; count: number }> = [
    { id: 'all', label: 'All', count: rows.length },
    { id: 'active', label: 'Active', count: counts.active },
    { id: 'late', label: ATLAS_STATUS.overdue, count: counts.late },
    { id: 'blocked', label: ATLAS_STATUS.blocked, count: counts.blocked },
    { id: 'needs_me', label: ATLAS_STATUS.needsManny, count: counts.needsMe },
  ];

  return (
    <ModuleScaffold
      title="Projects"
      subtitle="Authorized HVCG / HVS projects — active, overdue, blocked, owner, next action, client, and last change."
      showPendingBanner={false}
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button appearance="primary" onClick={openCreate}>
            Create project
          </Button>
          <Button appearance="secondary" onClick={() => void refresh()} disabled={busy || loading}>
            Refresh
          </Button>
          <Button appearance="secondary" disabled>
            Sync from Microsoft is not implemented for SharePoint production
          </Button>
        </div>
      }
    >
      {actionError ? (
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>Change was not saved</MessageBarTitle>
            {actionError}
          </MessageBarBody>
        </MessageBar>
      ) : null}

      <AtlasCard>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {views.map((v) => (
            <Button
              key={v.id}
              size="small"
              appearance={attentionView === v.id ? 'primary' : 'secondary'}
              onClick={() => setAttentionView(v.id)}
              disabled={loading}
            >
              {v.label} ({v.count})
            </Button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Input
            appearance="outline"
            placeholder="Search projects…"
            value={query}
            onChange={(_, d) => setQuery(d.value)}
            style={{ minWidth: 200 }}
            aria-label="Search projects"
          />
          <Dropdown
            value={clientFilter === 'all' ? 'All clients' : clientFilter}
            selectedOptions={[clientFilter]}
            onOptionSelect={(_, d) => setClientFilter(String(d.optionValue || 'all'))}
          >
            <Option value="all">All clients</Option>
            {clients.map((c) => (
              <Option key={c.id} value={c.id}>
                {c.displayName}
              </Option>
            ))}
          </Dropdown>
          <Dropdown
            value={ownerFilter === 'all' ? 'All owners' : ownerFilter}
            selectedOptions={[ownerFilter]}
            onOptionSelect={(_, d) => setOwnerFilter(String(d.optionValue || 'all'))}
          >
            <Option value="all">All owners</Option>
            {owners.map((o) => (
              <Option key={o} value={o}>
                {o}
              </Option>
            ))}
          </Dropdown>
          <Dropdown
            value={statusFilter === 'all' ? 'All statuses' : statusLabel(statusFilter)}
            selectedOptions={[statusFilter]}
            onOptionSelect={(_, d) => setStatusFilter(String(d.optionValue || 'all'))}
          >
            <Option value="all">All statuses</Option>
            <Option value="draft">{ATLAS_STATUS.draft}</Option>
            <Option value="active">Active</Option>
            <Option value="on_hold">On Hold</Option>
            <Option value="blocked">{ATLAS_STATUS.blocked}</Option>
            <Option value="completed">{ATLAS_STATUS.complete}</Option>
          </Dropdown>
          <Dropdown
            value={priorityFilter === 'all' ? 'All priorities' : atlasChip(priorityFilter).label}
            selectedOptions={[priorityFilter]}
            onOptionSelect={(_, d) => setPriorityFilter(String(d.optionValue || 'all'))}
          >
            <Option value="all">All priorities</Option>
            <Option value="critical">Critical</Option>
            <Option value="high">High</Option>
            <Option value="normal">Normal</Option>
            <Option value="low">Low</Option>
          </Dropdown>
          <Dropdown
            value={
              qualityFilter === 'all'
                ? 'All data quality'
                : qualityFilter === 'needs_review'
                  ? 'Needs review'
                  : qualityFilter === 'duplicates'
                    ? 'Duplicate candidates'
                    : qualityFilter === 'missing_next'
                      ? 'Missing next action'
                      : qualityFilter === 'missing_due'
                        ? 'Missing due date'
                        : qualityFilter === 'blocked'
                          ? ATLAS_STATUS.blocked
                          : 'No recent activity'
            }
            selectedOptions={[qualityFilter]}
            onOptionSelect={(_, d) => setQualityFilter(String(d.optionValue || 'all'))}
          >
            <Option value="all">All data quality</Option>
            <Option value="needs_review">Needs review</Option>
            <Option value="duplicates">Duplicate candidates</Option>
            <Option value="missing_next">Missing next action</Option>
            <Option value="missing_due">Missing due date</Option>
            <Option value="blocked">{ATLAS_STATUS.blocked}</Option>
            <Option value="no_activity">No recent activity</Option>
          </Dropdown>
          <Caption1>{filtered.length} shown</Caption1>
        </div>
      </AtlasCard>

      {rows.length === 0 ? (
        <EmptyState
          title="No authorized projects yet"
          description="Sync from Microsoft + Client 360 to link existing engagements, or create a project for an authorized client. This list is Hub /api/pm/portfolio — not a second catalog."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No projects in this view"
          description="Hub returned projects, but none match the current attention view or filters."
        />
      ) : (
        <DataTable<PortfolioProject>
          columns={[
            {
              key: 'what',
              header: 'What',
              sticky: 'left',
              width: 220,
              render: (r) => {
                const path = projectDetailPath(r.id);
                return path ? (
                  <Link to={path} title={r.name}>
                    {r.name}
                  </Link>
                ) : (
                  <Text weight="semibold">{r.name}</Text>
                );
              },
            },
            {
              key: 'state',
              header: 'State',
              render: (r) => {
                const chip = atlasChip(r.status);
                const attention = attentionLabel(r);
                const honest = displayHealth(r.health, {
                  treatHealthyAsUnassessed:
                    isBootstrapNextAction(r.nextAction) || isBootstrapMilestoneTitle(r.nextMilestone),
                });
                const health =
                  honest === 'Not assessed'
                    ? { label: ATLAS_STATUS.unverified, tone: 'neutral' as const }
                    : atlasChip(honest);
                const draftUnverified =
                  (r.status === 'draft' || chip.label === ATLAS_STATUS.draft) &&
                  health.label === ATLAS_STATUS.unverified;
                return (
                  <div style={{ display: 'grid', gap: 4 }}>
                    <StatusChip
                      tone={chip.tone === 'neutral' ? 'info' : chip.tone}
                      label={chip.label}
                    />
                    <Caption1>
                      {health.label}
                      {attention && attention !== chip.label && attention !== health.label
                        ? ` · ${attention}`
                        : ''}
                      {r.priority ? ` · ${atlasChip(r.priority).label}` : ''}
                    </Caption1>
                    {draftUnverified ? (
                      <Caption1>Not assessed yet · view only until next action is real</Caption1>
                    ) : null}
                  </div>
                );
              },
            },
            {
              key: 'next',
              header: 'Next',
              width: 220,
              render: (r) => (
                <div>
                  <span title={r.nextAction || undefined}>{displayNextAction(r.nextAction)}</span>
                  <Caption1 style={{ display: 'block' }}>{displayDueDate(r.targetCompletionDate)}</Caption1>
                </div>
              ),
            },
            { key: 'owner', header: 'Owner', render: (r) => r.ownerName || '—' },
            {
              key: 'blocker',
              header: 'Blocker',
              render: (r) =>
                hubIsBlocked(r) ? (
                  <StatusChip tone={atlasStatusTone(ATLAS_STATUS.blocked)} label={ATLAS_STATUS.blocked} />
                ) : (
                  '—'
                ),
            },
            {
              key: 'related',
              header: 'Related',
              width: 160,
              render: (r) => {
                const href = clientPath(r);
                const label = r.clientName || r.clientCode || r.clientId || '—';
                if (href) return <Link to={href}>{label}</Link>;
                return <Caption1>{label === '—' ? 'No client on this record' : label}</Caption1>;
              },
            },
            {
              key: 'requires',
              header: 'Requires me',
              render: (r) => {
                const label = requiresMeLabel(r);
                if (!label) return <Caption1>—</Caption1>;
                return (
                  <Link to="/tasks">
                    <StatusChip tone={atlasStatusTone(label)} label={label} />
                  </Link>
                );
              },
            },
            {
              key: 'changed',
              header: 'Changed',
              render: (r) => displayLastActivity(r.lastActivityAt),
            },
            {
              key: 'ops',
              header: 'Actions',
              sticky: 'right',
              width: 160,
              render: (r) => (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
                  <Button
                    size="small"
                    onClick={() => {
                      setForm({
                        name: r.name,
                        clientId: r.clientId || '',
                        clientName: r.clientName || '',
                        ownerName: r.ownerName,
                        priority: r.priority,
                        nextAction: r.nextAction || '',
                        objective: r.objective || '',
                        status: r.status,
                      });
                      setEditRow(r);
                    }}
                  >
                    Edit
                  </Button>
                  <Button size="small" appearance="secondary" disabled title="Archive is not implemented for SharePoint production">
                    Archive not in MVP
                  </Button>
                </div>
              ),
            },
          ]}
          rows={filtered}
          getRowKey={(r) => r.id}
        />
      )}

      <Dialog open={createOpen} onOpenChange={(_, d) => setCreateOpen(d.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Create project</DialogTitle>
            <DialogContent>
              <div style={{ display: 'grid', gap: 12 }}>
                <Field label="Name" required>
                  <Input
                    value={form.name}
                    onChange={(_, d) => setForm((f) => ({ ...f, name: d.value }))}
                  />
                </Field>
                <Field label="ClientCode">
                  <Dropdown
                    value={
                      clients.find((c) => c.id === form.clientId)?.displayName ||
                      form.clientId ||
                      'Select ClientCode'
                    }
                    selectedOptions={[form.clientId || '']}
                    onOptionSelect={(_, d) =>
                      setForm((f) => ({ ...f, clientId: String(d.optionValue || '') }))
                    }
                  >
                    {clients.map((c) => (
                      <Option key={c.clientCode || c.id} value={c.clientCode || c.id} text={c.clientCode || c.id}>
                        {c.clientCode || c.id}
                        {c.displayName && c.displayName !== (c.clientCode || c.id) ? ` · ${c.displayName}` : ''}
                      </Option>
                    ))}
                  </Dropdown>
                  <Caption1>
                    Canonical SharePoint ClientCode is required. Client 360 identifiers are not used.
                  </Caption1>
                  {clients.length === 0 ? (
                    <Input
                      placeholder="SharePoint ClientCode"
                      value={form.clientId}
                      onChange={(_, d) => setForm((f) => ({ ...f, clientId: d.value.trim().toUpperCase() }))}
                    />
                  ) : null}
                </Field>
                <Field label="Owner">
                  <Input
                    value={form.ownerName}
                    onChange={(_, d) => setForm((f) => ({ ...f, ownerName: d.value }))}
                    placeholder="Leave blank for Hub-derived owner"
                  />
                </Field>
                <Field label="Priority">
                  <Dropdown
                    value={atlasChip(form.priority).label}
                    selectedOptions={[form.priority]}
                    onOptionSelect={(_, d) =>
                      setForm((f) => ({ ...f, priority: String(d.optionValue || 'normal') }))
                    }
                  >
                    <Option value="critical">Critical</Option>
                    <Option value="high">High</Option>
                    <Option value="normal">Normal</Option>
                    <Option value="low">Low</Option>
                  </Dropdown>
                </Field>
                <Field label="Objective">
                  <Input
                    value={form.objective}
                    onChange={(_, d) => setForm((f) => ({ ...f, objective: d.value }))}
                  />
                </Field>
                <Field label="Next action">
                  <Input
                    value={form.nextAction}
                    onChange={(_, d) => setForm((f) => ({ ...f, nextAction: d.value }))}
                  />
                </Field>
              </div>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button appearance="primary" disabled={busy} onClick={() => void submitCreate()}>
                Create
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <Dialog open={Boolean(editRow)} onOpenChange={(_, d) => !d.open && setEditRow(null)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Edit project</DialogTitle>
            <DialogContent>
              <div style={{ display: 'grid', gap: 12 }}>
                <Field label="Name">
                  <Input
                    value={form.name}
                    onChange={(_, d) => setForm((f) => ({ ...f, name: d.value }))}
                  />
                </Field>
                <Field label="Status">
                  <Dropdown
                    value={atlasChip(form.status).label}
                    selectedOptions={[form.status]}
                    onOptionSelect={(_, d) =>
                      setForm((f) => ({ ...f, status: String(d.optionValue || 'active') }))
                    }
                  >
                    <Option value="active">Active</Option>
                    <Option value="on_hold">On Hold</Option>
                    <Option value="blocked">{ATLAS_STATUS.blocked}</Option>
                    <Option value="completed">{ATLAS_STATUS.complete}</Option>
                  </Dropdown>
                </Field>
                <Field label="Priority">
                  <Dropdown
                    value={atlasChip(form.priority).label}
                    selectedOptions={[form.priority]}
                    onOptionSelect={(_, d) =>
                      setForm((f) => ({ ...f, priority: String(d.optionValue || 'normal') }))
                    }
                  >
                    <Option value="critical">Critical</Option>
                    <Option value="high">High</Option>
                    <Option value="normal">Normal</Option>
                    <Option value="low">Low</Option>
                  </Dropdown>
                </Field>
                <Field label="Next action">
                  <Input
                    value={form.nextAction}
                    onChange={(_, d) => setForm((f) => ({ ...f, nextAction: d.value }))}
                  />
                </Field>
                <Field label="Objective">
                  <Input
                    value={form.objective}
                    onChange={(_, d) => setForm((f) => ({ ...f, objective: d.value }))}
                  />
                </Field>
              </div>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setEditRow(null)}>
                Cancel
              </Button>
              <Button appearance="primary" disabled={busy} onClick={() => void submitEdit()}>
                Save
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </ModuleScaffold>
  );
}
