import { DataTable, type Column } from '../../components/ui/DataTable'
import { mockNotifications } from '../../services/mock-data'
import { formatDate } from '../../utils/formatters'
import type { Notification } from '../../types'

const columns: Column<Notification>[] = [
  { key: 'user_name', title: 'User', sortable: true },
  { key: 'title', title: 'Title', sortable: true },
  { key: 'type', title: 'Type', render: (n) => <span className="capitalize">{n.type as string}</span> },
  { key: 'is_read', title: 'Read', render: (n) => n.is_read ? <span className="text-status-success">Yes</span> : <span className="text-brand-text-muted">No</span> },
  { key: 'created_at', title: 'Sent', sortable: true, render: (n) => formatDate(n.created_at as string) },
]

export default function NotificationHistoryPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-brand-text">Notification History</h1>
      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        <DataTable columns={columns} data={mockNotifications} />
      </div>
    </div>
  )
}
