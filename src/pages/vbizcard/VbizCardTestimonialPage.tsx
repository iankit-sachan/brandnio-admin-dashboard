import { useState, useMemo, useCallback } from 'react'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import { vbizCardTestimonialsApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'
import type { VbizCardTestimonial } from '../../types'

interface FormState {
  business_name: string
  category: string
  quote: string
  logo_url: string
  sort_order: number
  is_active: boolean
}

const emptyForm: FormState = {
  business_name: '', category: '', quote: '', logo_url: '', sort_order: 0, is_active: true,
}

export default function VbizCardTestimonialPage() {
  const { addToast } = useToast()
  const { data, loading, create, update, remove } = useAdminCrud<VbizCardTestimonial>(vbizCardTestimonialsApi)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<VbizCardTestimonial | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<VbizCardTestimonial | null>(null)

  const sortedData = useMemo(() => [...data].sort((a, b) => a.sort_order - b.sort_order), [data])

  const openAdd = () => { setEditingItem(null); setForm(emptyForm); setModalOpen(true) }

  const openEdit = (item: VbizCardTestimonial) => {
    setEditingItem(item)
    setForm({
      business_name: item.business_name, category: item.category, quote: item.quote,
      logo_url: item.logo_url, sort_order: item.sort_order, is_active: item.is_active,
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.business_name.trim()) { addToast('Business name is required', 'error'); return }
    if (!form.quote.trim()) { addToast('Quote is required', 'error'); return }
    try {
      if (editingItem) {
        await update(editingItem.id, form)
        addToast('Testimonial updated successfully')
      } else {
        await create(form)
        addToast('Testimonial created successfully')
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
      addToast('Testimonial deleted successfully')
      setDeleteItem(null)
    } catch {
      addToast('Delete failed. Please try again.', 'error')
    }
  }

  const toggleActive = useCallback(async (item: VbizCardTestimonial) => {
    try {
      const updated = await update(item.id, { is_active: !item.is_active } as any)
      if (updated) addToast(`Testimonial "${item.business_name}" ${!item.is_active ? 'activated' : 'deactivated'}`)
    } catch {
      addToast('Toggle failed', 'error')
    }
  }, [update, addToast])

  const moveItem = useCallback(async (item: VbizCardTestimonial, direction: 'up' | 'down') => {
    const idx = sortedData.findIndex(d => d.id === item.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sortedData.length) return

    const other = sortedData[swapIdx]
    try {
      await update(item.id, { sort_order: other.sort_order } as any)
      await update(other.id, { sort_order: item.sort_order } as any)
      addToast('Order updated')
    } catch {
      addToast('Reorder failed', 'error')
    }
  }, [sortedData, update, addToast])

  const columns: Column<VbizCardTestimonial>[] = [
    {
      key: 'sort_order', title: '#', sortable: true,
      render: (item) => {
        const idx = sortedData.findIndex(d => d.id === item.id)
        return (
          <div className="flex items-center gap-1">
            <span className="text-brand-text-muted w-5 text-center">{item.sort_order}</span>
            <button
              onClick={(e) => { e.stopPropagation(); moveItem(item, 'up') }}
              disabled={idx === 0}
              className="p-0.5 rounded hover:bg-brand-dark-hover disabled:opacity-20 text-brand-text-muted hover:text-brand-gold transition-colors"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); moveItem(item, 'down') }}
              disabled={idx === sortedData.length - 1}
              className="p-0.5 rounded hover:bg-brand-dark-hover disabled:opacity-20 text-brand-text-muted hover:text-brand-gold transition-colors"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      },
    },
    {
      key: 'business_name', title: 'Business', sortable: true,
      render: (item) => (
        <div className="flex items-center gap-3">
          {item.logo_url ? (
            <img src={item.logo_url} alt={item.business_name} className="h-8 w-8 rounded-full object-cover border border-brand-dark-border" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-brand-dark-hover flex items-center justify-center text-xs font-medium text-brand-text-muted">
              {item.business_name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="font-medium text-brand-text">{item.business_name}</span>
        </div>
      ),
    },
    { key: 'category', title: 'Category', render: (item) => <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">{item.category}</span> },
    { key: 'quote', title: 'Quote', render: (item) => <span className="text-brand-text-muted text-sm truncate max-w-[250px] block italic">"{item.quote}"</span> },
    {
      key: 'is_active', title: 'Status',
      render: (item) => (
        <button
          onClick={(e) => { e.stopPropagation(); toggleActive(item) }}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${item.is_active ? 'bg-green-500' : 'bg-gray-600'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${item.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      ),
    },
    {
      key: 'actions', title: 'Actions',
      render: (item) => (
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); openEdit(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-gold transition-colors"><Pencil className="h-4 w-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteItem(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-status-error transition-colors"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-text">VC Testimonials</h1>
        <button onClick={openAdd} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">+ Add Testimonial</button>
      </div>

      <p className="text-sm text-brand-text-muted">
        Manage testimonials displayed on the VbizCard screen. Use arrows to reorder, toggle to show/hide.
      </p>

      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading
          ? <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div>
          : <DataTable columns={columns} data={sortedData} />
        }
      </div>

      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false) }} title={editingItem ? 'Edit Testimonial' : 'Add Testimonial'} size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Business Name</label>
            <input value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))} placeholder="e.g. Sharma Electronics" className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Category</label>
            <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Retail, Restaurant, Salon" className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Quote</label>
            <textarea value={form.quote} onChange={e => setForm(f => ({ ...f, quote: e.target.value }))} rows={3} placeholder="What the business says about VbizCard..." className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50 resize-none" />
          </div>
          <ImageUpload label="Business Logo" value={form.logo_url} onChange={v => setForm(f => ({ ...f, logo_url: v }))} aspectHint="Square, 200x200" />
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Sort Order</label>
            <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
            <p className="text-xs text-brand-text-muted mt-1">Lower numbers appear first</p>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
            <label className="text-sm text-brand-text-muted">Active (visible on app)</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false) }} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">Save</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Testimonial" message={`Delete testimonial from "${deleteItem?.business_name}"? This will remove it from the VbizCard screen.`} confirmText="Delete" variant="danger" />
    </div>
  )
}
