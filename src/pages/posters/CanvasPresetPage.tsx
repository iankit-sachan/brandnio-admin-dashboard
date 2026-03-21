import { useState, useMemo, useCallback } from 'react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { Pencil, Trash2 } from 'lucide-react'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { SortableRow } from '../../components/common/SortableRow'
import { canvasPresetsApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'
import type { CanvasPreset } from '../../types'

const TAB_BADGE: Record<string, string> = {
  poster: 'bg-blue-500/20 text-blue-400',
  video: 'bg-purple-500/20 text-purple-400',
}

const TAB_LABELS: Record<string, string> = {
  poster: 'Poster',
  video: 'Video',
}

interface FormState {
  name: string
  width: number
  height: number
  platform_icons: string
  tab: 'poster' | 'video'
  sort_order: number
  is_active: boolean
}

const emptyForm: FormState = {
  name: '', width: 0, height: 0, platform_icons: '', tab: 'poster', sort_order: 0, is_active: true,
}

export default function CanvasPresetPage() {
  const { addToast } = useToast()
  const { data, loading, create, update, remove } = useAdminCrud<CanvasPreset>(canvasPresetsApi)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CanvasPreset | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<CanvasPreset | null>(null)

  // Sorted data by sort_order
  const sortedData = useMemo(() => [...data].sort((a, b) => a.sort_order - b.sort_order), [data])

  const openAdd = () => { setEditingItem(null); setForm(emptyForm); setModalOpen(true) }

  const openEdit = (item: CanvasPreset) => {
    setEditingItem(item)
    setForm({
      name: item.name, width: item.width, height: item.height,
      platform_icons: item.platform_icons.join(', '),
      tab: item.tab, sort_order: item.sort_order, is_active: item.is_active,
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) { addToast('Name is required', 'error'); return }
    if (!form.width || !form.height) { addToast('Width and height are required', 'error'); return }
    try {
      const payload = {
        ...form,
        platform_icons: form.platform_icons.split(',').map(s => s.trim()).filter(Boolean),
      }
      if (editingItem) {
        await update(editingItem.id, payload)
        addToast('Canvas preset updated successfully')
      } else {
        await create(payload)
        addToast('Canvas preset created successfully')
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
      addToast('Canvas preset deleted successfully')
      setDeleteItem(null)
    } catch {
      addToast('Delete failed. Please try again.', 'error')
    }
  }

  // Inline toggle active
  const toggleActive = useCallback(async (item: CanvasPreset) => {
    try {
      const updated = await update(item.id, { is_active: !item.is_active } as any)
      if (updated) addToast(`Preset "${item.name}" ${!item.is_active ? 'activated' : 'deactivated'}`)
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

  const columns: Column<CanvasPreset>[] = [
    {
      key: 'sort_order', title: 'Sort Order', sortable: true,
      render: (item) => <span className="text-brand-text-muted">{item.sort_order}</span>,
    },
    { key: 'name', title: 'Name', sortable: true, render: (item) => <span className="font-medium text-brand-text">{item.name}</span> },
    {
      key: 'width', title: 'Dimensions',
      render: (item) => <span className="text-brand-text-muted text-sm">{item.width} &times; {item.height}</span>,
    },
    {
      key: 'platform_icons', title: 'Platforms',
      render: (item) => (
        <div className="flex flex-wrap gap-1">
          {item.platform_icons.map((icon, i) => (
            <span key={i} className="px-2 py-0.5 rounded-full text-xs font-medium bg-brand-gold/20 text-brand-gold">{icon}</span>
          ))}
        </div>
      ),
    },
    {
      key: 'tab', title: 'Tab',
      render: (item) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TAB_BADGE[item.tab] ?? ''}`}>
          {TAB_LABELS[item.tab] ?? item.tab}
        </span>
      ),
    },
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
        <h1 className="text-2xl font-bold text-brand-text">Canvas Presets</h1>
        <button onClick={openAdd} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">+ Add Preset</button>
      </div>

      <p className="text-sm text-brand-text-muted">
        Manage canvas size presets shown on the mobile app. Drag rows to reorder, toggle to show/hide.
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

      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false) }} title={editingItem ? 'Edit Canvas Preset' : 'Add Canvas Preset'} size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Instagram Post" className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Width</label>
              <input type="number" value={form.width} onChange={e => setForm(f => ({ ...f, width: Number(e.target.value) }))} placeholder="1080" className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Height</label>
              <input type="number" value={form.height} onChange={e => setForm(f => ({ ...f, height: Number(e.target.value) }))} placeholder="1080" className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Platform Icons</label>
            <input value={form.platform_icons} onChange={e => setForm(f => ({ ...f, platform_icons: e.target.value }))} placeholder="instagram, facebook, twitter" className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
            <p className="text-xs text-brand-text-muted mt-1">Comma-separated platform names</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Tab</label>
            <select value={form.tab} onChange={e => setForm(f => ({ ...f, tab: e.target.value as 'poster' | 'video' }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
              <option value="poster">Poster</option>
              <option value="video">Video</option>
            </select>
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

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Canvas Preset" message={`Delete "${deleteItem?.name}"? This will remove the preset from the mobile app.`} confirmText="Delete" variant="danger" />
    </div>
  )
}
