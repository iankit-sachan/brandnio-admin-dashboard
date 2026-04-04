import GenericCrudPage, { type FieldDef } from '../GenericCrudPage'
import { wizardFormFieldsApi } from '../../services/admin-api'
import type { Column } from '../../components/ui/DataTable'

const columns: Column<any>[] = [
  { key: 'id', title: 'ID', sortable: true },
  { key: 'field_name', title: 'Field Name', sortable: true },
  { key: 'field_type', title: 'Field Type', sortable: true },
  { key: 'label', title: 'Label', sortable: true },
  { key: 'placeholder', title: 'Placeholder', render: (item) => <span className="text-brand-text-muted">{item.placeholder || '--'}</span> },
  { key: 'is_required', title: 'Required', render: (item) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.is_required ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'}`}>
      {item.is_required ? 'Yes' : 'No'}
    </span>
  )},
  { key: 'display_order', title: 'Order', sortable: true },
]

const fields: FieldDef[] = [
  { key: 'field_name', label: 'Field Name', type: 'text', required: true },
  { key: 'field_type', label: 'Field Type', type: 'text', required: true },
  { key: 'label', label: 'Label', type: 'text', required: true },
  { key: 'placeholder', label: 'Placeholder', type: 'text' },
  { key: 'display_order', label: 'Display Order', type: 'number' },
  { key: 'is_required', label: 'Required', type: 'checkbox' },
]

export default function WizardFormFieldsPage() {
  return <GenericCrudPage title="Wizard Form Fields" api={wizardFormFieldsApi} columns={columns} fields={fields} />
}
