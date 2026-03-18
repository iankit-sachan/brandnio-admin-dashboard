import { useState, useEffect } from 'react'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { Pencil, Trash2 } from 'lucide-react'
import { vbizCardTemplatesApi, vbizCardCategoriesApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'
import type { VbizCardTemplate, VbizCardCategory } from '../../types'

interface FormState {
  category: number | ''
  title: string
  thumbnail_url: string
  image_url: string
  price: string
  original_price: string
  discount_percent: number
  is_premium: boolean
  is_active: boolean
  sort_order: number
}

const emptyForm: FormState = {
  category: '', title: '', thumbnail_url: '', image_url: '',
  price: '299.00', original_price: '499.00', discount_percent: 40,
  is_premium: false, is_active: true, sort_order: 0,
}

export default function VbizCardTemplatePage() {
  const { addToast } = useToast()
  const { data, loading, create, update, remove } = useAdminCrud<VbizCardTemplate>(vbizCardTemplatesApi)
  const [categories, setCategories] = useState<VbizCardCategory[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<VbizCardTemplate | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<VbizCardTemplate | null>(null)
  const [filterCat, setFilterCat] = useState<string>('all')

  useEffect(() => {
    vbizCardCategoriesApi.list().then(cats => setCategories(cats as VbizCardCategory[])).catch(() => {})
  }, [])

  const filteredData = filterCat === 'all' ? data : data.filter(d => String(d.category) === filterCat)

  const openAdd = () => { setEditingItem(null); setForm(emptyForm); setModalOpen(true) }

  const openEdit = (item: VbizCardTemplate) => {
    setEditingItem(item)
    setForm({
      category: item.category, title: item.title,
      thumbnail_url: item.thumbnail_url, image_url: item.image_url,
      price: item.price, original_price: item.original_price,
      discount_percent: item.discount_percent, is_premium: item.is_premium,
      is_active: item.is_active, sort_order: item.sort_order,
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.category) { addToast('Category is required', 'error'); return }
    if (!form.image_url.trim()) { addToast('Image URL is required', 'error'); return }
    try {
      const payload = { ...form, thumbnail_url: form.thumbnail_url || form.image_url }
      if (editingItem) {
        await update(editingItem.id, payload)
        addToast('Template updated successfully')
      } else {
        await create(payload)
        addToast('Template created successfully')
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
      addToast('Template deleted successfully')
      setDeleteItem(null)
    } catch {
      addToast('Delete failed. Please try again.', 'error')
    }
  }

  const columns: Column<VbizCardTemplate>[] = [
    {
      key: 'image_url', title: 'Preview',
      render: (item) => (
        <img src={item.thumbnail_url || item.image_url} alt={item.title} className="w-10 h-14 object-cover rounded" />
      ),
    },
    { key: 'category_name', title: 'Category', sortable: true },
    { key: 'title', title: 'Title', sortable: true },
    {
      key: 'price', title: 'Price',
      render: (item) => (
        <div className="text-sm">
          <span className="text-brand-gold font-medium">₹{item.price}</span>
          <span className="text-brand-text-muted line-through ml-1 text-xs">₹{item.original_price}</span>
          <span className="text-green-400 ml-1 text-xs">{item.discount_percent}% OFF</span>
        </div>
      ),
    },
    {
      key: 'is_premium', title: 'Premium',
      render: (item) => item.is_premium
        ? <span className="text-yellow-400 text-xs font-medium">Premium</span>
        : <span className="text-brand-text-muted text-xs">Free</span>,
    },
    {
      key: 'is_active', title: 'Status',
      render: (item) => item.is_active
        ? <span className="text-status-success">Active</span>
        : <span className="text-status-error">Inactive</span>,
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
        <h1 className="text-2xl font-bold text-brand-text">VbizCard Templates</h1>
        <button onClick={openAdd} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">+ Add Template</button>
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-sm text-brand-text-muted">Filter:</label>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="bg-brand-dark-card border border-brand-dark-border rounded-lg px-3 py-1.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c.id} value={String(c.id)}>{c.name} ({c.category_type})</option>)}
        </select>
        <span className="text-sm text-brand-text-muted">{filteredData.length} templates</span>
      </div>

      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading
          ? <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading…</div>
          : <DataTable columns={columns} data={filteredData} />
        }
      </div>

      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false) }} title={editingItem ? 'Edit Template' : 'Add Template'} size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Category <span className="text-status-error">*</span></label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: Number(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
              <option value="">Select category…</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name} ({c.category_type})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <ImageUpload label="Card Image *" value={form.image_url || null} onChange={v => setForm(f => ({ ...f, image_url: v ?? '', thumbnail_url: v ?? '' }))} aspectHint="320x480 (portrait)" />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Price (₹)</label>
              <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Original (₹)</label>
              <input type="number" value={form.original_price} onChange={e => setForm(f => ({ ...f, original_price: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Discount %</label>
              <input type="number" value={form.discount_percent} onChange={e => setForm(f => ({ ...f, discount_percent: Number(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Sort Order</label>
            <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_premium} onChange={e => setForm(f => ({ ...f, is_premium: e.target.checked }))} className="rounded" />
              <label className="text-sm text-brand-text-muted">Premium</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
              <label className="text-sm text-brand-text-muted">Active</label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false) }} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">Save</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Template" message={`Delete this template from "${deleteItem?.category_name}"? This cannot be undone.`} confirmText="Delete" variant="danger" />
    </div>
  )
}
