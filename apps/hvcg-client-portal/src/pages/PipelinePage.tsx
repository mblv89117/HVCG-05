import { usePortal } from '../state/PortalContext'

export function PipelinePage() {
  const { pipeline, activeClient } = usePortal()
  return (
    <div>
      <div className="page-head">
        <h2>Lender / Investor Pipeline</h2>
        <p>
          No named counterparties until packaging is verified for {activeClient.name}. Themes:{' '}
          {activeClient.financingThemes.join('; ')}.
        </p>
      </div>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Party</th>
              <th>Type</th>
              <th>Stage</th>
              <th>Status</th>
              <th>Notes</th>
              <th>Availability</th>
            </tr>
          </thead>
          <tbody>
            {pipeline.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.type}</td>
                <td>{p.stage}</td>
                <td>{p.status}</td>
                <td className="muted">{p.notes}</td>
                <td className="muted">{p.availability}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
