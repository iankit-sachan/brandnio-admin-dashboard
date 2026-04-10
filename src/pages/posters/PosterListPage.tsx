import { useState, useCallback, useRef } from 'react'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Pagination } from '../../components/ui/Pagination'
import { SearchInput } from '../../components/ui/SearchInput'
import { useToast } from '../../context/ToastContext'
import { Pencil, Trash2, Layers, CheckSquare, Upload, X, Loader2 } from 'lucide-react'
import TemplateLayerEditor from './TemplateLayerEditor'
import { postersApi, posterCategoriesApi } from '../../services/admin-api'
import { useAdminPaginatedCrud } from '../../hooks/useAdminPaginatedCrud'
import { useAdminCrud } from '../../hooks/useAdminCrud'
import { formatNumber } from '../../utils/formatters'
import QuickStats from '../../components/ui/QuickStats'
import type { Poster, AspectRatio } from '../../types'

interface FormState {
  thumbnail_url: string | null
  image_url: string | null
  title: string
  category: number
  is_premium: boolean
  aspect_ratio: AspectRatio
}

const emptyForm: FormState = { thumbnail_url: null, image_url: null, title: '', category: 1, is_premium: false, aspect_ratio: '1:1' }

export default function PosterListPage() {
  const { addToast } = useToast()
  const { data, loading, page, totalPages, totalCount, search, setPage, setSearch, create, update, remove } = useAdminPaginatedCrud<Poster>(postersApi)
  const { data: categories } = useAdminCrud(posterCategoriesApi)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Poster | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<Poster | null>(null)
  const [layerEditorPoster, setLayerEditorPoster] = useState<Poster | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // Bulk upload state
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false)
  const [bulkFiles, setBulkFiles] = useState<File[]>([])
  const [bulkCategory, setBulkCategory] = useState<number>(0)
  const [bulkRatio, setBulkRatio] = useState<AspectRatio>('1:1')
  const [bulkPremium, setBulkPremium] = useState(false)
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 })
  const bulkFileRef = useRef<HTMLInputElement>(null)

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === data.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(data.map(d => d.id)))
    }
  }, [data, selectedIds.size])

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    setBulkDeleting(true)
    try {
      const ids = Array.from(selectedIds)
      await Promise.all(ids.map(id => remove(id).catch(() => null)))
      addToast(`Deleted ${ids.length} posters`)
      setSelectedIds(new Set())
      setBulkDeleteOpen(false)
    } catch {
      addToast('Some deletes failed', 'error')
    } finally {
      setBulkDeleting(false)
    }
  }

  const openAdd = () => {
    setEditingItem(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (item: Poster) => {
    setEditingItem(item)
    setForm({ thumbnail_url: item.thumbnail_url, image_url: item.image_url, title: item.title, category: item.category, is_premium: item.is_premium, aspect_ratio: item.aspect_ratio })
    setModalOpen(true)
  }

  const openDelete = (item: Poster) => setDeleteItem(item)

  const handleSubmit = async () => {
    if (!form.title.trim()) { addToast('Title is required', 'error'); return }
    try {
      if (editingItem) {
        await update(editingItem.id, form)
        addToast('Poster updated successfully')
      } else {
        await create(form)
        addToast('Poster created successfully')
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
      addToast('Poster deleted successfully')
      setDeleteItem(null)
    } catch {
      addToast('Delete failed. Please try again.', 'error')
    }
  }

  const handleSaveTemplateLayers = async (posterId: number, templateData: { layers: unknown[] }) => {
    await update(posterId, { template_data: templateData } as any)
    setLayerEditorPoster(null)
  }

  const handleBulkFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setBulkFiles(prev => [...prev, ...files])
    if (e.target) e.target.value = '' // reset so same files can be re-selected
  }

  const removeBulkFile = (index: number) => {
    setBulkFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleBulkUpload = async () => {
    if (bulkFiles.length === 0) { addToast('No images selected', 'error'); return }
    if (!bulkCategory) { addToast('Select a category', 'error'); return }
    setBulkUploading(true)
    setBulkProgress({ done: 0, total: bulkFiles.length })
    let success = 0
    for (let i = 0; i < bulkFiles.length; i++) {
      try {
        // Upload image file
        const { uploadApi } = await import('../../services/admin-api')
        const imageUrl = await uploadApi.upload(bulkFiles[i])
        // Create poster with filename as title
        const title = bulkFiles[i].name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
        await create({
          title,
          image_url: imageUrl,
          thumbnail_url: null,
          category: bulkCategory,
          aspect_ratio: bulkRatio,
          is_premium: bulkPremium,
        })
        success++
      } catch {
        addToast(`Failed: ${bulkFiles[i].name}`, 'error')
      }
      setBulkProgress({ done: i + 1, total: bulkFiles.length })
    }
    setBulkUploading(false)
    addToast(`Uploaded ${success}/${bulkFiles.length} posters successfully`)
    setBulkFiles([])
    setBulkUploadOpen(false)
  }

  const columns: Column<Poster>[] = [
    { key: 'select' as any, title: '', render: (p) => (
      <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} className="rounded cursor-pointer" onClick={e => e.stopPropagation()} />
    )},
    { key: 'thumbnail_url', title: 'Image', render: (p) => (
      p.thumbnail_url || p.image_url ? (
        <img src={p.thumbnail_url || p.image_url || ''} alt={p.title} className="w-12 h-12 rounded object-cover" />
      ) : (
        <div className="w-12 h-12 rounded bg-gray-700 flex items-center justify-center text-gray-400 text-xs">No img</div>
      )
    )},
    { key: 'title', title: 'Title', sortable: true },
    { key: 'category_name', title: 'Category', sortable: true },
    { key: 'aspect_ratio', title: 'Ratio' },
    { key: 'template_data', title: 'Layers', render: (p) => {
      const count = ((p.template_data as any)?.layers as unknown[])?.length || 0
      return count > 0
        ? <span className="px-2 py-0.5 rounded-full text-xs bg-brand-gold/10 text-brand-gold">{count} layers</span>
        : <span className="text-brand-text-muted text-xs">None</span>
    }},
    { key: 'is_premium', title: 'Premium', render: (p) => p.is_premium ? <span className="text-brand-gold">Premium</span> : <span className="text-brand-text-muted">Free</span> },
    { key: 'download_count', title: 'Downloads', sortable: true, render: (p) => formatNumber(p.download_count as number) },
    { key: 'share_count', title: 'Shares', sortable: true, render: (p) => formatNumber(p.share_count as number) },
    { key: 'actions', title: 'Actions', render: (item) => (
      <div className="flex items-center gap-2">
        <button onClick={(e) => { e.stopPropagation(); setLayerEditorPoster(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-gold transition-colors" title="Edit Layers"><Layers className="h-4 w-4" /></button>
        <button onClick={(e) => { e.stopPropagation(); openEdit(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-gold transition-colors" title="Edit"><Pencil className="h-4 w-4" /></button>
        <button onClick={(e) => { e.stopPropagation(); openDelete(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-status-error transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-text">Poster Templates</h1>
        <div className="flex items-center gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search posters..." className="w-64" />
          <button onClick={() => setBulkUploadOpen(true)} className="px-4 py-2 bg-blue-600 text-white font-medium text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5">
            <Upload className="h-4 w-4" /> Bulk Upload
          </button>
          <button onClick={openAdd} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">+ Add Poster</button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-brand-dark-card rounded-xl border border-brand-gold/30">
          <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm text-brand-text hover:text-brand-gold transition-colors">
            <CheckSquare className="h-4 w-4" />
            {selectedIds.size === data.length ? 'Deselect All' : 'Select All'}
          </button>
          <span className="text-sm text-brand-text-muted">{selectedIds.size} selected</span>
          <button onClick={() => setBulkDeleteOpen(true)} className="ml-auto px-4 py-1.5 bg-status-error text-white text-sm rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2">
            <Trash2 className="h-4 w-4" /> Delete Selected
          </button>
        </div>
      )}
      <QuickStats stats={[{ label: 'Total', count: totalCount }]} />
      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading ? <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div> : <DataTable columns={columns} data={data} />}
        <Pagination currentPage={page} totalPages={totalPages} totalCount={totalCount} onPageChange={setPage} />
      </div>

      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} title={editingItem ? 'Edit Poster' : 'Add Poster'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <ImageUpload label="Thumbnail" value={form.thumbnail_url} onChange={v => setForm(f => ({ ...f, thumbnail_url: v }))} aspectHint="300x300" />
            <ImageUpload label="Full Image" value={form.image_url} onChange={v => setForm(f => ({ ...f, image_url: v }))} aspectHint="1080x1080" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Category</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: Number(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
              {categories.filter((c: any) => !c.parent).map((c: any) => {
                const children = categories.filter((sub: any) => sub.parent === c.id)
                return [
                  <option key={c.id} value={c.id}>{c.name}</option>,
                  ...children.map((sub: any) => <option key={sub.id} value={sub.id}>&nbsp;&nbsp;└ {sub.name}</option>)
                ]
              })}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Aspect Ratio</label>
            <select value={form.aspect_ratio} onChange={e => setForm(f => ({ ...f, aspect_ratio: e.target.value as AspectRatio }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
              <option value="1:1">1:1</option>
              <option value="4:5">4:5</option>
              <option value="9:16">9:16</option>
              <option value="16:9">16:9</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_premium} onChange={e => setForm(f => ({ ...f, is_premium: e.target.checked }))} className="rounded" />
            <label className="text-sm text-brand-text-muted">Premium</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">Save</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Poster" message={`Are you sure you want to delete "${deleteItem?.title}"? This action cannot be undone.`} confirmText="Delete" variant="danger" />

      <ConfirmDialog isOpen={bulkDeleteOpen} onClose={() => setBulkDeleteOpen(false)} onConfirm={handleBulkDelete} title="Bulk Delete" message={`Delete ${selectedIds.size} poster(s)? This cannot be undone.`} confirmText={bulkDeleting ? 'Deleting...' : `Delete ${selectedIds.size}`} variant="danger" />

      {layerEditorPoster && (
        <TemplateLayerEditor
          isOpen={!!layerEditorPoster}
          onClose={() => setLayerEditorPoster(null)}
          poster={layerEditorPoster}
          onSave={handleSaveTemplateLayers}
        />
      )}

      {/* Bulk Upload Modal */}
      <Modal isOpen={bulkUploadOpen} onClose={() => { if (!bulkUploading) { setBulkUploadOpen(false); setBulkFiles([]) } }} title="Bulk Upload Posters" size="lg">
        <div className="space-y-4">
          {/* Drop zone */}
          <div
            className="border-2 border-dashed border-brand-dark-border rounded-xl p-6 text-center cursor-pointer hover:border-brand-gold/50 transition-colors"
            onClick={() => bulkFileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
            onDrop={e => { e.preventDefault(); e.stopPropagation(); const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')); setBulkFiles(prev => [...prev, ...files]) }}
          >
            <Upload className="h-8 w-8 text-brand-text-muted mx-auto mb-2" />
            <p className="text-sm text-brand-text-muted">Click or drag images here</p>
            <p className="text-xs text-brand-text-muted mt-1">Select multiple files at once</p>
            <input ref={bulkFileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleBulkFilesSelected} />
          </div>

          {/* Selected files list */}
          {bulkFiles.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-1">
              <p className="text-xs font-medium text-brand-text-muted">{bulkFiles.length} images selected</p>
              {bulkFiles.map((file, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1 bg-brand-dark rounded-lg">
                  <img src={URL.createObjectURL(file)} alt="" className="h-8 w-8 rounded object-cover" />
                  <span className="flex-1 text-xs text-brand-text truncate">{file.name}</span>
                  <span className="text-xs text-brand-text-muted">{(file.size / 1024).toFixed(0)}KB</span>
                  <button onClick={() => removeBulkFile(i)} className="p-0.5 text-brand-text-muted hover:text-status-error">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Category + Ratio + Premium */}
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Category</label>
            <select value={bulkCategory} onChange={e => setBulkCategory(Number(e.target.value))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
              <option value={0}>-- Select Category --</option>
              {categories.filter((c: any) => !c.parent).map((c: any) => {
                const children = categories.filter((sub: any) => sub.parent === c.id)
                return [
                  <option key={c.id} value={c.id}>{c.name}</option>,
                  ...children.map((sub: any) => <option key={sub.id} value={sub.id}>&nbsp;&nbsp;{sub.name}</option>)
                ]
              })}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Aspect Ratio</label>
              <select value={bulkRatio} onChange={e => setBulkRatio(e.target.value as AspectRatio)} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
                <option value="1:1">1:1 (Square)</option>
                <option value="4:5">4:5 (Portrait)</option>
                <option value="9:16">9:16 (Story)</option>
                <option value="16:9">16:9 (Landscape)</option>
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-brand-text-muted">
                <input type="checkbox" checked={bulkPremium} onChange={e => setBulkPremium(e.target.checked)} className="rounded" />
                Premium
              </label>
            </div>
          </div>

          {/* Progress bar */}
          {bulkUploading && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Loader2 className="h-4 w-4 animate-spin text-brand-gold" />
                <span className="text-sm text-brand-text">Uploading {bulkProgress.done}/{bulkProgress.total}...</span>
              </div>
              <div className="w-full bg-brand-dark rounded-full h-2">
                <div className="bg-brand-gold h-2 rounded-full transition-all" style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }} />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setBulkUploadOpen(false); setBulkFiles([]) }} disabled={bulkUploading} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors disabled:opacity-50">Cancel</button>
            <button onClick={handleBulkUpload} disabled={bulkUploading || bulkFiles.length === 0} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors disabled:opacity-50 flex items-center gap-1.5">
              {bulkUploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</> : <><Upload className="h-4 w-4" /> Upload {bulkFiles.length} Posters</>}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
