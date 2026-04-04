import GenericCrudPage, { type FieldDef } from '../GenericCrudPage'
import { collageAspectRatiosApi } from '../../services/admin-api'
import type { Column } from '../../components/ui/DataTable'

const columns: Column<any>[] = [
  { key: 'id', title: 'ID', sortable: true },
  { key: 'name', title: 'Name', sortable: true },
  { key: 'width', title: 'Width', sortable: true },
  { key: 'height', title: 'Height', sortable: true },
  { key: 'label', title: 'Label', render: (item) => <span className="text-brand-text-muted">{item.label || '--'}</span> },
  { key: 'display_order', title: 'Order', sortable: true },
  { key: 'is_active', title: 'Active', render: (item) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
      {item.is_active ? 'Active' : 'Inactive'}
    </span>
  )},
]

const fields: FieldDef[] = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'width', label: 'Width', type: 'number', required: true },
  { key: 'height', label: 'Height', type: 'number', required: true },
  { key: 'label', label: 'Label', type: 'text' },
  { key: 'display_order', label: 'Display Order', type: 'number' },
  { key: 'is_active', label: 'Active', type: 'checkbox' },
]

export default function CollageAspectRatiosPage() {
  return <GenericCrudPage title="Collage Aspect Ratios" api={collageAspectRatiosApi} columns={columns} fields={fields} />
}
