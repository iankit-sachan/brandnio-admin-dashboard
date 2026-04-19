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
    return <div className="flex items-center justify-center py-20 text-brand-text-muted">Loading frames…</div>
  }

  // ── Empty state — PDF screenshot 1 ──────────────────────────────
  if (frames.length === 0) {
    return (
      <div className="relative h-[70vh] bg-brand-dark-deep rounded-2xl flex items-center justify-center overflow-hidden border border-brand-dark-border">
        <div className="text-center">
          <div className="w-24 h-24 bg-brand-gold/10 text-brand-gold rounded-2xl mx-auto flex items-center justify-center text-4xl">🖼️</div>
          <h2 className="mt-4 text-xl font-bold text-brand-text">No Frames</h2>
          <p className="text-sm text-brand-text-muted">Upload Your First Frame</p>
        </div>
        <button
          onClick={() => setUploadOpen(true)}
          className="absolute right-6 bottom-6 flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-brand-gold text-brand-dark-deep font-medium shadow-lg hover:bg-brand-gold-dark"
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
          <h1 className="text-2xl font-bold text-brand-text">Frame Studio</h1>
          <p className="text-sm text-brand-text-muted mt-0.5">
            Design poster frames with drag-and-drop text areas.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="px-2 py-1 rounded bg-brand-dark-card text-brand-text-muted border border-brand-dark-border">{frames.length} total</span>
          <span className="px-2 py-1 rounded bg-green-500/15 text-green-400 border border-green-500/30">{frames.filter(f => f.is_active).length} active</span>
          {sorted.length !== frames.length && (
            <span className="px-2 py-1 rounded bg-brand-gold/15 text-brand-gold border border-brand-gold/30">Showing {sorted.length}</span>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        <input
          placeholder="Search frames…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2 text-sm text-brand-text placeholder-brand-text-muted focus:outline-none focus:border-brand-gold/50 w-64"
        />
        <select value={scopeFilter} onChange={e => setScopeFilter(e.target.value as 'all' | 'global' | 'user')} className="bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
          <option value="all">All scopes</option>
          <option value="global">Global</option>
          <option value="user">Per-user</option>
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
          <option value="">All Categories</option>
          {FRAME_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
          <option value="">All Types</option>
          {FRAME_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {availableTags.length > 0 && (
          <select value={tagFilter} onChange={e => setTagFilter(e.target.value)} className="bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
            <option value="">All Tags</option>
            {availableTags.map(t => <option key={t} value={t}>#{t}</option>)}
          </select>
        )}
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
          <option value="">All Status</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sorted.map(f => (
          <div key={f.id} className="group bg-brand-dark-card rounded-xl border border-brand-dark-border overflow-hidden hover:border-brand-gold/40 transition-colors">
            {/* Checkerboard bg so transparent PNG frames show edges clearly */}
            <div
              className="aspect-[4/5] relative flex items-center justify-center"
              style={{
                backgroundColor: '#2a2a2a',
                backgroundImage:
                  'linear-gradient(45deg, #333 25%, transparent 25%), ' +
                  'linear-gradient(-45deg, #333 25%, transparent 25%), ' +
                  'linear-gradient(45deg, transparent 75%, #333 75%), ' +
                  'linear-gradient(-45deg, transparent 75%, #333 75%)',
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
              }}
            >
              {f.thumbnail_url
                ? <img src={f.thumbnail_url} alt={f.name} className="w-full h-full object-contain" />
                : <div className="text-3xl opacity-40">🖼️</div>}

              {/* Badges */}
              <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                {f.is_featured && <span className="px-2 py-0.5 text-[10px] rounded-full bg-pink-500/90 text-white font-medium backdrop-blur-sm">✨ Featured</span>}
                {f.is_premium && <span className="px-2 py-0.5 text-[10px] rounded-full bg-brand-gold/90 text-brand-dark-deep font-medium backdrop-blur-sm">⭐ Premium</span>}
                {f.assigned_user && <span className="px-2 py-0.5 text-[10px] rounded-full bg-purple-500/90 text-white font-medium backdrop-blur-sm">User #{f.assigned_user}</span>}
                <span className={`px-2 py-0.5 text-[10px] rounded-full font-medium backdrop-blur-sm ${f.is_active ? 'bg-green-500/90 text-white' : 'bg-black/60 text-neutral-300'}`}>
                  {f.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="absolute bottom-2 left-2 flex gap-1">
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-black/70 text-white backdrop-blur-sm">{f.aspect_ratio}</span>
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-black/70 text-white backdrop-blur-sm">{f.frame_type}</span>
              </div>

              {/* Hover actions */}
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                <button
                  onClick={() => setDesignerFrame(f)}
                  className="p-2 rounded-lg bg-brand-gold text-brand-dark-deep hover:bg-brand-gold-dark"
                  title="Edit text areas"
                >✎</button>
                <div className="relative">
                  <button
                    onClick={e => { e.stopPropagation(); setDupDropdown(dupDropdown === f.id ? null : f.id) }}
                    className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
                    title="Duplicate"
                  >⎘</button>
                  {dupDropdown === f.id && (
                    <div className="absolute top-full mt-1 left-0 bg-brand-dark-card border border-brand-dark-border rounded-lg shadow-xl z-30 py-1 min-w-[140px]">
                      <button onClick={() => { duplicate(f); setDupDropdown(null) }} className="w-full text-left px-3 py-1 text-xs text-brand-text hover:bg-brand-dark-hover">Same ratio</button>
                      {['1:1', '4:5', '9:16', '16:9'].filter(r => r !== f.aspect_ratio).map(r => (
                        <button key={r} onClick={() => { duplicate(f, r); setDupDropdown(null) }} className="w-full text-left px-3 py-1 text-xs text-brand-text hover:bg-brand-dark-hover">To {r}</button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => toggleActive(f)}
                  className="p-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
                  title={f.is_active ? 'Deactivate' : 'Activate'}
                >{f.is_active ? '⏸' : '▶'}</button>
                <button
                  onClick={() => setDeleteFrame(f)}
                  className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
                  title="Delete"
                >🗑</button>
              </div>
            </div>

            <div className="p-3">
              <div className="text-sm font-medium text-brand-text truncate">{f.name}</div>
              <div className="text-[11px] text-brand-text-muted mt-0.5 flex items-center gap-2">
                <span className="capitalize">{f.category}</span>
                {f.usage_count > 0 && <span>· used {f.usage_count}×</span>}
              </div>
              {f.tags?.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {f.tags.slice(0, 4).map(t => (
                    <span key={t} className="px-1.5 py-0.5 text-[10px] rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">#{t}</span>
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
        className="fixed bottom-6 right-6 flex items-center gap-1.5 px-4 py-3 rounded-full bg-brand-gold text-brand-dark-deep font-semibold shadow-xl hover:bg-brand-gold-dark z-40"
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-brand-dark-card border border-brand-dark-border rounded-2xl shadow-2xl w-[440px] max-w-[95vw] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Dark header bar (matches PDF but tuned to app's dark theme) */}
        <div className="bg-brand-dark-deep h-12 flex items-center px-5 border-b border-brand-dark-border">
          <h3 className="text-sm font-semibold text-brand-text">Add Frame</h3>
        </div>

        <div className="p-5 space-y-3">
          <Field label="Frame Name">
            <input
              value={name} onChange={e => setName(e.target.value)} placeholder="My frame"
              className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-brand-dark-border text-sm text-brand-text placeholder-brand-text-muted focus:outline-none focus:border-brand-gold/50"
            />
          </Field>
          <Field label="Tags (comma-separated)">
            <input
              value={tags} onChange={e => setTags(e.target.value)} placeholder="summer, limited, shop"
              className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-brand-dark-border text-sm text-brand-text placeholder-brand-text-muted focus:outline-none focus:border-brand-gold/50"
            />
          </Field>
          <Field label="Category">
            <select
              value={category} onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-brand-dark-border text-sm text-brand-text focus:outline-none focus:border-brand-gold/50"
            >
              {FRAME_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Frame Type">
            <select
              value={frameType} onChange={e => setFrameType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-brand-dark-border text-sm text-brand-text focus:outline-none focus:border-brand-gold/50"
            >
              {FRAME_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>

          <div className="bg-brand-dark rounded-xl p-1.5 space-y-0.5 border border-brand-dark-border/60">
            <ToggleRow
              icon="ⓘ" label="Frame Name (auto-add watermark)"
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

          <label className={'block rounded-lg px-3 py-4 text-sm text-center cursor-pointer border-dashed border-2 transition-colors ' + (tooLarge || wrongType ? 'bg-red-500/10 border-red-500/50 text-red-400' : 'bg-brand-dark border-brand-gold/40 hover:border-brand-gold text-brand-text')}>
            <input type="file" accept="image/png" onChange={e => setFile(e.target.files?.[0] ?? null)} className="hidden" />
            {file ? (
              <>📄 {file.name} <span className="text-xs text-brand-text-muted">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                {tooLarge && <span className="text-red-400 font-semibold"> — too large</span>}
                {wrongType && <span className="text-red-400 font-semibold"> — not PNG</span>}</>
            ) : '📄 Select PNG Frame'}
          </label>
          <div className="text-[11px] text-brand-text-muted bg-brand-dark-deep rounded-lg px-3 py-2 space-y-0.5 border border-brand-dark-border/50">
            <div>ℹ️ {FRAME_INFO_BANNER}</div>
            <div>💡 {FRAME_TIP}</div>
          </div>

          <div className="flex justify-between gap-2 pt-1">
            <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-brand-dark-border text-sm text-brand-text hover:bg-brand-dark-hover">Cancel</button>
            <button
              onClick={submit}
              disabled={!name.trim() || !file || tooLarge || wrongType || saving}
              className="flex-1 px-4 py-2 rounded-lg bg-brand-gold text-brand-dark-deep text-sm font-semibold hover:bg-brand-gold-dark disabled:opacity-50"
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
      <div className="text-xs font-medium text-brand-text-muted mb-1">{label}</div>
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
      className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-brand-dark-hover"
    >
      <span className="flex items-center gap-2">
        <span>{icon}</span>
        <span className="font-medium text-brand-text">{label}</span>
      </span>
      <span
        className={'relative inline-block w-10 h-5 rounded-full transition ' + (value ? 'bg-brand-gold' : 'bg-brand-dark-border')}
      >
        <span
          className={'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ' + (value ? 'left-5' : 'left-0.5')}
        />
      </span>
    </button>
  )
}
