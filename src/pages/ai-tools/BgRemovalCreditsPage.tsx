import { useState } from 'react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { bgRemovalCreditsApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'
import { useToast } from '../../context/ToastContext'
import { Pencil, Trash2, Plus } from 'lucide-react'

interface CreditPlan {
  id: number
  credits: number
  price_inr: number
  display_order: number
  is_default: boolean
  is_active: boolean
}

interface FormState {
  credits: number
  price_inr: number
  display_order: number
  is_default: boolean
  is_active: boolean
}

const emptyForm: FormState = { credits: 0, price_inr: 0, display_order: 0, is_default: false, is_active: true }

const columns: Column<CreditPlan>[] = [
  { key: 'credits', title: 'Credits', sortable: true },
  { key: 'price_inr', title: 'Price (₹)', sortable: true, render: (p) => `₹${p.price_inr}` },
  { key: 'display_order', title: 'Order', sortable: true },
  { key: 'is_default', title: 'Default', render: (p) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.is_default ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
      {p.is_default ? 'Yes' : 'No'}
    </span>
  )},
  { key: 'is_active', title: 'Active', render: (p) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
      {p.is_active ? 'Active' : 'Inactive'}
    </span>
  )},
]

export default function BgRemovalCreditsPage() {
  const { addToast } = useToast()
  const { data, loading, create, update, remove } = useAdminCrud<CreditPlan>(bgRemovalCreditsApi)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CreditPlan | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<CreditPlan | null>(null)

  const openAdd = () => { setEditingItem(null); setForm(emptyForm); setModalOpen(true) }
  const openEdit = (item: CreditPlan) => {
    setEditingItem(item)
    setForm({ credits: item.credits, price_inr: item.price_inr, display_order: item.display_order, is_default: item.is_default, is_active: item.is_active })
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      if (editingItem) await update(editingItem.id, form)
      else await create(form)
      addToast({ type: 'success', message: editingItem ? 'Plan updated' : 'Plan created' })
      setModalOpen(false)
    } catch { addToast({ type: 'error', message: 'Save failed' }) }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    try {
      await remove(deleteItem.id)
      addToast({ type: 'success', message: 'Plan deleted' })
      setDeleteItem(null)
    } catch { addToast({ type: 'error', message: 'Delete failed' }) }
  }

  const actions = (item: CreditPlan) => (
    <div className="flex gap-2">
      <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-brand-dark-border/30 text-brand-text-muted hover:text-brand-yellow transition-colors">
        <Pencil size={14} />
      </button>
      <button onClick={() => setDeleteItem(item)} className="p-1.5 rounded hover:bg-red-500/10 text-brand-text-muted hover:text-red-400 transition-colors">
        <Trash2 size={14} />
      </button>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-text">BG Removal Credit Plans</h1>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-brand-yellow text-black rounded-lg font-medium hover:bg-brand-yellow/90 transition-colors text-sm">
          <Plus size={16} /> Add Plan
        </button>
      </div>

      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading
          ? <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div>
          : <DataTable columns={[...columns, { key: 'id' as keyof CreditPlan, title: 'Actions', render: actions }]} data={data} />
        }
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingItem ? 'Edit Credit Plan' : 'Add Credit Plan'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1">Credits</label>
            <input type="number" value={form.credits} onChange={e => setForm(f => ({ ...f, credits: +e.target.value }))}
              className="w-full px-3 py-2 bg-brand-dark-deep border border-brand-dark-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-yellow/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1">Price (₹ INR)</label>
            <input type="number" value={form.price_inr} onChange={e => setForm(f => ({ ...f, price_inr: +e.target.value }))}
              className="w-full px-3 py-2 bg-brand-dark-deep border border-brand-dark-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-yellow/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1">Display Order</label>
            <input type="number" value={form.display_order} onChange={e => setForm(f => ({ ...f, display_order: +e.target.value }))}
              className="w-full px-3 py-2 bg-brand-dark-deep border border-brand-dark-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-yellow/50" />
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_default} onChange={e => setForm(f => ({ ...f, is_default: e.target.checked }))}
                className="w-4 h-4 accent-brand-yellow" />
              <span className="text-sm text-brand-text">Default selected</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                className="w-4 h-4 accent-brand-yellow" />
              <span className="text-sm text-brand-text">Active</span>
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2 border border-brand-dark-border text-brand-text-muted rounded-lg hover:bg-brand-dark-border/20 transition-colors text-sm">Cancel</button>
            <button onClick={handleSave} className="flex-1 px-4 py-2 bg-brand-yellow text-black rounded-lg font-medium hover:bg-brand-yellow/90 transition-colors text-sm">Save</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        title="Delete Credit Plan"
        message={`Delete ${deleteItem?.credits} Credits plan? This action cannot be undone.`}
      />
    </div>
  )
}
