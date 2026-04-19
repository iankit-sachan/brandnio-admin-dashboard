import { useEffect, useRef, useState } from 'react'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Pagination } from '../../components/ui/Pagination'
import { SearchInput } from '../../components/ui/SearchInput'
import { useToast } from '../../context/ToastContext'
import { Pencil, Trash2, Upload, Check } from 'lucide-react'
import { festivalsApi, festivalCalendarApi, languagesApi } from '../../services/admin-api'
import { useAdminPaginatedCrud } from '../../hooks/useAdminPaginatedCrud'
import { formatDate } from '../../utils/formatters'
import QuickStats from '../../components/ui/QuickStats'
import type { Festival } from '../../types'
import type { Language, PosterMediaType } from '../../types/festival.types'
import BulkFestivalPosterUploadModal from './BulkFestivalPosterUploadModal'
import { detectImageRatio, groupFilesByRatio, groupFilesByRatioAndLanguage, formatBytes, type DetectedRatio } from './uploadHelpers'

interface FormState {
  banner_url: string | null
  icon_url: string | null
  name: string
  slug: string
  description: string
  date: string
  is_active: boolean
}

const emptyForm: FormState = { banner_url: null, icon_url: null, name: '', slug: '', description: '', date: '', is_active: true }

const IMG_MAX = 20 * 1024 * 1024
const VID_MAX = 100 * 1024 * 1024

// Wizard step 2 file-staging shape — same as modal: file + detected ratio +
// preview blob URL + per-file language override. `ratio` is null while
// detection is running. `languageId` defaults to top-of-form languageId.
interface StagedFile {
  file: File
  ratio: DetectedRatio | null
  previewUrl: string | null
  detecting: boolean
  languageId: number | null
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function FestivalListPage() {
  const { addToast } = useToast()
  const { data, loading, page, totalPages, totalCount, search, setPage, setSearch, create, update, remove, refresh } = useAdminPaginatedCrud<Festival>(festivalsApi)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Festival | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<Festival | null>(null)

  // Inline upload modal opened from per-row [Upload] button (festival already exists).
  const [uploadFestival, setUploadFestival] = useState<Festival | null>(null)

  // ─── 2-Step Wizard state (only used when ADDING; Edit stays single-step) ───
  const [step, setStep] = useState<1 | 2>(1)
  const [languages, setLanguages] = useState<Language[]>([])
  const [languageId, setLanguageId] = useState<number | null>(null)
  const [mediaType, setMediaType] = useState<PosterMediaType>('image')
  // Videos can't be ratio-detected client-side cheaply — admin picks one.
  const [videoFallbackRatio, setVideoFallbackRatio] = useState<DetectedRatio>('1:1')
  // Replaces plain File[] — each entry carries its detected ratio + preview URL.
  const [staged, setStaged] = useState<StagedFile[]>([])
  const [dragging, setDragging] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  // Progress for the bulk upload phase of the wizard (Step 2 → Save).
  const [progress, setProgress] = useState<{ loaded: number; total: number; percent: number } | null>(null)
  // Last error during wizard submit — kept so admin can retry without losing state.
  const [error, setError] = useState<string | null>(null)
  // Per-file upload result from the last attempt — drives the partial-success
  // UI showing which files succeeded vs failed (and which were skipped as dups).
  const [lastResult, setLastResult] = useState<{
    created_count: number
    failed_count: number
    failed: Array<{ filename: string; reason: string }>
    skipped_count?: number
    skipped?: Array<{ filename: string; reason: string }>
    batch_count?: number
  } | null>(null)
  // Pending media-type switch — triggers confirm dialog when files are selected.
  const [pendingMediaType, setPendingMediaType] = useState<PosterMediaType | null>(null)
  // Abort controller — populated only while uploading; calling .abort() cancels.
  const abortRef = useRef<AbortController | null>(null)
  // True when the festival was created in this attempt — on retry we skip
  // re-creating the festival and only re-run the bulk upload.
  const createdFestivalIdRef = useRef<number | null>(null)

  // Load languages once on mount (used in step 2 of wizard).
  useEffect(() => {
    languagesApi.list({ is_active: 'true' }).then((rows) => {
      const list = rows as Language[]
      setLanguages(list)
      if (list.length && languageId == null) setLanguageId(list[0].id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resetWizard = () => {
    // Revoke any preview URLs to avoid memory leaks before clearing.
    staged.forEach(s => { if (s.previewUrl) URL.revokeObjectURL(s.previewUrl) })
    setForm(emptyForm)
    setEditingItem(null)
    setStep(1)
    setStaged([])
    setMediaType('image')
    setVideoFallbackRatio('1:1')
    setSubmitting(false)
    setProgress(null)
    setError(null)
    setLastResult(null)
    setPendingMediaType(null)
    abortRef.current = null
    createdFestivalIdRef.current = null
  }

  const closeModal = () => { resetWizard(); setModalOpen(false) }

  const openAdd = () => {
    resetWizard()
    setModalOpen(true)
  }

  const openEdit = (item: Festival) => {
    resetWizard()
    setEditingItem(item)
    setForm({ banner_url: item.banner_url, icon_url: item.icon_url, name: item.name, slug: item.slug, description: item.description, date: item.date, is_active: item.is_active })
    setModalOpen(true)
  }

  const openDelete = (item: Festival) => setDeleteItem(item)

  // ─── Wizard validation per step ───
  const step1Valid = form.name.trim().length > 0 && form.date.length > 0
  const maxBytes = mediaType === 'video' ? VID_MAX : IMG_MAX
  const oversized = staged.filter(s => s.file.size > maxBytes)
  const wrongType = staged.filter(s => {
    if (mediaType === 'image') return !s.file.type.startsWith('image/')
    return !s.file.type.startsWith('video/')
  })
  const stillDetecting = staged.filter(s => s.detecting)
  const filesValid = oversized.length === 0 && wrongType.length === 0 && stillDetecting.length === 0

  const goNext = () => {
    if (!step1Valid) {
      addToast(form.name.trim() ? 'Date is required' : 'Name is required', 'error')
      return
    }
    setStep(2)
  }

  // File picker — stages immediately, then resolves each image's ratio in parallel.
  const pickFiles = (list: FileList | null) => {
    if (!list) return
    setError(null)
    setLastResult(null)
    const newOnes: StagedFile[] = Array.from(list).map(file => ({
      file,
      ratio: null,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      detecting: file.type.startsWith('image/'),
      languageId,  // inherit current top-of-form language as default
    }))
    setStaged(prev => [...prev, ...newOnes])
    newOnes.forEach((s) => {
      detectImageRatio(s.file).then(r => {
        setStaged(prev => prev.map(item =>
          item.file === s.file ? { ...item, ratio: r, detecting: false } : item
        ))
      })
    })
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    pickFiles(e.dataTransfer.files)
  }
  const removeStaged = (i: number) => {
    setStaged(prev => {
      const target = prev[i]
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((_, idx) => idx !== i)
    })
  }

  // Smart media-type toggle — if files exist, ask before clearing them.
  const requestMediaTypeChange = (newType: PosterMediaType) => {
    if (newType === mediaType) return
    if (staged.length === 0) { setMediaType(newType); return }
    setPendingMediaType(newType)
  }
  const confirmMediaTypeChange = () => {
    if (pendingMediaType) {
      staged.forEach(s => { if (s.previewUrl) URL.revokeObjectURL(s.previewUrl) })
      setMediaType(pendingMediaType)
      setStaged([])
      setPendingMediaType(null)
    }
  }
  const cancelMediaTypeChange = () => setPendingMediaType(null)

  const cancelWizardUpload = () => {
    abortRef.current?.abort()
    abortRef.current = null
    setSubmitting(false)
    setProgress(null)
    addToast('Upload cancelled', 'success')
  }

  // ─── Edit mode submit (unchanged from before) ───
  const handleEditSubmit = async () => {
    if (!editingItem) return
    if (!form.name.trim()) { addToast('Name is required', 'error'); return }
    setSubmitting(true)
    try {
      await update(editingItem.id, form)
      addToast('Festival updated successfully')
      closeModal()
    } catch {
      addToast('Update failed. Please try again.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Wizard submit: create festival, then optionally bulk-upload posters ───
  // On retry: if festival was created in a previous attempt, skip recreation
  // and only re-run the bulk upload (avoids duplicate festivals). On partial
  // upload success, the staged list is trimmed to only the failed files so
  // retry sends just those.
  const handleWizardSubmit = async () => {
    if (!step1Valid) { setStep(1); addToast('Festival name + date required', 'error'); return }
    if (!filesValid) { addToast('Fix file errors before saving', 'error'); return }

    setSubmitting(true)
    setError(null)
    setLastResult(null)
    try {
      // 1) Create the festival (once — skip on retry).
      let newFestivalId = createdFestivalIdRef.current
      if (newFestivalId == null) {
        const created = await create(form) as Festival | undefined
        newFestivalId = created?.id ?? null
        createdFestivalIdRef.current = newFestivalId
      }

      if (!newFestivalId) {
        addToast('Festival created (posters skipped — could not resolve new festival id)', 'success')
        closeModal()
        return
      }

      // 2) Bulk-upload with auto-grouped batches (per ratio for images;
      //    single batch for videos using videoFallbackRatio).
      if (staged.length > 0) {
        setProgress({ loaded: 0, total: staged.reduce((s, x) => s + x.file.size, 0), percent: 0 })
        abortRef.current = new AbortController()

        const batches = mediaType === 'video'
          ? (() => {
              // Bucket videos by language only (single ratio per video batch).
              const langBuckets = new Map<string, { language: number | null; files: File[] }>()
              for (const s of staged) {
                const k = s.languageId === null ? 'u' : String(s.languageId)
                if (!langBuckets.has(k)) langBuckets.set(k, { language: s.languageId, files: [] })
                langBuckets.get(k)!.files.push(s.file)
              }
              return Array.from(langBuckets.values()).map(b => ({
                aspect_ratio: videoFallbackRatio,
                language: b.language,
                files: b.files,
              }))
            })()
          : groupFilesByRatioAndLanguage(staged, '1:1')

        const res = await festivalCalendarApi.bulkUploadBatches(
          batches,
          { festival: newFestivalId, language: languageId, media_type: mediaType },
          {
            signal: abortRef.current.signal,
            onProgress: (loaded, total, percent) => setProgress({ loaded, total, percent }),
          },
        )

        setLastResult(res)
        const skippedCount = res.skipped_count ?? 0
        if (res.failed_count === 0) {
          const parts: string[] = [`Festival created + ${res.created_count} poster${res.created_count === 1 ? '' : 's'} uploaded`]
          if (skippedCount > 0) parts.push(`${skippedCount} duplicate${skippedCount === 1 ? '' : 's'} skipped`)
          if (batches.length > 1) parts.push(`${batches.length} batches`)
          addToast(parts.join(' · '))
          closeModal()
          refresh()
        } else {
          // Partial — keep modal open with only failed files staged for retry.
          const failedNames = new Set(res.failed.map(f => f.filename))
          staged.filter(s => !failedNames.has(s.file.name))
            .forEach(s => { if (s.previewUrl) URL.revokeObjectURL(s.previewUrl) })
          setStaged(prev => prev.filter(s => failedNames.has(s.file.name)))
          addToast(
            `${res.created_count} uploaded · ${res.failed_count} failed` +
            (skippedCount > 0 ? ` · ${skippedCount} skipped` : ''),
            'error',
          )
          refresh()
        }
      } else {
        addToast('Festival created successfully')
        closeModal()
        refresh()
      }
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { detail?: string } }; message?: string; code?: string }
      // Cancellation isn't a real error — user-initiated.
      if (err.code === 'ERR_CANCELED' || err.message === 'canceled') {
        return
      }
      const status = err.response?.status
      let msg = 'Operation failed'
      if (status === 413) msg = 'File(s) too large for server.'
      else if (err.response?.data?.detail) msg = `Operation failed: ${err.response.data.detail}`
      else if (err.message) msg = `Operation failed: ${err.message}`
      setError(msg)
      // Note: festival may have been created. Retry will skip festival creation
      // (createdFestivalIdRef preserved) and only retry the bulk upload.
    } finally {
      setSubmitting(false)
      setProgress(null)
      abortRef.current = null
    }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    try {
      await remove(deleteItem.id)
      addToast('Festival deleted successfully')
      setDeleteItem(null)
    } catch {
      addToast('Delete failed. Please try again.', 'error')
    }
  }

  const columns: Column<Festival>[] = [
    { key: 'name', title: 'Festival', sortable: true },
    { key: 'date', title: 'Date', sortable: true, render: (f) => formatDate(f.date as string) },
    { key: 'is_active', title: 'Status', render: (f) => f.is_active ? <span className="text-status-success">Active</span> : <span className="text-status-error">Inactive</span> },
    { key: 'date' as keyof Festival, title: 'Upcoming', render: (f) => new Date(f.date) > new Date() ? <span className="text-brand-gold">Yes</span> : <span className="text-brand-text-muted">No</span> },
    { key: 'actions', title: 'Actions', render: (item) => (
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); setUploadFestival(item) }}
          title="Upload posters to this festival"
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold text-xs font-medium transition-colors"
        >
          <Upload className="h-3.5 w-3.5" />
          Upload
        </button>
        <button onClick={(e) => { e.stopPropagation(); openEdit(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-gold transition-colors"><Pencil className="h-4 w-4" /></button>
        <button onClick={(e) => { e.stopPropagation(); openDelete(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-status-error transition-colors"><Trash2 className="h-4 w-4" /></button>
      </div>
    )},
  ]

  const isAdding = !editingItem
  const modalTitle = editingItem
    ? 'Edit Festival'
    : (step === 1 ? 'Add Festival — Step 1 of 2: Details' : 'Add Festival — Step 2 of 2: Upload Posters')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-text">Festivals</h1>
        <div className="flex items-center gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search festivals..." className="w-64" />
          <button onClick={openAdd} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">+ Add Festival</button>
        </div>
      </div>
      <QuickStats stats={[{ label: 'Total', count: totalCount }]} />
      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading ? <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div> : <DataTable columns={columns} data={data} />}
        <Pagination currentPage={page} totalPages={totalPages} totalCount={totalCount} onPageChange={setPage} />
      </div>

      <Modal isOpen={modalOpen} onClose={closeModal} title={modalTitle} size={isAdding ? 'lg' : 'md'}>
        {/* Stepper indicator (only shown when adding; edit mode skips wizard) */}
        {isAdding && (
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-brand-dark-border/50">
            <StepDot index={1} label="Festival Details" current={step} />
            <div className="flex-1 h-px bg-brand-dark-border" />
            <StepDot index={2} label="Upload Posters (optional)" current={step} />
          </div>
        )}

        {/* ─── EDIT mode OR Wizard Step 1: Festival details form ─── */}
        {(!isAdding || step === 1) && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <ImageUpload label="Banner Image" value={form.banner_url} onChange={v => setForm(f => ({ ...f, banner_url: v }))} aspectHint="Wide banner, 1200x400" />
              <ImageUpload label="Icon" value={form.icon_url} onChange={v => setForm(f => ({ ...f, icon_url: v }))} aspectHint="Square, 128x128" />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Name <span className="text-status-error">*</span></label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: toSlug(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Slug</label>
              <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Description</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Date <span className="text-status-error">*</span></label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
              <label className="text-sm text-brand-text-muted">Active</label>
            </div>

            {/* Footer buttons differ between Edit (single-step) and Add Step 1 */}
            <div className="flex justify-end gap-3 pt-2 border-t border-brand-dark-border/50 mt-4">
              <button onClick={closeModal} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">Cancel</button>
              {!isAdding ? (
                <button onClick={handleEditSubmit} disabled={submitting} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors disabled:opacity-50">{submitting ? 'Saving…' : 'Save'}</button>
              ) : (
                <button onClick={goNext} disabled={!step1Valid} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors disabled:opacity-50">Next →</button>
              )}
            </div>
          </div>
        )}

        {/* ─── Wizard Step 2: Bulk poster upload (optional) ─── */}
        {isAdding && step === 2 && (
          <div className="space-y-4">
            {/* Read-only festival summary (created on Save) */}
            <div className="px-3 py-2 rounded-lg bg-brand-dark-hover border border-brand-dark-border text-sm text-brand-text">
              <span className="text-brand-text-muted">Festival:</span> <span className="font-semibold">{form.name || '(unnamed)'}</span>
              <span className="text-brand-text-muted ml-3">Date:</span> <span>{form.date || '(no date)'}</span>
            </div>

            {/* Language picker — top-of-form default; per-file overrides allowed in tile dropdowns */}
            <div>
              <div className="text-xs text-brand-text-muted mb-1.5">Default Language (applies to new files; per-file overrides allowed below)</div>
              <div className="flex gap-2 flex-wrap">
                {languages.map(l => (
                  <label key={l.id} className={
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-sm transition-colors ' +
                    (languageId === l.id
                      ? 'bg-brand-gold/20 border-brand-gold text-brand-gold'
                      : 'bg-brand-dark border-brand-dark-border text-brand-text-muted hover:border-brand-text-muted')
                  }>
                    <input type="radio" name="lang" checked={languageId === l.id} onChange={() => setLanguageId(l.id)} className="sr-only" />
                    <span>{l.name}</span>
                  </label>
                ))}
                <label className={
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-sm transition-colors ' +
                  (languageId === null
                    ? 'bg-brand-text-muted/20 border-brand-text-muted text-brand-text'
                    : 'bg-brand-dark border-brand-dark-border text-brand-text-muted hover:border-brand-text-muted')
                } title="No language — visible to all users">
                  <input type="radio" name="lang" checked={languageId === null} onChange={() => setLanguageId(null)} className="sr-only" />
                  <span>Universal</span>
                </label>
              </div>
            </div>

            {/* Media type */}
            <div>
              <div className="text-xs text-brand-text-muted mb-1.5">Media Type</div>
              <div className="flex gap-2">
                {(['image', 'video'] as PosterMediaType[]).map(m => (
                  <label key={m} className={
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-sm transition-colors capitalize ' +
                    (mediaType === m
                      ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                      : 'bg-brand-dark border-brand-dark-border text-brand-text-muted hover:border-brand-text-muted') +
                    (submitting ? ' opacity-60 pointer-events-none' : '')
                  }>
                    <input type="radio" name="media" checked={mediaType === m} disabled={submitting}
                      onChange={() => requestMediaTypeChange(m)} className="sr-only" />
                    <span>{m}</span>
                  </label>
                ))}
              </div>
              {mediaType === 'image' && (
                <div className="mt-1.5 text-xs text-brand-text-muted/70">
                  ✨ Aspect ratio auto-detected from each image — mixed ratios upload in separate batches automatically.
                </div>
              )}
            </div>

            {/* Video-only ratio fallback */}
            {mediaType === 'video' && (
              <div>
                <div className="text-xs text-brand-text-muted mb-1.5">Video Ratio (applies to all videos in this batch)</div>
                <div className="flex gap-2 flex-wrap">
                  {(['1:1', '4:5', '9:16', '16:9'] as DetectedRatio[]).map(r => (
                    <label key={r} className={
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-sm transition-colors ' +
                      (videoFallbackRatio === r
                        ? 'bg-brand-gold/20 border-brand-gold text-brand-gold'
                        : 'bg-brand-dark border-brand-dark-border text-brand-text-muted hover:border-brand-text-muted')
                    }>
                      <input type="radio" name="vratio" checked={videoFallbackRatio === r} onChange={() => setVideoFallbackRatio(r)} className="sr-only" />
                      <span>{r === '9:16' ? 'Story (9:16)' : r}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* File drop zone */}
            <div
              onDragOver={e => { if (!submitting) { e.preventDefault(); setDragging(true) } }}
              onDragLeave={() => setDragging(false)}
              onDrop={submitting ? undefined : handleDrop}
              className={
                'border-2 border-dashed rounded-lg p-6 text-center transition-colors ' +
                (submitting ? 'bg-brand-dark border-brand-dark-border opacity-60' :
                 dragging ? 'bg-indigo-500/10 border-indigo-500' : 'bg-brand-dark border-brand-dark-border hover:border-brand-text-muted')
              }
            >
              <div className="text-3xl mb-2">📤</div>
              <div className="text-sm text-brand-text-muted mb-2">Drag &amp; Drop or</div>
              <label className={'inline-block px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-500 ' + (submitting ? 'pointer-events-none opacity-60' : 'cursor-pointer')}>
                Browse
                <input type="file" multiple className="hidden" disabled={submitting} accept={mediaType === 'image' ? 'image/*' : 'video/mp4,video/*'} onChange={e => pickFiles(e.target.files)} />
              </label>
              <div className="text-xs text-brand-text-muted/70 mt-3">
                {mediaType === 'image' ? 'PNG/JPEG · Max 20 MB each' : 'MP4 · Max 100 MB each'}
              </div>
              <div className="text-xs text-brand-text-muted/60 mt-1">
                You can also skip this step — festival will be created without posters.
              </div>
            </div>

            {/* Ratio summary chips (shown when image batches will auto-split) */}
            {mediaType === 'image' && staged.length > 0 && (() => {
              const counts = new Map<DetectedRatio, number>()
              staged.forEach(s => { if (s.ratio) counts.set(s.ratio, (counts.get(s.ratio) ?? 0) + 1) })
              const summary = Array.from(counts.entries())
              if (summary.length === 0) return null
              return (
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-brand-text-muted">Auto-detected:</span>
                  {summary.map(([r, n]) => (
                    <span key={r} className="px-2 py-0.5 rounded bg-brand-gold/15 text-brand-gold border border-brand-gold/30">
                      {n} × {r === '9:16' ? 'Story' : r}
                    </span>
                  ))}
                  {summary.length > 1 && (
                    <span className="text-brand-text-muted/70">→ will upload as {summary.length} batches</span>
                  )}
                </div>
              )
            })()}

            {/* Selected files — image grid with thumbnails OR video list */}
            {staged.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-brand-text-muted">
                  Selected files ({staged.length}) · {formatBytes(staged.reduce((s, x) => s + x.file.size, 0))}
                </div>
                {mediaType === 'image' ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-72 overflow-y-auto p-1">
                    {staged.map((s, i) => {
                      const bad = s.file.size > maxBytes || !s.file.type.startsWith('image/')
                      return (
                        <div key={i} className={
                          'relative rounded-lg overflow-hidden border ' +
                          (bad ? 'border-status-error' : 'border-brand-dark-border')
                        }>
                          {s.previewUrl ? (
                            <img src={s.previewUrl} alt={s.file.name} className="w-full aspect-square object-cover bg-black/20" />
                          ) : (
                            <div className="w-full aspect-square bg-brand-dark-hover flex items-center justify-center text-brand-text-muted text-xs">no preview</div>
                          )}
                          <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-bold text-brand-gold">
                            {s.detecting ? '…' : (s.ratio ?? '?')}
                          </div>
                          <button onClick={() => removeStaged(i)} disabled={submitting}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-status-error hover:opacity-70 text-xs disabled:opacity-30 disabled:cursor-not-allowed">✕</button>
                          {/* Per-file language dropdown — overlays the bottom of the tile (Phase B Q4) */}
                          <select
                            value={s.languageId ?? ''}
                            disabled={submitting}
                            onChange={(e) => {
                              const v = e.target.value === '' ? null : Number(e.target.value)
                              setStaged(prev => prev.map((it, idx) => idx === i ? { ...it, languageId: v } : it))
                            }}
                            className="absolute bottom-0 left-0 right-0 bg-black/80 text-[10px] text-brand-text-muted border-0 px-1.5 py-0.5 focus:outline-none cursor-pointer"
                          >
                            <option value="">Universal</option>
                            {languages.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                          </select>
                          {bad && (
                            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-1 py-0.5 bg-status-error/80 text-white text-[9px] text-center">
                              {s.file.size > maxBytes ? 'too large' : 'wrong type'}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <ul className="space-y-1 max-h-40 overflow-y-auto">
                    {staged.map((s, i) => {
                      const bad = s.file.size > maxBytes || !s.file.type.startsWith('video/')
                      return (
                        <li key={i} className={
                          'flex items-center justify-between text-xs px-3 py-1.5 rounded-lg border ' +
                          (bad ? 'bg-status-error/10 border-status-error/40 text-status-error' : 'bg-brand-dark border-brand-dark-border text-brand-text-muted')
                        }>
                          <span className="truncate flex-1">🎬 {s.file.name}</span>
                          <span className="mx-3 text-brand-text-muted/70">{formatBytes(s.file.size)}</span>
                          <button onClick={() => removeStaged(i)} disabled={submitting}
                            className="text-status-error hover:opacity-70 disabled:opacity-30 disabled:cursor-not-allowed">✕</button>
                        </li>
                      )
                    })}
                  </ul>
                )}
                {oversized.length > 0 && (
                  <div className="text-xs text-status-error">⚠ {oversized.length} file(s) exceed the size limit and will be rejected.</div>
                )}
                {wrongType.length > 0 && (
                  <div className="text-xs text-status-error">⚠ {wrongType.length} file(s) have the wrong type for {mediaType}.</div>
                )}
                {stillDetecting.length > 0 && (
                  <div className="text-xs text-brand-text-muted">…detecting {stillDetecting.length} image dimension{stillDetecting.length === 1 ? '' : 's'}…</div>
                )}
              </div>
            )}

            {/* Per-file failed list (only after a partial success) */}
            {lastResult && lastResult.failed_count > 0 && !submitting && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/40">
                <div className="text-sm font-semibold text-amber-300">
                  {lastResult.created_count} uploaded · {lastResult.failed_count} failed
                  {(lastResult.skipped_count ?? 0) > 0 && ` · ${lastResult.skipped_count} skipped`}
                </div>
                <ul className="mt-2 space-y-0.5 max-h-32 overflow-y-auto">
                  {lastResult.failed.map((f, i) => (
                    <li key={i} className="text-xs text-amber-200/80 truncate" title={f.reason}>
                      ✕ <span className="font-mono">{f.filename}</span> — {f.reason}
                    </li>
                  ))}
                </ul>
                <div className="text-xs text-amber-300/70 mt-2">
                  Failed files kept above for retry.
                </div>
              </div>
            )}

            {/* Duplicate-skip panel (no failures, only skipped duplicates) */}
            {lastResult && lastResult.failed_count === 0 && (lastResult.skipped_count ?? 0) > 0 && !submitting && (
              <div className="p-3 rounded-lg bg-status-info/10 border border-status-info/40">
                <div className="text-sm font-semibold text-status-info">
                  {lastResult.created_count} uploaded · {lastResult.skipped_count} duplicate{lastResult.skipped_count === 1 ? '' : 's'} skipped
                </div>
                <ul className="mt-2 space-y-0.5 max-h-32 overflow-y-auto">
                  {(lastResult.skipped ?? []).map((f, i) => (
                    <li key={i} className="text-xs text-status-info/80 truncate" title={f.reason}>
                      ⏭ <span className="font-mono">{f.filename}</span> — already uploaded
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Progress bar — only visible during upload */}
            {submitting && progress && (
              <div className="space-y-1.5 p-3 rounded-lg bg-indigo-900/20 border border-indigo-700/40">
                <div className="flex items-center justify-between text-xs text-indigo-200">
                  <span>Uploading {files.length} file{files.length === 1 ? '' : 's'}…</span>
                  <span className="font-semibold">{progress.percent}%</span>
                </div>
                <div className="h-2 bg-brand-dark rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 transition-all duration-150" style={{ width: `${progress.percent}%` }} />
                </div>
                <div className="text-xs text-indigo-200/70">
                  {formatBytes(progress.loaded)} of {formatBytes(progress.total)}
                </div>
              </div>
            )}

            {/* Error banner — preserved across renders so files stay for retry */}
            {error && !submitting && (
              <div className="p-3 rounded-lg bg-status-error/10 border border-status-error/40">
                <div className="flex items-start gap-2">
                  <span className="text-status-error text-lg leading-none">⚠</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-status-error">Upload failed</div>
                    <div className="text-xs text-status-error/80 mt-0.5 break-words">{error}</div>
                    {createdFestivalIdRef.current != null && (
                      <div className="text-xs text-status-error/70 mt-1">Festival was created. Click Retry to upload posters again.</div>
                    )}
                    {createdFestivalIdRef.current == null && (
                      <div className="text-xs text-status-error/70 mt-1">Your {staged.length} file{staged.length === 1 ? '' : 's'} are still selected. Click Retry below.</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Footer: Back / Cancel-Upload / Save & Upload (or Retry) */}
            <div className="flex justify-between items-center gap-3 pt-2 border-t border-brand-dark-border/50 mt-4">
              <button onClick={() => setStep(1)} disabled={submitting}
                className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed">← Back</button>
              <div className="flex gap-3">
                {submitting ? (
                  <button onClick={cancelWizardUpload} className="px-5 py-2 rounded-lg bg-status-error text-white font-medium hover:opacity-90">
                    ✕ Cancel Upload
                  </button>
                ) : (
                  <>
                    <button onClick={closeModal} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">Cancel</button>
                    <button
                      onClick={handleWizardSubmit}
                      disabled={!filesValid}
                      className="px-5 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      <Check className="h-4 w-4" />
                      {(error || (lastResult && lastResult.failed_count > 0))
                        ? '🔁 Retry Upload'
                        : (staged.length === 0 ? 'Save Festival (skip upload)' : `Save & Upload ${staged.length} ${mediaType}${staged.length === 1 ? '' : 's'}`)}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm dialog — appears when admin toggles media type while files are selected */}
      {pendingMediaType && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="bg-brand-dark-card rounded-xl w-full max-w-sm border border-brand-dark-border shadow-2xl p-5">
            <h3 className="text-base font-semibold text-brand-text mb-2">Switch to {pendingMediaType}?</h3>
            <p className="text-sm text-brand-text-muted mb-4">
              You have <span className="font-semibold text-brand-gold">{staged.length}</span> {mediaType} file{staged.length === 1 ? '' : 's'} selected.
              Switching to <span className="font-semibold capitalize">{pendingMediaType}</span> will clear them. Continue?
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={cancelMediaTypeChange} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border">Cancel</button>
              <button onClick={confirmMediaTypeChange} className="px-4 py-2 text-sm rounded-lg bg-brand-gold text-gray-900 font-semibold hover:bg-brand-gold-dark">Yes, Switch</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Festival" message={`Are you sure you want to delete "${deleteItem?.name}"? This action cannot be undone.`} confirmText="Delete" variant="danger" />

      {/* Phase-1 inline upload — opens locked to one festival from per-row [Upload] button. */}
      {uploadFestival && (
        <BulkFestivalPosterUploadModal
          date={uploadFestival.date}
          festivals={[uploadFestival]}
          onClose={() => setUploadFestival(null)}
          onUploaded={() => { refresh(); addToast(`Uploaded posters for ${uploadFestival.name}`) }}
        />
      )}
    </div>
  )
}

/** Stepper dot used in the wizard header. */
function StepDot({ index, label, current }: { index: 1 | 2; label: string; current: 1 | 2 }) {
  const done = current > index
  const active = current === index
  return (
    <div className="flex items-center gap-2">
      <div
        className={
          'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ' +
          (done
            ? 'bg-status-success text-white'
            : active
              ? 'bg-brand-gold text-gray-900'
              : 'bg-brand-dark-hover text-brand-text-muted')
        }
      >
        {done ? <Check className="h-3.5 w-3.5" /> : index}
      </div>
      <span className={'text-xs ' + (active ? 'text-brand-text font-medium' : 'text-brand-text-muted')}>{label}</span>
    </div>
  )
}
