import GenericCrudPage, { type FieldDef } from '../GenericCrudPage'
import { logoConfigsApi } from '../../services/admin-api'
import type { Column } from '../../components/ui/DataTable'

const columns: Column<any>[] = [
  { key: 'id', title: 'ID', sortable: true },
  { key: 'name', title: 'Name', sortable: true },
  { key: 'value', title: 'Value', render: (item) => <span className="line-clamp-1 max-w-xs text-brand-text-muted">{item.value || '--'}</span> },
  { key: 'description', title: 'Description', render: (item) => <span className="line-clamp-1 max-w-xs">{item.description || '--'}</span> },
  { key: 'is_active', title: 'Active', render: (item) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
      {item.is_active ? 'Active' : 'Inactive'}
    </span>
  )},
]

const fields: FieldDef[] = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'value', label: 'Value', type: 'text' },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'is_active', label: 'Active', type: 'checkbox' },
]

export default function LogoConfigsPage() {
  return <GenericCrudPage title="Logo Configs" api={logoConfigsApi} columns={columns} fields={fields} />
}
