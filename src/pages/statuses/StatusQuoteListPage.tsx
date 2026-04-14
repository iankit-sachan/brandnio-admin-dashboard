import { useState, useCallback, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Pagination } from '../../components/ui/Pagination'
import { SearchInput } from '../../components/ui/SearchInput'
import { useToast } from '../../context/ToastContext'
import { Pencil, Trash2, CheckSquare, Eye, EyeOff } from 'lucide-react'
import { statusQuotesApi, statusCategoriesApi } from '../../services/admin-api'
import { useAdminPaginatedCrud } from '../../hooks/useAdminPaginatedCrud'
import { useAdminCrud } from '../../hooks/useAdminCrud'
import type { StatusQuote, StatusCategory } from '../../types/status.types'
import { CategoryTabNav } from '../../components/CategoryTabNav'

interface FormState {
  category: number | null
  text: string
  author: string
  gradient_start_color: string
  gradient_end_color: string
  sort_order: number
  is_active: boolean
}

const emptyForm: FormState = { category: null, text: '', author: '', gradient_start_color: '#FF6B6B', gradient_end_color: '#4ECDC4', sort_order: 0, is_active: true }

export default function StatusQuoteListPage() {
  const { addToast } = useToast()
  const [searchParams] = useSearchParams()

  // Category filter (can come from URL param)
  const [filterCategory, setFilterCategory] = useState<string>(searchParams.get('category') || '')
  const extraParams = useMemo(() => {
    const p: Record<string, string | number | undefined> = {}
    if (filterCategory) p.category = filterCategory
    return p
  }, [filterCategory])

  const { data, loading, page, totalPages, totalCount, search, setPage, setSearch, create, update, remove } = useAdminPaginatedCrud<StatusQuote>(statusQuotesApi, extraParams)
  const { data: categories } = useAdminCrud<StatusCategory>(statusCategoriesApi)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<StatusQuote | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<StatusQuote | null>(null)

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  // Read category from URL on mount
  useEffect(() => {
    const cat = searchParams.get('category')
    if (cat) setFilterCategory(cat)
  }, [searchParams])

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }, [])

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => prev.size === data.length ? new Set() : new Set(data.map(d => d.id)))
  }, [data])

  const openAdd = () => {
    setEditingItem(null)
    setForm({ ...emptyForm, category: filterCategory ? Number(filterCategory) : null })
    setModalOpen(true)
  }

  const openEdit = (item: StatusQuote) => {
    setEditingItem(item)
    setForm({
      category: item.category,
      text: item.text,
      author: item.author,
      gradient_start_color: item.gradient_start_color,
      gradient_end_color: item.gradient_end_color,
      sort_order: item.sort_order,
      is_active: item.is_active,
    })
    setModalOpen(true)
  }

  const toggleActive = async (item: StatusQuote) => {
    try {
      await update(item.id, { is_active: !item.is_active } as any)
      addToast(`Quote ${item.is_active ? 'hidden' : 'activated'}`)
    } catch { addToast('Toggle failed', 'error') }
  }

  const handleSubmit = async () => {
    if (!form.text.trim()) { addToast('Quote text is required', 'error'); return }
    if (!form.author.trim()) { addToast('Author is required', 'error'); return }
    try {
      if (editingItem) {
        await update(editingItem.id, form as any)
        addToast('Quote updated successfully')
      } else {
        await create(form as any)
        addToast('Quote created successfully')
      }
      setForm(emptyForm); setEditingItem(null); setModalOpen(false)
    } catch {
      addToast('Operation failed. Please try again.', 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    try { await remove(deleteItem.id); addToast('Quote deleted'); setDeleteItem(null) }
    catch { addToast('Delete failed', 'error') }
  }

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds)
    await Promise.all(ids.map(id => remove(id).catch(() => null)))
    addToast(`Deleted ${ids.length} quotes`)
    setSelectedIds(new Set())
    setBulkDeleteOpen(false)
  }

  const columns: Column<StatusQuote>[] = [
    { key: 'select' as any, title: '', render: (item) => (
      <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} className="rounded cursor-pointer" onClick={e => e.stopPropagation()} />
    )},
    { key: 'text', title: 'Text', sortable: true, render: (item) => <span title={item.text} className="text-sm">{item.text.length > 60 ? item.text.slice(0, 60) + '...' : item.text}</span> },
    { key: 'author', title: 'Author', sortable: true },
    { key: 'category_name' as any, title: 'Category', render: (item: any) => item.category_name ? <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-500/10 text-indigo-400">{item.category_name}</span> : <span className="text-brand-text-muted text-xs">-</span> },
    { key: 'gradient' as any, title: 'Gradient', render: (item) => (
      <div className="rounded" style={{ width: 60, height: 20, background: `linear-gradient(to right, ${item.gradient_start_color}, ${item.gradient_end_color})` }} />
    )},
    { key: 'sort_order', title: 'Order', sortable: true },
    { key: 'is_active', title: 'Active', render: (item) => (
      <button onClick={(e) => { e.stopPropagation(); toggleActive(item) }} className="p-1" title="Toggle">
        {item.is_active ? <Eye className="h-4 w-4 text-green-400" /> : <EyeOff className="h-4 w-4 text-brand-text-muted" />}
      </button>
    )},
    { key: 'actions' as any, title: '', render: (item) => (
      <div className="flex items-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); openEdit(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-gold transition-colors"><Pencil className="h-4 w-4" /></button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteItem(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-status-error transition-colors"><Trash2 className="h-4 w-4" /></button>
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      <CategoryTabNav />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-text">Status Quotes</h1>
        <div className="flex items-center gap-3">
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
            <option value="">All Categories</option>
            {(categories as StatusCategory[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <SearchInput value={search} onChange={setSearch} placeholder="Search quotes..." className="w-64" />
          <button onClick={openAdd} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">+ Add Quote</button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-brand-dark-card rounded-xl border border-brand-gold/30">
          <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm text-brand-text hover:text-brand-gold transition-colors">
            <CheckSquare className="h-4 w-4" /> {selectedIds.size === data.length ? 'Deselect Page' : 'Select Page'}
          </button>
          <span className="text-sm text-brand-text-muted">{selectedIds.size} selected</span>
          <button onClick={() => setBulkDeleteOpen(true)} className="ml-auto px-4 py-1.5 bg-status-error text-white text-sm rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2">
            <Trash2 className="h-4 w-4" /> Delete Selected
          </button>
        </div>
      )}

      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading ? <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div> : <DataTable columns={columns} data={data} />}
        <Pagination currentPage={page} totalPages={totalPages} totalCount={totalCount} onPageChange={setPage} />
      </div>

      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} title={editingItem ? 'Edit Quote' : 'Add Quote'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Category</label>
            <select value={form.category ?? ''} onChange={e => setForm(f => ({ ...f, category: e.target.value ? Number(e.target.value) : null }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
              <option value="">-- No Category --</option>
              {(categories as StatusCategory[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Quote Text</label>
            <textarea value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} rows={4} maxLength={500} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50 resize-none" />
            <span className={`text-xs mt-1 block ${form.text.length > 300 ? 'text-status-error' : 'text-brand-text-muted'}`}>{form.text.length}/300 recommended</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Author</label>
            <input value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Gradient Start</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.gradient_start_color} onChange={e => setForm(f => ({ ...f, gradient_start_color: e.target.value }))} className="h-10 w-10 rounded border border-brand-dark-border cursor-pointer" />
                <input value={form.gradient_start_color} onChange={e => setForm(f => ({ ...f, gradient_start_color: e.target.value }))} className="flex-1 bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Gradient End</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.gradient_end_color} onChange={e => setForm(f => ({ ...f, gradient_end_color: e.target.value }))} className="h-10 w-10 rounded border border-brand-dark-border cursor-pointer" />
                <input value={form.gradient_end_color} onChange={e => setForm(f => ({ ...f, gradient_end_color: e.target.value }))} className="flex-1 bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Preview</label>
            <div className="h-8 rounded-lg" style={{ background: `linear-gradient(to right, ${form.gradient_start_color}, ${form.gradient_end_color})` }} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Sort Order</label>
              <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-brand-text-muted">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
                Active
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">Save</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Quote" message={`Delete this quote by "${deleteItem?.author}"? This cannot be undone.`} confirmText="Delete" variant="danger" />
      <ConfirmDialog isOpen={bulkDeleteOpen} onClose={() => setBulkDeleteOpen(false)} onConfirm={handleBulkDelete} title="Bulk Delete" message={`Delete ${selectedIds.size} quote(s)? This cannot be undone.`} confirmText={`Delete ${selectedIds.size}`} variant="danger" />
    </div>
  )
}
