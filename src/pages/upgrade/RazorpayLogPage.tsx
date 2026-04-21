import { useState, useMemo } from 'react'
import {
  FileText, Filter, ExternalLink, RefreshCw, CheckCircle2, XCircle,
  Clock, Shield, AlertTriangle, Eye,
} from 'lucide-react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Pagination } from '../../components/ui/Pagination'
import { SearchInput } from '../../components/ui/SearchInput'
import { Modal } from '../../components/ui/Modal'
import { razorpayEventsApi, type RazorpayWebhookEvent } from '../../services/admin-api'
import { useAdminPaginatedCrud } from '../../hooks/useAdminPaginatedCrud'
import { useToast } from '../../context/ToastContext'
import { formatDate } from '../../utils/formatters'

/**
 * R2 (2026-04) — Razorpay webhook event audit + reconciliation.
 *
 * Shows every /webhook/ event, filterable by type (payment.captured,
 * order.paid, refund.processed, etc.), processed state, and signature
 * validity. Admin uses this for:
 *   - Reconciling a user's reported payment against webhook history
 *   - Finding the raw payload when Razorpay Support asks for it
 *   - Retrying a handler that crashed (e.g. DB was down when the event
 *     arrived) via the /replay/ action
 *
 * Each row deep-links to the Razorpay Dashboard if a payment_id is
 * present, so finance can drill further without leaving the context.
 */
type ProcessedFilter = '' | 'true' | 'false'

export default function RazorpayLogPage() {
  const { addToast } = useToast()

  const [eventTypeFilter, setEventTypeFilter] = useState<string>('')
  const [processedFilter, setProcessedFilter] = useState<ProcessedFilter>('')
  const [signatureValidFilter, setSignatureValidFilter] = useState<string>('')

  const extraParams = useMemo(() => ({
    event_type: eventTypeFilter || undefined,
    processed: processedFilter || undefined,
    signature_valid: signatureValidFilter || undefined,
  }), [eventTypeFilter, processedFilter, signatureValidFilter])

  const { data, loading, page, totalPages, totalCount, search, setPage, setSearch, refresh } =
    useAdminPaginatedCrud<RazorpayWebhookEvent>(razorpayEventsApi, extraParams)

  const [detailEvent, setDetailEvent] = useState<RazorpayWebhookEvent | null>(null)
  const [replaying, setReplaying] = useState<number | null>(null)

  const onReplay = async (evt: RazorpayWebhookEvent) => {
    setReplaying(evt.id)
    try {
      await razorpayEventsApi.replay(evt.id)
      addToast('Event replayed successfully')
      refresh()
    } catch (e) {
      const err = e as { response?: { data?: { detail?: string } } }
      addToast(err.response?.data?.detail ?? 'Replay failed', 'error')
    } finally { setReplaying(null) }
  }

  const eventTypeChip = (type: string) => {
    if (type.startsWith('payment.')) return 'bg-blue-500/15 text-blue-400'
    if (type.startsWith('order.'))   return 'bg-emerald-500/15 text-emerald-400'
    if (type.startsWith('refund.'))  return 'bg-red-500/15 text-red-400'
    if (type.startsWith('subscription.')) return 'bg-purple-500/15 text-purple-400'
    return 'bg-neutral-600/20 text-neutral-400'
  }

  const processedState = (evt: RazorpayWebhookEvent) => {
    if (!evt.signature_valid) return { icon: Shield,        label: 'Rejected',  cls: 'bg-red-500/15 text-red-400' }
    if (evt.error_message)    return { icon: AlertTriangle, label: 'Error',     cls: 'bg-amber-500/15 text-amber-400' }
    if (evt.processed)        return { icon: CheckCircle2,  label: 'Processed', cls: 'bg-emerald-500/15 text-emerald-400' }
    return                           { icon: Clock,         label: 'Pending',   cls: 'bg-neutral-600/20 text-neutral-400' }
  }

  const uniqueEventTypes = Array.from(new Set(data.map(e => e.event_type))).sort()

  const columns: Column<RazorpayWebhookEvent>[] = [
    {
      key: 'received_at', title: 'Received',
      render: e => (
        <div>
          <div className="text-sm text-brand-text">{formatDate(e.received_at)}</div>
          <div className="text-[10px] text-brand-text-muted font-mono truncate max-w-[200px]">{e.event_id}</div>
        </div>
      ),
    },
    {
      key: 'event_type', title: 'Event',
      render: e => (
        <span className={`inline-flex items-center px-2 py-0.5 text-[11px] rounded font-medium ${eventTypeChip(e.event_type)}`}>
          {e.event_type}
        </span>
      ),
    },
    {
      key: 'razorpay_payment_id', title: 'IDs',
      render: e => (
        <div className="space-y-0.5 text-[11px] font-mono text-brand-text-muted">
          {e.razorpay_order_id   && <div>ord: {e.razorpay_order_id.slice(-10)}</div>}
          {e.razorpay_payment_id && <div>pay: {e.razorpay_payment_id.slice(-10)}</div>}
          {e.razorpay_refund_id  && <div>ref: {e.razorpay_refund_id.slice(-10)}</div>}
        </div>
      ),
    },
    {
      key: 'processed', title: 'Status',
      render: e => {
        const s = processedState(e)
        const Icon = s.icon
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full font-medium ${s.cls}`}>
            <Icon className="w-3.5 h-3.5" /> {s.label}
          </span>
        )
      },
    },
    {
      key: 'error_message', title: 'Error',
      render: e => e.error_message
        ? <div className="text-[11px] text-red-400 max-w-sm truncate" title={e.error_message}>{e.error_message}</div>
        : <span className="text-brand-text-muted text-xs">—</span>,
    },
    {
      key: 'actions', title: '',
      render: e => (
        <div className="flex items-center gap-1" onClick={ev => ev.stopPropagation()}>
          <button onClick={() => setDetailEvent(e)} title="View payload"
                  className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-gold">
            <Eye className="w-4 h-4" />
          </button>
          {e.razorpay_payment_id && (
            <a href={`https://dashboard.razorpay.com/app/payments/${e.razorpay_payment_id}`}
               target="_blank" rel="noreferrer"
               title="Open in Razorpay Dashboard"
               className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-gold">
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          {!e.processed && e.signature_valid && (
            <button onClick={() => onReplay(e)} disabled={replaying === e.id}
                    title="Replay handler"
                    className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-emerald-400 disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${replaying === e.id ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      ),
    },
  ]

  const signatureInvalidCount = data.filter(e => !e.signature_valid).length
  const errorCount = data.filter(e => !e.processed && e.signature_valid).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-text flex items-center gap-2">
            <FileText className="w-6 h-6 text-brand-gold" />
            Razorpay Log
          </h1>
          <p className="text-sm text-brand-text-muted mt-0.5">
            {totalCount} events · {errorCount} pending/failed · {signatureInvalidCount} rejected (invalid signature)
          </p>
        </div>
        <SearchInput value={search} onChange={setSearch}
                     placeholder="Search by event_id / order / payment id…"
                     className="w-80" />
      </div>

      {/* Filters */}
      <div className="flex items-end gap-3 flex-wrap p-3 bg-brand-dark-card/60 rounded-xl border border-brand-dark-border/50">
        <FilterGroup icon={Filter} label="Event type">
          <select value={eventTypeFilter} onChange={e => setEventTypeFilter(e.target.value)}
                  className={selectCls}>
            <option value="">All types</option>
            {uniqueEventTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </FilterGroup>
        <FilterGroup icon={CheckCircle2} label="Processed">
          <select value={processedFilter}
                  onChange={e => setProcessedFilter(e.target.value as ProcessedFilter)}
                  className={selectCls}>
            <option value="">Any</option>
            <option value="true">Processed only</option>
            <option value="false">Pending / failed</option>
          </select>
        </FilterGroup>
        <FilterGroup icon={Shield} label="Signature">
          <select value={signatureValidFilter}
                  onChange={e => setSignatureValidFilter(e.target.value)}
                  className={selectCls}>
            <option value="">Any</option>
            <option value="true">Valid only</option>
            <option value="false">Rejected / forged</option>
          </select>
        </FilterGroup>
        {(eventTypeFilter || processedFilter || signatureValidFilter) && (
          <button onClick={() => { setEventTypeFilter(''); setProcessedFilter(''); setSignatureValidFilter('') }}
                  className="ml-auto text-xs text-brand-text-muted hover:text-brand-text underline">
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading…</div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <FileText className="w-10 h-10 text-brand-text-muted/40" />
          <div className="text-sm text-brand-text-muted max-w-md">
            No webhook events match the current filters.
          </div>
        </div>
      ) : (
        <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
          <DataTable columns={columns} data={data} onRowClick={e => setDetailEvent(e)} />
          <Pagination currentPage={page} totalPages={totalPages} totalCount={totalCount} onPageChange={setPage} />
        </div>
      )}

      {/* Detail modal */}
      <Modal isOpen={!!detailEvent} onClose={() => setDetailEvent(null)}
             title={detailEvent ? `Event ${detailEvent.event_id}` : ''} size="2xl">
        {detailEvent && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Info label="Type"          value={detailEvent.event_type} mono />
              <Info label="Received"      value={formatDate(detailEvent.received_at)} />
              <Info label="Order ID"      value={detailEvent.razorpay_order_id || '—'} mono />
              <Info label="Payment ID"    value={detailEvent.razorpay_payment_id || '—'} mono />
              <Info label="Refund ID"     value={detailEvent.razorpay_refund_id || '—'} mono />
              <Info label="Signature"     value={detailEvent.signature_valid ? 'valid' : 'INVALID'} />
              <Info label="Processed"     value={detailEvent.processed ? 'yes' : 'no'} />
              <Info label="Processed at"  value={detailEvent.processed_at ? formatDate(detailEvent.processed_at) : '—'} />
            </div>
            {detailEvent.error_message && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-red-400 mb-1">Error</div>
                <div className="text-xs text-red-200 font-mono">{detailEvent.error_message}</div>
              </div>
            )}
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-brand-text-muted mb-1.5">
                Raw payload
              </div>
              <pre className="max-h-96 overflow-auto bg-brand-dark border border-brand-dark-border rounded-lg p-3 text-[11px] text-brand-text-muted">
{JSON.stringify(detailEvent.payload, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ── Helpers ─────────────────────────────────────────────

const selectCls = 'bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50 min-w-[160px]'

function FilterGroup({
  icon: Icon, label, children,
}: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand-text-muted">
        <Icon className="w-3 h-3" /> {label}
      </label>
      {children}
    </div>
  )
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-brand-text-muted mb-0.5">{label}</div>
      <div className={`text-sm text-brand-text ${mono ? 'font-mono text-xs break-all' : ''}`}>{value}</div>
    </div>
  )
}

// unused guard
void XCircle
