import { useState, useMemo } from 'react'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { Pencil, Trash2, Plus, ChevronRight } from 'lucide-react'
import { editorStickerCategoriesApi, editorStickersApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'

// ── Types ──────────────────────────────────────────────────────────

interface EditorStickerCategory {
  id: number
  name: string
  slug: string
  sort_order: number
  is_active: boolean
  sticker_count?: number
  created_at: string
}

interface EditorStickerItem {
  id: number
  category: number
  name: string
  image_url: string
  sort_order: number
  is_active: boolean
  created_at: string
}

interface CategoryFormState {
  name: string
  slug: string
  sort_order: number
  is_active: boolean
}

interface StickerFormState {
  image_url: string | null
  name: string
  sort_order: number
  is_active: boolean
}

const emptyCategoryForm: CategoryFormState = { name: '', slug: '', sort_order: 0, is_active: true }
const emptyStickerForm: StickerFormState = { image_url: null, name: '', sort_order: 0, is_active: true }

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

// ── Component ──────────────────────────────────────────────────────

export default function EditorStickerPage() {
  const { addToast } = useToast()

  // ── Category CRUD ────────────────────────────────────────────────
  const {
    data: categories,
    loading: catLoading,
    create: createCategory,
    update: updateCategory,
    remove: removeCategory,
  } = useAdminCrud<EditorStickerCategory>(editorStickerCategoriesApi)

  const [catModalOpen, setCatModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<EditorStickerCategory | null>(null)
  const [catForm, setCatForm] = useState<CategoryFormState>(emptyCategoryForm)
  const [deleteCategory, setDeleteCategory] = useState<EditorStickerCategory | null>(null)

  // ── Selected category for sticker section ────────────────────────
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)

  const selectedCategory = useMemo(
    () => categories.find(c => c.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  )

  // ── Sticker CRUD (filtered by selected category) ────────────────
  const stickerParams = useMemo(
    () => selectedCategoryId ? { category: String(selectedCategoryId) } : undefined,
    [selectedCategoryId],
  )

  const {
    data: stickers,
    loading: stickerLoading,
    create: createSticker,
    update: updateSticker,
    remove: removeSticker,
  } = useAdminCrud<EditorStickerItem>(editorStickersApi, stickerParams)

  const [stickerModalOpen, setStickerModalOpen] = useState(false)
  const [editingSticker, setEditingSticker] = useState<EditorStickerItem | null>(null)
  const [stickerForm, setStickerForm] = useState<StickerFormState>(emptyStickerForm)
  const [deleteSticker, setDeleteSticker] = useState<EditorStickerItem | null>(null)

  // ── Category handlers ────────────────────────────────────────────

  const openAddCategory = () => {
    setEditingCategory(null)
    setCatForm(emptyCategoryForm)
    setCatModalOpen(true)
  }

  const openEditCategory = (item: EditorStickerCategory) => {
    setEditingCategory(item)
    setCatForm({ name: item.name, slug: item.slug, sort_order: item.sort_order, is_active: item.is_active })
    setCatModalOpen(true)
  }

  const handleCategorySubmit = async () => {
    if (!catForm.name.trim()) { addToast('Name is required', 'error'); return }
    try {
      const payload = { ...catForm, slug: catForm.slug || slugify(catForm.name) }
      if (editingCategory) {
        await updateCategory(editingCategory.id, payload)
        addToast('Category updated successfully')
      } else {
        await createCategory(payload)
        addToast('Category created successfully')
      }
      setCatForm(emptyCategoryForm)
      setEditingCategory(null)
      setCatModalOpen(false)
    } catch {
      addToast('Operation failed. Please try again.', 'error')
    }
  }

  const handleCategoryDelete = async () => {
    if (!deleteCategory) return
    try {
      await removeCategory(deleteCategory.id)
      addToast('Category deleted successfully')
      if (selectedCategoryId === deleteCategory.id) setSelectedCategoryId(null)
      setDeleteCategory(null)
    } catch {
      addToast('Delete failed. Please try again.', 'error')
    }
  }

  // ── Sticker handlers ─────────────────────────────────────────────

  const openAddSticker = () => {
    setEditingSticker(null)
    setStickerForm(emptyStickerForm)
    setStickerModalOpen(true)
  }

  const openEditSticker = (item: EditorStickerItem) => {
    setEditingSticker(item)
    setStickerForm({ image_url: item.image_url, name: item.name, sort_order: item.sort_order, is_active: item.is_active })
    setStickerModalOpen(true)
  }

  const handleStickerSubmit = async () => {
    if (!stickerForm.name.trim()) { addToast('Name is required', 'error'); return }
    if (!stickerForm.image_url) { addToast('Image is required', 'error'); return }
    try {
      if (editingSticker) {
        await updateSticker(editingSticker.id, stickerForm)
        addToast('Sticker updated successfully')
      } else {
        await createSticker({ ...stickerForm, category: selectedCategoryId! })
        addToast('Sticker created successfully')
      }
      setStickerForm(emptyStickerForm)
      setEditingSticker(null)
      setStickerModalOpen(false)
    } catch {
      addToast('Operation failed. Please try again.', 'error')
    }
  }

  const handleStickerDelete = async () => {
    if (!deleteSticker) return
    try {
      await removeSticker(deleteSticker.id)
      addToast('Sticker deleted successfully')
      setDeleteSticker(null)
    } catch {
      addToast('Delete failed. Please try again.', 'error')
    }
  }

  // ── Category table columns ───────────────────────────────────────

  const categoryColumns: Column<EditorStickerCategory>[] = [
    { key: 'name', title: 'Name', sortable: true },
    { key: 'slug', title: 'Slug', sortable: true },
    { key: 'sticker_count', title: 'Stickers', sortable: true, render: (item) => <span>{item.sticker_count ?? 0}</span> },
    { key: 'sort_order', title: 'Sort Order', sortable: true },
    {
      key: 'is_active', title: 'Status', render: (item) =>
        item.is_active
          ? <span className="text-status-success">Active</span>
          : <span className="text-status-error">Inactive</span>,
    },
    {
      key: 'actions', title: 'Actions', render: (item) => (
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); openEditCategory(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-gold transition-colors"><Pencil className="h-4 w-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteCategory(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-status-error transition-colors"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ]

  // ── Sticker table columns ────────────────────────────────────────

  const stickerColumns: Column<EditorStickerItem>[] = [
    {
      key: 'image_url', title: 'Image', render: (item) =>
        item.image_url
          ? <img src={item.image_url} alt={item.name} className="h-10 w-10 rounded object-cover" />
          : <div className="h-10 w-10 rounded bg-brand-dark-border" />,
    },
    { key: 'name', title: 'Name', sortable: true },
    { key: 'sort_order', title: 'Sort Order', sortable: true },
    {
      key: 'is_active', title: 'Status', render: (item) =>
        item.is_active
          ? <span className="text-status-success">Active</span>
          : <span className="text-status-error">Inactive</span>,
    },
    {
      key: 'actions', title: 'Actions', render: (item) => (
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); openEditSticker(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-gold transition-colors"><Pencil className="h-4 w-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteSticker(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-status-error transition-colors"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ]

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Categories Section ──────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-brand-text">Editor Sticker Categories</h1>
          <button onClick={openAddCategory} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> Add Category
          </button>
        </div>
        <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
          {catLoading ? (
            <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div>
          ) : (
            <DataTable
              columns={categoryColumns}
              data={categories}
              onRowClick={(item) => setSelectedCategoryId(item.id)}
              keyExtractor={(item) => item.id}
            />
          )}
        </div>
      </div>

      {/* ── Stickers Section (shown when a category is selected) ─ */}
      {selectedCategoryId && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-brand-text">
              <span className="text-brand-text-muted text-sm">Category</span>
              <ChevronRight className="h-4 w-4 text-brand-text-muted" />
              <h2 className="text-xl font-bold">{selectedCategory?.name ?? 'Unknown'} Stickers</h2>
            </div>
            <button onClick={openAddSticker} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors flex items-center gap-1.5">
              <Plus className="h-4 w-4" /> Add Sticker
            </button>
          </div>
          <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
            {stickerLoading ? (
              <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div>
            ) : (
              <DataTable
                columns={stickerColumns}
                data={stickers}
                keyExtractor={(item) => item.id}
              />
            )}
          </div>
        </div>
      )}

      {/* ── Category Modal ──────────────────────────────────────── */}
      <Modal
        isOpen={catModalOpen}
        onClose={() => { setCatForm(emptyCategoryForm); setEditingCategory(null); setCatModalOpen(false) }}
        title={editingCategory ? 'Edit Category' : 'Add Category'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Name</label>
            <input
              value={catForm.name}
              onChange={e => {
                const name = e.target.value
                setCatForm(f => ({ ...f, name, slug: slugify(name) }))
              }}
              className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Slug</label>
            <input
              value={catForm.slug}
              onChange={e => setCatForm(f => ({ ...f, slug: e.target.value }))}
              className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Sort Order</label>
            <input
              type="number"
              value={catForm.sort_order}
              onChange={e => setCatForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
              className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={catForm.is_active} onChange={e => setCatForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
            <label className="text-sm text-brand-text-muted">Active</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setCatForm(emptyCategoryForm); setEditingCategory(null); setCatModalOpen(false) }} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">Cancel</button>
            <button onClick={handleCategorySubmit} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">Save</button>
          </div>
        </div>
      </Modal>

      {/* ── Sticker Modal ───────────────────────────────────────── */}
      <Modal
        isOpen={stickerModalOpen}
        onClose={() => { setStickerForm(emptyStickerForm); setEditingSticker(null); setStickerModalOpen(false) }}
        title={editingSticker ? 'Edit Sticker' : 'Add Sticker'}
      >
        <div className="space-y-4">
          <ImageUpload
            label="Sticker Image"
            value={stickerForm.image_url}
            onChange={v => setStickerForm(f => ({ ...f, image_url: v }))}
            aspectHint="Square, 512x512 recommended"
          />
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Name</label>
            <input
              value={stickerForm.name}
              onChange={e => setStickerForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Sort Order</label>
            <input
              type="number"
              value={stickerForm.sort_order}
              onChange={e => setStickerForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
              className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={stickerForm.is_active} onChange={e => setStickerForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
            <label className="text-sm text-brand-text-muted">Active</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setStickerForm(emptyStickerForm); setEditingSticker(null); setStickerModalOpen(false) }} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">Cancel</button>
            <button onClick={handleStickerSubmit} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">Save</button>
          </div>
        </div>
      </Modal>

      {/* ── Confirm Dialogs ─────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!deleteCategory}
        onClose={() => setDeleteCategory(null)}
        onConfirm={handleCategoryDelete}
        title="Delete Category"
        message={`Are you sure you want to delete "${deleteCategory?.name}"? All stickers in this category will also be removed. This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={!!deleteSticker}
        onClose={() => setDeleteSticker(null)}
        onConfirm={handleStickerDelete}
        title="Delete Sticker"
        message={`Are you sure you want to delete "${deleteSticker?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  )
}
