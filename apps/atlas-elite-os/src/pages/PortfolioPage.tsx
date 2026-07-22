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
  patchPmProject,
  type PortfolioProject,
} from '../integrations/hub/pmApi';
import { useHubAuth } from '../integrations/hub/useHubAuth';
import { projectDetailPath } from '../routing/projectId';
import { fetchClient360 } from '../integrations/hub/api';

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

  if (!auth.tokenReady) {
    return (
      <ModuleScaffold title="Projects" subtitle="Preparing Microsoft session…" showPendingBanner={false}>
        <Spinner label="Acquiring Hub bearer…" />
      </ModuleScaffold>
    );
  }

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
      if (!q) return true;
      const hay = `${r.name} ${r.clientName || ''} ${r.ownerName} ${r.nextAction || ''} ${r.nextMilestone || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query, clientFilter, ownerFilter, statusFilter, priorityFilter]);

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
    try {
      await initializePm(auth);
      await refresh();
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
            Sync from Microsoft + Client 360
          </Button>
        </div>
      }
    >
      {error ? (
        <AtlasCard title="Error">
          <Text>{error}</Text>
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
              render: (r) => {
                const path = projectDetailPath(r.id);
                return path ? (
                  <Link to={path}>{r.name}</Link>
                ) : (
                  <Text>{r.name}</Text>
                );
              },
            },
            { key: 'client', header: 'Client', render: (r) => r.clientName || '—' },
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
              render: (r) => (
                <StatusChip
                  tone={
                    r.health === 'critical' || r.health === 'at_risk'
                      ? 'danger'
                      : r.health === 'watch'
                        ? 'warning'
                        : 'success'
                  }
                  label={r.health}
                />
              ),
            },
            { key: 'next', header: 'Next milestone', render: (r) => r.nextMilestone || '—' },
            { key: 'action', header: 'Next action', render: (r) => r.nextAction || '—' },
            { key: 'due', header: 'Due', render: (r) => r.targetCompletionDate || '—' },
            {
              key: 'blocked',
              header: 'Blocked',
              render: (r) => (r.blockerCount > 0 ? String(r.blockerCount) : '—'),
            },
            {
              key: 'activity',
              header: 'Last activity',
              render: (r) => (r.lastActivityAt ? r.lastActivityAt.slice(0, 10) : '—'),
            },
            {
              key: 'ops',
              header: 'Actions',
              render: (r) => (
                <div style={{ display: 'flex', gap: 6 }}>
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
