import { DataTable, type Column } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { mockSubscriptions } from '../../services/mock-data'
import { formatCurrency, formatDate } from '../../utils/formatters'
import type { Subscription } from '../../types'

const columns: Column<Subscription>[] = [
  { key: 'user_name', title: 'User', sortable: true },
  { key: 'plan_name', title: 'Plan', sortable: true },
  { key: 'amount', title: 'Amount', sortable: true, render: (s) => formatCurrency(s.amount as number) },
  { key: 'status', title: 'Status', render: (s) => <StatusBadge status={s.status as string} /> },
  { key: 'razorpay_order_id', title: 'Razorpay Order', render: (s) => <span className="text-xs font-mono text-brand-text-muted">{s.razorpay_order_id as string}</span> },
  { key: 'created_at', title: 'Date', sortable: true, render: (s) => formatDate(s.created_at as string) },
]

export default function SubscriptionListPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-brand-text">Payments & Subscriptions</h1>
      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        <DataTable columns={columns} data={mockSubscriptions} />
      </div>
    </div>
  )
}
