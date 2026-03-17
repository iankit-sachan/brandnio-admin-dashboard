import { DataTable, type Column } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { reelsApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'
import { formatDate } from '../../utils/formatters'
import type { Reel } from '../../types'

const columns: Column<Reel>[] = [
  { key: 'user_name', title: 'User', sortable: true },
  { key: 'title', title: 'Title', sortable: true },
  { key: 'animation_type', title: 'Animation', render: (r) => <span className="capitalize">{(r.animation_type as string).replace(/_/g, ' ')}</span> },
  { key: 'status', title: 'Status', render: (r) => <StatusBadge status={r.status as string} /> },
  { key: 'credits_charged', title: 'Credits' },
  { key: 'created_at', title: 'Date', sortable: true, render: (r) => formatDate(r.created_at as string) },
]

export default function ReelMonitorPage() {
  const { data, loading } = useAdminCrud<Reel>(reelsApi)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-brand-text">Reel Generation Monitor</h1>
      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading ? <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div> : <DataTable columns={columns} data={data} />}
      </div>
    </div>
  )
}
