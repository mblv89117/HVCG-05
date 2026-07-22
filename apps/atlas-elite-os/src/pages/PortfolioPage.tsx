import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AtlasCard, DataTable, StatusChip, EmptyState } from '@hvcg/atlas-design-system';
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
  Option,
  Spinner,
  Text,
} from '@fluentui/react-components';
import { ModuleScaffold } from './shared/ModuleScaffold';
import {
  archivePmProject,
  createPmProject,
  fetchPortfolio,
  initializePm,
  previewPmSync,
  patchPmProject,
  type PortfolioProject,
} from '../integrations/hub/pmApi';
import { useHubAuth } from '../integrations/hub/useHubAuth';
import { projectDetailPath } from '../routing/projectId';
import { fetchClient360 } from '../integrations/hub/api';
import {
  displayDueDate,
  displayHealth,
  displayLastActivity,
  displayMilestone,
  displayNextAction,
  isBootstrapMilestoneTitle,
  isBootstrapNextAction,
} from '../operating/projectDisplay';

export function PortfolioPage() {
  const auth = useHubAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<PortfolioProject[]>([]);
  const [clients, setClients] = useState<Array<{ id: string; displayName: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [qualityFilter, setQualityFilter] = useState('all');
  const [syncPreview, setSyncPreview] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<PortfolioProject | null>(null);
  const [archiveRow, setArchiveRow] = useState<PortfolioProject | null>(null);
  const [form, setForm] = useState({
    name: '',
    clientId: '',
    clientName: '',
    ownerName: 'Manny Barela',
    priority: 'normal',
    nextAction: '',
    objective: '',
    status: 'active',
  });

  const refresh = useCallback(async () => {
    if (!auth.tokenReady) return;
    if (!auth.hasBearer) {
      setLoading(false);
      setError('Microsoft sign-in required (Bearer token missing)');
      setRows([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [res, c360] = await Promise.all([
        fetchPortfolio(auth),
        fetchClient360(auth).catch(() => ({ clients: [] as Array<{ id: string; displayName: string }> })),
      ]);
      setRows(res.portfolio || []);
      setClients(
        (c360.clients || []).map((c: { id: string; displayName: string }) => ({
          id: c.id,
          displayName: c.displayName,
        })),
      );
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 401) {
        setError('Authentication failed talking to Integration Hub (401). Bearer was missing or rejected.');
      } else if (status === 403) {
        setError('Authenticated but not authorized for projects (403).');
      } else {
        setError(String(err));
      }
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Hooks must run unconditionally before any auth/token early return.
  // Previously these useMemos sat after tokenReady/hasBearer gates and caused
  // React #310 (more hooks than previous render) when Hub bootstrap completed.
  const owners = useMemo(
    () => Array.from(new Set(rows.map((r) => r.ownerName).filter(Boolean))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (clientFilter !== 'all' && (r.clientId || r.clientName) !== clientFilter && r.clientName !== clientFilter) {
        if (r.clientId !== clientFilter && r.clientName !== clientFilter) return false;
      }
      if (ownerFilter !== 'all' && r.ownerName !== ownerFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false;
      const dq = r.dataQuality;
      if (qualityFilter === 'needs_review' && !dq?.needsOwnerReview && !dq?.duplicateCandidate) return false;
      if (qualityFilter === 'duplicates' && !dq?.duplicateCandidate) return false;
      if (qualityFilter === 'missing_next' && !isBootstrapNextAction(r.nextAction)) return false;
      if (qualityFilter === 'missing_due' && r.targetCompletionDate) return false;
      if (qualityFilter === 'blocked' && r.status !== 'blocked' && !(r.blockerCount > 0)) return false;
      if (qualityFilter === 'no_activity' && r.lastActivityAt) return false;
      if (!q) return true;
      const hay = `${r.name} ${r.clientName || ''} ${r.ownerName} ${r.nextAction || ''} ${r.nextMilestone || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query, clientFilter, ownerFilter, statusFilter, priorityFilter, qualityFilter]);

  if (!auth.tokenReady) {
    return (
      <ModuleScaffold title="Projects" subtitle="Preparing Microsoft session…" showPendingBanner={false}>
        <Spinner label="Acquiring Hub access token…" />
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
        <EmptyState
          title="Authorize Atlas Integration Hub"
          description={
            auth.bootstrapMessage ||
            'Your Microsoft session is active, but Atlas still needs a Hub API access token. This is a one-time authorization for the Integration Hub scope.'
          }
        />
        <Button appearance="primary" onClick={() => void auth.authorizeHub()}>
          Authorize Atlas Integration Hub
        </Button>
      </ModuleScaffold>
    );
  }

  if (!auth.hasBearer) {
    return (
      <ModuleScaffold title="Projects" subtitle="Authentication required" showPendingBanner={false}>
        <EmptyState
          title="Microsoft sign-in required"
          description={
            auth.bootstrapMessage ||
            'Atlas could not acquire an Integration Hub access token. The application shell remains available.'
          }
        />
      </ModuleScaffold>
    );
  }

  const openCreate = () => {
    setForm({
      name: '',
      clientId: '',
      clientName: '',
      ownerName: 'Manny Barela',
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
    try {
      const client = clients.find((c) => c.id === form.clientId);
      const { project } = await createPmProject(auth, {
        name: form.name.trim(),
        clientId: form.clientId || undefined,
        clientName: client?.displayName || form.clientName || undefined,
        ownerName: form.ownerName || 'Manny Barela',
        ownerId: 'person-manny',
        priority: form.priority,
        nextAction: form.nextAction || 'Define first milestone',
        objective: form.objective || undefined,
      });
      setCreateOpen(false);
      await refresh();
      const path = projectDetailPath(project.id);
      if (path) navigate(path);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  };

  const submitEdit = async () => {
    if (!editRow) return;
    setBusy(true);
    try {
      await patchPmProject(auth, editRow.id, {
        name: form.name.trim() || editRow.name,
        status: form.status,
        priority: form.priority,
        nextAction: form.nextAction,
        objective: form.objective,
        ownerName: form.ownerName,
      });
      setEditRow(null);
      await refresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  };

  const confirmArchive = async () => {
    if (!archiveRow) return;
    setBusy(true);
    try {
      await archivePmProject(auth, archiveRow.id);
      setArchiveRow(null);
      await refresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  };

  const initialize = async () => {
    setBusy(true);
    setError(null);
    setSyncPreview(null);
    try {
      // Always dry-run first. Do not mutate until preview is clean of unexpected creates/dupes.
      const previewRes = await previewPmSync(auth);
      const p = previewRes.preview;
      const summary = [
        `Clients selected: ${p.clientsSelected}`,
        `Projects to create: ${p.projectsToCreate.length}`,
        `Projects to update: ${p.projectsToUpdate.length}`,
        `Unchanged: ${p.projectsUnchanged}`,
        `Duplicate candidates: ${p.duplicateCandidates.length}`,
        `Ambiguous: ${p.ambiguousMappings.length}`,
        `Docs linkable: ${p.documentsLinkable}`,
        p.conflicts.length ? `Conflicts: ${p.conflicts.join('; ')}` : 'Conflicts: none',
      ].join(' · ');
      setSyncPreview(summary);
      if (p.duplicateCandidates.length > 0 || p.projectsToCreate.length > 0 || p.conflicts.length > 0) {
        setError(
          'Sync preview blocked automatic apply. Resolve duplicate/owner-review items first, or confirm create list. Dry-run only — no records were changed.',
        );
        return;
      }
      // Safe path: second preview must stay idempotent (zero creates) before apply.
      const second = await previewPmSync(auth);
      if (second.preview.projectsToCreate.length !== 0) {
        setError('Second dry-run was not idempotent (would create projects). Sync aborted.');
        return;
      }
      await initializePm(auth);
      await refresh();
      setSyncPreview(`${summary} · Applied after two clean dry-runs.`);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModuleScaffold
      title="Projects"
      subtitle="Authorized HVCG / HVS projects — health, blockers, next actions, and board-ready work."
      showPendingBanner={false}
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button appearance="primary" onClick={openCreate}>
            Create project
          </Button>
          <Button appearance="secondary" onClick={() => void refresh()} disabled={busy}>
            Refresh
          </Button>
          <Button appearance="secondary" onClick={() => void initialize()} disabled={busy}>
            Preview / Sync from Microsoft + Client 360
          </Button>
        </div>
      }
    >
      {error ? (
        <AtlasCard title="Error">
          <Text>{error}</Text>
        </AtlasCard>
      ) : null}

      {syncPreview ? (
        <AtlasCard title="Sync dry-run preview">
          <Text>{syncPreview}</Text>
        </AtlasCard>
      ) : null}

      <AtlasCard>
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
            value={statusFilter === 'all' ? 'All statuses' : statusFilter}
            selectedOptions={[statusFilter]}
            onOptionSelect={(_, d) => setStatusFilter(String(d.optionValue || 'all'))}
          >
            <Option value="all">All statuses</Option>
            <Option value="active">active</Option>
            <Option value="on_hold">on_hold</Option>
            <Option value="blocked">blocked</Option>
            <Option value="completed">completed</Option>
          </Dropdown>
          <Dropdown
            value={priorityFilter === 'all' ? 'All priorities' : priorityFilter}
            selectedOptions={[priorityFilter]}
            onOptionSelect={(_, d) => setPriorityFilter(String(d.optionValue || 'all'))}
          >
            <Option value="all">All priorities</Option>
            <Option value="critical">critical</Option>
            <Option value="high">high</Option>
            <Option value="normal">normal</Option>
            <Option value="low">low</Option>
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
                          ? 'Blocked'
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
            <Option value="blocked">Blocked</Option>
            <Option value="no_activity">No recent activity</Option>
          </Dropdown>
          <Caption1>{filtered.length} projects</Caption1>
        </div>
      </AtlasCard>

      {loading ? (
        <Spinner label="Loading projects…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No projects have been created yet"
          description="Sync from Microsoft + Client 360 to link existing engagements, or create a project for an authorized client."
        />
      ) : (
        <DataTable<PortfolioProject>
          columns={[
            {
              key: 'name',
              header: 'Project',
              sticky: 'left',
              width: 220,
              render: (r) => {
                const path = projectDetailPath(r.id);
                const badge = r.dataQuality?.duplicateCandidate
                  ? ' · Duplicate candidate'
                  : r.dataQuality?.needsOwnerReview
                    ? ' · Needs owner review'
                    : '';
                return path ? (
                  <Link to={path} title={r.name}>
                    {r.name}
                    {badge ? <Caption1>{badge}</Caption1> : null}
                  </Link>
                ) : (
                  <Text>{r.name}</Text>
                );
              },
            },
            { key: 'client', header: 'Client', width: 160, render: (r) => r.clientName || '—' },
            { key: 'owner', header: 'Owner', render: (r) => r.ownerName },
            {
              key: 'status',
              header: 'Status',
              render: (r) => <StatusChip tone="info" label={r.status} />,
            },
            { key: 'priority', header: 'Priority', render: (r) => r.priority },
            {
              key: 'health',
              header: 'Health',
              render: (r) => {
                const label = displayHealth(r.health, {
                  treatHealthyAsUnassessed:
                    isBootstrapNextAction(r.nextAction) || isBootstrapMilestoneTitle(r.nextMilestone),
                });
                const tone =
                  label === 'Not assessed'
                    ? 'neutral'
                    : r.health === 'critical' || r.health === 'at_risk'
                      ? 'danger'
                      : r.health === 'watch'
                        ? 'warning'
                        : 'success';
                return <StatusChip tone={tone} label={label} />;
              },
            },
            {
              key: 'next',
              header: 'Next milestone',
              render: (r) => (
                <span title={r.nextMilestone || undefined}>{displayMilestone(r.nextMilestone)}</span>
              ),
            },
            {
              key: 'action',
              header: 'Next action',
              width: 220,
              render: (r) => (
                <span title={r.nextAction || undefined}>{displayNextAction(r.nextAction)}</span>
              ),
            },
            {
              key: 'due',
              header: 'Due',
              render: (r) => displayDueDate(r.targetCompletionDate),
            },
            {
              key: 'blocked',
              header: 'Blocked',
              render: (r) => (r.blockerCount > 0 ? String(r.blockerCount) : '—'),
            },
            {
              key: 'activity',
              header: 'Last activity',
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
                  <Button size="small" appearance="secondary" onClick={() => setArchiveRow(r)}>
                    Archive
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
                <Field label="Client">
                  <Dropdown
                    value={
                      clients.find((c) => c.id === form.clientId)?.displayName || 'Select client'
                    }
                    selectedOptions={[form.clientId || '']}
                    onOptionSelect={(_, d) =>
                      setForm((f) => ({ ...f, clientId: String(d.optionValue || '') }))
                    }
                  >
                    <Option value="">Unassigned</Option>
                    {clients.map((c) => (
                      <Option key={c.id} value={c.id}>
                        {c.displayName}
                      </Option>
                    ))}
                  </Dropdown>
                </Field>
                <Field label="Owner">
                  <Input
                    value={form.ownerName}
                    onChange={(_, d) => setForm((f) => ({ ...f, ownerName: d.value }))}
                  />
                </Field>
                <Field label="Priority">
                  <Dropdown
                    value={form.priority}
                    selectedOptions={[form.priority]}
                    onOptionSelect={(_, d) =>
                      setForm((f) => ({ ...f, priority: String(d.optionValue || 'normal') }))
                    }
                  >
                    <Option value="critical">critical</Option>
                    <Option value="high">high</Option>
                    <Option value="normal">normal</Option>
                    <Option value="low">low</Option>
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
                    value={form.status}
                    selectedOptions={[form.status]}
                    onOptionSelect={(_, d) =>
                      setForm((f) => ({ ...f, status: String(d.optionValue || 'active') }))
                    }
                  >
                    <Option value="active">active</Option>
                    <Option value="on_hold">on_hold</Option>
                    <Option value="blocked">blocked</Option>
                    <Option value="completed">completed</Option>
                  </Dropdown>
                </Field>
                <Field label="Priority">
                  <Dropdown
                    value={form.priority}
                    selectedOptions={[form.priority]}
                    onOptionSelect={(_, d) =>
                      setForm((f) => ({ ...f, priority: String(d.optionValue || 'normal') }))
                    }
                  >
                    <Option value="critical">critical</Option>
                    <Option value="high">high</Option>
                    <Option value="normal">normal</Option>
                    <Option value="low">low</Option>
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

      <Dialog open={Boolean(archiveRow)} onOpenChange={(_, d) => !d.open && setArchiveRow(null)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Archive project?</DialogTitle>
            <DialogContent>
              <Text>
                Archive <strong>{archiveRow?.name}</strong>? It will leave the active portfolio. This
                does not delete SharePoint or Client 360 records.
              </Text>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setArchiveRow(null)}>
                Cancel
              </Button>
              <Button appearance="primary" disabled={busy} onClick={() => void confirmArchive()}>
                Archive
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </ModuleScaffold>
  );
}
