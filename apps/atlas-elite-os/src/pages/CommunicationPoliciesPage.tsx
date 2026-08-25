import { useCallback, useEffect, useState } from 'react';
import { AtlasCard, DataTable, EmptyState, StatusChip } from '@hvcg/atlas-design-system';
import {
  Button,
  Caption1,
  Dropdown,
  Input,
  MessageBar,
  MessageBarBody,
  Option,
  Spinner,
  Text,
  Title3,
} from '@fluentui/react-components';
import {
  fetchCommunicationPolicies,
  postCommunicationPolicy,
  type CommunicationPolicyMode,
  type CommunicationPolicyRecord,
  type CommunicationPolicyScopeKind,
} from '../integrations/hub/pmApi';
import { useHubAuth } from '../integrations/hub/useHubAuth';
import { ModuleScaffold } from './shared/ModuleScaffold';

function formatWhen(value?: string) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function CommunicationPoliciesPage() {
  const auth = useHubAuth();
  const [items, setItems] = useState<CommunicationPolicyRecord[]>([]);
  const [orgDefault, setOrgDefault] = useState('DRAFT_ONLY');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scopeKind, setScopeKind] = useState<CommunicationPolicyScopeKind>('client');
  const [mode, setMode] = useState<CommunicationPolicyMode>('DRAFT_ONLY');
  const [clientCode, setClientCode] = useState('');
  const [domain, setDomain] = useState('');
  const [contact, setContact] = useState('');

  const refresh = useCallback(async () => {
    if (!auth.tokenReady || !auth.hasBearer) {
      setLoading(false);
      setError('Microsoft sign-in required (Bearer token missing)');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchCommunicationPolicies(auth);
      setItems(res.communicationPolicies.items);
      setOrgDefault(res.communicationPolicies.orgDefault.mode);
    } catch (err) {
      setError(String(err));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [auth]);

  const recordPolicy = useCallback(async () => {
    if (!auth.hasBearer) return;
    setBusy(true);
    setError(null);
    try {
      await postCommunicationPolicy(auth, {
        scopeKind,
        mode,
        ...(clientCode.trim() ? { clientCode: clientCode.trim().toUpperCase() } : {}),
        ...(domain.trim() ? { domain: domain.trim() } : {}),
        ...(contact.trim() ? { contact: contact.trim() } : {}),
      });
      await refresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }, [auth, scopeKind, mode, clientCode, domain, contact, refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const columns = [
    {
      key: 'scope',
      header: 'Scope',
      render: (row: CommunicationPolicyRecord) =>
        row.scopeKind === 'org'
          ? 'org default'
          : row.clientCode || row.domain || row.contact || row.scopeKind,
    },
    {
      key: 'kind',
      header: 'Kind',
      render: (row: CommunicationPolicyRecord) => row.scopeKind,
    },
    {
      key: 'mode',
      header: 'Mode',
      render: (row: CommunicationPolicyRecord) => <StatusChip label={row.mode} tone={row.mode === 'AUTO_RESPOND' ? 'warning' : 'info'} />,
    },
    {
      key: 'recordedAt',
      header: 'Recorded',
      render: (row: CommunicationPolicyRecord) => formatWhen(row.recordedAt),
    },
  ];

  return (
    <ModuleScaffold title="CommunicationPolicies" subtitle="Records comms policy. Approval Center remains the approval path. Atlas does not auto-send mail.">
      {error ? (
        <MessageBar intent="error">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      ) : null}

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <StatusChip label={`org default ${orgDefault}`} tone="info" />
        <StatusChip label="AUTO_RESPOND not global" tone="neutral" />
        <Button appearance="secondary" onClick={() => void refresh()} disabled={loading}>
          Refresh
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <AtlasCard>
          <Title3>Recorded policies</Title3>
          {loading ? (
            <Spinner label="Loading CommunicationPolicies…" />
          ) : items.length === 0 ? (
            <EmptyState title="No recorded policies" description="Organization default remains DRAFT_ONLY." />
          ) : (
            <DataTable
              ariaLabel="Communication policies"
              rows={items}
              getRowKey={(row) => row.policyId}
              columns={columns}
            />
          )}
        </AtlasCard>

        <AtlasCard>
          <Title3>Record policy</Title3>
          <Caption1>
            Org default must stay DRAFT_ONLY. AUTO_RESPOND is allowed only on an entitled client, domain, or contact.
            Unknown ClientCodes are rejected. This does not send mail.
          </Caption1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
            <Dropdown
              value={scopeKind}
              selectedOptions={[scopeKind]}
              onOptionSelect={(_, data) => setScopeKind((data.optionValue as CommunicationPolicyScopeKind) || 'client')}
            >
              <Option value="org">org default</Option>
              <Option value="client">client</Option>
              <Option value="domain">domain</Option>
              <Option value="contact">contact</Option>
            </Dropdown>
            <Dropdown
              value={mode}
              selectedOptions={[mode]}
              onOptionSelect={(_, data) => setMode((data.optionValue as CommunicationPolicyMode) || 'DRAFT_ONLY')}
            >
              <Option value="DRAFT_ONLY">DRAFT_ONLY</Option>
              <Option value="REQUIRE_APPROVAL">REQUIRE_APPROVAL</Option>
              <Option value="AUTO_RESPOND">AUTO_RESPOND</Option>
            </Dropdown>
            <Input
              placeholder="ClientCode (PDG01 ACCG01 CCB01 HFD01 LIEN01)"
              value={clientCode}
              onChange={(_, d) => setClientCode(d.value)}
            />
            <Input placeholder="Domain (optional)" value={domain} onChange={(_, d) => setDomain(d.value)} />
            <Input placeholder="Contact (optional)" value={contact} onChange={(_, d) => setContact(d.value)} />
            <Button appearance="primary" disabled={busy} onClick={() => void recordPolicy()}>
              Record policy
            </Button>
            <Text>Approvals remain the approval path. CommunicationPolicies only records policy.</Text>
          </div>
        </AtlasCard>
      </div>
    </ModuleScaffold>
  );
}
