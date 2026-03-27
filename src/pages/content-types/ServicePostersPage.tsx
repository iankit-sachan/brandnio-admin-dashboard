import { useState } from 'react'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { Image as ImageIcon, Pencil, Trash2, Plus, Search, Crown } from 'lucide-react'
import { postersApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'

interface ServicePoster {
  id: number
  title: string
  image_url: string | null
  service_type: string
  language: string
  is_premium: boolean
}

interface FormState {
  image_url: string | null
  title: string
  service_type: string
  language: string
  is_premium: boolean
}

const serviceTypes = ['Plumber', 'Electrician', 'Carpenter', 'Painter', 'Mechanic', 'Tailor', 'Tutor', 'Caterer']
const languages = ['English', 'Hindi', 'Gujarati', 'Marathi', 'Tamil', 'Telugu']

const emptyForm: FormState = { image_url: null, title: '', service_type: 'Plumber', language: 'English', is_premium: false }

export default function ServicePostersPage() {
  const { addToast } = useToast()
  const { data, loading, create, update, remove } = useAdminCrud<ServicePoster>(postersApi)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ServicePoster | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<ServicePoster | null>(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterLanguage, setFilterLanguage] = useState('')

  const filtered = data.filter(p => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false
    if (filterType && p.service_type !== filterType) return false
    if (filterLanguage && p.language !== filterLanguage) return false
    return true
  })

  const openAdd = () => {
    setEditingItem(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (item: ServicePoster) => {
    setEditingItem(item)
    setForm({ image_url: item.image_url, title: item.title, service_type: item.service_type, language: item.language, is_premium: item.is_premium })
    setModalOpen(true)
  }

  const openDelete = (item: ServicePoster) => setDeleteItem(item)

  const handleSubmit = async () => {
    if (!form.title.trim()) { addToast('Title is required', 'error'); return }
    try {
      if (editingItem) {
        await update(editingItem.id, form)
        addToast('Service poster updated successfully')
      } else {
        await create(form)
        addToast('Service poster created successfully')
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
      addToast('Service poster deleted successfully')
      setDeleteItem(null)
    } catch {
      addToast('Delete failed. Please try again.', 'error')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-text">Service Posters</h1>
        <div className="flex items-center gap-3">
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
            <option value="">All Services</option>
            {serviceTypes.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterLanguage} onChange={e => setFilterLanguage(e.target.value)} className="bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
            <option value="">All Languages</option>
            {languages.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-text-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search posters..." className="pl-10 pr-4 py-2 bg-brand-dark border border-brand-dark-border rounded-lg text-sm text-brand-text focus:outline-none focus:border-brand-gold/50 w-56" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map(item => (
            <div key={item.id} className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 overflow-hidden group relative">
              <div className="aspect-[4/5] bg-neutral-900 overflow-hidden flex items-center justify-center">
                {item.image_url ? <img src={item.image_url} className="w-full h-full object-contain" /> : <ImageIcon className="w-10 h-10 text-brand-text-muted" />}
              </div>
              <div className="p-3">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-medium text-brand-text truncate flex-1">{item.title}</h3>
                  {item.is_premium && <Crown className="h-3.5 w-3.5 text-brand-gold shrink-0" />}
                </div>
                <p className="text-xs text-brand-text-muted mt-0.5">{item.service_type} &middot; {item.language}</p>
              </div>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
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

      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} title={editingItem ? 'Edit Service Poster' : 'Add Service Poster'}>
        <div className="space-y-4">
          <ImageUpload label="Poster Image" value={form.image_url} onChange={v => setForm(f => ({ ...f, image_url: v }))} aspectHint="4:5 ratio, 1080x1350 recommended" />
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Service Type</label>
              <select value={form.service_type} onChange={e => setForm(f => ({ ...f, service_type: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
                {serviceTypes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Language</label>
              <select value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
                {languages.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
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

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Service Poster" message={`Are you sure you want to delete "${deleteItem?.title}"? This action cannot be undone.`} confirmText="Delete" variant="danger" />
    </div>
  )
}
