import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AtlasCard, EmptyState, StatusChip } from '@hvcg/atlas-design-system';
import { Button, Caption1, Input, Spinner, Text, Title3 } from '@fluentui/react-components';
import {
  fetchWorkflowTemplateCatalog,
  fetchWorkflowTemplateDetail,
  postInstantiateWorkflowTemplate,
  postWorkflowDraftAction,
  type WorkflowTemplateCatalogItem,
  type WorkflowTemplateDetail,
} from '../integrations/hub/pmApi';
import { useHubAuth } from '../integrations/hub/useHubAuth';

export function WorkflowTemplatesPanel() {
  const auth = useHubAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<WorkflowTemplateCatalogItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<WorkflowTemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientCode, setClientCode] = useState('');
  const [followUpDays, setFollowUpDays] = useState('3');
  const [draftPreview, setDraftPreview] = useState<string | null>(null);
  const [draftWorkflowId, setDraftWorkflowId] = useState<string | null>(null);
  const [authorityRequired, setAuthorityRequired] = useState(false);

  const runDraftAction = useCallback(
    async (action: 'activate' | 'edit_draft' | 'cancel' | 'approve_authority') => {
      if (!draftWorkflowId || !auth.hasBearer) return;
      setBusy(true);
      setError(null);
      try {
        if (action === 'approve_authority') {
          await postWorkflowDraftAction(auth, {
            action: 'activate',
            workflowId: draftWorkflowId,
            approveAuthority: true,
          });
        } else {
          await postWorkflowDraftAction(auth, { action, workflowId: draftWorkflowId });
        }
        if (action === 'cancel') {
          setDraftPreview(null);
          setDraftWorkflowId(null);
          setAuthorityRequired(false);
        } else if (action === 'activate' || action === 'approve_authority') {
          navigate('/workflows');
        }
      } catch (err) {
        setError(String(err));
      } finally {
        setBusy(false);
      }
    },
    [auth, draftWorkflowId, navigate],
  );

  const refresh = useCallback(async () => {
    if (!auth.hasBearer) {
      setLoading(false);
      setError('Microsoft sign-in required (Bearer token missing)');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWorkflowTemplateCatalog(auth);
      setTemplates(res.workflowTemplates.templates);
    } catch (err) {
      setError(String(err));
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [auth]);

  const loadDetail = useCallback(
    async (templateId: string) => {
      if (!auth.hasBearer) return;
      setDetailLoading(true);
      setError(null);
      setDraftPreview(null);
      setDraftWorkflowId(null);
      try {
        const res = await fetchWorkflowTemplateDetail(auth, templateId);
        setDetail(res.workflowTemplates.detail);
        setSelectedId(templateId);
      } catch (err) {
        setError(String(err));
        setDetail(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [auth],
  );

  const useTemplate = useCallback(async () => {
    if (!selectedId || !auth.hasBearer) return;
    setBusy(true);
    setError(null);
    try {
      const inputs: Record<string, unknown> = {};
      if (clientCode.trim()) inputs.clientCode = clientCode.trim().toUpperCase();
      if (selectedId === 'client_follow_up' && followUpDays.trim()) {
        inputs.followUpDays = Number(followUpDays);
      }
      const res = await postInstantiateWorkflowTemplate(auth, {
        templateId: selectedId,
        inputs,
        sourceConversation: `Use template ${selectedId}`,
      });
      setDraftPreview(res.workflowDraft?.preview ?? null);
      setDraftWorkflowId(res.workflowDraft?.record.workflowId ?? null);
      setAuthorityRequired(Boolean(res.workflowDraft?.authorityExpansionRequired));
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }, [auth, selectedId, clientCode, followUpDays]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {loading ? <Spinner label="Loading templates..." /> : null}
      {error ? (
        <AtlasCard title="Connection or access error">
          <Text>{error}</Text>
        </AtlasCard>
      ) : null}

      {!loading && templates.length === 0 ? (
        <EmptyState title="No workflow templates" description="Templates will appear when entitled." />
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {templates.map((t) => (
          <button
            key={t.templateId}
            type="button"
            onClick={() => void loadDetail(t.templateId)}
            style={{
              textAlign: 'left',
              background: 'transparent',
              border: selectedId === t.templateId ? '1px solid #38bdf8' : '1px solid transparent',
              borderRadius: 8,
              padding: 0,
              cursor: 'pointer',
            }}
          >
            <AtlasCard title={t.name} subtitle={t.category}>
              <Caption1>{t.businessPurpose}</Caption1>
              <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <StatusChip label={t.recommendedAutonomy} tone="info" />
                <StatusChip label={t.commonTrigger} tone="neutral" />
              </div>
            </AtlasCard>
          </button>
        ))}
      </div>

      {detailLoading ? <Spinner label="Loading template detail..." /> : null}

      {detail ? (
        <AtlasCard title={detail.name}>
          <Title3 as="h3">{detail.ownerReadableSummary.purpose}</Title3>
          <Text block style={{ marginTop: 8 }}>
            <strong>When it runs:</strong> {detail.ownerReadableSummary.whenItRuns}
          </Text>
          <Text block style={{ marginTop: 8 }}>
            <strong>What it does:</strong>
          </Text>
          <ul>
            {detail.ownerReadableSummary.whatItDoes.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <Text block style={{ marginTop: 8 }}>
            <strong>Requires approval:</strong>{' '}
            {detail.ownerReadableSummary.requiresApproval.join(', ') || 'Standard policy only'}
          </Text>
          <Text block style={{ marginTop: 8 }}>
            <strong>Systems:</strong> {detail.ownerReadableSummary.systems.join(', ')}
          </Text>

          {detail.requiredInputs.some((i) => i.inputType === 'client') ? (
            <div style={{ marginTop: 12 }}>
              <Input
                placeholder="Client code (e.g. HFD01, ACCG01)"
                value={clientCode}
                onChange={(_, d) => setClientCode(d.value)}
              />
            </div>
          ) : null}

          {detail.templateId === 'client_follow_up' ? (
            <div style={{ marginTop: 12 }}>
              <Input
                placeholder="Follow up after how many days?"
                value={followUpDays}
                onChange={(_, d) => setFollowUpDays(d.value)}
              />
            </div>
          ) : null}

          <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button appearance="primary" disabled={busy} onClick={() => void useTemplate()}>
              Use template
            </Button>
            {draftWorkflowId ? (
              <Button appearance="secondary" onClick={() => navigate('/workflows')}>
                View in Workflows
              </Button>
            ) : null}
          </div>

          {draftPreview ? (
            <pre
              style={{
                marginTop: 16,
                whiteSpace: 'pre-wrap',
                background: 'rgba(15,23,42,0.6)',
                padding: 12,
                borderRadius: 8,
                fontSize: 13,
              }}
            >
              {draftPreview}
            </pre>
          ) : null}

          {draftWorkflowId ? (
            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {authorityRequired ? (
                <Button appearance="primary" disabled={busy} onClick={() => void runDraftAction('approve_authority')}>
                  Approve authority & activate
                </Button>
              ) : (
                <Button appearance="primary" disabled={busy} onClick={() => void runDraftAction('activate')}>
                  Activate workflow
                </Button>
              )}
              <Button appearance="secondary" disabled={busy} onClick={() => void runDraftAction('edit_draft')}>
                Edit draft
              </Button>
              <Button appearance="secondary" disabled={busy} onClick={() => void runDraftAction('cancel')}>
                Cancel
              </Button>
            </div>
          ) : null}
        </AtlasCard>
      ) : null}
    </div>
  );
}
