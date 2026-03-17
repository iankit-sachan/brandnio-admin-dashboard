import { useState, useMemo } from 'react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { subscriptionsApi, plansApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'
import { formatDate, formatCurrency } from '../../utils/formatters'
import type { Subscription, SubscriptionPlan } from '../../types'

export default function ExpiredPlansPage() {
  const { data: subscriptions, loading: loadingSubs } = useAdminCrud<Subscription>(subscriptionsApi)
  const { data: plans, loading: loadingPlans } = useAdminCrud<SubscriptionPlan>(plansApi)
  const [filterPlan, setFilterPlan] = useState('')

  const planNames = useMemo(() => plans.map(p => p.name), [plans])

  const expiredSubscriptions = subscriptions.filter(s => s.status === 'expired')

  const filtered = filterPlan
    ? expiredSubscriptions.filter(s => s.plan_name === filterPlan)
    : expiredSubscriptions

  const columns: Column<Subscription>[] = [
    { key: 'user_name', title: 'Name', sortable: true },
    { key: 'plan_name', title: 'Plan Name', sortable: true },
    { key: 'starts_at', title: 'Start Date', sortable: true, render: (s) => formatDate(s.starts_at) },
    { key: 'expires_at', title: 'Expiry Date', sortable: true, render: (s) => formatDate(s.expires_at) },
    { key: 'amount', title: 'Amount', sortable: true, render: (s) => formatCurrency(s.amount) },
    {
      key: 'status', title: 'Status', render: () => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-error/10 text-status-error">
          Expired
        </span>
      ),
    },
  ]

  const loading = loadingSubs || loadingPlans

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-text">Expired Plans</h1>
        <select
          value={filterPlan}
          onChange={e => setFilterPlan(e.target.value)}
          className="w-48 bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50"
        >
          <option value="">All Plans</option>
          {planNames.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div>
      ) : (
        <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
          <DataTable columns={columns} data={filtered} />
        </div>
      )}
    </div>
  )
}
