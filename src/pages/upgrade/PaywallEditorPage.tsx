import { useEffect, useMemo, useState } from 'react'
import {
  Sparkles, Plus, Pencil, Trash2, Eye, PlayCircle,
  CheckCircle2, Tag, Clock, ImageIcon,
  Copy, X as XIcon, Smartphone,
} from 'lucide-react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Pagination } from '../../components/ui/Pagination'
import { SearchInput } from '../../components/ui/SearchInput'
import { paywallContentApi, plansApi, type PaywallContent } from '../../services/admin-api'
import { useAdminPaginatedCrud } from '../../hooks/useAdminPaginatedCrud'
import { useToast } from '../../context/ToastContext'
import { formatDate } from '../../utils/formatters'
import type { SubscriptionPlan } from '../../types'

const SURFACES: Array<{ value: string; label: string }> = [
  { value: 'global',     label: 'Global default' },
  { value: 'ai_tools',   label: 'AI Tools' },
  { value: 'home',       label: 'Home' },
  { value: 'visit_card', label: 'Visit Card' },
  { value: 'greeting',   label: 'Greeting' },
  { value: 'caption',    label: 'Caption' },
  { value: 'export',     label: 'Export' },
  { value: 'frames',     label: 'Frames' },
]

interface FormState {
  surface: string
  name: string
  headline: string
  subheadline: string
  hero_image_url: string
  badge_text: string
  feature_bullets: Array<{ icon: string; text: string }>
  cta_text: string
  default_selected_plan_slug: string
  is_active: boolean
  active_from: string
  active_until: string
}

const EMPTY: FormState = {
  surface: 'global',
  name: '',
  headline: 'Unlock Premium',
  subheadline: '',
  hero_image_url: '',
  badge_text: '',
  feature_bullets: [{ icon: 'sparkles', text: 'Unlimited AI generations' }],
  cta_text: 'Upgrade Now',
  default_selected_plan_slug: '',
  is_active: false,
  active_from: '',
  active_until: '',
}

export default function PaywallEditorPage() {
  const { addToast } = useToast()
  const { data, loading, page, totalPages, totalCount, search, setPage, setSearch, create, update, remove, refresh } =
    useAdminPaginatedCrud<PaywallContent>(paywallContentApi)

  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  useEffect(() => { plansApi.list({ page_size: 200 }).then(setPlans as (x: unknown) => void).catch(() => {}) }, [])

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)

  const [previewItem, setPreviewItem] = useState<PaywallContent | FormState | null>(null)
  const [deleteItem, setDeleteItem] = useState<PaywallContent | null>(null)

  const surfaceLabel = useMemo(() => {
    const m = new Map<string, string>()
    SURFACES.forEach(s => m.set(s.value, s.label))
    return m
  }, [])

  const openAdd = () => { setEditingId(null); setForm(EMPTY); setModalOpen(true) }

  const openEdit = (c: PaywallContent) => {
    setEditingId(c.id)
    setForm({
      surface: c.surface, name: c.name,
      headline: c.headline, subheadline: c.subheadline,
      hero_image_url: c.hero_image_url, badge_text: c.badge_text,
      feature_bullets: Array.isArray(c.feature_bullets) ? c.feature_bullets : [],
      cta_text: c.cta_text,
      default_selected_plan_slug: c.default_selected_plan_slug,
      is_active: c.is_active,
      active_from: c.active_from?.slice(0, 16) ?? '',
      active_until: c.active_until?.slice(0, 16) ?? '',
    })
    setModalOpen(true)
  }

  const onSubmit = async () => {
    if (!form.name.trim()) { addToast('Name required', 'error'); return }
    if (!form.headline.trim()) { addToast('Headline required', 'error'); return }
    const payload = {
      ...form,
      active_from: form.active_from || null,
      active_until: form.active_until || null,
    }
    try {
      if (editingId) { await update(editingId, payload); addToast('Variant updated') }
      else            { await create(payload);           addToast('Variant created') }
      setModalOpen(false); setForm(EMPTY); setEditingId(null)
    } catch { addToast('Save failed', 'error') }
  }

  const onActivate = async (c: PaywallContent) => {
    try {
      await paywallContentApi.activate(c.id)
      addToast(`Activated ${c.name} — other ${surfaceLabel.get(c.surface)} variants deactivated`)
      refresh()
    } catch { addToast('Activate failed', 'error') }
  }

  const onDuplicate = async (c: PaywallContent) => {
    try {
      const copy = { ...c } as Record<string, unknown>
      delete copy.id
      delete copy.created_at
      delete copy.updated_at
      delete copy.created_by
      copy.name = `${c.name} (copy)`
      copy.is_active = false
      await create(copy as Partial<PaywallContent>)
      addToast('Duplicated — inactive by default')
    } catch { addToast('Duplicate failed', 'error') }
  }

  const columns: Column<PaywallContent>[] = [
    {
      key: 'is_active', title: '',
      render: c => c.is_active
        ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        : <span className="w-4 h-4 block rounded-full border border-neutral-600" />,
    },
    { key: 'name', title: 'Variant',
      render: c => (
        <div>
          <div className="font-medium text-brand-text">{c.name}</div>
          <div className="text-[11px] text-brand-text-muted truncate max-w-xs">{c.headline}</div>
        </div>
      ),
    },
    { key: 'surface', title: 'Surface',
      render: c => (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-brand-dark-hover text-brand-text">
          {c.surface_display ?? surfaceLabel.get(c.surface) ?? c.surface}
        </span>
      ),
    },
    { key: 'badge_text', title: 'Badge',
      render: c => c.badge_text
        ? <span className="text-xs px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 font-medium">{c.badge_text}</span>
        : <span className="text-brand-text-muted text-xs">—</span> },
    { key: 'feature_bullets', title: 'Features',
      render: c => (
        <span className="text-xs text-brand-text-muted">
          {(c.feature_bullets?.length ?? 0)} bullets
        </span>
      ),
    },
    { key: 'active_until', title: 'Window',
      render: c => {
        if (!c.active_from && !c.active_until) return <span className="text-brand-text-muted text-xs">Always</span>
        return (
          <div className="text-[11px] text-brand-text-muted">
            {c.active_from && <div>From {formatDate(c.active_from)}</div>}
            {c.active_until && <div>Until {formatDate(c.active_until)}</div>}
          </div>
        )
      },
    },
    {
      key: 'actions', title: 'Actions',
      render: c => (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <button onClick={() => setPreviewItem(c)} title="Live preview"
                  className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-gold">
            <Eye className="w-4 h-4" />
          </button>
          {!c.is_active && (
            <button onClick={() => onActivate(c)} title="Activate (deactivates siblings)"
                    className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-emerald-400">
              <PlayCircle className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => openEdit(c)} title="Edit"
                  className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-gold">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={() => onDuplicate(c)} title="Duplicate"
                  className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-gold">
            <Copy className="w-4 h-4" />
          </button>
          <button onClick={() => setDeleteItem(c)} title="Delete"
                  className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-red-400">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-text flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-brand-gold" /> Paywall Editor
          </h1>
          <p className="text-sm text-brand-text-muted mt-0.5">
            {totalCount} variants · {data.filter(c => c.is_active).length} active
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name / headline / badge…" className="w-64" />
          <button onClick={openAdd}
                  className="flex items-center gap-1.5 px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark">
            <Plus className="w-4 h-4" /> Add variant
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading…</div>
      ) : (
        <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
          <DataTable columns={columns} data={data} />
          <Pagination currentPage={page} totalPages={totalPages} totalCount={totalCount} onPageChange={setPage} />
        </div>
      )}

      {/* Form modal — SPLIT layout: form left, live preview right */}
      <Modal isOpen={modalOpen}
             onClose={() => { setModalOpen(false); setForm(EMPTY); setEditingId(null) }}
             title={editingId ? 'Edit paywall variant' : 'Add paywall variant'}
             size="2xl">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* LEFT — form */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Surface *">
                <select value={form.surface}
                        onChange={e => setForm(f => ({ ...f, surface: e.target.value }))}
                        className={inputCls}>
                  {SURFACES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </Field>
              <Field label="Internal name *">
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                       placeholder="e.g. Diwali 2026" className={inputCls} />
              </Field>
            </div>
            <Field label="Headline *">
              <input value={form.headline}
                     onChange={e => setForm(f => ({ ...f, headline: e.target.value }))}
                     className={inputCls} />
            </Field>
            <Field label="Sub-headline">
              <textarea value={form.subheadline}
                        onChange={e => setForm(f => ({ ...f, subheadline: e.target.value }))}
                        rows={2} className={`${inputCls} min-h-[60px]`} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Badge text (optional)">
                <input value={form.badge_text}
                       onChange={e => setForm(f => ({ ...f, badge_text: e.target.value }))}
                       placeholder="LIMITED OFFER" className={inputCls} />
              </Field>
              <Field label="CTA button text">
                <input value={form.cta_text}
                       onChange={e => setForm(f => ({ ...f, cta_text: e.target.value }))}
                       className={inputCls} />
              </Field>
            </div>
            <Field label="Hero image URL (optional)">
              <input value={form.hero_image_url}
                     onChange={e => setForm(f => ({ ...f, hero_image_url: e.target.value }))}
                     placeholder="https://..." className={inputCls} />
            </Field>

            <Field label="Feature bullets">
              <FeatureBulletsEditor bullets={form.feature_bullets}
                                     onChange={b => setForm(f => ({ ...f, feature_bullets: b }))} />
            </Field>

            <Field label="Default-selected plan (optional)">
              <select value={form.default_selected_plan_slug}
                      onChange={e => setForm(f => ({ ...f, default_selected_plan_slug: e.target.value }))}
                      className={inputCls}>
                <option value="">— none (let user pick) —</option>
                {plans.map(p => <option key={p.id} value={p.slug}>{p.name} ({p.slug})</option>)}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Active from (optional)">
                <input type="datetime-local" value={form.active_from}
                       onChange={e => setForm(f => ({ ...f, active_from: e.target.value }))}
                       className={inputCls} />
              </Field>
              <Field label="Active until (optional)">
                <input type="datetime-local" value={form.active_until}
                       onChange={e => setForm(f => ({ ...f, active_until: e.target.value }))}
                       className={inputCls} />
              </Field>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_active}
                     onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                     className="rounded accent-brand-gold" />
              <span className="text-sm text-brand-text">Active now (becomes live immediately)</span>
            </label>
          </div>

          {/* RIGHT — live preview */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-brand-text-muted mb-2 flex items-center gap-1.5">
              <Smartphone className="w-3 h-3" /> Live preview
            </div>
            <PhonePreview content={form} />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-5 mt-5 border-t border-brand-dark-border">
          <button onClick={() => { setModalOpen(false); setForm(EMPTY); setEditingId(null) }}
                  className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border">
            Cancel
          </button>
          <button onClick={onSubmit}
                  className="px-4 py-2 text-sm rounded-lg bg-brand-gold text-gray-900 font-medium hover:bg-brand-gold-dark">
            {editingId ? 'Save changes' : 'Create variant'}
          </button>
        </div>
      </Modal>

      {/* Standalone preview modal */}
      <Modal isOpen={!!previewItem} onClose={() => setPreviewItem(null)}
             title={previewItem && 'name' in previewItem ? previewItem.name : 'Preview'} size="md">
        {previewItem && <PhonePreview content={previewItem} />}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={async () => {
          if (!deleteItem) return
          try { await remove(deleteItem.id); addToast('Deleted'); setDeleteItem(null) }
          catch { addToast('Delete failed', 'error') }
        }}
        title="Delete paywall variant"
        message={`Delete "${deleteItem?.name}"? If this was the active variant, the ${surfaceLabel.get(deleteItem?.surface ?? '')} surface will fall back to the global variant.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  )
}

// ── Phone preview ──────────────────────────────────────────
function PhonePreview({ content }: { content: FormState | PaywallContent }) {
  return (
    <div className="relative mx-auto w-full max-w-[320px] rounded-[2rem] border-[10px] border-neutral-900 bg-neutral-900 shadow-2xl">
      {/* Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-neutral-900 rounded-b-2xl z-20" />
      <div className="rounded-[1.3rem] overflow-hidden bg-gradient-to-b from-brand-dark to-brand-dark-card h-[480px] overflow-y-auto">
        {/* Badge */}
        {content.badge_text && (
          <div className="flex justify-center pt-6">
            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-brand-gold text-gray-900">
              {content.badge_text}
            </span>
          </div>
        )}

        {/* Hero image */}
        {content.hero_image_url ? (
          <img src={content.hero_image_url} alt="" className="w-full h-28 object-cover mt-3" />
        ) : (
          <div className="w-full h-28 mt-3 bg-gradient-to-br from-brand-gold/20 to-brand-gold/5 flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-brand-gold/40" />
          </div>
        )}

        {/* Headline + sub */}
        <div className="px-5 pt-4 pb-3 text-center">
          <div className="text-lg font-bold text-brand-text leading-tight">
            {content.headline || 'Your headline'}
          </div>
          {content.subheadline && (
            <div className="text-xs text-brand-text-muted mt-1.5">{content.subheadline}</div>
          )}
        </div>

        {/* Bullets */}
        {content.feature_bullets.length > 0 && (
          <div className="px-5 pb-4 space-y-2">
            {content.feature_bullets.map((b, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-brand-text">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{b.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Plan preview card */}
        <div className="px-4 pb-3">
          <div className="rounded-lg border border-brand-gold/30 bg-brand-gold/10 p-3">
            <div className="text-[10px] uppercase tracking-wider text-brand-gold">Recommended plan</div>
            <div className="text-sm font-semibold text-brand-text mt-0.5">
              {content.default_selected_plan_slug || '(let user choose)'}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="px-5 pb-6">
          <button className="w-full py-2.5 rounded-lg bg-brand-gold text-gray-900 text-sm font-semibold">
            {content.cta_text || 'Continue'}
          </button>
          <button className="w-full py-2 text-[11px] text-brand-text-muted mt-1">
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}

function FeatureBulletsEditor({
  bullets, onChange,
}: {
  bullets: Array<{ icon: string; text: string }>
  onChange: (b: Array<{ icon: string; text: string }>) => void
}) {
  return (
    <div className="space-y-2">
      {bullets.map((b, i) => (
        <div key={i} className="flex items-center gap-2 p-2 bg-brand-dark/50 border border-brand-dark-border rounded-lg">
          <input value={b.icon}
                 placeholder="icon"
                 onChange={e => {
                   const next = [...bullets]; next[i] = { ...b, icon: e.target.value }; onChange(next)
                 }}
                 className="w-24 bg-transparent text-[11px] font-mono text-brand-text-muted focus:outline-none" />
          <input value={b.text}
                 placeholder="Feature text"
                 onChange={e => {
                   const next = [...bullets]; next[i] = { ...b, text: e.target.value }; onChange(next)
                 }}
                 className="flex-1 bg-transparent text-sm text-brand-text focus:outline-none" />
          <button onClick={() => onChange(bullets.filter((_, j) => j !== i))}
                  className="p-1 text-brand-text-muted hover:text-red-400">
            <XIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button onClick={() => onChange([...bullets, { icon: 'check', text: '' }])}
              className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border">
        <Plus className="w-3 h-3" /> Add bullet
      </button>
    </div>
  )
}

// ── Helpers ─────────────────────────────────────────────
const inputCls = 'w-full bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50'

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-brand-text-muted mb-1.5">{label}</label>
      {children}
    </div>
  )
}

// unused vars guard for lint
void Tag; void Clock
