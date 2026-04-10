import GenericCrudPage, { type FieldDef } from '../GenericCrudPage'
import { collageLayoutsApi } from '../../services/admin-api'
import type { Column } from '../../components/ui/DataTable'

const columns: Column<any>[] = [
  { key: 'id', title: 'ID', sortable: true },
  { key: 'name', title: 'Name', sortable: true },
  { key: 'slug', title: 'Slug', sortable: true },
  { key: 'cells', title: 'Cells', render: (item) => <span>{Array.isArray(item.cells) ? item.cells.length : 0} cells</span> },
  { key: 'icon_name', title: 'Icon' },
  { key: 'sort_order', title: 'Order', sortable: true },
  { key: 'is_premium', title: 'Premium', render: (item) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.is_premium ? 'bg-brand-gold/20 text-brand-gold' : 'bg-brand-dark-hover text-brand-text-muted'}`}>
      {item.is_premium ? 'Premium' : 'Free'}
    </span>
  )},
  { key: 'is_active', title: 'Active', render: (item) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
      {item.is_active ? 'Active' : 'Inactive'}
    </span>
  )},
]

const fields: FieldDef[] = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'slug', label: 'Slug', type: 'text' },
  { key: 'icon_name', label: 'Icon Name', type: 'text' },
  { key: 'cells', label: 'Cells (JSON Array)', type: 'textarea' },
  { key: 'is_default', label: 'Default', type: 'checkbox' },
  { key: 'is_premium', label: 'Premium', type: 'checkbox' },
  { key: 'sort_order', label: 'Sort Order', type: 'number' },
  { key: 'is_active', label: 'Active', type: 'checkbox' },
]

export default function CollageLayoutsPage() {
  return <GenericCrudPage title="Collage Layouts" api={collageLayoutsApi} columns={columns} fields={fields} />
}
