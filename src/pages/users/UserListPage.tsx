import { useState } from 'react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { SearchInput } from '../../components/ui/SearchInput'
import { Pagination } from '../../components/ui/Pagination'
import { usersApi } from '../../services/admin-api'
import { useAdminPaginatedCrud } from '../../hooks/useAdminPaginatedCrud'
import { useToast } from '../../context/ToastContext'
import { formatDate } from '../../utils/formatters'
import type { User } from '../../types'

const PLACEHOLDER_AVATAR = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="#e4e3d7"/><text x="20" y="26" text-anchor="middle" font-size="18" fill="#554336" font-family="sans-serif">?</text></svg>'
)

interface EditForm {
  name: string
  phone: string
  avatar_url: string
  plan: string
  credits: number
  total_downloads: number
  total_shares: number
  is_premium: boolean
}

export default function UserListPage() {
  const { addToast } = useToast()
  const { data, loading, page, totalPages, totalCount, search, setPage, setSearch, refresh } = useAdminPaginatedCrud<User>(usersApi)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [form, setForm] = useState<EditForm>({
    name: '', phone: '', avatar_url: '', plan: 'free',
    credits: 0, total_downloads: 0, total_shares: 0, is_premium: false,
  })
  const [saving, setSaving] = useState(false)

  const openEditModal = (user: User) => {
    setEditingUser(user)
    setForm({
      name: user.name || '',
      phone: user.phone || '',
      avatar_url: user.avatar_url || '',
      plan: (user as any).plan || 'free',
      credits: (user as any).credits || 0,
      total_downloads: (user as any).total_downloads || 0,
      total_shares: (user as any).total_shares || 0,
      is_premium: user.is_premium || false,
    })
  }

  const handleSave = async () => {
    if (!editingUser) return
    setSaving(true)
    try {
      const updated = await usersApi.update(editingUser.id, form)
      refresh()
      setEditingUser(null)
      addToast('User updated successfully')
    } catch {
      addToast('Failed to update user', 'error')
    } finally {
      setSaving(false)
    }
  }

  const columns: Column<User>[] = [
    {
      key: 'avatar_url',
      title: 'Avatar',
      render: (u) => (
        <img
          src={u.avatar_url || PLACEHOLDER_AVATAR}
          alt={u.name}
          className="w-9 h-9 rounded-full object-cover border border-gray-600 cursor-pointer hover:ring-2 hover:ring-amber-500 transition-all"
          onClick={() => openEditModal(u)}
          onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_AVATAR }}
        />
      ),
    },
    { key: 'name', title: 'Name', sortable: true },
    { key: 'phone', title: 'Phone', sortable: true },
    { key: 'plan', title: 'Plan', sortable: true, render: (u) => <StatusBadge status={(u as any).plan || 'free'} /> },
    { key: 'credits', title: 'Credits', sortable: true },
    {
      key: 'is_premium',
      title: 'Premium',
      render: (u) => u.is_premium
        ? <span className="text-brand-gold font-medium">Yes</span>
        : <span className="text-brand-text-muted">No</span>,
    },
    { key: 'joined_at', title: 'Joined', sortable: true, render: (u) => formatDate(u.joined_at as string) },
    {
      key: 'id',
      title: 'Actions',
      render: (u) => (
        <button
          onClick={() => openEditModal(u)}
          className="text-xs px-3 py-1 rounded bg-amber-700/20 text-amber-400 hover:bg-amber-700/40 transition-colors"
        >
          Edit
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-text">Users</h1>
        <SearchInput value={search} onChange={setSearch} placeholder="Search users..." className="w-64" />
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div>
      ) : (
        <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
          <DataTable columns={columns} data={data} />
          <Pagination currentPage={page} totalPages={totalPages} totalCount={totalCount} onPageChange={setPage} />
        </div>
      )}

      {/* ── Full Edit Modal ── */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1e1e2e] rounded-2xl p-6 w-full max-w-lg border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-1">Edit User</h2>
            <p className="text-sm text-gray-400 mb-4">{editingUser.email}</p>

            {/* Avatar preview */}
            <div className="flex justify-center mb-4">
              <img
                src={form.avatar_url || PLACEHOLDER_AVATAR}
                alt="Preview"
                className="w-16 h-16 rounded-full object-cover border-2 border-gray-600"
                onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_AVATAR }}
              />
            </div>

            <div className="space-y-3">
              {/* Name + Phone */}
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-gray-400">Name</span>
                  <input type="text" className="mt-1 block w-full bg-[#2a2a3e] border border-gray-600 rounded-lg px-3 py-2 text-sm text-white"
                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-400">Phone</span>
                  <input type="text" className="mt-1 block w-full bg-[#2a2a3e] border border-gray-600 rounded-lg px-3 py-2 text-sm text-white"
                    value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </label>
              </div>

              {/* Avatar URL */}
              <label className="block">
                <span className="text-xs text-gray-400">Avatar URL</span>
                <input type="text" className="mt-1 block w-full bg-[#2a2a3e] border border-gray-600 rounded-lg px-3 py-2 text-sm text-white"
                  value={form.avatar_url} onChange={e => setForm({ ...form, avatar_url: e.target.value })} />
              </label>

              {/* Plan + Premium */}
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-gray-400">Plan</span>
                  <select className="mt-1 block w-full bg-[#2a2a3e] border border-gray-600 rounded-lg px-3 py-2 text-sm text-white"
                    value={form.plan} onChange={e => setForm({ ...form, plan: e.target.value })}>
                    <option value="free">Free</option>
                    <option value="basic">Basic</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 mt-5">
                  <input type="checkbox" checked={form.is_premium}
                    onChange={e => setForm({ ...form, is_premium: e.target.checked })}
                    className="rounded border-gray-600 bg-[#2a2a3e]" />
                  <span className="text-sm text-white">Premium</span>
                </label>
              </div>

              {/* Credits + Downloads + Shares */}
              <div className="grid grid-cols-3 gap-3">
                <label className="block">
                  <span className="text-xs text-gray-400">AI Credits</span>
                  <input type="number" className="mt-1 block w-full bg-[#2a2a3e] border border-gray-600 rounded-lg px-3 py-2 text-sm text-white"
                    value={form.credits} onChange={e => setForm({ ...form, credits: +e.target.value })} />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-400">Downloads</span>
                  <input type="number" className="mt-1 block w-full bg-[#2a2a3e] border border-gray-600 rounded-lg px-3 py-2 text-sm text-white"
                    value={form.total_downloads} onChange={e => setForm({ ...form, total_downloads: +e.target.value })} />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-400">Shares</span>
                  <input type="number" className="mt-1 block w-full bg-[#2a2a3e] border border-gray-600 rounded-lg px-3 py-2 text-sm text-white"
                    value={form.total_shares} onChange={e => setForm({ ...form, total_shares: +e.target.value })} />
                </label>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-5">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2 bg-amber-700 text-white rounded-lg font-medium text-sm hover:bg-amber-800 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={() => setEditingUser(null)}
                className="px-4 py-2 border border-gray-600 text-gray-400 rounded-lg text-sm hover:bg-gray-800">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
