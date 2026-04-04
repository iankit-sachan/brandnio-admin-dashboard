import GenericCrudPage, { type FieldDef } from '../GenericCrudPage'
import { languageOptionsApi } from '../../services/admin-api'
import type { Column } from '../../components/ui/DataTable'

const columns: Column<any>[] = [
  { key: 'id', title: 'ID', sortable: true },
  { key: 'name', title: 'Name', sortable: true },
  { key: 'code', title: 'Code', sortable: true, render: (item) => (
    <span className="px-2 py-0.5 bg-brand-dark-deep rounded font-mono text-xs">{item.code || '--'}</span>
  )},
  { key: 'native_name', title: 'Native Name', render: (item) => <span>{item.native_name || '--'}</span> },
  { key: 'display_order', title: 'Order', sortable: true },
  { key: 'is_active', title: 'Active', render: (item) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
      {item.is_active ? 'Active' : 'Inactive'}
    </span>
  )},
]

const fields: FieldDef[] = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'code', label: 'Language Code (e.g. en, hi)', type: 'text', required: true },
  { key: 'native_name', label: 'Native Name', type: 'text' },
  { key: 'display_order', label: 'Display Order', type: 'number' },
  { key: 'is_active', label: 'Active', type: 'checkbox' },
]

export default function LanguageOptionsPage() {
  return <GenericCrudPage title="Language Options" api={languageOptionsApi} columns={columns} fields={fields} />
}
