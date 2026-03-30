import { useState } from 'react'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { Pencil, Trash2 } from 'lucide-react'
import { feedBannersApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'
import type { FeedBanner } from '../../types'

interface FormState {
  image_url: string | null
  title: string
  subtitle: string
  cta_text: string
  cta_url: string
  gradient_start: string
  gradient_end: string
  sort_order: number
  is_active: boolean
}

const emptyForm: FormState = {
  image_url: null,
  title: '',
  subtitle: '',
  cta_text: '',
  cta_url: '',
  gradient_start: '#000000',
  gradient_end: '#000000',
  sort_order: 0,
  is_active: true,
}

export default function FeedBannerListPage() {
  const { addToast } = useToast()
  const { data, loading, create, update, remove } = useAdminCrud<FeedBanner>(feedBannersApi)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<FeedBanner | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<FeedBanner | null>(null)

  const openAdd = () => {
    setEditingItem(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (item: FeedBanner) => {
    setEditingItem(item)
    setForm({
      image_url: item.image_url,
      title: item.title,
      subtitle: item.subtitle,
      cta_text: item.cta_text,
      cta_url: item.cta_url,
      gradient_start: item.gradient_start || '#000000',
      gradient_end: item.gradient_end || '#000000',
      sort_order: item.sort_order,
      is_active: item.is_active,
    })
    setModalOpen(true)
  }

  const openDelete = (item: FeedBanner) => setDeleteItem(item)

  const handleSubmit = async () => {
    if (!form.title.trim()) { addToast('Title is required', 'error'); return }
    try {
      if (editingItem) {
        await update(editingItem.id, form)
        addToast('Banner updated successfully')
      } else {
        await create(form)
        addToast('Banner created successfully')
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
      addToast('Banner deleted successfully')
      setDeleteItem(null)
    } catch {
      addToast('Delete failed. Please try again.', 'error')
    }
  }

  const columns: Column<FeedBanner>[] = [
    { key: 'title', title: 'Title', sortable: true },
    { key: 'cta_text', title: 'CTA Text' },
    { key: 'gradient_start', title: 'Gradient Start', render: (item) => (
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded border border-brand-dark-border" style={{ backgroundColor: item.gradient_start }} />
        <span className="text-xs text-brand-text-muted">{item.gradient_start}</span>
      </div>
    )},
    { key: 'sort_order', title: 'Order', sortable: true },
    { key: 'is_active', title: 'Status', render: (item) => item.is_active ? <span className="text-status-success">Active</span> : <span className="text-status-error">Inactive</span> },
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
        <h1 className="text-2xl font-bold text-brand-text">Feed Banners</h1>
        <button onClick={openAdd} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">+ Add Banner</button>
      </div>

      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading ? <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div> : <DataTable columns={columns} data={data} />}
      </div>

      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} title={editingItem ? 'Edit Banner' : 'Add Banner'}>
        <div className="space-y-4">
          <ImageUpload label="Banner Image" value={form.image_url} onChange={v => setForm(f => ({ ...f, image_url: v }))} aspectHint="Banner image" />
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Subtitle</label>
            <input value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">CTA Text</label>
              <input value={form.cta_text} onChange={e => setForm(f => ({ ...f, cta_text: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">CTA URL</label>
              <input value={form.cta_url} onChange={e => setForm(f => ({ ...f, cta_url: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Gradient Start</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.gradient_start} onChange={e => setForm(f => ({ ...f, gradient_start: e.target.value }))} className="w-10 h-10 rounded border border-brand-dark-border cursor-pointer bg-transparent" />
                <input value={form.gradient_start} onChange={e => setForm(f => ({ ...f, gradient_start: e.target.value }))} className="flex-1 bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Gradient End</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.gradient_end} onChange={e => setForm(f => ({ ...f, gradient_end: e.target.value }))} className="w-10 h-10 rounded border border-brand-dark-border cursor-pointer bg-transparent" />
                <input value={form.gradient_end} onChange={e => setForm(f => ({ ...f, gradient_end: e.target.value }))} className="flex-1 bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Sort Order</label>
              <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
            </div>
            <div className="flex items-end pb-1">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
                <label className="text-sm text-brand-text-muted">Active</label>
              </div>
            </div>
          </div>
          {/* Gradient Preview */}
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Gradient Preview</label>
            <div className="h-10 rounded-lg" style={{ background: `linear-gradient(to right, ${form.gradient_start}, ${form.gradient_end})` }} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">Save</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Banner" message={`Are you sure you want to delete "${deleteItem?.title}"? This action cannot be undone.`} confirmText="Delete" variant="danger" />
    </div>
  )
}
