import { useState, useEffect, useMemo } from 'react'
import {
  Tag, Plus, Copy, Pencil, Trash2, Sparkles, CheckCircle2,
  XCircle, Users, TrendingDown,
} from 'lucide-react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Pagination } from '../../components/ui/Pagination'
import { SearchInput } from '../../components/ui/SearchInput'
import { promoCodesApi, plansApi, type PromoCode } from '../../services/admin-api'
import { useAdminPaginatedCrud } from '../../hooks/useAdminPaginatedCrud'
import { useToast } from '../../context/ToastContext'
import { formatCurrency, formatDate } from '../../utils/formatters'
import type { SubscriptionPlan } from '../../types'

interface FormState {
  code: string
  description: string
  discount_type: 'percent' | 'flat'
  discount_value: number
  max_discount_amount: number
  total_usage_limit: number
  per_user_limit: number
  valid_from: string
  valid_until: string
  campaign_tag: string
  is_active: boolean
  applicable_plans: number[]
}

const EMPTY: FormState = {
  code: '', description: '',
  discount_type: 'percent', discount_value: 10,
  max_discount_amount: 0,
  total_usage_limit: 0, per_user_limit: 1,
  valid_from: '', valid_until: '',
  campaign_tag: '', is_active: true,
  applicable_plans: [],
}

export default function PromoCodesPage() {
  const { addToast } = useToast()
  const { data, loading, page, totalPages, totalCount, search, setPage, setSearch, create, update, remove, refresh } =
    useAdminPaginatedCrud<PromoCode>(promoCodesApi)

  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  useEffect(() => { plansApi.list({ page_size: 200 }).then(setPlans as (x: unknown) => void).catch(() => {}) }, [])

  // Edit/create modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)

  // Bulk generate modal
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkForm, setBulkForm] = useState({
    prefix: '', count: 100, length: 8,
    discount_type: 'percent' as 'percent' | 'flat',
    discount_value: 10, campaign_tag: '',
    valid_until: '',
  })
  const [bulkResult, setBulkResult] = useState<{ created: number; sample: string[] } | null>(null)
  const [bulkBusy, setBulkBusy] = useState(false)

  // Redemptions view modal
  const [redemptionsFor, setRedemptionsFor] = useState<PromoCode | null>(null)
  const [redemptions, setRedemptions] = useState<Array<Record<string, unknown>>>([])

  const [deleteItem, setDeleteItem] = useState<PromoCode | null>(null)

  const planNameMap = useMemo(() => {
    const m = new Map<number, string>()
    plans.forEach(p => m.set(p.id, p.name))
    return m
  }, [plans])

  const openAdd = () => {
    setEditingId(null)
    setForm(EMPTY)
    setModalOpen(true)
  }

  const openEdit = (c: PromoCode) => {
    setEditingId(c.id)
    setForm({
      code: c.code, description: c.description,
      discount_type: c.discount_type,
      discount_value: Number(c.discount_value),
      max_discount_amount: Number(c.max_discount_amount),
      total_usage_limit: c.total_usage_limit,
      per_user_limit: c.per_user_limit,
      valid_from: c.valid_from?.slice(0, 16) ?? '',
      valid_until: c.valid_until?.slice(0, 16) ?? '',
      campaign_tag: c.campaign_tag,
      is_active: c.is_active,
      applicable_plans: c.applicable_plans ?? [],
    })
    setModalOpen(true)
  }

  const onSubmit = async () => {
    if (!form.code.trim()) { addToast('Code is required', 'error'); return }
    const payload = {
      ...form,
      code: form.code.trim().toUpperCase(),
      valid_from: form.valid_from || null,
      valid_until: form.valid_until || null,
    }
    try {
      if (editingId) {
        await update(editingId, payload)
        addToast('Promo code updated')
      } else {
        await create(payload)
        addToast('Promo code created')
      }
      setModalOpen(false)
      setForm(EMPTY)
    } catch {
      addToast('Save failed', 'error')
    }
  }

  const onBulkGenerate = async () => {
    if (bulkForm.count < 1 || bulkForm.count > 5000) {
      addToast('Count must be 1-5000', 'error'); return
    }
    setBulkBusy(true)
    try {
      const result = await promoCodesApi.bulkGenerate({
        ...bulkForm,
        valid_until: bulkForm.valid_until || null,
      })
      setBulkResult(result)
      addToast(`Generated ${result.created} codes`)
      refresh()
    } catch {
      addToast('Bulk generation failed', 'error')
    } finally { setBulkBusy(false) }
  }

  const openRedemptions = async (c: PromoCode) => {
    setRedemptionsFor(c)
    try {
      const data = await promoCodesApi.redemptions(c.id)
      setRedemptions(Array.isArray(data) ? data : [])
    } catch {
      setRedemptions([])
      addToast('Failed to load redemptions', 'error')
    }
  }

  const copyCode = async (c: string) => {
    try {
      await navigator.clipboard.writeText(c)
      addToast(`Copied ${c}`)
    } catch {
      addToast('Copy failed', 'error')
    }
  }

  const columns: Column<PromoCode>[] = [
    {
      key: 'code', title: 'Code',
      render: c => (
        <div className="flex items-center gap-2">
          <button onClick={() => copyCode(c.code)}
                  className="font-mono font-semibold text-brand-gold hover:underline">
            {c.code}
          </button>
          {!c.is_active && <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-600/30 text-neutral-400">INACTIVE</span>}
        </div>
      ),
    },
    {
      key: 'discount_value', title: 'Discount',
      render: c => c.discount_type === 'percent'
        ? <span className="text-brand-text">{c.discount_value}% off</span>
        : <span className="text-brand-text">{formatCurrency(Number(c.discount_value))} off</span>,
    },
    {
      key: 'usage_count', title: 'Usage',
      render: c => (
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-brand-text-muted" />
          <span className="text-sm">
            {c.usage_count}{c.total_usage_limit > 0 ? ` / ${c.total_usage_limit}` : ''}
          </span>
        </div>
      ),
    },
    {
      key: 'redemption_revenue', title: 'Revenue impact',
      render: c => (
        <div className="flex items-center gap-1.5 text-sm">
          <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
          <span>-{formatCurrency(Number(c.redemption_revenue))}</span>
        </div>
      ),
    },
    { key: 'campaign_tag', title: 'Campaign',
      render: c => c.campaign_tag
        ? <span className="text-xs px-2 py-0.5 rounded bg-brand-dark-hover text-brand-text">{c.campaign_tag}</span>
        : <span className="text-brand-text-muted text-xs">—</span> },
    { key: 'valid_until', title: 'Expires',
      render: c => c.valid_until ? formatDate(c.valid_until) : <span className="text-brand-text-muted">—</span> },
    {
      key: 'actions', title: 'Actions',
      render: c => (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <button onClick={() => openRedemptions(c)} title="Redemptions"
                  className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-gold">
            <Users className="w-4 h-4" />
          </button>
          <button onClick={() => openEdit(c)} title="Edit"
                  className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-gold">
            <Pencil className="w-4 h-4" />
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
          <h1 className="text-2xl font-bold text-brand-text">Promo Codes</h1>
          <p className="text-sm text-brand-text-muted mt-0.5">{totalCount} codes · {data.filter(c => c.is_active).length} active</p>
        </div>
        <div className="flex items-center gap-2">
          <SearchInput value={search} onChange={setSearch} placeholder="Search codes / campaigns…" className="w-64" />
          <button onClick={() => { setBulkResult(null); setBulkOpen(true) }}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border">
            <Sparkles className="w-4 h-4" /> Bulk generate
          </button>
          <button onClick={openAdd}
                  className="flex items-center gap-1.5 px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark">
            <Plus className="w-4 h-4" /> Add code
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

      {/* Single-code form modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}
             title={editingId ? 'Edit promo code' : 'Add promo code'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Code *">
              <input value={form.code}
                     onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                     placeholder="e.g. DIWALI25" className={`${inputCls} font-mono`} />
            </Field>
            <Field label="Campaign tag">
              <input value={form.campaign_tag}
                     onChange={e => setForm(f => ({ ...f, campaign_tag: e.target.value }))}
                     placeholder="e.g. diwali-2026" className={inputCls} />
            </Field>
          </div>
          <Field label="Description (internal notes)">
            <textarea value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      rows={2} className={`${inputCls} min-h-[60px]`} />
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Type">
              <select value={form.discount_type}
                      onChange={e => setForm(f => ({ ...f, discount_type: e.target.value as 'percent' | 'flat' }))}
                      className={inputCls}>
                <option value="percent">% off</option>
                <option value="flat">Flat ₹ off</option>
              </select>
            </Field>
            <Field label={form.discount_type === 'percent' ? 'Percent (0-100)' : 'Amount (₹)'}>
              <input type="number" step="0.01" min={0}
                     value={form.discount_value}
                     onChange={e => setForm(f => ({ ...f, discount_value: Number(e.target.value) }))}
                     className={inputCls} />
            </Field>
            {form.discount_type === 'percent' && (
              <Field label="Max discount cap (0 = no cap)">
                <input type="number" step="0.01" min={0}
                       value={form.max_discount_amount}
                       onChange={e => setForm(f => ({ ...f, max_discount_amount: Number(e.target.value) }))}
                       className={inputCls} />
              </Field>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Total usage limit (0 = unlimited)">
              <input type="number" min={0} value={form.total_usage_limit}
                     onChange={e => setForm(f => ({ ...f, total_usage_limit: Number(e.target.value) }))}
                     className={inputCls} />
            </Field>
            <Field label="Per-user limit">
              <input type="number" min={1} value={form.per_user_limit}
                     onChange={e => setForm(f => ({ ...f, per_user_limit: Number(e.target.value) }))}
                     className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Valid from (optional)">
              <input type="datetime-local" value={form.valid_from}
                     onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))}
                     className={inputCls} />
            </Field>
            <Field label="Valid until (optional)">
              <input type="datetime-local" value={form.valid_until}
                     onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))}
                     className={inputCls} />
            </Field>
          </div>
          <Field label="Applicable plans (leave empty for all plans)">
            <div className="grid grid-cols-2 gap-2 p-3 bg-brand-dark/50 border border-brand-dark-border rounded-lg">
              {plans.map(p => (
                <label key={p.id} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={form.applicable_plans.includes(p.id)}
                         onChange={e => setForm(f => ({
                           ...f,
                           applicable_plans: e.target.checked
                             ? [...f.applicable_plans, p.id]
                             : f.applicable_plans.filter(x => x !== p.id),
                         }))}
                         className="rounded accent-brand-gold" />
                  <span className="text-brand-text">{p.name}</span>
                </label>
              ))}
            </div>
          </Field>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active}
                   onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                   className="rounded accent-brand-gold" />
            <span className="text-sm text-brand-text">Active</span>
          </label>
          <div className="flex justify-end gap-3 pt-2 border-t border-brand-dark-border">
            <button onClick={() => setModalOpen(false)}
                    className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border">
              Cancel
            </button>
            <button onClick={onSubmit}
                    className="px-4 py-2 text-sm rounded-lg bg-brand-gold text-gray-900 font-medium hover:bg-brand-gold-dark">
              {editingId ? 'Save' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Bulk generate modal */}
      <Modal isOpen={bulkOpen} onClose={() => { setBulkOpen(false); setBulkResult(null) }}
             title="Bulk generate codes" size="lg">
        {bulkResult ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              Created {bulkResult.created} unique codes
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-brand-text-muted mb-2">Sample</div>
              <div className="space-y-1.5">
                {bulkResult.sample.map(c => (
                  <div key={c} className="flex items-center justify-between p-2 rounded bg-brand-dark border border-brand-dark-border">
                    <code className="text-brand-gold font-mono text-sm">{c}</code>
                    <button onClick={() => copyCode(c)} className="p-1 text-brand-text-muted hover:text-brand-gold">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="text-xs text-brand-text-muted mt-3">
                All codes are now visible in the main list. Filter by campaign tag to export.
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={() => { setBulkOpen(false); setBulkResult(null) }}
                      className="px-4 py-2 text-sm rounded-lg bg-brand-gold text-gray-900 font-medium">
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Field label="Prefix (optional)">
                <input value={bulkForm.prefix}
                       onChange={e => setBulkForm(f => ({ ...f, prefix: e.target.value.toUpperCase() }))}
                       placeholder="e.g. DIWALI" className={`${inputCls} font-mono`} />
              </Field>
              <Field label="Count (1-5000)">
                <input type="number" min={1} max={5000} value={bulkForm.count}
                       onChange={e => setBulkForm(f => ({ ...f, count: Number(e.target.value) }))}
                       className={inputCls} />
              </Field>
              <Field label="Random part length (4-20)">
                <input type="number" min={4} max={20} value={bulkForm.length}
                       onChange={e => setBulkForm(f => ({ ...f, length: Number(e.target.value) }))}
                       className={inputCls} />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Type">
                <select value={bulkForm.discount_type}
                        onChange={e => setBulkForm(f => ({ ...f, discount_type: e.target.value as 'percent' | 'flat' }))}
                        className={inputCls}>
                  <option value="percent">% off</option>
                  <option value="flat">Flat ₹ off</option>
                </select>
              </Field>
              <Field label="Discount">
                <input type="number" step="0.01" min={0}
                       value={bulkForm.discount_value}
                       onChange={e => setBulkForm(f => ({ ...f, discount_value: Number(e.target.value) }))}
                       className={inputCls} />
              </Field>
              <Field label="Campaign tag">
                <input value={bulkForm.campaign_tag}
                       onChange={e => setBulkForm(f => ({ ...f, campaign_tag: e.target.value }))}
                       placeholder="diwali-2026" className={inputCls} />
              </Field>
            </div>
            <Field label="Valid until (optional)">
              <input type="datetime-local" value={bulkForm.valid_until}
                     onChange={e => setBulkForm(f => ({ ...f, valid_until: e.target.value }))}
                     className={inputCls} />
            </Field>
            <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs text-brand-text-muted">
              Codes are created as <span className="font-mono">{bulkForm.prefix || '(prefix)'}</span> + random{' '}
              <span className="font-mono">{bulkForm.length}</span>-char suffix of A-Z + 0-9, e.g.{' '}
              <span className="font-mono text-brand-gold">{bulkForm.prefix || ''}XK2F9P4Q</span>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-brand-dark-border">
              <button onClick={() => setBulkOpen(false)}
                      className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border">
                Cancel
              </button>
              <button onClick={onBulkGenerate} disabled={bulkBusy}
                      className="px-4 py-2 text-sm rounded-lg bg-brand-gold text-gray-900 font-medium hover:bg-brand-gold-dark disabled:opacity-60">
                {bulkBusy ? 'Generating…' : `Generate ${bulkForm.count} codes`}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Redemptions modal */}
      <Modal isOpen={!!redemptionsFor} onClose={() => setRedemptionsFor(null)}
             title={redemptionsFor ? `Redemptions — ${redemptionsFor.code}` : ''} size="lg">
        {redemptions.length === 0 ? (
          <div className="py-10 text-center text-sm text-brand-text-muted">
            No redemptions yet for this code.
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto divide-y divide-brand-dark-border">
            {redemptions.map((r, i) => (
              <div key={(r.id as number) ?? i} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm text-brand-text">{r.user_email as string}</div>
                  <div className="text-[11px] text-brand-text-muted">{formatDate(r.redeemed_at as string)}</div>
                </div>
                <div className="text-sm font-medium text-amber-400">
                  -{formatCurrency(Number(r.discount_applied))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={async () => {
          if (!deleteItem) return
          try { await remove(deleteItem.id); addToast('Deleted'); setDeleteItem(null) }
          catch { addToast('Delete failed', 'error') }
        }}
        title="Delete promo code"
        message={`Delete "${deleteItem?.code}"? Redemption history stays but the code can't be used again.`}
        confirmText="Delete"
        variant="danger"
      />
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
