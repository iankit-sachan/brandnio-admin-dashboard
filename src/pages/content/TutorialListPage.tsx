import { useState } from 'react'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { Pencil, Trash2 } from 'lucide-react'
import { mockTutorials } from '../../services/mock-data'
import type { Tutorial } from '../../types'

interface FormState {
  thumbnail_url: string | null
  title: string
  slug: string
  description: string
  sort_order: number
  is_active: boolean
}

const emptyForm: FormState = { thumbnail_url: null, title: '', slug: '', description: '', sort_order: 0, is_active: true }

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function TutorialListPage() {
  const { addToast } = useToast()
  const [data, setData] = useState<Tutorial[]>([...mockTutorials])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Tutorial | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<Tutorial | null>(null)

  const openAdd = () => {
    setEditingItem(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (item: Tutorial) => {
    setEditingItem(item)
    setForm({ thumbnail_url: item.thumbnail_url, title: item.title, slug: item.slug, description: item.description, sort_order: item.sort_order, is_active: item.is_active })
    setModalOpen(true)
  }

  const openDelete = (item: Tutorial) => setDeleteItem(item)

  const handleSubmit = () => {
    if (!form.title.trim()) { addToast('Title is required', 'error'); return }
    if (editingItem) {
      setData(prev => prev.map(d => d.id === editingItem.id ? { ...d, thumbnail_url: form.thumbnail_url, title: form.title, slug: form.slug, description: form.description, sort_order: form.sort_order, is_active: form.is_active } : d))
      addToast('Tutorial updated successfully')
    } else {
      const newItem: Tutorial = { id: Date.now(), title: form.title, slug: form.slug, description: form.description, content: '', thumbnail_url: form.thumbnail_url, video_url: null, sort_order: form.sort_order, is_active: form.is_active, created_at: new Date().toISOString() }
      setData(prev => [...prev, newItem])
      addToast('Tutorial created successfully')
    }
    setModalOpen(false)
  }

  const handleDelete = () => {
    if (!deleteItem) return
    setData(prev => prev.filter(d => d.id !== deleteItem.id))
    addToast('Tutorial deleted successfully')
    setDeleteItem(null)
  }

  const columns: Column<Tutorial>[] = [
    { key: 'title', title: 'Title', sortable: true },
    { key: 'slug', title: 'Slug' },
    { key: 'sort_order', title: 'Order', sortable: true },
    { key: 'is_active', title: 'Status', render: (t) => t.is_active ? <span className="text-status-success">Active</span> : <span className="text-status-error">Inactive</span> },
    { key: 'created_at', title: 'Created' },
    { key: 'actions', title: 'Actions', render: (item) => (
      <div className="flex items-center gap-2">
        <button onClick={(e) => { e.stopPropagation(); openEdit(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-gold transition-colors"><Pencil className="h-4 w-4" /></button>
        <button onClick={(e) => { e.stopPropagation(); openDelete(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-status-error transition-colors"><Trash2 className="h-4 w-4" /></button>
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-text">Tutorials</h1>
        <button onClick={openAdd} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">+ Add Tutorial</button>
      </div>
      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        <DataTable columns={columns} data={data} />
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingItem ? 'Edit Tutorial' : 'Add Tutorial'}>
        <div className="space-y-4">
          <ImageUpload label="Thumbnail" value={form.thumbnail_url} onChange={v => setForm(f => ({ ...f, thumbnail_url: v }))} aspectHint="16:9, 640x360 recommended" />
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value, slug: toSlug(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Slug</label>
            <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Description</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
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
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">Save</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Tutorial" message={`Are you sure you want to delete "${deleteItem?.title}"? This action cannot be undone.`} confirmText="Delete" variant="danger" />
    </div>
  )
}
