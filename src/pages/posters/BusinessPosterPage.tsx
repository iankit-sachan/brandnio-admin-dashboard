import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Pencil, Trash2, Plus, Maximize2, Image as ImageIcon, Download, Upload, X, Loader2, CheckSquare, Square } from 'lucide-react'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { TagInput } from '../../components/ui/TagInput'
import { useToast } from '../../context/ToastContext'
import { postersApi, posterCategoriesApi, festivalsApi, posterBulkApi, uploadApi, languagesApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'
import type { Poster, PosterCategory, AspectRatio } from '../../types'

interface LanguageOption {
  id: number
  name: string
  code: string
  is_active: boolean
}

interface FormState {
  image_url: string | null
  thumbnail_url: string | null
  title: string
  category: number
  aspect_ratio: AspectRatio
  is_premium: boolean
  language: number | null
}

const emptyForm: FormState = { image_url: null, thumbnail_url: null, title: '', category: 0, aspect_ratio: '4:5', is_premium: false, language: null }

const inputClass = 'w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50'

export default function BusinessPosterPage() {
  const { addToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  // Q2=ii: Business Posters page shows scope IN ('business','categories') so
  // existing un-tagged posters stay visible until admin manually re-tags
  // them. Memoized to keep referential equality across renders (otherwise
  // useAdminCrud's useCallback deps would re-trigger fetches).
  const crudParams = useMemo(() => ({ scope: 'business,categories' }), [])
  const { data, loading, create, update, remove, refresh } = useAdminCrud<Poster>(postersApi, crudParams)
  const { data: allCategories } = useAdminCrud<PosterCategory>(posterCategoriesApi)
  const { data: festivals } = useAdminCrud(festivalsApi)
  const { data: languages } = useAdminCrud<LanguageOption>(languagesApi)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Poster | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<Poster | null>(null)
  const [previewItem, setPreviewItem] = useState<Poster | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [ratioFilter, setRatioFilter] = useState('')
  const [languageFilter, setLanguageFilter] = useState('')

  // ── Multi-select + bulk action state ──
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false)
  const [bulkMoveCategory, setBulkMoveCategory] = useState<number>(0)
  const [bulkMoving, setBulkMoving] = useState(false)

  // ── Bulk upload state ──
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false)
  const [bulkFiles, setBulkFiles] = useState<File[]>([])
  const [bulkCategory, setBulkCategory] = useState<number>(0)
  const [bulkRatio, setBulkRatio] = useState<AspectRatio>('1:1')
  const [bulkPremium, setBulkPremium] = useState(false)
  const [bulkActive, setBulkActive] = useState(true)
  const [bulkTags, setBulkTags] = useState<string[]>([])
  const [bulkFestival, setBulkFestival] = useState<number | null>(null)
  const [bulkTitlePrefix, setBulkTitlePrefix] = useState('')
  const [bulkLanguage, setBulkLanguage] = useState<number | null>(null)
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0, failed: 0 })
  const bulkFileRef = useRef<HTMLInputElement>(null)

  // ── Auto-open bulk upload when arriving from BusinessCategoryPage with ?upload=1&category=X ──
  const urlUpload = searchParams.get('upload') === '1'
  const urlCategory = searchParams.get('category')
  useEffect(() => {
    if (urlUpload && urlCategory) {
      setBulkCategory(Number(urlCategory))
      setBulkUploadOpen(true)
      setSearchParams({}, { replace: true }) // clean URL so refresh doesn't re-open
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Build category options from DB (parent + children flat list)
  const categoryOptions = useMemo(() => {
    return allCategories.filter(c => !c.parent).flatMap(c => {
      const children = allCategories.filter(sub => sub.parent === c.id)
      return [c, ...children]
    })
  }, [allCategories])

  const filteredData = useMemo(() => {
    return data.filter(p => {
      if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false
      if (categoryFilter && p.category !== Number(categoryFilter)) return false
      if (ratioFilter && p.aspect_ratio !== ratioFilter) return false
      if (languageFilter && String(p.language ?? '') !== languageFilter) return false
      return true
    })
  }, [data, search, categoryFilter, ratioFilter, languageFilter])

  // ── Single-poster CRUD ──
  const openAdd = () => { setEditingItem(null); setForm(emptyForm); setModalOpen(true) }
  const openEdit = (item: Poster) => {
    setEditingItem(item)
    setForm({ image_url: item.image_url, thumbnail_url: item.thumbnail_url, title: item.title, category: item.category, aspect_ratio: item.aspect_ratio, is_premium: item.is_premium, language: item.language })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) { addToast('Title is required', 'error'); return }
    if (!form.category) { addToast('Category is required', 'error'); return }
    if (!form.language) { addToast('Language is required', 'error'); return }
    try {
      if (editingItem) {
        // Edit: don't override scope — preserve whatever it currently is.
        await update(editingItem.id, form)
        addToast('Poster updated successfully')
      } else {
        // New poster created from Business Posters page → scope='business'.
        await create({ ...form, scope: 'business' })
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

  // ── Multi-select helpers ──
  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredData.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredData.map(d => d.id)))
    }
  }, [filteredData, selectedIds.size])

  // ── Bulk delete ──
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

  // ── Bulk move ──
  const handleBulkMove = async () => {
    if (selectedIds.size === 0 || !bulkMoveCategory) return
    setBulkMoving(true)
    try {
      const result = await posterBulkApi.bulkMove(Array.from(selectedIds), bulkMoveCategory)
      addToast(`Moved ${result.moved} posters`)
      setSelectedIds(new Set())
      setBulkMoveOpen(false)
      setBulkMoveCategory(0)
      await refresh()
    } catch {
      addToast('Move failed', 'error')
    } finally {
      setBulkMoving(false)
    }
  }

  // ── Bulk upload helpers ──
  const handleBulkFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setBulkFiles(prev => [...prev, ...files])
    if (e.target) e.target.value = ''
  }

  const removeBulkFile = (index: number) => {
    setBulkFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Smart title: strip IMG_, DSC_, numbers-only prefixes; apply title prefix if set
  const smartTitle = (filename: string, categoryName: string, index: number) => {
    let title = filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').trim()
    if (/^(IMG|DSC|Screenshot|image|photo|pic)\s*\d*$/i.test(title) || /^\d+$/.test(title) || title.length < 3) {
      title = `${categoryName} Poster ${index + 1}`
    }
    return bulkTitlePrefix.trim() ? `${bulkTitlePrefix.trim()} ${title}` : title
  }

  // Parallel bulk upload, 5 files at a time
  const handleBulkUpload = async () => {
    if (bulkFiles.length === 0) { addToast('No images selected', 'error'); return }
    if (!bulkCategory) { addToast('Select a category', 'error'); return }
    if (!bulkLanguage) { addToast('Select a language', 'error'); return }
    setBulkUploading(true)
    setBulkProgress({ done: 0, total: bulkFiles.length, failed: 0 })

    const categoryName = (allCategories as any[]).find((c: any) => c.id === bulkCategory)?.name || 'Poster'
    let success = 0
    let failed = 0
    const CONCURRENCY = 5

    for (let i = 0; i < bulkFiles.length; i += CONCURRENCY) {
      const batch = bulkFiles.slice(i, i + CONCURRENCY)
      const results = await Promise.allSettled(
        batch.map(async (file, batchIdx) => {
          const { url: imageUrl, thumbnail_url: thumbUrl, detected_ratio } = await uploadApi.uploadWithThumbnail(file)
          const title = smartTitle(file.name, categoryName, i + batchIdx)
          const ratio = (detected_ratio as AspectRatio) || bulkRatio
          await create({
            title, image_url: imageUrl, thumbnail_url: thumbUrl,
            category: bulkCategory, aspect_ratio: ratio, is_premium: bulkPremium,
            is_active: bulkActive, tags: bulkTags.length > 0 ? bulkTags : [],
            festival: bulkFestival,
            language: bulkLanguage,  // Q2=B: required, picked once per batch
            scope: 'business',       // bulk uploads from this page are always business scope
          } as any)
        })
      )
      results.forEach((r, idx) => {
        if (r.status === 'fulfilled') success++
        else { failed++; addToast(`Failed: ${batch[idx].name}`, 'error') }
      })
      setBulkProgress({ done: i + batch.length, total: bulkFiles.length, failed })
    }

    setBulkUploading(false)
    addToast(`Uploaded ${success}/${bulkFiles.length} posters${failed > 0 ? ` (${failed} failed)` : ''}`)
    setBulkFiles([])
    setBulkTags([])
    setBulkFestival(null)
    setBulkActive(true)
    setBulkTitlePrefix('')
    setBulkLanguage(null)
    setBulkUploadOpen(false)
    await refresh()
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div>
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-brand-text">Business Posters</h1>
        <button
          onClick={() => { setBulkCategory(0); setBulkUploadOpen(true) }}
          className="px-4 py-2 bg-brand-indigo text-white text-sm rounded-lg hover:bg-brand-indigo/80 transition-colors inline-flex items-center gap-2 cursor-pointer"
        >
          <Upload className="h-4 w-4" />
          Bulk Upload
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3">
        <input
          placeholder="Search posters..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2 text-sm text-brand-text w-64 focus:outline-none focus:border-brand-gold/50"
        />
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
          <option value="">All Categories</option>
          {categoryOptions.map(c => (
            <option key={c.id} value={c.id}>{c.parent ? `  ${c.name}` : c.name} ({c.poster_count || 0})</option>
          ))}
        </select>
        <select value={ratioFilter} onChange={e => setRatioFilter(e.target.value)} className="bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
          <option value="">All Sizes</option>
          <option value="1:1">1:1</option>
          <option value="4:5">4:5</option>
          <option value="9:16">9:16</option>
          <option value="16:9">16:9</option>
        </select>
        <select value={languageFilter} onChange={e => setLanguageFilter(e.target.value)} className="bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
          <option value="">All Languages</option>
          {languages.filter(l => l.is_active).map(l => (
            <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
          ))}
        </select>
      </div>

      {/* Bulk action bar — appears only when something selected */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-brand-dark-card rounded-xl border border-brand-gold/30 sticky top-2 z-30">
          <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm text-brand-text hover:text-brand-gold transition-colors cursor-pointer">
            <CheckSquare className="h-4 w-4" />
            {selectedIds.size === filteredData.length ? 'Deselect All' : 'Select All'}
          </button>
          <span className="text-sm text-brand-text-muted">{selectedIds.size} selected</span>
          <button onClick={() => setSelectedIds(new Set())} className="text-xs text-brand-text-muted hover:text-brand-text underline cursor-pointer">
            Clear
          </button>
          <button onClick={() => setBulkMoveOpen(true)} className="ml-auto px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 cursor-pointer">
            Move to Category
          </button>
          <button onClick={() => setBulkDeleteOpen(true)} className="px-4 py-1.5 bg-status-error text-white text-sm rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2 cursor-pointer">
            <Trash2 className="h-4 w-4" /> Delete Selected
          </button>
        </div>
      )}

      {/* Poster Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredData.map(poster => {
          const isSelected = selectedIds.has(poster.id)
          return (
            <div key={poster.id} className={`bg-brand-dark-card rounded-xl border overflow-hidden group transition-all ${isSelected ? 'border-brand-gold ring-2 ring-brand-gold/30' : 'border-brand-dark-border/50'}`}>
              {/* Image */}
              <div className="aspect-[4/5] bg-neutral-900 relative overflow-hidden flex items-center justify-center">
                <img src={poster.image_url || poster.thumbnail_url || ''} alt={poster.title} className="w-full h-full object-contain" />

                {/* Multi-select checkbox (top-left) */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleSelect(poster.id) }}
                  className={`absolute top-2 left-2 w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer ${isSelected ? 'bg-brand-gold text-gray-900' : 'bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-black/80'}`}
                  title={isSelected ? 'Deselect' : 'Select'}
                  aria-label={isSelected ? 'Deselect poster' : 'Select poster'}
                >
                  {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                </button>

                {/* Hover overlay actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button onClick={() => openEdit(poster)} className="p-2 bg-brand-gold rounded-lg text-gray-900 cursor-pointer" aria-label="Edit poster"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => setDeleteItem(poster)} className="p-2 bg-status-error rounded-lg text-white cursor-pointer" aria-label="Delete poster"><Trash2 className="h-4 w-4" /></button>
                  <button onClick={() => setPreviewItem(poster)} className="p-2 bg-status-info rounded-lg text-white cursor-pointer" aria-label="Preview poster"><Maximize2 className="h-4 w-4" /></button>
                </div>

                {/* Badges (top-right) */}
                <div className="absolute top-2 right-2 flex flex-col gap-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${poster.is_active ? 'bg-status-success/20 text-status-success' : 'bg-brand-dark-hover text-brand-text-muted'}`}>
                    {poster.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {poster.is_premium && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-brand-gold/20 text-brand-gold">Premium</span>
                  )}
                </div>
              </div>
              {/* Info */}
              <div className="p-3">
                <h3 className="text-sm font-medium text-brand-text truncate">{poster.title}</h3>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-brand-gold/10 text-brand-gold">{poster.category_name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-status-info/10 text-status-info">{poster.aspect_ratio}</span>
                  {poster.language_name ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400" title={`Language: ${poster.language_name}`}>
                      {poster.language_code || poster.language_name}
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-brand-dark-hover text-brand-text-muted" title="No language set (legacy)">--</span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-1.5 text-brand-text-muted">
                  <Download className="h-3 w-3" />
                  <span className="text-xs">{(poster.download_count || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filteredData.length === 0 && (
        <div className="text-center py-16">
          <ImageIcon className="h-12 w-12 text-brand-text-muted/30 mx-auto mb-3" />
          <p className="text-brand-text-muted">No posters found matching your filters.</p>
        </div>
      )}

      {/* Floating Add Button */}
      <button onClick={openAdd} className="fixed bottom-6 right-6 w-14 h-14 bg-brand-gold rounded-full shadow-lg flex items-center justify-center text-gray-900 hover:bg-brand-gold-dark transition-colors z-40 cursor-pointer" aria-label="Add poster">
        <Plus className="h-6 w-6" />
      </button>

      {/* ─── Add/Edit Single-Poster Modal ─── */}
      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} title={editingItem ? 'Edit Business Poster' : 'Add Business Poster'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <ImageUpload label="Thumbnail" value={form.thumbnail_url} onChange={v => setForm(f => ({ ...f, thumbnail_url: v }))} aspectHint="300x300" />
            <ImageUpload label="Full Image" value={form.image_url} onChange={v => setForm(f => ({ ...f, image_url: v }))} aspectHint="1080x1350 (4:5)" onUploadMeta={meta => { if (meta.detected_ratio) setForm(f => ({ ...f, aspect_ratio: meta.detected_ratio as AspectRatio })) }} />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputClass} placeholder="Enter poster title" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Category <span className="text-status-error">*</span></label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: Number(e.target.value) }))} className={inputClass}>
              <option value={0}>-- Select Category --</option>
              {categoryOptions.map(c => (
                <option key={c.id} value={c.id}>{c.parent ? `  ${c.name}` : c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Language <span className="text-status-error">*</span></label>
            <select
              value={form.language ?? ''}
              onChange={e => setForm(f => ({ ...f, language: e.target.value ? Number(e.target.value) : null }))}
              className={inputClass}
            >
              <option value="">-- Select Language --</option>
              {languages.filter(l => l.is_active).map(l => (
                <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Aspect Ratio</label>
              <select value={form.aspect_ratio} onChange={e => setForm(f => ({ ...f, aspect_ratio: e.target.value as AspectRatio }))} className={inputClass}>
                <option value="1:1">1:1</option>
                <option value="4:5">4:5</option>
                <option value="9:16">9:16</option>
                <option value="16:9">16:9</option>
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-brand-text-muted cursor-pointer">
                <input type="checkbox" checked={form.is_premium} onChange={e => setForm(f => ({ ...f, is_premium: e.target.checked }))} className="rounded" />
                Premium
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors cursor-pointer">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors cursor-pointer">Save</button>
          </div>
        </div>
      </Modal>

      {/* ─── Bulk Upload Modal ─── */}
      <Modal
        isOpen={bulkUploadOpen}
        onClose={() => { if (!bulkUploading) { setBulkUploadOpen(false); setBulkFiles([]) } }}
        title="Bulk Upload Business Posters"
        size="lg"
      >
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
            <p className="text-xs text-brand-text-muted mt-1">Uploads 5 files in parallel for speed</p>
            <input ref={bulkFileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleBulkFilesSelected} />
          </div>

          {/* Selected files preview */}
          {bulkFiles.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-1">
              <p className="text-xs font-medium text-brand-text-muted">{bulkFiles.length} images selected</p>
              {bulkFiles.map((file, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1 bg-brand-dark rounded-lg">
                  <img src={URL.createObjectURL(file)} alt="" className="h-8 w-8 rounded object-cover" />
                  <span className="flex-1 text-xs text-brand-text truncate">{file.name}</span>
                  <span className="text-xs text-brand-text-muted">{(file.size / 1024).toFixed(0)}KB</span>
                  <button onClick={() => removeBulkFile(i)} className="p-0.5 text-brand-text-muted hover:text-status-error cursor-pointer" aria-label="Remove file">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Category — required, defaults to empty (Q5=A) */}
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Category <span className="text-status-error">*</span></label>
            <select value={bulkCategory} onChange={e => setBulkCategory(Number(e.target.value))} className={inputClass}>
              <option value={0}>-- Select Category --</option>
              {categoryOptions.map(c => (
                <option key={c.id} value={c.id}>{c.parent ? `  ${c.name}` : c.name} ({c.poster_count || 0})</option>
              ))}
            </select>
          </div>

          {/* Language — required, applies to all files in this batch (Q3=A) */}
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Language <span className="text-status-error">*</span></label>
            <select
              value={bulkLanguage ?? ''}
              onChange={e => setBulkLanguage(e.target.value ? Number(e.target.value) : null)}
              className={inputClass}
            >
              <option value="">-- Select Language --</option>
              {languages.filter(l => l.is_active).map(l => (
                <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
              ))}
            </select>
            <p className="text-[10px] text-brand-text-muted mt-1">All {bulkFiles.length || 'uploaded'} posters will be tagged with this language.</p>
          </div>

          {/* Aspect ratio + Festival */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Aspect Ratio</label>
              <select value={bulkRatio} onChange={e => setBulkRatio(e.target.value as AspectRatio)} className={inputClass}>
                <option value="1:1">1:1 (Square)</option>
                <option value="4:5">4:5 (Portrait)</option>
                <option value="9:16">9:16 (Story)</option>
                <option value="16:9">16:9 (Landscape)</option>
              </select>
              <p className="text-[10px] text-brand-text-muted mt-1">Auto-detected from image; this is the fallback.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Festival (optional)</label>
              <select value={bulkFestival ?? ''} onChange={e => setBulkFestival(e.target.value ? Number(e.target.value) : null)} className={inputClass}>
                <option value="">-- No Festival --</option>
                {(festivals as any[]).map((f: any) => (
                  <option key={f.id} value={f.id}>{f.name}{f.date ? ` (${f.date})` : ''}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Title prefix */}
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Title Prefix (optional)</label>
            <input
              value={bulkTitlePrefix}
              onChange={e => setBulkTitlePrefix(e.target.value)}
              placeholder='e.g. "Diwali Sale —"'
              className={inputClass}
            />
            <p className="text-[10px] text-brand-text-muted mt-1">Prepended to every uploaded poster's auto-generated title.</p>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Tags (applied to all)</label>
            <TagInput value={bulkTags} onChange={setBulkTags} />
          </div>

          {/* Premium + Active */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-brand-text-muted cursor-pointer">
              <input type="checkbox" checked={bulkPremium} onChange={e => setBulkPremium(e.target.checked)} className="rounded" />
              Premium
            </label>
            <label className="flex items-center gap-2 text-sm text-brand-text-muted cursor-pointer">
              <input type="checkbox" checked={bulkActive} onChange={e => setBulkActive(e.target.checked)} className="rounded" />
              Active (visible to users)
            </label>
          </div>

          <p className="text-xs text-green-400/70">Thumbnails are auto-generated from uploaded images.</p>

          {/* Progress bar */}
          {bulkUploading && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Loader2 className="h-4 w-4 animate-spin text-brand-gold" />
                <span className="text-sm text-brand-text">Uploading {bulkProgress.done}/{bulkProgress.total}...</span>
                {bulkProgress.failed > 0 && <span className="text-xs text-status-error">({bulkProgress.failed} failed)</span>}
              </div>
              <div className="w-full bg-brand-dark rounded-full h-2">
                <div className="bg-brand-gold h-2 rounded-full transition-all" style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }} />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setBulkUploadOpen(false); setBulkFiles([]) }} disabled={bulkUploading} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors disabled:opacity-50 cursor-pointer">Cancel</button>
            <button onClick={handleBulkUpload} disabled={bulkUploading || bulkFiles.length === 0} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer">
              {bulkUploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</> : <><Upload className="h-4 w-4" /> Upload {bulkFiles.length} Posters</>}
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Bulk Move Modal ─── */}
      <Modal isOpen={bulkMoveOpen} onClose={() => { setBulkMoveOpen(false); setBulkMoveCategory(0) }} title={`Move ${selectedIds.size} Poster(s) to Category`}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Destination Category</label>
            <select value={bulkMoveCategory} onChange={e => setBulkMoveCategory(Number(e.target.value))} className={inputClass}>
              <option value={0}>-- Select Category --</option>
              {categoryOptions.map(c => (
                <option key={c.id} value={c.id}>{c.parent ? `  ${c.name}` : c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setBulkMoveOpen(false); setBulkMoveCategory(0) }} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors cursor-pointer">Cancel</button>
            <button onClick={handleBulkMove} disabled={bulkMoving || !bulkMoveCategory} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer">
              {bulkMoving ? 'Moving...' : `Move ${selectedIds.size} Posters`}
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Preview Modal ─── */}
      <Modal isOpen={!!previewItem} onClose={() => setPreviewItem(null)} title={previewItem?.title || 'Preview'} size="lg">
        {previewItem && (
          <div className="flex flex-col items-center">
            <img src={previewItem.image_url || previewItem.thumbnail_url || ''} alt={previewItem.title} className="max-h-[70vh] object-contain rounded-lg" />
            <div className="flex items-center gap-3 mt-4">
              <span className="text-xs px-2 py-0.5 rounded-full bg-brand-gold/10 text-brand-gold">{previewItem.category_name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-status-info/10 text-status-info">{previewItem.aspect_ratio}</span>
              {previewItem.is_premium && <span className="text-xs px-2 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold">Premium</span>}
              <span className="text-xs text-brand-text-muted flex items-center gap-1"><Download className="h-3 w-3" />{(previewItem.download_count || 0).toLocaleString()}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Single Delete Confirm ─── */}
      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Poster" message={`Are you sure you want to delete "${deleteItem?.title}"? This action cannot be undone.`} confirmText="Delete" variant="danger" />

      {/* ─── Bulk Delete Confirm ─── */}
      <ConfirmDialog
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        title="Bulk Delete"
        message={`Delete ${selectedIds.size} poster(s)? This cannot be undone.`}
        confirmText={bulkDeleting ? 'Deleting...' : `Delete ${selectedIds.size}`}
        variant="danger"
      />
    </div>
  )
}
