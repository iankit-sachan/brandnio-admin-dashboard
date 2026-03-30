import { useState } from 'react'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { Pencil, Trash2 } from 'lucide-react'
import { feedItemsApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'
import type { FeedItem } from '../../types'

interface FormState {
  thumbnail_url: string | null
  image_url: string | null
  title: string
  subtitle: string
  description: string
  category: string
  section_type: 'trending' | 'inspiration' | 'category'
  template_count: number
  is_trending: boolean
  is_editors_choice: boolean
  cta_text: string
  cta_url: string
  sort_order: number
  is_active: boolean
}

const emptyForm: FormState = {
  thumbnail_url: null,
  image_url: null,
  title: '',
  subtitle: '',
  description: '',
  category: '',
  section_type: 'trending',
  template_count: 0,
  is_trending: false,
  is_editors_choice: false,
  cta_text: '',
  cta_url: '',
  sort_order: 0,
  is_active: true,
}

export default function FeedItemListPage() {
  const { addToast } = useToast()
  const { data, loading, create, update, remove } = useAdminCrud<FeedItem>(feedItemsApi)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<FeedItem | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<FeedItem | null>(null)
  const [search, setSearch] = useState('')
  const [filterSectionType, setFilterSectionType] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterActive, setFilterActive] = useState('')

  const openAdd = () => {
    setEditingItem(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (item: FeedItem) => {
    setEditingItem(item)
    setForm({
      thumbnail_url: item.thumbnail_url,
      image_url: item.image_url,
      title: item.title,
      subtitle: item.subtitle,
      description: item.description,
      category: item.category,
      section_type: item.section_type,
      template_count: item.template_count,
      is_trending: item.is_trending,
      is_editors_choice: item.is_editors_choice,
      cta_text: item.cta_text,
      cta_url: item.cta_url,
      sort_order: item.sort_order,
      is_active: item.is_active,
    })
    setModalOpen(true)
  }

  const openDelete = (item: FeedItem) => setDeleteItem(item)

  const handleSubmit = async () => {
    if (!form.title.trim()) { addToast('Title is required', 'error'); return }
    try {
      if (editingItem) {
        await update(editingItem.id, form)
        addToast('Feed item updated successfully')
      } else {
        await create(form)
        addToast('Feed item created successfully')
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
      addToast('Feed item deleted successfully')
      setDeleteItem(null)
    } catch {
      addToast('Delete failed. Please try again.', 'error')
    }
  }

  // Derive unique categories for filter
  const uniqueCategories = [...new Set(data.map(d => d.category).filter(Boolean))]

  // Filter data
  const filtered = data.filter(item => {
    if (search && !item.title.toLowerCase().includes(search.toLowerCase())) return false
    if (filterSectionType && item.section_type !== filterSectionType) return false
    if (filterCategory && item.category !== filterCategory) return false
    if (filterActive === 'active' && !item.is_active) return false
    if (filterActive === 'inactive' && item.is_active) return false
    return true
  })

  const columns: Column<FeedItem>[] = [
    { key: 'title', title: 'Title', sortable: true },
    { key: 'category', title: 'Category', sortable: true },
    { key: 'section_type', title: 'Section Type', sortable: true, render: (item) => (
      <span className="capitalize">{item.section_type}</span>
    )},
    { key: 'is_trending', title: 'Trending', render: (item) => item.is_trending ? <span className="text-brand-gold">Yes</span> : <span className="text-brand-text-muted">No</span> },
    { key: 'is_editors_choice', title: "Editor's Choice", render: (item) => item.is_editors_choice ? <span className="text-brand-gold">Yes</span> : <span className="text-brand-text-muted">No</span> },
    { key: 'favorite_count', title: 'Favorites', sortable: true },
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
        <h1 className="text-2xl font-bold text-brand-text">Feed Items</h1>
        <button onClick={openAdd} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">+ Add Feed Item</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by title..."
          className="bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50 w-64"
        />
        <select value={filterSectionType} onChange={e => setFilterSectionType(e.target.value)} className="bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
          <option value="">All Sections</option>
          <option value="trending">Trending</option>
          <option value="inspiration">Inspiration</option>
          <option value="category">Category</option>
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
          <option value="">All Categories</option>
          {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterActive} onChange={e => setFilterActive(e.target.value)} className="bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading ? <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div> : <DataTable columns={columns} data={filtered} />}
      </div>

      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} title={editingItem ? 'Edit Feed Item' : 'Add Feed Item'}>
        <div className="space-y-4">
          <ImageUpload label="Thumbnail Image" value={form.thumbnail_url} onChange={v => setForm(f => ({ ...f, thumbnail_url: v }))} aspectHint="Feed thumbnail" />
          <ImageUpload label="Full Image" value={form.image_url} onChange={v => setForm(f => ({ ...f, image_url: v }))} aspectHint="Feed full image" />
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Subtitle</label>
            <input value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Category</label>
              <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Section Type</label>
              <select value={form.section_type} onChange={e => setForm(f => ({ ...f, section_type: e.target.value as FormState['section_type'] }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
                <option value="trending">Trending</option>
                <option value="inspiration">Inspiration</option>
                <option value="category">Category</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Template Count</label>
              <input type="number" value={form.template_count} onChange={e => setForm(f => ({ ...f, template_count: Number(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Sort Order</label>
              <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">CTA Text</label>
              <input value={form.cta_text} onChange={e => setForm(f => ({ ...f, cta_text: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">CTA URL</label>
              <input value={form.cta_url} onChange={e => setForm(f => ({ ...f, cta_url: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_trending} onChange={e => setForm(f => ({ ...f, is_trending: e.target.checked }))} className="rounded" />
              <label className="text-sm text-brand-text-muted">Trending</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_editors_choice} onChange={e => setForm(f => ({ ...f, is_editors_choice: e.target.checked }))} className="rounded" />
              <label className="text-sm text-brand-text-muted">Editor's Choice</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
              <label className="text-sm text-brand-text-muted">Active</label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">Save</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Feed Item" message={`Are you sure you want to delete "${deleteItem?.title}"? This action cannot be undone.`} confirmText="Delete" variant="danger" />
    </div>
  )
}
