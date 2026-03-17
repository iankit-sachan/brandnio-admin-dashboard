import { useState } from 'react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { Pencil, Trash2 } from 'lucide-react'
import { policiesApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'

type PolicyType = 'terms' | 'privacy' | 'refund'

interface Policy {
  id: number
  title: string
  policy_type: PolicyType
  content: string
  version: string
  updated_at: string
  is_active: boolean
}

interface FormState {
  title: string
  policy_type: PolicyType
  content: string
  version: string
  is_active: boolean
}

const emptyForm: FormState = { title: '', policy_type: 'terms', content: '', version: '1.0', is_active: true }

const typeLabels: Record<PolicyType, string> = { terms: 'Terms', privacy: 'Privacy', refund: 'Refund' }
const typeColors: Record<PolicyType, string> = { terms: 'bg-status-info/20 text-status-info', privacy: 'bg-brand-gold/20 text-brand-gold', refund: 'bg-status-error/20 text-status-error' }

export default function PoliciesPage() {
  const { addToast } = useToast()
  const { data, loading, create, update, remove } = useAdminCrud<Policy>(policiesApi)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Policy | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<Policy | null>(null)

  const openAdd = () => { setEditingItem(null); setForm(emptyForm); setModalOpen(true) }
  const openEdit = (item: Policy) => { setEditingItem(item); setForm({ title: item.title, policy_type: item.policy_type, content: item.content, version: item.version, is_active: item.is_active }); setModalOpen(true) }
  const openDelete = (item: Policy) => setDeleteItem(item)

  const handleSubmit = async () => {
    if (!form.title.trim()) { addToast('Title is required', 'error'); return }
    if (!form.content.trim()) { addToast('Content is required', 'error'); return }
    try {
      if (editingItem) {
        await update(editingItem.id, { title: form.title, policy_type: form.policy_type, content: form.content, version: form.version, is_active: form.is_active } as Partial<Policy>)
        addToast('Policy updated successfully')
      } else {
        await create({ title: form.title, policy_type: form.policy_type, content: form.content, version: form.version, is_active: form.is_active } as Partial<Policy>)
        addToast('Policy created successfully')
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
      addToast('Policy deleted successfully')
      setDeleteItem(null)
    } catch {
      addToast('Delete failed. Please try again.', 'error')
    }
  }

  const columns: Column<Policy>[] = [
    { key: 'title', title: 'Policy Name', sortable: true },
    { key: 'policy_type', title: 'Type', sortable: true, render: (item) => (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${typeColors[item.policy_type]}`}>{typeLabels[item.policy_type]}</span>
    )},
    { key: 'version', title: 'Version' },
    { key: 'updated_at', title: 'Last Updated', sortable: true },
    { key: 'is_active', title: 'Status', render: (item) => item.is_active ? <span className="text-status-success">Active</span> : <span className="text-status-error">Inactive</span> },
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
        <h1 className="text-2xl font-bold text-brand-text">Policies</h1>
        <button onClick={openAdd} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">+ Add Policy</button>
      </div>
      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading ? <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div> : <DataTable columns={columns} data={data} />}
      </div>

      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} title={editingItem ? 'Edit Policy' : 'Add Policy'} size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Policy Type</label>
            <select value={form.policy_type} onChange={e => setForm(f => ({ ...f, policy_type: e.target.value as PolicyType }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
              <option value="terms">Terms</option>
              <option value="privacy">Privacy</option>
              <option value="refund">Refund</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Content</label>
            <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={8} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Version</label>
            <input value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
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

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Policy" message={`Are you sure you want to delete "${deleteItem?.title}"? This action cannot be undone.`} confirmText="Delete" variant="danger" />
    </div>
  )
}
