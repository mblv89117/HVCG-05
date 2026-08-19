import { PageHeader, Section, StatusPill } from '../components/Ui'
import { useOps } from '../state/OpsContext'

export function WeeklyReviewsPage() {
  const { data } = useOps()
  return (
    <div className="page-stack">
      <PageHeader eyebrow="Weekly reviews" title="Weekly operations reviews" description="Wins, risks, and review readiness by week — mock cadence package." />
      <Section title="Review board" subtitle="Recent weeks">
        <div className="card-grid" data-testid="weekly-reviews">
          {data.weeklyReviews.map((item) => (
            <article className="entity-card" key={item.id}>
              <header>
                <div>
                  <strong>{item.week}</strong>
                  <span>{item.theme}</span>
                </div>
                <StatusPill label={item.status} tone={item.status === 'Reviewed' ? 'positive' : item.status === 'Ready' ? 'accent' : 'neutral'} />
              </header>
              <p>
                <strong>Wins:</strong> {item.wins}
              </p>
              <p>
                <strong>Risks:</strong> {item.risks}
              </p>
              <small>Owner · {item.owner}</small>
            </article>
          ))}
        </div>
      </Section>
    </div>
  )
}
