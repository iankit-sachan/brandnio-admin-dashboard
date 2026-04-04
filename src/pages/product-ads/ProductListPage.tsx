import { useState } from 'react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Pagination } from '../../components/ui/Pagination'
import { SearchInput } from '../../components/ui/SearchInput'
import { useToast } from '../../context/ToastContext'
import { Trash2 } from 'lucide-react'
import { productsApi } from '../../services/admin-api'
import { useAdminPaginatedCrud } from '../../hooks/useAdminPaginatedCrud'
import type { Product } from '../../types'

export default function ProductListPage() {
  const { addToast } = useToast()
  const { data, loading, page, totalPages, totalCount, search, setPage, setSearch, remove } = useAdminPaginatedCrud<Product>(productsApi)
  const [deleteItem, setDeleteItem] = useState<Product | null>(null)

  const handleDelete = async () => {
    if (!deleteItem) return
    try {
      await remove(deleteItem.id)
      addToast('Product deleted successfully')
      setDeleteItem(null)
    } catch {
      addToast('Delete failed. Please try again.', 'error')
    }
  }

  const columns: Column<Product>[] = [
    { key: 'image_url', title: 'Image', render: (p) => p.image_url ? <img src={p.image_url} alt={p.name} className="h-8 w-8 rounded object-cover" /> : <div className="h-8 w-8 rounded bg-brand-dark-border/50" /> },
    { key: 'name', title: 'Name', sortable: true },
    { key: 'user_name', title: 'User', sortable: true },
    { key: 'price', title: 'Price', render: (p) => <span>₹{p.price}</span> },
    { key: 'discount_price', title: 'Discount', render: (p) => p.discount_price != null ? <span>₹{p.discount_price}</span> : <span className="text-brand-text-muted">—</span> },
    { key: 'category', title: 'Category', sortable: true },
    { key: 'is_active', title: 'Status', render: (p) => p.is_active ? <span className="text-status-success">Active</span> : <span className="text-status-error">Inactive</span> },
    { key: 'created_at', title: 'Created' },
    { key: 'actions', title: 'Actions', render: (item) => (
      <div className="flex items-center gap-2">
        <button onClick={(e) => { e.stopPropagation(); setDeleteItem(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-status-error transition-colors"><Trash2 className="h-4 w-4" /></button>
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Products</h1>
          <p className="text-sm text-brand-text-muted mt-1">User-created products for ad generation</p>
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search products..." className="w-64" />
      </div>
      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading ? <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div> : <DataTable columns={columns} data={data} />}
        <Pagination currentPage={page} totalPages={totalPages} totalCount={totalCount} onPageChange={setPage} />
      </div>

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Product" message={`Are you sure you want to delete "${deleteItem?.name}"? This action cannot be undone.`} confirmText="Delete" variant="danger" />
    </div>
  )
}
