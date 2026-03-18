import { useState, useEffect } from 'react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { Pencil, Trash2 } from 'lucide-react'
import { vbizCardHomeSectionsApi, vbizCardCategoriesApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'
import type { VbizCardHomeSection, VbizCardCategory } from '../../types'

const DISPLAY_BADGE: Record<string, string> = {
  small: 'bg-blue-500/20 text-blue-400',
  large: 'bg-purple-500/20 text-purple-400',
}

interface FormState {
  title: string
  category_slug: string
  display_type: 'small' | 'large'
  sort_order: number
  is_active: boolean
}

const emptyForm: FormState = {
  title: '', category_slug: '', display_type: 'small', sort_order: 0, is_active: true,
}

export default function VbizCardHomeSectionPage() {
  const { addToast } = useToast()
  const { data, loading, create, update, remove } = useAdminCrud<VbizCardHomeSection>(vbizCardHomeSectionsApi)
  const [categories, setCategories] = useState<VbizCardCategory[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<VbizCardHomeSection | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<VbizCardHomeSection | null>(null)

  useEffect(() => {
    vbizCardCategoriesApi.list().then((res: { data: VbizCardCategory[] }) => setCategories(res.data)).catch(() => {})
  }, [])

  const sectionCategories = categories.filter(c => c.category_type === 'section')

  const openAdd = () => { setEditingItem(null); setForm(emptyForm); setModalOpen(true) }

  const openEdit = (item: VbizCardHomeSection) => {
    setEditingItem(item)
    setForm({
      title: item.title, category_slug: item.category_slug,
      display_type: item.display_type, sort_order: item.sort_order, is_active: item.is_active,
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) { addToast('Title is required', 'error'); return }
    if (!form.category_slug.trim()) { addToast('Category slug is required', 'error'); return }
    try {
      if (editingItem) {
        await update(editingItem.id, form)
        addToast('Home section updated successfully')
      } else {
        await create(form)
        addToast('Home section created successfully')
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
      addToast('Home section deleted successfully')
      setDeleteItem(null)
    } catch {
      addToast('Delete failed. Please try again.', 'error')
    }
  }

  const columns: Column<VbizCardHomeSection>[] = [
    { key: 'title', title: 'Title', sortable: true, render: (item) => <span className="font-medium text-brand-text">{item.title}</span> },
    { key: 'category_slug', title: 'Category Slug' },
    {
      key: 'display_type', title: 'Display',
      render: (item) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DISPLAY_BADGE[item.display_type] ?? ''}`}>
          {item.display_type}
        </span>
      ),
    },
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
        <h1 className="text-2xl font-bold text-brand-text">VC Home Sections</h1>
        <button onClick={openAdd} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">+ Add Section</button>
      </div>

      <p className="text-sm text-brand-text-muted">
        Control which card sections appear on the VbizCard home screen. Adjust order, display type (small/large cards), and visibility.
      </p>

      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading
          ? <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading…</div>
          : <DataTable columns={columns} data={data} />
        }
      </div>

      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false) }} title={editingItem ? 'Edit Home Section' : 'Add Home Section'} size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Education & Coaching Cards" className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Category Slug</label>
            {sectionCategories.length > 0 ? (
              <select value={form.category_slug} onChange={e => setForm(f => ({ ...f, category_slug: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
                <option value="">Select a category…</option>
                {sectionCategories.map(c => <option key={c.slug} value={c.slug}>{c.name} ({c.slug})</option>)}
              </select>
            ) : (
              <input value={form.category_slug} onChange={e => setForm(f => ({ ...f, category_slug: e.target.value }))} placeholder="e.g. vcsec-education-coaching" className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
            )}
            <p className="text-xs text-brand-text-muted mt-1">Must match an existing VbizCard Category slug</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Display Type</label>
            <select value={form.display_type} onChange={e => setForm(f => ({ ...f, display_type: e.target.value as 'small' | 'large' }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
              <option value="small">Small Cards (compact thumbnails)</option>
              <option value="large">Large Cards (full business card preview)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Sort Order</label>
            <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
            <p className="text-xs text-brand-text-muted mt-1">Lower numbers appear first on the home screen</p>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
            <label className="text-sm text-brand-text-muted">Active (visible on app)</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false) }} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">Save</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Home Section" message={`Delete "${deleteItem?.title}"? This only removes the section from the home screen — the category and its templates will remain.`} confirmText="Delete" variant="danger" />
    </div>
  )
}
