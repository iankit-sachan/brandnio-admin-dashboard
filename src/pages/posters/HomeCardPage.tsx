import { useState, useMemo, useCallback } from 'react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { Pencil, Trash2 } from 'lucide-react'
import { homeCardsApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'

interface HomeCard {
  id: number
  card_type: string
  title: string
  image_url: string
  redirect_slug: string
  sort_order: number
  is_active: boolean
}

interface FormState {
  card_type: string
  title: string
  image_url: string
  redirect_slug: string
  sort_order: number
  is_active: boolean
}

const emptyForm: FormState = {
  card_type: 'header_card',
  title: '',
  image_url: '',
  redirect_slug: '',
  sort_order: 0,
  is_active: true,
}

const CARD_TYPE_OPTIONS = [
  { value: 'header_card', label: 'Header Card' },
  { value: 'festival_banner', label: 'Festival Banner' },
  { value: 'stitch_video_ads', label: 'Video Ads' },
  { value: 'stitch_hindu_new_year', label: 'Hindu New Year' },
  { value: 'stitch_ugadi', label: 'Ugadi' },
]

const CARD_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  CARD_TYPE_OPTIONS.map(o => [o.value, o.label])
)

export default function HomeCardPage() {
  const { addToast } = useToast()
  const { data, loading, create, update, remove } = useAdminCrud<HomeCard>(homeCardsApi)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<HomeCard | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<HomeCard | null>(null)
  const [filterType, setFilterType] = useState<string>('')

  // Sorted data by sort_order, filtered by card_type
  const sortedData = useMemo(() => {
    let filtered = [...data]
    if (filterType) filtered = filtered.filter(d => d.card_type === filterType)
    return filtered.sort((a, b) => a.sort_order - b.sort_order)
  }, [data, filterType])

  const openAdd = () => { setEditingItem(null); setForm(emptyForm); setModalOpen(true) }

  const openEdit = (item: HomeCard) => {
    setEditingItem(item)
    setForm({
      card_type: item.card_type || 'header_card',
      title: item.title || '',
      image_url: item.image_url || '',
      redirect_slug: item.redirect_slug || '',
      sort_order: item.sort_order,
      is_active: item.is_active,
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.image_url.trim()) { addToast('Image URL is required', 'error'); return }
    try {
      if (editingItem) {
        await update(editingItem.id, form)
        addToast('Home card updated successfully')
      } else {
        await create(form)
        addToast('Home card created successfully')
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
      addToast('Home card deleted successfully')
      setDeleteItem(null)
    } catch {
      addToast('Delete failed. Please try again.', 'error')
    }
  }

  // Inline toggle active
  const toggleActive = useCallback(async (item: HomeCard) => {
    try {
      const updated = await update(item.id, { is_active: !item.is_active } as any)
      if (updated) addToast(`Card "${item.title || item.card_type}" ${!item.is_active ? 'activated' : 'deactivated'}`)
    } catch {
      addToast('Toggle failed', 'error')
    }
  }, [update, addToast])

  const columns: Column<HomeCard>[] = [
    {
      key: 'image_url', title: 'Image',
      render: (item) => (
        item.image_url
          ? <img src={item.image_url} alt={item.title || 'card'} className="h-12 w-12 rounded-lg object-cover bg-brand-dark-hover" />
          : <div className="h-12 w-12 rounded-lg bg-brand-dark-hover flex items-center justify-center text-brand-text-muted text-xs">No img</div>
      ),
    },
    {
      key: 'card_type', title: 'Card Type', sortable: true,
      render: (item) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-gold/10 text-brand-gold">
          {CARD_TYPE_LABELS[item.card_type] || item.card_type}
        </span>
      ),
    },
    { key: 'title', title: 'Title', sortable: true, render: (item) => <span className="font-medium text-brand-text">{item.title || '—'}</span> },
    { key: 'sort_order', title: 'Sort Order', sortable: true, render: (item) => <span className="text-brand-text-muted">{item.sort_order}</span> },
    {
      key: 'is_active', title: 'Active',
      render: (item) => (
        <button
          onClick={(e) => { e.stopPropagation(); toggleActive(item) }}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${item.is_active ? 'bg-green-500' : 'bg-gray-600'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${item.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      ),
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

  const inputClass = "w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50"

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-text">Home Cards</h1>
        <button onClick={openAdd} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">+ Add Card</button>
      </div>

      <p className="text-sm text-brand-text-muted">
        Manage the cards displayed on the app home screen. Toggle to show/hide cards.
      </p>

      {/* Filter by card type */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-brand-text-muted">Filter by type:</label>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-1.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50"
        >
          <option value="">All Types</option>
          {CARD_TYPE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading
          ? <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div>
          : <DataTable columns={columns} data={sortedData} />
        }
      </div>

      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false) }} title={editingItem ? 'Edit Home Card' : 'Add Home Card'} size="lg">
        <div className="space-y-4">
          {/* Card Type */}
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Card Type</label>
            <select value={form.card_type} onChange={e => setForm(f => ({ ...f, card_type: e.target.value }))} className={inputClass}>
              {CARD_TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Title (optional)</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Festival Special" className={inputClass} />
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Image URL <span className="text-status-error">*</span></label>
            <input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." className={inputClass} />
          </div>

          {/* Redirect Slug */}
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Redirect Slug (optional)</label>
            <input value={form.redirect_slug} onChange={e => setForm(f => ({ ...f, redirect_slug: e.target.value }))} placeholder="e.g. festival-special" className={inputClass} />
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Sort Order</label>
            <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} className={inputClass} />
            <p className="text-xs text-brand-text-muted mt-1">Lower numbers appear first on the home screen</p>
          </div>

          {/* Active */}
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
            <label className="text-sm text-brand-text-muted">Active (visible on app)</label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false) }} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">Save</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Home Card" message={`Delete "${deleteItem?.title || deleteItem?.card_type}"? This will remove the card from the home screen.`} confirmText="Delete" variant="danger" />
    </div>
  )
}
