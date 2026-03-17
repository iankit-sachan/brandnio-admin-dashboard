import { useState, useMemo } from 'react'
import { Pencil, Trash2, Plus, Maximize2, Image as ImageIcon } from 'lucide-react'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { postersApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'

interface FramePoster {
  id: number
  title: string
  image_url: string
  frame_category: string
  language: string
  is_premium: boolean
  status: 'active' | 'inactive'
  created_at: string
}

interface FormState {
  image_url: string | null
  title: string
  frame_category: string
  language: string
  is_premium: boolean
}

const frameCategories = ['Birthday', 'Wedding', 'Anniversary', 'Festival']

const emptyForm: FormState = { image_url: null, title: '', frame_category: 'Birthday', language: 'English', is_premium: false }

const inputClass = 'w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50'

export default function FramePosterPage() {
  const { addToast } = useToast()
  const { data, loading, create, update, remove } = useAdminCrud<FramePoster>(postersApi)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<FramePoster | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<FramePoster | null>(null)
  const [previewItem, setPreviewItem] = useState<FramePoster | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [languageFilter, setLanguageFilter] = useState('')

  const filteredData = useMemo(() => {
    return data.filter(p => {
      if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false
      if (categoryFilter && p.frame_category !== categoryFilter) return false
      if (languageFilter && p.language !== languageFilter) return false
      return true
    })
  }, [data, search, categoryFilter, languageFilter])

  const openAdd = () => { setEditingItem(null); setForm(emptyForm); setModalOpen(true) }
  const openEdit = (item: FramePoster) => {
    setEditingItem(item)
    setForm({ image_url: item.image_url, title: item.title, frame_category: item.frame_category, language: item.language, is_premium: item.is_premium })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) { addToast('Title is required', 'error'); return }
    try {
      if (editingItem) {
        await update(editingItem.id, form)
        addToast('Frame updated successfully')
      } else {
        await create(form)
        addToast('Frame created successfully')
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
      addToast('Frame deleted successfully')
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-text">Frame Posters</h1>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3">
        <input
          placeholder="Search frames..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2 text-sm text-brand-text w-64 focus:outline-none focus:border-brand-gold/50"
        />
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
          <option value="">All Categories</option>
          {frameCategories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={languageFilter} onChange={e => setLanguageFilter(e.target.value)} className="bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
          <option value="">All Languages</option>
          <option value="Hindi">Hindi</option>
          <option value="English">English</option>
          <option value="Gujarati">Gujarati</option>
          <option value="Marathi">Marathi</option>
        </select>
      </div>

      {/* Poster Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredData.map(poster => (
          <div key={poster.id} className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 overflow-hidden group">
            {/* Image */}
            <div className="aspect-[4/5] bg-brand-dark relative overflow-hidden">
              <img src={poster.image_url} alt={poster.title} className="w-full h-full object-cover" />
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button onClick={() => openEdit(poster)} className="p-2 bg-brand-gold rounded-lg text-gray-900"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => setDeleteItem(poster)} className="p-2 bg-status-error rounded-lg text-white"><Trash2 className="h-4 w-4" /></button>
                <button onClick={() => setPreviewItem(poster)} className="p-2 bg-status-info rounded-lg text-white"><Maximize2 className="h-4 w-4" /></button>
              </div>
              {/* Badges */}
              <div className="absolute top-2 right-2 flex flex-col gap-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${poster.status === 'active' ? 'bg-status-success/20 text-status-success' : 'bg-brand-dark-hover text-brand-text-muted'}`}>
                  {poster.status === 'active' ? 'Active' : 'Inactive'}
                </span>
                {poster.is_premium && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-brand-gold/20 text-brand-gold">Premium</span>
                )}
              </div>
            </div>
            {/* Info */}
            <div className="p-3">
              <h3 className="text-sm font-medium text-brand-text truncate">{poster.title}</h3>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs px-2 py-0.5 rounded-full bg-brand-gold/10 text-brand-gold">{poster.language}</span>
                <span className="text-xs text-brand-text-muted">{poster.frame_category}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredData.length === 0 && (
        <div className="text-center py-16">
          <ImageIcon className="h-12 w-12 text-brand-text-muted/30 mx-auto mb-3" />
          <p className="text-brand-text-muted">No frames found matching your filters.</p>
        </div>
      )}

      {/* Floating Add Button */}
      <button onClick={openAdd} className="fixed bottom-6 right-6 w-14 h-14 bg-brand-gold rounded-full shadow-lg flex items-center justify-center text-gray-900 hover:bg-brand-gold-dark transition-colors z-40">
        <Plus className="h-6 w-6" />
      </button>

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} title={editingItem ? 'Edit Frame' : 'Add Frame'}>
        <div className="space-y-4">
          <ImageUpload label="Frame Image" value={form.image_url} onChange={v => setForm(f => ({ ...f, image_url: v }))} aspectHint="1080x1350 (4:5)" />
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputClass} placeholder="Enter frame title" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Frame Category</label>
            <select value={form.frame_category} onChange={e => setForm(f => ({ ...f, frame_category: e.target.value }))} className={inputClass}>
              {frameCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Language</label>
            <select value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))} className={inputClass}>
              <option value="Hindi">Hindi</option>
              <option value="English">English</option>
              <option value="Gujarati">Gujarati</option>
              <option value="Marathi">Marathi</option>
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

      {/* Preview Modal */}
      <Modal isOpen={!!previewItem} onClose={() => setPreviewItem(null)} title={previewItem?.title || 'Preview'} size="lg">
        {previewItem && (
          <div className="flex flex-col items-center">
            <img src={previewItem.image_url} alt={previewItem.title} className="max-h-[70vh] object-contain rounded-lg" />
            <div className="flex items-center gap-3 mt-4">
              <span className="text-xs px-2 py-0.5 rounded-full bg-brand-gold/10 text-brand-gold">{previewItem.language}</span>
              <span className="text-xs text-brand-text-muted">{previewItem.frame_category}</span>
              {previewItem.is_premium && <span className="text-xs px-2 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold">Premium</span>}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Frame" message={`Are you sure you want to delete "${deleteItem?.title}"? This action cannot be undone.`} confirmText="Delete" variant="danger" />
    </div>
  )
}
