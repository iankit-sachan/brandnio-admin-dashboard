import { useState } from 'react'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Pagination } from '../../components/ui/Pagination'
import { SearchInput } from '../../components/ui/SearchInput'
import { useToast } from '../../context/ToastContext'
import { Pencil, Trash2 } from 'lucide-react'
import { postersApi, posterCategoriesApi } from '../../services/admin-api'
import { useAdminPaginatedCrud } from '../../hooks/useAdminPaginatedCrud'
import { useAdminCrud } from '../../hooks/useAdminCrud'
import { formatNumber } from '../../utils/formatters'
import QuickStats from '../../components/ui/QuickStats'
import type { Poster, AspectRatio } from '../../types'

interface FormState {
  thumbnail_url: string | null
  image_url: string | null
  title: string
  category: number
  is_premium: boolean
  aspect_ratio: AspectRatio
}

const emptyForm: FormState = { thumbnail_url: null, image_url: null, title: '', category: 1, is_premium: false, aspect_ratio: '1:1' }

export default function PosterListPage() {
  const { addToast } = useToast()
  const { data, loading, page, totalPages, totalCount, search, setPage, setSearch, create, update, remove } = useAdminPaginatedCrud<Poster>(postersApi)
  const { data: categories } = useAdminCrud(posterCategoriesApi)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Poster | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<Poster | null>(null)

  const openAdd = () => {
    setEditingItem(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (item: Poster) => {
    setEditingItem(item)
    setForm({ thumbnail_url: item.thumbnail_url, image_url: item.image_url, title: item.title, category: item.category, is_premium: item.is_premium, aspect_ratio: item.aspect_ratio })
    setModalOpen(true)
  }

  const openDelete = (item: Poster) => setDeleteItem(item)

  const handleSubmit = async () => {
    if (!form.title.trim()) { addToast('Title is required', 'error'); return }
    try {
      if (editingItem) {
        await update(editingItem.id, form)
        addToast('Poster updated successfully')
      } else {
        await create(form)
        addToast('Poster created successfully')
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
      addToast('Poster deleted successfully')
      setDeleteItem(null)
    } catch {
      addToast('Delete failed. Please try again.', 'error')
    }
  }

  const columns: Column<Poster>[] = [
    { key: 'thumbnail_url', title: 'Image', render: (p) => (
      p.thumbnail_url || p.image_url ? (
        <img src={p.thumbnail_url || p.image_url || ''} alt={p.title} className="w-12 h-12 rounded object-cover" />
      ) : (
        <div className="w-12 h-12 rounded bg-gray-700 flex items-center justify-center text-gray-400 text-xs">No img</div>
      )
    )},
    { key: 'title', title: 'Title', sortable: true },
    { key: 'category_name', title: 'Category', sortable: true },
    { key: 'aspect_ratio', title: 'Ratio' },
    { key: 'is_premium', title: 'Premium', render: (p) => p.is_premium ? <span className="text-brand-gold">Premium</span> : <span className="text-brand-text-muted">Free</span> },
    { key: 'download_count', title: 'Downloads', sortable: true, render: (p) => formatNumber(p.download_count as number) },
    { key: 'share_count', title: 'Shares', sortable: true, render: (p) => formatNumber(p.share_count as number) },
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
        <h1 className="text-2xl font-bold text-brand-text">Poster Templates</h1>
        <div className="flex items-center gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search posters..." className="w-64" />
          <button onClick={openAdd} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">+ Add Poster</button>
        </div>
      </div>
      <QuickStats stats={[{ label: 'Total', count: totalCount }]} />
      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading ? <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div> : <DataTable columns={columns} data={data} />}
        <Pagination currentPage={page} totalPages={totalPages} totalCount={totalCount} onPageChange={setPage} />
      </div>

      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} title={editingItem ? 'Edit Poster' : 'Add Poster'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <ImageUpload label="Thumbnail" value={form.thumbnail_url} onChange={v => setForm(f => ({ ...f, thumbnail_url: v }))} aspectHint="300x300" />
            <ImageUpload label="Full Image" value={form.image_url} onChange={v => setForm(f => ({ ...f, image_url: v }))} aspectHint="1080x1080" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Category</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: Number(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
              {categories.filter((c: any) => !c.parent).map((c: any) => {
                const children = categories.filter((sub: any) => sub.parent === c.id)
                return [
                  <option key={c.id} value={c.id}>{c.name}</option>,
                  ...children.map((sub: any) => <option key={sub.id} value={sub.id}>&nbsp;&nbsp;└ {sub.name}</option>)
                ]
              })}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Aspect Ratio</label>
            <select value={form.aspect_ratio} onChange={e => setForm(f => ({ ...f, aspect_ratio: e.target.value as AspectRatio }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
              <option value="1:1">1:1</option>
              <option value="4:5">4:5</option>
              <option value="9:16">9:16</option>
              <option value="16:9">16:9</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_premium} onChange={e => setForm(f => ({ ...f, is_premium: e.target.checked }))} className="rounded" />
            <label className="text-sm text-brand-text-muted">Premium</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">Save</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Poster" message={`Are you sure you want to delete "${deleteItem?.title}"? This action cannot be undone.`} confirmText="Delete" variant="danger" />
    </div>
  )
}
