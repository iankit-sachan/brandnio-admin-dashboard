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
import type { Language, PosterAspectRatio, PosterMediaType } from '../../types/festival.types'
import BulkFestivalPosterUploadModal from './BulkFestivalPosterUploadModal'

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

const RATIOS: PosterAspectRatio[] = ['1:1', '4:5', '9:16']
const RATIO_LABEL: Record<PosterAspectRatio, string> = {
  '1:1': '1:1', '4:5': '4:5', '9:16': 'Story', '16:9': '16:9',
}

const IMG_MAX = 20 * 1024 * 1024
const VID_MAX = 100 * 1024 * 1024

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
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
  const [aspectRatio, setAspectRatio] = useState<PosterAspectRatio>('1:1')
  const [mediaType, setMediaType] = useState<PosterMediaType>('image')
  const [files, setFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  // Progress for the bulk upload phase of the wizard (Step 2 → Save).
  const [progress, setProgress] = useState<{ loaded: number; total: number; percent: number } | null>(null)
  // Last error during wizard submit — kept so admin can retry without losing state.
  const [error, setError] = useState<string | null>(null)
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
    setForm(emptyForm)
    setEditingItem(null)
    setStep(1)
    setFiles([])
    setMediaType('image')
    setAspectRatio('1:1')
    setSubmitting(false)
    setProgress(null)
    setError(null)
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
  const oversized = files.filter(f => f.size > maxBytes)
  const wrongType = files.filter(f => {
    if (mediaType === 'image') return !f.type.startsWith('image/')
    return !f.type.startsWith('video/')
  })
  const filesValid = files.length === 0 || (oversized.length === 0 && wrongType.length === 0)

  const goNext = () => {
    if (!step1Valid) {
      addToast(form.name.trim() ? 'Date is required' : 'Name is required', 'error')
      return
    }
    setStep(2)
  }

  const pickFiles = (list: FileList | null) => {
    if (!list) return
    setError(null)
    setFiles([...files, ...Array.from(list)])
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    pickFiles(e.dataTransfer.files)
  }
  const removeFile = (i: number) => setFiles(files.filter((_, idx) => idx !== i))

  // Smart media-type toggle — if files exist, ask before clearing them.
  const requestMediaTypeChange = (newType: PosterMediaType) => {
    if (newType === mediaType) return
    if (files.length === 0) { setMediaType(newType); return }
    setPendingMediaType(newType)
  }
  const confirmMediaTypeChange = () => {
    if (pendingMediaType) {
      setMediaType(pendingMediaType)
      setFiles([])
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
  // and only re-run the bulk upload (avoids duplicate festivals).
  const handleWizardSubmit = async () => {
    if (!step1Valid) { setStep(1); addToast('Festival name + date required', 'error'); return }
    if (!filesValid) { addToast('Fix file errors before saving', 'error'); return }

    setSubmitting(true)
    setError(null)
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

      // 2) If admin picked files, bulk-upload them with progress + abort support.
      if (files.length > 0) {
        setProgress({ loaded: 0, total: files.reduce((s, f) => s + f.size, 0), percent: 0 })
        abortRef.current = new AbortController()
        const res = await festivalCalendarApi.bulkUpload(
          {
            festival: newFestivalId,
            language: languageId,
            aspect_ratio: aspectRatio,
            media_type: mediaType,
            files,
          },
          {
            signal: abortRef.current.signal,
            onProgress: (loaded, total, percent) => setProgress({ loaded, total, percent }),
          },
        )
        addToast(`Festival created + ${res.created_count} poster${res.created_count === 1 ? '' : 's'} uploaded`)
      } else {
        addToast('Festival created successfully')
      }

      closeModal()
      refresh()
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

            {/* Language picker */}
            <div>
              <div className="text-xs text-brand-text-muted mb-1.5">Language</div>
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

            {/* Aspect ratio */}
            <div>
              <div className="text-xs text-brand-text-muted mb-1.5">Size</div>
              <div className="flex gap-2 flex-wrap">
                {RATIOS.map(r => (
                  <label key={r} className={
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-sm transition-colors ' +
                    (aspectRatio === r
                      ? 'bg-brand-gold/20 border-brand-gold text-brand-gold'
                      : 'bg-brand-dark border-brand-dark-border text-brand-text-muted hover:border-brand-text-muted')
                  }>
                    <input type="radio" name="ratio" checked={aspectRatio === r} onChange={() => setAspectRatio(r)} className="sr-only" />
                    <span>{RATIO_LABEL[r]}</span>
                  </label>
                ))}
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
            </div>

            {/* File drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={
                'border-2 border-dashed rounded-lg p-6 text-center transition-colors ' +
                (dragging ? 'bg-indigo-500/10 border-indigo-500' : 'bg-brand-dark border-brand-dark-border hover:border-brand-text-muted')
              }
            >
              <div className="text-3xl mb-2">📤</div>
              <div className="text-sm text-brand-text-muted mb-2">Drag &amp; Drop or</div>
              <label className="inline-block px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm cursor-pointer hover:bg-indigo-500">
                Browse
                <input type="file" multiple className="hidden" accept={mediaType === 'image' ? 'image/*' : 'video/mp4,video/*'} onChange={e => pickFiles(e.target.files)} />
              </label>
              <div className="text-xs text-brand-text-muted/70 mt-3">
                {mediaType === 'image' ? 'PNG/JPEG · Max 20 MB each' : 'MP4 · Max 100 MB each'}
              </div>
              <div className="text-xs text-brand-text-muted/60 mt-1">
                You can also skip this step — festival will be created without posters.
              </div>
            </div>

            {/* Selected files list */}
            {files.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs text-brand-text-muted">Selected files ({files.length})</div>
                <ul className="space-y-1 max-h-40 overflow-y-auto">
                  {files.map((f, i) => {
                    const bad = f.size > maxBytes || (mediaType === 'image' ? !f.type.startsWith('image/') : !f.type.startsWith('video/'))
                    return (
                      <li key={i} className={
                        'flex items-center justify-between text-xs px-3 py-1.5 rounded-lg border ' +
                        (bad ? 'bg-status-error/10 border-status-error/40 text-status-error' : 'bg-brand-dark border-brand-dark-border text-brand-text-muted')
                      }>
                        <span className="truncate flex-1">{f.name}</span>
                        <span className="mx-3 text-brand-text-muted/70">{formatBytes(f.size)}</span>
                        <button onClick={() => removeFile(i)} className="text-status-error hover:opacity-70">✕</button>
                      </li>
                    )
                  })}
                </ul>
                {oversized.length > 0 && (
                  <div className="text-xs text-status-error">⚠ {oversized.length} file(s) exceed the size limit and will be rejected.</div>
                )}
                {wrongType.length > 0 && (
                  <div className="text-xs text-status-error">⚠ {wrongType.length} file(s) have the wrong type for {mediaType}.</div>
                )}
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
                      <div className="text-xs text-status-error/70 mt-1">Your {files.length} file{files.length === 1 ? '' : 's'} are still selected. Click Retry below.</div>
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
                      {error
                        ? '🔁 Retry Upload'
                        : (files.length === 0 ? 'Save Festival (skip upload)' : `Save & Upload ${files.length} ${mediaType}${files.length === 1 ? '' : 's'}`)}
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
              You have <span className="font-semibold text-brand-gold">{files.length}</span> {mediaType} file{files.length === 1 ? '' : 's'} selected.
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
