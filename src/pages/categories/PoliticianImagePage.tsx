import { useState } from 'react'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { User, Pencil, Trash2, Plus, Search } from 'lucide-react'
import { politicianProfilesApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'

interface PoliticianImage {
  id: number
  user: number
  user_email: string
  user_name: string
  party_name: string
  party_logo_url: string
  designation: string
  constituency: string
  state: string
  bio: string
  is_verified: boolean
  post_count: number
  follower_count: number
  created_at: string
  updated_at: string
}

interface FormState {
  party_logo_url: string
  user_name: string
  party_name: string
  designation: string
  constituency: string
  state: string
  is_verified: boolean
}

const emptyForm: FormState = { party_logo_url: '', user_name: '', party_name: 'BJP', designation: '', constituency: '', state: '', is_verified: true }

const parties = ['BJP', 'INC', 'AAP', 'TMC', 'SP', 'BSP']

export default function PoliticianImagePage() {
  const { addToast } = useToast()
  const { data, loading, create, update, remove } = useAdminCrud<PoliticianImage>(politicianProfilesApi)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<PoliticianImage | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<PoliticianImage | null>(null)
  const [search, setSearch] = useState('')
  const [filterParty, setFilterParty] = useState('')

  const filtered = data.filter(p => {
    if (search && !p.user_name.toLowerCase().includes(search.toLowerCase())) return false
    if (filterParty && p.party_name !== filterParty) return false
    return true
  })

  const openAdd = () => {
    setEditingItem(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (item: PoliticianImage) => {
    setEditingItem(item)
    setForm({ party_logo_url: item.party_logo_url, user_name: item.user_name, party_name: item.party_name, designation: item.designation, constituency: item.constituency, state: item.state, is_verified: item.is_verified })
    setModalOpen(true)
  }

  const openDelete = (item: PoliticianImage) => setDeleteItem(item)

  const handleSubmit = async () => {
    if (!form.user_name.trim()) { addToast('Name is required', 'error'); return }
    try {
      if (editingItem) {
        await update(editingItem.id, form)
        addToast('Politician image updated successfully')
      } else {
        await create(form)
        addToast('Politician image created successfully')
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
      addToast('Politician image deleted successfully')
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-text">Politician Images</h1>
        <div className="flex items-center gap-3">
          <select value={filterParty} onChange={e => setFilterParty(e.target.value)} className="bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
            <option value="">All Parties</option>
            {parties.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-text-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search politicians..." className="pl-10 pr-4 py-2 bg-brand-dark border border-brand-dark-border rounded-lg text-sm text-brand-text focus:outline-none focus:border-brand-gold/50 w-64" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filtered.map(item => (
          <div key={item.id} className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 overflow-hidden group relative">
            <div className="aspect-square bg-neutral-900 overflow-hidden flex items-center justify-center">
              {item.party_logo_url ? <img src={item.party_logo_url} className="w-full h-full object-contain" /> : <User className="w-12 h-12 text-brand-text-muted" />}
            </div>
            <div className="p-3">
              <h3 className="text-sm font-medium text-brand-text truncate">{item.user_name}</h3>
              <p className="text-xs text-brand-gold mt-0.5">{item.party_name}</p>
              <p className="text-xs text-brand-text-muted mt-0.5">{item.constituency}{item.state ? `, ${item.state}` : ''}</p>
              {!item.is_verified && <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-status-error/20 text-status-error">Unverified</span>}
            </div>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
              <button onClick={() => openEdit(item)} className="p-1 bg-brand-dark-hover rounded text-brand-gold"><Pencil className="h-3 w-3" /></button>
              <button onClick={() => openDelete(item)} className="p-1 bg-brand-dark-hover rounded text-status-error"><Trash2 className="h-3 w-3" /></button>
            </div>
          </div>
        ))}
      </div>

      <button onClick={openAdd} className="fixed bottom-8 right-8 w-14 h-14 bg-brand-gold text-gray-900 rounded-full shadow-lg hover:bg-brand-gold-dark transition-colors flex items-center justify-center z-40">
        <Plus className="h-6 w-6" />
      </button>

      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} title={editingItem ? 'Edit Politician Image' : 'Add Politician Image'}>
        <div className="space-y-4">
          <ImageUpload label="Party Logo" value={form.party_logo_url} onChange={v => setForm(f => ({ ...f, party_logo_url: v ?? '' }))} aspectHint="Square photo, 300x300 recommended" />
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Name</label>
            <input value={form.user_name} onChange={e => setForm(f => ({ ...f, user_name: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Party</label>
            <select value={form.party_name} onChange={e => setForm(f => ({ ...f, party_name: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
              {parties.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Designation</label>
            <input value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Constituency</label>
              <input value={form.constituency} onChange={e => setForm(f => ({ ...f, constituency: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">State</label>
              <input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_verified} onChange={e => setForm(f => ({ ...f, is_verified: e.target.checked }))} className="rounded" />
            <label className="text-sm text-brand-text-muted">Verified</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">Save</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Politician Image" message={`Are you sure you want to delete "${deleteItem?.user_name}"? This action cannot be undone.`} confirmText="Delete" variant="danger" />
    </div>
  )
}
