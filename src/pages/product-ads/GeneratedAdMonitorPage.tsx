import { DataTable, type Column } from '../../components/ui/DataTable'
import { mockGeneratedAds } from '../../services/mock-data'
import type { GeneratedAd } from '../../types'
import { StatusBadge } from '../../components/ui/StatusBadge'

const columns: Column<GeneratedAd>[] = [
  { key: 'id', title: 'ID' },
  { key: 'user_name', title: 'User', sortable: true },
  { key: 'product_name', title: 'Product' },
  { key: 'ad_text', title: 'Ad Text', render: (a) => <span className="truncate max-w-[200px] block">{a.ad_text}</span> },
  { key: 'status', title: 'Status', render: (a) => <StatusBadge status={a.status} /> },
  { key: 'credits_charged', title: 'Credits' },
  { key: 'created_at', title: 'Created' },
]

export default function GeneratedAdMonitorPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-brand-text">Generated Ads Monitor</h1>
      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        <DataTable columns={columns} data={mockGeneratedAds} />
      </div>
    </div>
  )
}
