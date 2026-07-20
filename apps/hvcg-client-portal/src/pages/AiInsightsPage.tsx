import { usePortal } from '../state/PortalContext'

export function AiInsightsPage() {
  const { insights, activeClient } = usePortal()
  return (
    <div>
      <div className="page-head">
        <h2>AI Insights</h2>
        <p>Client-safe briefings for {activeClient.name}. Structure only — no invented figures.</p>
      </div>
      <div className="grid cols-1">
        {insights.map((i) => (
          <div className="card" key={i.id}>
            <h3>{i.title}</h3>
            <p>{i.summary}</p>
            <p className="muted">
              {i.availability} · {new Date(i.generatedAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
