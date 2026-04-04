import GenericCrudPage, { type FieldDef } from '../GenericCrudPage'
import { collageLayoutsApi } from '../../services/admin-api'
import type { Column } from '../../components/ui/DataTable'

const columns: Column<any>[] = [
  { key: 'id', title: 'ID', sortable: true },
  { key: 'name', title: 'Name', sortable: true },
  { key: 'grid_count', title: 'Grid Count', sortable: true, render: (item) => <span>{item.grid_count ?? item.photo_count ?? '--'}</span> },
  { key: 'thumbnail_url', title: 'Preview', render: (item) => item.thumbnail_url ? (
    <img src={item.thumbnail_url} alt={item.name} className="h-8 w-12 rounded object-cover" />
  ) : <span className="text-brand-text-muted">--</span> },
  { key: 'display_order', title: 'Order', sortable: true },
  { key: 'is_active', title: 'Active', render: (item) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
      {item.is_active ? 'Active' : 'Inactive'}
    </span>
  )},
]

const fields: FieldDef[] = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'grid_count', label: 'Grid / Photo Count', type: 'number' },
  { key: 'thumbnail_url', label: 'Thumbnail URL', type: 'url' },
  { key: 'layout_data', label: 'Layout Data (JSON)', type: 'textarea' },
  { key: 'display_order', label: 'Display Order', type: 'number' },
  { key: 'is_active', label: 'Active', type: 'checkbox' },
]

export default function CollageLayoutsPage() {
  return <GenericCrudPage title="Collage Layouts" api={collageLayoutsApi} columns={columns} fields={fields} />
}
