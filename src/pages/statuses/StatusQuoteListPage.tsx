import { useState } from 'react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { Pencil, Trash2 } from 'lucide-react'
import { statusQuotesApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'
import type { StatusQuote } from '../../types/status.types'

interface FormState {
  text: string
  author: string
  gradient_start_color: string
  gradient_end_color: string
  sort_order: number
  is_active: boolean
}

const emptyForm: FormState = { text: '', author: '', gradient_start_color: '#FF6B6B', gradient_end_color: '#4ECDC4', sort_order: 0, is_active: true }

export default function StatusQuoteListPage() {
  const { addToast } = useToast()
  const { data, loading, create, update, remove } = useAdminCrud<StatusQuote>(statusQuotesApi)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<StatusQuote | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<StatusQuote | null>(null)

  const openAdd = () => {
    setEditingItem(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (item: StatusQuote) => {
    setEditingItem(item)
    setForm({
      text: item.text,
      author: item.author,
      gradient_start_color: item.gradient_start_color,
      gradient_end_color: item.gradient_end_color,
      sort_order: item.sort_order,
      is_active: item.is_active,
    })
    setModalOpen(true)
  }

  const openDelete = (item: StatusQuote) => setDeleteItem(item)

  const handleSubmit = async () => {
    if (!form.text.trim()) { addToast('Quote text is required', 'error'); return }
    if (!form.author.trim()) { addToast('Author is required', 'error'); return }
    try {
      if (editingItem) {
        await update(editingItem.id, form)
        addToast('Quote updated successfully')
      } else {
        await create(form)
        addToast('Quote created successfully')
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
      addToast('Quote deleted successfully')
      setDeleteItem(null)
    } catch {
      addToast('Delete failed. Please try again.', 'error')
    }
  }

  const columns: Column<StatusQuote>[] = [
    { key: 'text', title: 'Text', sortable: true, render: (item) => <span title={item.text}>{item.text.length > 60 ? item.text.slice(0, 60) + '...' : item.text}</span> },
    { key: 'author', title: 'Author', sortable: true },
    { key: 'gradient', title: 'Gradient', render: (item) => (
      <div
        className="rounded"
        style={{
          width: 60,
          height: 20,
          background: `linear-gradient(to right, ${item.gradient_start_color}, ${item.gradient_end_color})`,
        }}
      />
    )},
    { key: 'sort_order', title: 'Order', sortable: true },
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
        <h1 className="text-2xl font-bold text-brand-text">Status Quotes</h1>
        <button onClick={openAdd} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">+ Add Quote</button>
      </div>
      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading ? <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div> : <DataTable columns={columns} data={data} />}
      </div>

      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} title={editingItem ? 'Edit Quote' : 'Add Quote'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Quote Text</label>
            <textarea value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} rows={4} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Author</label>
            <input value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Gradient Start Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.gradient_start_color} onChange={e => setForm(f => ({ ...f, gradient_start_color: e.target.value }))} className="h-10 w-10 rounded border border-brand-dark-border cursor-pointer" />
                <input value={form.gradient_start_color} onChange={e => setForm(f => ({ ...f, gradient_start_color: e.target.value }))} className="flex-1 bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Gradient End Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.gradient_end_color} onChange={e => setForm(f => ({ ...f, gradient_end_color: e.target.value }))} className="h-10 w-10 rounded border border-brand-dark-border cursor-pointer" />
                <input value={form.gradient_end_color} onChange={e => setForm(f => ({ ...f, gradient_end_color: e.target.value }))} className="flex-1 bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
              </div>
            </div>
          </div>
          {/* Gradient Preview */}
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Preview</label>
            <div className="h-8 rounded-lg" style={{ background: `linear-gradient(to right, ${form.gradient_start_color}, ${form.gradient_end_color})` }} />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Sort Order</label>
            <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
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

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Quote" message={`Are you sure you want to delete this quote by "${deleteItem?.author}"? This action cannot be undone.`} confirmText="Delete" variant="danger" />
    </div>
  )
}
