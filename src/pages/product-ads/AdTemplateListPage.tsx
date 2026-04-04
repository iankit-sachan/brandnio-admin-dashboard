import { useState, useEffect } from 'react'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Pagination } from '../../components/ui/Pagination'
import { SearchInput } from '../../components/ui/SearchInput'
import { useToast } from '../../context/ToastContext'
import { Pencil, Trash2 } from 'lucide-react'
import { adTemplatesApi, adCategoriesApi, adConfigApi } from '../../services/admin-api'
import { useAdminPaginatedCrud } from '../../hooks/useAdminPaginatedCrud'
import type { AdTemplate, ProductAdCategory } from '../../types'

interface FormState {
  image_url: string | null
  title: string
  category: number | string
  aspect_ratio: string
  is_premium: boolean
  is_active: boolean
  template_data_json: string
}

const emptyForm: FormState = { image_url: null, title: '', category: '', aspect_ratio: '1:1', is_premium: false, is_active: true, template_data_json: '{}' }

export default function AdTemplateListPage() {
  const { addToast } = useToast()
  const { data, loading, page, totalPages, totalCount, search, setPage, setSearch, create, update, remove } = useAdminPaginatedCrud<AdTemplate>(adTemplatesApi)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<AdTemplate | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<AdTemplate | null>(null)
  const [categories, setCategories] = useState<ProductAdCategory[]>([])
  // Fallback aspect ratios - overridden by backend config if available
  const [aspectRatios, setAspectRatios] = useState<string[]>(['1:1', '4:5', '9:16', '16:9'])

  useEffect(() => {
    adCategoriesApi.list().then(r => setCategories(Array.isArray(r) ? r : []))
    adConfigApi.get().then(config => {
      if (config?.aspect_ratio_choices?.length) {
        setAspectRatios(config.aspect_ratio_choices)
      }
    }).catch(() => {})
  }, [])

  const openAdd = () => {
    setEditingItem(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (item: AdTemplate) => {
    setEditingItem(item)
    setForm({ image_url: item.image_url, title: item.title, category: item.category, aspect_ratio: item.aspect_ratio, is_premium: item.is_premium, is_active: item.is_active, template_data_json: JSON.stringify(item.template_data || {}, null, 2) })
    setModalOpen(true)
  }

  const openDelete = (item: AdTemplate) => setDeleteItem(item)

  const handleSubmit = async () => {
    if (!form.title.trim()) { addToast('Title is required', 'error'); return }
    let template_data: Record<string, unknown> = {}
    try {
      template_data = JSON.parse(form.template_data_json || '{}')
    } catch {
      addToast('Invalid JSON in Template Data', 'error')
      return
    }
    try {
      const payload = { ...form, template_data, template_data_json: undefined }
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

  const columns: Column<AdTemplate>[] = [
    { key: 'title', title: 'Template', sortable: true },
    { key: 'category', title: 'Category', sortable: true },
    { key: 'aspect_ratio', title: 'Aspect Ratio' },
    { key: 'is_premium', title: 'Premium', render: (t) => t.is_premium ? <span className="text-brand-gold">Premium</span> : <span className="text-brand-text-muted">Free</span> },
    { key: 'is_active', title: 'Status', render: (t) => t.is_active ? <span className="text-status-success">Active</span> : <span className="text-status-error">Inactive</span> },
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
        <h1 className="text-2xl font-bold text-brand-text">Ad Templates</h1>
        <div className="flex items-center gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search templates..." className="w-64" />
          <button onClick={openAdd} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">+ Add Template</button>
        </div>
      </div>
      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading ? <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div> : <DataTable columns={columns} data={data} />}
        <Pagination currentPage={page} totalPages={totalPages} totalCount={totalCount} onPageChange={setPage} />
      </div>

      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} title={editingItem ? 'Edit Template' : 'Add Template'}>
        <div className="space-y-4">
          <ImageUpload label="Template Image" value={form.image_url} onChange={v => setForm(f => ({ ...f, image_url: v }))} aspectHint="Match aspect ratio selection" />
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Category</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: Number(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
              <option value="">Select Category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Aspect Ratio</label>
            <select value={form.aspect_ratio} onChange={e => setForm(f => ({ ...f, aspect_ratio: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
              {aspectRatios.map(ar => <option key={ar} value={ar}>{ar}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Template Data (JSON)</label>
            <textarea
              className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 font-mono text-sm text-brand-text focus:outline-none focus:border-brand-gold/50"
              rows={6}
              value={form.template_data_json || '{}'}
              onChange={e => setForm(f => ({ ...f, template_data_json: e.target.value }))}
              placeholder='{"layers": [], "canvas": {}}'
            />
          </div>
          <div className="flex items-center gap-3">
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
            <button onClick={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">Save</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Template" message={`Are you sure you want to delete "${deleteItem?.title}"? This action cannot be undone.`} confirmText="Delete" variant="danger" />
    </div>
  )
}
