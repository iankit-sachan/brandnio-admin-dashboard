import { DataTable, type Column } from '../../components/ui/DataTable'
import { notificationsApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'
import { formatDate } from '../../utils/formatters'
import type { Notification } from '../../types'

const columns: Column<Notification>[] = [
  { key: 'user_email', title: 'User', sortable: true },
  { key: 'title', title: 'Title', sortable: true },
  { key: 'notification_type', title: 'Type', render: (n) => <span className="capitalize">{n.notification_type as string}</span> },
  { key: 'is_read', title: 'Read', render: (n) => n.is_read ? <span className="text-status-success">Yes</span> : <span className="text-brand-text-muted">No</span> },
  { key: 'created_at', title: 'Sent', sortable: true, render: (n) => formatDate(n.created_at as string) },
]

export default function NotificationHistoryPage() {
  const { data, loading } = useAdminCrud<Notification>(notificationsApi)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-brand-text">Notification History</h1>
      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading ? <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div> : <DataTable columns={columns} data={data} />}
      </div>
    </div>
  )
}
