import { useState, useMemo, useCallback } from 'react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { useToast } from '../../context/ToastContext'
import { Pencil, Trash2 } from 'lucide-react'
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
  placement: string
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
  gradient_start_color: '#FF8C00',
  gradient_center_color: '#FFD700',
  gradient_end_color: '#FFA500',
  target_category_slug: '',
  target_category_name: '',
  placement: 'category_section',
  position_after_section: 1,
  sort_order: 0,
  is_active: true,
}

export default function CategoryBannerPage() {
  const { addToast } = useToast()
  const { data, loading, create, update, remove } = useAdminCrud<HomeBanner>(homeBannersApi)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<HomeBanner | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<HomeBanner | null>(null)

  // Only show category_section banners
  const categoryBanners = useMemo(() =>
    data.filter((b: any) => b.placement === 'category_section').sort((a, b) => a.position_after_section - b.position_after_section || a.sort_order - b.sort_order),
    [data]
  )

  const openAdd = () => { setEditingItem(null); setForm(emptyForm); setModalOpen(true) }

  const openEdit = (item: HomeBanner) => {
    setEditingItem(item)
    setForm({
      title: item.title || '',
      cta_text: item.cta_text || '',
      preview_image_1: (item as any).preview_image_1 || '',
      preview_image_2: (item as any).preview_image_2 || '',
      preview_image_3: (item as any).preview_image_3 || '',
      preview_image_4: (item as any).preview_image_4 || '',
      preview_image_5: (item as any).preview_image_5 || '',
      preview_image_6: (item as any).preview_image_6 || '',
      gradient_start_color: (item as any).gradient_start_color || '#FF8C00',
      gradient_center_color: (item as any).gradient_center_color || '#FFD700',
      gradient_end_color: (item as any).gradient_end_color || '#FFA500',
      target_category_slug: (item as any).target_category_slug || '',
      target_category_name: (item as any).target_category_name || '',
      placement: 'category_section',
      position_after_section: item.position_after_section || 1,
      sort_order: item.sort_order || 0,
      is_active: item.is_active,
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.preview_image_1.trim()) { addToast('At least one image is required', 'error'); return }
    try {
      const payload = { ...form, placement: 'category_section' }
      if (editingItem) {
        await update(editingItem.id, payload as any)
        addToast('Category banner updated')
      } else {
        await create(payload as any)
        addToast('Category banner created')
      }
      setForm(emptyForm); setEditingItem(null); setModalOpen(false)
    } catch (err: any) {
      const detail = err?.response?.data
      if (detail && typeof detail === 'object') {
        const msgs = Object.entries(detail).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('; ')
        addToast(msgs || 'Operation failed', 'error')
      } else {
        addToast('Operation failed', 'error')
      }
    }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    try {
      await remove(deleteItem.id)
      addToast('Banner deleted')
      setDeleteItem(null)
    } catch {
      addToast('Delete failed', 'error')
    }
  }

  const toggleActive = useCallback(async (item: HomeBanner) => {
    try {
      await update(item.id, { is_active: !item.is_active } as any)
      addToast(`Banner ${!item.is_active ? 'activated' : 'deactivated'}`)
    } catch {
      addToast('Toggle failed', 'error')
    }
  }, [update, addToast])

  const columns: Column<HomeBanner>[] = [
    { key: 'preview_image_1' as any, title: 'Image', render: (item: any) => (
      item.preview_image_1
        ? <img src={item.preview_image_1} alt={item.title} className="h-10 w-20 rounded object-cover bg-brand-dark-hover" />
        : <div className="h-10 w-20 rounded bg-brand-dark-hover flex items-center justify-center text-brand-text-muted text-xs">No img</div>
    )},
    { key: 'title', title: 'Title', sortable: true },
    { key: 'position_after_section', title: 'Position', sortable: true, render: (item) => (
      <span className="text-brand-text-muted">After section {item.position_after_section}</span>
    )},
    { key: 'target_category_slug' as any, title: 'Target', render: (item: any) => (
      <span className="text-brand-text-muted">{item.target_category_name || item.target_category_slug || '—'}</span>
    )},
    { key: 'is_active', title: 'Active', render: (item) => (
      <button onClick={(e) => { e.stopPropagation(); toggleActive(item) }}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${item.is_active ? 'bg-green-500' : 'bg-gray-600'}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${item.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    )},
    { key: 'actions', title: '', render: (item) => (
      <div className="flex items-center gap-2">
        <button onClick={(e) => { e.stopPropagation(); openEdit(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-gold transition-colors"><Pencil className="h-4 w-4" /></button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteItem(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-status-error transition-colors"><Trash2 className="h-4 w-4" /></button>
      </div>
    )},
  ]

  const inputClass = "w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50"

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Category Banners</h1>
          <p className="text-sm text-brand-text-muted mt-1">Promo banners shown between sections in the Category tab</p>
        </div>
        <button onClick={openAdd} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">+ Add Banner</button>
      </div>

      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading
          ? <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div>
          : categoryBanners.length === 0
            ? <div className="text-center py-12 text-brand-text-muted">No category banners yet. Click "+ Add Banner" to create one.</div>
            : <DataTable columns={columns} data={categoryBanners} />
        }
      </div>

      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false) }} title={editingItem ? 'Edit Category Banner' : 'Add Category Banner'} size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Summer Sale" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">CTA Text</label>
            <input value={form.cta_text} onChange={e => setForm(f => ({ ...f, cta_text: e.target.value }))} placeholder="e.g. Shop Now" className={inputClass} />
          </div>

          {/* Banner Images */}
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Banner Images</label>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Target Category Slug</label>
              <input value={form.target_category_slug} onChange={e => setForm(f => ({ ...f, target_category_slug: e.target.value }))} placeholder="e.g. fashion" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Target Category Name</label>
              <input value={form.target_category_name} onChange={e => setForm(f => ({ ...f, target_category_name: e.target.value }))} placeholder="e.g. Fashion" className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Position After Section</label>
              <input type="number" value={form.position_after_section} onChange={e => setForm(f => ({ ...f, position_after_section: Number(e.target.value) }))} className={inputClass} />
              <p className="text-xs text-brand-text-muted mt-1">1 = after 1st category, 2 = after 2nd, etc.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Sort Order</label>
              <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} className={inputClass} />
            </div>
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

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Banner" message={`Delete "${deleteItem?.title}"? This will remove the banner from the category screen.`} confirmText="Delete" variant="danger" />
    </div>
  )
}
