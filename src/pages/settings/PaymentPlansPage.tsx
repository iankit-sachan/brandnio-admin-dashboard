import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { Check, Pencil, Trash2, Plus } from 'lucide-react'
import { plansApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'

interface Plan {
  id: number
  name: string
  price: number
  duration: string
  features: string[]
  is_active: boolean
  is_popular: boolean
}

interface FormState {
  name: string
  price: number
  duration: string
  features: string
  is_active: boolean
  is_popular: boolean
}

const emptyForm: FormState = { name: '', price: 0, duration: 'month', features: '', is_active: true, is_popular: false }

export default function PaymentPlansPage() {
  const { addToast } = useToast()
  const { data: plans, loading, create, update, remove } = useAdminCrud<Plan>(plansApi)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Plan | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<Plan | null>(null)

  const openAdd = () => { setEditingItem(null); setForm(emptyForm); setModalOpen(true) }
  const openEdit = (plan: Plan) => { setEditingItem(plan); setForm({ name: plan.name, price: plan.price, duration: plan.duration, features: plan.features.join(', '), is_active: plan.is_active, is_popular: plan.is_popular }); setModalOpen(true) }
  const openDelete = (plan: Plan) => setDeleteItem(plan)

  const togglePlan = async (plan: Plan) => {
    try {
      await update(plan.id, { is_active: !plan.is_active } as Partial<Plan>)
      addToast(`${plan.name} plan ${plan.is_active ? 'disabled' : 'enabled'}`)
    } catch {
      addToast('Operation failed. Please try again.', 'error')
    }
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) { addToast('Plan name is required', 'error'); return }
    const features = form.features.split(',').map(f => f.trim()).filter(Boolean)
    try {
      if (editingItem) {
        await update(editingItem.id, { name: form.name, price: form.price, duration: form.duration, features, is_active: form.is_active, is_popular: form.is_popular } as Partial<Plan>)
        addToast('Plan updated successfully')
      } else {
        await create({ name: form.name, price: form.price, duration: form.duration, features, is_active: form.is_active, is_popular: form.is_popular } as Partial<Plan>)
        addToast('Plan created successfully')
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
      addToast('Plan deleted successfully')
      setDeleteItem(null)
    } catch {
      addToast('Delete failed. Please try again.', 'error')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-text">Payment Plans</h1>
      </div>

      {loading ? <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div> : (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {plans.map(plan => (
          <div key={plan.id} className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 p-6 relative">
            {plan.is_popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-brand-gold text-gray-900 text-xs font-bold rounded-full">POPULAR</span>
            )}
            <h3 className="text-lg font-bold text-brand-text">{plan.name}</h3>
            <div className="mt-2">
              <span className="text-3xl font-bold text-brand-gold">{plan.price === 0 ? 'Free' : `\u20B9${plan.price}`}</span>
              {plan.price > 0 && <span className="text-brand-text-muted text-sm">/{plan.duration}</span>}
            </div>
            <ul className="mt-4 space-y-2">
              {plan.features.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-brand-text">
                  <Check className="h-4 w-4 text-status-success flex-shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => togglePlan(plan)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${plan.is_active ? 'bg-status-success/20 text-status-success hover:bg-status-success/30' : 'bg-status-error/20 text-status-error hover:bg-status-error/30'}`}
              >
                {plan.is_active ? 'Enabled' : 'Disabled'}
              </button>
              <button onClick={() => openEdit(plan)} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-dark-hover text-brand-text-muted hover:text-brand-gold transition-colors">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => openDelete(plan)} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-dark-hover text-brand-text-muted hover:text-status-error transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
      )}

      <button onClick={openAdd} className="fixed bottom-8 right-8 px-4 py-3 bg-brand-gold text-gray-900 font-medium text-sm rounded-full hover:bg-brand-gold-dark transition-colors shadow-lg inline-flex items-center gap-2">
        <Plus className="h-5 w-5" /> Create Plan
      </button>

      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} title={editingItem ? 'Edit Plan' : 'Add Plan'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Plan Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Price (INR)</label>
            <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: parseInt(e.target.value) || 0 }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Duration</label>
            <select value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
              <option value="month">Month</option>
              <option value="quarter">Quarter</option>
              <option value="year">Year</option>
              <option value="forever">Forever</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Features (comma-separated)</label>
            <textarea value={form.features} onChange={e => setForm(f => ({ ...f, features: e.target.value }))} rows={3} placeholder="Feature 1, Feature 2, Feature 3..." className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
              <label className="text-sm text-brand-text-muted">Active</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_popular} onChange={e => setForm(f => ({ ...f, is_popular: e.target.checked }))} className="rounded" />
              <label className="text-sm text-brand-text-muted">Popular</label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">Save</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Plan" message={`Are you sure you want to delete the "${deleteItem?.name}" plan? This action cannot be undone.`} confirmText="Delete" variant="danger" />
    </div>
  )
}
