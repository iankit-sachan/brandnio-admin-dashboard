import { useEffect, useState } from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  TrendingUp, DollarSign, Users, XCircle, RefreshCcw,
  AlertTriangle, BarChart3,
} from 'lucide-react'
import { subscriptionsApi } from '../../services/admin-api'
import { formatCurrency } from '../../utils/formatters'
import type { SubscriptionStats } from '../../types'

type RangeKey = '12m' | '3m' | '1m' | 'all'
const RANGES: Array<{ key: RangeKey; label: string }> = [
  { key: '1m',  label: 'Last month' },
  { key: '3m',  label: 'Last 3 months' },
  { key: '12m', label: 'Last 12 months' },
  { key: 'all', label: 'All time' },
]

// Colour palette for pie/bar charts (matches brand tokens + Tailwind defaults
// from the existing admin design system).
const PIE_COLORS = ['#F5C518', '#34d399', '#60a5fa', '#f472b6', '#c084fc', '#fb923c', '#a3e635']

export default function RevenueDashboardPage() {
  const [range, setRange] = useState<RangeKey>('12m')
  const [stats, setStats] = useState<SubscriptionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    subscriptionsApi.stats(range)
      .then((data: SubscriptionStats) => {
        if (!cancelled) setStats(data)
      })
      .catch((e) => {
        const msg = (e as { response?: { data?: { detail?: string } }; message?: string })
          ?.response?.data?.detail ?? (e as Error)?.message ?? 'Failed to load stats'
        if (!cancelled) setError(msg)
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [range])

  if (loading && !stats) {
    return <div className="flex items-center justify-center py-20 text-brand-text-muted">Loading revenue data…</div>
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2">
        <AlertTriangle className="w-8 h-8 text-red-400" />
        <div className="text-brand-text">Couldn't load stats</div>
        <div className="text-xs text-brand-text-muted">{error}</div>
      </div>
    )
  }
  if (!stats) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Revenue Dashboard</h1>
          <p className="text-sm text-brand-text-muted mt-0.5">
            Subscription revenue, active subscribers, churn, and plan mix
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-brand-dark-card border border-brand-dark-border rounded-lg">
          {RANGES.map(r => (
            <button key={r.key} onClick={() => setRange(r.key)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      range === r.key
                        ? 'bg-brand-gold text-gray-900'
                        : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-dark-hover'
                    }`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Headline KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="MRR"
                 value={formatCurrency(stats.totals.mrr)}
                 sublabel={`ARR: ${formatCurrency(stats.totals.arr)}`}
                 icon={TrendingUp} accent="from-emerald-500/20 to-emerald-500/5" iconColor="text-emerald-400" />
        <KpiCard label="Active subscribers"
                 value={stats.totals.active.toLocaleString()}
                 sublabel={`${stats.by_plan.length} active plan${stats.by_plan.length === 1 ? '' : 's'}`}
                 icon={Users} accent="from-blue-500/20 to-blue-500/5" iconColor="text-blue-400" />
        <KpiCard label="Churn (this month)"
                 value={`${(stats.churn.churn_rate * 100).toFixed(2)}%`}
                 sublabel={`${stats.churn.current_month_cancelled} cancels of ${stats.churn.active_start_of_month}`}
                 icon={XCircle} accent="from-amber-500/20 to-amber-500/5" iconColor="text-amber-400" />
        <KpiCard label="Refunds issued"
                 value={stats.totals.refunded_count.toLocaleString()}
                 sublabel={`${formatCurrency(stats.totals.total_refund_amount)} total`}
                 icon={RefreshCcw} accent="from-red-500/20 to-red-500/5" iconColor="text-red-400" />
      </div>

      {/* MRR trend line chart */}
      <ChartCard title="Revenue trend" subtitle={`${stats.mrr_trend.length} months of data`}
                 icon={BarChart3}>
        {stats.mrr_trend.length === 0 ? (
          <EmptyChart label="No revenue data in the selected range" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={stats.mrr_trend} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="month" stroke="#666" tick={{ fill: '#999', fontSize: 11 }} />
              <YAxis stroke="#666" tick={{ fill: '#999', fontSize: 11 }}
                     tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 8 }}
                labelStyle={{ color: '#ccc' }}
                formatter={(value: number, name: string) =>
                  name === 'revenue'
                    ? [formatCurrency(value), 'Revenue']
                    : [value, 'Subscriptions']
                }
              />
              <Line type="monotone" dataKey="revenue" stroke="#F5C518" strokeWidth={2} dot={{ fill: '#F5C518', r: 4 }} />
              <Line type="monotone" dataKey="count" stroke="#60a5fa" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* By-plan breakdown */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Revenue by plan" subtitle="Active subscribers only"
                   icon={DollarSign}>
          {stats.by_plan.length === 0 ? (
            <EmptyChart label="No active plans yet" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.by_plan} layout="vertical"
                        margin={{ top: 10, right: 40, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis type="number" stroke="#666" tick={{ fill: '#999', fontSize: 11 }}
                       tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="plan_name" type="category" stroke="#666"
                       tick={{ fill: '#999', fontSize: 11 }} width={100} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 8 }}
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#F5C518" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Subscribers by plan" subtitle="Distribution of active users"
                   icon={Users}>
          {stats.by_plan.length === 0 ? (
            <EmptyChart label="No active subscribers" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={stats.by_plan} dataKey="active" nameKey="plan_name"
                     cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                     paddingAngle={2} label={(e) => `${e.active}`}>
                  {stats.by_plan.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11, color: '#999' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Per-plan table — for CFOs who prefer numbers over charts */}
      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 overflow-hidden">
        <div className="px-5 py-3 border-b border-brand-dark-border/50">
          <h2 className="text-sm font-semibold text-brand-text">Plan breakdown</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-brand-dark/50">
            <tr className="text-left">
              <th className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-brand-text-muted">Plan</th>
              <th className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-brand-text-muted text-right">Active subs</th>
              <th className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-brand-text-muted text-right">Revenue</th>
              <th className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-brand-text-muted text-right">ARPU</th>
            </tr>
          </thead>
          <tbody>
            {stats.by_plan.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-brand-text-muted">No data yet</td></tr>
            ) : stats.by_plan.map(p => (
              <tr key={p.plan_slug} className="border-t border-brand-dark-border/30">
                <td className="px-5 py-3">
                  <div className="font-medium text-brand-text">{p.plan_name}</div>
                  <div className="text-[11px] text-brand-text-muted">{p.plan_slug}</div>
                </td>
                <td className="px-5 py-3 text-right text-brand-text">{p.active.toLocaleString()}</td>
                <td className="px-5 py-3 text-right text-brand-text">{formatCurrency(p.revenue)}</td>
                <td className="px-5 py-3 text-right text-brand-text-muted">
                  {p.active > 0 ? formatCurrency(p.revenue / p.active) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────

function KpiCard({
  label, value, sublabel, icon: Icon, accent, iconColor,
}: {
  label: string
  value: string
  sublabel: string
  icon: React.ElementType
  accent: string
  iconColor: string
}) {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${accent} bg-brand-dark-card rounded-xl border border-brand-dark-border p-5`}>
      <div className="flex items-start justify-between mb-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-brand-text-muted">{label}</div>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div className="text-2xl font-bold text-brand-text mb-1">{value}</div>
      <div className="text-[11px] text-brand-text-muted">{sublabel}</div>
    </div>
  )
}

function ChartCard({
  title, subtitle, icon: Icon, children,
}: {
  title: string
  subtitle?: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-brand-dark-border/50">
        <Icon className="w-4 h-4 text-brand-gold" />
        <div>
          <h2 className="text-sm font-semibold text-brand-text">{title}</h2>
          {subtitle && <div className="text-[11px] text-brand-text-muted">{subtitle}</div>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-[280px] flex items-center justify-center text-sm text-brand-text-muted">
      {label}
    </div>
  )
}
