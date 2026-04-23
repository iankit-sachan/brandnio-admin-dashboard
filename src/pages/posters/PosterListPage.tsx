import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Pagination } from '../../components/ui/Pagination'
import { SearchInput } from '../../components/ui/SearchInput'
import { useToast } from '../../context/ToastContext'
import { Pencil, Trash2, Layers, CheckSquare, Upload, X, Loader2, Eye, EyeOff, Maximize2, Filter, RotateCcw, BarChart3 } from 'lucide-react'
import { TagInput } from '../../components/ui/TagInput'
import TemplateLayerEditor from './TemplateLayerEditor'
import { postersApi, posterCategoriesApi, festivalsApi, uploadApi, posterTagsApi, posterBulkApi, posterAnalyticsApi, languagesApi } from '../../services/admin-api'
import { useAdminPaginatedCrud } from '../../hooks/useAdminPaginatedCrud'
import { useAdminCrud } from '../../hooks/useAdminCrud'
import { formatNumber } from '../../utils/formatters'
import QuickStats from '../../components/ui/QuickStats'
import { CategoryTabNav } from '../../components/CategoryTabNav'
import type { Poster, AspectRatio } from '../../types'

interface FormState {
  thumbnail_url: string | null
  image_url: string | null
  title: string
  category: number
  is_premium: boolean
  aspect_ratio: AspectRatio
  tags: string[]
  festival: number | null
  language: number | null
  is_active: boolean
}

const emptyForm: FormState = {
  thumbnail_url: null, image_url: null, title: '', category: 1,
  is_premium: false, aspect_ratio: '1:1', tags: [], festival: null, language: null, is_active: true
}

export default function PosterListPage() {
  const { addToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  // ── URL param handling: ?category=X&upload=1 from Category page shortcuts ──
  const urlCategory = searchParams.get('category') || ''
  const urlUpload = searchParams.get('upload') === '1'

  // ── Filter state ──
  const [filterCategory, setFilterCategory] = useState<string>(urlCategory)
  const [filterRatio, setFilterRatio] = useState<string>('')
  const [filterPremium, setFilterPremium] = useState<string>('')
  const [filterActive, setFilterActive] = useState<string>('')
  const [filterScope, setFilterScope] = useState<string>('')
  const [filterLanguage, setFilterLanguage] = useState<string>('')
  const [filterTag, setFilterTag] = useState<string>('')
  const [filterDateFrom, setFilterDateFrom] = useState<string>('')
  const [filterDateTo, setFilterDateTo] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)
  const [allTags, setAllTags] = useState<{ tag: string; count: number }[]>([])

  // Load all tags for filter dropdown
  useState(() => { posterTagsApi.list().then(setAllTags).catch(() => {}) })

  const extraParams = useMemo(() => {
    const p: Record<string, string | number | undefined> = {}
    if (filterCategory) p.category = filterCategory
    if (filterRatio) p.aspect_ratio = filterRatio
    if (filterPremium) p.is_premium = filterPremium
    if (filterActive) p.is_active = filterActive
    if (filterScope) p.scope = filterScope
    if (filterLanguage) p.language = filterLanguage
    if (filterTag) p.tag = filterTag
    if (filterDateFrom) p['created_at__gte'] = filterDateFrom
    if (filterDateTo) p['created_at__lte'] = filterDateTo
    return p
  }, [filterCategory, filterRatio, filterPremium, filterActive, filterScope, filterLanguage, filterTag, filterDateFrom, filterDateTo])

  const hasFilters = !!(filterCategory || filterRatio || filterPremium || filterActive || filterScope || filterLanguage || filterTag || filterDateFrom || filterDateTo)

  const clearFilters = () => {
    setFilterCategory(''); setFilterRatio(''); setFilterPremium(''); setFilterActive('')
    setFilterScope(''); setFilterLanguage(''); setFilterTag(''); setFilterDateFrom(''); setFilterDateTo('')
  }

  const { data, loading, page, totalPages, totalCount, search, setPage, setSearch, create, update, remove } = useAdminPaginatedCrud<Poster>(postersApi, extraParams)
  const { data: categories } = useAdminCrud(posterCategoriesApi)
  const { data: festivals } = useAdminCrud(festivalsApi)
  const { data: languages } = useAdminCrud<{id: number; name: string; code: string; is_active: boolean}>(languagesApi)
  // 2026-04 UX fix: removed `allFrames` + `matchingFrames` + the
  // "Frames for <ratio>" preview block from the Add/Edit Poster
  // modal. It was read-only visual trivia that confused admins into
  // thinking it was selectable. Frame-poster compatibility is still
  // computed automatically by aspect-ratio match at Android read
  // time (no curated relation). Admins manage frame coverage from
  // the Frames page directly.

  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Poster | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)

  const [deleteItem, setDeleteItem] = useState<Poster | null>(null)
  const [layerEditorPoster, setLayerEditorPoster] = useState<Poster | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false)
  const [bulkMoveCategory, setBulkMoveCategory] = useState<number>(0)
  const [bulkMoving, setBulkMoving] = useState(false)

  // ── Preview state ──
  const [previewPoster, setPreviewPoster] = useState<Poster | null>(null)

  // ── Analytics state ──
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [analytics, setAnalytics] = useState<any>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const loadAnalytics = useCallback(async () => {
    if (analytics) return // cache in session
    setAnalyticsLoading(true)
    try { setAnalytics(await posterAnalyticsApi.get()) }
    catch { /* ignore */ }
    finally { setAnalyticsLoading(false) }
  }, [analytics])

  // Bulk upload state
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false)
  const [bulkFiles, setBulkFiles] = useState<File[]>([])
  const [bulkCategory, setBulkCategory] = useState<number>(urlCategory ? Number(urlCategory) : 0)

  // Auto-open bulk upload when navigated from Category page with ?upload=1
  useEffect(() => {
    if (urlUpload && urlCategory) {
      setBulkUploadOpen(true)
      setBulkCategory(Number(urlCategory))
      setShowFilters(true)
      // Clean URL params so refresh doesn't re-open
      setSearchParams({}, { replace: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [bulkRatio, setBulkRatio] = useState<AspectRatio>('1:1')
  const [bulkPremium, setBulkPremium] = useState(false)
  const [bulkActive, setBulkActive] = useState(true)
  const [bulkTags, setBulkTags] = useState<string[]>([])
  const [bulkFestival, setBulkFestival] = useState<number | null>(null)
  const [bulkLanguage, setBulkLanguage] = useState<number | null>(null)
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0, failed: 0 })
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

  const handleBulkMove = async () => {
    if (selectedIds.size === 0 || !bulkMoveCategory) return
    setBulkMoving(true)
    try {
      const result = await posterBulkApi.bulkMove(Array.from(selectedIds), bulkMoveCategory)
      addToast(`Moved ${result.moved} posters`)
      setSelectedIds(new Set())
      setBulkMoveOpen(false)
      setBulkMoveCategory(0)
    } catch {
      addToast('Move failed', 'error')
    } finally {
      setBulkMoving(false)
    }
  }

  // --- Active toggle directly in table ---
  const toggleActive = async (poster: Poster) => {
    try {
      await update(poster.id, { is_active: !poster.is_active } as any)
      addToast(`Poster ${poster.is_active ? 'hidden' : 'visible'}`)
    } catch {
      addToast('Toggle failed', 'error')
    }
  }

  const openAdd = () => {
    setEditingItem(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (item: Poster) => {
    setEditingItem(item)
    setForm({
      thumbnail_url: item.thumbnail_url, image_url: item.image_url,
      title: item.title, category: item.category, is_premium: item.is_premium,
      aspect_ratio: item.aspect_ratio, tags: item.tags || [],
      festival: item.festival ?? null, language: item.language ?? null, is_active: item.is_active ?? true
    })
    setModalOpen(true)
  }

  const openDelete = (item: Poster) => setDeleteItem(item)

  const handleSubmit = async () => {
    if (!form.title.trim()) { addToast('Title is required', 'error'); return }
    if (!form.language) { addToast('Language is required', 'error'); return }
    try {
      const payload = { ...form }
      if (editingItem) {
        await update(editingItem.id, payload as any)
        addToast('Poster updated successfully')
      } else {
        await create(payload as any)
        addToast('Poster created successfully')
      }
      setForm(emptyForm); setEditingItem(null); setModalOpen(false)
    } catch (err: any) {
      const detail = err?.response?.data
      if (detail && typeof detail === 'object') {
        const msgs = Object.entries(detail).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('; ')
        addToast(msgs || 'Operation failed', 'error')
      } else {
        addToast('Operation failed. Please try again.', 'error')
      }
    }
  }

  const [deleting, setDeleting] = useState(false)
  const handleDelete = async () => {
    if (!deleteItem || deleting) return
    setDeleting(true)
    try {
      await remove(deleteItem.id)
      addToast('Poster deleted successfully')
    } catch (err: any) {
      if (err?.response?.status === 404) {
        addToast('Poster already deleted')
      } else {
        addToast('Delete failed. Please try again.', 'error')
      }
    } finally {
      setDeleteItem(null)
      setDeleting(false)
    }
  }

  const handleSaveTemplateLayers = async (posterId: number, templateData: { layers: unknown[] }) => {
    await update(posterId, { template_data: templateData } as any)
    setLayerEditorPoster(null)
  }

  const handleBulkFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setBulkFiles(prev => [...prev, ...files])
    if (e.target) e.target.value = ''
  }

  const removeBulkFile = (index: number) => {
    setBulkFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Smart title: strip IMG_, DSC_, numbers-only prefixes
  const smartTitle = (filename: string, categoryName: string, index: number) => {
    let title = filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').trim()
    // If title is just numbers or common camera prefixes, generate smart title
    if (/^(IMG|DSC|Screenshot|image|photo|pic)\s*\d*$/i.test(title) || /^\d+$/.test(title) || title.length < 3) {
      title = `${categoryName} Poster ${index + 1}`
    }
    return title
  }

  // Parallel bulk upload with concurrency limit
  const handleBulkUpload = async () => {
    if (bulkFiles.length === 0) { addToast('No images selected', 'error'); return }
    if (!bulkCategory) { addToast('Select a category', 'error'); return }
    if (!bulkLanguage) { addToast('Select a language', 'error'); return }
    setBulkUploading(true)
    setBulkProgress({ done: 0, total: bulkFiles.length, failed: 0 })

    const categoryName = (categories as any[]).find((c: any) => c.id === bulkCategory)?.name || 'Poster'
    let success = 0
    let failed = 0
    const CONCURRENCY = 5

    // Process in batches of CONCURRENCY
    for (let i = 0; i < bulkFiles.length; i += CONCURRENCY) {
      const batch = bulkFiles.slice(i, i + CONCURRENCY)
      const results = await Promise.allSettled(
        batch.map(async (file, batchIdx) => {
          const { url: imageUrl, thumbnail_url: thumbUrl, detected_ratio } = await uploadApi.uploadWithThumbnail(file)
          const title = smartTitle(file.name, categoryName, i + batchIdx)
          // Use server-detected ratio from actual image dimensions, fall back to user selection
          const ratio = (detected_ratio as AspectRatio) || bulkRatio
          await create({
            title, image_url: imageUrl, thumbnail_url: thumbUrl,
            category: bulkCategory, aspect_ratio: ratio, is_premium: bulkPremium,
            is_active: bulkActive, tags: bulkTags.length > 0 ? bulkTags : [],
            festival: bulkFestival,
            language: bulkLanguage,  // Q2=B: required, picked once per batch
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
    setBulkLanguage(null)
    setBulkActive(true)
    setBulkUploadOpen(false)
  }

  const columns: Column<Poster>[] = [
    { key: 'select' as any, title: '', render: (p) => (
      <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} className="rounded cursor-pointer" onClick={e => e.stopPropagation()} />
    )},
    { key: 'thumbnail_url', title: 'Image', render: (p) => (
      p.thumbnail_url || p.image_url ? (
        <img src={p.thumbnail_url || p.image_url || ''} alt={p.title} className="w-12 h-12 rounded object-cover cursor-pointer hover:ring-2 hover:ring-brand-gold/50 transition-all" onClick={(e) => { e.stopPropagation(); setPreviewPoster(p) }} />
      ) : (
        <div className="w-12 h-12 rounded bg-gray-700 flex items-center justify-center text-gray-400 text-xs">No img</div>
      )
    )},
    { key: 'title', title: 'Title', sortable: true },
    { key: 'category_name', title: 'Category', sortable: true },
    { key: 'aspect_ratio', title: 'Ratio' },
    { key: 'language_name' as any, title: 'Language', render: (p) => (
      p.language_name
        ? <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/10 text-blue-400" title={p.language_name}>{p.language_code || p.language_name}</span>
        : <span className="text-brand-text-muted text-xs">--</span>
    )},
    { key: 'tags' as any, title: 'Tags', render: (p) => {
      const tags = p.tags || []
      return tags.length > 0
        ? <div className="flex flex-wrap gap-1">{tags.slice(0, 3).map(t => <span key={t} className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-400">{t}</span>)}{tags.length > 3 && <span className="text-[10px] text-brand-text-muted">+{tags.length - 3}</span>}</div>
        : <span className="text-brand-text-muted text-xs">-</span>
    }},
    { key: 'template_data', title: 'Layers', render: (p) => {
      const count = ((p.template_data as any)?.layers as unknown[])?.length || 0
      return count > 0
        ? <span className="px-2 py-0.5 rounded-full text-xs bg-brand-gold/10 text-brand-gold">{count} layers</span>
        : <span className="text-brand-text-muted text-xs">None</span>
    }},
    { key: 'is_premium', title: 'Premium', render: (p) => p.is_premium ? <span className="text-brand-gold">Premium</span> : <span className="text-brand-text-muted">Free</span> },
    { key: 'is_active' as any, title: 'Active', render: (p) => (
      <button onClick={(e) => { e.stopPropagation(); toggleActive(p) }} className="p-1" title="Toggle visibility">
        {p.is_active !== false ? <Eye className="h-4 w-4 text-green-400" /> : <EyeOff className="h-4 w-4 text-brand-text-muted" />}
      </button>
    )},
    { key: 'download_count', title: 'DL', sortable: true, render: (p) => formatNumber(p.download_count as number) },
    { key: 'created_at', title: 'Created', sortable: true, render: (p) => {
      const d = new Date(p.created_at)
      return <span className="text-xs text-brand-text-muted whitespace-nowrap">{d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</span>
    }},
    { key: 'actions', title: '', render: (item) => (
      <div className="flex items-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); setPreviewPoster(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-blue-400 transition-colors" title="Preview"><Maximize2 className="h-4 w-4" /></button>
        <button onClick={(e) => { e.stopPropagation(); setLayerEditorPoster(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-gold transition-colors" title="Edit Layers"><Layers className="h-4 w-4" /></button>
        <button onClick={(e) => { e.stopPropagation(); openEdit(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-gold transition-colors" title="Edit"><Pencil className="h-4 w-4" /></button>
        <button onClick={(e) => { e.stopPropagation(); openDelete(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-status-error transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      <CategoryTabNav />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-text">Poster Templates</h1>
        <div className="flex items-center gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search posters..." className="w-64" />
          <button onClick={() => setShowFilters(f => !f)} className={`px-3 py-2 text-sm rounded-lg border transition-colors flex items-center gap-1.5 ${hasFilters ? 'bg-brand-gold/10 border-brand-gold/50 text-brand-gold' : 'bg-brand-dark-card border-brand-dark-border text-brand-text-muted hover:text-brand-text'}`}>
            <Filter className="h-4 w-4" /> Filters {hasFilters && <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-brand-gold text-gray-900 font-bold">{[filterCategory, filterRatio, filterPremium, filterActive, filterScope, filterLanguage, filterTag, filterDateFrom, filterDateTo].filter(Boolean).length}</span>}
          </button>
          <button onClick={() => setBulkUploadOpen(true)} className="px-4 py-2 bg-blue-600 text-white font-medium text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5">
            <Upload className="h-4 w-4" /> Bulk Upload
          </button>
          <button onClick={openAdd} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">+ Add Poster</button>
        </div>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="flex items-center gap-3 p-3 bg-brand-dark-card rounded-xl border border-brand-dark-border/50 flex-wrap">
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50 min-w-[180px]">
            <option value="">All Categories</option>
            {(categories as any[]).filter((c: any) => !c.parent).map((c: any) => {
              const children = (categories as any[]).filter((sub: any) => sub.parent === c.id)
              return [
                <option key={c.id} value={c.id}>{c.name} ({c.poster_count || 0})</option>,
                ...children.map((sub: any) => <option key={sub.id} value={sub.id}>&nbsp;&nbsp;{sub.name} ({sub.poster_count || 0})</option>)
              ]
            })}
          </select>
          <select value={filterRatio} onChange={e => setFilterRatio(e.target.value)} className="bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
            <option value="">All Ratios</option>
            <option value="1:1">1:1 Square</option>
            <option value="4:5">4:5 Portrait</option>
            <option value="9:16">9:16 Story</option>
            <option value="16:9">16:9 Landscape</option>
          </select>
          <select value={filterPremium} onChange={e => setFilterPremium(e.target.value)} className="bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
            <option value="">Free & Premium</option>
            <option value="true">Premium Only</option>
            <option value="false">Free Only</option>
          </select>
          <select value={filterActive} onChange={e => setFilterActive(e.target.value)} className="bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
            <option value="">Active & Hidden</option>
            <option value="true">Active Only</option>
            <option value="false">Hidden Only</option>
          </select>
          <select value={filterScope} onChange={e => setFilterScope(e.target.value)} className="bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" title="Filter by scope (which admin tab the poster belongs to)">
            <option value="">All Scopes</option>
            <option value="home">Home Tab</option>
            <option value="categories">Categories Tab</option>
            <option value="business">Business Tab</option>
            <option value="festival">Festival</option>
            <option value="greeting">Greeting</option>
          </select>
          <select value={filterLanguage} onChange={e => setFilterLanguage(e.target.value)} className="bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" title="Filter by language">
            <option value="">All Languages</option>
            {(languages as any[]).filter((l: any) => l.is_active).map((l: any) => (
              <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
            ))}
          </select>
          <select value={filterTag} onChange={e => setFilterTag(e.target.value)} className="bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50 min-w-[140px]">
            <option value="">All Tags</option>
            {allTags.map(t => <option key={t.tag} value={t.tag}>{t.tag} ({t.count})</option>)}
          </select>
          <div className="flex items-center gap-1">
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="bg-brand-dark border border-brand-dark-border rounded-lg px-2 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-gold/50 w-[130px]" title="From date" />
            <span className="text-brand-text-muted text-xs">to</span>
            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="bg-brand-dark border border-brand-dark-border rounded-lg px-2 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-gold/50 w-[130px]" title="To date" />
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="px-3 py-2 text-sm text-brand-text-muted hover:text-status-error transition-colors flex items-center gap-1">
              <RotateCcw className="h-3.5 w-3.5" /> Clear
            </button>
          )}
          <span className="ml-auto text-xs text-brand-text-muted">{totalCount} results</span>
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-brand-dark-card rounded-xl border border-brand-gold/30">
          <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm text-brand-text hover:text-brand-gold transition-colors">
            <CheckSquare className="h-4 w-4" />
            {selectedIds.size === data.length ? 'Deselect Page' : 'Select Page'}
          </button>
          <span className="text-sm text-brand-text-muted">{selectedIds.size} on this page selected</span>
          <button onClick={() => setBulkMoveOpen(true)} className="ml-auto px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
            Move to Category
          </button>
          <button onClick={() => setBulkDeleteOpen(true)} className="px-4 py-1.5 bg-status-error text-white text-sm rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2">
            <Trash2 className="h-4 w-4" /> Delete Selected
          </button>
        </div>
      )}
      {/* Analytics toggle + stats */}
      <div className="flex items-center gap-3">
        <QuickStats stats={[{ label: 'Total', count: totalCount }]} />
        <button onClick={() => { setShowAnalytics(s => !s); if (!analytics) loadAnalytics() }} className={`px-3 py-2 text-sm rounded-lg border transition-colors flex items-center gap-1.5 ${showAnalytics ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'bg-brand-dark-card border-brand-dark-border text-brand-text-muted hover:text-brand-text'}`}>
          <BarChart3 className="h-4 w-4" /> Analytics
        </button>
      </div>
      {showAnalytics && (
        <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 p-4 space-y-4">
          {analyticsLoading ? (
            <div className="text-center py-4 text-brand-text-muted">Loading analytics...</div>
          ) : analytics ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-brand-dark rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-brand-text">{analytics.total?.toLocaleString()}</p>
                  <p className="text-xs text-brand-text-muted">Total Posters</p>
                </div>
                <div className="bg-brand-dark rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-400">{analytics.active?.toLocaleString()}</p>
                  <p className="text-xs text-brand-text-muted">Active</p>
                </div>
                <div className="bg-brand-dark rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-brand-gold">{analytics.premium?.toLocaleString()}</p>
                  <p className="text-xs text-brand-text-muted">Premium</p>
                </div>
                <div className="bg-brand-dark rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-400">{(analytics.total_downloads || 0).toLocaleString()}</p>
                  <p className="text-xs text-brand-text-muted">Total Downloads</p>
                </div>
              </div>
              {analytics.top_downloaded?.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-brand-text mb-2">Top 10 Most Downloaded</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {analytics.top_downloaded.map((p: any) => (
                      <div key={p.id} className="bg-brand-dark rounded-lg p-2 text-center">
                        {p.thumbnail_url ? <img src={p.thumbnail_url} alt="" className="w-full h-16 object-contain rounded mb-1" /> : <div className="w-full h-16 bg-gray-700 rounded mb-1" />}
                        <p className="text-[10px] text-brand-text truncate">{p.title}</p>
                        <p className="text-[10px] text-brand-gold font-medium">{(p.download_count || 0).toLocaleString()} DL</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {analytics.by_category?.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-brand-text mb-2">By Category</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {analytics.by_category.map((c: any) => (
                      <div key={c.category__name} className="flex items-center justify-between bg-brand-dark rounded-lg px-3 py-2">
                        <span className="text-xs text-brand-text truncate">{c.category__name || 'Uncategorized'}</span>
                        <span className="text-xs text-brand-text-muted ml-2 shrink-0">{c.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading ? <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div> : <DataTable columns={columns} data={data} />}
        <Pagination currentPage={page} totalPages={totalPages} totalCount={totalCount} onPageChange={setPage} />
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} title={editingItem ? 'Edit Poster' : 'Add Poster'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <ImageUpload label="Thumbnail" value={form.thumbnail_url} onChange={v => setForm(f => ({ ...f, thumbnail_url: v }))} aspectHint="300x300 (auto-generated)" />
            <ImageUpload
              label="Full Image"
              value={form.image_url}
              onChange={v => setForm(f => ({ ...f, image_url: v }))}
              onUploadMeta={meta => {
                setForm(f => {
                  const updates: Partial<FormState> = {}
                  if (meta.thumbnail_url && !f.thumbnail_url) updates.thumbnail_url = meta.thumbnail_url
                  if (meta.detected_ratio) updates.aspect_ratio = meta.detected_ratio as AspectRatio
                  return { ...f, ...updates }
                })
                if (meta.detected_ratio) {
                  addToast(`Auto-detected ratio: ${meta.detected_ratio}${meta.width && meta.height ? ` (${meta.width}x${meta.height})` : ''}`)
                }
              }}
              aspectHint="1080x1080"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: Number(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
                {(categories as any[]).filter((c: any) => !c.parent).map((c: any) => {
                  const children = (categories as any[]).filter((sub: any) => sub.parent === c.id)
                  return [
                    <option key={c.id} value={c.id}>{c.name} ({c.poster_count || 0})</option>,
                    ...children.map((sub: any) => <option key={sub.id} value={sub.id}>&nbsp;&nbsp;{sub.name} ({sub.poster_count || 0})</option>)
                  ]
                })}
              </select>
            </div>
            {/* Aspect Ratio */}
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Aspect Ratio</label>
              <select value={form.aspect_ratio} onChange={e => setForm(f => ({ ...f, aspect_ratio: e.target.value as AspectRatio }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
                <option value="1:1">1:1 (Square)</option>
                <option value="4:5">4:5 (Portrait)</option>
                <option value="9:16">9:16 (Story)</option>
                <option value="16:9">16:9 (Landscape)</option>
              </select>
            </div>
          </div>

          {/* 2026-04: "Frames for <ratio>" preview removed — was
              read-only noise that confused admins. See Frames admin
              page for frame coverage per aspect ratio. */}

          {/* Festival (P3 fix) */}
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Festival (optional)</label>
            <select value={form.festival ?? ''} onChange={e => setForm(f => ({ ...f, festival: e.target.value ? Number(e.target.value) : null }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
              <option value="">-- No Festival --</option>
              {(festivals as any[]).map((f: any) => (
                <option key={f.id} value={f.id}>{f.name} ({f.date})</option>
              ))}
            </select>
          </div>

          {/* Language (Q2=B: required) */}
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Language <span className="text-status-error">*</span></label>
            <select value={form.language ?? ''} onChange={e => setForm(f => ({ ...f, language: e.target.value ? Number(e.target.value) : null }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
              <option value="">-- Select Language --</option>
              {(languages as any[]).filter((l: any) => l.is_active).map((l: any) => (
                <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
              ))}
            </select>
          </div>

          {/* Tags with autocomplete */}
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Tags</label>
            <TagInput value={form.tags} onChange={tags => setForm(f => ({ ...f, tags }))} />
          </div>

          {/* Premium + Active */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-brand-text-muted">
              <input type="checkbox" checked={form.is_premium} onChange={e => setForm(f => ({ ...f, is_premium: e.target.checked }))} className="rounded" />
              Premium
            </label>
            <label className="flex items-center gap-2 text-sm text-brand-text-muted">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
              Active (visible to users)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">Save</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Poster" message={`Are you sure you want to delete "${deleteItem?.title}"? This action cannot be undone.`} confirmText="Delete" variant="danger" />

      <ConfirmDialog isOpen={bulkDeleteOpen} onClose={() => setBulkDeleteOpen(false)} onConfirm={handleBulkDelete} title="Bulk Delete" message={`Delete ${selectedIds.size} poster(s)? They will be moved to the Recycle Bin.`} confirmText={bulkDeleting ? 'Deleting...' : `Delete ${selectedIds.size}`} variant="danger" />

      {/* Bulk Move Modal */}
      <Modal isOpen={bulkMoveOpen} onClose={() => { setBulkMoveOpen(false); setBulkMoveCategory(0) }} title={`Move ${selectedIds.size} Poster(s) to Category`}>
        <div className="space-y-4">
          <select value={bulkMoveCategory} onChange={e => setBulkMoveCategory(Number(e.target.value))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
            <option value={0}>-- Select Target Category --</option>
            {(categories as any[]).filter((c: any) => !c.parent).map((c: any) => {
              const children = (categories as any[]).filter((sub: any) => sub.parent === c.id)
              return [
                <option key={c.id} value={c.id}>{c.name} ({c.poster_count || 0})</option>,
                ...children.map((sub: any) => <option key={sub.id} value={sub.id}>&nbsp;&nbsp;{sub.name} ({sub.poster_count || 0})</option>)
              ]
            })}
          </select>
          <div className="flex justify-end gap-3">
            <button onClick={() => { setBulkMoveOpen(false); setBulkMoveCategory(0) }} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text">Cancel</button>
            <button onClick={handleBulkMove} disabled={!bulkMoveCategory || bulkMoving} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {bulkMoving ? 'Moving...' : `Move ${selectedIds.size} Posters`}
            </button>
          </div>
        </div>
      </Modal>

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
            <p className="text-xs text-brand-text-muted mt-1">Uploads 5 files in parallel for speed</p>
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
              {(categories as any[]).filter((c: any) => !c.parent).map((c: any) => {
                const children = (categories as any[]).filter((sub: any) => sub.parent === c.id)
                return [
                  <option key={c.id} value={c.id}>{c.name} ({c.poster_count || 0})</option>,
                  ...children.map((sub: any) => <option key={sub.id} value={sub.id}>&nbsp;&nbsp;{sub.name} ({sub.poster_count || 0})</option>)
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
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Festival (optional)</label>
              <select value={bulkFestival ?? ''} onChange={e => setBulkFestival(e.target.value ? Number(e.target.value) : null)} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
                <option value="">-- No Festival --</option>
                {(festivals as any[]).map((f: any) => (
                  <option key={f.id} value={f.id}>{f.name} ({f.date})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Language for bulk (Q2=B: required, Q3=A: one per batch) */}
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Language <span className="text-status-error">*</span></label>
            <select value={bulkLanguage ?? ''} onChange={e => setBulkLanguage(e.target.value ? Number(e.target.value) : null)} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
              <option value="">-- Select Language --</option>
              {(languages as any[]).filter((l: any) => l.is_active).map((l: any) => (
                <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
              ))}
            </select>
            <p className="text-[10px] text-brand-text-muted mt-1">Applied to all uploaded posters in this batch.</p>
          </div>

          {/* Tags for bulk */}
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Tags (applied to all)</label>
            <TagInput value={bulkTags} onChange={setBulkTags} />
          </div>

          {/* Premium + Active */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-brand-text-muted">
              <input type="checkbox" checked={bulkPremium} onChange={e => setBulkPremium(e.target.checked)} className="rounded" />
              Premium
            </label>
            <label className="flex items-center gap-2 text-sm text-brand-text-muted">
              <input type="checkbox" checked={bulkActive} onChange={e => setBulkActive(e.target.checked)} className="rounded" />
              Active (visible to users)
            </label>
          </div>

          <p className="text-xs text-green-400/70">Thumbnails are auto-generated from uploaded images</p>

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
            <button onClick={() => { setBulkUploadOpen(false); setBulkFiles([]) }} disabled={bulkUploading} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors disabled:opacity-50">Cancel</button>
            <button onClick={handleBulkUpload} disabled={bulkUploading || bulkFiles.length === 0} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors disabled:opacity-50 flex items-center gap-1.5">
              {bulkUploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</> : <><Upload className="h-4 w-4" /> Upload {bulkFiles.length} Posters</>}
            </button>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      {previewPoster && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPreviewPoster(null)}>
          <div className="relative max-w-4xl w-full bg-brand-dark-card rounded-2xl overflow-hidden border border-brand-dark-border/50" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-brand-dark-border/50">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-brand-text truncate">{previewPoster.title}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-brand-text-muted">{previewPoster.category_name}</span>
                  <span className="text-xs text-brand-text-muted">|</span>
                  <span className="text-xs text-brand-text-muted">{previewPoster.aspect_ratio}</span>
                  {previewPoster.is_premium && <span className="px-1.5 py-0.5 rounded text-[10px] bg-brand-gold/15 text-brand-gold">Premium</span>}
                  {((previewPoster.template_data as any)?.layers as unknown[])?.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/15 text-blue-400">{((previewPoster.template_data as any)?.layers as unknown[])?.length} layers</span>
                  )}
                  <span className="text-xs text-brand-text-muted">| DL: {formatNumber(previewPoster.download_count)}</span>
                  {previewPoster.is_active === false && <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/15 text-red-400">Hidden</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 ml-3">
                <button onClick={() => { openEdit(previewPoster); setPreviewPoster(null) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-gold transition-colors" title="Edit"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => { setLayerEditorPoster(previewPoster); setPreviewPoster(null) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-gold transition-colors" title="Edit Layers"><Layers className="h-4 w-4" /></button>
                <button onClick={() => setPreviewPoster(null)} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-text transition-colors"><X className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="flex items-center justify-center p-4 bg-[#1a1a2e] min-h-[300px] max-h-[70vh]">
              {previewPoster.image_url ? (
                <img src={previewPoster.image_url} alt={previewPoster.title} className="max-h-[65vh] max-w-full object-contain rounded" />
              ) : previewPoster.thumbnail_url ? (
                <img src={previewPoster.thumbnail_url} alt={previewPoster.title} className="max-h-[65vh] max-w-full object-contain rounded" />
              ) : (
                <div className="text-brand-text-muted text-sm">No image available</div>
              )}
            </div>
            {previewPoster.tags && previewPoster.tags.length > 0 && (
              <div className="px-4 py-2 border-t border-brand-dark-border/50 flex flex-wrap gap-1">
                {previewPoster.tags.map(t => <span key={t} className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-500/10 text-indigo-400">{t}</span>)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
