import { useMemo, useState } from 'react'
import { usePortal } from '../state/PortalContext'
import { DATA_ROOM_CATEGORIES } from '../types'
import { integrations } from '../integrations/mockIntegrations'

export function DataRoomPage() {
  const { dataRoom, activeClient, canContribute, activity } = usePortal()
  const [toast, setToast] = useState('')
  const [category, setCategory] = useState<(typeof DATA_ROOM_CATEGORIES)[number] | 'all'>('all')

  const counts = useMemo(() => {
    const map = Object.fromEntries(DATA_ROOM_CATEGORIES.map((c) => [c, 0])) as Record<string, number>
    for (const d of dataRoom) {
      if (d.sizeKb > 0) map[d.category] = (map[d.category] ?? 0) + 1
    }
    return map
  }, [dataRoom])

  const rows = dataRoom.filter((d) => (category === 'all' ? true : d.category === category) && d.sizeKb > 0)
  const audit = activity.filter((a) => a.category === 'Document' || a.category === 'System')

  async function upload() {
    if (!canContribute) {
      setToast('Read-only role cannot upload. Switch to Client Contributor or staff role.')
      return
    }
    const res = await integrations.mockUpload(`${activeClient.code}_secure_upload.pdf`)
    setToast(`Secure upload staged (mock): ${res.path}. Version tracking recorded in audit activity.`)
  }

  return (
    <div>
      <div className="page-head">
        <h2>Secure Data Room</h2>
        <p>
          Role-aware document room for {activeClient.name}. Anonymous sharing disabled. Internal files hidden from
          client roles.
        </p>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3>Categories</h3>
        <div className="folder-grid">
          {DATA_ROOM_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className="folder-tile"
              style={{ cursor: 'pointer', textAlign: 'left', width: '100%' }}
              onClick={() => setCategory(c)}
            >
              <strong>{c}</strong>
              <span>{counts[c] ?? 0} files</span>
            </button>
          ))}
        </div>
        <div style={{ marginTop: '0.85rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn ghost" type="button" onClick={() => setCategory('all')}>
            All files
          </button>
          <button className="btn secondary" type="button" onClick={upload} disabled={!canContribute}>
            Secure upload (mock)
          </button>
        </div>
        {toast && <p style={{ marginTop: '0.75rem' }}>{toast}</p>}
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3>Documents {category !== 'all' ? `· ${category}` : ''}</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Name</th>
              <th>Version</th>
              <th>Owner</th>
              <th>Approval</th>
              <th>Received</th>
              <th>Expires</th>
              <th>Download</th>
              <th>Audit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id}>
                <td>{d.category}</td>
                <td>
                  {d.name}
                  <div className="muted">{d.notes}</div>
                </td>
                <td>{d.version}</td>
                <td>{d.owner}</td>
                <td>{d.approvalStatus}</td>
                <td>{d.receivedDate ?? '—'}</td>
                <td>{d.expiresAt ?? '—'}</td>
                <td>
                  <button className="btn ghost" type="button" disabled={!d.downloadAllowed || d.approvalStatus !== 'Approved'}>
                    {d.downloadAllowed && d.approvalStatus === 'Approved' ? 'Download' : 'Blocked'}
                  </button>
                </td>
                <td className="muted">{d.auditSummary}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="muted">
                  No uploaded files in this view yet. Categories are ready for intake.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Audit activity</h3>
        <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
          {audit.map((a) => (
            <li key={a.id}>
              <strong>{a.title}</strong> — {a.description}
              <div className="muted">
                {a.actor} · {a.at}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
