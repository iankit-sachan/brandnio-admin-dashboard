import { useMemo, useCallback } from 'react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { useToast } from '../../context/ToastContext'
import { ArrowUp, ArrowDown } from 'lucide-react'
import { posterCategoriesApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'

interface PosterCategory {
  id: number
  name: string
  slug: string
  sort_order: number
  is_active: boolean
  poster_count?: number
  parent?: number | null
}

export default function PosterHomeSectionsPage() {
  const { addToast } = useToast()
  const { data, loading, update } = useAdminCrud<PosterCategory>(posterCategoriesApi)

  // Only parent categories (home sections) sorted by sort_order
  const parentCategories = useMemo(
    () => data.filter(c => !c.parent).sort((a, b) => a.sort_order - b.sort_order),
    [data]
  )

  // Inline toggle active
  const toggleActive = useCallback(async (item: PosterCategory) => {
    try {
      await update(item.id, { is_active: !item.is_active } as any)
      addToast(`"${item.name}" ${!item.is_active ? 'activated' : 'deactivated'}`)
    } catch {
      addToast('Toggle failed', 'error')
    }
  }, [update, addToast])

  // Reorder
  const moveItem = useCallback(async (item: PosterCategory, direction: 'up' | 'down') => {
    const idx = parentCategories.findIndex(d => d.id === item.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= parentCategories.length) return

    const other = parentCategories[swapIdx]
    try {
      await update(item.id, { sort_order: other.sort_order } as any)
      await update(other.id, { sort_order: item.sort_order } as any)
      addToast('Order updated')
    } catch {
      addToast('Reorder failed', 'error')
    }
  }, [parentCategories, update, addToast])

  const columns: Column<PosterCategory>[] = [
    {
      key: 'sort_order', title: '#',
      render: (item) => {
        const idx = parentCategories.findIndex(d => d.id === item.id)
        return (
          <div className="flex items-center gap-1">
            <span className="text-brand-text-muted w-5 text-center">{item.sort_order}</span>
            <button
              onClick={(e) => { e.stopPropagation(); moveItem(item, 'up') }}
              disabled={idx === 0}
              className="p-0.5 rounded hover:bg-brand-dark-hover disabled:opacity-20 text-brand-text-muted hover:text-brand-gold transition-colors"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); moveItem(item, 'down') }}
              disabled={idx === parentCategories.length - 1}
              className="p-0.5 rounded hover:bg-brand-dark-hover disabled:opacity-20 text-brand-text-muted hover:text-brand-gold transition-colors"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      },
    },
    {
      key: 'name', title: 'Category Name',
      render: (item) => (
        <div>
          <span className="font-medium text-brand-text">{item.name}</span>
          <span className="block text-xs text-brand-text-muted">{item.slug}</span>
        </div>
      ),
    },
    {
      key: 'poster_count', title: 'Posters',
      render: (item) => (
        <span className="text-brand-text-muted">{item.poster_count ?? '—'}</span>
      ),
    },
    {
      key: 'is_active', title: 'Status',
      render: (item) => (
        <button
          onClick={(e) => { e.stopPropagation(); toggleActive(item) }}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${item.is_active ? 'bg-green-500' : 'bg-gray-600'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${item.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-text">Poster Home Sections</h1>
      </div>

      <p className="text-sm text-brand-text-muted">
        Manage which poster categories appear as sections on the Android Home tab. Use arrows to reorder, toggle to show/hide.
      </p>

      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading
          ? <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div>
          : <DataTable columns={columns} data={parentCategories} />
        }
      </div>
    </div>
  )
}
