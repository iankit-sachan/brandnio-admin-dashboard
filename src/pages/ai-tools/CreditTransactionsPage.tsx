import { useState } from 'react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { Trash2 } from 'lucide-react'
import { creditTransactionsApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'
import type { CreditTransaction, CreditTransactionType } from '../../types/credit.types'

const typeBadgeColors: Record<CreditTransactionType, string> = {
  purchase: 'bg-status-success/20 text-status-success',
  usage: 'bg-status-error/20 text-status-error',
  refund: 'bg-blue-500/20 text-blue-400',
  bonus: 'bg-purple-500/20 text-purple-400',
  referral: 'bg-orange-500/20 text-orange-400',
  subscription: 'bg-teal-500/20 text-teal-400',
}

export default function CreditTransactionsPage() {
  const { addToast } = useToast()
  const { data, loading, remove } = useAdminCrud<CreditTransaction>(creditTransactionsApi)
  const [deleteTarget, setDeleteTarget] = useState<CreditTransaction | null>(null)

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await remove(deleteTarget.id)
      addToast('Transaction deleted successfully')
      setDeleteTarget(null)
    } catch {
      addToast('Delete failed. Please try again.', 'error')
    }
  }

  const columns: Column<CreditTransaction>[] = [
    { key: 'id', title: 'ID' },
    { key: 'user_email', title: 'User', sortable: true },
    { key: 'transaction_type', title: 'Type', render: (t) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeBadgeColors[t.transaction_type] || 'bg-gray-500/20 text-gray-400'}`}>
        {t.transaction_type}
      </span>
    )},
    { key: 'amount', title: 'Amount', render: (t) => (
      <span className={t.amount >= 0 ? 'text-status-success font-medium' : 'text-status-error font-medium'}>
        {t.amount >= 0 ? '+' : ''}{t.amount}
      </span>
    )},
    { key: 'balance_after', title: 'Balance After' },
    { key: 'description', title: 'Description', render: (t) => <span className="truncate max-w-[200px] block">{t.description}</span> },
    { key: 'created_at', title: 'Created' },
    { key: 'actions', title: 'Actions', render: (item) => (
      <div className="flex items-center gap-2">
        <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-status-error transition-colors"><Trash2 className="h-4 w-4" /></button>
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-brand-text">Credit Transactions</h1>
      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading ? <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div> : <DataTable columns={columns} data={data} />}
      </div>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Transaction" message={`Are you sure you want to delete transaction #${deleteTarget?.id}? This action cannot be undone.`} confirmText="Delete" variant="danger" />
    </div>
  )
}
