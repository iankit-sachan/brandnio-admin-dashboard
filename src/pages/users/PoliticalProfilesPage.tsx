import { useState } from 'react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { politicianProfilesApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'
import { useToast } from '../../context/ToastContext'
import { Pencil, Trash2 } from 'lucide-react'

interface PoliticalProfile {
  id: number
  name: string
  party: string
  constituency: string
  state: string
  image_url: string | null
  is_active: boolean
}

interface FormState {
  name: string
  party: string
  constituency: string
  state: string
  image_url: string | null
  is_active: boolean
}

const emptyForm: FormState = { name: '', party: '', constituency: '', state: '', image_url: null, is_active: true }

export default function PoliticalProfilesPage() {
  const { addToast } = useToast()
  const { data, loading, create, update, remove } = useAdminCrud<PoliticalProfile>(politicianProfilesApi)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<PoliticalProfile | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<PoliticalProfile | null>(null)

  const openAdd = () => {
    setEditingItem(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (item: PoliticalProfile) => {
    setEditingItem(item)
    setForm({ name: item.name, party: item.party, constituency: item.constituency, state: item.state, image_url: item.image_url, is_active: item.is_active })
    setModalOpen(true)
  }

  const openDelete = (item: PoliticalProfile) => setDeleteItem(item)

  const handleSubmit = async () => {
    if (!form.name.trim()) { addToast('Leader name is required', 'error'); return }
    if (!form.party.trim()) { addToast('Party is required', 'error'); return }
    try {
      if (editingItem) {
        await update(editingItem.id, form)
        addToast('Political profile updated successfully')
      } else {
        await create(form)
        addToast('Political profile created successfully')
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
      addToast('Political profile deleted successfully')
      setDeleteItem(null)
    } catch {
      addToast('Delete failed. Please try again.', 'error')
    }
  }

  const columns: Column<PoliticalProfile>[] = [
    { key: 'name', title: 'Leader Name', sortable: true },
    { key: 'party', title: 'Party', sortable: true, render: (p) => <span className="font-medium text-brand-gold">{p.party}</span> },
    { key: 'constituency', title: 'Constituency', sortable: true },
    { key: 'state', title: 'State', sortable: true },
    {
      key: 'image_url', title: 'Image', render: (p) => p.image_url
        ? <img src={p.image_url} alt={p.name} className="h-8 w-8 rounded-full object-cover" />
        : <div className="h-8 w-8 rounded-full bg-brand-dark-hover flex items-center justify-center text-xs text-brand-text-muted">{p.name.charAt(0)}</div>,
    },
    {
      key: 'is_active', title: 'Status', render: (p) => p.is_active
        ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-success/10 text-status-success">Active</span>
        : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-error/10 text-status-error">Inactive</span>,
    },
    {
      key: 'actions', title: 'Actions', render: (item) => (
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); openEdit(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-gold transition-colors"><Pencil className="h-4 w-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); openDelete(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-status-error transition-colors"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ]

  const inputClass = 'w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-text">Political Profiles</h1>
        <button onClick={openAdd} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">+ Add Leader</button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div>
      ) : (
        <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
          <DataTable columns={columns} data={data} />
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} title={editingItem ? 'Edit Political Profile' : 'Add Political Profile'}>
        <div className="space-y-4">
          <ImageUpload label="Leader Photo" value={form.image_url} onChange={v => setForm(f => ({ ...f, image_url: v }))} aspectHint="300x300" />
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Leader Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Party</label>
              <input value={form.party} onChange={e => setForm(f => ({ ...f, party: e.target.value }))} className={inputClass} placeholder="e.g. BJP, INC, AAP" />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Constituency</label>
              <input value={form.constituency} onChange={e => setForm(f => ({ ...f, constituency: e.target.value }))} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">State</label>
            <input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} className={inputClass} />
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

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Political Profile" message={`Are you sure you want to delete "${deleteItem?.name}"? This action cannot be undone.`} confirmText="Delete" variant="danger" />
    </div>
  )
}
