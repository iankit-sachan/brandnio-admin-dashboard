import { useState, useEffect } from 'react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { Trash2 } from 'lucide-react'
import { generatedAdsApi, adConfigApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'
import type { GeneratedAd } from '../../types'
import { StatusBadge } from '../../components/ui/StatusBadge'

export default function GeneratedAdMonitorPage() {
  const { addToast } = useToast()
  const { data, loading, remove } = useAdminCrud<GeneratedAd>(generatedAdsApi)
  const [deleteTarget, setDeleteTarget] = useState<GeneratedAd | null>(null)
  const [currency, setCurrency] = useState('₹')

  useEffect(() => {
    adConfigApi.get().then(c => setCurrency(c?.currency_symbol || '₹')).catch(() => {})
  }, [])

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await remove(deleteTarget.id)
      addToast('Generated ad deleted successfully')
      setDeleteTarget(null)
    } catch {
      addToast('Delete failed. Please try again.', 'error')
    }
  }

  const columns: Column<GeneratedAd>[] = [
    { key: 'id', title: 'ID' },
    { key: 'user_name', title: 'User', sortable: true },
    { key: 'product_name', title: 'Product' },
    { key: 'ad_text', title: 'Ad Text', render: (a) => <span className="truncate max-w-[200px] block">{a.ad_text}</span> },
    { key: 'status', title: 'Status', render: (a) => <StatusBadge status={a.status} /> },
    { key: 'credits_charged', title: 'Credits', render: (a) => <span>{currency}{a.credits_charged}</span> },
    { key: 'created_at', title: 'Created' },
    { key: 'actions', title: 'Actions', render: (item) => (
      <div className="flex items-center gap-2">
        <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-status-error transition-colors"><Trash2 className="h-4 w-4" /></button>
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-brand-text">Generated Ads Monitor</h1>
      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading ? <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div> : <DataTable columns={columns} data={data} />}
      </div>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Generated Ad" message={`Are you sure you want to delete this generated ad for "${deleteTarget?.product_name}"? This action cannot be undone.`} confirmText="Delete" variant="danger" />
    </div>
  )
}
