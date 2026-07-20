import { usePortal } from '../state/PortalContext'

export function ExecutiveSummaryPage() {
  const { activeClient, engagement, projects, insights } = usePortal()
  return (
    <div>
      <div className="page-head">
        <h2>Executive Summary</h2>
        <p>Verified relationship profile for {activeClient.name}. No invented financials.</p>
      </div>
      <div className="grid cols-2">
        <div className="card">
          <h3>Relationship</h3>
          <p>
            <strong>Referral:</strong> {activeClient.referralSource}
          </p>
          <p>
            <strong>Original:</strong> {activeClient.originalRelationship}
          </p>
          <p>
            <strong>Current:</strong> {activeClient.currentRelationship}
          </p>
          <p>
            <strong>Status:</strong> {activeClient.engagementStatus} · {activeClient.health}
          </p>
        </div>
        <div className="card">
          <h3>Objectives &amp; themes</h3>
          <p>
            <strong>Objectives:</strong> {activeClient.originalObjectives.join('; ') || '—'}
          </p>
          <p>
            <strong>Financing themes:</strong> {activeClient.financingThemes.join('; ') || '—'}
          </p>
          <p>
            <strong>Services:</strong> {activeClient.services.join('; ') || '—'}
          </p>
        </div>
        <div className="card">
          <h3>History</h3>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {activeClient.relationshipHistory.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h3>Readiness</h3>
          <p>
            <strong>Document:</strong> {activeClient.documentReadiness}
          </p>
          <p>
            <strong>Capital:</strong> {activeClient.capitalReadiness}
          </p>
          <p>
            <strong>Blueprint stage:</strong> {activeClient.blueprintStage}
          </p>
          <p className="muted">{activeClient.notes}</p>
          <p className="muted">Engagement: {engagement?.title}</p>
          <p className="muted">Active projects: {projects.length}</p>
        </div>
        {insights.map((i) => (
          <div className="card" key={i.id} style={{ gridColumn: '1 / -1' }}>
            <h3>AI insight · {i.title}</h3>
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
