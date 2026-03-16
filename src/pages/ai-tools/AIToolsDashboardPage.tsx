import { DataTable, type Column } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { mockAIToolUsage } from '../../services/mock-data'
import { formatDate } from '../../utils/formatters'
import { AI_TOOL_LABELS } from '../../utils/constants'
import type { AIToolUsage } from '../../types'

const columns: Column<AIToolUsage>[] = [
  { key: 'user_name', title: 'User', sortable: true },
  { key: 'tool_type', title: 'Tool', sortable: true, render: (t) => AI_TOOL_LABELS[t.tool_type as string] || (t.tool_type as string) },
  { key: 'status', title: 'Status', render: (t) => <StatusBadge status={t.status as string} /> },
  { key: 'credits_used', title: 'Credits', sortable: true },
  { key: 'processing_time_ms', title: 'Time (ms)', render: (t) => t.processing_time_ms ? `${t.processing_time_ms}ms` : '—' },
  { key: 'created_at', title: 'Date', sortable: true, render: (t) => formatDate(t.created_at as string) },
]

export default function AIToolsDashboardPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-brand-text">AI Tools Usage</h1>
      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        <DataTable columns={columns} data={mockAIToolUsage} />
      </div>
    </div>
  )
}
