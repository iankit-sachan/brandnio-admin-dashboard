import { useState } from 'react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { SearchInput } from '../../components/ui/SearchInput'
import { mockUsers } from '../../services/mock-data'
import { formatDate } from '../../utils/formatters'
import type { User } from '../../types'

const columns: Column<User>[] = [
  { key: 'name', title: 'Name', sortable: true },
  { key: 'phone', title: 'Phone', sortable: true },
  { key: 'plan', title: 'Plan', sortable: true, render: (u) => <StatusBadge status={u.plan as string} /> },
  { key: 'credits', title: 'Credits', sortable: true },
  { key: 'is_premium', title: 'Premium', render: (u) => u.is_premium ? <span className="text-brand-gold font-medium">Yes</span> : <span className="text-brand-text-muted">No</span> },
  { key: 'joined_at', title: 'Joined', sortable: true, render: (u) => formatDate(u.joined_at as string) },
]

export default function UserListPage() {
  const [search, setSearch] = useState('')
  const filtered = mockUsers.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.phone.includes(search))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-text">Users</h1>
        <SearchInput value={search} onChange={setSearch} placeholder="Search users..." className="w-64" />
      </div>
      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        <DataTable columns={columns} data={filtered} />
      </div>
    </div>
  )
}
