import { useState } from 'react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { businessProfilesApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'
import { useToast } from '../../context/ToastContext'
import { Pencil, Trash2 } from 'lucide-react'

interface BusinessProfile {
  id: number
  business_name: string
  owner_name: string
  city: string
  phone: string
  email: string
  website: string
  is_verified: boolean
}

interface FormState {
  business_name: string
  owner_name: string
  city: string
  phone: string
  email: string
  website: string
  is_verified: boolean
}

const emptyForm: FormState = { business_name: '', owner_name: '', city: '', phone: '', email: '', website: '', is_verified: false }

export default function BusinessProfilesPage() {
  const { addToast } = useToast()
  const { data, loading, create, update, remove } = useAdminCrud<BusinessProfile>(businessProfilesApi)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<BusinessProfile | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<BusinessProfile | null>(null)

  const openAdd = () => {
    setEditingItem(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (item: BusinessProfile) => {
    setEditingItem(item)
    setForm({ business_name: item.business_name, owner_name: item.owner_name, city: item.city, phone: item.phone, email: item.email, website: item.website, is_verified: item.is_verified })
    setModalOpen(true)
  }

  const openDelete = (item: BusinessProfile) => setDeleteItem(item)

  const handleSubmit = async () => {
    if (!form.business_name.trim()) { addToast('Business name is required', 'error'); return }
    if (!form.owner_name.trim()) { addToast('Owner name is required', 'error'); return }
    try {
      if (editingItem) {
        await update(editingItem.id, form)
        addToast('Business profile updated successfully')
      } else {
        await create(form)
        addToast('Business profile created successfully')
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
      addToast('Business profile deleted successfully')
      setDeleteItem(null)
    } catch {
      addToast('Delete failed. Please try again.', 'error')
    }
  }

  const columns: Column<BusinessProfile>[] = [
    { key: 'business_name', title: 'Business Name', sortable: true },
    { key: 'owner_name', title: 'Owner', sortable: true },
    { key: 'city', title: 'City', sortable: true },
    { key: 'phone', title: 'Phone' },
    { key: 'email', title: 'Email' },
    { key: 'website', title: 'Website', render: (b) => b.website ? <a href={`https://${b.website}`} target="_blank" rel="noopener noreferrer" className="text-status-info hover:underline">{b.website}</a> : <span className="text-brand-text-muted">—</span> },
    {
      key: 'is_verified', title: 'Verified', render: (b) => b.is_verified
        ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-success/10 text-status-success">Verified</span>
        : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-dark-hover text-brand-text-muted">Pending</span>,
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
        <h1 className="text-2xl font-bold text-brand-text">Business Profiles</h1>
        <button onClick={openAdd} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">+ Add Business</button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div>
      ) : (
        <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
          <DataTable columns={columns} data={data} />
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} title={editingItem ? 'Edit Business Profile' : 'Add Business Profile'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Business Name</label>
            <input value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Owner Name</label>
            <input value={form.owner_name} onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">City</label>
              <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Phone</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Website</label>
              <input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} className={inputClass} placeholder="example.com" />
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

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Business Profile" message={`Are you sure you want to delete "${deleteItem?.business_name}"? This action cannot be undone.`} confirmText="Delete" variant="danger" />
    </div>
  )
}
