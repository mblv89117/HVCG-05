import { usePortal } from '../state/PortalContext'

export function ApprovalsPage() {
  const { approvals, activeClient } = usePortal()
  return (
    <div>
      <div className="page-head">
        <h2>Approvals</h2>
        <p>Client-visible approval queue for {activeClient.name}. Anonymous sharing remains rejected.</p>
      </div>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Status</th>
              <th>Requested by</th>
              <th>Due</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {approvals.map((a) => (
              <tr key={a.id}>
                <td>{a.title}</td>
                <td>
                  <span className={`badge ${a.status === 'Approved' ? 'ok' : a.status === 'Rejected' ? 'danger' : 'warn'}`}>
                    {a.status}
                  </span>
                </td>
                <td>{a.requestedBy}</td>
                <td>{a.dueDate}</td>
                <td className="muted">{a.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
