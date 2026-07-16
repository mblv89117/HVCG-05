import { useState } from 'react'
import { usePortal } from '../state/PortalContext'
import { integrations } from '../integrations/mockIntegrations'

export function FilesPage() {
  const { files, activeClient } = usePortal()
  const [note, setNote] = useState('')

  async function sign(name: string) {
    const res = await integrations.mockESign(name)
    setNote(`Mock e-sign envelope ${res.envelopeId} created for ${name} (status ${res.status}).`)
  }

  return (
    <div>
      <div className="page-head">
        <h2>Secure File Center</h2>
        <p>
          Client-visible files for {activeClient.name}. Anonymous sharing is never enabled. E-signature provider is
          mocked.
        </p>
      </div>

      {note && (
        <div className="card" style={{ marginBottom: '1rem', background: '#e8f1eb' }}>
          {note}
        </div>
      )}

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Folder</th>
              <th>File</th>
              <th>Size</th>
              <th>Updated</th>
              <th>Sensitivity</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {files.map((f) => (
              <tr key={f.id}>
                <td>{f.folder}</td>
                <td>{f.name}</td>
                <td>{f.sizeKb} KB</td>
                <td>{new Date(f.updatedAt).toLocaleDateString()}</td>
                <td>
                  <span className="badge ok">{f.sensitivity}</span>
                </td>
                <td style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <button className="btn ghost" type="button" disabled title="Mock download">
                    Download
                  </button>
                  {f.folder === 'Contracts' && (
                    <button className="btn secondary" onClick={() => sign(f.name)}>
                      E-sign (mock)
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {files.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  No client-visible files yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
