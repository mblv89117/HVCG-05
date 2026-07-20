import { usePortal } from '../state/PortalContext'

export function ProjectsPage() {
  const { projects, activeClient } = usePortal()
  return (
    <div>
      <div className="page-head">
        <h2>Projects</h2>
        <p>Engagement projects for {activeClient.name}.</p>
      </div>
      <div className="grid cols-2">
        {projects.map((p) => (
          <div className="card" key={p.id}>
            <h3>{p.name}</h3>
            <p className="muted">
              {p.health} · {p.availability}
            </p>
            <p>
              Sponsor: {p.sponsor} · PM: {p.pm}
            </p>
            <p>
              Next: <strong>{p.nextMilestone}</strong>
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
