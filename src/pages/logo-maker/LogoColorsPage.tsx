import GenericCrudPage, { type FieldDef } from '../GenericCrudPage'
import { logoColorsApi } from '../../services/admin-api'
import type { Column } from '../../components/ui/DataTable'

const columns: Column<any>[] = [
  { key: 'id', title: 'ID', sortable: true },
  { key: 'name', title: 'Name', sortable: true },
  { key: 'hex_code', title: 'Color', render: (item) => (
    <div className="flex items-center gap-2">
      <div className="h-5 w-5 rounded border border-brand-dark-border" style={{ backgroundColor: item.hex_code || '#ccc' }} />
      <span className="text-brand-text-muted font-mono text-xs">{item.hex_code || '--'}</span>
    </div>
  )},
  { key: 'display_order', title: 'Order', sortable: true },
  { key: 'is_active', title: 'Active', render: (item) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
      {item.is_active ? 'Active' : 'Inactive'}
    </span>
  )},
]

const fields: FieldDef[] = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'hex_code', label: 'Hex Code (e.g. #FF5733)', type: 'text', required: true },
  { key: 'display_order', label: 'Display Order', type: 'number' },
  { key: 'is_active', label: 'Active', type: 'checkbox' },
]

export default function LogoColorsPage() {
  return <GenericCrudPage title="Logo Colors" api={logoColorsApi} columns={columns} fields={fields} />
}
