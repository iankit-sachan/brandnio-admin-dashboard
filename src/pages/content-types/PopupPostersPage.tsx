import { useState } from 'react'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { Image as ImageIcon, Pencil, Trash2, Plus, Search } from 'lucide-react'
import { popupPostersApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'

interface PopupPoster {
  id: number
  title: string
  image_url: string | null
  display_type: string
  start_date: string
  end_date: string
  target_url: string
  is_active: boolean
}

interface FormState {
  image_url: string | null
  title: string
  display_type: string
  start_date: string
  end_date: string
  target_url: string
  is_active: boolean
}

const displayTypes = ['app_open', 'home_screen', 'after_login']
const displayTypeLabels: Record<string, string> = { app_open: 'App Open', home_screen: 'Home Screen', after_login: 'After Login' }

const emptyForm: FormState = { image_url: null, title: '', display_type: 'app_open', start_date: '', end_date: '', target_url: '', is_active: true }

export default function PopupPostersPage() {
  const { addToast } = useToast()
  const { data, loading, create, update, remove } = useAdminCrud<PopupPoster>(popupPostersApi)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<PopupPoster | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<PopupPoster | null>(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')

  const filtered = data.filter(p => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false
    if (filterType && p.display_type !== filterType) return false
    return true
  })

  const openAdd = () => {
    setEditingItem(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (item: PopupPoster) => {
    setEditingItem(item)
    setForm({ image_url: item.image_url, title: item.title, display_type: item.display_type, start_date: item.start_date, end_date: item.end_date, target_url: item.target_url, is_active: item.is_active })
    setModalOpen(true)
  }

  const openDelete = (item: PopupPoster) => setDeleteItem(item)

  const handleSubmit = async () => {
    if (!form.title.trim()) { addToast('Title is required', 'error'); return }
    try {
      if (editingItem) {
        await update(editingItem.id, form)
        addToast('Popup poster updated successfully')
      } else {
        await create(form)
        addToast('Popup poster created successfully')
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
      addToast('Popup poster deleted successfully')
      setDeleteItem(null)
    } catch {
      addToast('Delete failed. Please try again.', 'error')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-text">Popup Posters</h1>
        <div className="flex items-center gap-3">
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
            <option value="">All Types</option>
            {displayTypes.map(t => <option key={t} value={t}>{displayTypeLabels[t]}</option>)}
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-text-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search popups..." className="pl-10 pr-4 py-2 bg-brand-dark border border-brand-dark-border rounded-lg text-sm text-brand-text focus:outline-none focus:border-brand-gold/50 w-56" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => (
            <div key={item.id} className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 overflow-hidden group relative">
              <div className="aspect-[3/2] bg-neutral-900 overflow-hidden flex items-center justify-center">
                {item.image_url ? <img src={item.image_url} className="w-full h-full object-contain" /> : <ImageIcon className="w-10 h-10 text-brand-text-muted" />}
              </div>
              <div className="p-4">
                <h3 className="text-sm font-medium text-brand-text">{item.title}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-gold/20 text-brand-gold">{displayTypeLabels[item.display_type]}</span>
                  {item.is_active ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-status-success/20 text-status-success">Active</span> : <span className="text-[10px] px-1.5 py-0.5 rounded bg-status-error/20 text-status-error">Inactive</span>}
                </div>
                <p className="text-xs text-brand-text-muted mt-2">{item.start_date} — {item.end_date}</p>
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

      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} title={editingItem ? 'Edit Popup Poster' : 'Add Popup Poster'}>
        <div className="space-y-4">
          <ImageUpload label="Popup Image" value={form.image_url} onChange={v => setForm(f => ({ ...f, image_url: v }))} aspectHint="3:2 ratio, 600x400 recommended" />
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Display Type</label>
            <select value={form.display_type} onChange={e => setForm(f => ({ ...f, display_type: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
              {displayTypes.map(t => <option key={t} value={t}>{displayTypeLabels[t]}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Start Date</label>
              <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">End Date</label>
              <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Target URL</label>
            <input value={form.target_url} onChange={e => setForm(f => ({ ...f, target_url: e.target.value }))} placeholder="https://..." className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
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

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Popup Poster" message={`Are you sure you want to delete "${deleteItem?.title}"? This action cannot be undone.`} confirmText="Delete" variant="danger" />
    </div>
  )
}
