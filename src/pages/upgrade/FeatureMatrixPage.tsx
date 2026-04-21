import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Grid, Plus, Save, RotateCcw, Check, X as XIcon,
  Pencil, Trash2, Loader2, AlertCircle, Info,
} from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { featuresApi, type FeatureMatrixPayload } from '../../services/admin-api'

type Feature   = FeatureMatrixPayload['features'][0]
type Plan      = FeatureMatrixPayload['plans'][0]
type Cell      = FeatureMatrixPayload['cells'][0]

interface CellEdit {
  enabled: boolean
  quota: number | null
  note: string
}

const CATEGORY_ORDER: Array<{ value: string; label: string }> = [
  { value: 'editor',   label: 'Editor Tools' },
  { value: 'ai',       label: 'AI Tools' },
  { value: 'export',   label: 'Export Quality' },
  { value: 'frames',   label: 'Frames' },
  { value: 'storage',  label: 'Storage' },
  { value: 'branding', label: 'Business Branding' },
  { value: 'content',  label: 'Content Access' },
  { value: 'support',  label: 'Support' },
  { value: 'other',    label: 'Other' },
]

interface FeatureFormState {
  id: number | null
  name: string
  slug: string
  category: string
  description: string
  icon: string
  sort_order: number
  is_active: boolean
}

const EMPTY_FEATURE: FeatureFormState = {
  id: null, name: '', slug: '', category: 'editor',
  description: '', icon: '', sort_order: 0, is_active: true,
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function FeatureMatrixPage() {
  const { addToast } = useToast()
  const [matrix, setMatrix] = useState<FeatureMatrixPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** Pending edits keyed by "planId:featureId". Committed on Save. */
  const [edits, setEdits] = useState<Record<string, CellEdit>>({})
  const dirty = Object.keys(edits).length > 0

  // Feature CRUD modal
  const [featureModalOpen, setFeatureModalOpen] = useState(false)
  const [featureForm, setFeatureForm] = useState<FeatureFormState>(EMPTY_FEATURE)
  const [deleteFeature, setDeleteFeature] = useState<Feature | null>(null)
  const [featureBusy, setFeatureBusy] = useState(false)

  const reload = useCallback(() => {
    setLoading(true)
    setError(null)
    featuresApi.getMatrix()
      .then(d => setMatrix(d))
      .catch(e => setError((e as Error).message || 'Failed to load matrix'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { reload() }, [reload])

  /** Cell index: planId → featureId → Cell (from server) */
  const cellIndex = useMemo(() => {
    const m = new Map<string, Cell>()
    matrix?.cells.forEach(c => m.set(`${c.plan_id}:${c.feature_id}`, c))
    return m
  }, [matrix])

  /** Resolved cell — pending edit overrides server cell; both fall back to default. */
  const resolvedCell = useCallback(
    (planId: number, featureId: number): CellEdit => {
      const key = `${planId}:${featureId}`
      if (edits[key]) return edits[key]
      const server = cellIndex.get(key)
      return server
        ? { enabled: server.enabled, quota: server.quota, note: server.note }
        : { enabled: false, quota: null, note: '' }
    },
    [edits, cellIndex],
  )

  const updateCell = (planId: number, featureId: number, patch: Partial<CellEdit>) => {
    const key = `${planId}:${featureId}`
    const current = resolvedCell(planId, featureId)
    setEdits(prev => ({ ...prev, [key]: { ...current, ...patch } }))
  }

  const discardEdits = () => setEdits({})

  const saveAll = async () => {
    if (!dirty || !matrix) return
    setSaving(true)
    try {
      const cells = Object.entries(edits).map(([key, edit]) => {
        const [planId, featureId] = key.split(':').map(Number)
        return {
          plan_id: planId, feature_id: featureId,
          enabled: edit.enabled,
          quota: edit.quota,
          note: edit.note,
        }
      })
      const result = await featuresApi.bulkUpdate(cells)
      addToast(`Saved: ${result.created} created, ${result.updated} updated`)
      setEdits({})
      reload()
    } catch (e) {
      addToast((e as Error).message || 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Feature CRUD ───────────────────────────────────────────────

  const openAddFeature = () => {
    setFeatureForm(EMPTY_FEATURE)
    setFeatureModalOpen(true)
  }

  const openEditFeature = (f: Feature) => {
    setFeatureForm({
      id: f.id, name: f.name, slug: f.slug, category: f.category,
      description: f.description, icon: f.icon,
      sort_order: f.sort_order, is_active: f.is_active,
    })
    setFeatureModalOpen(true)
  }

  const submitFeature = async () => {
    if (!featureForm.name.trim()) { addToast('Name is required', 'error'); return }
    if (!featureForm.slug.trim()) { addToast('Slug is required', 'error'); return }
    setFeatureBusy(true)
    try {
      const payload = {
        name: featureForm.name, slug: featureForm.slug,
        category: featureForm.category, description: featureForm.description,
        icon: featureForm.icon, sort_order: featureForm.sort_order,
        is_active: featureForm.is_active,
      }
      if (featureForm.id) {
        await featuresApi.update(featureForm.id, payload)
        addToast('Feature updated')
      } else {
        await featuresApi.create(payload)
        addToast('Feature created')
      }
      setFeatureModalOpen(false); setFeatureForm(EMPTY_FEATURE)
      reload()
    } catch (e) {
      addToast((e as Error).message || 'Save failed', 'error')
    } finally { setFeatureBusy(false) }
  }

  const handleDeleteFeature = async () => {
    if (!deleteFeature) return
    try {
      await featuresApi.delete(deleteFeature.id)
      addToast('Feature deleted')
      setDeleteFeature(null)
      reload()
    } catch {
      addToast('Delete failed', 'error')
    }
  }

  // Group features by category for the grid section dividers
  const grouped = useMemo(() => {
    if (!matrix) return []
    const byCat = new Map<string, Feature[]>()
    matrix.features.forEach(f => {
      const arr = byCat.get(f.category) ?? []
      arr.push(f)
      byCat.set(f.category, arr)
    })
    return CATEGORY_ORDER
      .map(c => ({ key: c.value, label: c.label, features: byCat.get(c.value) ?? [] }))
      .filter(g => g.features.length > 0)
  }, [matrix])

  // ── Render ─────────────────────────────────────────────────────

  if (loading && !matrix) {
    return (
      <div className="flex items-center justify-center py-20 text-brand-text-muted">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading feature matrix…
      </div>
    )
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <div className="text-brand-text">{error}</div>
        <button onClick={reload} className="mt-2 text-xs text-brand-gold underline">Retry</button>
      </div>
    )
  }
  if (!matrix) return null

  const activePlans = matrix.plans.filter(p => p.is_active)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Feature Matrix</h1>
          <p className="text-sm text-brand-text-muted mt-0.5">
            {matrix.features.length} features × {activePlans.length} plans — the source of truth for paywall gating
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <>
              <span className="text-xs text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {Object.keys(edits).length} unsaved change{Object.keys(edits).length === 1 ? '' : 's'}
              </span>
              <button onClick={discardEdits}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border">
                <RotateCcw className="w-3.5 h-3.5" /> Discard
              </button>
              <button onClick={saveAll} disabled={saving}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-brand-gold text-gray-900 font-medium hover:bg-brand-gold-dark disabled:opacity-60">
                {saving
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Save className="w-3.5 h-3.5" />}
                Save all
              </button>
            </>
          )}
          <button onClick={openAddFeature}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-brand-gold text-gray-900 font-medium hover:bg-brand-gold-dark">
            <Plus className="w-3.5 h-3.5" /> Add Feature
          </button>
        </div>
      </div>

      {/* Quota legend */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-brand-text-muted">
          <span className="text-brand-text">Toggle</span> — cell is on/off. Leave Quota blank.
          &nbsp;·&nbsp;
          <span className="text-brand-text">Quota</span> — enter a number for count-limited features
          (e.g. 10 posters/month). <span className="font-mono">-1</span> = unlimited,
          <span className="font-mono"> 0</span> = listed but denied.
        </div>
      </div>

      {/* Grid */}
      {activePlans.length === 0 ? (
        <EmptyState message="No active plans — add plans on Subscription Plans page first" />
      ) : matrix.features.length === 0 ? (
        <EmptyState message="No features defined yet — click Add Feature to create one" />
      ) : (
        <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead className="sticky top-0 bg-brand-dark-card z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-brand-text-muted border-b border-brand-dark-border w-72 min-w-[288px]">
                    Feature
                  </th>
                  {activePlans.map(p => (
                    <th key={p.id} className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-brand-text border-b border-brand-dark-border min-w-[150px]">
                      <div className="text-brand-gold">{p.name}</div>
                      <div className="text-[10px] text-brand-text-muted mt-0.5 normal-case">{p.slug}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grouped.map(g => (
                  <FeatureGroup
                    key={g.key} label={g.label}
                    features={g.features} plans={activePlans}
                    resolvedCell={resolvedCell}
                    updateCell={updateCell}
                    onEditFeature={openEditFeature}
                    onDeleteFeature={setDeleteFeature}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Feature form modal */}
      <Modal isOpen={featureModalOpen}
             onClose={() => { setFeatureModalOpen(false); setFeatureForm(EMPTY_FEATURE) }}
             title={featureForm.id ? `Edit feature: ${featureForm.name}` : 'Add Feature'}
             size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name *">
              <input value={featureForm.name}
                     onChange={e => setFeatureForm(f => ({
                       ...f, name: e.target.value,
                       slug: f.id ? f.slug : toSlug(e.target.value),
                     }))}
                     className={inputCls} />
            </Field>
            <Field label="Slug *">
              <input value={featureForm.slug}
                     onChange={e => setFeatureForm(f => ({ ...f, slug: e.target.value }))}
                     className={inputCls} />
            </Field>
          </div>
          <Field label="Category">
            <select value={featureForm.category}
                    onChange={e => setFeatureForm(f => ({ ...f, category: e.target.value }))}
                    className={inputCls}>
              {CATEGORY_ORDER.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Description (shown in tooltip + user-facing paywall)">
            <textarea value={featureForm.description}
                      onChange={e => setFeatureForm(f => ({ ...f, description: e.target.value }))}
                      rows={3} className={`${inputCls} min-h-[80px]`} />
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Icon (Lucide name, optional)">
              <input value={featureForm.icon} placeholder="e.g. sparkles"
                     onChange={e => setFeatureForm(f => ({ ...f, icon: e.target.value }))}
                     className={inputCls} />
            </Field>
            <Field label="Sort order">
              <input type="number" value={featureForm.sort_order}
                     onChange={e => setFeatureForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                     className={inputCls} />
            </Field>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={featureForm.is_active}
                       onChange={e => setFeatureForm(f => ({ ...f, is_active: e.target.checked }))}
                       className="rounded accent-brand-gold" />
                <span className="text-sm text-brand-text">Active</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-brand-dark-border">
            <button onClick={() => { setFeatureModalOpen(false); setFeatureForm(EMPTY_FEATURE) }}
                    className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border">
              Cancel
            </button>
            <button onClick={submitFeature} disabled={featureBusy}
                    className="px-4 py-2 text-sm rounded-lg bg-brand-gold text-gray-900 font-medium hover:bg-brand-gold-dark disabled:opacity-60">
              {featureBusy ? 'Saving…' : featureForm.id ? 'Save changes' : 'Create feature'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteFeature}
        onClose={() => setDeleteFeature(null)}
        onConfirm={handleDeleteFeature}
        title="Delete feature"
        message={`Delete "${deleteFeature?.name}"? All plan mappings for this feature will be removed. This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────

function FeatureGroup({
  label, features, plans, resolvedCell, updateCell,
  onEditFeature, onDeleteFeature,
}: {
  label: string
  features: Feature[]
  plans: Plan[]
  resolvedCell: (planId: number, featureId: number) => CellEdit
  updateCell: (planId: number, featureId: number, patch: Partial<CellEdit>) => void
  onEditFeature: (f: Feature) => void
  onDeleteFeature: (f: Feature) => void
}) {
  return (
    <>
      <tr className="bg-brand-dark/60">
        <td colSpan={plans.length + 1}
            className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-brand-gold border-b border-brand-dark-border">
          {label}
        </td>
      </tr>
      {features.map(f => (
        <tr key={f.id} className="border-b border-brand-dark-border/30 hover:bg-brand-dark-hover/20">
          <td className="px-4 py-3 sticky left-0 bg-brand-dark-card border-r border-brand-dark-border/50">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-brand-text text-sm flex items-center gap-1.5">
                  {f.name}
                  {!f.is_active && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-600/30 text-neutral-400 font-normal">
                      INACTIVE
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-brand-text-muted font-mono truncate">{f.slug}</div>
                {f.description && (
                  <div className="text-[11px] text-brand-text-muted mt-1 line-clamp-2">{f.description}</div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => onEditFeature(f)}
                        title="Edit feature"
                        className="p-1 text-brand-text-muted hover:text-brand-gold rounded">
                  <Pencil className="w-3 h-3" />
                </button>
                <button onClick={() => onDeleteFeature(f)}
                        title="Delete feature"
                        className="p-1 text-brand-text-muted hover:text-red-400 rounded">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </td>
          {plans.map(p => {
            const cell = resolvedCell(p.id, f.id)
            return (
              <td key={p.id} className="px-3 py-3 text-center border-r border-brand-dark-border/30 last:border-r-0">
                <CellEditor cell={cell}
                            onChange={patch => updateCell(p.id, f.id, patch)} />
              </td>
            )
          })}
        </tr>
      ))}
    </>
  )
}

function CellEditor({ cell, onChange }: { cell: CellEdit; onChange: (patch: Partial<CellEdit>) => void }) {
  const [quotaDraft, setQuotaDraft] = useState(cell.quota == null ? '' : String(cell.quota))

  // Keep local draft in sync if parent cell changes externally
  useEffect(() => {
    setQuotaDraft(cell.quota == null ? '' : String(cell.quota))
  }, [cell.quota])

  const commitQuota = (raw: string) => {
    if (raw.trim() === '') {
      onChange({ quota: null })
      return
    }
    const n = Number(raw)
    if (isNaN(n)) return
    onChange({ quota: n })
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        onClick={() => onChange({ enabled: !cell.enabled })}
        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
          cell.enabled
            ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
            : 'bg-neutral-600/20 text-neutral-500 hover:bg-neutral-600/30'
        }`}
      >
        {cell.enabled ? <Check className="w-4 h-4" /> : <XIcon className="w-4 h-4" />}
      </button>
      <input
        value={quotaDraft}
        onChange={e => setQuotaDraft(e.target.value)}
        onBlur={e => commitQuota(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
        placeholder="—"
        title="Quota: blank = none, -1 = unlimited, 0 = explicit zero, >0 = count"
        className="w-14 bg-brand-dark border border-brand-dark-border rounded px-1.5 py-0.5 text-[11px] text-center text-brand-text focus:outline-none focus:border-brand-gold/50"
      />
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <Grid className="w-10 h-10 text-brand-text-muted/40" />
      <div className="text-sm text-brand-text-muted max-w-md">{message}</div>
    </div>
  )
}

const inputCls = 'w-full bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50'

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-brand-text-muted mb-1.5">{label}</label>
      {children}
    </div>
  )
}
