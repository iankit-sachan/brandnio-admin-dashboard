import { useState } from 'react'
import { FileUpload } from '../../components/ui/FileUpload'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { Pencil, Trash2 } from 'lucide-react'
import { mockMusicTracks } from '../../services/mock-data'
import type { MusicTrack, MusicCategory } from '../../types'

interface FormState {
  file_url: string | null
  name: string
  duration: number
  category: MusicCategory
  is_premium: boolean
}

const emptyForm: FormState = { file_url: null, name: '', duration: 30, category: 'business', is_premium: false }

export default function MusicTrackListPage() {
  const { addToast } = useToast()
  const [data, setData] = useState<MusicTrack[]>([...mockMusicTracks])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MusicTrack | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<MusicTrack | null>(null)

  const openAdd = () => {
    setEditingItem(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (item: MusicTrack) => {
    setEditingItem(item)
    setForm({ file_url: item.file_url, name: item.name, duration: item.duration, category: item.category, is_premium: item.is_premium })
    setModalOpen(true)
  }

  const openDelete = (item: MusicTrack) => setDeleteItem(item)

  const handleSubmit = () => {
    if (!form.name.trim()) { addToast('Name is required', 'error'); return }
    if (editingItem) {
      setData(prev => prev.map(d => d.id === editingItem.id ? { ...d, file_url: form.file_url || '#', name: form.name, duration: form.duration, category: form.category, is_premium: form.is_premium } : d))
      addToast('Track updated successfully')
    } else {
      const newItem: MusicTrack = { id: Date.now(), name: form.name, file_url: form.file_url || '#', duration: form.duration, category: form.category, is_premium: form.is_premium, created_at: new Date().toISOString() }
      setData(prev => [...prev, newItem])
      addToast('Track created successfully')
    }
    setModalOpen(false)
  }

  const handleDelete = () => {
    if (!deleteItem) return
    setData(prev => prev.filter(d => d.id !== deleteItem.id))
    addToast('Track deleted successfully')
    setDeleteItem(null)
  }

  const columns: Column<MusicTrack>[] = [
    { key: 'name', title: 'Track Name', sortable: true },
    { key: 'category', title: 'Category', render: (t) => <span className="capitalize">{t.category as string}</span> },
    { key: 'duration', title: 'Duration', render: (t) => `${t.duration as number}s` },
    { key: 'is_premium', title: 'Premium', render: (t) => t.is_premium ? <span className="text-brand-gold">Premium</span> : <span className="text-brand-text-muted">Free</span> },
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
        <h1 className="text-2xl font-bold text-brand-text">Music Tracks</h1>
        <button onClick={openAdd} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">+ Add Track</button>
      </div>
      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        <DataTable columns={columns} data={data} />
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingItem ? 'Edit Track' : 'Add Track'}>
        <div className="space-y-4">
          <FileUpload label="Audio File" value={form.file_url} onChange={v => setForm(f => ({ ...f, file_url: v }))} accept="audio/*" />
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Duration (seconds)</label>
            <input type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Category</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as MusicCategory }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
              <option value="business">Business</option>
              <option value="festive">Festive</option>
              <option value="motivational">Motivational</option>
              <option value="trending">Trending</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_premium} onChange={e => setForm(f => ({ ...f, is_premium: e.target.checked }))} className="rounded" />
            <label className="text-sm text-brand-text-muted">Premium</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">Save</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Track" message={`Are you sure you want to delete "${deleteItem?.name}"? This action cannot be undone.`} confirmText="Delete" variant="danger" />
    </div>
  )
}
