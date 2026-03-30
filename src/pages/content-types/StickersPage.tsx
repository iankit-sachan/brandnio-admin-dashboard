import { useState, useMemo } from 'react'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { Smile, Pencil, Trash2, Plus, Search, Crown } from 'lucide-react'
import { stickerPacksApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'

interface StickerPack {
  id: number
  name: string
  cover_image_url: string | null
  category: string
  sticker_count: number
  is_premium: boolean
}

interface FormState {
  cover_image_url: string | null
  name: string
  category: string
  is_premium: boolean
}

const emptyForm: FormState = { cover_image_url: null, name: '', category: 'Emoji', is_premium: false }

export default function StickersPage() {
  const { addToast } = useToast()
  const { data, loading, create, update, remove } = useAdminCrud<StickerPack>(stickerPacksApi)

  const stickerCategories = useMemo(() => {
    const cats = data?.map((p: any) => p.category).filter(Boolean) ?? []
    return [...new Set(cats)] as string[]
  }, [data])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<StickerPack | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<StickerPack | null>(null)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')

  const filtered = data.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    if (filterCategory && p.category !== filterCategory) return false
    return true
  })

  const openAdd = () => {
    setEditingItem(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (item: StickerPack) => {
    setEditingItem(item)
    setForm({ cover_image_url: item.cover_image_url, name: item.name, category: item.category, is_premium: item.is_premium })
    setModalOpen(true)
  }

  const openDelete = (item: StickerPack) => setDeleteItem(item)

  const handleSubmit = async () => {
    if (!form.name.trim()) { addToast('Name is required', 'error'); return }
    try {
      if (editingItem) {
        await update(editingItem.id, form)
        addToast('Sticker pack updated successfully')
      } else {
        await create(form)
        addToast('Sticker pack created successfully')
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
      addToast('Sticker pack deleted successfully')
      setDeleteItem(null)
    } catch {
      addToast('Delete failed. Please try again.', 'error')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-text">Sticker Packs</h1>
        <div className="flex items-center gap-3">
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
            <option value="">All Categories</option>
            {stickerCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-text-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search stickers..." className="pl-10 pr-4 py-2 bg-brand-dark border border-brand-dark-border rounded-lg text-sm text-brand-text focus:outline-none focus:border-brand-gold/50 w-56" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map(item => (
            <div key={item.id} className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 p-3 text-center group relative">
              <div className="w-20 h-20 mx-auto rounded-xl bg-neutral-900 overflow-hidden mb-2 flex items-center justify-center">
                {item.cover_image_url ? <img src={item.cover_image_url} className="w-full h-full object-contain p-1" /> : <Smile className="w-10 h-10 text-brand-text-muted" />}
              </div>
              <div className="flex items-center justify-center gap-1">
                <h3 className="text-xs font-medium text-brand-text truncate">{item.name}</h3>
                {item.is_premium && <Crown className="h-3 w-3 text-brand-gold shrink-0" />}
              </div>
              <p className="text-[10px] text-brand-text-muted mt-0.5">{item.category} &middot; {item.sticker_count} stickers</p>
              <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                <button onClick={() => openEdit(item)} className="p-1 bg-brand-dark-hover rounded text-brand-gold"><Pencil className="h-3 w-3" /></button>
                <button onClick={() => openDelete(item)} className="p-1 bg-brand-dark-hover rounded text-status-error"><Trash2 className="h-3 w-3" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button onClick={openAdd} className="fixed bottom-8 right-8 w-14 h-14 bg-brand-gold text-gray-900 rounded-full shadow-lg hover:bg-brand-gold-dark transition-colors flex items-center justify-center z-40">
        <Plus className="h-6 w-6" />
      </button>

      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} title={editingItem ? 'Edit Sticker Pack' : 'Add Sticker Pack'}>
        <div className="space-y-4">
          <ImageUpload label="Cover Image" value={form.cover_image_url} onChange={v => setForm(f => ({ ...f, cover_image_url: v }))} aspectHint="Square, 200x200 recommended" />
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Category</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
              {stickerCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_premium} onChange={e => setForm(f => ({ ...f, is_premium: e.target.checked }))} className="rounded" />
            <label className="text-sm text-brand-text-muted">Premium</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">Save</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Sticker Pack" message={`Are you sure you want to delete "${deleteItem?.name}"? This action cannot be undone.`} confirmText="Delete" variant="danger" />
    </div>
  )
}
