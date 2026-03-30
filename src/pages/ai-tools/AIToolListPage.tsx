import { useState } from 'react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { Pencil, Trash2 } from 'lucide-react'
import { aiToolsApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'
import type { AITool } from '../../types/ai-tool.types'

interface FormState {
  tool_id: string
  name: string
  description: string
  icon: string
  credit_cost: number
  category: string
  navigation_target: string
  sort_order: number
  is_active: boolean
}

const emptyForm: FormState = {
  tool_id: '',
  name: '',
  description: '',
  icon: '',
  credit_cost: 0,
  category: 'ai_generation',
  navigation_target: '',
  sort_order: 0,
  is_active: true,
}

const categoryColors: Record<string, string> = {
  ai_generation: 'bg-purple-500/20 text-purple-400',
  quick_tool: 'bg-blue-500/20 text-blue-400',
}

export default function AIToolListPage() {
  const { addToast } = useToast()
  const { data, loading, create, update, remove } = useAdminCrud<AITool>(aiToolsApi)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<AITool | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<AITool | null>(null)

  const openAdd = () => {
    setEditingItem(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (item: AITool) => {
    setEditingItem(item)
    setForm({
      tool_id: item.tool_id,
      name: item.name,
      description: item.description,
      icon: item.icon,
      credit_cost: item.credit_cost,
      category: item.category,
      navigation_target: item.navigation_target,
      sort_order: item.sort_order,
      is_active: item.is_active,
    })
    setModalOpen(true)
  }

  const openDelete = (item: AITool) => setDeleteItem(item)

  const handleSubmit = async () => {
    if (!form.tool_id.trim()) { addToast('Tool ID is required', 'error'); return }
    if (!form.name.trim()) { addToast('Name is required', 'error'); return }
    try {
      if (editingItem) {
        await update(editingItem.id, form)
        addToast('AI Tool updated successfully')
      } else {
        await create(form)
        addToast('AI Tool created successfully')
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
      addToast('AI Tool deleted successfully')
      setDeleteItem(null)
    } catch {
      addToast('Delete failed. Please try again.', 'error')
    }
  }

  const columns: Column<AITool>[] = [
    { key: 'tool_id', title: 'Tool ID', sortable: true },
    { key: 'name', title: 'Name', sortable: true },
    { key: 'credit_cost', title: 'Credit Cost' },
    { key: 'category', title: 'Category', render: (t) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[t.category] || 'bg-gray-500/20 text-gray-400'}`}>
        {t.category}
      </span>
    )},
    { key: 'sort_order', title: 'Sort Order' },
    { key: 'is_active', title: 'Status', render: (t) => t.is_active ? <span className="text-status-success">Active</span> : <span className="text-status-error">Inactive</span> },
    { key: 'actions', title: 'Actions', render: (item) => (
      <div className="flex items-center gap-2">
        <button onClick={(e) => { e.stopPropagation(); openEdit(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-gold transition-colors"><Pencil className="h-4 w-4" /></button>
        <button onClick={(e) => { e.stopPropagation(); openDelete(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-status-error transition-colors"><Trash2 className="h-4 w-4" /></button>
      </div>
    )},
  ]

  const inputClass = "w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50"

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-text">AI Tools</h1>
        <button onClick={openAdd} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">+ Add AI Tool</button>
      </div>
      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading ? <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div> : <DataTable columns={columns} data={data} />}
      </div>

      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false) }} title={editingItem ? 'Edit AI Tool' : 'Add AI Tool'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Tool ID</label>
            <input value={form.tool_id} onChange={e => setForm(f => ({ ...f, tool_id: e.target.value }))} className={inputClass} placeholder="e.g. bg_remover" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputClass} placeholder="e.g. Background Remover" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Description</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inputClass} placeholder="Tool description" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Icon (Android drawable name)</label>
            <input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} className={inputClass} placeholder="e.g. ic_bg_remove" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Credit Cost</label>
            <input type="number" value={form.credit_cost} onChange={e => setForm(f => ({ ...f, credit_cost: Number(e.target.value) }))} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Category</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputClass}>
              <option value="ai_generation">AI Generation</option>
              <option value="quick_tool">Quick Tool</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Navigation Target</label>
            <input value={form.navigation_target} onChange={e => setForm(f => ({ ...f, navigation_target: e.target.value }))} className={inputClass} placeholder="e.g. BgRemoveFragment" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Sort Order</label>
            <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} className={inputClass} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
            <label className="text-sm text-brand-text-muted">Active</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false) }} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">Save</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete AI Tool" message={`Are you sure you want to delete "${deleteItem?.name}"? This action cannot be undone.`} confirmText="Delete" variant="danger" />
    </div>
  )
}
