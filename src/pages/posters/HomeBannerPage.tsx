import { useState, useMemo, useCallback } from 'react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { useToast } from '../../context/ToastContext'
import { Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import { homeBannersApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'
import type { HomeBanner } from '../../types'

interface FormState {
  title: string
  cta_text: string
  preview_image_1: string
  preview_image_2: string
  preview_image_3: string
  preview_image_4: string
  preview_image_5: string
  preview_image_6: string
  gradient_start_color: string
  gradient_center_color: string
  gradient_end_color: string
  target_category_slug: string
  target_category_name: string
  position_after_section: number
  sort_order: number
  is_active: boolean
}

const emptyForm: FormState = {
  title: '',
  cta_text: '',
  preview_image_1: '',
  preview_image_2: '',
  preview_image_3: '',
  preview_image_4: '',
  preview_image_5: '',
  preview_image_6: '',
  gradient_start_color: '',
  gradient_center_color: '',
  gradient_end_color: '',
  target_category_slug: '',
  target_category_name: '',
  position_after_section: 0,
  sort_order: 0,
  is_active: true,
}

export default function HomeBannerPage() {
  const { addToast } = useToast()
  const { data, loading, create, update, remove } = useAdminCrud<HomeBanner>(homeBannersApi)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<HomeBanner | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<HomeBanner | null>(null)

  // Sorted data by sort_order
  const sortedData = useMemo(() => [...data].sort((a, b) => a.sort_order - b.sort_order), [data])

  const openAdd = () => { setEditingItem(null); setForm(emptyForm); setModalOpen(true) }

  const openEdit = (item: HomeBanner) => {
    setEditingItem(item)
    setForm({
      title: item.title,
      cta_text: item.cta_text,
      preview_image_1: item.preview_image_1 || '',
      preview_image_2: item.preview_image_2 || '',
      preview_image_3: item.preview_image_3 || '',
      preview_image_4: item.preview_image_4 || '',
      preview_image_5: item.preview_image_5 || '',
      preview_image_6: item.preview_image_6 || '',
      gradient_start_color: item.gradient_start_color || '',
      gradient_center_color: item.gradient_center_color || '',
      gradient_end_color: item.gradient_end_color || '',
      target_category_slug: item.target_category_slug || '',
      target_category_name: item.target_category_name || '',
      position_after_section: item.position_after_section ?? 0,
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
        addToast('Home banner updated successfully')
      } else {
        await create(form)
        addToast('Home banner created successfully')
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
      addToast('Home banner deleted successfully')
      setDeleteItem(null)
    } catch {
      addToast('Delete failed. Please try again.', 'error')
    }
  }

  // Inline toggle active
  const toggleActive = useCallback(async (item: HomeBanner) => {
    try {
      const updated = await update(item.id, { is_active: !item.is_active } as any)
      if (updated) addToast(`Banner "${item.title}" ${!item.is_active ? 'activated' : 'deactivated'}`)
    } catch {
      addToast('Toggle failed', 'error')
    }
  }, [update, addToast])

  // Reorder: swap sort_order with adjacent item
  const moveItem = useCallback(async (item: HomeBanner, direction: 'up' | 'down') => {
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

  const columns: Column<HomeBanner>[] = [
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
    {
      key: 'position_after_section', title: 'Position',
      render: (item) => <span className="text-brand-text-muted">After section {item.position_after_section}</span>,
    },
    {
      key: 'target_category_name', title: 'Category',
      render: (item) => (
        <div>
          <span className="text-brand-text">{item.target_category_name || '—'}</span>
          {item.target_category_slug && (
            <span className="block text-xs text-brand-text-muted">{item.target_category_slug}</span>
          )}
        </div>
      ),
    },
    { key: 'cta_text', title: 'CTA Text', render: (item) => <span className="text-brand-text-muted">{item.cta_text || '—'}</span> },
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
        <h1 className="text-2xl font-bold text-brand-text">Home Banners</h1>
        <button onClick={openAdd} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">+ Add Banner</button>
      </div>

      <p className="text-sm text-brand-text-muted">
        Manage the banners displayed on the app home screen. Use arrows to reorder, toggle to show/hide.
      </p>

      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading
          ? <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div>
          : <DataTable columns={columns} data={sortedData} />
        }
      </div>

      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false) }} title={editingItem ? 'Edit Home Banner' : 'Add Home Banner'} size="lg">
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Explore Business Cards" className={inputClass} />
          </div>

          {/* CTA Text */}
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">CTA Text</label>
            <input value={form.cta_text} onChange={e => setForm(f => ({ ...f, cta_text: e.target.value }))} placeholder="e.g. View All" className={inputClass} />
          </div>

          {/* Preview Images */}
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Preview Images</label>
            <div className="grid grid-cols-2 gap-3">
              {([1, 2, 3, 4, 5, 6] as const).map(n => (
                <ImageUpload
                  key={n}
                  label={`Image ${n}`}
                  value={(form[`preview_image_${n}` as keyof FormState] as string) || null}
                  onChange={v => setForm(f => ({ ...f, [`preview_image_${n}`]: v || '' }))}
                  aspectHint="Banner image"
                />
              ))}
            </div>
          </div>

          {/* Gradient Colors */}
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Gradient Colors (hex)</label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <input value={form.gradient_start_color} onChange={e => setForm(f => ({ ...f, gradient_start_color: e.target.value }))} placeholder="#FF0000" className={inputClass} />
                <p className="text-xs text-brand-text-muted mt-1">Start</p>
              </div>
              <div>
                <input value={form.gradient_center_color} onChange={e => setForm(f => ({ ...f, gradient_center_color: e.target.value }))} placeholder="#00FF00" className={inputClass} />
                <p className="text-xs text-brand-text-muted mt-1">Center</p>
              </div>
              <div>
                <input value={form.gradient_end_color} onChange={e => setForm(f => ({ ...f, gradient_end_color: e.target.value }))} placeholder="#0000FF" className={inputClass} />
                <p className="text-xs text-brand-text-muted mt-1">End</p>
              </div>
            </div>
          </div>

          {/* Target Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Target Category Slug</label>
              <input value={form.target_category_slug} onChange={e => setForm(f => ({ ...f, target_category_slug: e.target.value }))} placeholder="e.g. business-cards" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Target Category Name</label>
              <input value={form.target_category_name} onChange={e => setForm(f => ({ ...f, target_category_name: e.target.value }))} placeholder="e.g. Business Cards" className={inputClass} />
            </div>
          </div>

          {/* Position After Section */}
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Position After Section</label>
            <input
              type="number"
              value={form.position_after_section}
              onChange={e => setForm(f => ({ ...f, position_after_section: Number(e.target.value) }))}
              min={0}
              className={inputClass}
            />
            <p className="text-xs text-brand-text-muted mt-1">0 = after first section, 1 = after second, etc.</p>
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

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Home Banner" message={`Delete "${deleteItem?.title}"? This will remove the banner from the home screen.`} confirmText="Delete" variant="danger" />
    </div>
  )
}
