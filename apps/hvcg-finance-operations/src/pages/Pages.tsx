import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import {
  BarChart,
  DataTable,
  FinancialWidget,
  PageHeader,
  RevenueCard,
  StatusChip,
} from '../components/FinanceUI'
import { agingRollup, formatUsd, priceEngagement, weightedForecast } from '../engines/financeEngines'
import { mockIntegrations } from '../integrations/mockIntegrations'
import { useFinance } from '../state/FinanceContext'
import type { ServiceLine } from '../types'
import { useMemo, useState } from 'react'

export function OverviewPage() {
  const { store } = useFinance()
  const { kpis } = store
  return (
    <div className="page">
      <PageHeader
        title="Finance Overview"
        subtitle="Ownership and accounting command surface — mock demo data only."
        badge="Phase 1"
      />
      <div className="metric-grid">
        <RevenueCard label="MRR" value={kpis.mrr} hint="Active retainers" tone="good" />
        <RevenueCard label="ARR" value={kpis.arr} hint="MRR × 12" />
        <RevenueCard label="Outstanding AR" value={kpis.outstandingAr} tone="warn" />
        <RevenueCard label="Cash position" value={kpis.cashPosition} />
        <RevenueCard label="Monthly revenue" value={kpis.monthlyRevenue} />
        <RevenueCard label="Success fees YTD" value={kpis.successFeesYtd} />
        <RevenueCard label="Pipeline value" value={kpis.pipelineValue} />
        <RevenueCard label="Projected cash 30d" value={kpis.projectedCash30d} tone="good" />
      </div>
      <div className="grid-2">
        <FinancialWidget title="Collections queue">
          <DataTable
            columns={[
              { key: 'clientCode', label: 'Client' },
              { key: 'amountOpen', label: 'Open' },
              { key: 'priority', label: 'Priority' },
              { key: 'nextAction', label: 'Next action' },
            ]}
            rows={store.collections.map((c) => ({
              clientCode: c.clientCode,
              amountOpen: formatUsd(c.amountOpen),
              priority: c.priority,
              nextAction: c.nextAction,
            }))}
          />
        </FinancialWidget>
        <FinancialWidget title="Mock integrations">
          <DataTable
            columns={[
              { key: 'name', label: 'System' },
              { key: 'status', label: 'Status' },
              { key: 'purpose', label: 'Purpose' },
            ]}
            rows={mockIntegrations.map((i) => ({
              name: i.name,
              status: i.status,
              purpose: i.purpose,
            }))}
          />
        </FinancialWidget>
      </div>
    </div>
  )
}

export function RevenuePage() {
  const { store } = useFinance()
  const commit = weightedForecast(store.forecast, 'Commit')
  const best = weightedForecast(store.forecast, 'Best Case')
  const pipe = weightedForecast(store.forecast, 'Pipeline')
  return (
    <div className="page">
      <PageHeader title="Revenue Dashboard" subtitle="Monthly revenue, MRR/ARR, retainers, success fees, forecast." />
      <div className="metric-grid">
        <RevenueCard label="Monthly revenue" value={store.kpis.monthlyRevenue} />
        <RevenueCard label="MRR" value={store.kpis.mrr} tone="good" />
        <RevenueCard label="ARR" value={store.kpis.arr} />
        <RevenueCard label="Retainers collected" value={store.kpis.retainersRevenue} />
        <RevenueCard label="Success fees YTD" value={store.kpis.successFeesYtd} />
        <RevenueCard label="Commit forecast" value={commit} />
        <RevenueCard label="Best case weighted" value={best} />
        <RevenueCard label="Pipeline weighted" value={pipe} />
      </div>
      <div className="grid-2">
        <FinancialWidget title="Monthly revenue vs collected">
          <BarChart
            items={store.monthlySeries.map((m) => ({ label: m.month.slice(5), value: m.revenue }))}
          />
        </FinancialWidget>
        <FinancialWidget title="Revenue by service">
          <BarChart
            items={store.revenueByService.map((s) => ({ label: s.serviceLine, value: s.revenue }))}
          />
        </FinancialWidget>
      </div>
      <FinancialWidget title="Forecast lines">
        <DataTable
          columns={[
            { key: 'month', label: 'Month' },
            { key: 'category', label: 'Category' },
            { key: 'revenueType', label: 'Type' },
            { key: 'amount', label: 'Amount' },
            { key: 'weightedAmount', label: 'Weighted' },
            { key: 'probability', label: 'Prob' },
          ]}
          rows={store.forecast.map((f) => ({
            month: f.month,
            category: f.category,
            revenueType: f.revenueType,
            amount: formatUsd(f.amount),
            weightedAmount: formatUsd(f.weightedAmount),
            probability: `${f.probability}%`,
          }))}
        />
      </FinancialWidget>
    </div>
  )
}

export function ArPage() {
  const { store } = useFinance()
  const aging = agingRollup(store.invoices)
  const open = store.invoices.filter((i) => ['Sent', 'Partial', 'Past Due'].includes(i.status))
  return (
    <div className="page">
      <PageHeader title="Accounts Receivable" subtitle="Outstanding invoices, aging, collections queue, payment status." />
      <div className="metric-grid">
        <RevenueCard label="Outstanding AR" value={store.kpis.outstandingAr} tone="warn" />
        <RevenueCard label="Current" value={aging.Current} />
        <RevenueCard label="1–30" value={aging['1-30']} />
        <RevenueCard label="31–60" value={aging['31-60']} tone="warn" />
        <RevenueCard label="61–90" value={aging['61-90']} tone="risk" />
        <RevenueCard label="90+" value={aging['90+']} tone="risk" />
      </div>
      <FinancialWidget title="Outstanding invoices">
        <DataTable
          columns={[
            { key: 'number', label: 'Invoice' },
            { key: 'clientCode', label: 'Client' },
            { key: 'type', label: 'Type' },
            { key: 'status', label: 'Status' },
            { key: 'amount', label: 'Amount' },
            { key: 'open', label: 'Open' },
            { key: 'agingBucket', label: 'Aging' },
            { key: 'dueOn', label: 'Due' },
          ]}
          rows={open.map((i) => ({
            number: i.number,
            clientCode: i.clientCode,
            type: i.type,
            status: i.status,
            amount: formatUsd(i.amount),
            open: formatUsd(i.amount - i.amountCollected),
            agingBucket: i.agingBucket,
            dueOn: i.dueOn,
          }))}
        />
      </FinancialWidget>
      <FinancialWidget title="Collections queue">
        <ul className="queue-list">
          {store.collections.map((c) => (
            <li key={c.id}>
              <div>
                <strong>{c.clientCode}</strong> · {formatUsd(c.amountOpen)}
                <p>{c.nextAction}</p>
              </div>
              <StatusChip status={c.priority} />
            </li>
          ))}
        </ul>
      </FinancialWidget>
    </div>
  )
}

export function RetainersPage() {
  const { store } = useFinance()
  const upcoming = [...store.retainers].sort((a, b) => a.renewalDate.localeCompare(b.renewalDate))
  return (
    <div className="page">
      <PageHeader title="Retainer Management" subtitle="Clients, billing cycles, active retainers, upcoming renewals." />
      <div className="metric-grid">
        <RevenueCard label="Active retainers" value={String(store.kpis.retainersActive)} />
        <RevenueCard label="Retainer MRR" value={store.kpis.mrr} tone="good" />
        <RevenueCard label="Next renewal" value={upcoming[0]?.renewalDate ?? '—'} />
      </div>
      <FinancialWidget title="Clients & billing">
        <DataTable
          columns={[
            { key: 'code', label: 'Code' },
            { key: 'name', label: 'Client' },
            { key: 'advisor', label: 'Advisor' },
            { key: 'serviceLine', label: 'Service' },
            { key: 'billingCycle', label: 'Cycle' },
            { key: 'retainerAmount', label: 'Retainer' },
            { key: 'renewalDate', label: 'Renewal' },
            { key: 'paymentStatus', label: 'Payment' },
          ]}
          rows={store.clients.map((c) => ({
            code: c.code,
            name: c.name,
            advisor: c.advisor,
            serviceLine: c.serviceLine,
            billingCycle: c.billingCycle,
            retainerAmount: c.retainerActive ? formatUsd(c.retainerAmount) : '—',
            renewalDate: c.renewalDate,
            paymentStatus: c.paymentStatus,
          }))}
        />
      </FinancialWidget>
      <FinancialWidget title="Upcoming renewals">
        <DataTable
          columns={[
            { key: 'clientCode', label: 'Client' },
            { key: 'amount', label: 'Amount' },
            { key: 'cycle', label: 'Cycle' },
            { key: 'renewalDate', label: 'Renewal' },
            { key: 'serviceLine', label: 'Service' },
          ]}
          rows={upcoming.map((r) => ({
            clientCode: r.clientCode,
            amount: formatUsd(r.amount),
            cycle: r.cycle,
            renewalDate: r.renewalDate,
            serviceLine: r.serviceLine,
          }))}
        />
      </FinancialWidget>
    </div>
  )
}

export function PricingPage() {
  const { store } = useFinance()
  const [service, setService] = useState<ServiceLine>('Capital Advisory')
  const [capitalRaise, setCapitalRaise] = useState(2_500_000)
  const model = store.pricingModels.find((m) => m.serviceLine === service)!
  const quote = useMemo(() => priceEngagement(model, capitalRaise), [model, capitalRaise])

  return (
    <div className="page">
      <PageHeader
        title="Proposal Pricing"
        subtitle="Model engagement pricing only — Fractional CFO, Capital, Valuation, Exit, Acquisition."
        badge="Model only"
      />
      <div className="pricing-controls">
        <label>
          Service line
          <select value={service} onChange={(e) => setService(e.target.value as ServiceLine)}>
            {store.pricingModels.map((m) => (
              <option key={m.sku} value={m.serviceLine}>
                {m.serviceLine}
              </option>
            ))}
          </select>
        </label>
        <label>
          Mock capital raise ($)
          <input
            type="number"
            value={capitalRaise}
            onChange={(e) => setCapitalRaise(Number(e.target.value) || 0)}
          />
        </label>
      </div>
      <div className="metric-grid">
        <RevenueCard label="Setup fee" value={quote.setup} />
        <RevenueCard label="Monthly retainer" value={quote.monthly} />
        <RevenueCard label="Success fee estimate" value={quote.successFeeEstimate} hint={`${model.successFeePct}%`} />
        <RevenueCard label="Year-one model" value={quote.yearOne} tone="good" />
      </div>
      <FinancialWidget title="Price book (mock)">
        <DataTable
          columns={[
            { key: 'sku', label: 'SKU' },
            { key: 'serviceLine', label: 'Service' },
            { key: 'setupFee', label: 'Setup' },
            { key: 'monthlyRetainer', label: 'Monthly' },
            { key: 'successFeePct', label: 'Success %' },
            { key: 'notes', label: 'Notes' },
          ]}
          rows={store.pricingModels.map((m) => ({
            sku: m.sku,
            serviceLine: m.serviceLine,
            setupFee: formatUsd(m.setupFee),
            monthlyRetainer: formatUsd(m.monthlyRetainer),
            successFeePct: `${m.successFeePct}%`,
            notes: m.notes,
          }))}
        />
      </FinancialWidget>
    </div>
  )
}

export function CashPage() {
  const { store } = useFinance()
  const next = store.cashFlow[store.cashFlow.length - 1]
  return (
    <div className="page">
      <PageHeader title="Cash Flow" subtitle="Cash position, projected cash, incoming / outgoing forecast." />
      <div className="metric-grid">
        <RevenueCard label="Cash position" value={store.kpis.cashPosition} tone="good" />
        <RevenueCard label="Projected 30d" value={store.kpis.projectedCash30d} />
        <RevenueCard label="Next incoming" value={next.incoming} />
        <RevenueCard label="Next outgoing" value={next.outgoing} tone="warn" />
      </div>
      <FinancialWidget title="Cash forecast">
        <DataTable
          columns={[
            { key: 'month', label: 'Month' },
            { key: 'opening', label: 'Opening' },
            { key: 'incoming', label: 'Incoming' },
            { key: 'outgoing', label: 'Outgoing' },
            { key: 'closing', label: 'Closing' },
          ]}
          rows={store.cashFlow.map((c) => ({
            month: c.month,
            opening: formatUsd(c.opening),
            incoming: formatUsd(c.incoming),
            outgoing: formatUsd(c.outgoing),
            closing: formatUsd(c.closing),
          }))}
        />
      </FinancialWidget>
      <FinancialWidget title="Closing cash trend">
        <BarChart items={store.cashFlow.map((c) => ({ label: c.month.slice(5), value: c.closing }))} />
      </FinancialWidget>
    </div>
  )
}

export function KpisPage() {
  const { store } = useFinance()
  const { kpis } = store
  return (
    <div className="page">
      <PageHeader title="Financial KPIs" subtitle="Gross/net revenue, client value, revenue by service and advisor, pipeline." />
      <div className="metric-grid">
        <RevenueCard label="Gross revenue YTD" value={kpis.grossRevenueYtd} />
        <RevenueCard label="Net revenue YTD" value={kpis.netRevenueYtd} />
        <RevenueCard label="Average client value" value={kpis.averageClientValue} />
        <RevenueCard label="Lifetime value total" value={kpis.lifetimeValueTotal} />
        <RevenueCard label="Pipeline value" value={kpis.pipelineValue} />
        <RevenueCard label="MRR" value={kpis.mrr} tone="good" />
      </div>
      <div className="grid-2">
        <FinancialWidget title="Revenue by advisor">
          <DataTable
            columns={[
              { key: 'advisor', label: 'Advisor' },
              { key: 'revenue', label: 'Revenue' },
              { key: 'clients', label: 'Clients' },
              { key: 'pipeline', label: 'Pipeline' },
            ]}
            rows={store.revenueByAdvisor.map((a) => ({
              advisor: a.advisor,
              revenue: formatUsd(a.revenue),
              clients: a.clients,
              pipeline: formatUsd(a.pipeline),
            }))}
          />
        </FinancialWidget>
        <FinancialWidget title="Revenue by service">
          <BarChart
            items={store.revenueByService.map((s) => ({ label: s.serviceLine, value: s.revenue }))}
          />
        </FinancialWidget>
      </div>
    </div>
  )
}

export function Protected({ routeKey, children }: { routeKey: string; children: ReactNode }) {
  const { canAccess } = useFinance()
  if (!canAccess(routeKey)) return <Navigate to="/" replace />
  return <>{children}</>
}
