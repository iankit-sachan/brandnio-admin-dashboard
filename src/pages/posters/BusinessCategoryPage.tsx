import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Trash2, Upload } from 'lucide-react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { posterCategoriesApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'

interface BusinessCategory {
  id: number
  icon_url: string
  name: string
  slug: string
  poster_count: number
  is_active: boolean
}

interface FormState {
  icon_url: string | null
  name: string
  slug: string
  is_active: boolean
}

const emptyForm: FormState = { icon_url: null, name: '', slug: '', is_active: true }

const inputClass = 'w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function BusinessCategoryPage() {
  const { addToast } = useToast()
  const navigate = useNavigate()
  const { data, loading, error, create, update, remove, refresh } = useAdminCrud<BusinessCategory>(posterCategoriesApi)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<BusinessCategory | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<BusinessCategory | null>(null)

  const openAdd = () => { setEditingItem(null); setForm(emptyForm); setModalOpen(true) }
  const openEdit = (item: BusinessCategory) => {
    setEditingItem(item)
    setForm({ icon_url: item.icon_url, name: item.name, slug: item.slug, is_active: item.is_active })
    setModalOpen(true)
  }

  const handleNameChange = (name: string) => {
    setForm(f => ({ ...f, name, slug: editingItem ? f.slug : generateSlug(name) }))
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) { addToast('Name is required', 'error'); return }
    if (!form.slug.trim()) { addToast('Slug is required', 'error'); return }
    if (data.some(d => d.slug === form.slug && d.id !== editingItem?.id)) { addToast('A category with this slug already exists', 'error'); return }
    try {
      if (editingItem) {
        await update(editingItem.id, form)
        addToast('Category updated successfully')
      } else {
        await create(form)
        addToast('Category created successfully')
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
      addToast('Category deleted successfully')
      setDeleteItem(null)
    } catch {
      addToast('Delete failed. Please try again.', 'error')
    }
  }

  const columns: Column<BusinessCategory>[] = [
    {
      key: 'icon_url',
      title: 'Icon',
      render: (item) => (
        <img src={item.icon_url} alt={item.name} className="w-8 h-8 rounded-lg object-cover bg-brand-dark" />
      ),
      className: 'w-16',
    },
    { key: 'name', title: 'Name', sortable: true },
    {
      key: 'slug',
      title: 'Slug',
      render: (item) => <code className="text-xs bg-brand-dark px-2 py-1 rounded text-brand-text-muted">{item.slug}</code>,
    },
    {
      key: 'poster_count',
      title: 'Poster Count',
      sortable: true,
      render: (item) => <span className="text-brand-text">{item.poster_count}</span>,
    },
    {
      key: 'is_active',
      title: 'Status',
      render: (item) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.is_active ? 'bg-status-success/20 text-status-success' : 'bg-brand-dark-hover text-brand-text-muted'}`}>
          {item.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (item) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/posters/business?upload=1&category=${item.id}`) }}
            className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-indigo transition-colors cursor-pointer"
            title={`Bulk upload posters to "${item.name}"`}
            aria-label={`Bulk upload posters to ${item.name}`}
          >
            <Upload className="h-4 w-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); openEdit(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-gold transition-colors cursor-pointer" title="Edit category" aria-label="Edit category"><Pencil className="h-4 w-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteItem(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-status-error transition-colors cursor-pointer" title="Delete category" aria-label="Delete category"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-text">Business Categories</h1>
        <button onClick={openAdd} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">+ Add Category</button>
      </div>

      {/* Data Table */}
      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <p className="text-status-error text-sm">{error}</p>
            <button onClick={refresh} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">Retry</button>
          </div>
        ) : (
          <DataTable columns={columns} data={data} />
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} title={editingItem ? 'Edit Category' : 'Add Category'}>
        <div className="space-y-4">
          <ImageUpload label="Category Icon" value={form.icon_url} onChange={v => setForm(f => ({ ...f, icon_url: v }))} aspectHint="48x48" />
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Name</label>
            <input value={form.name} onChange={e => handleNameChange(e.target.value)} className={inputClass} placeholder="Enter category name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Slug</label>
            <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className={inputClass} placeholder="auto-generated-slug" />
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

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Category" message={`Are you sure you want to delete "${deleteItem?.name}"? This action cannot be undone.`} confirmText="Delete" variant="danger" />
    </div>
  )
}
