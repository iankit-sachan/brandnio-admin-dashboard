import GenericCrudPage, { type FieldDef } from '../GenericCrudPage'
import { wizardConfigsApi } from '../../services/admin-api'
import type { Column } from '../../components/ui/DataTable'

const columns: Column<any>[] = [
  { key: 'id', title: 'ID', sortable: true },
  { key: 'name', title: 'Name', sortable: true },
  { key: 'description', title: 'Description', render: (item) => <span className="line-clamp-1 max-w-xs">{item.description || '--'}</span> },
  { key: 'is_active', title: 'Active', render: (item) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
      {item.is_active ? 'Active' : 'Inactive'}
    </span>
  )},
  { key: 'display_order', title: 'Order', sortable: true },
]

const fields: FieldDef[] = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'display_order', label: 'Display Order', type: 'number' },
  { key: 'is_active', label: 'Active', type: 'checkbox' },
]

export default function WizardConfigsPage() {
  return <GenericCrudPage title="Wizard Configs" api={wizardConfigsApi} columns={columns} fields={fields} />
}
