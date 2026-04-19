/**
 * Frame Studio — the 2026-04 redesign.
 *
 * Workflow:
 *   1. Empty state (no frames yet) matches PDF screenshot 1 — illustration,
 *      "No Frames / Upload Your First Frame", single orange "+ Add Frame" CTA.
 *   2. Clicking "+ Add Frame" opens the Upload Dialog (PDF screenshot 2).
 *   3. After a successful upload the **Text Area Designer** (PDF screenshot 3)
 *      opens automatically with the uploaded PNG as the canvas backdrop.
 *   4. Existing frame cards have hover actions: Edit → reopens Designer;
 *      Duplicate; Toggle Active; Delete.
 */
import { useEffect, useMemo, useState } from 'react'
import { useToast } from '../../context/ToastContext'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { posterFramesApi } from '../../services/admin-api'
import {
  FRAME_CATEGORIES, FRAME_TYPES,
  FRAME_MAX_BYTES, FRAME_INFO_BANNER, FRAME_TIP,
  FRAME_TYPE_TO_RATIO,
} from './designer/constants'
import { FrameDesigner, PosterFrameRow } from './designer/FrameDesigner'


export default function FramePosterPage() {
  const { addToast } = useToast()
  const [frames, setFrames] = useState<PosterFrameRow[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [designerFrame, setDesignerFrame] = useState<PosterFrameRow | null>(null)
  const [deleteFrame, setDeleteFrame] = useState<PosterFrameRow | null>(null)
  const [dupDropdown, setDupDropdown] = useState<number | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('active')
  const [scopeFilter, setScopeFilter] = useState<'all' | 'global' | 'user'>('all')

  const load = async () => {
    setLoading(true)
    try {
      const list = await posterFramesApi.list() as unknown as PosterFrameRow[]
      setFrames(list)
    } catch {
      addToast('Failed to load frames', 'error')
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  const availableTags = useMemo(() => {
    const s = new Set<string>()
    frames.forEach(f => (f.tags ?? []).forEach(t => s.add(t)))
    return Array.from(s).sort()
  }, [frames])

  const filtered = useMemo(() => frames.filter(f => {
    if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false
    if (categoryFilter && f.category !== categoryFilter) return false
    if (typeFilter && f.frame_type !== typeFilter) return false
    if (tagFilter && !(f.tags ?? []).includes(tagFilter)) return false
    if (statusFilter === 'active' && !f.is_active) return false
    if (statusFilter === 'inactive' && f.is_active) return false
    if (scopeFilter === 'global' && f.assigned_user) return false
    if (scopeFilter === 'user' && !f.assigned_user) return false
    return true
  }), [frames, search, categoryFilter, typeFilter, tagFilter, statusFilter, scopeFilter])

  // Sort: featured first, then sort_order, then newest
  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
    return 0
  }), [filtered])

  const onUpload = async (payload: UploadPayload) => {
    try {
      const created = await posterFramesApi.createWithFile(payload) as PosterFrameRow
      setFrames(prev => [created, ...prev])
      setUploadOpen(false)
      setDesignerFrame(created)
    } catch (err: unknown) {
      const e = err as { response?: { data?: Record<string, unknown>; status?: number } }
      const d = e.response?.data
      const msg = d
        ? (Array.isArray(d.frame_image) ? d.frame_image[0]
          : d.detail ?? JSON.stringify(d))
        : (err as Error).message
      addToast(`Upload failed: ${String(msg)}`, 'error')
    }
  }

  const toggleActive = async (f: PosterFrameRow) => {
    try {
      const updated = await posterFramesApi.update(f.id, { is_active: !f.is_active } as Partial<PosterFrameRow>) as PosterFrameRow
      setFrames(prev => prev.map(x => x.id === f.id ? updated : x))
      addToast(f.is_active ? 'Deactivated' : 'Activated')
    } catch { addToast('Toggle failed', 'error') }
  }

  const duplicate = async (f: PosterFrameRow, ratio?: string) => {
    try {
      const clone = await posterFramesApi.duplicate(f.id, ratio ? { aspect_ratio: ratio } : undefined) as PosterFrameRow
      setFrames(prev => [clone, ...prev])
      addToast('Frame duplicated')
    } catch { addToast('Duplicate failed', 'error') }
  }

  const remove = async () => {
    if (!deleteFrame) return
    try {
      await posterFramesApi.delete(deleteFrame.id)
      setFrames(prev => prev.filter(x => x.id !== deleteFrame.id))
      addToast('Deleted')
    } catch { addToast('Delete failed', 'error') }
    finally { setDeleteFrame(null) }
  }

  const onSavedFromDesigner = (updated: PosterFrameRow) => {
    setFrames(prev => prev.map(x => x.id === updated.id ? updated : x))
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-gray-500">Loading frames…</div>
  }

  // ── Empty state — PDF screenshot 1 ──────────────────────────────
  if (frames.length === 0) {
    return (
      <div className="relative h-[70vh] bg-neutral-100 rounded-2xl flex items-center justify-center overflow-hidden">
        <div className="text-center">
          <div className="w-24 h-24 bg-amber-100 rounded-2xl mx-auto flex items-center justify-center text-4xl">🖼️</div>
          <h2 className="mt-4 text-xl font-bold text-gray-900">No Frames</h2>
          <p className="text-sm text-gray-500">Upload Your First Frame</p>
        </div>
        <button
          onClick={() => setUploadOpen(true)}
          className="absolute right-6 bottom-6 flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-amber-500 text-white font-medium shadow-lg hover:bg-amber-600"
        >
          ＋ Add Frame
        </button>

        <UploadDialog
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          onSubmit={onUpload}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Frame Studio</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Design poster frames with drag-and-drop text areas.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="px-2 py-1 rounded bg-gray-100">{frames.length} total</span>
          <span className="px-2 py-1 rounded bg-green-100 text-green-700">{frames.filter(f => f.is_active).length} active</span>
          {sorted.length !== frames.length && (
            <span className="px-2 py-1 rounded bg-amber-100 text-amber-700">Showing {sorted.length}</span>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        <input
          placeholder="Search frames…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm w-64"
        />
        <select value={scopeFilter} onChange={e => setScopeFilter(e.target.value as 'all' | 'global' | 'user')} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="all">All scopes</option>
          <option value="global">Global</option>
          <option value="user">Per-user</option>
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">All Categories</option>
          {FRAME_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">All Types</option>
          {FRAME_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {availableTags.length > 0 && (
          <select value={tagFilter} onChange={e => setTagFilter(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="">All Tags</option>
            {availableTags.map(t => <option key={t} value={t}>#{t}</option>)}
          </select>
        )}
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">All Status</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sorted.map(f => (
          <div key={f.id} className="group bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="aspect-[4/5] bg-neutral-100 relative flex items-center justify-center">
              {f.thumbnail_url
                ? <img src={f.thumbnail_url} alt={f.name} className="w-full h-full object-contain" />
                : <div className="text-3xl">🖼️</div>}

              {/* Badges */}
              <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                {f.is_featured && <span className="px-2 py-0.5 text-[10px] rounded-full bg-pink-100 text-pink-700 font-medium">✨ Featured</span>}
                {f.is_premium && <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-100 text-amber-700 font-medium">⭐ Premium</span>}
                {f.assigned_user && <span className="px-2 py-0.5 text-[10px] rounded-full bg-purple-100 text-purple-700 font-medium">User #{f.assigned_user}</span>}
                <span className={`px-2 py-0.5 text-[10px] rounded-full ${f.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {f.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="absolute bottom-2 left-2 flex gap-1">
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-white/80 border text-gray-700">{f.aspect_ratio}</span>
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-white/80 border text-gray-700">{f.frame_type}</span>
              </div>

              {/* Hover actions */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                <button
                  onClick={() => setDesignerFrame(f)}
                  className="p-2 rounded-lg bg-amber-500 text-white"
                  title="Edit text areas"
                >✎</button>
                <div className="relative">
                  <button
                    onClick={e => { e.stopPropagation(); setDupDropdown(dupDropdown === f.id ? null : f.id) }}
                    className="p-2 rounded-lg bg-blue-500 text-white"
                    title="Duplicate"
                  >⎘</button>
                  {dupDropdown === f.id && (
                    <div className="absolute top-full mt-1 left-0 bg-white border rounded-lg shadow-xl z-30 py-1 min-w-[140px]">
                      <button onClick={() => { duplicate(f); setDupDropdown(null) }} className="w-full text-left px-3 py-1 text-xs hover:bg-gray-100">Same ratio</button>
                      {['1:1', '4:5', '9:16', '16:9'].filter(r => r !== f.aspect_ratio).map(r => (
                        <button key={r} onClick={() => { duplicate(f, r); setDupDropdown(null) }} className="w-full text-left px-3 py-1 text-xs hover:bg-gray-100">To {r}</button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => toggleActive(f)}
                  className="p-2 rounded-lg bg-green-600 text-white"
                  title={f.is_active ? 'Deactivate' : 'Activate'}
                >{f.is_active ? '⏸' : '▶'}</button>
                <button
                  onClick={() => setDeleteFrame(f)}
                  className="p-2 rounded-lg bg-red-500 text-white"
                  title="Delete"
                >🗑</button>
              </div>
            </div>

            <div className="p-3">
              <div className="text-sm font-medium text-gray-900 truncate">{f.name}</div>
              <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2">
                <span className="capitalize">{f.category}</span>
                {f.usage_count > 0 && <span>· used {f.usage_count}×</span>}
              </div>
              {f.tags?.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {f.tags.slice(0, 4).map(t => (
                    <span key={t} className="px-1.5 py-0.5 text-[10px] rounded bg-gray-100 text-gray-600">#{t}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Floating + button */}
      <button
        onClick={() => setUploadOpen(true)}
        className="fixed bottom-6 right-6 flex items-center gap-1.5 px-4 py-3 rounded-full bg-amber-500 text-white font-medium shadow-xl hover:bg-amber-600 z-40"
      >＋ Add Frame</button>

      <UploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSubmit={onUpload}
      />

      <FrameDesigner
        open={!!designerFrame}
        frame={designerFrame}
        onClose={() => setDesignerFrame(null)}
        onSaved={onSavedFromDesigner}
      />

      <ConfirmDialog
        isOpen={!!deleteFrame}
        onClose={() => setDeleteFrame(null)}
        onConfirm={remove}
        title="Delete Frame"
        message={`Delete "${deleteFrame?.name}"? This removes it from every user who has it assigned.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  )
}


// ── Upload Dialog — mirrors PDF screenshot 2 ────────────────────────

interface UploadPayload {
  name: string
  category: string
  frame_type: string
  aspect_ratio: string
  tags: string[]
  is_premium: boolean
  is_featured: boolean
  show_frame_name: boolean
  frame_image: File
}

function UploadDialog({
  open, onClose, onSubmit,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (p: UploadPayload) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [tags, setTags] = useState('')
  const [category, setCategory] = useState('business')
  const [frameType, setFrameType] = useState('square')
  const [file, setFile] = useState<File | null>(null)
  const [showName, setShowName] = useState(true)
  const [premium, setPremium] = useState(false)
  const [featured, setFeatured] = useState(false)
  const [saving, setSaving] = useState(false)

  const tooLarge = !!file && file.size > FRAME_MAX_BYTES
  const wrongType = !!file && !file.name.toLowerCase().endsWith('.png')

  const submit = async () => {
    if (!name.trim() || !file) return
    if (tooLarge || wrongType) return
    setSaving(true)
    try {
      await onSubmit({
        name: name.trim(),
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        category,
        frame_type: frameType,
        aspect_ratio: FRAME_TYPE_TO_RATIO[frameType] ?? '1:1',
        is_premium: premium,
        is_featured: featured,
        show_frame_name: showName,
        frame_image: file,
      })
      // Reset
      setName(''); setTags(''); setCategory('business'); setFrameType('square')
      setFile(null); setShowName(true); setPremium(false); setFeatured(false)
    } finally { setSaving(false) }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-[440px] max-w-[95vw] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Dark navy header, mirroring PDF */}
        <div className="bg-[#0b1a3a] h-12" />

        <div className="bg-[#f5efe0] p-5 space-y-3">
          <Field label="Frame Name">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="T" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
          </Field>
          <Field label="Tags ( Comma - separated)">
            <input value={tags} onChange={e => setTags(e.target.value)} placeholder="#" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
          </Field>
          <Field label="Category">
            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white">
              {FRAME_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Frame Type">
            <select value={frameType} onChange={e => setFrameType(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white">
              {FRAME_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>

          <div className="bg-white/70 rounded-xl p-2 space-y-1">
            <ToggleRow
              icon="ⓘ" label="Frame Name"
              value={showName} onChange={setShowName}
            />
            <ToggleRow
              icon="🏆" label="Premium"
              value={premium} onChange={setPremium}
            />
            <ToggleRow
              icon="⭐" label="Featured"
              value={featured} onChange={setFeatured}
            />
          </div>

          <label className={'block rounded-lg px-3 py-3 text-sm text-center cursor-pointer border-dashed border-2 ' + (tooLarge || wrongType ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-indigo-300 text-gray-700')}>
            <input type="file" accept="image/png" onChange={e => setFile(e.target.files?.[0] ?? null)} className="hidden" />
            {file ? (
              <>📄 {file.name} <span className="text-xs opacity-80">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                {tooLarge && <span className="text-red-700 font-semibold"> — too large</span>}
                {wrongType && <span className="text-red-700 font-semibold"> — not PNG</span>}</>
            ) : '📄 Select PNG Frame'}
          </label>
          <div className="text-[11px] text-blue-900/80 bg-blue-50 rounded px-2 py-1 space-y-0.5">
            <div>ℹ️ {FRAME_INFO_BANNER}</div>
            <div>💡 {FRAME_TIP}</div>
          </div>

          <div className="flex justify-between gap-2 pt-1">
            <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50">Cancel</button>
            <button
              onClick={submit}
              disabled={!name.trim() || !file || tooLarge || wrongType || saving}
              className="flex-1 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
            >{saving ? 'Uploading…' : '↑ Upload Frame'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-gray-700 mb-1">{label}</div>
      {children}
    </div>
  )
}

function ToggleRow({
  icon, label, value, onChange,
}: {
  icon: string
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-white"
    >
      <span className="flex items-center gap-2">
        <span>{icon}</span>
        <span className="font-medium text-gray-800">{label}</span>
      </span>
      <span
        className={'relative inline-block w-10 h-5 rounded-full transition ' + (value ? 'bg-amber-500' : 'bg-gray-300')}
      >
        <span
          className={'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ' + (value ? 'left-5' : 'left-0.5')}
        />
      </span>
    </button>
  )
}
