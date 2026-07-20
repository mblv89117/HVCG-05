import { usePortal } from '../state/PortalContext'

export function DeliverablesPage() {
  const { deliverables, activeClient } = usePortal()
  return (
    <div>
      <div className="page-head">
        <h2>Deliverables</h2>
        <p>Client deliverables for {activeClient.name}, including Blueprint presentation package.</p>
      </div>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Deliverable</th>
              <th>Category</th>
              <th>Status</th>
              <th>Owner</th>
              <th>Due</th>
            </tr>
          </thead>
          <tbody>
            {deliverables.map((d) => (
              <tr key={d.id}>
                <td>{d.title}</td>
                <td>{d.category}</td>
                <td>{d.status}</td>
                <td>{d.owner}</td>
                <td>{d.dueDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
