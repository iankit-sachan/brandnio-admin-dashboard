import { DataTable, type Column } from '../../components/ui/DataTable'
import { servicesApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'
import type { NearbyService } from '../../types'

const columns: Column<NearbyService>[] = [
  { key: 'name', title: 'Service', sortable: true },
  { key: 'category_name', title: 'Category', sortable: true },
  { key: 'city', title: 'City', sortable: true },
  { key: 'average_rating', title: 'Rating', sortable: true, render: (s) => <span className="text-brand-gold">{s.average_rating as number} ★</span> },
  { key: 'is_verified', title: 'Verified', render: (s) => s.is_verified ? <span className="text-status-success">Verified</span> : <span className="text-brand-text-muted">Pending</span> },
]

export default function ServiceListPage() {
  const { data, loading } = useAdminCrud<NearbyService>(servicesApi)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-brand-text">Service Listings</h1>
      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading ? <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div> : <DataTable columns={columns} data={data} />}
      </div>
    </div>
  )
}
