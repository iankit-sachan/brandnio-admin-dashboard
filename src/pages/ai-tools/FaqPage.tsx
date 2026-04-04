import { useState } from 'react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { bgRemovalFaqsApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'
import { useToast } from '../../context/ToastContext'
import { Pencil, Trash2, Plus } from 'lucide-react'

interface FaqItem {
  id: number
  question: string
  answer: string
  display_order: number
  is_active: boolean
}

interface FormState {
  question: string
  answer: string
  display_order: number
  is_active: boolean
}

const emptyForm: FormState = { question: '', answer: '', display_order: 0, is_active: true }

const columns: Column<FaqItem>[] = [
  { key: 'display_order', title: '#', sortable: true },
  { key: 'question', title: 'Question', sortable: true, render: (f) => (
    <span className="line-clamp-2 max-w-xs">{f.question}</span>
  )},
  { key: 'answer', title: 'Answer', render: (f) => (
    <span className="text-brand-text-muted line-clamp-1 max-w-sm">{f.answer}</span>
  )},
  { key: 'is_active', title: 'Active', render: (f) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${f.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
      {f.is_active ? 'Active' : 'Inactive'}
    </span>
  )},
]

export default function FaqPage() {
  const { addToast } = useToast()
  const { data, loading, create, update, remove } = useAdminCrud<FaqItem>(bgRemovalFaqsApi)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<FaqItem | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<FaqItem | null>(null)

  const openAdd = () => { setEditingItem(null); setForm(emptyForm); setModalOpen(true) }
  const openEdit = (item: FaqItem) => {
    setEditingItem(item)
    setForm({ question: item.question, answer: item.answer, display_order: item.display_order, is_active: item.is_active })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.question.trim() || !form.answer.trim()) {
      addToast('Question and answer are required', 'error')
      return
    }
    try {
      if (editingItem) await update(editingItem.id, form)
      else await create(form)
      addToast(editingItem ? 'FAQ updated' : 'FAQ created', 'success')
      setModalOpen(false)
    } catch { addToast('Save failed', 'error') }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    try {
      await remove(deleteItem.id)
      addToast('FAQ deleted', 'success')
      setDeleteItem(null)
    } catch { addToast('Delete failed', 'error') }
  }

  const actions = (item: FaqItem) => (
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
        <h1 className="text-2xl font-bold text-brand-text">BG Removal FAQs</h1>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-brand-yellow text-black rounded-lg font-medium hover:bg-brand-yellow/90 transition-colors text-sm">
          <Plus size={16} /> Add FAQ
        </button>
      </div>

      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading
          ? <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div>
          : <DataTable columns={[...columns, { key: 'id' as keyof FaqItem, title: 'Actions', render: actions }]} data={data} />
        }
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingItem ? 'Edit FAQ' : 'Add FAQ'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1">Question</label>
            <input type="text" value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
              placeholder="e.g. Can I pay through UPI?"
              className="w-full px-3 py-2 bg-brand-dark-deep border border-brand-dark-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-yellow/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1">Answer</label>
            <textarea rows={4} value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
              placeholder="Full answer text..."
              className="w-full px-3 py-2 bg-brand-dark-deep border border-brand-dark-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-yellow/50 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1">Display Order</label>
            <input type="number" value={form.display_order} onChange={e => setForm(f => ({ ...f, display_order: +e.target.value }))}
              className="w-full px-3 py-2 bg-brand-dark-deep border border-brand-dark-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-yellow/50" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
              className="w-4 h-4 accent-brand-yellow" />
            <span className="text-sm text-brand-text">Active (visible in app)</span>
          </label>
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
        title="Delete FAQ"
        message={`Delete this FAQ? "${deleteItem?.question?.slice(0, 60)}..."`}
      />
    </div>
  )
}
