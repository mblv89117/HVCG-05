import { useMemo, useState } from 'react'
import { usePortal } from '../state/PortalContext'
import { DOCUMENT_FOLDERS, type DocStatus } from '../types'
import { integrations } from '../integrations/mockIntegrations'

const statusClass: Record<DocStatus, string> = {
  Requested: 'warn',
  Uploaded: 'ok',
  'In Review': 'warn',
  Accepted: 'ok',
  Rejected: 'danger',
}

export function DocumentsPage() {
  const { docs, activeClient } = usePortal()
  const [filter, setFilter] = useState<'all' | 'requested' | 'uploaded'>('all')
  const [toast, setToast] = useState('')

  const folderCounts = useMemo(() => {
    const map = Object.fromEntries(DOCUMENT_FOLDERS.map((f) => [f, 0])) as Record<string, number>
    for (const d of docs) map[d.folder] = (map[d.folder] ?? 0) + 1
    return map
  }, [docs])

  const visible = docs.filter((d) => {
    if (filter === 'requested') return d.status === 'Requested' || d.status === 'In Review'
    if (filter === 'uploaded') return d.status === 'Uploaded' || d.status === 'Accepted'
    return true
  })

  async function mockUpload(title: string) {
    const res = await integrations.mockUpload(`${activeClient.code}_${title}.pdf`)
    setToast(`Mock upload staged: ${res.path}`)
  }

  return (
    <div>
      <div className="page-head">
        <h2>Document Checklist</h2>
        <p>
          Reusable document request engine for {activeClient.name}. Folders standardize diligence across clients at
          scale.
        </p>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3>Document Center folders</h3>
        <div className="folder-grid">
          {DOCUMENT_FOLDERS.map((folder) => (
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
          Requested documents
        </button>
        <button className={`btn${filter === 'uploaded' ? '' : ' ghost'}`} onClick={() => setFilter('uploaded')}>
          Uploaded documents
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
              <th>Folder</th>
              <th>Request</th>
              <th>Status</th>
              <th>Due</th>
              <th>File</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visible.map((d) => (
              <tr key={d.id}>
                <td>{d.folder}</td>
                <td>{d.title}</td>
                <td>
                  <span className={`badge ${statusClass[d.status]}`}>{d.status}</span>
                </td>
                <td>{d.dueDate}</td>
                <td className="muted">{d.uploadedFileName ?? '—'}</td>
                <td>
                  {d.status === 'Requested' && (
                    <button className="btn secondary" onClick={() => mockUpload(d.title)}>
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
