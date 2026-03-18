import { useState } from 'react'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { Pencil, Trash2 } from 'lucide-react'
import { vbizCardCategoriesApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'
import type { VbizCardCategory } from '../../types'

const CATEGORY_TYPES = [
  { value: 'section', label: 'Section (Trending, Professional, etc.)' },
  { value: 'industry', label: 'Industry (Education, Restaurant, etc.)' },
  { value: 'party', label: 'Party (BJP, INC, etc.)' },
  { value: 'card_type', label: 'Card Type (Single Page, Multi Page, etc.)' },
]

const TYPE_BADGE: Record<string, string> = {
  section:   'bg-blue-500/20 text-blue-400',
  industry:  'bg-green-500/20 text-green-400',
  party:     'bg-orange-500/20 text-orange-400',
  card_type: 'bg-purple-500/20 text-purple-400',
}

interface FormState {
  name: string
  slug: string
  category_type: string
  icon_url: string | null
  description: string
  sort_order: number
  is_active: boolean
}

const emptyForm: FormState = {
  name: '', slug: '', category_type: 'section',
  icon_url: null, description: '', sort_order: 0, is_active: true,
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function VbizCardCategoryPage() {
  const { addToast } = useToast()
  const { data, loading, create, update, remove } = useAdminCrud<VbizCardCategory>(vbizCardCategoriesApi)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<VbizCardCategory | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<VbizCardCategory | null>(null)
  const [filterType, setFilterType] = useState<string>('all')

  const filteredData = filterType === 'all' ? data : data.filter(d => d.category_type === filterType)

  const openAdd = () => { setEditingItem(null); setForm(emptyForm); setModalOpen(true) }

  const openEdit = (item: VbizCardCategory) => {
    setEditingItem(item)
    setForm({
      name: item.name, slug: item.slug, category_type: item.category_type,
      icon_url: item.icon_url, description: item.description,
      sort_order: item.sort_order, is_active: item.is_active,
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) { addToast('Name is required', 'error'); return }
    try {
      if (editingItem) {
        await update(editingItem.id, form)
        addToast('Category updated successfully')
      } else {
        await create(form)
        addToast('Category created successfully')
      }
      setForm(emptyForm); setEditingItem(null); setModalOpen(false)
    } catch {
      addToast('Operation failed. Please try again.', 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    try {
      await remove(deleteItem.id)
      addToast('Category deleted successfully')
      setDeleteItem(null)
    } catch {
      addToast('Delete failed. Please try again.', 'error')
    }
  }

  const columns: Column<VbizCardCategory>[] = [
    {
      key: 'name', title: 'Category', sortable: true,
      render: (item) => (
        <div className="flex items-center gap-3">
          {item.icon_url && <img src={item.icon_url} alt="" className="w-8 h-8 rounded-full object-cover" />}
          <span className="font-medium text-brand-text">{item.name}</span>
        </div>
      ),
    },
    {
      key: 'category_type', title: 'Type',
      render: (item) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[item.category_type] ?? ''}`}>
          {item.category_type}
        </span>
      ),
    },
    { key: 'slug', title: 'Slug' },
    { key: 'template_count', title: 'Templates', sortable: true },
    { key: 'sort_order', title: 'Order', sortable: true },
    {
      key: 'is_active', title: 'Status',
      render: (item) => item.is_active
        ? <span className="text-status-success">Active</span>
        : <span className="text-status-error">Inactive</span>,
    },
    {
      key: 'actions', title: 'Actions',
      render: (item) => (
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); openEdit(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-gold transition-colors"><Pencil className="h-4 w-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteItem(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-status-error transition-colors"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-text">VbizCard Categories</h1>
        <button onClick={openAdd} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">+ Add Category</button>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {[{ value: 'all', label: 'All' }, ...CATEGORY_TYPES.map(t => ({ value: t.value, label: t.value.charAt(0).toUpperCase() + t.value.slice(1) }))].map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilterType(opt.value)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filterType === opt.value ? 'bg-brand-gold text-gray-900' : 'bg-brand-dark-card border border-brand-dark-border text-brand-text-muted hover:text-brand-text'}`}
          >{opt.label}</button>
        ))}
        <span className="ml-auto text-sm text-brand-text-muted self-center">{filteredData.length} categories</span>
      </div>

      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading
          ? <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading…</div>
          : <DataTable columns={columns} data={filteredData} />
        }
      </div>

      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false) }} title={editingItem ? 'Edit Category' : 'Add Category'} size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Category Type</label>
            <select value={form.category_type} onChange={e => setForm(f => ({ ...f, category_type: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
              {CATEGORY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: toSlug(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Slug</label>
            <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <ImageUpload label="Icon / Image" value={form.icon_url} onChange={v => setForm(f => ({ ...f, icon_url: v }))} aspectHint="Square, 200x200" />
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Sort Order</label>
            <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
            <label className="text-sm text-brand-text-muted">Active</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false) }} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">Save</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Category" message={`Delete "${deleteItem?.name}"? All templates in this category will also be deleted.`} confirmText="Delete" variant="danger" />
    </div>
  )
}
