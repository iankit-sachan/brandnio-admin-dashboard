import { useState } from 'react'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { Flag, Pencil, Trash2, Plus, Search } from 'lucide-react'
import { politicianCategoriesApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'

interface PoliticianCategory {
  id: number
  name: string
  slug: string
  icon_url: string | null
  is_active: boolean
}

interface FormState {
  icon_url: string | null
  name: string
  slug: string
  is_active: boolean
}

const emptyForm: FormState = { icon_url: null, name: '', slug: '', is_active: true }

function toSlug(name: string) {
  return name.toLowerCase().replace(/ & /g, '-').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function PoliticianCategoryPage() {
  const { addToast } = useToast()
  const { data, loading, create, update, remove } = useAdminCrud<PoliticianCategory>(politicianCategoriesApi)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<PoliticianCategory | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<PoliticianCategory | null>(null)
  const [search, setSearch] = useState('')

  const filtered = data.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  const openAdd = () => {
    setEditingItem(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (item: PoliticianCategory) => {
    setEditingItem(item)
    setForm({ icon_url: item.icon_url, name: item.name, slug: item.slug, is_active: item.is_active })
    setModalOpen(true)
  }

  const openDelete = (item: PoliticianCategory) => setDeleteItem(item)

  const handleSubmit = async () => {
    if (!form.name.trim()) { addToast('Name is required', 'error'); return }
    if (data.some(d => d.slug === form.slug && d.id !== editingItem?.id)) { addToast('A party with this slug already exists', 'error'); return }
    try {
      if (editingItem) {
        await update(editingItem.id, form)
        addToast('Party updated successfully')
      } else {
        await create(form)
        addToast('Party created successfully')
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
      addToast('Party deleted successfully')
      setDeleteItem(null)
    } catch {
      addToast('Delete failed. Please try again.', 'error')
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-text">Political Parties</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search parties..." className="pl-10 pr-4 py-2 bg-brand-dark border border-brand-dark-border rounded-lg text-sm text-brand-text focus:outline-none focus:border-brand-gold/50 w-64" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filtered.map(cat => (
          <div key={cat.id} className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 p-4 text-center group relative">
            <div className="w-16 h-16 mx-auto rounded-xl bg-neutral-900 overflow-hidden mb-3 flex items-center justify-center">
              {cat.icon_url ? <img src={cat.icon_url} className="w-full h-full object-contain p-1" /> : <Flag className="w-8 h-8 text-brand-text-muted" />}
            </div>
            <h3 className="text-sm font-medium text-brand-text">{cat.name}</h3>
            <p className="text-xs text-brand-text-muted mt-0.5">{cat.slug}</p>
            {!cat.is_active && <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-status-error/20 text-status-error">Inactive</span>}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
              <button onClick={() => openEdit(cat)} className="p-1 bg-brand-dark-hover rounded text-brand-gold"><Pencil className="h-3 w-3" /></button>
              <button onClick={() => openDelete(cat)} className="p-1 bg-brand-dark-hover rounded text-status-error"><Trash2 className="h-3 w-3" /></button>
            </div>
          </div>
        ))}
      </div>

      <button onClick={openAdd} className="fixed bottom-8 right-8 w-14 h-14 bg-brand-gold text-gray-900 rounded-full shadow-lg hover:bg-brand-gold-dark transition-colors flex items-center justify-center z-40">
        <Plus className="h-6 w-6" />
      </button>

      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} title={editingItem ? 'Edit Party' : 'Add Party'}>
        <div className="space-y-4">
          <ImageUpload label="Party Logo" value={form.icon_url} onChange={v => setForm(f => ({ ...f, icon_url: v }))} aspectHint="Square logo, 128x128 recommended" />
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: toSlug(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Slug</label>
            <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
            <label className="text-sm text-brand-text-muted">Active</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">Save</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Party" message={`Are you sure you want to delete "${deleteItem?.name}"? This action cannot be undone.`} confirmText="Delete" variant="danger" />
    </div>
  )
}
