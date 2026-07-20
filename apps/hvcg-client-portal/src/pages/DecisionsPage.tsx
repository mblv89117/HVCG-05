import { usePortal } from '../state/PortalContext'

export function DecisionsPage() {
  const { decisions, activeClient } = usePortal()
  return (
    <div>
      <div className="page-head">
        <h2>Decisions</h2>
        <p>Recorded decisions for {activeClient.name}.</p>
      </div>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Decision</th>
              <th>By</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {decisions.map((d) => (
              <tr key={d.id}>
                <td>{d.title}</td>
                <td>{d.decision}</td>
                <td>{d.decidedBy}</td>
                <td>{d.decidedAt}</td>
                <td>{d.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
