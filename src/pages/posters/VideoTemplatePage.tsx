import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { Pencil, Trash2, Upload, Download, Play, X } from 'lucide-react'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { SortableRow } from '../../components/common/SortableRow'
import { videoTemplatesApi, videoCategoriesApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'
import type { VideoTemplate, VideoCategory } from '../../types'

interface FormState {
  title: string
  category: number | ''
  thumbnail_url: string
  video_url: string
  duration: number
  is_premium: boolean
  sort_order: number
  is_active: boolean
}

const emptyForm: FormState = {
  title: '', category: '', thumbnail_url: '', video_url: '',
  duration: 0, is_premium: false, sort_order: 0, is_active: true,
}

export default function VideoTemplatePage() {
  const { addToast } = useToast()
  const { data, loading, create, update, remove } = useAdminCrud<VideoTemplate>(videoTemplatesApi)
  const [categories, setCategories] = useState<VideoCategory[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<VideoTemplate | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<VideoTemplate | null>(null)
  const [previewItem, setPreviewItem] = useState<VideoTemplate | null>(null)

  // Bulk upload state
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load categories for dropdown
  useEffect(() => {
    videoCategoriesApi.list().then(setCategories).catch(() => {})
  }, [])

  // Map category id -> name
  const categoryMap = useMemo(() => {
    const map: Record<number, string> = {}
    categories.forEach(c => { map[c.id] = c.name })
    return map
  }, [categories])

  // Sorted data by sort_order
  const sortedData = useMemo(() => [...data].sort((a, b) => a.sort_order - b.sort_order), [data])

  const openAdd = () => { setEditingItem(null); setForm(emptyForm); setModalOpen(true) }

  const openEdit = (item: VideoTemplate) => {
    setEditingItem(item)
    setForm({
      title: item.title, category: item.category, thumbnail_url: item.thumbnail_url,
      video_url: item.video_url, duration: item.duration, is_premium: item.is_premium,
      sort_order: item.sort_order, is_active: item.is_active,
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) { addToast('Title is required', 'error'); return }
    if (!form.category) { addToast('Category is required', 'error'); return }
    try {
      const payload = { ...form, category: Number(form.category) }
      if (editingItem) {
        await update(editingItem.id, payload)
        addToast('Video template updated successfully')
      } else {
        await create(payload)
        addToast('Video template created successfully')
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
      addToast('Video template deleted successfully')
      setDeleteItem(null)
    } catch {
      addToast('Delete failed. Please try again.', 'error')
    }
  }

  // Inline toggle active
  const toggleActive = useCallback(async (item: VideoTemplate) => {
    try {
      const updated = await update(item.id, { is_active: !item.is_active } as any)
      if (updated) addToast(`Template "${item.title}" ${!item.is_active ? 'activated' : 'deactivated'}`)
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

  // Bulk CSV upload handler
  const handleBulkUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const text = await file.text()
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

    // Remove header row if present
    const header = lines[0].toLowerCase()
    const startIdx = header.includes('title') && header.includes('category_id') ? 1 : 0
    const rows = lines.slice(startIdx)

    if (rows.length === 0) {
      addToast('CSV file is empty or has no data rows', 'error')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setBulkProgress({ current: 0, total: rows.length })
    let successCount = 0
    let failCount = 0

    for (let i = 0; i < rows.length; i++) {
      const cols = rows[i].split(',').map(c => c.trim())
      if (cols.length < 6) {
        failCount++
        setBulkProgress({ current: i + 1, total: rows.length })
        continue
      }

      const [title, category_id, thumbnail_url, video_url, duration, is_premium] = cols

      try {
        await create({
          title,
          category: Number(category_id),
          thumbnail_url,
          video_url,
          duration: Number(duration) || 0,
          is_premium: is_premium.toLowerCase() === 'true' || is_premium === '1',
          sort_order: 0,
          is_active: true,
        } as any)
        successCount++
      } catch {
        failCount++
      }

      setBulkProgress({ current: i + 1, total: rows.length })
    }

    setBulkProgress(null)
    if (fileInputRef.current) fileInputRef.current.value = ''

    if (successCount > 0) addToast(`Bulk upload complete: ${successCount} created successfully`)
    if (failCount > 0) addToast(`${failCount} row(s) failed to upload`, 'error')
  }, [create, addToast])

  // Download sample CSV
  const downloadSampleCsv = useCallback(() => {
    const csvContent = `title,category_id,thumbnail_url,video_url,duration,is_premium
Business Intro,1,https://example.com/thumb1.jpg,https://example.com/video1.mp4,30,false
Premium Outro,2,https://example.com/thumb2.jpg,https://example.com/video2.mp4,15,true`
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'video_templates_sample.csv'
    link.click()
    URL.revokeObjectURL(url)
  }, [])

  const columns: Column<VideoTemplate>[] = [
    {
      key: 'sort_order', title: 'Sort Order', sortable: true,
      render: (item) => <span className="text-brand-text-muted">{item.sort_order}</span>,
    },
    { key: 'title', title: 'Template', render: (item) => (
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setPreviewItem(item)}>
            <div className="w-12 h-12 rounded-lg bg-brand-dark overflow-hidden relative shrink-0">
                {item.thumbnail_url ? <img src={item.thumbnail_url} className="w-full h-full object-cover" /> : null}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Play className="h-4 w-4 text-white fill-white" />
                </div>
            </div>
            <span className="text-brand-text text-sm">{item.title}</span>
        </div>
    )},
    {
      key: 'category', title: 'Category',
      render: (item) => <span className="text-brand-text-muted text-sm">{categoryMap[item.category] ?? `#${item.category}`}</span>,
    },
    {
      key: 'thumbnail_url', title: 'Thumbnail',
      render: (item) => item.thumbnail_url ? (
        <img src={item.thumbnail_url} alt={item.title} className="h-10 w-16 rounded object-cover bg-brand-dark-hover" />
      ) : (
        <span className="text-brand-text-muted text-xs">No thumbnail</span>
      ),
    },
    {
      key: 'duration', title: 'Duration',
      render: (item) => <span className="text-brand-text-muted text-sm">{item.duration}s</span>,
    },
    {
      key: 'is_premium', title: 'Premium',
      render: (item) => item.is_premium ? (
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-brand-gold/20 text-brand-gold">Premium</span>
      ) : (
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400">Free</span>
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
    { key: 'view_count', title: 'Views', sortable: true, render: (item) => <span className="text-brand-text-muted text-sm">{(item.view_count ?? 0).toLocaleString()}</span> },
    { key: 'share_count', title: 'Shares', sortable: true, render: (item) => <span className="text-brand-text-muted text-sm">{(item.share_count ?? 0).toLocaleString()}</span> },
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
        <h1 className="text-2xl font-bold text-brand-text">Video Templates</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={downloadSampleCsv}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-brand-text-muted hover:text-brand-text border border-brand-dark-border rounded-lg hover:bg-brand-dark-hover transition-colors"
          >
            <Download className="h-4 w-4" />
            Sample CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleBulkUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!!bulkProgress}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-brand-gold text-brand-gold hover:bg-brand-gold/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Upload className="h-4 w-4" />
            {bulkProgress
              ? `Uploading ${bulkProgress.current}/${bulkProgress.total}...`
              : 'Bulk Upload'}
          </button>
          <button onClick={openAdd} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">+ Add Template</button>
        </div>
      </div>

      <p className="text-sm text-brand-text-muted">
        Manage video templates shown on the mobile app. Drag rows to reorder, toggle to show/hide.
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

      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false) }} title={editingItem ? 'Edit Video Template' : 'Add Video Template'} size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Business Intro" className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Category</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value ? Number(e.target.value) : '' }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
              <option value="">Select a category</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Thumbnail URL</label>
            <input value={form.thumbnail_url} onChange={e => setForm(f => ({ ...f, thumbnail_url: e.target.value }))} placeholder="https://example.com/thumb.jpg" className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Video URL</label>
            <input value={form.video_url} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))} placeholder="https://example.com/video.mp4" className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Duration (seconds)</label>
            <input type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) }))} placeholder="30" className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Sort Order</label>
            <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
            <p className="text-xs text-brand-text-muted mt-1">Lower numbers appear first</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_premium} onChange={e => setForm(f => ({ ...f, is_premium: e.target.checked }))} className="rounded" />
              <label className="text-sm text-brand-text-muted">Premium</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
              <label className="text-sm text-brand-text-muted">Active (visible on app)</label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false) }} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">Save</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Video Template" message={`Delete "${deleteItem?.title}"? This will remove the template from the mobile app.`} confirmText="Delete" variant="danger" />

      {previewItem && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setPreviewItem(null)}>
              <div className="max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-3">
                      <h3 className="text-brand-text font-medium">{previewItem.title}</h3>
                      <button onClick={() => setPreviewItem(null)} className="text-brand-text-muted hover:text-brand-text">
                          <X className="h-5 w-5" />
                      </button>
                  </div>
                  {previewItem.video_url ? (
                      <video
                          src={previewItem.video_url}
                          controls
                          autoPlay
                          className="w-full rounded-xl"
                          style={{ maxHeight: '70vh' }}
                      />
                  ) : (
                      <div className="bg-brand-dark rounded-xl p-12 text-center text-brand-text-muted">No video URL available</div>
                  )}
              </div>
          </div>
      )}
    </div>
  )
}
