import { Link, useParams } from 'react-router-dom'
import { Badge, DataTable, MetricCard, PageHeader, Section, statusTone } from '../components/UI'
import { useDeployment } from '../state/DeploymentContext'

export function ReleaseDashboardPage() {
  const { data } = useDeployment()
  const counts = {
    pending: data.queue.filter((q) => q.status === 'Pending').length,
    approved: data.queue.filter((q) => q.status === 'Approved').length,
    blocked: data.queue.filter((q) => q.status === 'Blocked').length,
    prod: data.environments.find((e) => e.name === 'Production'),
  }
  return (
    <>
      <PageHeader
        title="Release Dashboard"
        subtitle="Release candidates across HVCG OS modules. Mock control plane only — no live deployments."
        meta={<Badge tone="info">Production protected</Badge>}
      />
      <div className="metric-grid">
        <MetricCard label="Release candidates" value={String(data.releases.length)} detail="Mock catalog" />
        <MetricCard label="Queue pending" value={String(counts.pending)} />
        <MetricCard label="Queue approved" value={String(counts.approved)} />
        <MetricCard label="Queue blocked" value={String(counts.blocked)} />
        <MetricCard label="Production version" value={counts.prod?.version.split('·')[0].trim() ?? 'UNKNOWN'} detail={counts.prod?.health} />
      </div>
      <Section title="Release candidates" subtitle="Environment · Status · Owner · Build · QA · Approval · Rollback">
        <DataTable
          headers={['Release', 'Environment', 'Status', 'Owner', 'Build', 'QA', 'Approval', 'Rollback']}
          rows={data.releases.map((r) => [
            <Link key={r.id} to={`/releases/${r.id}`} data-testid={`release-${r.id}`}>
              <strong>{r.name}</strong>
              <div className="muted">{r.id} · {r.module}</div>
            </Link>,
            r.environment,
            <Badge tone={statusTone(r.status)}>{r.status}</Badge>,
            r.owner,
            r.build,
            r.qa,
            r.approval,
            r.rollbackStatus,
          ])}
        />
      </Section>
    </>
  )
}

export function ReleaseDetailPage() {
  const { id } = useParams()
  const { data } = useDeployment()
  const release = data.releases.find((r) => r.id === id)
  if (!release) {
    return (
      <PageHeader title="Release not found" subtitle={`No mock release matches ${id ?? 'UNKNOWN'}.`} />
    )
  }
  return (
    <>
      <PageHeader
        title={release.name}
        subtitle={`${release.id} · ${release.module} · ${release.environment}`}
        meta={<Badge tone={statusTone(release.status)}>{release.status}</Badge>}
      />
      <div className="detail-grid">
        <Section title="Identity">
          <dl className="kv">
            <div><dt>Release ID</dt><dd>{release.id}</dd></div>
            <div><dt>Branch</dt><dd><code>{release.branch}</code></dd></div>
            <div><dt>Commit</dt><dd><code>{release.commit}</code></dd></div>
            <div><dt>Build</dt><dd>{release.build}</dd></div>
            <div><dt>Owner</dt><dd>{release.owner}</dd></div>
          </dl>
        </Section>
        <Section title="Rollback plan">
          <p>{release.rollbackPlan}</p>
          <p className="muted">Rollback status: {release.rollbackStatus}</p>
        </Section>
      </div>
      <Section title="Approval chain">
        <DataTable
          headers={['Stage', 'Decision', 'Actor', 'When', 'Note']}
          rows={release.approvalChain.map((a) => [
            a.stage,
            <Badge tone={statusTone(a.decision)}>{a.decision}</Badge>,
            a.actor,
            a.at ?? '—',
            a.note ?? '—',
          ])}
        />
      </Section>
      <Section title="Artifacts · Screenshots · Evidence · Notes">
        <div className="chip-columns">
          <div>
            <h3>Artifacts</h3>
            <ul>{release.artifacts.map((a) => <li key={a}><code>{a}</code></li>)}</ul>
          </div>
          <div>
            <h3>Screenshots</h3>
            <ul>{release.screenshots.length ? release.screenshots.map((a) => <li key={a}>{a}</li>) : <li className="muted">None</li>}</ul>
          </div>
          <div>
            <h3>Evidence</h3>
            <ul>{release.evidence.length ? release.evidence.map((a) => <li key={a}>{a}</li>) : <li className="muted">None</li>}</ul>
          </div>
        </div>
        <p className="notes">{release.releaseNotes}</p>
      </Section>
      <p><Link to="/">← Back to dashboard</Link></p>
    </>
  )
}

export function QueuePage() {
  const { data } = useDeployment()
  return (
    <>
      <PageHeader title="Deployment Queue" subtitle="Pending · Approved · Blocked · Rejected · Rolled Back (mock)." />
      <Section title="Queue">
        <DataTable
          headers={['Queue ID', 'Release', 'Status', 'Target', 'Requested by', 'Updated', 'Blocker']}
          rows={data.queue.map((q) => [
            q.id,
            <Link to={`/releases/${q.releaseId}`}>{q.releaseName}</Link>,
            <Badge tone={statusTone(q.status)}>{q.status}</Badge>,
            q.targetEnvironment,
            q.requestedBy,
            q.updatedAt,
            q.blockedReason ?? '—',
          ])}
        />
      </Section>
    </>
  )
}

export function PromotionPage() {
  const { data } = useDeployment()
  const lane = ['Development', 'QA', 'Staging', 'Production'] as const
  return (
    <>
      <PageHeader
        title="Environment Promotion"
        subtitle="Mock promotion path only. This UI cannot promote packages into Production."
        meta={<Badge tone="bad">Live deploy disabled</Badge>}
      />
      <div className="promo-lane">
        {lane.map((name, index) => {
          const env = data.environments.find((e) => e.name === name)
          return (
            <div key={name} className={`promo-card ${env?.protected ? 'protected' : ''}`}>
              <span className="step">Step {index + 1}</span>
              <h2>{name}</h2>
              <Badge tone={statusTone(env?.health ?? 'Unknown')}>{env?.health ?? 'Unknown'}</Badge>
              <p>{env?.notes}</p>
              <small>Last: {env?.lastRelease ?? '—'}</small>
            </div>
          )
        })}
      </div>
      <Section title="Promotion rules (Sprint 1)">
        <ul className="rule-list">
          <li>Development → QA → Staging → Production is the only allowed sequence.</li>
          <li>Production requires Owner approval naming environment + package hash.</li>
          <li>Deployment Manager Sprint 1 never executes promotions — display only.</li>
        </ul>
      </Section>
    </>
  )
}

export function ApprovalsPage() {
  const { data } = useDeployment()
  const rows = data.releases.flatMap((r) =>
    r.approvalChain.map((a) => [
      r.id,
      r.name,
      a.stage,
      <Badge tone={statusTone(a.decision)}>{a.decision}</Badge>,
      a.actor,
      a.at ?? '—',
    ]),
  )
  return (
    <>
      <PageHeader
        title="Approval Workflow"
        subtitle="Engineer → QA → Master PM → Owner → Deployment. Deployment stage is skipped for mock-only modules."
      />
      <Section title="Approval chain matrix">
        <DataTable headers={['Release ID', 'Release', 'Stage', 'Decision', 'Actor', 'When']} rows={rows} />
      </Section>
    </>
  )
}

export function EvidencePage() {
  const { data } = useDeployment()
  return (
    <>
      <PageHeader title="Release Evidence" subtitle="Build, QA, screenshots, architecture, Atlas, commit, branch, release notes (mock collected)." />
      {data.releases.map((r) => (
        <Section key={r.id} title={r.name} subtitle={`${r.branch} @ ${r.commit}`}>
          <DataTable
            headers={['Field', 'Value']}
            rows={[
              ['Build', r.build],
              ['QA', r.qa],
              ['Artifacts', r.artifacts.join(', ') || '—'],
              ['Screenshots', r.screenshots.join(', ') || '—'],
              ['Evidence', r.evidence.join(', ') || '—'],
              ['Release notes', r.releaseNotes],
            ]}
          />
        </Section>
      ))}
    </>
  )
}

export function RollbackPage() {
  const { data } = useDeployment()
  return (
    <>
      <PageHeader title="Rollback Dashboard" subtitle="Plans, evidence, owners, and verification criteria." />
      <Section title="Rollback register">
        <DataTable
          headers={['Release', 'Plan', 'Evidence', 'Owner', 'Verification', 'Status']}
          rows={data.rollbacks.map((r) => [
            <Link to={`/releases/${r.releaseId}`}>{r.releaseName}</Link>,
            r.plan,
            r.evidence.join('; '),
            r.owner,
            r.verification,
            <Badge tone={statusTone(r.status)}>{r.status}</Badge>,
          ])}
        />
      </Section>
    </>
  )
}

export function EnvironmentsPage() {
  const { data } = useDeployment()
  return (
    <>
      <PageHeader title="Environment Status" subtitle="Health, version, last release, last deployment." />
      <div className="env-grid">
        {data.environments.map((e) => (
          <article key={e.name} className={`env-card ${e.protected ? 'protected' : ''}`}>
            <header>
              <h2>{e.name}</h2>
              <Badge tone={statusTone(e.health)}>{e.health}</Badge>
            </header>
            <dl className="kv">
              <div><dt>Version</dt><dd>{e.version}</dd></div>
              <div><dt>Last release</dt><dd>{e.lastRelease}</dd></div>
              <div><dt>Last deployment</dt><dd>{e.lastDeployment}</dd></div>
              <div><dt>Protected</dt><dd>{e.protected ? 'Yes' : 'No'}</dd></div>
            </dl>
            <p>{e.notes}</p>
          </article>
        ))}
      </div>
    </>
  )
}

export function CalendarPage() {
  const { data } = useDeployment()
  return (
    <>
      <PageHeader title="Deployment Calendar" subtitle="Upcoming releases, freeze windows, maintenance, owner approvals." />
      <Section title="Schedule">
        <DataTable
          headers={['Event', 'Kind', 'Start', 'End', 'Owner']}
          rows={data.calendar.map((c) => [
            c.title,
            <Badge tone={statusTone(c.kind)}>{c.kind}</Badge>,
            c.start,
            c.end,
            c.owner,
          ])}
        />
      </Section>
    </>
  )
}

export function IncidentsPage() {
  const { data } = useDeployment()
  return (
    <>
      <PageHeader title="Incident Dashboard" subtitle="Deployment failures, QA failures, rollback events, Production alerts (mock)." />
      <Section title="Incidents">
        <DataTable
          headers={['ID', 'Kind', 'Severity', 'Title', 'Release', 'When', 'Owner', 'Status']}
          rows={data.incidents.map((i) => [
            i.id,
            i.kind,
            <Badge tone={statusTone(i.severity)}>{i.severity}</Badge>,
            i.title,
            i.releaseId ? <Link to={`/releases/${i.releaseId}`}>{i.releaseId}</Link> : '—',
            i.at,
            i.owner,
            <Badge tone={statusTone(i.status)}>{i.status}</Badge>,
          ])}
        />
      </Section>
    </>
  )
}

export function AuditPage() {
  const { data } = useDeployment()
  return (
    <>
      <PageHeader title="Audit Trail" subtitle="Every deployment action records timestamp, engineer, approval, release, branch, commit, evidence." />
      <Section title="Audit log">
        <DataTable
          headers={['Timestamp', 'Engineer', 'Approval', 'Release', 'Branch', 'Commit', 'Evidence', 'Action']}
          rows={data.audit.map((a) => [
            a.timestamp,
            a.engineer,
            a.approval,
            a.release,
            <code>{a.branch}</code>,
            <code>{a.commit}</code>,
            a.evidence,
            a.action,
          ])}
        />
      </Section>
    </>
  )
}
