import GenericCrudPage, { type FieldDef } from '../GenericCrudPage'
import { mallCategoriesApi } from '../../services/admin-api'
import type { Column } from '../../components/ui/DataTable'

const columns: Column<any>[] = [
  { key: 'id', title: 'ID', sortable: true },
  { key: 'name', title: 'Name', sortable: true },
  { key: 'slug', title: 'Slug', render: (item) => (
    <span className="px-2 py-0.5 bg-brand-dark-deep rounded font-mono text-xs">{item.slug || '--'}</span>
  )},
  { key: 'icon', title: 'Icon', render: (item) => item.icon ? <img src={item.icon} className="h-8 w-8 rounded" alt="" /> : '--' },
  { key: 'sort_order', title: 'Order', sortable: true },
  { key: 'is_active', title: 'Active', render: (item) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
      {item.is_active ? 'Active' : 'Inactive'}
    </span>
  )},
]

const fields: FieldDef[] = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'slug', label: 'Slug', type: 'text' },
  { key: 'icon', label: 'Icon URL', type: 'text' },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'sort_order', label: 'Sort Order', type: 'number' },
  { key: 'is_active', label: 'Active', type: 'checkbox' },
]

export default function MallCategoriesPage() {
  return <GenericCrudPage title="Mall Categories" api={mallCategoriesApi} columns={columns} fields={fields} />
}
