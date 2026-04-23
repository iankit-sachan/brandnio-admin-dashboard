import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Trash2, Upload, CheckSquare, Square, X as XIcon } from 'lucide-react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { posterCategoriesApi, languagesApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'

interface LanguageOption {
  id: number
  name: string
  code: string
  is_active: boolean
}

interface BusinessCategory {
  id: number
  icon_url: string
  name: string
  slug: string
  poster_count: number
  is_active: boolean
  // 2026-04: parent/child hierarchy so admin can nest categories
  // (e.g., "Auto mobile" > "Bikes", "Cars"). Android reads the
  // `children` field on /api/categories/ for chip-tab subcategory
  // display. Null = this is a top-level (parent) category.
  parent: number | null
  parent_name: string | null
  // 2026-04: optional language tag. NULL = language-agnostic.
  language: number | null
  language_name: string
  language_code: string
  // 2026-04 scope fix: which admin tab this category belongs to.
  // Drives visibility on the Business Posters page (which filters by
  // `category__default_scope='business'`) and dictates the scope
  // inherited by posters uploaded into this category.
  default_scope: 'home' | 'categories' | 'business' | 'festival' | 'greeting'
}

interface FormState {
  icon_url: string | null
  name: string
  slug: string
  is_active: boolean
  parent: number | null
  language: number | null
  default_scope: 'home' | 'categories' | 'business' | 'festival' | 'greeting'
}

// 2026-04: on this page (Business Categories admin), NEW categories
// default to scope='business' so they land in the Business tab. Admin
// can flip to a different scope via the edit form if needed.
const emptyForm: FormState = { icon_url: null, name: '', slug: '', is_active: true, parent: null, language: null, default_scope: 'business' }

const inputClass = 'w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function BusinessCategoryPage() {
  const { addToast } = useToast()
  const navigate = useNavigate()

  // Language filter — empty string = all, 'null' = language-agnostic only,
  // otherwise the string ID of a specific language. Sent as the `language`
  // query param to /api/admin/poster-categories/ which the backend handles.
  const [languageFilter, setLanguageFilter] = useState<string>('')

  // 2026-04 scope fix: this admin page only manages BUSINESS-tab
  // categories. Strictly filters by ?default_scope=business so admin
  // can't accidentally land on a Category-tab row here. To edit a
  // category from a different tab, use the "All Categories" admin
  // page under Category Tab → All Categories.
  const crudParams = useMemo(
    () => {
      const params: Record<string, string> = { default_scope: 'business' }
      if (languageFilter) params.language = languageFilter
      return params
    },
    [languageFilter],
  )

  const { data, loading, error, create, update, remove, refresh } =
    useAdminCrud<BusinessCategory>(posterCategoriesApi, crudParams)
  const { data: languages } = useAdminCrud<LanguageOption>(languagesApi)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<BusinessCategory | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<BusinessCategory | null>(null)

  // Multi-select + bulk delete
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      if (prev.size === data.length && data.length > 0) return new Set()
      return new Set(data.map(d => d.id))
    })
  }, [data])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    setBulkDeleting(true)
    try {
      const ids = Array.from(selectedIds)
      // Client-side parallel deletes — matches the BusinessPosterPage
      // bulk-delete pattern. Swallows individual failures so a single
      // 4xx doesn't abort the whole batch.
      await Promise.all(ids.map(id => remove(id).catch(() => null)))
      addToast(`Deleted ${ids.length} ${ids.length === 1 ? 'category' : 'categories'}`)
      setSelectedIds(new Set())
      setBulkDeleteOpen(false)
      refresh()
    } catch {
      addToast('Some deletes failed', 'error')
    } finally {
      setBulkDeleting(false)
    }
  }

  const openAdd = () => { setEditingItem(null); setForm(emptyForm); setModalOpen(true) }
  const openEdit = (item: BusinessCategory) => {
    setEditingItem(item)
    setForm({
      icon_url: item.icon_url, name: item.name, slug: item.slug,
      is_active: item.is_active, parent: item.parent, language: item.language,
      // Fall back to 'business' when editing a row that somehow
      // lacks the field (e.g. row was fetched before backend upgrade).
      default_scope: item.default_scope ?? 'business',
    })
    setModalOpen(true)
  }

  // Only top-level rows can be parents; a category can't be its own
  // parent, and (for now) only one level of nesting is supported
  // (a child can't itself be made a parent via the dropdown).
  const parentChoices = data.filter(c =>
    c.parent === null && c.id !== editingItem?.id
  )

  const handleNameChange = (name: string) => {
    setForm(f => ({ ...f, name, slug: editingItem ? f.slug : generateSlug(name) }))
  }

  // 2026-04 fix: extract the REAL error from axios so the user sees
  // "poster category with this name already exists" instead of the
  // generic "Operation failed". The previous catch block swallowed
  // the response details, leading to confusion when the op had
  // actually succeeded but a downstream setState threw.
  const extractErrorMessage = (err: unknown, fallback: string): string => {
    const axiosErr = err as { response?: { data?: unknown }, message?: string } | null
    const data = axiosErr?.response?.data
    if (data && typeof data === 'object') {
      const detail = (data as { detail?: string }).detail
      if (typeof detail === 'string') return detail
      // DRF field-level errors: {name: ["already exists"], slug: [...]}
      const firstField = Object.entries(data).find(([, v]) => Array.isArray(v) && v.length)
      if (firstField) {
        const [, arr] = firstField
        const msg = (arr as string[])[0]
        if (typeof msg === 'string') return msg
      }
    }
    if (typeof data === 'string' && data.length) return data
    return axiosErr?.message || fallback
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) { addToast('Name is required', 'error'); return }
    if (!form.slug.trim()) { addToast('Slug is required', 'error'); return }
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
      // Keep the client-side list authoritative so the next attempt's
      // dupe check (data.some(...)) sees the newly-created row and
      // doesn't send a redundant request that the backend will reject.
      refresh()
    } catch (err) {
      addToast(extractErrorMessage(err, 'Operation failed. Please try again.'), 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    try {
      await remove(deleteItem.id)
      addToast('Category deleted successfully')
      setDeleteItem(null)
    } catch (err) {
      addToast(extractErrorMessage(err, 'Delete failed. Please try again.'), 'error')
    }
  }

  const allSelected = data.length > 0 && selectedIds.size === data.length

  const columns: Column<BusinessCategory>[] = [
    {
      // Multi-select checkbox column. Select-all lives in the bulk
      // action bar above the table, not in the header (DataTable's
      // Column.title is typed as `string`, so a button there would
      // require changing the component signature).
      key: 'select' as 'id',
      title: '',
      render: (item) => (
        <input
          type="checkbox"
          checked={selectedIds.has(item.id)}
          onChange={() => toggleSelect(item.id)}
          onClick={e => e.stopPropagation()}
          className="rounded cursor-pointer"
        />
      ),
      className: 'w-10',
    },
    {
      key: 'icon_url',
      title: 'Icon',
      render: (item) => <CategoryIcon iconUrl={item.icon_url} name={item.name} />,
      className: 'w-16',
    },
    {
      key: 'name',
      title: 'Name',
      sortable: true,
      // 2026-04: children get a small "under PARENT" chip next to
      // their name so admins can see hierarchy at a glance.
      render: (item) => (
        <div className="flex items-center gap-2">
          <span>{item.name}</span>
          {item.parent_name && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-dark-hover text-brand-text-muted">
              under {item.parent_name}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'slug',
      title: 'Slug',
      render: (item) => <code className="text-xs bg-brand-dark px-2 py-1 rounded text-brand-text-muted">{item.slug}</code>,
    },
    {
      key: 'language_name' as 'name',
      title: 'Language',
      render: (item) => (
        item.language_name
          ? (
            <span className="text-xs px-2 py-0.5 rounded bg-brand-dark-hover text-brand-text">
              {item.language_name}
              {item.language_code ? <span className="text-brand-text-muted"> ({item.language_code})</span> : null}
            </span>
          )
          : <span className="text-xs text-brand-text-muted/60">—</span>
      ),
    },
    {
      key: 'poster_count',
      title: 'Poster Count',
      sortable: true,
      render: (item) => <span className="text-brand-text">{item.poster_count}</span>,
    },
    {
      key: 'is_active',
      title: 'Status',
      render: (item) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.is_active ? 'bg-status-success/20 text-status-success' : 'bg-brand-dark-hover text-brand-text-muted'}`}>
          {item.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (item) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/posters/business?upload=1&category=${item.id}`) }}
            className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-indigo transition-colors cursor-pointer"
            title={`Bulk upload posters to "${item.name}"`}
            aria-label={`Bulk upload posters to ${item.name}`}
          >
            <Upload className="h-4 w-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); openEdit(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-gold transition-colors cursor-pointer" title="Edit category" aria-label="Edit category"><Pencil className="h-4 w-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteItem(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-status-error transition-colors cursor-pointer" title="Delete category" aria-label="Delete category"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-brand-text">Business Categories</h1>
        <button onClick={openAdd} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">+ Add Category</button>
      </div>

      {/* Filter bar — language dropdown. Empty = all; 'null' = language-
          agnostic rows only; numeric ID = categories for that language. */}
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-xs text-brand-text-muted">Filter by language:</label>
        <select
          value={languageFilter}
          onChange={e => { setLanguageFilter(e.target.value); clearSelection() }}
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
            onClick={() => { setLanguageFilter(''); clearSelection() }}
            className="text-xs text-brand-text-muted hover:text-brand-text underline"
          >
            Clear
          </button>
        )}
      </div>

      {/* Bulk action bar — only visible when selection is non-empty.
          Select-all lives here rather than in the table header because
          DataTable's Column.title is typed as string, not ReactNode. */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-brand-gold/10 border border-brand-gold/30 rounded-lg">
          <span className="text-sm text-brand-text font-medium">
            {selectedIds.size} selected
          </span>
          <button
            onClick={toggleSelectAll}
            className="text-xs text-brand-text-muted hover:text-brand-text underline"
          >
            {allSelected ? 'Deselect all' : `Select all ${data.length}`}
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setBulkDeleteOpen(true)}
            className="px-3 py-1.5 bg-status-error/90 hover:bg-status-error text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete selected
          </button>
          <button
            onClick={clearSelection}
            className="p-1.5 text-brand-text-muted hover:text-brand-text rounded hover:bg-brand-dark-hover transition-colors"
            title="Clear selection"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <p className="text-status-error text-sm">{error}</p>
            <button onClick={refresh} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">Retry</button>
          </div>
        ) : (
          <DataTable columns={columns} data={data} />
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} title={editingItem ? 'Edit Category' : 'Add Category'}>
        <div className="space-y-4">
          <ImageUpload label="Category Icon" value={form.icon_url} onChange={v => setForm(f => ({ ...f, icon_url: v }))} aspectHint="48x48" />
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Name</label>
            <input value={form.name} onChange={e => handleNameChange(e.target.value)} className={inputClass} placeholder="Enter category name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Slug</label>
            <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className={inputClass} placeholder="auto-generated-slug" />
          </div>

          {/* 2026-04: parent-selector so the Category tab on Android
              can show real subcategories under each parent chip. Leave
              empty to make the row a top-level category. */}
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">
              Parent category <span className="text-brand-text-muted/60">(optional — leave empty for top-level)</span>
            </label>
            <select
              value={form.parent ?? ''}
              onChange={e => setForm(f => ({
                ...f,
                parent: e.target.value === '' ? null : Number(e.target.value),
              }))}
              className={inputClass}
            >
              <option value="">— None (this is a top-level category) —</option>
              {parentChoices.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* 2026-04: optional language so admin can maintain language-
              specific category trees. NULL = category shows for every
              language in the app (useful for system-wide taxonomy). */}
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
              className={inputClass}
            >
              <option value="">— All languages —</option>
              {languages.filter(l => l.is_active).map(l => (
                <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
              ))}
            </select>
          </div>

          {/* 2026-04 scope fix: admin tab assignment. Controls which
              admin page this category (and all posters uploaded into
              it) appears under. Defaults to 'business' on this page;
              flipping to anything else moves the category out of the
              Business Posters view the next time the list refreshes.
              All existing posters in this category are automatically
              re-tagged to match (backend save hook).  */}
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
              className={inputClass}
            >
              <option value="business">Business Tab</option>
              <option value="categories">Categories Tab</option>
              <option value="home">Home Tab</option>
              <option value="festival">Festival</option>
              <option value="greeting">Greeting</option>
            </select>
            <p className="text-[11px] text-brand-text-muted mt-1">
              Posters uploaded into this category will appear under this tab.
            </p>
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

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Category" message={`Are you sure you want to delete "${deleteItem?.name}"? This action cannot be undone.`} confirmText="Delete" variant="danger" />

      <ConfirmDialog
        isOpen={bulkDeleteOpen}
        onClose={() => !bulkDeleting && setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        title={`Delete ${selectedIds.size} ${selectedIds.size === 1 ? 'category' : 'categories'}?`}
        message={`This moves ${selectedIds.size === 1 ? 'the selected category' : 'all selected categories'} to the Recycle Bin. Their child categories are also soft-deleted. You can restore them from the Recycle Bin page.`}
        confirmText={bulkDeleting ? 'Deleting…' : 'Delete all'}
        variant="danger"
      />
    </div>
  )
}

// 2026-04 fix: render a coloured letter chip when icon_url is empty
// or the image fails to load, instead of showing a broken-image alt
// tag. Deterministic colour per letter so the same category always
// gets the same colour.
const FALLBACK_COLORS = [
  '#6637d9', '#16a34a', '#f59e0b', '#ef4444',
  '#3b82f6', '#ec4899', '#14b8a6', '#a855f7',
]

function CategoryIcon({ iconUrl, name }: { iconUrl: string; name: string }) {
  const [failed, setFailed] = useState(false)
  const trimmedUrl = (iconUrl || '').trim()
  const letter = (name.trim().charAt(0) || '?').toUpperCase()
  const color = FALLBACK_COLORS[letter.charCodeAt(0) % FALLBACK_COLORS.length]

  if (!trimmedUrl || failed) {
    return (
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
        style={{ backgroundColor: color }}
        title={name}
      >
        {letter}
      </div>
    )
  }
  return (
    <img
      src={trimmedUrl}
      alt={name}
      onError={() => setFailed(true)}
      className="w-8 h-8 rounded-lg object-cover bg-brand-dark"
    />
  )
}
