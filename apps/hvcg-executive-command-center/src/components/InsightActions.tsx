import type { Insight } from '../types/intelligence'
import { Badge } from './Dashboard'
import { SourceList } from './ExecutiveBrief'
import { useIntelligence } from '../state/IntelligenceContext'

const impactTone = (impact: Insight['impact']) =>
  impact === 'Critical' ? 'critical' : impact === 'High' ? 'warning' : impact === 'Medium' ? 'accent' : 'neutral'

export function InsightCard({ insight }: { insight: Insight }) {
  const { acceptInsight, dismissInsight, convertToDecision, convertToTask } = useIntelligence()
  const open = insight.status === 'Open'

  return (
    <article className={`insight-card status-${insight.status.toLowerCase()}`} data-testid={`insight-${insight.id}`}>
      <div className="insight-top">
        <div>
          <Badge tone={impactTone(insight.impact)}>{insight.impact}</Badge>
          <Badge tone={insight.evidenceKind === 'Verified' ? 'positive' : insight.evidenceKind === 'AI interpretation' ? 'accent' : 'warning'}>
            {insight.evidenceKind}
          </Badge>
          <Badge tone="neutral">{insight.domain}</Badge>
        </div>
        <small>Priority {insight.priorityScore} · {insight.status}</small>
      </div>
      <h3>{insight.title}</h3>
      <p>{insight.summary}</p>
      <p className="insight-action"><strong>Recommended:</strong> {insight.recommendedAction}</p>
      <details className="source-details">
        <summary>Source records ({insight.sources.length})</summary>
        <SourceList sources={insight.sources} compact />
      </details>
      <small className="insight-generated">Generated {new Date(insight.generatedAt).toLocaleString()}</small>
      {open && (
        <div className="insight-actions" role="group" aria-label={`Actions for ${insight.title}`}>
          <button type="button" className="button button-primary" onClick={() => acceptInsight(insight.id)}>
            Accept
          </button>
          <button type="button" className="button button-secondary" onClick={() => dismissInsight(insight.id)}>
            Dismiss
          </button>
          <button type="button" className="button button-tertiary" onClick={() => convertToDecision(insight.id)}>
            Convert to decision
          </button>
          <button type="button" className="button button-tertiary" onClick={() => convertToTask(insight.id)}>
            Convert to task
          </button>
        </div>
      )}
    </article>
  )
}

export function DecisionQueue() {
  const { decisions, acceptDecision } = useIntelligence()
  const pending = decisions.filter((item) => item.status === 'Pending')
  return (
    <div className="decision-queue" data-testid="decision-queue">
      {pending.length === 0 && <p className="muted">No pending decisions.</p>}
      {pending.map((decision) => (
        <article key={decision.id} className="decision-card">
          <div className="insight-top">
            <Badge tone={impactTone(decision.impact)}>{decision.impact}</Badge>
            <small>Due {decision.due} · {decision.owner}</small>
          </div>
          <h3>{decision.title}</h3>
          <p>{decision.context}</p>
          <button type="button" className="button button-primary" onClick={() => acceptDecision(decision.id)}>
            Accept decision
          </button>
        </article>
      ))}
    </div>
  )
}

export function TaskQueue() {
  const { tasks } = useIntelligence()
  return (
    <div className="task-queue" data-testid="task-queue">
      {tasks.length === 0 && <p className="muted">No converted tasks yet.</p>}
      {tasks.map((task) => (
        <article key={task.id} className="task-card">
          <Badge tone="accent">{task.domain}</Badge>
          <h3>{task.title}</h3>
          <small>
            Due {task.due} · {task.owner} · from {task.sourceInsightId}
          </small>
        </article>
      ))}
    </div>
  )
}

export function ReviewHistoryPanel() {
  const { reviewHistory } = useIntelligence()
  return (
    <div className="review-history" data-testid="review-history">
      {reviewHistory.length === 0 && <p className="muted">No review actions yet. Accept, dismiss, or convert an insight to preserve history.</p>}
      <ol>
        {reviewHistory.map((event) => (
          <li key={event.id}>
            <strong>{event.action}</strong> · {event.insightId}
            <small>
              {event.actor} ({event.role}) · {new Date(event.at).toLocaleString()}
              {event.note ? ` · ${event.note}` : ''}
            </small>
          </li>
        ))}
      </ol>
    </div>
  )
}
