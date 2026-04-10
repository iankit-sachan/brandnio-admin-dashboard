import GenericCrudPage, { type FieldDef } from '../GenericCrudPage'
import { wizardFeaturesApi } from '../../services/admin-api'
import type { Column } from '../../components/ui/DataTable'

const columns: Column<any>[] = [
  { key: 'id', title: 'ID', sortable: true },
  { key: 'title', title: 'Name', sortable: true },
  { key: 'icon_name', title: 'Icon', render: (item) => <span className="text-brand-text-muted">{item.icon_name || '--'}</span> },
  { key: 'description', title: 'Description', render: (item) => <span className="line-clamp-1 max-w-xs">{item.description || '--'}</span> },
  { key: 'is_active', title: 'Active', render: (item) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
      {item.is_active ? 'Active' : 'Inactive'}
    </span>
  )},
  { key: 'sort_order', title: 'Order', sortable: true },
]

const fields: FieldDef[] = [
  { key: 'title', label: 'Name', type: 'text', required: true },
  { key: 'icon_name', label: 'Icon Name', type: 'text' },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'sort_order', label: 'Sort Order', type: 'number' },
  { key: 'is_active', label: 'Active', type: 'checkbox' },
]

export default function WizardFeaturesPage() {
  return <GenericCrudPage title="Wizard Features" api={wizardFeaturesApi} columns={columns} fields={fields} />
}
