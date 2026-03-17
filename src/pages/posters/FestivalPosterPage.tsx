import { useState, useEffect, useMemo } from 'react'
import { Pencil, Trash2, Plus, Maximize2, Calendar, Image as ImageIcon, Clock } from 'lucide-react'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { festivalPostersApi, festivalsApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'

interface FestivalPoster {
  id: number
  image_url: string
  title: string
  festival_id: number
  festival_name?: string
  language: string
  size: string
  category: string
  status: 'active' | 'inactive'
}

interface Festival {
  id: number
  name: string
  date: string
  poster_count: number
}

interface FormState {
  image_url: string | null
  title: string
  festival_id: number
  language: string
  size: string
  category: string
  status: 'active' | 'inactive'
}

const defaultFestivals: Festival[] = [
  { id: 1, name: 'Diwali', date: '2026-10-20', poster_count: 85 },
  { id: 2, name: 'Holi', date: '2026-03-17', poster_count: 62 },
  { id: 3, name: 'Navratri', date: '2026-10-01', poster_count: 54 },
  { id: 4, name: 'Raksha Bandhan', date: '2026-08-11', poster_count: 48 },
  { id: 5, name: 'Ganesh Chaturthi', date: '2026-09-07', poster_count: 92 },
  { id: 6, name: 'Makar Sankranti', date: '2027-01-14', poster_count: 84 },
]

const emptyForm: FormState = { image_url: null, title: '', festival_id: 1, language: 'Hindi', size: '4:5', category: 'Greeting', status: 'active' }

const inputClass = 'w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50'

export default function FestivalPosterPage() {
  const { addToast } = useToast()
  const { data, loading, create, update, remove } = useAdminCrud<FestivalPoster>(festivalPostersApi)
  const [festivals, setFestivals] = useState<Festival[]>(defaultFestivals)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<FestivalPoster | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<FestivalPoster | null>(null)
  const [previewItem, setPreviewItem] = useState<FestivalPoster | null>(null)

  useEffect(() => {
    festivalsApi.list()
      .then(results => {
        if (Array.isArray(results) && results.length > 0) setFestivals(results)
      })
      .catch(() => setFestivals(defaultFestivals))
  }, [])

  // Filters
  const [search, setSearch] = useState('')
  const [festivalFilter, setFestivalFilter] = useState<number | ''>('')
  const [languageFilter, setLanguageFilter] = useState('')
  const [sizeFilter, setSizeFilter] = useState('')

  const filteredData = useMemo(() => {
    return data.filter(p => {
      if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false
      if (festivalFilter && p.festival_id !== festivalFilter) return false
      if (languageFilter && p.language !== languageFilter) return false
      if (sizeFilter && p.size !== sizeFilter) return false
      return true
    })
  }, [data, search, festivalFilter, languageFilter, sizeFilter])

  const totalPosters = data.length
  const upcomingFestivals = festivals.filter(f => new Date(f.date) > new Date()).length

  const openAdd = () => { setEditingItem(null); setForm(emptyForm); setModalOpen(true) }
  const openEdit = (item: FestivalPoster) => {
    setEditingItem(item)
    setForm({ image_url: item.image_url, title: item.title, festival_id: item.festival_id, language: item.language, size: item.size, category: item.category, status: item.status })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) { addToast('Title is required', 'error'); return }
    try {
      if (editingItem) {
        await update(editingItem.id, form)
        addToast('Poster updated successfully')
      } else {
        await create(form)
        addToast('Poster created successfully')
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
      addToast('Poster deleted successfully')
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
        <h1 className="text-2xl font-bold text-brand-text">Festival Posters</h1>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-brand-gold/10"><Calendar className="h-5 w-5 text-brand-gold" /></div>
          <div>
            <p className="text-xs text-brand-text-muted">Total Festivals</p>
            <p className="text-xl font-bold text-brand-text">{festivals.length}</p>
          </div>
        </div>
        <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-status-info/10"><ImageIcon className="h-5 w-5 text-status-info" /></div>
          <div>
            <p className="text-xs text-brand-text-muted">Total Posters</p>
            <p className="text-xl font-bold text-brand-text">{totalPosters}</p>
          </div>
        </div>
        <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-status-success/10"><Clock className="h-5 w-5 text-status-success" /></div>
          <div>
            <p className="text-xs text-brand-text-muted">Upcoming Festivals</p>
            <p className="text-xl font-bold text-brand-text">{upcomingFestivals}</p>
          </div>
        </div>
      </div>

      {/* Festival Selector - Horizontal Scroll */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3 min-w-max">
          <button
            onClick={() => setFestivalFilter('')}
            className={`flex-shrink-0 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
              festivalFilter === '' ? 'bg-brand-gold text-gray-900 border-brand-gold' : 'bg-brand-dark-card border-brand-dark-border/50 text-brand-text hover:border-brand-gold/50'
            }`}
          >
            All Festivals
          </button>
          {festivals.map(f => (
            <button
              key={f.id}
              onClick={() => setFestivalFilter(f.id === festivalFilter ? '' : f.id)}
              className={`flex-shrink-0 px-4 py-2.5 rounded-xl border text-sm transition-colors ${
                festivalFilter === f.id ? 'bg-brand-gold text-gray-900 border-brand-gold' : 'bg-brand-dark-card border-brand-dark-border/50 text-brand-text hover:border-brand-gold/50'
              }`}
            >
              <span className="font-medium">{f.name}</span>
              <span className="ml-2 text-xs opacity-70">{new Date(f.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3">
        <input
          placeholder="Search posters..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2 text-sm text-brand-text w-64 focus:outline-none focus:border-brand-gold/50"
        />
        <select value={languageFilter} onChange={e => setLanguageFilter(e.target.value)} className="bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
          <option value="">All Languages</option>
          <option value="Hindi">Hindi</option>
          <option value="English">English</option>
          <option value="Gujarati">Gujarati</option>
          <option value="Marathi">Marathi</option>
        </select>
        <select value={sizeFilter} onChange={e => setSizeFilter(e.target.value)} className="bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
          <option value="">All Sizes</option>
          <option value="1:1">1:1</option>
          <option value="4:5">4:5</option>
          <option value="9:16">9:16</option>
          <option value="16:9">16:9</option>
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
              {/* Status badge */}
              <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium ${poster.status === 'active' ? 'bg-status-success/20 text-status-success' : 'bg-brand-dark-hover text-brand-text-muted'}`}>
                {poster.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>
            {/* Info */}
            <div className="p-3">
              <h3 className="text-sm font-medium text-brand-text truncate">{poster.title}</h3>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded-full bg-brand-gold/10 text-brand-gold">{poster.language}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-status-info/10 text-status-info">{poster.size}</span>
                <span className="text-xs text-brand-text-muted">{poster.category}</span>
              </div>
              <p className="text-xs text-brand-text-muted mt-1">{poster.festival_name}</p>
            </div>
          </div>
        ))}
      </div>

      {filteredData.length === 0 && (
        <div className="text-center py-16">
          <ImageIcon className="h-12 w-12 text-brand-text-muted/30 mx-auto mb-3" />
          <p className="text-brand-text-muted">No posters found matching your filters.</p>
        </div>
      )}

      {/* Floating Add Button */}
      <button onClick={openAdd} className="fixed bottom-6 right-6 w-14 h-14 bg-brand-gold rounded-full shadow-lg flex items-center justify-center text-gray-900 hover:bg-brand-gold-dark transition-colors z-40">
        <Plus className="h-6 w-6" />
      </button>

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} title={editingItem ? 'Edit Festival Poster' : 'Add Festival Poster'}>
        <div className="space-y-4">
          <ImageUpload label="Poster Image" value={form.image_url} onChange={v => setForm(f => ({ ...f, image_url: v }))} aspectHint="1080x1350 (4:5)" />
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputClass} placeholder="Enter poster title" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Festival</label>
            <select value={form.festival_id} onChange={e => setForm(f => ({ ...f, festival_id: Number(e.target.value) }))} className={inputClass}>
              {festivals.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Language</label>
              <select value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))} className={inputClass}>
                <option value="Hindi">Hindi</option>
                <option value="English">English</option>
                <option value="Gujarati">Gujarati</option>
                <option value="Marathi">Marathi</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Size</label>
              <select value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))} className={inputClass}>
                <option value="1:1">1:1</option>
                <option value="4:5">4:5</option>
                <option value="9:16">9:16</option>
                <option value="16:9">16:9</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Category</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputClass}>
              <option value="Greeting">Greeting</option>
              <option value="Promotional">Promotional</option>
              <option value="Invitation">Invitation</option>
              <option value="Event">Event</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.status === 'active'} onChange={e => setForm(f => ({ ...f, status: e.target.checked ? 'active' : 'inactive' }))} className="rounded" />
            <label className="text-sm text-brand-text-muted">Active</label>
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
              <span className="text-xs px-2 py-0.5 rounded-full bg-status-info/10 text-status-info">{previewItem.size}</span>
              <span className="text-xs text-brand-text-muted">{previewItem.festival_name}</span>
              <span className="text-xs text-brand-text-muted">{previewItem.category}</span>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Poster" message={`Are you sure you want to delete "${deleteItem?.title}"? This action cannot be undone.`} confirmText="Delete" variant="danger" />
    </div>
  )
}
