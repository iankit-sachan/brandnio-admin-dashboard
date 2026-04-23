import { useMemo, useRef, useState } from 'react'
import {
  Pencil, Trash2, Upload, X, Loader2, Plus, Download,
  FolderInput, Tag as TagIcon, AlertTriangle,
} from 'lucide-react'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Pagination } from '../../components/ui/Pagination'
import { SearchInput } from '../../components/ui/SearchInput'
import { TagInput } from '../../components/ui/TagInput'
import { useToast } from '../../context/ToastContext'
import {
  greetingTemplatesApi, greetingCategoriesApi,
  greetingTemplateBulkApi, languageOptionsApi, festivalsApi,
  uploadApi,
} from '../../services/admin-api'
import { useAdminPaginatedCrud } from '../../hooks/useAdminPaginatedCrud'
import { useAdminCrud } from '../../hooks/useAdminCrud'
import type { GreetingTemplate } from '../../types'

/**
 * 2026-04 Phase 1 — Greeting Templates Power-Admin.
 *
 * Full feature parity with BusinessPosterPage admin:
 *   * Multi-select checkboxes + bulk delete / move / tags
 *   * Bulk upload modal (full field set: category, section, language,
 *     festival, canvas size, tags, title prefix, premium, active)
 *   * CSV export / import (round-trip for external editing)
 *   * Title-similarity duplicate detection (amber ⚠ icon + hover list)
 *   * Standard single-row CRUD preserved
 *
 * All bulk endpoints live on admin_api.views.GreetingTemplateViewSet.
 */

interface FormState {
  thumbnail_url: string | null
  image_url: string | null
  title: string
  description: string
  category: number
  is_premium: boolean
  tags: string
  section_type: 'send' | 'exclusive' | 'browse'
  canvas_width: number
  canvas_height: number
}

const emptyForm: FormState = {
  thumbnail_url: null, image_url: null, title: '', description: '',
  category: 1, is_premium: false, tags: '', section_type: 'browse',
  canvas_width: 1080, canvas_height: 1080,
}

// Admin-uploaded canvas presets. Matches the bulk-upload aspect
// choices on Business Posters so admins working on both tools have
// the same mental model.
const CANVAS_PRESETS = [
  { label: '1:1 Square (1080×1080)', w: 1080, h: 1080 },
  { label: '4:5 Portrait (1080×1350)', w: 1080, h: 1350 },
  { label: '9:16 Story (1080×1920)', w: 1080, h: 1920 },
  { label: '16:9 Landscape (1920×1080)', w: 1920, h: 1080 },
]

interface LanguageOpt { id: number; name: string; key: string; is_active: boolean }
interface FestivalOpt { id: number; name: string; slug: string; date: string }

const inputClass = 'w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50'

export default function GreetingTemplateListPage() {
  const { addToast } = useToast()
  const {
    data, loading, page, totalPages, totalCount, search,
    setPage, setSearch, create, update, remove, refresh,
  } = useAdminPaginatedCrud<GreetingTemplate>(greetingTemplatesApi)
  const { data: categories } = useAdminCrud(greetingCategoriesApi)
  // Language + festival pickers for bulk upload (optional fields).
  const { data: languages } = useAdminCrud<LanguageOpt>(languageOptionsApi)
  // festivalsApi extends crud('festivals') with an extra byMonth helper
  // — the base list() method still works for useAdminCrud.
  const { data: festivals } = useAdminCrud<FestivalOpt>(festivalsApi)

  // ── Single-row CRUD state ──────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<GreetingTemplate | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<GreetingTemplate | null>(null)

  // ── Multi-select + bulk action state ──────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false)
  const [bulkMoveCategory, setBulkMoveCategory] = useState<number>(0)
  const [bulkMoving, setBulkMoving] = useState(false)
  const [bulkTagsOpen, setBulkTagsOpen] = useState(false)
  const [bulkTagsOp, setBulkTagsOp] = useState<'add' | 'remove' | 'replace'>('add')
  const [bulkTagsList, setBulkTagsList] = useState<string[]>([])
  const [bulkTagsSaving, setBulkTagsSaving] = useState(false)

  // ── CSV import state ──
  const [csvImportOpen, setCsvImportOpen] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvImporting, setCsvImporting] = useState(false)

  // ── Bulk upload state (images → templates) ──
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false)
  const [bulkFiles, setBulkFiles] = useState<File[]>([])
  const [bulkCategory, setBulkCategory] = useState<number>(0)
  const [bulkSectionType, setBulkSectionType] = useState<FormState['section_type']>('browse')
  const [bulkPremium, setBulkPremium] = useState(false)
  const [bulkActive, setBulkActive] = useState(true)
  const [bulkLanguage, setBulkLanguage] = useState<number | null>(null)
  const [bulkFestival, setBulkFestival] = useState<number | null>(null)
  const [bulkCanvas, setBulkCanvas] = useState<typeof CANVAS_PRESETS[number]>(CANVAS_PRESETS[0])
  const [bulkTagsForUpload, setBulkTagsForUpload] = useState<string[]>([])
  const [bulkTitlePrefix, setBulkTitlePrefix] = useState('')
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0, failed: 0 })
  const bulkFileRef = useRef<HTMLInputElement>(null)

  // ── Duplicate detection (title similarity) ──
  // Pure client-side heuristic matching the business-categories
  // approach: normalise titles, flag rows sharing a long common
  // prefix / substring with another row. Runs over the current
  // page only (cheap); good enough for the admin to spot obvious
  // accidental dupes.
  const duplicatesById = useMemo(() => {
    const map = new Map<number, string[]>()
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '')
    for (const a of data) {
      const na = norm(a.title)
      const hits: string[] = []
      for (const b of data) {
        if (b.id === a.id) continue
        const nb = norm(b.title)
        if (!nb || !na) continue
        if (nb.length > 4 && (nb.startsWith(na) || na.startsWith(nb) || nb.includes(na) || na.includes(nb))) {
          hits.push(b.title)
        }
      }
      if (hits.length) map.set(a.id, hits)
    }
    return map
  }, [data])

  // ── Selection helpers ──
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }
  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      if (prev.size === data.length && data.length > 0) return new Set()
      return new Set(data.map(d => d.id))
    })
  }
  const clearSelection = () => setSelectedIds(new Set())
  const allSelected = data.length > 0 && selectedIds.size === data.length

  // ── Single-row CRUD handlers (unchanged from pre-Phase-1) ──
  const openAdd = () => { setEditingItem(null); setForm(emptyForm); setModalOpen(true) }
  const openEdit = (item: GreetingTemplate) => {
    setEditingItem(item)
    setForm({
      thumbnail_url: item.thumbnail_url,
      image_url: item.image_url,
      title: item.title,
      description: (item as unknown as { description?: string }).description || '',
      category: item.category,
      is_premium: item.is_premium,
      tags: (item.tags || []).join(', '),
      section_type: item.section_type || 'browse',
      canvas_width: item.canvas_width || 1080,
      canvas_height: item.canvas_height || 1080,
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) { addToast('Title is required', 'error'); return }
    const payload = {
      ...form,
      tags: (form.tags || '').split(',').map(t => t.trim()).filter(Boolean),
    }
    try {
      if (editingItem) {
        await update(editingItem.id, payload)
        addToast('Template updated successfully')
      } else {
        await create(payload)
        addToast('Template created successfully')
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
      addToast('Template deleted successfully')
      setDeleteItem(null)
    } catch {
      addToast('Delete failed. Please try again.', 'error')
    }
  }

  // ── Bulk action handlers ──
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    setBulkDeleting(true)
    try {
      const resp = await greetingTemplateBulkApi.bulkDelete(Array.from(selectedIds)) as { deleted: number }
      addToast(`Deleted ${resp.deleted} template${resp.deleted === 1 ? '' : 's'}`)
      clearSelection()
      setBulkDeleteOpen(false)
      refresh()
    } catch {
      addToast('Bulk delete failed', 'error')
    } finally { setBulkDeleting(false) }
  }

  const handleBulkMove = async () => {
    if (selectedIds.size === 0 || !bulkMoveCategory) return
    setBulkMoving(true)
    try {
      const resp = await greetingTemplateBulkApi.bulkMove(Array.from(selectedIds), bulkMoveCategory) as { moved: number }
      addToast(`Moved ${resp.moved} template${resp.moved === 1 ? '' : 's'}`)
      clearSelection()
      setBulkMoveOpen(false)
      setBulkMoveCategory(0)
      refresh()
    } catch {
      addToast('Bulk move failed', 'error')
    } finally { setBulkMoving(false) }
  }

  const handleBulkTags = async () => {
    if (selectedIds.size === 0) return
    if (bulkTagsOp !== 'remove' && bulkTagsList.length === 0) {
      addToast('Enter at least one tag (or switch op to "remove")', 'error')
      return
    }
    setBulkTagsSaving(true)
    try {
      const resp = await greetingTemplateBulkApi.bulkTags(
        Array.from(selectedIds), bulkTagsOp, bulkTagsList,
      ) as { affected: number; op: string }
      const verb = { add: 'tagged', remove: 'detagged', replace: 'retagged' }[bulkTagsOp]
      addToast(`${verb} ${resp.affected} template${resp.affected === 1 ? '' : 's'}`)
      setBulkTagsList([])
      setBulkTagsOpen(false)
      clearSelection()
      refresh()
    } catch {
      addToast('Bulk tag update failed', 'error')
    } finally { setBulkTagsSaving(false) }
  }

  const handleCsvImport = async () => {
    if (!csvFile) { addToast('Pick a CSV file first', 'error'); return }
    setCsvImporting(true)
    try {
      const resp = await greetingTemplateBulkApi.csvImport(csvFile) as {
        created: unknown[]; updated: unknown[]; skipped: unknown[]
      }
      addToast(`CSV import: ${resp.created.length} created, ${resp.updated.length} updated, ${resp.skipped.length} skipped`)
      setCsvImportOpen(false)
      setCsvFile(null)
      refresh()
    } catch {
      addToast('CSV import failed', 'error')
    } finally { setCsvImporting(false) }
  }

  // ── Bulk upload helpers ──────────────────────────────────────
  const handleBulkFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setBulkFiles(prev => [...prev, ...files])
    if (e.target) e.target.value = ''
  }
  const removeBulkFile = (index: number) => {
    setBulkFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Derive a sensible title from a filename — strips IMG_ / DSC_ /
  // numeric prefixes and the extension. Mirrors the business-poster
  // bulk upload behaviour so admins used to that screen get the same
  // auto-titling here.
  const smartTitle = (filename: string, categoryName: string, index: number) => {
    let title = filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').trim()
    if (/^(IMG|DSC|Screenshot|image|photo|pic)\s*\d*$/i.test(title) || /^\d+$/.test(title) || title.length < 3) {
      title = `${categoryName} Template ${index + 1}`
    }
    return bulkTitlePrefix.trim() ? `${bulkTitlePrefix.trim()} ${title}` : title
  }

  const handleBulkUpload = async () => {
    if (bulkFiles.length === 0) { addToast('No images selected', 'error'); return }
    if (!bulkCategory) { addToast('Pick a category', 'error'); return }

    setBulkUploading(true)
    setBulkProgress({ done: 0, total: bulkFiles.length, failed: 0 })

    const categoryName = (categories as Array<{ id: number; name: string }>)
      .find(c => c.id === bulkCategory)?.name || 'Template'
    let success = 0
    let failed = 0
    const CONCURRENCY = 5

    for (let i = 0; i < bulkFiles.length; i += CONCURRENCY) {
      const batch = bulkFiles.slice(i, i + CONCURRENCY)
      const results = await Promise.allSettled(
        batch.map(async (file, batchIdx) => {
          const { url: imageUrl, thumbnail_url: thumbUrl } = await uploadApi.uploadWithThumbnail(file)
          const title = smartTitle(file.name, categoryName, i + batchIdx)
          // Flat template — template_data left empty, admin adds layers
          // later via Frame Designer on individual rows (D1 approved).
          await create({
            title,
            image_url: imageUrl,
            thumbnail_url: thumbUrl,
            category: bulkCategory,
            section_type: bulkSectionType,
            is_premium: bulkPremium,
            is_active: bulkActive,
            tags: bulkTagsForUpload,
            canvas_width: bulkCanvas.w,
            canvas_height: bulkCanvas.h,
            language: bulkLanguage,
            festival: bulkFestival,
          } as unknown as Partial<GreetingTemplate>)
        }),
      )
      results.forEach((r, idx) => {
        if (r.status === 'fulfilled') success++
        else { failed++; addToast(`Failed: ${batch[idx].name}`, 'error') }
      })
      setBulkProgress({ done: i + batch.length, total: bulkFiles.length, failed })
    }

    setBulkUploading(false)
    addToast(`Uploaded ${success}/${bulkFiles.length} templates${failed > 0 ? ` (${failed} failed)` : ''}`)
    setBulkFiles([])
    setBulkTagsForUpload([])
    setBulkTitlePrefix('')
    setBulkUploadOpen(false)
    refresh()
  }

  // ── Columns ────────────────────────────────────────────────────
  const columns: Column<GreetingTemplate>[] = [
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
    {
      key: 'thumbnail_url' as 'title',
      title: 'Preview',
      render: (t) => (
        t.thumbnail_url
          ? <img src={t.thumbnail_url} alt="" className="w-10 h-10 rounded object-cover bg-brand-dark" />
          : <span className="text-xs text-brand-text-muted">–</span>
      ),
      className: 'w-16',
    },
    {
      key: 'title',
      title: 'Title',
      sortable: true,
      render: (t) => {
        const dupMatches = duplicatesById.get(t.id)
        return (
          <div className="flex items-center gap-2">
            <span>{t.title}</span>
            {dupMatches && dupMatches.length > 0 && (
              <span
                className="text-amber-400"
                title={`Similar titles: ${dupMatches.join(', ')}`}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
        )
      },
    },
    { key: 'category_name', title: 'Category', sortable: true },
    { key: 'section_type', title: 'Section', render: (t) => (
      <span className="capitalize text-brand-text-muted">{t.section_type || 'browse'}</span>
    ) },
    { key: 'is_premium', title: 'Premium', render: (t) => (
      t.is_premium ? <span className="text-brand-gold">Premium</span> : <span className="text-brand-text-muted">Free</span>
    ) },
    { key: 'download_count', title: 'Downloads', sortable: true },
    { key: 'tags', title: 'Tags', render: (t) => (
      <span className="text-brand-text-muted text-xs">{(t.tags || []).join(', ') || '–'}</span>
    ) },
    { key: 'created_at', title: 'Created' },
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
          <h1 className="text-2xl font-bold text-brand-text">Greeting Templates</h1>
          <p className="text-xs text-brand-text-muted mt-1">
            {totalCount} template{totalCount === 1 ? '' : 's'}
            {duplicatesById.size > 0 && (
              <> · <span className="text-amber-400">{duplicatesById.size} possible duplicate{duplicatesById.size === 1 ? '' : 's'}</span> on this page</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <SearchInput value={search} onChange={setSearch} placeholder="Search templates..." className="w-56" />
          <button
            onClick={() => setBulkUploadOpen(true)}
            className="px-3 py-2 text-xs font-medium rounded-lg bg-brand-indigo text-white hover:bg-brand-indigo/80 transition-colors flex items-center gap-1.5"
            title="Bulk upload multiple images as templates"
          >
            <Upload className="h-3.5 w-3.5" /> Bulk Upload
          </button>
          <a
            href={greetingTemplateBulkApi.csvExportUrl()}
            className="px-3 py-2 text-xs font-medium rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors flex items-center gap-1.5"
            title="Download all templates as CSV"
          >
            <Download className="h-3.5 w-3.5" /> CSV Export
          </a>
          <button
            onClick={() => setCsvImportOpen(true)}
            className="px-3 py-2 text-xs font-medium rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors flex items-center gap-1.5"
            title="Import / update from CSV"
          >
            <Upload className="h-3.5 w-3.5" /> CSV Import
          </button>
          <button onClick={openAdd} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">+ Add Template</button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-brand-gold/10 border border-brand-gold/30 rounded-lg flex-wrap">
          <span className="text-sm text-brand-text font-medium">{selectedIds.size} selected</span>
          <button
            onClick={toggleSelectAll}
            className="text-xs text-brand-text-muted hover:text-brand-text underline"
          >
            {allSelected ? 'Deselect all on page' : `Select all ${data.length} on page`}
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setBulkMoveOpen(true)}
            className="px-3 py-1.5 bg-brand-dark-hover hover:bg-brand-dark-border text-brand-text text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <FolderInput className="h-3.5 w-3.5" /> Move to category
          </button>
          <button
            onClick={() => { setBulkTagsOp('add'); setBulkTagsList([]); setBulkTagsOpen(true) }}
            className="px-3 py-1.5 bg-brand-indigo/80 hover:bg-brand-indigo text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <TagIcon className="h-3.5 w-3.5" /> Tags
          </button>
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
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading
          ? <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div>
          : <DataTable columns={columns} data={data} />
        }
        <Pagination currentPage={page} totalPages={totalPages} totalCount={totalCount} onPageChange={setPage} />
      </div>

      {/* ─── Add / Edit single-template modal ─── */}
      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} title={editingItem ? 'Edit Template' : 'Add Template'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <ImageUpload label="Thumbnail" value={form.thumbnail_url} onChange={v => setForm(f => ({ ...f, thumbnail_url: v }))} aspectHint="300x300" />
            <ImageUpload label="Full Image" value={form.image_url} onChange={v => setForm(f => ({ ...f, image_url: v }))} aspectHint="1080x1080" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Description</label>
            <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description for exclusive cards" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: Number(e.target.value) }))} className={inputClass}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Section Type</label>
              <select value={form.section_type} onChange={e => setForm(f => ({ ...f, section_type: e.target.value as FormState['section_type'] }))} className={inputClass}>
                <option value="send">Send</option>
                <option value="exclusive">Exclusive</option>
                <option value="browse">Browse</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Tags (comma-separated)</label>
            <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="e.g. birthday, celebration, party" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Canvas Width</label>
              <input type="number" value={form.canvas_width} onChange={e => setForm(f => ({ ...f, canvas_width: Number(e.target.value) }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Canvas Height</label>
              <input type="number" value={form.canvas_height} onChange={e => setForm(f => ({ ...f, canvas_height: Number(e.target.value) }))} className={inputClass} />
            </div>
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

      {/* ─── Single-row delete confirm ─── */}
      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Template" message={`Are you sure you want to delete "${deleteItem?.title}"? This action cannot be undone.`} confirmText="Delete" variant="danger" />

      {/* ─── Bulk delete confirm ─── */}
      <ConfirmDialog
        isOpen={bulkDeleteOpen}
        onClose={() => !bulkDeleting && setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        title={`Delete ${selectedIds.size} template${selectedIds.size === 1 ? '' : 's'}?`}
        message="This permanently deletes the selected templates and cannot be undone."
        confirmText={bulkDeleting ? 'Deleting…' : 'Delete all'}
        variant="danger"
      />

      {/* ─── Bulk move modal ─── */}
      <Modal
        isOpen={bulkMoveOpen}
        onClose={() => !bulkMoving && setBulkMoveOpen(false)}
        title={`Move ${selectedIds.size} template${selectedIds.size === 1 ? '' : 's'}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-brand-text-muted">
            Pick the category to move the selected templates into. They keep
            everything else (tags, section, premium flag) unchanged.
          </p>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Target category</label>
            <select value={bulkMoveCategory} onChange={e => setBulkMoveCategory(Number(e.target.value))} className={inputClass}>
              <option value={0}>— Select category —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setBulkMoveOpen(false)} disabled={bulkMoving} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors disabled:opacity-50">Cancel</button>
            <button onClick={handleBulkMove} disabled={bulkMoving || !bulkMoveCategory} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors disabled:opacity-50">
              {bulkMoving ? 'Moving…' : 'Move'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Bulk tags modal ─── */}
      <Modal
        isOpen={bulkTagsOpen}
        onClose={() => !bulkTagsSaving && setBulkTagsOpen(false)}
        title={`Tag ${selectedIds.size} template${selectedIds.size === 1 ? '' : 's'}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Operation</label>
            <div className="flex gap-2 flex-wrap">
              {(['add', 'remove', 'replace'] as const).map(op => (
                <button
                  key={op}
                  onClick={() => setBulkTagsOp(op)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    bulkTagsOp === op
                      ? 'bg-brand-gold text-gray-900 font-medium'
                      : 'bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border'
                  }`}
                >
                  {op === 'add' ? 'Add tags' : op === 'remove' ? 'Remove tags' : 'Replace all tags'}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-brand-text-muted mt-1.5">
              {bulkTagsOp === 'add' && "Merges these tags into each template's existing list (dedup preserved)."}
              {bulkTagsOp === 'remove' && 'Strips any matching tags from each selected template.'}
              {bulkTagsOp === 'replace' && "Overwrites every selected template's tag list with exactly these."}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Tags</label>
            <TagInput value={bulkTagsList} onChange={setBulkTagsList} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setBulkTagsOpen(false)} disabled={bulkTagsSaving} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors disabled:opacity-50">Cancel</button>
            <button
              onClick={handleBulkTags}
              disabled={bulkTagsSaving || (bulkTagsOp !== 'remove' && bulkTagsList.length === 0)}
              className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors disabled:opacity-50"
            >
              {bulkTagsSaving ? 'Applying…' : `Apply to ${selectedIds.size}`}
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Bulk upload modal (images → templates) ─── */}
      <Modal
        isOpen={bulkUploadOpen}
        onClose={() => { if (!bulkUploading) { setBulkUploadOpen(false); setBulkFiles([]) } }}
        title="Bulk Upload Greeting Templates"
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
            <p className="text-xs text-brand-text-muted mt-1">Uploads 5 files in parallel for speed. Auto-generates thumbnails.</p>
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
                  <button onClick={() => removeBulkFile(i)} className="p-0.5 text-brand-text-muted hover:text-status-error" title="Remove">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Category + section */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Category <span className="text-status-error">*</span></label>
              <select value={bulkCategory} onChange={e => setBulkCategory(Number(e.target.value))} className={inputClass}>
                <option value={0}>— Select —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Section Type</label>
              <select value={bulkSectionType} onChange={e => setBulkSectionType(e.target.value as FormState['section_type'])} className={inputClass}>
                <option value="browse">Browse</option>
                <option value="send">Send</option>
                <option value="exclusive">Exclusive</option>
              </select>
            </div>
          </div>

          {/* Canvas + language + festival */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Canvas Size</label>
              <select
                value={bulkCanvas.label}
                onChange={e => {
                  const preset = CANVAS_PRESETS.find(p => p.label === e.target.value)
                  if (preset) setBulkCanvas(preset)
                }}
                className={inputClass}
              >
                {CANVAS_PRESETS.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Language (optional)</label>
              <select
                value={bulkLanguage ?? ''}
                onChange={e => setBulkLanguage(e.target.value ? Number(e.target.value) : null)}
                className={inputClass}
              >
                <option value="">— Language-agnostic —</option>
                {(languages as LanguageOpt[]).filter(l => l.is_active).map(l => (
                  <option key={l.id} value={l.id}>{l.name} ({l.key})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Festival + title prefix */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Festival crossover (optional)</label>
              <select
                value={bulkFestival ?? ''}
                onChange={e => setBulkFestival(e.target.value ? Number(e.target.value) : null)}
                className={inputClass}
              >
                <option value="">— No festival —</option>
                {(festivals as FestivalOpt[]).slice(0, 200).map(f => (
                  <option key={f.id} value={f.id}>{f.name}{f.date ? ` (${f.date})` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Title Prefix (optional)</label>
              <input
                value={bulkTitlePrefix}
                onChange={e => setBulkTitlePrefix(e.target.value)}
                placeholder="e.g. Diwali —"
                className={inputClass}
              />
            </div>
          </div>

          {/* Tags + premium + active */}
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Tags (applied to all)</label>
            <TagInput value={bulkTagsForUpload} onChange={setBulkTagsForUpload} />
          </div>

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

          {/* Progress */}
          {bulkUploading && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Loader2 className="h-4 w-4 animate-spin text-brand-gold" />
                <span className="text-sm text-brand-text">Uploading {bulkProgress.done}/{bulkProgress.total}...</span>
                {bulkProgress.failed > 0 && <span className="text-xs text-status-error">({bulkProgress.failed} failed)</span>}
              </div>
              <div className="w-full bg-brand-dark rounded-full h-2">
                <div className="bg-brand-gold h-2 rounded-full transition-all" style={{ width: `${(bulkProgress.done / Math.max(1, bulkProgress.total)) * 100}%` }} />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setBulkUploadOpen(false); setBulkFiles([]) }} disabled={bulkUploading} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors disabled:opacity-50">Cancel</button>
            <button
              onClick={handleBulkUpload}
              disabled={bulkUploading || bulkFiles.length === 0 || !bulkCategory}
              className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {bulkUploading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
                : <><Plus className="h-4 w-4" /> Upload {bulkFiles.length} template{bulkFiles.length === 1 ? '' : 's'}</>
              }
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── CSV import modal ─── */}
      <Modal
        isOpen={csvImportOpen}
        onClose={() => !csvImporting && setCsvImportOpen(false)}
        title="Import templates from CSV"
      >
        <div className="space-y-4">
          <p className="text-sm text-brand-text-muted">
            Upload a CSV with the columns produced by <span className="text-brand-gold">CSV Export</span>:
            <code className="text-brand-text bg-brand-dark px-1.5 py-0.5 rounded ml-1">id, title, category_slug, section_type, is_premium, tags, image_url, thumbnail_url, canvas_width, canvas_height, language_code, festival_slug, featured_date</code>.
          </p>
          <p className="text-[11px] text-brand-text-muted">
            Rows with an <code className="bg-brand-dark px-1 rounded">id</code> update existing templates; rows without it create new ones.
            Tags are <code className="bg-brand-dark px-1 rounded">|</code>-separated so they survive commas inside tag names.
            Image URLs must already exist on S3 — upload images first via <span className="text-brand-gold">Bulk Upload</span> or the single Add form.
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
