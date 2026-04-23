import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Pencil, Trash2, Upload, X as XIcon, Plus, Download, GitMerge, ToggleLeft, ToggleRight, AlertTriangle, FolderInput, GripVertical, List, Network, ChevronDown, ChevronRight } from 'lucide-react'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { SortableRow } from '../../components/common/SortableRow'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { posterCategoriesApi, languagesApi, posterCategoryBulkApi } from '../../services/admin-api'
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
  // 2026-04: audit-trail columns — populated server-side. `created_at`
  // is set on create, `deleted_by` is written when an admin soft-deletes
  // the row (stays in the Recycle Bin view; not shown here since this
  // page filters out soft-deleted rows).
  created_at?: string
  deleted_by?: string
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
  const [searchParams, setSearchParams] = useSearchParams()

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

  // ── 2026-04 power-admin state ───────────────────────────────────
  // View mode (I + K): flat table | drag-to-reorder | nested tree.
  // 'flat' is the default table view. 'reorder' enables DnD handles
  // on each row and sends a single reorder request on drop. 'tree'
  // renders parents with their children nested beneath — read-only
  // so DnD is disabled (cross-parent moves require a separate flow).
  const [viewMode, setViewMode] = useState<'flat' | 'reorder' | 'tree'>('flat')
  // Collapsed parents in tree view. Empty set = all expanded.
  const [collapsedParents, setCollapsedParents] = useState<Set<number>>(new Set())
  const [reorderSaving, setReorderSaving] = useState(false)
  // Local sort_order override used only during a reorder. Until the
  // server refresh lands, we keep the dragged order client-side so
  // the UI doesn't snap back to the old positions mid-save.
  const [localSortOverride, setLocalSortOverride] = useState<number[] | null>(null)

  // Bulk create (A): modal with textarea, one category per line
  const [bulkCreateOpen, setBulkCreateOpen] = useState(false)
  const [bulkCreateText, setBulkCreateText] = useState('')
  const [bulkCreating, setBulkCreating] = useState(false)
  // Bulk change scope (B): modal with target-scope picker
  const [bulkScopeOpen, setBulkScopeOpen] = useState(false)
  const [bulkScopeTarget, setBulkScopeTarget] = useState<FormState['default_scope']>('categories')
  const [bulkScoping, setBulkScoping] = useState(false)
  // Merge (H): modal with target-category picker
  const [mergeOpen, setMergeOpen] = useState(false)
  const [mergeTargetId, setMergeTargetId] = useState<number>(0)
  const [merging, setMerging] = useState(false)
  // CSV import (F): file input state
  const [csvImportOpen, setCsvImportOpen] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvImporting, setCsvImporting] = useState(false)

  const handleBulkCreate = async () => {
    const names = bulkCreateText.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
    if (names.length === 0) { addToast('Enter at least one category name', 'error'); return }
    setBulkCreating(true)
    try {
      const resp = await posterCategoryBulkApi.bulkCreate(names, 'business') as { created: unknown[]; skipped: unknown[] }
      const createdN = (resp.created || []).length
      const skippedN = (resp.skipped || []).length
      addToast(
        skippedN > 0
          ? `Created ${createdN}; skipped ${skippedN} (duplicates)`
          : `Created ${createdN} categories`,
      )
      setBulkCreateOpen(false)
      setBulkCreateText('')
      refresh()
    } catch (err) {
      addToast(extractErrorMessage(err, 'Bulk create failed'), 'error')
    } finally { setBulkCreating(false) }
  }

  const handleBulkChangeScope = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setBulkScoping(true)
    try {
      const resp = await posterCategoryBulkApi.bulkChangeScope(ids, bulkScopeTarget) as { affected: number }
      addToast(`Moved ${resp.affected} categor${resp.affected === 1 ? 'y' : 'ies'} to ${bulkScopeTarget}`)
      setBulkScopeOpen(false)
      clearSelection()
      refresh()
    } catch (err) {
      addToast(extractErrorMessage(err, 'Bulk change scope failed'), 'error')
    } finally { setBulkScoping(false) }
  }

  const handleBulkActivate = async (active: boolean) => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    try {
      const resp = await posterCategoryBulkApi.bulkSetActive(ids, active) as { affected: number }
      addToast(`${active ? 'Activated' : 'Deactivated'} ${resp.affected} categor${resp.affected === 1 ? 'y' : 'ies'}`)
      clearSelection()
      refresh()
    } catch (err) {
      addToast(extractErrorMessage(err, `Bulk ${active ? 'activate' : 'deactivate'} failed`), 'error')
    }
  }

  const handleMerge = async () => {
    if (selectedIds.size !== 1 || !mergeTargetId) return
    const [sourceId] = Array.from(selectedIds)
    if (sourceId === mergeTargetId) { addToast('Source and target must differ', 'error'); return }
    setMerging(true)
    try {
      const resp = await posterCategoryBulkApi.mergeInto(sourceId, mergeTargetId) as { moved_posters: number }
      addToast(`Merged: ${resp.moved_posters} poster${resp.moved_posters === 1 ? '' : 's'} moved, source deleted`)
      setMergeOpen(false)
      setMergeTargetId(0)
      clearSelection()
      refresh()
    } catch (err) {
      addToast(extractErrorMessage(err, 'Merge failed'), 'error')
    } finally { setMerging(false) }
  }

  const handleCsvImport = async () => {
    if (!csvFile) { addToast('Pick a CSV file first', 'error'); return }
    setCsvImporting(true)
    try {
      const resp = await posterCategoryBulkApi.csvImport(csvFile) as { created: unknown[]; updated: unknown[]; skipped: unknown[] }
      addToast(`CSV import: ${resp.created.length} created, ${resp.updated.length} updated, ${resp.skipped.length} skipped`)
      setCsvImportOpen(false)
      setCsvFile(null)
      refresh()
    } catch (err) {
      addToast(extractErrorMessage(err, 'CSV import failed'), 'error')
    } finally { setCsvImporting(false) }
  }

  // Duplicate detection (G): for each row, look up categories whose
  // names share a prefix or substring. Memoised so it only runs when
  // `data` changes. Pure client-side heuristic — flags rows where the
  // admin might have created two categories for the same concept
  // (e.g. "Agarbatti" and "Agarbatti Post").
  const duplicatesByIdBus = useMemo(() => {
    const map = new Map<number, string[]>()
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '')
    for (const a of data) {
      const na = norm(a.name)
      const hits: string[] = []
      for (const b of data) {
        if (b.id === a.id) continue
        const nb = norm(b.name)
        if (!nb || !na) continue
        // Heuristic: same prefix of 5+ chars OR one contains the other
        if (nb.startsWith(na) || na.startsWith(nb) || nb.includes(na) || na.includes(nb)) {
          if (nb.length > 3) hits.push(b.name)
        }
      }
      if (hits.length) map.set(a.id, hits)
    }
    return map
  }, [data])

  // ── 2026-04 power-admin I: drag-to-reorder plumbing ──────────────
  // Reorder mode is flat-only — we sort strictly by sort_order so the
  // drag-and-drop hitboxes match what the admin sees. When a drop
  // happens we optimistically reflect the new order via
  // `localSortOverride` (the list of IDs in new order), then POST the
  // full ordered list to /api/admin/poster-categories/reorder/ and
  // refresh.
  const sortedForReorder = useMemo(() => {
    const base = [...data].sort((a, b) => {
      // @ts-expect-error — sort_order exists on PosterCategory but our
      // local interface doesn't declare it; fall back to name order.
      const ao = a.sort_order ?? 0
      // @ts-expect-error — same as above.
      const bo = b.sort_order ?? 0
      if (ao !== bo) return ao - bo
      return a.name.localeCompare(b.name)
    })
    if (!localSortOverride) return base
    const byId = new Map(base.map(c => [c.id, c]))
    const ordered = localSortOverride
      .map(id => byId.get(id))
      .filter((x): x is BusinessCategory => !!x)
    // Append anything the override didn't cover (e.g. newly-created).
    for (const c of base) if (!localSortOverride.includes(c.id)) ordered.push(c)
    return ordered
  }, [data, localSortOverride])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = sortedForReorder.findIndex(d => d.id === active.id)
    const newIndex = sortedForReorder.findIndex(d => d.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(sortedForReorder, oldIndex, newIndex)
    // Optimistic UI — keep the new order locally while the request runs.
    setLocalSortOverride(reordered.map(c => c.id))
    setReorderSaving(true)
    try {
      await posterCategoryBulkApi.reorder(
        reordered.map((c, i) => ({ id: c.id, sort_order: i })),
      )
      addToast('Order updated')
      await refresh()
      // Clear override once the server-side order matches our local view.
      setLocalSortOverride(null)
    } catch (err) {
      addToast(extractErrorMessage(err, 'Reorder failed'), 'error')
      // Roll back the optimistic update on failure so the admin sees
      // the real server state.
      setLocalSortOverride(null)
    } finally {
      setReorderSaving(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedForReorder])

  // ── 2026-04 power-admin K: tree view grouping ────────────────────
  // Group children under their parents for the nested tree renderer.
  // Orphan children (parent id missing from `data`, which can happen
  // when a language filter excludes the parent) are surfaced at the
  // top level so they still render, labelled with their parent_name.
  const treeGroups = useMemo(() => {
    const parents: BusinessCategory[] = []
    const childrenByParent = new Map<number, BusinessCategory[]>()
    const byId = new Map(data.map(c => [c.id, c]))
    for (const c of data) {
      if (c.parent === null) {
        parents.push(c)
      } else {
        if (!byId.has(c.parent)) {
          // Parent is filtered out — render at the top level.
          parents.push(c)
          continue
        }
        const list = childrenByParent.get(c.parent) ?? []
        list.push(c)
        childrenByParent.set(c.parent, list)
      }
    }
    // Alphabetic parent + child ordering within the tree view.
    parents.sort((a, b) => a.name.localeCompare(b.name))
    for (const arr of childrenByParent.values()) {
      arr.sort((a, b) => a.name.localeCompare(b.name))
    }
    return { parents, childrenByParent }
  }, [data])

  const toggleParentCollapse = useCallback((id: number) => {
    setCollapsedParents(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

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

  /**
   * 2026-04: auto-open the Edit modal when the page is entered with
   * `?edit=<id>` in the URL. BusinessPosterPage links here with that
   * param when the admin clicks the "Edit category" button on the
   * viewing-context pill. Ref-guarded one-shot so subsequent re-renders
   * or a fresh `data` fetch don't re-open the modal after the admin
   * dismissed it. The param is cleaned out of the URL so a refresh
   * doesn't re-trigger either.
   */
  const editUrlHandledRef = useRef(false)
  useEffect(() => {
    if (editUrlHandledRef.current) return
    const editId = searchParams.get('edit')
    if (!editId) return
    if (data.length === 0) return  // wait for the list to load
    const target = data.find(c => c.id === Number(editId))
    if (target) {
      openEdit(target)
    } else {
      addToast(`Category #${editId} not found or not a business category.`, 'error')
    }
    setSearchParams({}, { replace: true })
    editUrlHandledRef.current = true
    // addToast + openEdit + setSearchParams are stable across renders
    // but ESLint can't prove that, so disable the exhaustive-deps rule
    // for this one-shot effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, searchParams])

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
      // 2026-04 power-admin G: an amber ⚠ icon appears when the
      // client-side duplicate heuristic (see duplicatesByIdBus) detects
      // a similarly-named row. Hover for the list of matches.
      render: (item) => {
        const dupMatches = duplicatesByIdBus.get(item.id)
        return (
          <div className="flex items-center gap-2">
            <span>{item.name}</span>
            {item.parent_name && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-dark-hover text-brand-text-muted">
                under {item.parent_name}
              </span>
            )}
            {dupMatches && dupMatches.length > 0 && (
              <span
                className="text-amber-400"
                title={`Possible duplicate of: ${dupMatches.join(', ')}`}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
        )
      },
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
      // 2026-04 power-admin M: surface the audit-trail data the model
      // already carries (created_at on every row; deleted_by only on
      // soft-deleted rows which this page filters out anyway). Keeps
      // the column compact by showing only the date, with the full
      // ISO timestamp in the title attr for hover inspection.
      key: 'created_at' as 'name',
      title: 'Activity',
      sortable: true,
      render: (item) => {
        if (!item.created_at) return <span className="text-xs text-brand-text-muted/60">—</span>
        const d = new Date(item.created_at)
        return (
          <span
            className="text-xs text-brand-text-muted"
            title={`Created ${d.toISOString()}`}
          >
            {d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
          </span>
        )
      },
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
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Business Categories</h1>
          <p className="text-xs text-brand-text-muted mt-1">
            {data.length} categor{data.length === 1 ? 'y' : 'ies'}
            {duplicatesByIdBus.size > 0 && (
              <> · <span className="text-amber-400">{duplicatesByIdBus.size} possible duplicate{duplicatesByIdBus.size === 1 ? '' : 's'}</span></>
            )}
          </p>
        </div>
        {/* Header action row — one-click bulk tools alongside the
            single-row "Add Category" button. CSV Export is a plain
            anchor with a download attr so the browser streams straight
            from the backend; CSV Import + Bulk Create open their
            respective modals. */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 2026-04 power-admin I + K: view-mode switcher.
              Flat (default DataTable), Reorder (flat + DnD handles),
              Tree (nested parent/child read-only). Segmented control
              styling keeps the three modes obviously mutually exclusive. */}
          <div className="inline-flex rounded-lg border border-brand-dark-border overflow-hidden">
            {([
              { mode: 'flat',    label: 'Flat',    Icon: List,          title: 'Default flat list' },
              { mode: 'reorder', label: 'Reorder', Icon: GripVertical,  title: 'Drag rows to change sort order' },
              { mode: 'tree',    label: 'Tree',    Icon: Network,       title: 'Nested parent → children view' },
            ] as const).map(({ mode, label, Icon, title }) => (
              <button
                key={mode}
                onClick={() => {
                  setViewMode(mode)
                  if (mode !== 'flat') clearSelection()
                }}
                title={title}
                className={`px-3 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  viewMode === mode
                    ? 'bg-brand-gold text-gray-900'
                    : 'bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border'
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setBulkCreateOpen(true)}
            className="px-3 py-2 text-xs font-medium rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors flex items-center gap-1.5"
            title="Create multiple categories from a list of names"
          >
            <Plus className="h-3.5 w-3.5" /> Bulk Create
          </button>
          <a
            href={posterCategoryBulkApi.csvExportUrl()}
            className="px-3 py-2 text-xs font-medium rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors flex items-center gap-1.5"
            title="Download all categories as CSV"
          >
            <Download className="h-3.5 w-3.5" /> CSV Export
          </a>
          <button
            onClick={() => setCsvImportOpen(true)}
            className="px-3 py-2 text-xs font-medium rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors flex items-center gap-1.5"
            title="Import / update categories from a CSV file"
          >
            <Upload className="h-3.5 w-3.5" /> CSV Import
          </button>
          <button
            onClick={openAdd}
            className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors"
          >
            + Add Category
          </button>
        </div>
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
          DataTable's Column.title is typed as string, not ReactNode.
          2026-04 power-admin: extended with Change Admin Tab, Activate
          and Deactivate, Merge (shown only when exactly one row is
          selected — merging requires picking a single SOURCE). */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-brand-gold/10 border border-brand-gold/30 rounded-lg flex-wrap">
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
            onClick={() => setBulkScopeOpen(true)}
            className="px-3 py-1.5 bg-brand-dark-hover hover:bg-brand-dark-border text-brand-text text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
            title="Change Admin Tab for selected categories"
          >
            <FolderInput className="h-3.5 w-3.5" /> Change Admin Tab
          </button>
          <button
            onClick={() => handleBulkActivate(true)}
            className="px-3 py-1.5 bg-brand-dark-hover hover:bg-status-success/20 hover:text-status-success text-brand-text text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
            title="Mark selected as Active"
          >
            <ToggleRight className="h-3.5 w-3.5" /> Activate
          </button>
          <button
            onClick={() => handleBulkActivate(false)}
            className="px-3 py-1.5 bg-brand-dark-hover hover:bg-brand-dark-border text-brand-text text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
            title="Mark selected as Inactive (hides from the app)"
          >
            <ToggleLeft className="h-3.5 w-3.5" /> Deactivate
          </button>
          {selectedIds.size === 1 && (
            <button
              onClick={() => setMergeOpen(true)}
              className="px-3 py-1.5 bg-brand-dark-hover hover:bg-brand-indigo/20 hover:text-brand-indigo text-brand-text text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
              title="Merge this category's posters into another category, then delete this one"
            >
              <GitMerge className="h-3.5 w-3.5" /> Merge into…
            </button>
          )}
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

      {/* Data Table / Reorder DnD / Tree view — 2026-04 power-admin I + K */}
      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <p className="text-status-error text-sm">{error}</p>
            <button onClick={refresh} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">Retry</button>
          </div>
        ) : viewMode === 'reorder' ? (
          // Reorder mode: flat DataTable with a drag handle column.
          // We feed it the strictly-sort_order sorted list so drag
          // hit-boxes match what the admin sees. Each row is wrapped
          // in SortableRow; the whole tbody is wrapped in a DndContext
          // + SortableContext so @dnd-kit can measure positions.
          <div className="relative">
            {reorderSaving && (
              <div className="absolute inset-0 bg-brand-dark-card/60 flex items-center justify-center z-10 text-xs text-brand-text-muted">
                Saving order…
              </div>
            )}
            <DataTable
              columns={columns}
              data={sortedForReorder}
              showDragHandle
              tbodyWrapper={children => (
                <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext
                    items={sortedForReorder.map(d => d.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {children}
                  </SortableContext>
                </DndContext>
              )}
              renderRow={(item, key, cells) => (
                <SortableRow key={key} id={item.id}>{cells}</SortableRow>
              )}
            />
          </div>
        ) : viewMode === 'tree' ? (
          // Tree view: nested parent → children layout, read-only with
          // expand/collapse. Intentionally NOT a DataTable — the
          // indentation + collapse toggles don't map cleanly to table
          // rows, and trying to force it creates visual bugs when
          // children span multiple columns.
          <div className="divide-y divide-brand-dark-border/40">
            {treeGroups.parents.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-brand-text-muted">
                No categories to display.
              </div>
            ) : (
              treeGroups.parents.map(parent => {
                const children = treeGroups.childrenByParent.get(parent.id) ?? []
                const collapsed = collapsedParents.has(parent.id)
                return (
                  <div key={parent.id}>
                    <div className="flex items-center gap-2 px-4 py-2.5 hover:bg-brand-dark-hover/40">
                      {children.length > 0 ? (
                        <button
                          onClick={() => toggleParentCollapse(parent.id)}
                          className="p-0.5 rounded hover:bg-brand-dark-border text-brand-text-muted"
                          aria-label={collapsed ? 'Expand' : 'Collapse'}
                        >
                          {collapsed
                            ? <ChevronRight className="h-4 w-4" />
                            : <ChevronDown className="h-4 w-4" />}
                        </button>
                      ) : (
                        <span className="w-5 inline-block" />
                      )}
                      <CategoryIcon iconUrl={parent.icon_url} name={parent.name} />
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-sm font-medium text-brand-text truncate">{parent.name}</span>
                        {!parent.is_active && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-dark-hover text-brand-text-muted">
                            Inactive
                          </span>
                        )}
                        <span className="text-[11px] text-brand-text-muted">
                          {parent.poster_count} poster{parent.poster_count === 1 ? '' : 's'}
                          {children.length > 0 && ` · ${children.length} subcategor${children.length === 1 ? 'y' : 'ies'}`}
                        </span>
                      </div>
                      <button
                        onClick={() => navigate(`/posters/business?upload=1&category=${parent.id}`)}
                        className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-indigo transition-colors"
                        title={`Bulk upload posters to "${parent.name}"`}
                      >
                        <Upload className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openEdit(parent)}
                        className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-gold transition-colors"
                        title="Edit category"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteItem(parent)}
                        className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-status-error transition-colors"
                        title="Delete category"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {!collapsed && children.map(child => (
                      <div
                        key={child.id}
                        className="flex items-center gap-2 pl-12 pr-4 py-2 hover:bg-brand-dark-hover/40"
                      >
                        <CategoryIcon iconUrl={child.icon_url} name={child.name} />
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-sm text-brand-text truncate">{child.name}</span>
                          {!child.is_active && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-dark-hover text-brand-text-muted">
                              Inactive
                            </span>
                          )}
                          <span className="text-[11px] text-brand-text-muted">
                            {child.poster_count} poster{child.poster_count === 1 ? '' : 's'}
                          </span>
                        </div>
                        <button
                          onClick={() => navigate(`/posters/business?upload=1&category=${child.id}`)}
                          className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-indigo transition-colors"
                          title={`Bulk upload posters to "${child.name}"`}
                        >
                          <Upload className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(child)}
                          className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-gold transition-colors"
                          title="Edit category"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteItem(child)}
                          className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-status-error transition-colors"
                          title="Delete category"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )
              })
            )}
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

      {/* ── 2026-04 power-admin modals ───────────────────────────── */}

      {/* Bulk Create (A): paste a list, one category per line. Backend
          auto-generates slugs and skips duplicates rather than failing
          the whole batch. */}
      <Modal
        isOpen={bulkCreateOpen}
        onClose={() => !bulkCreating && setBulkCreateOpen(false)}
        title="Bulk Create Categories"
      >
        <div className="space-y-4">
          <p className="text-sm text-brand-text-muted">
            Paste one category name per line. New categories will be
            created under the <span className="text-brand-gold font-medium">Business</span> tab.
            Slugs are auto-generated. Duplicates are skipped.
          </p>
          <textarea
            value={bulkCreateText}
            onChange={e => setBulkCreateText(e.target.value)}
            rows={10}
            placeholder={`Restaurant\nSalon\nGym\nBoutique\n…`}
            className={`${inputClass} font-mono text-sm`}
            disabled={bulkCreating}
          />
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => { setBulkCreateText(''); setBulkCreateOpen(false) }}
              disabled={bulkCreating}
              className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkCreate}
              disabled={bulkCreating || !bulkCreateText.trim()}
              className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors disabled:opacity-50"
            >
              {bulkCreating ? 'Creating…' : 'Create all'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Bulk Change Admin Tab (B): move N selected categories to a
          different scope. Backend calls cat.save() per-instance so the
          PosterCategory.save retag hook fires for each (and all posters
          inside get re-tagged to the new scope automatically). */}
      <Modal
        isOpen={bulkScopeOpen}
        onClose={() => !bulkScoping && setBulkScopeOpen(false)}
        title={`Change Admin Tab for ${selectedIds.size} categor${selectedIds.size === 1 ? 'y' : 'ies'}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-brand-text-muted">
            All posters inside the selected categories will also be
            re-tagged to the new tab. This runs per-category on the
            backend, so it may take a moment for large groups.
          </p>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">New Admin Tab</label>
            <select
              value={bulkScopeTarget}
              onChange={e => setBulkScopeTarget(e.target.value as FormState['default_scope'])}
              className={inputClass}
              disabled={bulkScoping}
            >
              <option value="business">Business Tab</option>
              <option value="categories">Categories Tab</option>
              <option value="home">Home Tab</option>
              <option value="festival">Festival</option>
              <option value="greeting">Greeting</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setBulkScopeOpen(false)}
              disabled={bulkScoping}
              className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkChangeScope}
              disabled={bulkScoping}
              className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors disabled:opacity-50"
            >
              {bulkScoping ? 'Moving…' : 'Change tab'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Merge (H): source is the single selected row; admin picks the
          target from a dropdown of other categories. Backend moves all
          posters from source → target, updates their scope to match,
          then soft-deletes the source. */}
      <Modal
        isOpen={mergeOpen}
        onClose={() => !merging && setMergeOpen(false)}
        title="Merge category"
      >
        <div className="space-y-4">
          {(() => {
            const [srcId] = Array.from(selectedIds)
            const source = data.find(c => c.id === srcId)
            return (
              <p className="text-sm text-brand-text-muted">
                Move every poster from{' '}
                <span className="text-brand-gold font-medium">
                  {source?.name ?? '?'}
                </span>{' '}
                into the target below, then soft-delete this category.
                The source category can be restored from the Recycle Bin
                but its posters will stay in the target.
              </p>
            )
          })()}
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Target category</label>
            <select
              value={mergeTargetId}
              onChange={e => setMergeTargetId(Number(e.target.value))}
              className={inputClass}
              disabled={merging}
            >
              <option value={0}>— Select target —</option>
              {data
                .filter(c => !selectedIds.has(c.id))
                .map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.poster_count} posters)
                  </option>
                ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => { setMergeTargetId(0); setMergeOpen(false) }}
              disabled={merging}
              className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleMerge}
              disabled={merging || !mergeTargetId}
              className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors disabled:opacity-50"
            >
              {merging ? 'Merging…' : 'Merge'}
            </button>
          </div>
        </div>
      </Modal>

      {/* CSV Import (F): uploads a CSV with the same columns csv_export
          produces. Rows with an `id` column update existing rows; rows
          without one are created using `slug` as the primary key. */}
      <Modal
        isOpen={csvImportOpen}
        onClose={() => !csvImporting && setCsvImportOpen(false)}
        title="Import categories from CSV"
      >
        <div className="space-y-4">
          <p className="text-sm text-brand-text-muted">
            Upload a CSV with columns: <code className="text-brand-text bg-brand-dark px-1.5 py-0.5 rounded">id, name, slug, default_scope, parent_slug, language_code, icon_url, is_active</code>.
            Rows with an <code className="bg-brand-dark px-1.5 py-0.5 rounded">id</code> are
            updated; rows without are created (using <code className="bg-brand-dark px-1.5 py-0.5 rounded">slug</code> as
            the key). Run <span className="text-brand-gold">CSV Export</span> first to
            get a template.
          </p>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={e => setCsvFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-brand-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-gold file:text-gray-900 hover:file:bg-brand-gold-dark file:cursor-pointer"
            disabled={csvImporting}
          />
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => { setCsvFile(null); setCsvImportOpen(false) }}
              disabled={csvImporting}
              className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCsvImport}
              disabled={csvImporting || !csvFile}
              className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors disabled:opacity-50"
            >
              {csvImporting ? 'Importing…' : 'Import'}
            </button>
          </div>
        </div>
      </Modal>
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
