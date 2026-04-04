import GenericCrudPage, { type FieldDef } from '../GenericCrudPage'
import { logoStylesApi } from '../../services/admin-api'
import type { Column } from '../../components/ui/DataTable'

const columns: Column<any>[] = [
  { key: 'id', title: 'ID', sortable: true },
  { key: 'name', title: 'Name', sortable: true },
  { key: 'preview_url', title: 'Preview', render: (item) => item.preview_url ? (
    <img src={item.preview_url} alt={item.name} className="h-8 w-8 rounded object-cover" />
  ) : <span className="text-brand-text-muted">--</span> },
  { key: 'description', title: 'Description', render: (item) => <span className="line-clamp-1 max-w-xs">{item.description || '--'}</span> },
  { key: 'display_order', title: 'Order', sortable: true },
  { key: 'is_active', title: 'Active', render: (item) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
      {item.is_active ? 'Active' : 'Inactive'}
    </span>
  )},
]

const fields: FieldDef[] = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'preview_url', label: 'Preview URL', type: 'url' },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'display_order', label: 'Display Order', type: 'number' },
  { key: 'is_active', label: 'Active', type: 'checkbox' },
]

export default function LogoStylesPage() {
  return <GenericCrudPage title="Logo Styles" api={logoStylesApi} columns={columns} fields={fields} />
}
