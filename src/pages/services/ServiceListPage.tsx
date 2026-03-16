import { DataTable, type Column } from '../../components/ui/DataTable'
import { mockServices } from '../../services/mock-data'
import type { NearbyService } from '../../types'

const columns: Column<NearbyService>[] = [
  { key: 'name', title: 'Service', sortable: true },
  { key: 'category_name', title: 'Category', sortable: true },
  { key: 'city', title: 'City', sortable: true },
  { key: 'average_rating', title: 'Rating', sortable: true, render: (s) => <span className="text-brand-gold">{s.average_rating as number} ★</span> },
  { key: 'is_verified', title: 'Verified', render: (s) => s.is_verified ? <span className="text-status-success">Verified</span> : <span className="text-brand-text-muted">Pending</span> },
]

export default function ServiceListPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-brand-text">Service Listings</h1>
      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        <DataTable columns={columns} data={mockServices} />
      </div>
    </div>
  )
}
