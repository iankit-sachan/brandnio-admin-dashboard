import { useState, useMemo } from 'react'
import {
  RefreshCcw, CheckCircle2, XCircle, Clock, Filter,
  AlertCircle, User, ExternalLink,
} from 'lucide-react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Pagination } from '../../components/ui/Pagination'
import { SearchInput } from '../../components/ui/SearchInput'
import { Modal } from '../../components/ui/Modal'
import { refundRequestsApi, type RefundRequest } from '../../services/admin-api'
import { useAdminPaginatedCrud } from '../../hooks/useAdminPaginatedCrud'
import { useToast } from '../../context/ToastContext'
import { formatCurrency, formatDate } from '../../utils/formatters'

type StatusFilter = '' | 'pending' | 'approved' | 'rejected'
const STATUSES: Array<{ value: StatusFilter; label: string }> = [
  { value: '',         label: 'All statuses' },
  { value: 'pending',  label: 'Pending review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

export default function RefundManagerPage() {
  const { addToast } = useToast()

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const extraParams = useMemo(() => ({
    status: statusFilter || undefined,
  }), [statusFilter])

  const { data, loading, page, totalPages, totalCount, search, setPage, setSearch, refresh } =
    useAdminPaginatedCrud<RefundRequest>(refundRequestsApi, extraParams)

  const [approveTarget, setApproveTarget] = useState<RefundRequest | null>(null)
  const [rejectTarget, setRejectTarget]   = useState<RefundRequest | null>(null)
  const [approvedAmount, setApprovedAmount] = useState('')
  const [adminNote, setAdminNote]           = useState('')
  const [speed, setSpeed] = useState<'normal' | 'optimum'>('normal')
  const [busy, setBusy] = useState(false)

  const onApproveSubmit = async () => {
    if (!approveTarget) return
    setBusy(true)
    try {
      const amtNum = approvedAmount.trim() === '' ? null : Number(approvedAmount)
      if (amtNum !== null && (isNaN(amtNum) || amtNum <= 0)) {
        addToast('Invalid amount', 'error'); setBusy(false); return
      }
      await refundRequestsApi.approve(approveTarget.id, {
        approved_amount: amtNum,
        admin_note: adminNote,
        speed,
      })
      addToast('Refund approved + issued via Razorpay')
      setApproveTarget(null); setApprovedAmount(''); setAdminNote(''); setSpeed('normal')
      refresh()
    } catch (e) {
      addToast((e as { response?: { data?: { detail?: string } } })
        .response?.data?.detail ?? 'Approve failed', 'error')
    } finally { setBusy(false) }
  }

  const onRejectSubmit = async () => {
    if (!rejectTarget) return
    setBusy(true)
    try {
      await refundRequestsApi.reject(rejectTarget.id, adminNote)
      addToast('Refund request rejected')
      setRejectTarget(null); setAdminNote('')
      refresh()
    } catch {
      addToast('Reject failed', 'error')
    } finally { setBusy(false) }
  }

  const statusColor = (s: string) => ({
    pending:  'bg-amber-500/15 text-amber-400',
    approved: 'bg-emerald-500/15 text-emerald-400',
    rejected: 'bg-red-500/15 text-red-400',
  }[s] ?? 'bg-neutral-600/20 text-neutral-400')

  const statusIcon = (s: string) => {
    if (s === 'pending')  return <Clock className="w-3.5 h-3.5" />
    if (s === 'approved') return <CheckCircle2 className="w-3.5 h-3.5" />
    return <XCircle className="w-3.5 h-3.5" />
  }

  const pendingCount = data.filter(r => r.status === 'pending').length

  const columns: Column<RefundRequest>[] = [
    {
      key: 'user_email', title: 'User',
      render: r => (
        <div className="flex items-start gap-2">
          <User className="w-4 h-4 text-brand-text-muted mt-0.5 shrink-0" />
          <div>
            <div className="text-sm text-brand-text">{r.user_email}</div>
            <div className="text-[11px] text-brand-text-muted">Sub #{r.subscription}</div>
          </div>
        </div>
      ),
    },
    { key: 'plan_name', title: 'Plan',
      render: r => <span className="text-sm">{r.plan_name}</span> },
    {
      key: 'requested_amount', title: 'Requested',
      render: r => (
        <div>
          <div className="text-brand-text">{formatCurrency(Number(r.requested_amount))}</div>
          <div className="text-[11px] text-brand-text-muted">of {formatCurrency(Number(r.subscription_amount))}</div>
        </div>
      ),
    },
    {
      key: 'status', title: 'Status',
      render: r => (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full font-medium ${statusColor(r.status)}`}>
          {statusIcon(r.status)}{r.status}
        </span>
      ),
    },
    { key: 'reason', title: 'Reason',
      render: r => (
        <div className="max-w-sm">
          <div className="text-sm text-brand-text line-clamp-2" title={r.reason}>
            {r.reason || <span className="text-brand-text-muted italic">(no reason provided)</span>}
          </div>
        </div>
      ),
    },
    { key: 'created_at', title: 'Requested at',
      render: r => <span className="text-xs">{formatDate(r.created_at)}</span> },
    {
      key: 'actions', title: '',
      render: r => {
        if (r.status !== 'pending') {
          return (
            <div className="text-[11px] text-brand-text-muted">
              <div>{r.status === 'approved' ? 'Approved' : 'Rejected'}</div>
              <div>by {r.reviewed_by || '—'}</div>
              {r.reviewed_at && <div>{formatDate(r.reviewed_at)}</div>}
            </div>
          )
        }
        return (
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <button onClick={() => { setApproveTarget(r); setApprovedAmount(''); setAdminNote('') }}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25">
              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
            </button>
            <button onClick={() => { setRejectTarget(r); setAdminNote('') }}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25">
              <XCircle className="w-3.5 h-3.5" /> Reject
            </button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-text flex items-center gap-2">
            <RefreshCcw className="w-6 h-6 text-brand-gold" />
            Refund Manager
          </h1>
          <p className="text-sm text-brand-text-muted mt-0.5">
            {totalCount} total · {pendingCount} pending review
          </p>
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by email / reason / note…" className="w-72" />
      </div>

      {/* Status filter pills */}
      <div className="flex items-center gap-1 p-1 bg-brand-dark-card border border-brand-dark-border rounded-lg w-fit">
        <Filter className="w-3.5 h-3.5 text-brand-text-muted mx-2" />
        {STATUSES.map(s => (
          <button key={s.value || 'all'} onClick={() => setStatusFilter(s.value)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    statusFilter === s.value
                      ? 'bg-brand-gold text-gray-900'
                      : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-dark-hover'
                  }`}>
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading…</div>
      ) : data.length === 0 ? (
        <EmptyState message={statusFilter === 'pending'
          ? "No pending refund requests. You're all caught up."
          : 'No requests match the current filter.'} />
      ) : (
        <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
          <DataTable columns={columns} data={data} />
          <Pagination currentPage={page} totalPages={totalPages} totalCount={totalCount} onPageChange={setPage} />
        </div>
      )}

      {/* Approve modal */}
      <Modal isOpen={!!approveTarget} onClose={() => setApproveTarget(null)}
             title={approveTarget ? `Approve refund for ${approveTarget.user_email}` : ''} size="md">
        {approveTarget && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200">
                This fires the Razorpay refund API + cancels the linked subscription.
              </div>
            </div>

            <div className="p-3 bg-brand-dark/50 border border-brand-dark-border rounded-lg">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-brand-text-muted mb-2">User's request</div>
              <div className="text-sm text-brand-text mb-2">{approveTarget.reason}</div>
              <div className="flex items-center gap-3 text-xs text-brand-text-muted">
                <span>Plan: <span className="text-brand-text">{approveTarget.plan_name}</span></span>
                <span>Requested: <span className="text-brand-text">{formatCurrency(Number(approveTarget.requested_amount))}</span></span>
                <span>Max: <span className="text-brand-text">{formatCurrency(Number(approveTarget.subscription_amount))}</span></span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">
                Approved amount — blank uses user's requested amount
              </label>
              <input type="number" step="0.01" min={0}
                     max={approveTarget.subscription_amount}
                     value={approvedAmount}
                     placeholder={`${approveTarget.requested_amount} (requested)`}
                     onChange={e => setApprovedAmount(e.target.value)}
                     className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Speed</label>
              <select value={speed} onChange={e => setSpeed(e.target.value as 'normal' | 'optimum')}
                      className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
                <option value="normal">Normal — 5-7 business days (no extra fee)</option>
                <option value="optimum">Optimum — instant if eligible (extra fee)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">
                Internal note (recorded in audit log)
              </label>
              <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)}
                        rows={2}
                        className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-brand-dark-border">
              <button onClick={() => setApproveTarget(null)}
                      className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border">
                Cancel
              </button>
              <button onClick={onApproveSubmit} disabled={busy}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 disabled:opacity-60">
                <CheckCircle2 className="w-4 h-4" />
                {busy ? 'Processing…' : 'Approve + refund'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject modal */}
      <Modal isOpen={!!rejectTarget} onClose={() => setRejectTarget(null)}
             title={rejectTarget ? `Reject request — ${rejectTarget.user_email}` : ''} size="md">
        {rejectTarget && (
          <div className="space-y-4">
            <div className="p-3 bg-brand-dark/50 border border-brand-dark-border rounded-lg">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-brand-text-muted mb-2">User's request</div>
              <div className="text-sm text-brand-text">{rejectTarget.reason}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">
                Rejection reason (shown to user)
              </label>
              <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)}
                        rows={3}
                        placeholder="e.g. Outside 7-day refund window per policy"
                        className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-brand-dark-border">
              <button onClick={() => setRejectTarget(null)}
                      className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border">
                Cancel
              </button>
              <button onClick={onRejectSubmit} disabled={busy}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 disabled:opacity-60">
                <XCircle className="w-4 h-4" />
                {busy ? 'Processing…' : 'Reject request'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <CheckCircle2 className="w-10 h-10 text-emerald-500/30" />
      <div className="text-sm text-brand-text-muted max-w-md">{message}</div>
    </div>
  )
}

// unused import guard — ExternalLink could be used in a future "view Razorpay" deep-link
void ExternalLink
