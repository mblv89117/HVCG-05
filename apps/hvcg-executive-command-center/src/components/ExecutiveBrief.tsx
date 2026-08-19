import type { EvidenceKind, ExecutiveBriefDocument, SourceRecord } from '../types/intelligence'
import { Badge } from './Dashboard'
import { useIntelligence } from '../state/IntelligenceContext'

function evidenceTone(kind: EvidenceKind): 'positive' | 'warning' | 'accent' | 'critical' | 'neutral' {
  if (kind === 'Verified') return 'positive'
  if (kind === 'Pending verification') return 'warning'
  if (kind === 'AI interpretation') return 'accent'
  return 'neutral'
}

export function SourceList({ sources, compact = false }: { sources: SourceRecord[]; compact?: boolean }) {
  const unique = [...new Map(sources.map((source) => [source.id, source])).values()]
  return (
    <ul className={`source-list ${compact ? 'compact' : ''}`} data-testid="source-list">
      {unique.map((source) => (
        <li key={source.id}>
          <Badge tone={evidenceTone(source.evidenceKind)}>{source.evidenceKind}</Badge>
          <div>
            <strong>{source.label}</strong>
            <small>
              {source.system} · {source.entity} · {source.recordId} · as of {new Date(source.asOf).toLocaleString()}
            </small>
          </div>
        </li>
      ))}
    </ul>
  )
}

export function ExecutiveBrief({ brief, showSources = true }: { brief: ExecutiveBriefDocument; showSources?: boolean }) {
  const { acceptInsight, dismissInsight, convertToTask, stackInsights } = useIntelligence()
  const sourceMap = new Map(brief.sources.map((s) => [s.id, s]))
  const primaryInsightId = brief.criticalInsightIds.find((id) => stackInsights.some((i) => i.id === id && i.status === 'Open'))
    ?? brief.criticalInsightIds[0]
  const primaryInsight = stackInsights.find((i) => i.id === primaryInsightId)
  const canAct = primaryInsight?.status === 'Open'

  return (
    <article className="executive-brief" data-testid={`brief-${brief.id}`}>
      <header className="brief-header">
        <div>
          <p className="eyebrow">{brief.kind === 'client-meeting' ? 'Meeting-ready brief' : brief.kind === 'weekly' ? 'Weekly briefing' : 'Daily overview'}</p>
          <h2>{brief.title}</h2>
          <p className="page-description">{brief.subject}{brief.clientScope ? ` · Client scope ${brief.clientScope}` : ''}</p>
        </div>
        <div className="brief-meta">
          <span data-testid="brief-generated-at">Generated {new Date(brief.generatedAt).toLocaleString()}</span>
          <Badge tone={brief.verificationStatus === 'Verified' ? 'positive' : brief.verificationStatus === 'Pending verification' ? 'warning' : 'accent'}>
            Verification · {brief.verificationStatus}
          </Badge>
          {brief.aiGenerated && (
            <span data-testid="brief-ai-generated">
              <Badge tone="accent">AI-generated content included</Badge>
            </span>
          )}
          <Badge tone="neutral">Audience · {brief.audience.join(', ')}</Badge>
        </div>
      </header>

      <div className="brief-actions-bar" role="group" aria-label="Brief disposition actions" data-testid="brief-disposition-actions">
        <span className="brief-actions-label">Brief actions{primaryInsight ? ` · ${primaryInsight.id}` : ''}</span>
        <button
          type="button"
          className="button button-primary"
          disabled={!canAct}
          onClick={() => primaryInsightId && acceptInsight(primaryInsightId)}
        >
          Accept
        </button>
        <button
          type="button"
          className="button button-secondary"
          disabled={!canAct}
          onClick={() => primaryInsightId && dismissInsight(primaryInsightId)}
        >
          Dismiss
        </button>
        <button
          type="button"
          className="button button-tertiary"
          disabled={!canAct}
          onClick={() => primaryInsightId && convertToTask(primaryInsightId)}
        >
          Convert to Task
        </button>
      </div>

      <div className="brief-sections">
        {brief.sections.map((section) => {
          const sectionSources = section.sourceIds
            .map((id) => sourceMap.get(id))
            .filter((item): item is SourceRecord => Boolean(item))
          return (
            <section key={section.id} className="brief-section" data-testid={`brief-section-${section.id}`}>
              <div className="brief-section-head">
                <h3>{section.title}</h3>
                <div className="brief-section-badges">
                  <Badge tone={evidenceTone(section.evidenceKind)}>{section.evidenceKind}</Badge>
                  {section.evidenceKind === 'AI interpretation' && <Badge tone="accent">AI-generated</Badge>}
                </div>
              </div>
              <ul>
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
              {sectionSources.length > 0 && (
                <details className="source-details" open={section.id === 'summary'}>
                  <summary>Source records ({sectionSources.length})</summary>
                  <SourceList sources={sectionSources} compact />
                </details>
              )}
            </section>
          )
        })}
      </div>

      {showSources && (
        <footer className="brief-footer">
          <h3>Full source register</h3>
          <SourceList sources={brief.sources} />
        </footer>
      )}
    </article>
  )
}
