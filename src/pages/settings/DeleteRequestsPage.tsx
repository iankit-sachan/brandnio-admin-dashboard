import { useState } from 'react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { CheckCircle, XCircle } from 'lucide-react'
import { deleteRequestsApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'

type RequestStatus = 'pending' | 'approved' | 'rejected'

interface DeleteRequest {
  id: number
  user_name: string
  email: string
  request_date: string
  reason: string
  status: RequestStatus
}

const statusColors: Record<RequestStatus, string> = {
  pending: 'bg-brand-gold/20 text-brand-gold',
  approved: 'bg-status-success/20 text-status-success',
  rejected: 'bg-status-error/20 text-status-error',
}

export default function DeleteRequestsPage() {
  const { addToast } = useToast()
  const { data, loading, setData } = useAdminCrud<DeleteRequest>(deleteRequestsApi)
  const [confirmAction, setConfirmAction] = useState<{ item: DeleteRequest; action: 'approve' | 'reject' } | null>(null)
  const [adminNotes, setAdminNotes] = useState('')

  const handleConfirm = async () => {
    if (!confirmAction) return
    const { item, action } = confirmAction
    try {
      if (action === 'approve') {
        await deleteRequestsApi.approve(item.id, adminNotes || undefined)
      } else {
        await deleteRequestsApi.reject(item.id, adminNotes || undefined)
      }
      const newStatus: RequestStatus = action === 'approve' ? 'approved' : 'rejected'
      setData(prev => prev.map(d => d.id === item.id ? { ...d, status: newStatus } : d))
      addToast(`Request ${newStatus} successfully`)
    } catch {
      addToast(`Failed to ${action} request`, 'error')
    }
    setConfirmAction(null)
    setAdminNotes('')
  }

  const columns: Column<DeleteRequest>[] = [
    { key: 'user_name', title: 'User Name', sortable: true },
    { key: 'email', title: 'Email', sortable: true },
    { key: 'request_date', title: 'Request Date', sortable: true },
    { key: 'reason', title: 'Reason' },
    { key: 'status', title: 'Status', sortable: true, render: (item) => (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[item.status]}`}>
        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
      </span>
    )},
    { key: 'actions', title: 'Actions', render: (item) => (
      item.status === 'pending' ? (
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); setConfirmAction({ item, action: 'approve' }) }} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-status-success/20 text-status-success hover:bg-status-success/30 transition-colors">
            <CheckCircle className="h-3.5 w-3.5" /> Approve
          </button>
          <button onClick={(e) => { e.stopPropagation(); setConfirmAction({ item, action: 'reject' }) }} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-status-error/20 text-status-error hover:bg-status-error/30 transition-colors">
            <XCircle className="h-3.5 w-3.5" /> Reject
          </button>
        </div>
      ) : (
        <span className="text-xs text-brand-text-muted">No actions</span>
      )
    )},
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-text">Delete Requests</h1>
        <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-brand-gold/20 text-brand-gold">
          {data.filter(d => d.status === 'pending').length} Pending
        </span>
      </div>
      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading ? <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div> : <DataTable columns={columns} data={data} />}
      </div>

      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => { setConfirmAction(null); setAdminNotes('') }}
        onConfirm={handleConfirm}
        title={confirmAction?.action === 'approve' ? 'Approve Delete Request' : 'Reject Delete Request'}
        message={confirmAction?.action === 'approve'
          ? `Are you sure you want to approve the deletion request from "${confirmAction?.item.user_name}"? This will permanently delete their account and all associated data.`
          : `Are you sure you want to reject the deletion request from "${confirmAction?.item.user_name}"?`
        }
        confirmText={confirmAction?.action === 'approve' ? 'Approve' : 'Reject'}
        variant={confirmAction?.action === 'approve' ? 'warning' : 'danger'}
      >
        <textarea
          value={adminNotes}
          onChange={e => setAdminNotes(e.target.value)}
          placeholder="Admin notes (optional)"
          rows={3}
          className="w-full mt-3 px-3 py-2 rounded-lg bg-brand-dark border border-brand-dark-border text-brand-text text-sm placeholder-brand-text-muted/50 focus:outline-none focus:border-brand-gold/50"
        />
      </ConfirmDialog>
    </div>
  )
}
