import { useState } from 'react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { SearchInput } from '../../components/ui/SearchInput'
import { usersApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'
import { useToast } from '../../context/ToastContext'
import { formatDate } from '../../utils/formatters'
import type { User } from '../../types'

const PLACEHOLDER_AVATAR = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="#e4e3d7"/><text x="20" y="26" text-anchor="middle" font-size="18" fill="#554336" font-family="sans-serif">?</text></svg>'
)

export default function UserListPage() {
  const { addToast } = useToast()
  const { data, loading, setData } = useAdminCrud<User>(usersApi)
  const [search, setSearch] = useState('')
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [avatarInput, setAvatarInput] = useState('')
  const [saving, setSaving] = useState(false)

  const filtered = data.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) || u.phone.includes(search)
  )

  const openEditModal = (user: User) => {
    setEditingUser(user)
    setAvatarInput(user.avatar_url || '')
  }

  const handleSaveAvatar = async () => {
    if (!editingUser) return
    setSaving(true)
    try {
      const updated = await usersApi.update(editingUser.id, { avatar_url: avatarInput })
      setData(prev => prev.map(u => u.id === editingUser.id ? { ...u, avatar_url: avatarInput } : u))
      setEditingUser(null)
      addToast('Avatar updated successfully')
    } catch {
      addToast('Failed to update avatar', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAvatar = async () => {
    if (!editingUser) return
    setSaving(true)
    try {
      await usersApi.update(editingUser.id, { avatar_url: '' })
      setData(prev => prev.map(u => u.id === editingUser.id ? { ...u, avatar_url: '' } : u))
      setEditingUser(null)
      addToast('Avatar removed')
    } catch {
      addToast('Failed to remove avatar', 'error')
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
    { key: 'plan', title: 'Plan', sortable: true, render: (u) => <StatusBadge status={u.plan as string} /> },
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
          Edit Avatar
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
          <DataTable columns={columns} data={filtered} />
        </div>
      )}

      {/* ── Edit Avatar Modal ── */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1e1e2e] rounded-2xl p-6 w-full max-w-md border border-gray-700 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-1">Edit Avatar</h2>
            <p className="text-sm text-gray-400 mb-4">{editingUser.name} ({editingUser.phone})</p>

            {/* Current avatar preview */}
            <div className="flex justify-center mb-4">
              <img
                src={avatarInput || PLACEHOLDER_AVATAR}
                alt="Preview"
                className="w-20 h-20 rounded-full object-cover border-2 border-gray-600"
                onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_AVATAR }}
              />
            </div>

            {/* URL input */}
            <label className="block mb-4">
              <span className="text-xs text-gray-400">Avatar URL</span>
              <input
                type="text"
                value={avatarInput}
                onChange={(e) => setAvatarInput(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="mt-1 block w-full bg-[#2a2a3e] border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </label>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleSaveAvatar}
                disabled={saving}
                className="flex-1 py-2 bg-amber-700 text-white rounded-lg font-medium text-sm hover:bg-amber-800 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleDeleteAvatar}
                disabled={saving}
                className="px-4 py-2 bg-red-700/20 text-red-400 rounded-lg text-sm hover:bg-red-700/40"
              >
                Remove
              </button>
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 border border-gray-600 text-gray-400 rounded-lg text-sm hover:bg-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
