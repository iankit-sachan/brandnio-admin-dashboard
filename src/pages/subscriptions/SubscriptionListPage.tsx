import { useState, useMemo } from 'react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Pagination } from '../../components/ui/Pagination'
import { SearchInput } from '../../components/ui/SearchInput'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { subscriptionsApi, plansApi } from '../../services/admin-api'
import { useAdminPaginatedCrud } from '../../hooks/useAdminPaginatedCrud'
import { useToast } from '../../context/ToastContext'
import { formatCurrency, formatDate } from '../../utils/formatters'
import type { Subscription, SubscriptionPlan, SubscriptionStatus } from '../../types'
import {
  XCircle, RefreshCcw, CalendarPlus, PlayCircle, Download, Eye,
  MoreVertical, CheckCircle2, AlertCircle,
} from 'lucide-react'
import { useEffect } from 'react'

const STATUSES: Array<{ value: '' | SubscriptionStatus; label: string }> = [
  { value: '',          label: 'All statuses' },
  { value: 'active',    label: 'Active' },
  { value: 'captured',  label: 'Captured' },
  { value: 'authorized',label: 'Authorized' },
  { value: 'created',   label: 'Created' },
  { value: 'expired',   label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'failed',    label: 'Failed' },
]

export default function SubscriptionListPage() {
  const { addToast } = useToast()

  // ── Filter state (mirrors backend ?status=, ?plan=, ?date_from=, ?date_to=)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [planFilter, setPlanFilter]     = useState<string>('')
  const [dateFrom, setDateFrom]         = useState<string>('')
  const [dateTo, setDateTo]             = useState<string>('')

  /** Extra query params — passed to the paginated hook so it auto-refetches
   *  whenever any filter changes (hook resets page=1 on extraParams change). */
  const extraParams = useMemo(() => ({
    status: statusFilter || undefined,
    plan: planFilter || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  }), [statusFilter, planFilter, dateFrom, dateTo])

  const {
    data, loading, page, totalPages, totalCount, search,
    setPage, setSearch, refresh,
  } = useAdminPaginatedCrud<Subscription>(subscriptionsApi, extraParams)

  // Plans list for the Plan filter dropdown
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  useEffect(() => {
    plansApi.list({ page_size: 200 }).then(setPlans).catch(() => {})
  }, [])

  // Detail drawer + action modals
  const [detailSub, setDetailSub]     = useState<Subscription | null>(null)
  const [extendSub, setExtendSub]     = useState<Subscription | null>(null)
  const [refundSub, setRefundSub]     = useState<Subscription | null>(null)
  const [confirmCancel, setConfirmCancel]     = useState<Subscription | null>(null)
  const [confirmActivate, setConfirmActivate] = useState<Subscription | null>(null)
  const [rowMenuId, setRowMenuId] = useState<number | null>(null)

  // Form state for modals
  const [cancelReason, setCancelReason] = useState('')
  const [extendDays, setExtendDays]     = useState<number>(30)
  const [extendReason, setExtendReason] = useState('')
  const [refundAmount, setRefundAmount] = useState<string>('')
  const [refundReason, setRefundReason] = useState('')
  const [refundSpeed, setRefundSpeed]   = useState<'normal' | 'optimum'>('normal')
  const [busy, setBusy] = useState(false)

  // ── Admin actions ───────────────────────────────────────────────

  const onCancelConfirm = async () => {
    if (!confirmCancel) return
    setBusy(true)
    try {
      const updated = await subscriptionsApi.cancel(confirmCancel.id, cancelReason)
      refresh()
      void updated
      addToast('Subscription cancelled')
      setConfirmCancel(null); setCancelReason('')
    } catch (e) {
      addToast(`Cancel failed: ${extractErr(e)}`, 'error')
    } finally { setBusy(false) }
  }

  const onExtendSubmit = async () => {
    if (!extendSub) return
    if (extendDays <= 0) { addToast('Days must be > 0', 'error'); return }
    setBusy(true)
    try {
      const updated = await subscriptionsApi.extend(extendSub.id, extendDays, extendReason)
      refresh()
      void updated
      addToast(`Extended by ${extendDays} days`)
      setExtendSub(null); setExtendDays(30); setExtendReason('')
    } catch (e) {
      addToast(`Extend failed: ${extractErr(e)}`, 'error')
    } finally { setBusy(false) }
  }

  const onRefundSubmit = async () => {
    if (!refundSub) return
    setBusy(true)
    try {
      const amtNum = refundAmount.trim() === '' ? null : Number(refundAmount)
      if (amtNum !== null && (isNaN(amtNum) || amtNum <= 0)) {
        addToast('Invalid refund amount', 'error'); setBusy(false); return
      }
      const updated = await subscriptionsApi.refund(refundSub.id, {
        amount: amtNum, reason: refundReason, speed: refundSpeed,
      })
      refresh()
      void updated
      addToast('Refund issued via Razorpay')
      setRefundSub(null); setRefundAmount(''); setRefundReason(''); setRefundSpeed('normal')
    } catch (e) {
      addToast(`Refund failed: ${extractErr(e)}`, 'error')
    } finally { setBusy(false) }
  }

  const onActivateConfirm = async () => {
    if (!confirmActivate) return
    setBusy(true)
    try {
      const updated = await subscriptionsApi.activateManually(confirmActivate.id)
      refresh()
      void updated
      addToast('Subscription activated')
      setConfirmActivate(null)
    } catch (e) {
      addToast(`Activation failed: ${extractErr(e)}`, 'error')
    } finally { setBusy(false) }
  }

  const onExportCsv = async () => {
    try {
      const url = await subscriptionsApi.exportCsv({
        ...extraParams,
        search: search || undefined,
      })
      const a = document.createElement('a')
      a.href = url
      a.download = `subscriptions_${new Date().toISOString().slice(0,10)}.csv`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      addToast('CSV downloaded')
    } catch (e) {
      addToast(`Export failed: ${extractErr(e)}`, 'error')
    }
  }

  // ── Columns ─────────────────────────────────────────────────────

  const columns: Column<Subscription>[] = [
    {
      key: 'user_email', title: 'User', sortable: true,
      render: s => (
        <div className="flex flex-col">
          <span className="text-sm text-brand-text">{s.user_email}</span>
          <span className="text-[11px] text-brand-text-muted">#{s.user}</span>
        </div>
      ),
    },
    { key: 'plan_name', title: 'Plan', sortable: true,
      render: s => <span className="text-sm">{s.plan_name}</span> },
    { key: 'amount',    title: 'Amount',  sortable: true,
      render: s => formatCurrency(Number(s.amount)) },
    { key: 'status',    title: 'Status',
      render: s => <StatusBadge status={s.status} /> },
    { key: 'expires_at',title: 'Expires',
      render: s => s.expires_at ? formatDate(s.expires_at) : '—' },
    { key: 'refund',    title: 'Refund',
      render: s => s.refunded_at
        ? (
          <div className="flex flex-col">
            <span className="text-xs text-amber-400">{formatCurrency(Number(s.refund_amount))}</span>
            <span className="text-[10px] text-brand-text-muted">{s.refund_status}</span>
          </div>
        )
        : <span className="text-brand-text-muted text-xs">—</span>,
    },
    { key: 'created_at',title: 'Created', sortable: true,
      render: s => formatDate(s.created_at) },
    {
      key: 'actions', title: '',
      render: s => (
        <div className="relative flex justify-end" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setRowMenuId(rowMenuId === s.id ? null : s.id)}
            className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {rowMenuId === s.id && (
            <div
              className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-brand-dark-border bg-brand-dark-card shadow-xl z-20 py-1"
              onMouseLeave={() => setRowMenuId(null)}
            >
              <RowMenuItem icon={Eye} label="View details"
                           onClick={() => { setDetailSub(s); setRowMenuId(null) }} />
              {s.status !== 'active' && s.status !== 'cancelled' && (
                <RowMenuItem icon={PlayCircle} label="Activate manually"
                             onClick={() => { setConfirmActivate(s); setRowMenuId(null) }} />
              )}
              {s.status === 'active' && (
                <RowMenuItem icon={CalendarPlus} label="Extend expiry"
                             onClick={() => { setExtendSub(s); setRowMenuId(null) }} />
              )}
              {s.razorpay_payment_id && !s.refunded_at && (
                <RowMenuItem icon={RefreshCcw} label="Refund" danger
                             onClick={() => { setRefundSub(s); setRefundAmount(''); setRowMenuId(null) }} />
              )}
              {s.status !== 'cancelled' && (
                <RowMenuItem icon={XCircle} label="Cancel" danger
                             onClick={() => { setConfirmCancel(s); setRowMenuId(null) }} />
              )}
            </div>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-brand-text">Subscriptions</h1>
        <div className="flex items-center gap-2">
          <SearchInput value={search} onChange={setSearch}
                       placeholder="Search by email / order id / payment id…"
                       className="w-72" />
          <button onClick={onExportCsv}
                  className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-end p-3 bg-brand-dark-card/60 rounded-xl border border-brand-dark-border/50">
        <FilterField label="Status">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50 min-w-[140px]">
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </FilterField>
        <FilterField label="Plan">
          <select value={planFilter} onChange={e => setPlanFilter(e.target.value)}
                  className="bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50 min-w-[160px]">
            <option value="">All plans</option>
            {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </FilterField>
        <FilterField label="From">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                 className="bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
        </FilterField>
        <FilterField label="To">
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                 className="bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
        </FilterField>
        {(statusFilter || planFilter || dateFrom || dateTo) && (
          <button onClick={() => { setStatusFilter(''); setPlanFilter(''); setDateFrom(''); setDateTo('') }}
                  className="ml-auto text-xs text-brand-text-muted hover:text-brand-text underline">
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading…</div>
      ) : (
        <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
          <DataTable columns={columns} data={data}
                     onRowClick={s => setDetailSub(s)} />
          <Pagination currentPage={page} totalPages={totalPages}
                      totalCount={totalCount} onPageChange={setPage} />
        </div>
      )}

      {/* Detail drawer modal */}
      {detailSub && (
        <Modal isOpen={!!detailSub} onClose={() => setDetailSub(null)}
               title={`Subscription #${detailSub.id}`} size="xl">
          <SubscriptionDetail sub={detailSub} />
        </Modal>
      )}

      {/* Cancel confirm */}
      <ConfirmDialog
        isOpen={!!confirmCancel}
        onClose={() => { setConfirmCancel(null); setCancelReason('') }}
        onConfirm={onCancelConfirm}
        title="Cancel subscription?"
        message={confirmCancel
          ? `This will cancel ${confirmCancel.user_email}'s ${confirmCancel.plan_name} subscription and revoke premium access if it's their active plan.`
          : ''}
        confirmText={busy ? 'Cancelling…' : 'Yes, cancel'}
        variant="danger"
      >
        <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                  placeholder="Reason (optional, recorded in audit log)"
                  className="mt-4 w-full min-h-[80px] bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
      </ConfirmDialog>

      {/* Activate confirm */}
      <ConfirmDialog
        isOpen={!!confirmActivate}
        onClose={() => setConfirmActivate(null)}
        onConfirm={onActivateConfirm}
        title="Activate subscription manually?"
        message={confirmActivate
          ? `This will activate ${confirmActivate.user_email}'s ${confirmActivate.plan_name} plan immediately and credit ${confirmActivate.plan_name} benefits to the user. Use this only for out-of-band payments (bank transfer, cash, etc.) where no Razorpay capture exists.`
          : ''}
        confirmText={busy ? 'Activating…' : 'Activate'}
        variant="default"
      />

      {/* Extend modal */}
      <Modal isOpen={!!extendSub} onClose={() => setExtendSub(null)}
             title={extendSub ? `Extend ${extendSub.user_email}'s plan` : ''} size="md">
        <div className="space-y-4">
          <FormField label="Days to add">
            <input type="number" min={1} max={3650}
                   value={extendDays} onChange={e => setExtendDays(Number(e.target.value))}
                   className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </FormField>
          <FormField label="Reason (recorded in audit log)">
            <textarea value={extendReason} onChange={e => setExtendReason(e.target.value)}
                      placeholder="e.g. Compensation for outage, promo, apology"
                      className="w-full min-h-[80px] bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setExtendSub(null)}
                    className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border">
              Cancel
            </button>
            <button onClick={onExtendSubmit} disabled={busy}
                    className="px-4 py-2 text-sm rounded-lg bg-brand-gold text-gray-900 font-medium hover:bg-brand-gold-dark disabled:opacity-60">
              {busy ? 'Extending…' : `Extend by ${extendDays} days`}
            </button>
          </div>
        </div>
      </Modal>

      {/* Refund modal */}
      <Modal isOpen={!!refundSub} onClose={() => setRefundSub(null)}
             title={refundSub ? `Refund ${refundSub.user_email}` : ''} size="md">
        <div className="space-y-4">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200">
              This calls the Razorpay refund API. Partial refunds allowed.
              Refund speed 'optimum' is instant for eligible payment methods
              (costs extra); 'normal' takes 5-7 business days.
            </div>
          </div>
          <FormField label={`Amount (max ₹${refundSub?.amount ?? 0}) — leave empty for full refund`}>
            <input type="number" step="0.01" min={0}
                   max={refundSub?.amount}
                   value={refundAmount}
                   placeholder={`${refundSub?.amount ?? ''} (full)`}
                   onChange={e => setRefundAmount(e.target.value)}
                   className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </FormField>
          <FormField label="Refund speed">
            <select value={refundSpeed} onChange={e => setRefundSpeed(e.target.value as 'normal'|'optimum')}
                    className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
              <option value="normal">Normal — 5-7 business days (no extra fee)</option>
              <option value="optimum">Optimum — instant if eligible (extra fee)</option>
            </select>
          </FormField>
          <FormField label="Reason (recorded at Razorpay + audit log)">
            <textarea value={refundReason} onChange={e => setRefundReason(e.target.value)}
                      placeholder="e.g. User requested refund within policy window"
                      className="w-full min-h-[80px] bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setRefundSub(null)}
                    className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border">
              Cancel
            </button>
            <button onClick={onRefundSubmit} disabled={busy}
                    className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 disabled:opacity-60">
              {busy ? 'Processing…' : 'Issue refund'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ── Helpers ─────────────────────────────────────────────────────

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-brand-text-muted">{label}</label>
      {children}
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-brand-text-muted mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function RowMenuItem({
  icon: Icon, label, onClick, danger,
}: {
  icon: React.ElementType
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button onClick={onClick}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-brand-dark-hover ${danger ? 'text-red-400' : 'text-brand-text'}`}>
      <Icon className="w-4 h-4" />
      {label}
    </button>
  )
}

function SubscriptionDetail({ sub }: { sub: Subscription }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <DetailField label="User" value={`${sub.user_email} (#${sub.user})`} />
        <DetailField label="Status">
          <StatusBadge status={sub.status} />
        </DetailField>
        <DetailField label="Plan" value={`${sub.plan_name} (${sub.plan_slug})`} />
        <DetailField label="Amount" value={formatCurrency(Number(sub.amount))} />
        <DetailField label="Razorpay Order" value={sub.razorpay_order_id} mono />
        <DetailField label="Razorpay Payment" value={sub.razorpay_payment_id || '—'} mono />
      </div>

      <Section title="Dates">
        <div className="grid grid-cols-3 gap-4">
          <DetailField label="Created" value={formatDate(sub.created_at)} />
          <DetailField label="Starts" value={sub.starts_at ? formatDate(sub.starts_at) : '—'} />
          <DetailField label="Expires" value={sub.expires_at ? formatDate(sub.expires_at) : '—'} />
        </div>
      </Section>

      {sub.cancelled_at && (
        <Section title="Cancellation">
          <div className="grid grid-cols-2 gap-4">
            <DetailField label="Cancelled at" value={formatDate(sub.cancelled_at)} />
            <DetailField label="By" value={sub.cancelled_by || '—'} />
          </div>
          {sub.cancellation_reason && (
            <div className="mt-3 text-sm text-brand-text-muted italic">"{sub.cancellation_reason}"</div>
          )}
        </Section>
      )}

      {sub.refunded_at && (
        <Section title="Refund">
          <div className="grid grid-cols-3 gap-4">
            <DetailField label="Refunded at" value={formatDate(sub.refunded_at)} />
            <DetailField label="Amount" value={formatCurrency(Number(sub.refund_amount))} />
            <DetailField label="Status">
              <div className="flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                {sub.refund_status}
              </div>
            </DetailField>
            <DetailField label="Razorpay refund id" value={sub.refund_razorpay_id} mono />
            <DetailField label="By" value={sub.refunded_by || '—'} />
          </div>
          {sub.refund_reason && (
            <div className="mt-3 text-sm text-brand-text-muted italic">"{sub.refund_reason}"</div>
          )}
        </Section>
      )}

      {sub.admin_extension_days > 0 && (
        <Section title="Admin extensions">
          <DetailField label="Cumulative days added" value={`${sub.admin_extension_days} days`} />
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-brand-text-muted mb-2">{title}</div>
      <div className="p-4 rounded-lg bg-brand-dark/50 border border-brand-dark-border">
        {children}
      </div>
    </div>
  )
}

function DetailField({ label, value, mono, children }: {
  label: string
  value?: string
  mono?: boolean
  children?: React.ReactNode
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-brand-text-muted mb-1">{label}</div>
      {children ?? (
        <div className={`text-sm text-brand-text ${mono ? 'font-mono text-xs break-all' : ''}`}>{value || '—'}</div>
      )}
    </div>
  )
}

function extractErr(e: unknown): string {
  const err = e as { response?: { data?: { detail?: string } }; message?: string }
  return err.response?.data?.detail ?? err.message ?? 'Unknown error'
}
