import { useState } from 'react'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { Pencil, Star, Power } from 'lucide-react'
import { mockMallListings } from '../../services/mock-data'
import { formatCurrency, formatDate } from '../../utils/formatters'
import type { MallListing } from '../../types'

interface EditFormState {
  image_url: string | null
  title: string
  is_featured: boolean
}

export default function MallListingModerationPage() {
  const { addToast } = useToast()
  const [data, setData] = useState<MallListing[]>([...mockMallListings])
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MallListing | null>(null)
  const [editForm, setEditForm] = useState<EditFormState>({ image_url: null, title: '', is_featured: false })
  const [toggleItem, setToggleItem] = useState<MallListing | null>(null)

  const openEdit = (item: MallListing) => {
    setEditingItem(item)
    setEditForm({ image_url: item.images?.[0] ?? null, title: item.title, is_featured: item.is_featured })
    setEditModalOpen(true)
  }

  const handleEditSubmit = () => {
    if (!editingItem) return
    setData(prev => prev.map(d => d.id === editingItem.id ? { ...d, images: editForm.image_url ? [editForm.image_url, ...d.images.slice(1)] : d.images, title: editForm.title, is_featured: editForm.is_featured } : d))
    addToast('Listing updated successfully')
    setEditModalOpen(false)
  }

  const toggleFeatured = (item: MallListing) => {
    setData(prev => prev.map(d => d.id === item.id ? { ...d, is_featured: !d.is_featured } : d))
    addToast(item.is_featured ? 'Removed from featured' : 'Marked as featured')
  }

  const openToggleActive = (item: MallListing) => setToggleItem(item)

  const handleToggleActive = () => {
    if (!toggleItem) return
    setData(prev => prev.map(d => d.id === toggleItem.id ? { ...d, is_active: !d.is_active } : d))
    addToast(toggleItem.is_active ? 'Listing deactivated' : 'Listing activated')
    setToggleItem(null)
  }

  const columns: Column<MallListing>[] = [
    { key: 'title', title: 'Listing', sortable: true },
    { key: 'user_name', title: 'Seller', sortable: true },
    { key: 'category_name', title: 'Category' },
    { key: 'price', title: 'Price', sortable: true, render: (l) => formatCurrency(l.price as number) },
    { key: 'city', title: 'City', sortable: true },
    { key: 'is_featured', title: 'Featured', render: (l) => l.is_featured ? <span className="text-brand-gold">Featured</span> : <span className="text-brand-text-muted">No</span> },
    { key: 'is_active', title: 'Status', render: (l) => l.is_active ? <span className="text-status-success">Active</span> : <span className="text-status-error">Inactive</span> },
    { key: 'view_count', title: 'Views', sortable: true },
    { key: 'created_at', title: 'Date', sortable: true, render: (l) => formatDate(l.created_at as string) },
    { key: 'actions', title: 'Actions', render: (item) => (
      <div className="flex items-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); openEdit(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-gold transition-colors" title="Edit"><Pencil className="h-4 w-4" /></button>
        <button onClick={(e) => { e.stopPropagation(); toggleFeatured(item) }} className={`p-1.5 rounded-lg hover:bg-brand-dark-hover transition-colors ${item.is_featured ? 'text-brand-gold' : 'text-brand-text-muted hover:text-brand-gold'}`} title="Toggle Featured"><Star className="h-4 w-4" /></button>
        <button onClick={(e) => { e.stopPropagation(); openToggleActive(item) }} className={`p-1.5 rounded-lg hover:bg-brand-dark-hover transition-colors ${item.is_active ? 'text-status-success hover:text-status-error' : 'text-status-error hover:text-status-success'}`} title={item.is_active ? 'Deactivate' : 'Activate'}><Power className="h-4 w-4" /></button>
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-brand-text">Brand Mall Listings</h1>
      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        <DataTable columns={columns} data={data} />
      </div>

      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Listing">
        <div className="space-y-4">
          <ImageUpload label="Listing Image" value={editForm.image_url} onChange={v => setEditForm(f => ({ ...f, image_url: v }))} />
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Title</label>
            <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={editForm.is_featured} onChange={e => setEditForm(f => ({ ...f, is_featured: e.target.checked }))} className="rounded" />
            <label className="text-sm text-brand-text-muted">Featured</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setEditModalOpen(false)} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">Cancel</button>
            <button onClick={handleEditSubmit} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">Save</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!toggleItem} onClose={() => setToggleItem(null)} onConfirm={handleToggleActive} title={toggleItem?.is_active ? 'Deactivate Listing' : 'Activate Listing'} message={`Are you sure you want to ${toggleItem?.is_active ? 'deactivate' : 'activate'} "${toggleItem?.title}"?`} confirmText={toggleItem?.is_active ? 'Deactivate' : 'Activate'} variant="warning" />
    </div>
  )
}
