import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { Pencil, Trash2, Eye } from 'lucide-react'
import { stickerPacksApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'
import type { StickerPack } from '../../types'

interface FormState {
  cover_image_url: string | null
  icon_url: string | null
  name: string
  slug: string
  description: string
  category: string
  tabs: string
  sort_order: number
  is_premium: boolean
  is_active: boolean
}

const emptyForm: FormState = { cover_image_url: null, icon_url: null, name: '', slug: '', description: '', category: 'general', tabs: 'all_industry', sort_order: 0, is_premium: false, is_active: true }

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function StickerPackListPage() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const { data, loading, create, update, remove } = useAdminCrud<StickerPack>(stickerPacksApi)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<StickerPack | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<StickerPack | null>(null)

  const openAdd = () => {
    setEditingItem(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (item: StickerPack) => {
    setEditingItem(item)
    setForm({ cover_image_url: item.cover_image_url, icon_url: item.icon_url ?? null, name: item.name, slug: item.slug, description: item.description ?? '', category: item.category, tabs: item.tabs ?? 'all_industry', sort_order: item.sort_order ?? 0, is_premium: item.is_premium, is_active: item.is_active })
    setModalOpen(true)
  }

  const openDelete = (item: StickerPack) => setDeleteItem(item)

  const handleSubmit = async () => {
    if (!form.name.trim()) { addToast('Name is required', 'error'); return }
    try {
      if (editingItem) {
        await update(editingItem.id, form)
        addToast('Pack updated successfully')
      } else {
        await create(form)
        addToast('Pack created successfully')
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
      addToast('Pack deleted successfully')
      setDeleteItem(null)
    } catch {
      addToast('Delete failed. Please try again.', 'error')
    }
  }

  const columns: Column<StickerPack>[] = [
    { key: 'name', title: 'Pack Name', sortable: true },
    { key: 'category', title: 'Category', sortable: true },
    { key: 'sticker_count', title: 'Stickers', sortable: true },
    { key: 'is_premium', title: 'Premium', render: (p) => p.is_premium ? <span className="text-brand-gold">Premium</span> : <span className="text-brand-text-muted">Free</span> },
    { key: 'download_count', title: 'Downloads', sortable: true },
    { key: 'is_active', title: 'Status', render: (p) => p.is_active ? <span className="text-status-success">Active</span> : <span className="text-status-error">Inactive</span> },
    { key: 'actions', title: 'Actions', render: (item) => (
      <div className="flex items-center gap-2">
        <button onClick={(e) => { e.stopPropagation(); navigate(`/stickers/${item.id}/stickers`) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-blue transition-colors" title="View Stickers"><Eye className="h-4 w-4" /></button>
        <button onClick={(e) => { e.stopPropagation(); openEdit(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-gold transition-colors"><Pencil className="h-4 w-4" /></button>
        <button onClick={(e) => { e.stopPropagation(); openDelete(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-status-error transition-colors"><Trash2 className="h-4 w-4" /></button>
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-text">Sticker Packs</h1>
        <button onClick={openAdd} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">+ Add Pack</button>
      </div>
      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading ? <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div> : <DataTable columns={columns} data={data} />}
      </div>

      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} title={editingItem ? 'Edit Pack' : 'Add Pack'}>
        <div className="space-y-4">
          <ImageUpload label="Cover Image" value={form.cover_image_url} onChange={v => setForm(f => ({ ...f, cover_image_url: v }))} aspectHint="Square, 300x300" />
          <ImageUpload label="Icon (circular)" value={form.icon_url} onChange={v => setForm(f => ({ ...f, icon_url: v }))} aspectHint="Circle, 120x120" />
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: toSlug(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Slug</label>
            <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Category</label>
            <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. education, ramadan, payment, general" className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Tab</label>
            <select value={form.tabs} onChange={e => setForm(f => ({ ...f, tabs: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
              <option value="branding">Branding</option>
              <option value="all_industry">All Industry</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Sort Order</label>
            <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_premium} onChange={e => setForm(f => ({ ...f, is_premium: e.target.checked }))} className="rounded" />
              <label className="text-sm text-brand-text-muted">Premium</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
              <label className="text-sm text-brand-text-muted">Active</label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">Save</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Pack" message={`Are you sure you want to delete "${deleteItem?.name}"? This action cannot be undone.`} confirmText="Delete" variant="danger" />
    </div>
  )
}
