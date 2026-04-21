import { useState } from 'react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Pagination } from '../../components/ui/Pagination'
import { SearchInput } from '../../components/ui/SearchInput'
import { plansApi } from '../../services/admin-api'
import { useAdminPaginatedCrud } from '../../hooks/useAdminPaginatedCrud'
import { useToast } from '../../context/ToastContext'
import {
  Pencil, Trash2, Copy, GripVertical, Plus, X as XIcon,
  Gift, Zap, CreditCard, Award,
} from 'lucide-react'
import { formatCurrency } from '../../utils/formatters'
import type { SubscriptionPlan, SubscriptionDuration, AudioLevel, LogoLevel } from '../../types'

interface FormState {
  // Basics
  name: string
  slug: string
  description: string
  sort_order: number
  is_active: boolean
  is_trial: boolean

  // Pricing
  price: number
  price_original: number
  duration: SubscriptionDuration
  duration_days: number
  price_per_image_text: string
  countdown_end_datetime: string  // ISO string or ''
  gift_description: string

  // Features (content / marketing bullets)
  features: string[]

  // Limits & Gating
  credits_included: number
  remove_bg_credits: number
  image_video_credits: number
  frames_count: number
  is_unlimited_content: boolean
  audio_jingles: AudioLevel
  free_logos: LogoLevel
  has_whatsapp_stickers: boolean
  has_digital_business_cards: boolean
  has_desktop_access: boolean
  has_social_captions: boolean
  has_dedicated_support: boolean
}

const emptyForm: FormState = {
  name: '', slug: '', description: '', sort_order: 0,
  is_active: true, is_trial: false,
  price: 0, price_original: 0,
  duration: 'monthly', duration_days: 30,
  price_per_image_text: '', countdown_end_datetime: '', gift_description: '',
  features: [],
  credits_included: 0, remove_bg_credits: 0, image_video_credits: 0,
  frames_count: 0, is_unlimited_content: false,
  audio_jingles: 'none', free_logos: 'none',
  has_whatsapp_stickers: false, has_digital_business_cards: false,
  has_desktop_access: false, has_social_captions: false,
  has_dedicated_support: false,
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

type TabKey = 'basics' | 'pricing' | 'features' | 'limits'

export default function PlanListPage() {
  const { addToast } = useToast()
  const { data, loading, page, totalPages, totalCount, search, setPage, setSearch, create, update, remove, refresh } =
    useAdminPaginatedCrud<SubscriptionPlan>(plansApi)

  const [modalOpen, setModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('basics')
  const [editingItem, setEditingItem] = useState<SubscriptionPlan | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<SubscriptionPlan | null>(null)

  const openAdd = () => {
    setEditingItem(null)
    setForm(emptyForm)
    setActiveTab('basics')
    setModalOpen(true)
  }

  const openEdit = (item: SubscriptionPlan) => {
    setEditingItem(item)
    setForm({
      name: item.name, slug: item.slug,
      description: item.description, sort_order: item.sort_order,
      is_active: item.is_active, is_trial: item.is_trial,
      price: Number(item.price), price_original: Number(item.price_original),
      duration: item.duration, duration_days: item.duration_days,
      price_per_image_text: item.price_per_image_text ?? '',
      countdown_end_datetime: item.countdown_end_datetime ?? '',
      gift_description: item.gift_description ?? '',
      features: Array.isArray(item.features) ? item.features : [],
      credits_included: item.credits_included,
      remove_bg_credits: item.remove_bg_credits,
      image_video_credits: item.image_video_credits,
      frames_count: item.frames_count,
      is_unlimited_content: item.is_unlimited_content,
      audio_jingles: item.audio_jingles,
      free_logos: item.free_logos,
      has_whatsapp_stickers: item.has_whatsapp_stickers,
      has_digital_business_cards: item.has_digital_business_cards,
      has_desktop_access: item.has_desktop_access,
      has_social_captions: item.has_social_captions,
      has_dedicated_support: item.has_dedicated_support,
    })
    setActiveTab('basics')
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) { addToast('Name is required', 'error'); return }
    // Normalise countdown: empty string → null for backend DateTimeField
    const payload = {
      ...form,
      countdown_end_datetime: form.countdown_end_datetime || null,
    }
    try {
      if (editingItem) {
        await update(editingItem.id, payload)
        addToast('Plan updated')
      } else {
        await create(payload)
        addToast('Plan created')
      }
      setForm(emptyForm); setEditingItem(null); setModalOpen(false)
    } catch {
      addToast('Operation failed', 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    try {
      await remove(deleteItem.id)
      addToast('Plan deleted')
      setDeleteItem(null)
    } catch {
      addToast('Delete failed', 'error')
    }
  }

  const handleToggleActive = async (item: SubscriptionPlan) => {
    try {
      await update(item.id, { is_active: !item.is_active })
      addToast(item.is_active ? 'Plan deactivated' : 'Plan activated')
    } catch {
      addToast('Toggle failed', 'error')
    }
  }

  const handleDuplicate = async (item: SubscriptionPlan) => {
    try {
      await plansApi.duplicate(item.id)
      addToast(`"${item.name}" duplicated (inactive — activate when ready)`)
      refresh()
    } catch {
      addToast('Duplicate failed', 'error')
    }
  }

  // ── Columns ─────────────────────────────────────────────────────

  const columns: Column<SubscriptionPlan>[] = [
    {
      key: 'sort_order', title: '', sortable: false,
      render: () => <GripVertical className="w-4 h-4 text-brand-text-muted/60 cursor-grab" />,
    },
    { key: 'name', title: 'Plan', sortable: true,
      render: p => (
        <div className="flex flex-col">
          <span className="font-medium text-brand-text">
            {p.name}
            {p.is_trial && <span className="ml-2 px-1.5 py-0.5 text-[10px] rounded bg-emerald-500/15 text-emerald-400 font-medium">TRIAL</span>}
          </span>
          <span className="text-[11px] text-brand-text-muted">{p.slug}</span>
        </div>
      ),
    },
    { key: 'price', title: 'Price', sortable: true,
      render: p => (
        <div className="flex flex-col">
          <span className="text-brand-text font-medium">{formatCurrency(Number(p.price))}</span>
          {Number(p.price_original) > Number(p.price) && (
            <span className="text-[11px] text-brand-text-muted line-through">
              {formatCurrency(Number(p.price_original))}
            </span>
          )}
        </div>
      ),
    },
    { key: 'duration', title: 'Duration', sortable: true,
      render: p => <span className="capitalize">{p.duration}</span> },
    { key: 'credits_included', title: 'Credits', sortable: true,
      render: p => (
        <div className="flex items-center gap-1 text-xs">
          <Zap className="w-3 h-3 text-brand-gold" /> {p.credits_included}
        </div>
      ),
    },
    { key: 'subscriber_count', title: 'Subs',
      render: p => (
        <span className="text-sm text-brand-text">{p.subscriber_count ?? 0}</span>
      ),
    },
    {
      key: 'is_active', title: 'Status',
      render: p => (
        <button
          onClick={e => { e.stopPropagation(); handleToggleActive(p) }}
          className={`px-2 py-1 rounded-full text-[11px] font-medium transition-colors ${
            p.is_active
              ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
              : 'bg-neutral-600/30 text-neutral-400 hover:bg-neutral-600/50'
          }`}
        >
          {p.is_active ? 'Active' : 'Inactive'}
        </button>
      ),
    },
    {
      key: 'actions', title: 'Actions',
      render: p => (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <IconBtn icon={Pencil} label="Edit" onClick={() => openEdit(p)} />
          <IconBtn icon={Copy} label="Duplicate" onClick={() => handleDuplicate(p)} />
          <IconBtn icon={Trash2} label="Delete" danger onClick={() => setDeleteItem(p)} />
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Subscription Plans</h1>
          <p className="text-sm text-brand-text-muted mt-0.5">{totalCount} plans configured</p>
        </div>
        <div className="flex items-center gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search plans…" className="w-64" />
          <button onClick={openAdd}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">
            <Plus className="w-4 h-4" /> Add Plan
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading…</div>
      ) : (
        <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
          <DataTable columns={columns} data={data} onRowClick={openEdit} />
          <Pagination currentPage={page} totalPages={totalPages} totalCount={totalCount} onPageChange={setPage} />
        </div>
      )}

      {/* Plan form modal with tabs */}
      <Modal isOpen={modalOpen}
             onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false) }}
             title={editingItem ? `Edit ${editingItem.name}` : 'Add Plan'} size="2xl">
        <TabNav activeTab={activeTab} onChange={setActiveTab} />

        {/* Tab: Basics */}
        {activeTab === 'basics' && (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Name *">
                <input value={form.name}
                       onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: editingItem ? f.slug : toSlug(e.target.value) }))}
                       className={inputCls} />
              </Field>
              <Field label="Slug *">
                <input value={form.slug}
                       onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                       className={inputCls} />
              </Field>
            </div>
            <Field label="Description">
              <textarea value={form.description}
                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        rows={3} className={`${inputCls} min-h-[80px]`} />
            </Field>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Sort order">
                <input type="number" value={form.sort_order}
                       onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                       className={inputCls} />
              </Field>
              <CheckField label="Active" checked={form.is_active}
                          onChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <CheckField label="Mark as trial plan"
                          checked={form.is_trial}
                          onChange={v => setForm(f => ({ ...f, is_trial: v }))} />
            </div>
          </div>
        )}

        {/* Tab: Pricing */}
        {activeTab === 'pricing' && (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Price (₹) *">
                <input type="number" step="0.01" value={form.price}
                       onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))}
                       className={inputCls} />
              </Field>
              <Field label="Original / strikethrough price (₹)">
                <input type="number" step="0.01" value={form.price_original}
                       onChange={e => setForm(f => ({ ...f, price_original: Number(e.target.value) }))}
                       className={inputCls} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Duration">
                <select value={form.duration}
                        onChange={e => setForm(f => ({ ...f, duration: e.target.value as SubscriptionDuration }))}
                        className={inputCls}>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </Field>
              <Field label="Duration in days *">
                <input type="number" value={form.duration_days}
                       onChange={e => setForm(f => ({ ...f, duration_days: Number(e.target.value) }))}
                       className={inputCls} />
              </Field>
            </div>
            <Field label="Per-image text (e.g. '₹5.47 / Image')">
              <input value={form.price_per_image_text}
                     onChange={e => setForm(f => ({ ...f, price_per_image_text: e.target.value }))}
                     className={inputCls} />
            </Field>
            <Field label="Sale countdown end (optional) — shows a timer on the plan card">
              <input type="datetime-local" value={form.countdown_end_datetime}
                     onChange={e => setForm(f => ({ ...f, countdown_end_datetime: e.target.value }))}
                     className={inputCls} />
            </Field>
            <Field label={<span className="flex items-center gap-1.5"><Gift className="w-3.5 h-3.5 text-brand-gold"/>Gift description (shown on plan detail)</span>}>
              <input value={form.gift_description}
                     onChange={e => setForm(f => ({ ...f, gift_description: e.target.value }))}
                     placeholder="e.g. Free premium frames worth ₹499"
                     className={inputCls} />
            </Field>
          </div>
        )}

        {/* Tab: Features */}
        {activeTab === 'features' && (
          <div className="space-y-3 pt-2">
            <div className="text-xs text-brand-text-muted">
              Marketing bullet points displayed on the plan card in the Android app.
              Order matters — drag handle coming in Phase 3.
            </div>
            <FeaturesEditor features={form.features}
                            onChange={features => setForm(f => ({ ...f, features }))} />
          </div>
        )}

        {/* Tab: Limits & Gating */}
        {activeTab === 'limits' && (
          <div className="space-y-5 pt-2">
            <SectionHeader icon={Zap} title="Credits & counts" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="AI credits included">
                <input type="number" value={form.credits_included}
                       onChange={e => setForm(f => ({ ...f, credits_included: Number(e.target.value) }))}
                       className={inputCls} />
              </Field>
              <Field label="BG-removal credits">
                <input type="number" value={form.remove_bg_credits}
                       onChange={e => setForm(f => ({ ...f, remove_bg_credits: Number(e.target.value) }))}
                       className={inputCls} />
              </Field>
              <Field label="Image & video credits (0 = unlimited)">
                <input type="number" value={form.image_video_credits}
                       onChange={e => setForm(f => ({ ...f, image_video_credits: Number(e.target.value) }))}
                       className={inputCls} />
              </Field>
              <Field label="Frame count (0 = unlimited)">
                <input type="number" value={form.frames_count}
                       onChange={e => setForm(f => ({ ...f, frames_count: Number(e.target.value) }))}
                       className={inputCls} />
              </Field>
            </div>
            <CheckField label="Unlimited images & videos (overrides image_video_credits)"
                        checked={form.is_unlimited_content}
                        onChange={v => setForm(f => ({ ...f, is_unlimited_content: v }))} />

            <SectionHeader icon={CreditCard} title="Levels" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Audio jingles">
                <select value={form.audio_jingles}
                        onChange={e => setForm(f => ({ ...f, audio_jingles: e.target.value as AudioLevel }))}
                        className={inputCls}>
                  <option value="none">None</option>
                  <option value="limited">Limited</option>
                  <option value="unlimited">Unlimited</option>
                </select>
              </Field>
              <Field label="Free logos">
                <select value={form.free_logos}
                        onChange={e => setForm(f => ({ ...f, free_logos: e.target.value as LogoLevel }))}
                        className={inputCls}>
                  <option value="none">None</option>
                  <option value="limited">Limited</option>
                  <option value="unlimited">Unlimited</option>
                </select>
              </Field>
            </div>

            <SectionHeader icon={Award} title="Feature toggles" />
            <div className="grid grid-cols-2 gap-3">
              <CheckField label="WhatsApp stickers"
                          checked={form.has_whatsapp_stickers}
                          onChange={v => setForm(f => ({ ...f, has_whatsapp_stickers: v }))} />
              <CheckField label="Digital business cards"
                          checked={form.has_digital_business_cards}
                          onChange={v => setForm(f => ({ ...f, has_digital_business_cards: v }))} />
              <CheckField label="Desktop access"
                          checked={form.has_desktop_access}
                          onChange={v => setForm(f => ({ ...f, has_desktop_access: v }))} />
              <CheckField label="AI social captions"
                          checked={form.has_social_captions}
                          onChange={v => setForm(f => ({ ...f, has_social_captions: v }))} />
              <CheckField label="Dedicated support"
                          checked={form.has_dedicated_support}
                          onChange={v => setForm(f => ({ ...f, has_dedicated_support: v }))} />
            </div>
          </div>
        )}

        {/* Footer buttons */}
        <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-brand-dark-border">
          <button onClick={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false) }}
                  className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border">
            Cancel
          </button>
          <button onClick={handleSubmit}
                  className="px-4 py-2 text-sm rounded-lg bg-brand-gold text-gray-900 font-medium hover:bg-brand-gold-dark">
            {editingItem ? 'Save changes' : 'Create plan'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        title="Delete plan"
        message={`Delete "${deleteItem?.name}"? Users already subscribed to this plan keep their benefits until expiry (existing subscriptions are NOT affected). This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────

const inputCls = 'w-full bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50'

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-brand-text-muted mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function CheckField({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input type="checkbox" checked={checked}
             onChange={e => onChange(e.target.checked)}
             className="rounded accent-brand-gold" />
      <span className="text-sm text-brand-text">{label}</span>
    </label>
  )
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 pt-2 pb-1 border-b border-brand-dark-border">
      <Icon className="w-3.5 h-3.5 text-brand-gold" />
      <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-text-muted">{title}</span>
    </div>
  )
}

function TabNav({ activeTab, onChange }: { activeTab: TabKey; onChange: (t: TabKey) => void }) {
  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'basics',   label: 'Basics' },
    { key: 'pricing',  label: 'Pricing' },
    { key: 'features', label: 'Features' },
    { key: 'limits',   label: 'Limits & Gating' },
  ]
  return (
    <div className="flex gap-1 border-b border-brand-dark-border mb-4 -mx-6 px-6">
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === t.key
                    ? 'border-brand-gold text-brand-gold'
                    : 'border-transparent text-brand-text-muted hover:text-brand-text'
                }`}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

function FeaturesEditor({ features, onChange }: {
  features: string[]
  onChange: (features: string[]) => void
}) {
  const [draft, setDraft] = useState('')
  const addFeature = () => {
    const v = draft.trim()
    if (!v) return
    onChange([...features, v])
    setDraft('')
  }
  return (
    <div className="space-y-2">
      {features.map((f, i) => (
        <div key={i} className="flex items-center gap-2 p-2 bg-brand-dark/50 border border-brand-dark-border rounded-lg">
          <span className="text-brand-gold">•</span>
          <input value={f}
                 onChange={e => {
                   const next = [...features]
                   next[i] = e.target.value
                   onChange(next)
                 }}
                 className="flex-1 bg-transparent text-sm text-brand-text focus:outline-none" />
          <button onClick={() => onChange(features.filter((_, j) => j !== i))}
                  className="p-1 text-brand-text-muted hover:text-red-400">
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <input value={draft}
               onChange={e => setDraft(e.target.value)}
               onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFeature() } }}
               placeholder="Type a feature and press Enter"
               className={inputCls} />
        <button onClick={addFeature}
                className="shrink-0 px-3 py-2 text-sm rounded-lg bg-brand-gold text-gray-900 font-medium hover:bg-brand-gold-dark">
          Add
        </button>
      </div>
    </div>
  )
}

function IconBtn({ icon: Icon, label, onClick, danger }: {
  icon: React.ElementType
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button onClick={onClick} title={label}
            className={`p-1.5 rounded-lg hover:bg-brand-dark-hover transition-colors ${
              danger ? 'text-brand-text-muted hover:text-red-400' : 'text-brand-text-muted hover:text-brand-gold'
            }`}>
      <Icon className="w-4 h-4" />
    </button>
  )
}
