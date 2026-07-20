import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AtlasCard,
  DataTable,
  StatusChip,
  ResponsiveGrid,
  GridSpan,
  useNotifications,
} from '@hvcg/atlas-design-system';
import {
  Button,
  Text,
  Caption1,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Dropdown,
  Option,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Field,
  Textarea,
  Input,
} from '@fluentui/react-components';
import { ModuleScaffold } from './shared/ModuleScaffold';
import {
  communicationCatalog,
  communicationTemplates,
  communicationsForWorkspace,
  isDraftStatus,
  outlookCalendarUrl,
  outlookComposeUrl,
  teamsChatUrl,
  teamsScheduleMeetingUrl,
  type CommunicationPurpose,
  type CommunicationRecord,
  type CommunicationStatus,
  type CommunicationTemplate,
} from '../data/communications';
import { microsoftConfig } from '../microsoft/config';
import { canPrepareExternalDraft, canViewCommunications } from '../security/rbac';

function statusTone(status: CommunicationStatus): 'neutral' | 'warning' | 'success' | 'danger' | 'gold' {
  if (status === 'Draft' || status === 'PendingApproval') return 'warning';
  if (status === 'Sent' || status === 'Recorded') return 'success';
  if (status === 'Cancelled') return 'neutral';
  return 'gold';
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function openExternal(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function CommunicationsPage() {
  const [params, setParams] = useSearchParams();
  const workspaceFilter = params.get('client') || 'all';
  const purposeFilter = (params.get('purpose') as CommunicationPurpose | 'all') || 'all';
  const { push } = useNotifications();

  const [selected, setSelected] = useState<CommunicationRecord | null>(null);
  const [callNotesOpen, setCallNotesOpen] = useState(false);
  const [callNotes, setCallNotes] = useState('');
  const [followUpTaskOpen, setFollowUpTaskOpen] = useState(false);
  const [followUpTitle, setFollowUpTitle] = useState('');

  const rows = useMemo(() => {
    let list =
      workspaceFilter === 'all'
        ? [...communicationCatalog]
        : communicationsForWorkspace(workspaceFilter);
    if (purposeFilter !== 'all') {
      list = list.filter((r) => r.purpose === purposeFilter);
    }
    return list.sort((a, b) => b.communicationDate.localeCompare(a.communicationDate));
  }, [workspaceFilter, purposeFilter]);

  if (!canViewCommunications()) {
    return (
      <ModuleScaffold title="Communications" subtitle="Access restricted" showPendingBanner={false}>
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>Permission denied</MessageBarTitle>
            Guest roles cannot open the communications timeline. Contact an HVCG Owner.
          </MessageBarBody>
        </MessageBar>
      </ModuleScaffold>
    );
  }

  const prepareTemplate = (tpl: CommunicationTemplate) => {
    if (tpl.externalSend && !canPrepareExternalDraft()) {
      push({
        title: 'External draft blocked',
        body: 'Your role cannot prepare client-facing email drafts.',
        tone: 'warning',
      });
      return;
    }
    if (tpl.externalSend && microsoftConfig.blockLiveClientComms) {
      push({
        title: 'Draft prepared in Atlas only',
        body: `${tpl.name} opened as Draft. Live Outlook send remains blocked (${tpl.approvalGate}). Use Launch Outlook after Owner approval.`,
        tone: 'info',
      });
    }
    const subject = tpl.subject
      .replace('{{ClientLegalName}}', 'Colorado Craft Beef')
      .replace('{{OpportunityTitle}}', 'Colorado Craft Beef — Capital Advisory (Blueprint)')
      .replace('{{ProjectName}}', 'Colorado Craft Beef — Capital Advisory')
      .replace('{{MeetingTitle}}', 'HVCG working session')
      .replace('{{ItemTitle}}', 'Pending item')
      .replace('{{Topic}}', 'Atlas update');
    openExternal(
      outlookComposeUrl({
        subject: `[DRAFT · NOT SENT] ${subject}`,
        body: `${tpl.bodyPreview}\n\n---\nAtlas template: ${tpl.id}\nApproval gate: ${tpl.approvalGate}\nStatus must remain Draft until SendApproved.`,
      }),
    );
  };

  return (
    <ModuleScaffold
      title="Communications"
      subtitle="Unified business timeline — launch Outlook & Teams for the work; Atlas keeps linked history."
      showPendingBanner={false}
      actions={
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Button
            appearance="primary"
            onClick={() =>
              openExternal(
                outlookComposeUrl({
                  subject: '[DRAFT · NOT SENT] ',
                  body: 'Prepared from Atlas Communications. Do not send without Owner approval for external recipients.',
                }),
              )
            }
          >
            Launch Outlook
          </Button>
          <Button appearance="secondary" onClick={() => openExternal(teamsChatUrl())}>
            Launch Teams
          </Button>
          <Button appearance="secondary" onClick={() => openExternal(teamsScheduleMeetingUrl())}>
            Schedule meeting
          </Button>
          <Button appearance="secondary" onClick={() => openExternal(outlookCalendarUrl())}>
            Outlook calendar
          </Button>
        </div>
      }
    >
      <MessageBar intent="warning">
        <MessageBarBody>
          <MessageBarTitle>No automatic external sends</MessageBarTitle>
          Atlas prepares drafts and records history. Outlook/Teams remain the send/meet tools. Drafts are
          visually distinct from Sent/Recorded. Live client mail is blocked until OA-EXT-01 approval (
          {microsoftConfig.blockLiveClientComms ? 'currently blocked' : 'gate open — Owner only'}).
        </MessageBarBody>
      </MessageBar>

      <ResponsiveGrid dense>
        <GridSpan span={2}>
          <AtlasCard title="Filters" subtitle="Scoped to related business records">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <Field label="Client / workspace">
                <Dropdown
                  value={
                    workspaceFilter === 'all'
                      ? 'All clients'
                      : workspaceFilter === 'ws-ccb'
                        ? 'Colorado Craft Beef'
                        : workspaceFilter
                  }
                  onOptionSelect={(_, d) => {
                    const next = new URLSearchParams(params);
                    const v = String(d.optionValue || 'all');
                    if (v === 'all') next.delete('client');
                    else next.set('client', v);
                    setParams(next);
                  }}
                >
                  <Option value="all">All clients</Option>
                  <Option value="ws-ccb">Colorado Craft Beef</Option>
                  <Option value="ws-hvcg">HVCG internal</Option>
                </Dropdown>
              </Field>
              <Field label="Purpose">
                <Dropdown
                  value={purposeFilter === 'all' ? 'All purposes' : purposeFilter}
                  onOptionSelect={(_, d) => {
                    const next = new URLSearchParams(params);
                    const v = String(d.optionValue || 'all');
                    if (v === 'all') next.delete('purpose');
                    else next.set('purpose', v);
                    setParams(next);
                  }}
                >
                  <Option value="all">All purposes</Option>
                  <Option value="ClientFollowUp">Client follow-up</Option>
                  <Option value="MeetingHistory">Meeting history</Option>
                  <Option value="Notification">Notifications</Option>
                  <Option value="ProjectUpdate">Project updates</Option>
                  <Option value="ApprovalMessage">Approval messages</Option>
                  <Option value="DocumentRequest">Document requests</Option>
                  <Option value="RevenueFollowUp">Revenue follow-up</Option>
                  <Option value="ExecutiveBriefing">Executive briefings</Option>
                  <Option value="Referral">Referral</Option>
                </Dropdown>
              </Field>
            </div>
          </AtlasCard>
        </GridSpan>
        <AtlasCard title="Quick actions">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Button appearance="secondary" onClick={() => setCallNotesOpen(true)}>
              Record call notes
            </Button>
            <Button appearance="secondary" onClick={() => setFollowUpTaskOpen(true)}>
              Create follow-up task
            </Button>
            <Link to="/clients/ws-ccb">
              <Button appearance="subtle">Open CCB client context</Button>
            </Link>
            <Link to="/notifications">
              <Button appearance="subtle">Notification center</Button>
            </Link>
          </div>
        </AtlasCard>
      </ResponsiveGrid>

      <AtlasCard
        title="Communication timeline"
        subtitle={
          workspaceFilter === 'ws-ccb'
            ? 'Jeff Smith · Colorado Craft Beef · linked opportunity & capital context'
            : 'Curated summaries only — not a mailbox mirror'
        }
      >
        <DataTable
          ariaLabel="Communication timeline"
          getRowKey={(r) => r.id}
          rows={rows}
          columns={[
            {
              key: 'when',
              header: 'When',
              render: (r) => <Caption1>{formatWhen(r.communicationDate)}</Caption1>,
            },
            {
              key: 'title',
              header: 'Communication',
              render: (r) => (
                <Button appearance="transparent" onClick={() => setSelected(r)} style={{ padding: 0 }}>
                  <Text weight="semibold">{r.title}</Text>
                </Button>
              ),
            },
            { key: 'channel', header: 'Channel', render: (r) => r.channel },
            {
              key: 'status',
              header: 'Status',
              render: (r) => (
                <StatusChip
                  label={isDraftStatus(r.status) ? `DRAFT · ${r.status}` : r.status}
                  tone={statusTone(r.status)}
                />
              ),
            },
            { key: 'owner', header: 'Owner', render: (r) => r.communicationOwner },
            {
              key: 'follow',
              header: 'Follow-up',
              render: (r) => r.followUpDate || (r.requiresFollowUp ? 'Needed' : '—'),
            },
            {
              key: 'links',
              header: 'Launch',
              render: (r) => (
                <div style={{ display: 'flex', gap: 4 }}>
                  {r.outlookItemLink || r.channel === 'Email' ? (
                    <Button
                      size="small"
                      appearance="subtle"
                      onClick={() => openExternal(r.outlookItemLink || outlookComposeUrl({}))}
                    >
                      Outlook
                    </Button>
                  ) : null}
                  {r.teamsActivityLink || r.channel === 'Teams' ? (
                    <Button
                      size="small"
                      appearance="subtle"
                      onClick={() => openExternal(teamsChatUrl(r.teamsActivityLink))}
                    >
                      Teams
                    </Button>
                  ) : null}
                </div>
              ),
            },
          ]}
        />
      </AtlasCard>

      <AtlasCard title="Approved templates" subtitle="Prepare drafts — never auto-send">
        <DataTable
          ariaLabel="Communication templates"
          getRowKey={(r) => r.id}
          rows={communicationTemplates}
          columns={[
            { key: 'name', header: 'Template', render: (r) => r.name },
            { key: 'purpose', header: 'Purpose', render: (r) => r.purpose },
            { key: 'channel', header: 'Channel', render: (r) => r.channel },
            {
              key: 'ext',
              header: 'External?',
              render: (r) => (r.externalSend ? 'Yes — gated' : 'Internal'),
            },
            { key: 'gate', header: 'Approval', render: (r) => r.approvalGate },
            {
              key: 'act',
              header: 'Action',
              render: (r) => (
                <Button size="small" appearance="primary" onClick={() => prepareTemplate(r)}>
                  Prepare
                </Button>
              ),
            },
          ]}
        />
      </AtlasCard>

      <Dialog open={!!selected} onOpenChange={(_, d) => !d.open && setSelected(null)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{selected?.title}</DialogTitle>
            <DialogContent>
              {selected ? (
                <div style={{ display: 'grid', gap: 8 }}>
                  <StatusChip
                    label={isDraftStatus(selected.status) ? `DRAFT · ${selected.status}` : selected.status}
                    tone={statusTone(selected.status)}
                  />
                  <Caption1>
                    {selected.channel} · {selected.direction} · {selected.purpose}
                  </Caption1>
                  <Text>{selected.summary}</Text>
                  {selected.emailSummary ? (
                    <AtlasCard title="Email summary" variant="glass">
                      <Text size={300}>{selected.emailSummary}</Text>
                    </AtlasCard>
                  ) : null}
                  {selected.meetingSummary ? (
                    <AtlasCard title="Meeting summary" variant="glass">
                      <Text size={300}>{selected.meetingSummary}</Text>
                    </AtlasCard>
                  ) : null}
                  <Caption1>
                    Related client: {selected.clientName} ({selected.clientCode})
                  </Caption1>
                  <Caption1>Related contact: {selected.contactName || '—'}</Caption1>
                  <Caption1>Related opportunity: {selected.opportunityTitle || '—'}</Caption1>
                  <Caption1>Related project: {selected.projectName || '—'}</Caption1>
                  <Caption1>Related task: {selected.taskId || '—'}</Caption1>
                  <Caption1>Related capital opportunity: {selected.capitalOpportunityId || '—'}</Caption1>
                  <Caption1>
                    Owner: {selected.communicationOwner} · Follow-up: {selected.followUpDate || '—'}
                  </Caption1>
                  {selected.attachmentOrDocLinks.length ? (
                    <ul>
                      {selected.attachmentOrDocLinks.map((l) => (
                        <li key={l}>
                          <Text size={300}>{l}</Text>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {selected.approvalRequiredBeforeSend ? (
                    <MessageBar intent="warning">
                      <MessageBarBody>
                        External send requires approval. SendApproved={String(selected.sendApproved)}.
                      </MessageBarBody>
                    </MessageBar>
                  ) : null}
                </div>
              ) : null}
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setSelected(null)}>
                Close
              </Button>
              {selected?.outlookItemLink || selected?.channel === 'Email' ? (
                <Button
                  appearance="primary"
                  onClick={() =>
                    openExternal(selected?.outlookItemLink || outlookComposeUrl({ subject: selected?.title }))
                  }
                >
                  Open in Outlook
                </Button>
              ) : null}
              {selected?.teamsActivityLink ? (
                <Button
                  appearance="primary"
                  onClick={() => openExternal(teamsChatUrl(selected.teamsActivityLink))}
                >
                  Open in Teams
                </Button>
              ) : null}
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <Dialog open={callNotesOpen} onOpenChange={(_, d) => setCallNotesOpen(d.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Record call notes</DialogTitle>
            <DialogContent>
              <Field label="Notes (linked to selected client filter)">
                <Textarea value={callNotes} onChange={(_, d) => setCallNotes(d.value)} rows={5} />
              </Field>
              <Caption1>
                Saves as Status=Recorded in the communications timeline (local seed until SharePoint write is
                bound). Does not send email.
              </Caption1>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setCallNotesOpen(false)}>
                Cancel
              </Button>
              <Button
                appearance="primary"
                onClick={() => {
                  push({
                    title: 'Call notes recorded (local)',
                    body: callNotes.slice(0, 120) || 'Empty notes discarded',
                    tone: 'success',
                  });
                  setCallNotes('');
                  setCallNotesOpen(false);
                }}
              >
                Save recorded note
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <Dialog open={followUpTaskOpen} onOpenChange={(_, d) => setFollowUpTaskOpen(d.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Create follow-up task</DialogTitle>
            <DialogContent>
              <Field label="Task title">
                <Input
                  value={followUpTitle}
                  onChange={(_, d) => setFollowUpTitle(d.value)}
                  placeholder="e.g. Collect verified CCB financial package"
                />
              </Field>
              <Caption1>
                Links RequiresFollowUp + FollowUpTaskId on the communication record. Open Tasks module to manage
                execution.
              </Caption1>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setFollowUpTaskOpen(false)}>
                Cancel
              </Button>
              <Button
                appearance="primary"
                onClick={() => {
                  push({
                    title: 'Follow-up task drafted',
                    body: followUpTitle || 'Untitled follow-up — open Tasks to complete',
                    tone: 'info',
                  });
                  setFollowUpTitle('');
                  setFollowUpTaskOpen(false);
                }}
              >
                Create & link
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </ModuleScaffold>
  );
}
