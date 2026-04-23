import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { Grid3X3, Pencil, Trash2, Plus, Search, ChevronRight, FolderTree, Image, X, ChevronLeft, ArrowUp, ArrowDown, CheckSquare, Square } from 'lucide-react'
import { posterCategoriesApi, postersApi, uploadApi, languagesApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'
import { CategoryTabNav } from '../../components/CategoryTabNav'

interface LanguageOption {
  id: number
  name: string
  code: string
  is_active: boolean
}

interface GeneralCategory {
  id: number
  name: string
  slug: string
  icon_url: string | null
  sort_order: number
  is_active: boolean
  show_in_home: boolean
  show_in_create: boolean
  parent: number | null
  parent_name: string | null
  children_count: number
  poster_count: number
  section_type: string
  // 2026-04: optional language — NULL means language-agnostic
  language: number | null
  language_name: string
  language_code: string
  // 2026-04 scope fix: which admin tab this category belongs to.
  // See BusinessCategoryPage for details.
  default_scope: 'home' | 'categories' | 'business' | 'festival' | 'greeting'
}

interface PosterItem {
  id: number
  title: string
  thumbnail_url: string
  image_url: string
  category: number
  category_name: string
  aspect_ratio: string
  is_premium: boolean
}

interface FormState {
  icon_url: string | null
  name: string
  slug: string
  sort_order: number
  is_active: boolean
  show_in_home: boolean
  show_in_create: boolean
  parent: number | null
  section_type: string
  language: number | null
  default_scope: 'home' | 'categories' | 'business' | 'festival' | 'greeting'
}

// 2026-04: on this page (All Categories admin), NEW categories default
// to scope='categories' so they land in the Category tab. Admin can
// flip via the edit form.
const emptyForm: FormState = { icon_url: null, name: '', slug: '', sort_order: 0, is_active: true, show_in_home: true, show_in_create: true, parent: null, section_type: 'normal', language: null, default_scope: 'categories' }

function toSlug(name: string) {
  return name.toLowerCase().replace(/ & /g, '-').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function GeneralCategoryPage() {
  const { addToast } = useToast()

  // Language filter: '' = all, 'null' = language-agnostic rows only,
  // otherwise a numeric language ID. Passed as `?language=` query param.
  const [languageFilter, setLanguageFilter] = useState<string>('')

  // 2026-04 strict scope separation: this page (reached via CATEGORY
  // TAB → Poster Categories) only manages Category-tab rows. Business-
  // scope rows are hidden here — admin goes to BUSINESS TAB → Business
  // Categories to manage those. Mirror structure of Business Categories
  // page which filters to ?default_scope=business.
  const crudParams = useMemo(() => {
    const params: Record<string, string> = { default_scope: 'categories' }
    if (languageFilter) params.language = languageFilter
    return params
  }, [languageFilter])

  const { data, loading, error, create, update, remove, refresh } =
    useAdminCrud<GeneralCategory>(posterCategoriesApi, crudParams)
  const { data: languages } = useAdminCrud<LanguageOption>(languagesApi)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<GeneralCategory | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<GeneralCategory | null>(null)
  const [search, setSearch] = useState('')
  const [viewingParent, setViewingParent] = useState<GeneralCategory | null>(null)
  const [viewingSubcat, setViewingSubcat] = useState<GeneralCategory | null>(null)

  // Bulk-select mode: while active, clicking a card toggles selection
  // instead of navigating into it. Toggle off to return to nav mode.
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const clearSelection = () => { setSelectedIds(new Set()); setSelectMode(false) }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    setBulkDeleting(true)
    try {
      const ids = Array.from(selectedIds)
      await Promise.all(ids.map(id => remove(id).catch(() => null)))
      addToast(`Moved ${ids.length} ${ids.length === 1 ? 'category' : 'categories'} to Recycle Bin`)
      clearSelection()
      setBulkDeleteOpen(false)
      refresh()
    } catch {
      addToast('Some deletes failed', 'error')
    } finally {
      setBulkDeleting(false)
    }
  }

  // Poster management state for subcategory view
  const [posters, setPosters] = useState<PosterItem[]>([])
  const [postersLoading, setPostersLoading] = useState(false)
  const [posterPage, setPosterPage] = useState(1)
  const [posterTotalCount, setPosterTotalCount] = useState(0)
  const [posterSearch, setPosterSearch] = useState('')
  const [posterSearchInput, setPosterSearchInput] = useState('')
  const posterSearchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const POSTER_PAGE_SIZE = 30
  const posterTotalPages = Math.max(1, Math.ceil(posterTotalCount / POSTER_PAGE_SIZE))
  const [uploading, setUploading] = useState(false)
  const [deletePoster, setDeletePoster] = useState<PosterItem | null>(null)

  // Top-level categories (no parent)
  const topLevel = data.filter(c => c.parent === null)
  // Subcategories of the currently viewed parent
  const subcategories = viewingParent ? data.filter(c => c.parent === viewingParent.id) : []
  // What to show in the grid
  const displayList = viewingParent ? subcategories : topLevel
  const filtered = displayList.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  // Only top-level categories can be parents (no deep nesting)
  const parentOptions = topLevel

  // Load posters when viewing a subcategory (paginated + filtered)
  const loadPosters = useCallback(async (categoryId: number, page: number, searchQuery: string) => {
    setPostersLoading(true)
    try {
      const params: Record<string, string | number | undefined> = {
        category: categoryId,
        page,
        page_size: POSTER_PAGE_SIZE,
      }
      if (searchQuery) params.search = searchQuery
      const result = await postersApi.listPaginated(params)
      setPosters(result.results as PosterItem[])
      setPosterTotalCount(result.count)
    } catch {
      setPosters([])
      setPosterTotalCount(0)
    }
    setPostersLoading(false)
  }, [])

  useEffect(() => {
    if (viewingSubcat) {
      loadPosters(viewingSubcat.id, posterPage, posterSearch)
    }
  }, [viewingSubcat, posterPage, posterSearch, loadPosters])

  const handleImageUpload = async (file: File) => {
    if (!viewingSubcat) return
    setUploading(true)
    try {
      const { url, thumbnail_url: thumbUrl, detected_ratio } = await uploadApi.uploadWithThumbnail(file)
      const title = file.name.replace(/\.[^.]+$/, '')
      await postersApi.create({
        title,
        category: viewingSubcat.id,
        thumbnail_url: thumbUrl || url,
        image_url: url,
        aspect_ratio: detected_ratio || '1:1',
        is_premium: false,
      } as any)
      addToast('Poster uploaded successfully')
      loadPosters(viewingSubcat.id, posterPage, posterSearch)
      refresh()
    } catch {
      addToast('Upload failed. Please try again.', 'error')
    }
    setUploading(false)
  }

  const handleDeletePoster = async () => {
    if (!deletePoster || !viewingSubcat) return
    try {
      await postersApi.delete(deletePoster.id)
      addToast('Poster deleted')
      setDeletePoster(null)
      loadPosters(viewingSubcat.id, posterPage, posterSearch)
      refresh()
    } catch {
      addToast('Delete failed', 'error')
    }
  }

  const moveCategory = async (cat: GeneralCategory, direction: 'up' | 'down') => {
    const list = filtered
    const idx = list.findIndex(c => c.id === cat.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= list.length) return
    const other = list[swapIdx]
    try {
      await update(cat.id, { sort_order: other.sort_order } as any)
      await update(other.id, { sort_order: cat.sort_order } as any)
      addToast('Order updated')
    } catch { addToast('Reorder failed', 'error') }
  }

  const openAdd = (parentId: number | null = null) => {
    setEditingItem(null)
    setForm({ ...emptyForm, parent: parentId })
    setModalOpen(true)
  }

  const openEdit = (item: GeneralCategory) => {
    setEditingItem(item)
    setForm({ icon_url: item.icon_url, name: item.name, slug: item.slug, sort_order: item.sort_order ?? 0, is_active: item.is_active, show_in_home: item.show_in_home ?? true, show_in_create: item.show_in_create ?? true, parent: item.parent, section_type: item.section_type || 'normal', language: item.language, default_scope: item.default_scope ?? 'categories' })
    setModalOpen(true)
  }

  const openDelete = (item: GeneralCategory) => setDeleteItem(item)

  const handleSubmit = async () => {
    if (!form.name.trim()) { addToast('Name is required', 'error'); return }
    if (data.some(d => d.slug === form.slug && d.id !== editingItem?.id)) { addToast('A category with this slug already exists', 'error'); return }
    try {
      if (editingItem) {
        await update(editingItem.id, form)
        addToast('Category updated successfully')
      } else {
        await create(form)
        addToast('Category created successfully')
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
      addToast('Category moved to Recycle Bin')
      setDeleteItem(null)
      if (viewingSubcat?.id === deleteItem.id) setViewingSubcat(null)
    } catch {
      addToast('Delete failed. Please try again.', 'error')
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div>
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <p className="text-status-error text-sm">{error}</p>
        <button onClick={refresh} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">Retry</button>
      </div>
    )
  }

  // ========== Level 3: Viewing posters inside a subcategory ==========
  if (viewingSubcat && viewingParent) {
    return (
      <div className="space-y-4">
        <CategoryTabNav />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => { setViewingParent(null); setViewingSubcat(null) }} className="text-brand-gold hover:underline text-lg font-bold">Categories</button>
            <ChevronRight className="h-5 w-5 text-brand-text-muted" />
            <button onClick={() => setViewingSubcat(null)} className="text-brand-gold hover:underline text-lg font-bold">{viewingParent.name}</button>
            <ChevronRight className="h-5 w-5 text-brand-text-muted" />
            <h1 className="text-2xl font-bold text-brand-text">{viewingSubcat.name}</h1>
            <span className="text-sm text-brand-text-muted ml-1">({posterTotalCount} posters)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-text-muted" />
              <input value={posterSearchInput} onChange={e => {
                const val = e.target.value
                setPosterSearchInput(val)
                if (posterSearchTimer.current) clearTimeout(posterSearchTimer.current)
                posterSearchTimer.current = setTimeout(() => { setPosterSearch(val); setPosterPage(1) }, 300)
              }} placeholder="Search posters..." className="pl-10 pr-4 py-2 bg-brand-dark border border-brand-dark-border rounded-lg text-sm text-brand-text focus:outline-none focus:border-brand-gold/50 w-48" />
            </div>
            <button onClick={() => openEdit(viewingSubcat)} className="px-3 py-1.5 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">Edit Category</button>
          </div>
        </div>

        {/* Upload area */}
        <div className="bg-brand-dark-card rounded-xl border-2 border-dashed border-brand-dark-border/50 p-6">
          <label className={`flex flex-col items-center justify-center cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => {
                const files = Array.from(e.target.files || [])
                files.forEach(f => handleImageUpload(f))
                e.target.value = ''
              }}
            />
            <Plus className="h-8 w-8 text-brand-gold mb-2" />
            <p className="text-sm text-brand-text font-medium">{uploading ? 'Uploading...' : 'Click to upload posters'}</p>
            <p className="text-xs text-brand-text-muted mt-1">Select multiple images to upload at once</p>
          </label>
        </div>

        {/* Poster grid */}
        {postersLoading ? (
          <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading posters...</div>
        ) : posters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-brand-text-muted">
            <Image className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">No posters yet</p>
            <p className="text-xs mt-1">Upload images above to add posters to "{viewingSubcat.name}"</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {posters.map(p => (
                <div key={p.id} className="relative group rounded-xl overflow-hidden border border-brand-dark-border/50 bg-brand-dark-card">
                  <img src={p.thumbnail_url || p.image_url} alt={p.title} className="w-full aspect-square object-contain bg-neutral-900" />
                  <div className="p-2">
                    <p className="text-xs text-brand-text truncate">{p.title}</p>
                  </div>
                  <button
                    onClick={() => setDeletePoster(p)}
                    className="absolute top-1 right-1 p-1 bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-status-error hover:bg-black/90"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            {/* Pagination */}
            {posterTotalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <button onClick={() => setPosterPage(p => Math.max(1, p - 1))} disabled={posterPage <= 1} className="p-2 rounded-lg bg-brand-dark-card border border-brand-dark-border text-brand-text-muted hover:text-brand-text disabled:opacity-30 transition-colors">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-brand-text-muted">Page {posterPage} of {posterTotalPages} ({posterTotalCount} posters)</span>
                <button onClick={() => setPosterPage(p => Math.min(posterTotalPages, p + 1))} disabled={posterPage >= posterTotalPages} className="p-2 rounded-lg bg-brand-dark-card border border-brand-dark-border text-brand-text-muted hover:text-brand-text disabled:opacity-30 transition-colors">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}

        <ConfirmDialog isOpen={!!deletePoster} onClose={() => setDeletePoster(null)} onConfirm={handleDeletePoster} title="Delete Poster" message={`Are you sure you want to delete "${deletePoster?.title}"?`} confirmText="Delete" variant="danger" />
        <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} title={editingItem ? 'Edit Category' : 'Add Subcategory'}>
          <div className="space-y-4">
            <ImageUpload label="Category Icon" value={form.icon_url} onChange={v => setForm(f => ({ ...f, icon_url: v }))} aspectHint="Square icon, 128x128 recommended" />
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: toSlug(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Slug</label>
                <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Sort Order</label>
                <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Section Type</label>
              <select value={form.section_type} onChange={e => setForm(f => ({ ...f, section_type: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
                <option value="normal">Normal</option>
                <option value="grand_opening">Grand Opening</option>
                <option value="calendar_anchor">Calendar Anchor</option>
                <option value="video_cards">Video Cards</option>
              </select>
            </div>
            {/* 2026-04 scope fix: admin tab assignment. Level-3 modal
                also exposes this so edits drilled into a subcategory
                can re-classify. */}
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">
                Admin Tab <span className="text-status-error">*</span>
              </label>
              <select
                value={form.default_scope}
                onChange={e => setForm(f => ({
                  ...f,
                  default_scope: e.target.value as FormState['default_scope'],
                }))}
                className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50"
              >
                <option value="categories">Categories Tab</option>
                <option value="business">Business Tab</option>
                <option value="home">Home Tab</option>
                <option value="festival">Festival</option>
                <option value="greeting">Greeting</option>
              </select>
              <p className="text-[11px] text-brand-text-muted mt-1">
                Posters uploaded into this category will appear under this tab.
              </p>
            </div>
            {/* Level-3 modal also exposes the language field so edits
                made while drilled into a subcategory stay consistent. */}
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">
                Language <span className="text-brand-text-muted/60">(optional)</span>
              </label>
              <select
                value={form.language ?? ''}
                onChange={e => setForm(f => ({
                  ...f,
                  language: e.target.value === '' ? null : Number(e.target.value),
                }))}
                className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50"
              >
                <option value="">— All languages —</option>
                {languages.filter(l => l.is_active).map(l => (
                  <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
                <label className="text-sm text-brand-text-muted">Active</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.show_in_home} onChange={e => setForm(f => ({ ...f, show_in_home: e.target.checked }))} className="rounded" />
                <label className="text-sm text-green-400">Show in Home</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.show_in_create} onChange={e => setForm(f => ({ ...f, show_in_create: e.target.checked }))} className="rounded" />
                <label className="text-sm text-purple-400">Show in Create</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">Cancel</button>
              <button onClick={handleSubmit} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">Save</button>
            </div>
          </div>
        </Modal>
      </div>
    )
  }

  // ========== Level 1 & 2: Categories / Subcategories grid ==========
  return (
    <div className="space-y-4">
      <CategoryTabNav />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {viewingParent ? (
            <>
              <button onClick={() => setViewingParent(null)} className="text-brand-gold hover:underline text-lg font-bold">Categories</button>
              <ChevronRight className="h-5 w-5 text-brand-text-muted" />
              <h1 className="text-2xl font-bold text-brand-text">{viewingParent.name}</h1>
              <span className="text-sm text-brand-text-muted ml-1">({subcategories.length} subcategories)</span>
            </>
          ) : (
            <h1 className="text-2xl font-bold text-brand-text">Poster Categories</h1>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Bulk-select mode toggle — when ON, card clicks toggle
              selection instead of navigating. */}
          <button
            onClick={() => { setSelectMode(v => !v); setSelectedIds(new Set()) }}
            className={`px-3 py-2 text-sm rounded-lg flex items-center gap-1.5 transition-colors ${
              selectMode
                ? 'bg-brand-gold text-gray-900 hover:bg-brand-gold-dark'
                : 'bg-brand-dark border border-brand-dark-border text-brand-text hover:bg-brand-dark-hover'
            }`}
            title="Toggle multi-select mode"
          >
            <CheckSquare className="h-4 w-4" />
            {selectMode ? 'Exit select' : 'Select'}
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-text-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search categories..." className="pl-10 pr-4 py-2 bg-brand-dark border border-brand-dark-border rounded-lg text-sm text-brand-text focus:outline-none focus:border-brand-gold/50 w-64" />
          </div>
        </div>
      </div>

      {/* Filter bar — language dropdown. Mirrors BusinessCategoryPage. */}
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-xs text-brand-text-muted">Filter by language:</label>
        <select
          value={languageFilter}
          onChange={e => { setLanguageFilter(e.target.value); setSelectedIds(new Set()) }}
          className="bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-1.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50"
        >
          <option value="">All languages</option>
          <option value="null">Language-agnostic only</option>
          {languages.filter(l => l.is_active).map(l => (
            <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
          ))}
        </select>
        {languageFilter && (
          <button
            onClick={() => { setLanguageFilter(''); setSelectedIds(new Set()) }}
            className="text-xs text-brand-text-muted hover:text-brand-text underline"
          >
            Clear
          </button>
        )}
      </div>

      {/* Bulk action bar — visible whenever selectMode is on OR there
          is an active selection. Select-all selects every visible card. */}
      {(selectMode || selectedIds.size > 0) && (
        <div className="flex items-center gap-3 px-4 py-2 bg-brand-gold/10 border border-brand-gold/30 rounded-lg">
          <span className="text-sm text-brand-text font-medium">
            {selectedIds.size} selected
          </span>
          <button
            onClick={() => {
              if (selectedIds.size === filtered.length && filtered.length > 0) {
                setSelectedIds(new Set())
              } else {
                setSelectedIds(new Set(filtered.map(c => c.id)))
              }
            }}
            className="text-xs text-brand-text-muted hover:text-brand-text underline"
          >
            {selectedIds.size === filtered.length && filtered.length > 0
              ? 'Deselect all'
              : `Select all ${filtered.length} visible`}
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setBulkDeleteOpen(true)}
            disabled={selectedIds.size === 0}
            className="px-3 py-1.5 bg-status-error/90 hover:bg-status-error disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete selected
          </button>
          <button
            onClick={clearSelection}
            className="p-1.5 text-brand-text-muted hover:text-brand-text rounded hover:bg-brand-dark-hover transition-colors"
            title="Exit select mode"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filtered.map(cat => (
          <div
            key={cat.id}
            className={`bg-brand-dark-card rounded-xl border p-4 text-center group relative cursor-pointer transition-colors ${
              selectedIds.has(cat.id)
                ? 'border-brand-gold ring-2 ring-brand-gold/40'
                : 'border-brand-dark-border/50 hover:border-brand-gold/30'
            }`}
            onClick={() => {
              if (selectMode) {
                // In select mode, card click toggles the checkbox
                // rather than navigating into the category.
                toggleSelect(cat.id)
                return
              }
              if (!viewingParent) {
                setViewingParent(cat)
              } else {
                setPosterPage(1)
                setPosterSearch('')
                setPosterSearchInput('')
                setViewingSubcat(cat)
              }
            }}
          >
            {/* Select-mode checkbox overlay in top-left of the card */}
            {selectMode && (
              <div className="absolute top-2 left-2 z-10 pointer-events-none">
                {selectedIds.has(cat.id)
                  ? <CheckSquare className="h-5 w-5 text-brand-gold" />
                  : <Square className="h-5 w-5 text-brand-text-muted" />}
              </div>
            )}
            <div className="w-16 h-16 mx-auto rounded-xl bg-neutral-900 overflow-hidden mb-3 flex items-center justify-center">
              {cat.icon_url ? <img src={cat.icon_url} className="w-full h-full object-contain p-1" /> : <Grid3X3 className="w-8 h-8 text-brand-text-muted" />}
            </div>
            <h3 className="text-sm font-medium text-brand-text">{cat.name}</h3>
            <p className="text-xs text-brand-text-muted mt-0.5">{cat.slug}</p>
            {/* Show children count badge for top-level categories */}
            {!viewingParent && cat.children_count > 0 && (
              <div className="inline-flex items-center gap-1 mt-1.5 text-[11px] px-2 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold">
                <FolderTree className="h-3 w-3" />
                {cat.children_count} sub
              </div>
            )}
            {/* Show poster count for subcategories */}
            {viewingParent && (
              <div className="inline-flex items-center gap-1 mt-1.5 text-[11px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                <Image className="h-3 w-3" />
                {cat.poster_count} posters
              </div>
            )}
            {/* Language badge — only shown when set. Sits in the same
                row as the other mini-badges for visual consistency. */}
            {cat.language_name && (
              <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-brand-dark-hover text-brand-text-muted">
                {cat.language_code || cat.language_name}
              </span>
            )}
            {!cat.is_active && <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-status-error/20 text-status-error">Inactive</span>}
            {!viewingParent && (
              <div className="flex items-center justify-center gap-1 mt-1.5">
                {cat.show_in_home && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">Home</span>}
                {cat.show_in_create && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">Create</span>}
                {cat.section_type && cat.section_type !== 'normal' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">
                    {cat.section_type === 'video_cards' ? 'Video' : cat.section_type === 'grand_opening' ? 'Grand' : 'Calendar'}
                  </span>
                )}
              </div>
            )}
            <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 flex flex-col gap-0.5 transition-opacity">
              <button onClick={e => { e.stopPropagation(); moveCategory(cat, 'up') }} disabled={filtered.findIndex(c => c.id === cat.id) === 0} className="p-0.5 bg-brand-dark-hover rounded text-brand-text-muted hover:text-brand-gold disabled:opacity-20 transition-colors"><ArrowUp className="h-3 w-3" /></button>
              <button onClick={e => { e.stopPropagation(); moveCategory(cat, 'down') }} disabled={filtered.findIndex(c => c.id === cat.id) === filtered.length - 1} className="p-0.5 bg-brand-dark-hover rounded text-brand-text-muted hover:text-brand-gold disabled:opacity-20 transition-colors"><ArrowDown className="h-3 w-3" /></button>
            </div>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
              <button onClick={e => { e.stopPropagation(); openEdit(cat) }} className="p-1 bg-brand-dark-hover rounded text-brand-gold"><Pencil className="h-3 w-3" /></button>
              <button onClick={e => { e.stopPropagation(); openDelete(cat) }} className="p-1 bg-brand-dark-hover rounded text-status-error"><Trash2 className="h-3 w-3" /></button>
            </div>
          </div>
        ))}

        {/* Empty state for subcategories view */}
        {viewingParent && filtered.length === 0 && !search && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-brand-text-muted">
            <FolderTree className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">No subcategories yet</p>
            <p className="text-xs mt-1">Click the + button to add subcategories to "{viewingParent.name}"</p>
          </div>
        )}
      </div>

      {/* Floating add button */}
      <button onClick={() => openAdd(viewingParent?.id ?? null)} className="fixed bottom-8 right-8 w-14 h-14 bg-brand-gold text-gray-900 rounded-full shadow-lg hover:bg-brand-gold-dark transition-colors flex items-center justify-center z-40">
        <Plus className="h-6 w-6" />
      </button>

      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} title={editingItem ? 'Edit Category' : (form.parent ? 'Add Subcategory' : 'Add Category')}>
        <div className="space-y-4">
          <ImageUpload label="Category Icon" value={form.icon_url} onChange={v => setForm(f => ({ ...f, icon_url: v }))} aspectHint="Square icon, 128x128 recommended" />
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Parent Category</label>
            <select
              value={form.parent ?? ''}
              onChange={e => setForm(f => ({ ...f, parent: e.target.value ? Number(e.target.value) : null }))}
              className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50"
            >
              <option value="">None (Top-level category)</option>
              {parentOptions.filter(p => p.id !== editingItem?.id).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: toSlug(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Slug</label>
              <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Sort Order</label>
              <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Section Type</label>
            <select
              value={form.section_type}
              onChange={e => setForm(f => ({ ...f, section_type: e.target.value }))}
              className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50"
            >
              <option value="normal">Normal</option>
              <option value="grand_opening">Grand Opening</option>
              <option value="calendar_anchor">Calendar Anchor</option>
              <option value="video_cards">Video Cards</option>
            </select>
          </div>
          {/* 2026-04 scope fix: admin tab assignment — controls which
              admin page this category appears under AND which scope
              posters uploaded into it inherit. Posters already in this
              category are re-tagged on save. */}
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">
              Admin Tab <span className="text-status-error">*</span>
            </label>
            <select
              value={form.default_scope}
              onChange={e => setForm(f => ({
                ...f,
                default_scope: e.target.value as FormState['default_scope'],
              }))}
              className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50"
            >
              <option value="categories">Categories Tab</option>
              <option value="business">Business Tab</option>
              <option value="home">Home Tab</option>
              <option value="festival">Festival</option>
              <option value="greeting">Greeting</option>
            </select>
            <p className="text-[11px] text-brand-text-muted mt-1">
              Posters uploaded into this category will appear under this tab.
            </p>
          </div>
          {/* 2026-04: optional language so admin can maintain
              language-specific category trees. NULL = all languages. */}
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">
              Language <span className="text-brand-text-muted/60">(optional — leave empty for all languages)</span>
            </label>
            <select
              value={form.language ?? ''}
              onChange={e => setForm(f => ({
                ...f,
                language: e.target.value === '' ? null : Number(e.target.value),
              }))}
              className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50"
            >
              <option value="">— All languages —</option>
              {languages.filter(l => l.is_active).map(l => (
                <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
              <label className="text-sm text-brand-text-muted">Active</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.show_in_home} onChange={e => setForm(f => ({ ...f, show_in_home: e.target.checked }))} className="rounded" />
              <label className="text-sm text-green-400">Show in Home</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.show_in_create} onChange={e => setForm(f => ({ ...f, show_in_create: e.target.checked }))} className="rounded" />
              <label className="text-sm text-purple-400">Show in Create</label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">Save</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Move to Recycle Bin" message={`Are you sure you want to delete "${deleteItem?.name}"?${(deleteItem as GeneralCategory)?.children_count > 0 ? ' This will also move all subcategories.' : ''} You can restore it later from the Recycle Bin.`} confirmText="Move to Recycle Bin" variant="danger" />

      <ConfirmDialog
        isOpen={bulkDeleteOpen}
        onClose={() => !bulkDeleting && setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        title={`Delete ${selectedIds.size} ${selectedIds.size === 1 ? 'category' : 'categories'}?`}
        message={`This moves ${selectedIds.size === 1 ? 'the selected category' : 'all selected categories'} (and their subcategories) to the Recycle Bin. You can restore them from the Recycle Bin page.`}
        confirmText={bulkDeleting ? 'Deleting…' : 'Move to Recycle Bin'}
        variant="danger"
      />
    </div>
  )
}
