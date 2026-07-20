import { useMemo, useState } from 'react'
import { usePortal } from '../state/PortalContext'
import { DATA_ROOM_CATEGORIES, type DocStatus } from '../types'
import { integrations } from '../integrations/mockIntegrations'

const statusClass: Record<DocStatus, string> = {
  Requested: 'warn',
  Uploaded: 'ok',
  'In Review': 'warn',
  Accepted: 'ok',
  Rejected: 'danger',
  Expired: 'danger',
}

export function DocumentsPage() {
  const { docs, activeClient, canContribute } = usePortal()
  const [filter, setFilter] = useState<'all' | 'requested' | 'uploaded'>('all')
  const [toast, setToast] = useState('')

  const folderCounts = useMemo(() => {
    const map = Object.fromEntries(DATA_ROOM_CATEGORIES.map((f) => [f, 0])) as Record<string, number>
    for (const d of docs) map[d.folder] = (map[d.folder] ?? 0) + 1
    return map
  }, [docs])

  const visible = docs.filter((d) => {
    if (filter === 'requested') return d.status === 'Requested' || d.status === 'In Review'
    if (filter === 'uploaded') return d.status === 'Uploaded' || d.status === 'Accepted'
    return true
  })

  async function mockUpload(title: string) {
    if (!canContribute) {
      setToast('Read-only role cannot upload. Switch to Client Contributor.')
      return
    }
    const res = await integrations.mockUpload(`${activeClient.code}_${title}.pdf`)
    setToast(`Mock upload staged: ${res.path}. Received date and version will attach after verification.`)
  }

  return (
    <div>
      <div className="page-head">
        <h2>Document Requests</h2>
        <p>
          Request / upload workflow for {activeClient.name}. Categories align with the secure data room. Email/SMS
          outbound remain disabled.
        </p>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3>Data room categories</h3>
        <div className="folder-grid">
          {DATA_ROOM_CATEGORIES.map((folder) => (
            <div key={folder} className="folder-tile">
              <strong>{folder}</strong>
              <span>{folderCounts[folder] ?? 0} requests</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
        <button className={`btn${filter === 'all' ? '' : ' ghost'}`} onClick={() => setFilter('all')}>
          All
        </button>
        <button className={`btn${filter === 'requested' ? '' : ' ghost'}`} onClick={() => setFilter('requested')}>
          Requested
        </button>
        <button className={`btn${filter === 'uploaded' ? '' : ' ghost'}`} onClick={() => setFilter('uploaded')}>
          Uploaded
        </button>
      </div>

      {toast && (
        <div className="card" style={{ marginBottom: '0.85rem', background: '#e8f1eb' }}>
          {toast}
        </div>
      )}

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Request</th>
              <th>Status</th>
              <th>Approval</th>
              <th>Due</th>
              <th>Received</th>
              <th>Expires</th>
              <th>Owner</th>
              <th>File</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visible.map((d) => (
              <tr key={d.id}>
                <td>{d.folder}</td>
                <td>
                  {d.title}
                  {d.notes ? <div className="muted">{d.notes}</div> : null}
                </td>
                <td>
                  <span className={`badge ${statusClass[d.status]}`}>{d.status}</span>
                </td>
                <td>{d.approvalStatus}</td>
                <td>{d.dueDate}</td>
                <td>{d.receivedDate ?? '—'}</td>
                <td>{d.expiresAt ?? '—'}</td>
                <td>{d.owner}</td>
                <td className="muted">{d.uploadedFileName ?? '—'}</td>
                <td>
                  {d.status === 'Requested' && (
                    <button className="btn secondary" onClick={() => mockUpload(d.title)} disabled={!canContribute}>
                      Upload (mock)
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
