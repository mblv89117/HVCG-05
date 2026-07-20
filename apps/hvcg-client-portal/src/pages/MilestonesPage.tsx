import { usePortal } from '../state/PortalContext'

export function MilestonesPage() {
  const { milestones, activeClient } = usePortal()
  const complete = milestones.filter((m) => m.status === 'Complete').length
  const withPct = milestones.filter((m) => m.progressPct !== null)
  const overall = withPct.length
    ? Math.round(withPct.reduce((total, milestone) => total + (milestone.progressPct ?? 0), 0) / withPct.length)
    : null

  return (
    <div>
      <div className="page-head">
        <h2>Milestones</h2>
        <p>Shared delivery checkpoints for {activeClient.name}, with ownership and due dates.</p>
      </div>

      <div className="grid cols-3" style={{ marginBottom: '1rem' }}>
        <div className="card stat">
          <span className="label">Overall progress</span>
          <span className="value" style={{ fontSize: '1.15rem' }}>
            {overall === null ? 'Pending' : `${overall}%`}
          </span>
          {overall !== null && (
            <div className="progress">
              <span style={{ width: `${overall}%` }} />
            </div>
          )}
        </div>
        <div className="card stat">
          <span className="label">Complete</span>
          <span className="value">{complete}</span>
          <span className="muted">of {milestones.length} milestones</span>
        </div>
        <div className="card stat">
          <span className="label">At risk</span>
          <span className="value">{milestones.filter((m) => m.status === 'At Risk').length}</span>
          <span className="muted">Requires attention</span>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Milestone</th>
              <th>Owner</th>
              <th>Due</th>
              <th>Status</th>
              <th>Progress</th>
            </tr>
          </thead>
          <tbody>
            {milestones.map((milestone) => (
              <tr key={milestone.id}>
                <td>
                  <strong>{milestone.title}</strong>
                </td>
                <td>{milestone.owner}</td>
                <td>{milestone.dueDate}</td>
                <td>
                  <span
                    className={`badge ${milestone.status === 'Complete' ? 'ok' : milestone.status === 'At Risk' ? 'danger' : 'warn'}`}
                  >
                    {milestone.status}
                  </span>
                </td>
                <td>
                  {milestone.progressPct === null ? (
                    <span className="muted">Not quantified</span>
                  ) : (
                    <>
                      <div className="progress milestone-progress">
                        <span style={{ width: `${milestone.progressPct}%` }} />
                      </div>
                      <span className="muted">{milestone.progressPct}%</span>
                    </>
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
