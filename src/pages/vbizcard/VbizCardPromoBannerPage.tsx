import { useState, useMemo, useCallback } from 'react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import { vbizCardPromoBannersApi, uploadApi } from '../../services/admin-api'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { useAdminCrud } from '../../hooks/useAdminCrud'
import type { VbizCardPromoBanner } from '../../types'

interface FormState {
  title: string
  subtitle: string
  cta_text: string
  badge_text: string
  badge_subtitle: string
  background_color: string
  background_image_url: string
  sort_order: number
  is_active: boolean
}

const emptyForm: FormState = {
  title: '', subtitle: '', cta_text: '', badge_text: '', badge_subtitle: '',
  background_color: '#6366f1', background_image_url: '', sort_order: 0, is_active: true,
}

export default function VbizCardPromoBannerPage() {
  const { addToast } = useToast()
  const { data, loading, create, update, remove } = useAdminCrud<VbizCardPromoBanner>(vbizCardPromoBannersApi)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<VbizCardPromoBanner | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<VbizCardPromoBanner | null>(null)

  const sortedData = useMemo(() => [...data].sort((a, b) => a.sort_order - b.sort_order), [data])

  const openAdd = () => { setEditingItem(null); setForm(emptyForm); setModalOpen(true) }

  const openEdit = (item: VbizCardPromoBanner) => {
    setEditingItem(item)
    setForm({
      title: item.title, subtitle: item.subtitle, cta_text: item.cta_text,
      badge_text: item.badge_text, badge_subtitle: item.badge_subtitle,
      background_color: item.background_color, background_image_url: item.background_image_url || '',
      sort_order: item.sort_order, is_active: item.is_active,
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) { addToast('Title is required', 'error'); return }
    try {
      if (editingItem) {
        await update(editingItem.id, form)
        addToast('Promo banner updated successfully')
      } else {
        await create(form)
        addToast('Promo banner created successfully')
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
      addToast('Promo banner deleted successfully')
      setDeleteItem(null)
    } catch {
      addToast('Delete failed. Please try again.', 'error')
    }
  }

  const toggleActive = useCallback(async (item: VbizCardPromoBanner) => {
    try {
      const updated = await update(item.id, { is_active: !item.is_active } as any)
      if (updated) addToast(`Banner "${item.title}" ${!item.is_active ? 'activated' : 'deactivated'}`)
    } catch {
      addToast('Toggle failed', 'error')
    }
  }, [update, addToast])

  const moveItem = useCallback(async (item: VbizCardPromoBanner, direction: 'up' | 'down') => {
    const idx = sortedData.findIndex(d => d.id === item.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sortedData.length) return

    const other = sortedData[swapIdx]
    try {
      await update(item.id, { sort_order: other.sort_order } as any)
      await update(other.id, { sort_order: item.sort_order } as any)
      addToast('Order updated')
    } catch {
      addToast('Reorder failed', 'error')
    }
  }, [sortedData, update, addToast])

  const columns: Column<VbizCardPromoBanner>[] = [
    {
      key: 'sort_order', title: '#', sortable: true,
      render: (item) => {
        const idx = sortedData.findIndex(d => d.id === item.id)
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
              disabled={idx === sortedData.length - 1}
              className="p-0.5 rounded hover:bg-brand-dark-hover disabled:opacity-20 text-brand-text-muted hover:text-brand-gold transition-colors"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      },
    },
    { key: 'title', title: 'Title', sortable: true, render: (item) => <span className="font-medium text-brand-text">{item.title}</span> },
    { key: 'subtitle', title: 'Subtitle', render: (item) => <span className="text-brand-text-muted text-sm truncate max-w-[200px] block">{item.subtitle}</span> },
    { key: 'badge_text', title: 'Badge', render: (item) => <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-brand-gold/20 text-brand-gold">{item.badge_text}</span> },
    {
      key: 'background_color', title: 'Color',
      render: (item) => (
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded border border-brand-dark-border" style={{ backgroundColor: item.background_color }} />
          <span className="text-xs text-brand-text-muted">{item.background_color}</span>
        </div>
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
        <h1 className="text-2xl font-bold text-brand-text">VC Promo Banners</h1>
        <button onClick={openAdd} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">+ Add Banner</button>
      </div>

      <p className="text-sm text-brand-text-muted">
        Manage promotional banners shown on the VbizCard screen. Use arrows to reorder, toggle to show/hide.
      </p>

      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading
          ? <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div>
          : <DataTable columns={columns} data={sortedData} />
        }
      </div>

      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false) }} title={editingItem ? 'Edit Promo Banner' : 'Add Promo Banner'} size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Upgrade to Premium" className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Subtitle</label>
            <input value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} placeholder="e.g. Get 50% off on all plans" className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">CTA Text</label>
            <input value={form.cta_text} onChange={e => setForm(f => ({ ...f, cta_text: e.target.value }))} placeholder="e.g. Try Now" className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Badge Text</label>
              <input value={form.badge_text} onChange={e => setForm(f => ({ ...f, badge_text: e.target.value }))} placeholder="e.g. NEW" className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Badge Subtitle</label>
              <input value={form.badge_subtitle} onChange={e => setForm(f => ({ ...f, badge_subtitle: e.target.value }))} placeholder="e.g. Limited time" className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Background Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={form.background_color} onChange={e => setForm(f => ({ ...f, background_color: e.target.value }))} className="h-10 w-10 rounded border border-brand-dark-border cursor-pointer bg-transparent" />
              <input value={form.background_color} onChange={e => setForm(f => ({ ...f, background_color: e.target.value }))} placeholder="#6366f1" className="flex-1 bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
              <div className="h-10 w-20 rounded-lg border border-brand-dark-border" style={{ backgroundColor: form.background_color }} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Background Image</label>
            <ImageUpload label="Banner Background" value={form.background_image_url || null} onChange={(url) => setForm(f => ({ ...f, background_image_url: url || '' }))} aspectHint="Landscape, 1200x400" />
            <p className="text-xs text-brand-text-muted mt-1">Overrides background color when set</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Sort Order</label>
            <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
            <p className="text-xs text-brand-text-muted mt-1">Lower numbers appear first</p>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
            <label className="text-sm text-brand-text-muted">Active (visible on app)</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false) }} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">Save</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Promo Banner" message={`Delete "${deleteItem?.title}"? This will remove the banner from the VbizCard screen.`} confirmText="Delete" variant="danger" />
    </div>
  )
}
