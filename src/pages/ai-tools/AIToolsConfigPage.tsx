import { DataTable, type Column } from '../../components/ui/DataTable'
import { aiToolConfigApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'

interface AIToolConfig {
  id: number
  name: string
  category: string
  sort_order: number
  credit_cost: number
  navigation_target: string
}

const columns: Column<AIToolConfig>[] = [
  { key: 'name', title: 'Name', sortable: true },
  { key: 'category', title: 'Category', sortable: true },
  { key: 'sort_order', title: 'Sort Order', sortable: true },
  { key: 'credit_cost', title: 'Credit Cost', sortable: true },
  { key: 'navigation_target', title: 'Navigation Target' },
]

export default function AIToolsConfigPage() {
  const { data, loading } = useAdminCrud<AIToolConfig>(aiToolConfigApi)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-brand-text">AI Tools Config</h1>
      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading ? <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div> : <DataTable columns={columns} data={data} />}
      </div>
    </div>
  )
}
