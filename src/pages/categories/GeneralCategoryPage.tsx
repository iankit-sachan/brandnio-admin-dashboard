import { useState, useEffect, useCallback } from 'react'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { Grid3X3, Pencil, Trash2, Plus, Search, ChevronRight, FolderTree, Image, X } from 'lucide-react'
import { posterCategoriesApi, postersApi, uploadApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'

interface GeneralCategory {
  id: number
  name: string
  slug: string
  icon_url: string | null
  is_active: boolean
  parent: number | null
  parent_name: string | null
  children_count: number
  poster_count: number
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
  is_active: boolean
  parent: number | null
}

const emptyForm: FormState = { icon_url: null, name: '', slug: '', is_active: true, parent: null }

function toSlug(name: string) {
  return name.toLowerCase().replace(/ & /g, '-').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function GeneralCategoryPage() {
  const { addToast } = useToast()
  const { data, loading, error, create, update, remove, refresh } = useAdminCrud<GeneralCategory>(posterCategoriesApi)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<GeneralCategory | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<GeneralCategory | null>(null)
  const [search, setSearch] = useState('')
  const [viewingParent, setViewingParent] = useState<GeneralCategory | null>(null)
  const [viewingSubcat, setViewingSubcat] = useState<GeneralCategory | null>(null)

  // Poster management state for subcategory view
  const [posters, setPosters] = useState<PosterItem[]>([])
  const [postersLoading, setPostersLoading] = useState(false)
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

  // Load posters when viewing a subcategory
  const loadPosters = useCallback(async (categoryId: number) => {
    setPostersLoading(true)
    try {
      const all = await postersApi.list()
      setPosters((all as PosterItem[]).filter(p => p.category === categoryId))
    } catch {
      setPosters([])
    }
    setPostersLoading(false)
  }, [])

  useEffect(() => {
    if (viewingSubcat) {
      loadPosters(viewingSubcat.id)
    }
  }, [viewingSubcat, loadPosters])

  const handleImageUpload = async (file: File) => {
    if (!viewingSubcat) return
    setUploading(true)
    try {
      const url = await uploadApi.upload(file)
      const title = file.name.replace(/\.[^.]+$/, '')
      await postersApi.create({
        title,
        category: viewingSubcat.id,
        thumbnail_url: url,
        image_url: url,
        aspect_ratio: '1:1',
        is_premium: false,
      } as any)
      addToast('Poster uploaded successfully')
      loadPosters(viewingSubcat.id)
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
      loadPosters(viewingSubcat.id)
      refresh()
    } catch {
      addToast('Delete failed', 'error')
    }
  }

  const openAdd = (parentId: number | null = null) => {
    setEditingItem(null)
    setForm({ ...emptyForm, parent: parentId })
    setModalOpen(true)
  }

  const openEdit = (item: GeneralCategory) => {
    setEditingItem(item)
    setForm({ icon_url: item.icon_url, name: item.name, slug: item.slug, is_active: item.is_active, parent: item.parent })
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
      addToast('Category deleted successfully')
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => { setViewingParent(null); setViewingSubcat(null) }} className="text-brand-gold hover:underline text-lg font-bold">Categories</button>
            <ChevronRight className="h-5 w-5 text-brand-text-muted" />
            <button onClick={() => setViewingSubcat(null)} className="text-brand-gold hover:underline text-lg font-bold">{viewingParent.name}</button>
            <ChevronRight className="h-5 w-5 text-brand-text-muted" />
            <h1 className="text-2xl font-bold text-brand-text">{viewingSubcat.name}</h1>
            <span className="text-sm text-brand-text-muted ml-1">({posters.length} posters)</span>
          </div>
          <div className="flex items-center gap-2">
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
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {posters.map(p => (
              <div key={p.id} className="relative group rounded-xl overflow-hidden border border-brand-dark-border/50 bg-brand-dark-card">
                <img src={p.thumbnail_url} alt={p.title} className="w-full aspect-square object-cover" />
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
        )}

        <ConfirmDialog isOpen={!!deletePoster} onClose={() => setDeletePoster(null)} onConfirm={handleDeletePoster} title="Delete Poster" message={`Are you sure you want to delete "${deletePoster?.title}"?`} confirmText="Delete" variant="danger" />
        <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} title="Edit Category">
          <div className="space-y-4">
            <ImageUpload label="Category Icon" value={form.icon_url} onChange={v => setForm(f => ({ ...f, icon_url: v }))} aspectHint="Square icon, 128x128 recommended" />
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: toSlug(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Slug</label>
              <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
              <label className="text-sm text-brand-text-muted">Active</label>
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {viewingParent ? (
            <>
              <button onClick={() => setViewingParent(null)} className="text-brand-gold hover:underline text-lg font-bold">Categories</button>
              <ChevronRight className="h-5 w-5 text-brand-text-muted" />
              <h1 className="text-2xl font-bold text-brand-text">{viewingParent.name}</h1>
              <span className="text-sm text-brand-text-muted ml-1">({subcategories.length} subcategories)</span>
            </>
          ) : (
            <h1 className="text-2xl font-bold text-brand-text">General Categories</h1>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search categories..." className="pl-10 pr-4 py-2 bg-brand-dark border border-brand-dark-border rounded-lg text-sm text-brand-text focus:outline-none focus:border-brand-gold/50 w-64" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filtered.map(cat => (
          <div
            key={cat.id}
            className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 p-4 text-center group relative cursor-pointer hover:border-brand-gold/30 transition-colors"
            onClick={() => {
              if (!viewingParent) {
                setViewingParent(cat)
              } else {
                setViewingSubcat(cat)
              }
            }}
          >
            <div className="w-16 h-16 mx-auto rounded-xl bg-brand-dark overflow-hidden mb-3">
              {cat.icon_url ? <img src={cat.icon_url} className="w-full h-full object-cover" /> : <Grid3X3 className="w-8 h-8 text-brand-text-muted mx-auto mt-4" />}
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
            {!cat.is_active && <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-status-error/20 text-status-error">Inactive</span>}
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
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Slug</label>
            <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
            <label className="text-sm text-brand-text-muted">Active</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">Save</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Category" message={`Are you sure you want to delete "${deleteItem?.name}"?${(deleteItem as GeneralCategory)?.children_count > 0 ? ' This will also delete all subcategories.' : ''} This action cannot be undone.`} confirmText="Delete" variant="danger" />
    </div>
  )
}
