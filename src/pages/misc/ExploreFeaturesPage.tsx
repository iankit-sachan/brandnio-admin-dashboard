import GenericCrudPage, { type FieldDef } from '../GenericCrudPage'
import { exploreFeaturesApi } from '../../services/admin-api'
import type { Column } from '../../components/ui/DataTable'

const columns: Column<any>[] = [
  { key: 'id', title: 'ID', sortable: true },
  { key: 'name', title: 'Name', sortable: true },
  { key: 'route_key', title: 'Route Key', render: (item) => (
    <span className="px-2 py-0.5 bg-brand-dark-deep rounded font-mono text-xs">{item.route_key || '--'}</span>
  )},
  { key: 'icon_url', title: 'Icon', render: (item) => item.icon_url ? <img src={item.icon_url} className="h-8 w-8 rounded" alt="" /> : '--' },
  { key: 'sort_order', title: 'Order', sortable: true },
  { key: 'is_active', title: 'Active', render: (item) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
      {item.is_active ? 'Active' : 'Inactive'}
    </span>
  )},
  { key: 'is_new', title: 'New?', render: (item) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.is_new ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'}`}>
      {item.is_new ? 'New' : 'No'}
    </span>
  )},
]

const fields: FieldDef[] = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'route_key', label: 'Route Key', type: 'text', required: true },
  { key: 'icon_url', label: 'Icon URL', type: 'text' },
  { key: 'sort_order', label: 'Sort Order', type: 'number' },
  { key: 'is_active', label: 'Active', type: 'checkbox' },
  { key: 'is_new', label: 'Mark as New', type: 'checkbox' },
]

export default function ExploreFeaturesPage() {
  return <GenericCrudPage title="Explore Features" api={exploreFeaturesApi} columns={columns} fields={fields} />
}
