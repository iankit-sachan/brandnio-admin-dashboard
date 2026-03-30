import { useState, useEffect } from 'react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { generatedAdsApi, adConfigApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'
import type { GeneratedAd } from '../../types'
import { StatusBadge } from '../../components/ui/StatusBadge'

export default function GeneratedAdMonitorPage() {
  const { data, loading } = useAdminCrud<GeneratedAd>(generatedAdsApi)
  const [currency, setCurrency] = useState('₹')

  useEffect(() => {
    adConfigApi.get().then(c => setCurrency(c?.currency_symbol || '₹')).catch(() => {})
  }, [])

  const columns: Column<GeneratedAd>[] = [
    { key: 'id', title: 'ID' },
    { key: 'user_name', title: 'User', sortable: true },
    { key: 'product_name', title: 'Product' },
    { key: 'ad_text', title: 'Ad Text', render: (a) => <span className="truncate max-w-[200px] block">{a.ad_text}</span> },
    { key: 'status', title: 'Status', render: (a) => <StatusBadge status={a.status} /> },
    { key: 'credits_charged', title: 'Credits', render: (a) => <span>{currency}{a.credits_charged}</span> },
    { key: 'created_at', title: 'Created' },
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-brand-text">Generated Ads Monitor</h1>
      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading ? <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div> : <DataTable columns={columns} data={data} />}
      </div>
    </div>
  )
}
