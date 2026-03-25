import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { Pencil, Trash2, ArrowLeft } from 'lucide-react'
import { stickersApi } from '../../services/admin-api'
import api from '../../services/api'

interface Sticker {
  id: number
  pack: number
  image_url: string
  thumbnail_url: string
  emoji: string
  sort_order: number
  is_active: boolean
  is_premium: boolean
  language: string
  usage_count: number
}

interface FormState {
  image_url: string | null
  thumbnail_url: string | null
  emoji: string
  sort_order: number
  is_active: boolean
  is_premium: boolean
  language: string
}

const emptyForm: FormState = { image_url: null, thumbnail_url: null, emoji: '', sort_order: 0, is_active: true, is_premium: false, language: 'en' }

export default function StickerDetailPage() {
  const { packId } = useParams()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [stickers, setStickers] = useState<Sticker[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Sticker | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<Sticker | null>(null)

  const fetchStickers = () => {
    setLoading(true)
    api.get(`/api/admin/stickers/?pack=${packId}`).then(res => {
      const items = Array.isArray(res.data) ? res.data : res.data.results || []
      setStickers(items)
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchStickers()
  }, [packId])

  const openAdd = () => {
    setEditingItem(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (item: Sticker) => {
    setEditingItem(item)
    setForm({ image_url: item.image_url, thumbnail_url: item.thumbnail_url, emoji: item.emoji, sort_order: item.sort_order, is_active: item.is_active, is_premium: item.is_premium, language: item.language })
    setModalOpen(true)
  }

  const openDelete = (item: Sticker) => setDeleteItem(item)

  const handleSubmit = async () => {
    if (!form.emoji.trim()) { addToast('Emoji is required', 'error'); return }
    try {
      if (editingItem) {
        await stickersApi.update(editingItem.id, form)
        addToast('Sticker updated successfully')
      } else {
        await stickersApi.create({ ...form, pack: Number(packId) })
        addToast('Sticker created successfully')
      }
      setForm(emptyForm); setEditingItem(null); setModalOpen(false)
      fetchStickers()
    } catch {
      addToast('Operation failed. Please try again.', 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    try {
      await stickersApi.delete(deleteItem.id)
      addToast('Sticker deleted successfully')
      setDeleteItem(null)
      fetchStickers()
    } catch {
      addToast('Delete failed. Please try again.', 'error')
    }
  }

  const columns: Column<Sticker>[] = [
    { key: 'thumbnail_url', title: 'Thumbnail', render: (item) => item.thumbnail_url ? <img src={item.thumbnail_url} alt="" className="h-10 w-10 rounded object-cover" /> : <div className="h-10 w-10 rounded bg-brand-dark-border" /> },
    { key: 'emoji', title: 'Emoji', sortable: true },
    { key: 'language', title: 'Language', sortable: true },
    { key: 'is_premium', title: 'Premium', render: (item) => item.is_premium ? <span className="text-brand-gold">Premium</span> : <span className="text-brand-text-muted">Free</span> },
    { key: 'is_active', title: 'Status', render: (item) => item.is_active ? <span className="text-status-success">Active</span> : <span className="text-status-error">Inactive</span> },
    { key: 'usage_count', title: 'Usage', sortable: true },
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
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/stickers')} className="p-2 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-text transition-colors"><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-2xl font-bold text-brand-text">Stickers in Pack #{packId}</h1>
        </div>
        <button onClick={openAdd} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">+ Add Sticker</button>
      </div>
      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading ? <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div> : <DataTable columns={columns} data={stickers} />}
      </div>

      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} title={editingItem ? 'Edit Sticker' : 'Add Sticker'}>
        <div className="space-y-4">
          <ImageUpload label="Sticker Image" value={form.image_url} onChange={v => setForm(f => ({ ...f, image_url: v }))} aspectHint="Square, 512x512" />
          <ImageUpload label="Thumbnail" value={form.thumbnail_url} onChange={v => setForm(f => ({ ...f, thumbnail_url: v }))} aspectHint="Square, 128x128" />
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Emoji</label>
            <input value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Language</label>
            <select value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="mr">Marathi</option>
              <option value="multi">Multi</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Sort Order</label>
            <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
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

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Sticker" message={`Are you sure you want to delete this sticker (${deleteItem?.emoji})? This action cannot be undone.`} confirmText="Delete" variant="danger" />
    </div>
  )
}
