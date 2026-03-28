import { useState, useMemo, useCallback } from 'react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { Pencil, Trash2 } from 'lucide-react'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { SortableRow } from '../../components/common/SortableRow'
import { createScreenBannersApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'
import type { CreateScreenBanner } from '../../types'

const TAB_BADGE: Record<string, string> = {
  poster: 'bg-blue-500/20 text-blue-400',
  video: 'bg-purple-500/20 text-purple-400',
}

const TAB_LABELS: Record<string, string> = {
  poster: 'Create Poster',
  video: 'Video Ad Maker',
}

interface FormState {
  title: string
  subtitle: string
  image_url: string
  gradient_color: string
  redirect_slug: string
  tab: 'poster' | 'video'
  sort_order: number
  is_active: boolean
}

const emptyForm: FormState = {
  title: '', subtitle: '', image_url: '', gradient_color: '', redirect_slug: '', tab: 'poster', sort_order: 0, is_active: true,
}

export default function CreateScreenBannerPage() {
  const { addToast } = useToast()
  const { data, loading, create, update, remove } = useAdminCrud<CreateScreenBanner>(createScreenBannersApi)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CreateScreenBanner | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<CreateScreenBanner | null>(null)

  // Sorted data by sort_order
  const sortedData = useMemo(() => [...data].sort((a, b) => a.sort_order - b.sort_order), [data])

  const openAdd = () => { setEditingItem(null); setForm(emptyForm); setModalOpen(true) }

  const openEdit = (item: CreateScreenBanner) => {
    setEditingItem(item)
    setForm({
      title: item.title, subtitle: item.subtitle, image_url: item.image_url,
      gradient_color: item.gradient_color, redirect_slug: item.redirect_slug,
      tab: item.tab, sort_order: item.sort_order, is_active: item.is_active,
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) { addToast('Title is required', 'error'); return }
    try {
      if (editingItem) {
        await update(editingItem.id, form)
        addToast('Banner updated successfully')
      } else {
        await create(form)
        addToast('Banner created successfully')
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
      addToast('Banner deleted successfully')
      setDeleteItem(null)
    } catch {
      addToast('Delete failed. Please try again.', 'error')
    }
  }

  // Inline toggle active
  const toggleActive = useCallback(async (item: CreateScreenBanner) => {
    try {
      const updated = await update(item.id, { is_active: !item.is_active } as any)
      if (updated) addToast(`Banner "${item.title}" ${!item.is_active ? 'activated' : 'deactivated'}`)
    } catch {
      addToast('Toggle failed', 'error')
    }
  }, [update, addToast])

  // Drag-and-drop reorder
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = sortedData.findIndex(d => d.id === active.id)
    const newIndex = sortedData.findIndex(d => d.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(sortedData, oldIndex, newIndex)
    try {
      for (let i = 0; i < reordered.length; i++) {
        if (reordered[i].sort_order !== i) {
          await update(reordered[i].id, { sort_order: i } as any)
        }
      }
      addToast('Order updated')
    } catch {
      addToast('Reorder failed', 'error')
    }
  }, [sortedData, update, addToast])

  const columns: Column<CreateScreenBanner>[] = [
    {
      key: 'sort_order', title: 'Sort Order', sortable: true,
      render: (item) => <span className="text-brand-text-muted">{item.sort_order}</span>,
    },
    { key: 'title', title: 'Title', sortable: true, render: (item) => <span className="font-medium text-brand-text">{item.title}</span> },
    { key: 'subtitle', title: 'Subtitle', render: (item) => <span className="text-brand-text-muted text-sm">{item.subtitle}</span> },
    {
      key: 'tab', title: 'Tab',
      render: (item) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TAB_BADGE[item.tab] ?? ''}`}>
          {TAB_LABELS[item.tab] ?? item.tab}
        </span>
      ),
    },
    {
      key: 'gradient_color', title: 'Color',
      render: (item) => (
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded border border-brand-dark-border" style={{ backgroundColor: item.gradient_color }} />
          <span className="text-brand-text-muted text-xs">{item.gradient_color}</span>
        </div>
      ),
    },
    {
      key: 'image_url', title: 'Image',
      render: (item) => item.image_url ? (
        <img src={item.image_url} alt={item.title} className="h-8 w-14 rounded object-cover bg-brand-dark-hover" />
      ) : (
        <span className="text-brand-text-muted text-xs">No image</span>
      ),
    },
    { key: 'redirect_slug', title: 'Redirect Slug', render: (item) => <span className="text-brand-text-muted text-sm">{item.redirect_slug}</span> },
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-text">Create Screen Banners</h1>
        <button onClick={openAdd} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">+ Add Banner</button>
      </div>

      <p className="text-sm text-brand-text-muted">
        Manage the promotional banners shown on the mobile app's Create screen. Drag rows to reorder, toggle to show/hide.
      </p>

      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading
          ? <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div>
          : <DataTable
              columns={columns}
              data={sortedData}
              showDragHandle
              tbodyWrapper={(children) => (
                <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={sortedData.map(d => d.id)} strategy={verticalListSortingStrategy}>
                    {children}
                  </SortableContext>
                </DndContext>
              )}
              renderRow={(item, key, cells) => (
                <SortableRow key={key} id={item.id}>{cells}</SortableRow>
              )}
            />
        }
      </div>

      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false) }} title={editingItem ? 'Edit Create Screen Banner' : 'Add Create Screen Banner'} size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Summer Sale" className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Subtitle</label>
            <input value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} placeholder="e.g. Create amazing posters" className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Image URL</label>
            <input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://example.com/banner.png" className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
            {form.image_url && (
              <div className="mt-2">
                <img src={form.image_url} alt="Preview" className="h-20 rounded-lg object-cover border border-brand-dark-border" />
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Gradient Color</label>
            <div className="flex items-center gap-3">
              <input value={form.gradient_color} onChange={e => setForm(f => ({ ...f, gradient_color: e.target.value }))} placeholder="#FF5733" className="flex-1 bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
              {form.gradient_color && (
                <div className="h-10 w-10 rounded-lg border border-brand-dark-border shrink-0" style={{ backgroundColor: form.gradient_color }} />
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Redirect Slug</label>
            <input value={form.redirect_slug} onChange={e => setForm(f => ({ ...f, redirect_slug: e.target.value }))} placeholder="e.g. poster-maker" className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Tab</label>
            <select value={form.tab} onChange={e => setForm(f => ({ ...f, tab: e.target.value as 'poster' | 'video' }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
              <option value="poster">Create Poster</option>
              <option value="video">Video Ad Maker</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Sort Order</label>
            <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
            <p className="text-xs text-brand-text-muted mt-1">Lower numbers appear first in the banner carousel</p>
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

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Create Screen Banner" message={`Delete "${deleteItem?.title}"? This will remove the banner from the Create screen on the mobile app.`} confirmText="Delete" variant="danger" />
    </div>
  )
}
