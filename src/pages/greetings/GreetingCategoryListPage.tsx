import { useCallback, useMemo, useState } from 'react'
import {
  Pencil, Trash2, Plus, Download, Upload, X, GitMerge,
  ToggleLeft, ToggleRight, AlertTriangle, List, GripVertical,
} from 'lucide-react'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { SortableRow } from '../../components/common/SortableRow'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import {
  greetingCategoriesApi, greetingCategoryBulkApi,
} from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'
import type { GreetingCategory } from '../../types'

/**
 * 2026-04 Phase 2 — Greeting Categories Power-Admin.
 *
 * Mirrors BusinessCategoryPage feature-by-feature, scoped to the
 * greetings domain:
 *   * Multi-select checkboxes + bulk delete / activate / deactivate
 *     / merge (single-row) — all talk to the new bulk endpoints.
 *   * Bulk Create modal — paste one category per line, auto-slugs,
 *     skips duplicates with per-name reason codes.
 *   * CSV Export + CSV Import (rich format: slug, coupon fields,
 *     caption/accent/banner metadata, order, active flag).
 *   * Duplicate detection (amber ⚠ on similar names).
 *   * Activity column showing created_at (hover = full ISO).
 *   * View-mode toggle: Flat (default DataTable) vs. Reorder (drag
 *     handles + @dnd-kit). Tree view is not applicable — greeting
 *     categories are flat (no parent field).
 *   * Single-row Add / Edit / Delete preserved.
 */

interface FormState {
  icon_url: string | null
  name: string
  slug: string
  sort_order: number
  is_active: boolean
  default_caption: string
  accent_color: string
  banner_text: string
  coupon_code: string
  coupon_caption: string
}

const emptyForm: FormState = {
  icon_url: null, name: '', slug: '', sort_order: 0, is_active: true,
  default_caption: '', accent_color: '#FFC107', banner_text: '',
  coupon_code: '', coupon_caption: '',
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

const inputClass = 'w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50'

export default function GreetingCategoryListPage() {
  const { addToast } = useToast()
  const { data, loading, create, update, remove, refresh } =
    useAdminCrud<GreetingCategory>(greetingCategoriesApi)

  // Single-row CRUD state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<GreetingCategory | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<GreetingCategory | null>(null)

  // Multi-select + bulk state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkCreateOpen, setBulkCreateOpen] = useState(false)
  const [bulkCreateText, setBulkCreateText] = useState('')
  const [bulkCreating, setBulkCreating] = useState(false)
  const [mergeOpen, setMergeOpen] = useState(false)
  const [mergeTargetId, setMergeTargetId] = useState<number>(0)
  const [merging, setMerging] = useState(false)
  const [csvImportOpen, setCsvImportOpen] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvImporting, setCsvImporting] = useState(false)

  // View-mode toggle
  const [viewMode, setViewMode] = useState<'flat' | 'reorder'>('flat')
  const [reorderSaving, setReorderSaving] = useState(false)
  const [localSortOverride, setLocalSortOverride] = useState<number[] | null>(null)

  // ── Duplicate detection (title-substring heuristic) ──
  const duplicatesById = useMemo(() => {
    const map = new Map<number, string[]>()
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '')
    for (const a of data) {
      const na = norm(a.name)
      const hits: string[] = []
      for (const b of data) {
        if (b.id === a.id) continue
        const nb = norm(b.name)
        if (!nb || !na) continue
        if (nb.startsWith(na) || na.startsWith(nb) || nb.includes(na) || na.includes(nb)) {
          if (nb.length > 3) hits.push(b.name)
        }
      }
      if (hits.length) map.set(a.id, hits)
    }
    return map
  }, [data])

  // ── Selection helpers ──
  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }, [])
  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      if (prev.size === data.length && data.length > 0) return new Set()
      return new Set(data.map(d => d.id))
    })
  }, [data])
  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])
  const allSelected = data.length > 0 && selectedIds.size === data.length

  // ── Reorder (DnD) plumbing ──
  const sortedForReorder = useMemo(() => {
    const base = [...data].sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
      return a.name.localeCompare(b.name)
    })
    if (!localSortOverride) return base
    const byId = new Map(base.map(c => [c.id, c]))
    const ordered = localSortOverride
      .map(id => byId.get(id))
      .filter((x): x is GreetingCategory => !!x)
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
    setLocalSortOverride(reordered.map(c => c.id))
    setReorderSaving(true)
    try {
      await greetingCategoryBulkApi.reorder(
        reordered.map((c, i) => ({ id: c.id, sort_order: i })),
      )
      addToast('Order updated')
      await refresh()
      setLocalSortOverride(null)
    } catch {
      addToast('Reorder failed', 'error')
      setLocalSortOverride(null)
    } finally {
      setReorderSaving(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedForReorder])

  // ── Single-row CRUD ──
  const openAdd = () => { setEditingItem(null); setForm(emptyForm); setModalOpen(true) }
  const openEdit = (item: GreetingCategory) => {
    setEditingItem(item)
    setForm({
      icon_url: item.icon_url,
      name: item.name,
      slug: item.slug,
      sort_order: item.sort_order,
      is_active: item.is_active,
      default_caption: item.default_caption || '',
      accent_color: item.accent_color || '#FFC107',
      banner_text: item.banner_text || '',
      coupon_code: item.coupon_code || '',
      coupon_caption: item.coupon_caption || '',
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) { addToast('Name is required', 'error'); return }
    if (data.some(d => d.slug === form.slug && d.id !== editingItem?.id)) {
      addToast('A category with this slug already exists', 'error'); return
    }
    try {
      if (editingItem) {
        await update(editingItem.id, form)
        addToast('Category updated successfully')
      } else {
        await create(form)
        addToast('Category created successfully')
      }
      setForm(emptyForm); setEditingItem(null); setModalOpen(false)
      refresh()
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
    } catch {
      addToast('Delete failed. Please try again.', 'error')
    }
  }

  // ── Bulk handlers ──
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    setBulkDeleting(true)
    try {
      const resp = await greetingCategoryBulkApi.bulkDelete(Array.from(selectedIds)) as
        { deleted: number; cascaded_templates: number }
      addToast(
        resp.cascaded_templates > 0
          ? `Deleted ${resp.deleted} categor${resp.deleted === 1 ? 'y' : 'ies'} + ${resp.cascaded_templates} templates`
          : `Deleted ${resp.deleted} categor${resp.deleted === 1 ? 'y' : 'ies'}`,
      )
      clearSelection()
      setBulkDeleteOpen(false)
      refresh()
    } catch {
      addToast('Bulk delete failed', 'error')
    } finally { setBulkDeleting(false) }
  }

  const handleBulkCreate = async () => {
    const names = bulkCreateText.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
    if (names.length === 0) { addToast('Enter at least one name', 'error'); return }
    setBulkCreating(true)
    try {
      const resp = await greetingCategoryBulkApi.bulkCreate(names) as
        { created: unknown[]; skipped: unknown[] }
      const c = (resp.created || []).length
      const s = (resp.skipped || []).length
      addToast(
        s > 0
          ? `Created ${c}; skipped ${s} (duplicates)`
          : `Created ${c} categor${c === 1 ? 'y' : 'ies'}`,
      )
      setBulkCreateOpen(false)
      setBulkCreateText('')
      refresh()
    } catch {
      addToast('Bulk create failed', 'error')
    } finally { setBulkCreating(false) }
  }

  const handleBulkActivate = async (active: boolean) => {
    if (selectedIds.size === 0) return
    try {
      const resp = await greetingCategoryBulkApi.bulkSetActive(
        Array.from(selectedIds), active,
      ) as { affected: number }
      addToast(
        `${active ? 'Activated' : 'Deactivated'} ${resp.affected} categor${resp.affected === 1 ? 'y' : 'ies'}`,
      )
      clearSelection()
      refresh()
    } catch {
      addToast(`Bulk ${active ? 'activate' : 'deactivate'} failed`, 'error')
    }
  }

  const handleMerge = async () => {
    if (selectedIds.size !== 1 || !mergeTargetId) return
    const [sourceId] = Array.from(selectedIds)
    if (sourceId === mergeTargetId) {
      addToast('Source and target must differ', 'error'); return
    }
    setMerging(true)
    try {
      const resp = await greetingCategoryBulkApi.mergeInto(sourceId, mergeTargetId) as
        { moved_templates: number }
      addToast(
        `Merged: ${resp.moved_templates} template${resp.moved_templates === 1 ? '' : 's'} moved, source deleted`,
      )
      setMergeOpen(false)
      setMergeTargetId(0)
      clearSelection()
      refresh()
    } catch {
      addToast('Merge failed', 'error')
    } finally { setMerging(false) }
  }

  const handleCsvImport = async () => {
    if (!csvFile) { addToast('Pick a CSV file first', 'error'); return }
    setCsvImporting(true)
    try {
      const resp = await greetingCategoryBulkApi.csvImport(csvFile) as
        { created: unknown[]; updated: unknown[]; skipped: unknown[] }
      addToast(`CSV import: ${resp.created.length} created, ${resp.updated.length} updated, ${resp.skipped.length} skipped`)
      setCsvImportOpen(false)
      setCsvFile(null)
      refresh()
    } catch {
      addToast('CSV import failed', 'error')
    } finally { setCsvImporting(false) }
  }

  // ── Columns ──
  const columns: Column<GreetingCategory>[] = [
    {
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
    { key: 'name', title: 'Category', sortable: true, render: (c) => {
      const dupMatches = duplicatesById.get(c.id)
      return (
        <div className="flex items-center gap-2">
          <span>{c.name}</span>
          {dupMatches && dupMatches.length > 0 && (
            <span className="text-amber-400" title={`Similar names: ${dupMatches.join(', ')}`}>
              <AlertTriangle className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      )
    } },
    { key: 'slug', title: 'Slug' },
    { key: 'template_count', title: 'Templates', sortable: true },
    { key: 'sort_order', title: 'Order', sortable: true },
    { key: 'accent_color', title: 'Accent', render: (c) => (
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded border border-brand-dark-border" style={{ backgroundColor: c.accent_color || '#FFC107' }} />
        <span className="text-brand-text-muted text-xs">{c.accent_color || '-'}</span>
      </div>
    )},
    { key: 'coupon_code' as 'name', title: 'Coupon', render: (c) => (
      c.coupon_code
        ? <span className="text-xs px-2 py-0.5 rounded bg-brand-gold/20 text-brand-gold font-mono">{c.coupon_code}</span>
        : <span className="text-xs text-brand-text-muted/60">—</span>
    )},
    { key: 'is_active', title: 'Status', render: (c) => (
      c.is_active ? <span className="text-status-success">Active</span> : <span className="text-status-error">Inactive</span>
    ) },
    {
      key: 'created_at' as 'name',
      title: 'Activity',
      sortable: true,
      render: (c) => {
        if (!c.created_at) return <span className="text-xs text-brand-text-muted/60">—</span>
        const d = new Date(c.created_at)
        return (
          <span className="text-xs text-brand-text-muted" title={`Created ${d.toISOString()}`}>
            {d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
          </span>
        )
      },
    },
    { key: 'actions', title: 'Actions', render: (item) => (
      <div className="flex items-center gap-2">
        <button onClick={(e) => { e.stopPropagation(); openEdit(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-gold transition-colors" title="Edit"><Pencil className="h-4 w-4" /></button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteItem(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-status-error transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Greeting Categories</h1>
          <p className="text-xs text-brand-text-muted mt-1">
            {data.length} categor{data.length === 1 ? 'y' : 'ies'}
            {duplicatesById.size > 0 && (
              <> · <span className="text-amber-400">{duplicatesById.size} possible duplicate{duplicatesById.size === 1 ? '' : 's'}</span></>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-lg border border-brand-dark-border overflow-hidden">
            {([
              { mode: 'flat',    label: 'Flat',    Icon: List,          title: 'Default flat list' },
              { mode: 'reorder', label: 'Reorder', Icon: GripVertical,  title: 'Drag rows to change sort order' },
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
            href={greetingCategoryBulkApi.csvExportUrl()}
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

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-brand-gold/10 border border-brand-gold/30 rounded-lg flex-wrap">
          <span className="text-sm text-brand-text font-medium">{selectedIds.size} selected</span>
          <button onClick={toggleSelectAll} className="text-xs text-brand-text-muted hover:text-brand-text underline">
            {allSelected ? 'Deselect all' : `Select all ${data.length}`}
          </button>
          <div className="flex-1" />
          <button onClick={() => handleBulkActivate(true)} className="px-3 py-1.5 bg-brand-dark-hover hover:bg-status-success/20 hover:text-status-success text-brand-text text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors" title="Mark selected as Active">
            <ToggleRight className="h-3.5 w-3.5" /> Activate
          </button>
          <button onClick={() => handleBulkActivate(false)} className="px-3 py-1.5 bg-brand-dark-hover hover:bg-brand-dark-border text-brand-text text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors" title="Mark selected as Inactive">
            <ToggleLeft className="h-3.5 w-3.5" /> Deactivate
          </button>
          {selectedIds.size === 1 && (
            <button onClick={() => setMergeOpen(true)} className="px-3 py-1.5 bg-brand-dark-hover hover:bg-brand-indigo/20 hover:text-brand-indigo text-brand-text text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors" title="Merge this category's templates into another">
              <GitMerge className="h-3.5 w-3.5" /> Merge into…
            </button>
          )}
          <button onClick={() => setBulkDeleteOpen(true)} className="px-3 py-1.5 bg-status-error/90 hover:bg-status-error text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors">
            <Trash2 className="h-3.5 w-3.5" /> Delete selected
          </button>
          <button onClick={clearSelection} className="p-1.5 text-brand-text-muted hover:text-brand-text rounded hover:bg-brand-dark-hover transition-colors" title="Clear selection">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Data table / Reorder view */}
      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div>
        ) : viewMode === 'reorder' ? (
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
        ) : (
          <DataTable columns={columns} data={data} />
        )}
      </div>

      {/* ─── Add / Edit modal ─── */}
      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} title={editingItem ? 'Edit Category' : 'Add Category'}>
        <div className="space-y-4">
          <ImageUpload label="Category Icon" value={form.icon_url} onChange={v => setForm(f => ({ ...f, icon_url: v }))} aspectHint="Square, 128x128" />
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: toSlug(e.target.value) }))} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Slug</label>
            <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Sort Order</label>
            <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Default Caption</label>
            <textarea value={form.default_caption} onChange={e => setForm(f => ({ ...f, default_caption: e.target.value }))} rows={3} className={`${inputClass} resize-none`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Accent Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={form.accent_color} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} className="w-10 h-10 rounded border border-brand-dark-border cursor-pointer bg-transparent" />
              <input value={form.accent_color} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} placeholder="#FFC107" className={`${inputClass} flex-1`} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Banner Text</label>
            <input value={form.banner_text} onChange={e => setForm(f => ({ ...f, banner_text: e.target.value }))} className={inputClass} />
          </div>

          {/* Tier 3 F#9 — coupon bundle. Optional. Shown as a small
              group with its own heading for clarity. */}
          <div className="pt-2 border-t border-brand-dark-border/40">
            <p className="text-xs text-brand-text-muted mb-2 font-semibold uppercase tracking-wide">Coupon Bundle (optional)</p>
            <div className="space-y-2">
              <div>
                <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Coupon Code</label>
                <input value={form.coupon_code} onChange={e => setForm(f => ({ ...f, coupon_code: e.target.value }))} placeholder="e.g. BIRTHDAY20" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Coupon Caption</label>
                <input value={form.coupon_caption} onChange={e => setForm(f => ({ ...f, coupon_caption: e.target.value }))} placeholder="e.g. Here's 20% off, {name} — use code BIRTHDAY20" className={inputClass} />
                <p className="text-[11px] text-brand-text-muted mt-1">Supports {'{name}'} and {'{business}'} placeholders.</p>
              </div>
            </div>
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

      {/* Single delete */}
      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Category" message={`Are you sure you want to delete "${deleteItem?.name}"? This cascades to every template under it. This cannot be undone.`} confirmText="Delete" variant="danger" />

      {/* Bulk delete confirm */}
      <ConfirmDialog
        isOpen={bulkDeleteOpen}
        onClose={() => !bulkDeleting && setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        title={`Delete ${selectedIds.size} categor${selectedIds.size === 1 ? 'y' : 'ies'}?`}
        message="This cascades to every template in the selected categories. The deletion is permanent and cannot be undone — export a CSV first if you want a backup."
        confirmText={bulkDeleting ? 'Deleting…' : 'Delete all'}
        variant="danger"
      />

      {/* Bulk create modal */}
      <Modal
        isOpen={bulkCreateOpen}
        onClose={() => !bulkCreating && setBulkCreateOpen(false)}
        title="Bulk Create Categories"
      >
        <div className="space-y-4">
          <p className="text-sm text-brand-text-muted">
            Paste one category name per line. Slugs are auto-generated.
            Duplicates (by name or slug) are skipped with a reason code.
          </p>
          <textarea
            value={bulkCreateText}
            onChange={e => setBulkCreateText(e.target.value)}
            rows={10}
            placeholder={`Wedding Anniversary\nHouse Warming\nNew Year\nDiwali\n…`}
            className={`${inputClass} font-mono text-sm`}
            disabled={bulkCreating}
          />
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setBulkCreateText(''); setBulkCreateOpen(false) }} disabled={bulkCreating} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors disabled:opacity-50">Cancel</button>
            <button onClick={handleBulkCreate} disabled={bulkCreating || !bulkCreateText.trim()} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors disabled:opacity-50">
              {bulkCreating ? 'Creating…' : 'Create all'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Merge modal */}
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
                Move every template from{' '}
                <span className="text-brand-gold font-medium">{source?.name ?? '?'}</span>{' '}
                into the target below, then delete this category. The source is deleted permanently — templates live on in the target.
              </p>
            )
          })()}
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Target category</label>
            <select value={mergeTargetId} onChange={e => setMergeTargetId(Number(e.target.value))} className={inputClass} disabled={merging}>
              <option value={0}>— Select target —</option>
              {data
                .filter(c => !selectedIds.has(c.id))
                .map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.template_count} templates)
                  </option>
                ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setMergeTargetId(0); setMergeOpen(false) }} disabled={merging} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors disabled:opacity-50">Cancel</button>
            <button onClick={handleMerge} disabled={merging || !mergeTargetId} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors disabled:opacity-50">
              {merging ? 'Merging…' : 'Merge'}
            </button>
          </div>
        </div>
      </Modal>

      {/* CSV import modal */}
      <Modal
        isOpen={csvImportOpen}
        onClose={() => !csvImporting && setCsvImportOpen(false)}
        title="Import categories from CSV"
      >
        <div className="space-y-4">
          <p className="text-sm text-brand-text-muted">
            Upload a CSV with columns: <code className="text-brand-text bg-brand-dark px-1.5 py-0.5 rounded">id, name, slug, icon_url, description, default_caption, accent_color, banner_text, coupon_code, coupon_caption, sort_order, is_active</code>.
            Rows with <code className="bg-brand-dark px-1.5 py-0.5 rounded">id</code> update; rows without are created using <code className="bg-brand-dark px-1.5 py-0.5 rounded">slug</code> as the key. Run <span className="text-brand-gold">CSV Export</span> first to get a template file.
          </p>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={e => setCsvFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-brand-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-gold file:text-gray-900 hover:file:bg-brand-gold-dark file:cursor-pointer"
            disabled={csvImporting}
          />
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setCsvFile(null); setCsvImportOpen(false) }} disabled={csvImporting} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors disabled:opacity-50">Cancel</button>
            <button onClick={handleCsvImport} disabled={csvImporting || !csvFile} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors disabled:opacity-50">
              {csvImporting ? 'Importing…' : 'Import'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
