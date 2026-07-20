import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePortal } from '../state/PortalContext'
import type { ConnectionSummary } from '@hvcg/atlas-plaid-contracts'
import {
  createLinkToken,
  disconnectConnection,
  exchangePublicToken,
  fetchCashSnapshot,
  fetchConnections,
  syncConnection,
  type PortalAuthHeaders,
} from '../plaid/api'

const CONSENT_VERSION = 'atlas-plaid-consent-v1'
const CONSENT_TEXT =
  'I authorize High Value Capital Group (Atlas) to connect to my business bank account(s) via Plaid to retrieve account ownership, balances, transactions, liabilities, and statement metadata for financial advisory purposes. Atlas never receives or stores my online banking password. I may disconnect at any time.'

declare global {
  interface Window {
    Plaid?: {
      create: (config: {
        token: string
        onSuccess: (public_token: string, metadata: unknown) => void
        onExit?: (err: unknown, metadata: unknown) => void
        onEvent?: (eventName: string, metadata: unknown) => void
      }) => { open: () => void; exit: () => void }
    }
  }
}

function money(n: number | null, currency?: string | null) {
  if (n == null) return '—'
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(n)
  } catch {
    return String(n)
  }
}

function statusClass(s: string) {
  if (s === 'Connected') return 'status ok'
  if (s === 'Syncing') return 'status warn'
  if (s === 'NeedsReauthorization') return 'status warn'
  if (s === 'Error') return 'status danger'
  return 'status muted'
}

export function FinancialConnectionsPage() {
  const { user, activeClient } = usePortal()
  const auth: PortalAuthHeaders = useMemo(
    () => ({
      userId: user.id,
      organizationId: 'org-hvcg',
      clientIds: user.clientIds,
      email: user.email,
      roles: [user.role],
    }),
    [user],
  )

  const [connections, setConnections] = useState<ConnectionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [consentChecked, setConsentChecked] = useState(false)
  const [cash, setCash] = useState<unknown>(null)
  const [linkReady, setLinkReady] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchConnections(auth, activeClient.id)
      setConnections(data.connections || [])
      const snap = await fetchCashSnapshot(auth, activeClient.id, activeClient.code)
      setCash(snap)
    } catch (e) {
      const status = (e as { status?: number }).status
      if (status === 503) {
        setError(
          'Plaid is not configured yet. Owner must place Sandbox credentials in Key Vault / local .secrets (never in chat). UI will not fake a successful connection.',
        )
      } else {
        setError(e instanceof Error ? e.message : 'Failed to load connections')
      }
    } finally {
      setLoading(false)
    }
  }, [auth, activeClient.id, activeClient.code])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (window.Plaid) {
      setLinkReady(true)
      return
    }
    const s = document.createElement('script')
    s.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js'
    s.async = true
    s.onload = () => setLinkReady(true)
    s.onerror = () => setError('Unable to load Plaid Link script')
    document.body.appendChild(s)
  }, [])

  async function openLink(mode: 'connect' | 'reconnect' = 'connect') {
    setError(null)
    setInfo(null)
    if (!consentChecked && mode === 'connect') {
      setError('Accept the consent disclosure before connecting a bank account.')
      return
    }
    if (!linkReady || !window.Plaid) {
      setError('Plaid Link is not ready. Check network access to cdn.plaid.com.')
      return
    }
    setBusy('link')
    try {
      const { linkToken } = await createLinkToken(auth, activeClient.id)
      const handler = window.Plaid.create({
        token: linkToken,
        onSuccess: (publicToken) => {
          void (async () => {
            try {
              setBusy('exchange')
              await exchangePublicToken(auth, {
                clientId: activeClient.id,
                clientCode: activeClient.code,
                publicToken,
                consentAcceptedAt: new Date().toISOString(),
                consentVersion: CONSENT_VERSION,
              })
              setInfo('Bank connected. Initial synchronization completed.')
              await refresh()
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Token exchange failed')
            } finally {
              setBusy(null)
            }
          })()
        },
        onExit: (err) => {
          setBusy(null)
          if (err) setError('Plaid Link closed before completion')
        },
      })
      handler.open()
    } catch (e) {
      const status = (e as { status?: number }).status
      if (status === 503) {
        setError(
          'Cannot open Plaid Link: API credentials not configured. See OWNER_ACTIONS_PLAID.md.',
        )
      } else {
        setError(e instanceof Error ? e.message : 'Link token failed')
      }
      setBusy(null)
    }
  }

  async function onRefresh(connectionId: string) {
    setBusy(connectionId)
    setError(null)
    try {
      await syncConnection(auth, activeClient.id, connectionId)
      setInfo('Synchronization complete.')
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setBusy(null)
    }
  }

  async function onDisconnect(connectionId: string) {
    if (!window.confirm('Disconnect this bank institution from Atlas? Future sync will stop. Audit history is retained.')) {
      return
    }
    setBusy(connectionId)
    try {
      await disconnectConnection(auth, activeClient.id, connectionId, 'user_disconnect')
      setInfo('Institution disconnected.')
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Disconnect failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Financial Connections</p>
          <h2>Connect Bank Account</h2>
          <p className="lede">
            Securely link business accounts via Plaid for {activeClient.name}. Atlas uses verified bank
            data for Finance Intelligence and Executive Dashboard cash KPIs.
          </p>
        </div>
        <button
          type="button"
          className="btn primary"
          disabled={busy !== null || loading}
          onClick={() => void openLink('connect')}
        >
          {busy === 'link' || busy === 'exchange' ? 'Connecting…' : 'Connect Bank Account'}
        </button>
      </header>

      <section className="card consent-card" aria-labelledby="consent-title">
        <h3 id="consent-title">Consent & privacy</h3>
        <p>{CONSENT_TEXT}</p>
        <ul className="consent-list">
          <li>Atlas never receives or stores your online banking password.</li>
          <li>Approved products: Auth, Balance, Identity, Liabilities, Statements, Transactions.</li>
          <li>Atlas does not move money or initiate payments through this connection.</li>
          <li>You may disconnect at any time. Access tokens are revoked server-side.</li>
        </ul>
        <label className="consent-check">
          <input
            type="checkbox"
            checked={consentChecked}
            onChange={(e) => setConsentChecked(e.target.checked)}
          />
          I agree to the disclosure above ({CONSENT_VERSION})
        </label>
      </section>

      {error ? (
        <div className="banner danger" role="alert">
          {error}
        </div>
      ) : null}
      {info ? (
        <div className="banner ok" role="status">
          {info}
        </div>
      ) : null}

      <section className="card">
        <h3>Verified cash snapshot</h3>
        {cash && typeof cash === 'object' && 'provenance' in (cash as object) ? (
          (cash as { provenance: string }).provenance === 'VerifiedBank' ? (
            <div className="kpi-row">
              <div>
                <div className="muted">Current balance (Verified bank data)</div>
                <div className="kpi">
                  {money((cash as { totalCurrentBalance: number }).totalCurrentBalance)}
                </div>
              </div>
              <div>
                <div className="muted">Available</div>
                <div className="kpi">
                  {money((cash as { totalAvailableBalance: number | null }).totalAvailableBalance)}
                </div>
              </div>
              <div>
                <div className="muted">Accounts / Institutions</div>
                <div className="kpi">
                  {(cash as { accountCount: number }).accountCount} /{' '}
                  {(cash as { institutionCount: number }).institutionCount}
                </div>
              </div>
            </div>
          ) : (
            <p className="muted">No verified bank data yet — connect an institution to populate cash KPIs.</p>
          )
        ) : (
          <p className="muted">Snapshot unavailable.</p>
        )}
      </section>

      <section aria-labelledby="institutions-title">
        <h3 id="institutions-title">Connected institutions</h3>
        {loading ? <p className="muted">Loading connections…</p> : null}
        {!loading && connections.length === 0 ? (
          <div className="card empty">
            <p>No banks connected yet.</p>
            <p className="muted">Use Connect Bank Account after accepting consent. Sandbox credentials required.</p>
          </div>
        ) : null}
        <div className="institution-grid">
          {connections.map((c) => (
            <article key={c.connectionId} className="card institution">
              <header className="inst-head">
                <div>
                  <h4>{c.institution.name}</h4>
                  <span className={statusClass(c.status)}>{c.status}</span>
                </div>
                <div className="inst-actions">
                  {c.status === 'NeedsReauthorization' ? (
                    <button type="button" className="btn" disabled={busy !== null} onClick={() => void openLink('reconnect')}>
                      Reconnect
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn"
                    disabled={busy !== null || c.status === 'Disconnected'}
                    onClick={() => void onRefresh(c.connectionId)}
                  >
                    {busy === c.connectionId ? 'Syncing…' : 'Refresh'}
                  </button>
                  <button
                    type="button"
                    className="btn danger"
                    disabled={busy !== null || c.status === 'Disconnected'}
                    onClick={() => void onDisconnect(c.connectionId)}
                  >
                    Disconnect
                  </button>
                </div>
              </header>
              <p className="muted">
                Last synced:{' '}
                {c.lastSyncedAt ? new Date(c.lastSyncedAt).toLocaleString() : 'Not yet synchronized'}
              </p>
              <table className="acct-table">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Type</th>
                    <th>Last 4</th>
                    <th>Current</th>
                    <th>Available</th>
                    <th>Provenance</th>
                  </tr>
                </thead>
                <tbody>
                  {c.accounts.map((a) => (
                    <tr key={a.accountId}>
                      <td>{a.name}</td>
                      <td>
                        {a.type}
                        {a.subtype ? ` / ${a.subtype}` : ''}
                      </td>
                      <td>•••• {a.mask}</td>
                      <td>{money(a.currentBalance, a.isoCurrencyCode)}</td>
                      <td>{money(a.availableBalance, a.isoCurrencyCode)}</td>
                      <td>
                        <span className="badge verified">{a.provenance}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
