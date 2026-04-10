import { useState, useMemo, useCallback } from 'react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { Pencil, Trash2 } from 'lucide-react'
import { homeCardSectionsApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'
import type { HomeCardSection } from '../../types'

interface FormState {
  section_key: string
  title: string
  subtitle: string
  badge_text: string
  cta_text: string
  redirect_slug: string
  sort_order: number
  is_active: boolean
}

const emptyForm: FormState = {
  section_key: 'product_video_ads',
  title: '',
  subtitle: '',
  badge_text: '',
  cta_text: '',
  redirect_slug: '',
  sort_order: 0,
  is_active: true,
}

const SECTION_KEY_OPTIONS = [
  { value: 'product_video_ads', label: 'Product Video Ads' },
  { value: 'hindu_new_year', label: 'Hindu New Year' },
  { value: 'ugadi_festival', label: 'Ugadi Festival' },
]

const SECTION_KEY_LABELS: Record<string, string> = Object.fromEntries(
  SECTION_KEY_OPTIONS.map(o => [o.value, o.label])
)

export default function HomeCardSectionPage() {
  const { addToast } = useToast()
  const { data, loading, create, update, remove } = useAdminCrud<HomeCardSection>(homeCardSectionsApi)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<HomeCardSection | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<HomeCardSection | null>(null)

  // Sorted data by sort_order
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => a.sort_order - b.sort_order)
  }, [data])

  const openAdd = () => { setEditingItem(null); setForm(emptyForm); setModalOpen(true) }

  const openEdit = (item: HomeCardSection) => {
    setEditingItem(item)
    setForm({
      section_key: item.section_key || 'product_video_ads',
      title: item.title || '',
      subtitle: item.subtitle || '',
      badge_text: item.badge_text || '',
      cta_text: item.cta_text || '',
      redirect_slug: item.redirect_slug || '',
      sort_order: item.sort_order,
      is_active: item.is_active,
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) { addToast('Title is required', 'error'); return }
    try {
      if (editingItem) {
        await update(editingItem.id, form)
        addToast('Section updated successfully')
      } else {
        await create(form)
        addToast('Section created successfully')
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
      addToast('Section deleted successfully')
      setDeleteItem(null)
    } catch {
      addToast('Delete failed. Please try again.', 'error')
    }
  }

  // Inline toggle active
  const toggleActive = useCallback(async (item: HomeCardSection) => {
    try {
      const updated = await update(item.id, { is_active: !item.is_active } as any)
      if (updated) addToast(`Section "${item.title}" ${!item.is_active ? 'activated' : 'deactivated'}`)
    } catch {
      addToast('Toggle failed', 'error')
    }
  }, [update, addToast])

  const columns: Column<HomeCardSection>[] = [
    {
      key: 'section_key', title: 'Section', sortable: true,
      render: (item) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-gold/10 text-brand-gold">
          {SECTION_KEY_LABELS[item.section_key] || item.section_key}
        </span>
      ),
    },
    { key: 'title', title: 'Title', sortable: true, render: (item) => <span className="font-medium text-brand-text">{item.title || '—'}</span> },
    { key: 'badge_text', title: 'Badge', render: (item) => <span className="text-brand-text-muted">{item.badge_text || '—'}</span> },
    { key: 'cta_text', title: 'CTA', render: (item) => <span className="text-brand-text-muted">{item.cta_text || '—'}</span> },
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
        <h1 className="text-2xl font-bold text-brand-text">Home Card Sections</h1>
        <button onClick={openAdd} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">+ Add Section</button>
      </div>

      <p className="text-sm text-brand-text-muted">
        Manage the card sections displayed on the app home screen. Toggle to show/hide sections.
      </p>

      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading
          ? <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div>
          : <DataTable columns={columns} data={sortedData} />
        }
      </div>

      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false) }} title={editingItem ? 'Edit Section' : 'Add Section'} size="lg">
        <div className="space-y-4">
          {/* Section Key */}
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Section Key</label>
            <select value={form.section_key} onChange={e => setForm(f => ({ ...f, section_key: e.target.value }))} className={inputClass}>
              {SECTION_KEY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Title <span className="text-status-error">*</span></label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Trending Video Ads" className={inputClass} />
          </div>

          {/* Subtitle */}
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Subtitle (optional)</label>
            <input value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} placeholder="e.g. Create stunning video ads" className={inputClass} />
          </div>

          {/* Badge Text */}
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Badge Text (optional)</label>
            <input value={form.badge_text} onChange={e => setForm(f => ({ ...f, badge_text: e.target.value }))} placeholder="e.g. TRENDING" className={inputClass} />
          </div>

          {/* CTA Text */}
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">CTA Text (optional)</label>
            <input value={form.cta_text} onChange={e => setForm(f => ({ ...f, cta_text: e.target.value }))} placeholder="e.g. View All" className={inputClass} />
          </div>

          {/* Redirect Slug */}
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Redirect Slug (optional)</label>
            <input value={form.redirect_slug} onChange={e => setForm(f => ({ ...f, redirect_slug: e.target.value }))} placeholder="e.g. product-video-ads" className={inputClass} />
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

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Section" message={`Delete "${deleteItem?.title || deleteItem?.section_key}"? This will remove the section from the home screen.`} confirmText="Delete" variant="danger" />
    </div>
  )
}
