import { useEffect, useMemo, useState } from 'react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { SearchInput } from '../../components/ui/SearchInput'
import { Pagination } from '../../components/ui/Pagination'
import { Avatar } from '../../components/ui/Avatar'
import { ActionMenu, type ActionMenuItem } from '../../components/ui/ActionMenu'
import { usersApi } from '../../services/admin-api'
import { useAdminPaginatedCrud } from '../../hooks/useAdminPaginatedCrud'
import { useToast } from '../../context/ToastContext'
import { formatDate } from '../../utils/formatters'
import api from '../../services/api'
import type { User } from '../../types'
import PlanActivationModal from './PlanActivationModal'
import UserDetailsModal from './UserDetailsModal'

type Tab = 'active' | 'deleted'
type PlanFilter = '' | 'free' | 'basic' | 'pro' | 'enterprise'
type PremiumFilter = '' | 'true' | 'false'

interface EditForm {
  name: string
  phone: string
  avatar_url: string
  credits: number
}

export default function UserListPage() {
  const { addToast } = useToast()

  // ── Tab + filter + sort state ─────────────────────────────────────
  const [tab, setTab] = useState<Tab>('active')
  const [planFilter, setPlanFilter] = useState<PlanFilter>('')
  const [premiumFilter, setPremiumFilter] = useState<PremiumFilter>('')
  const [sortKey, setSortKey] = useState<string>('joined_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Tab counts (fetched separately to avoid an extra backend endpoint)
  const [activeCount, setActiveCount] = useState<number | null>(null)
  const [deletedCount, setDeletedCount] = useState<number | null>(null)

  const extraParams = useMemo(() => {
    const p: Record<string, string | number | undefined> = {
      is_deleted: tab === 'deleted' ? 'true' : 'false',
      ordering: sortDir === 'desc' ? `-${sortKey}` : sortKey,
    }
    if (planFilter) p.plan = planFilter
    if (premiumFilter) p.is_premium = premiumFilter
    return p
  }, [tab, planFilter, premiumFilter, sortKey, sortDir])

  const { data, loading, page, totalPages, totalCount, search, setPage, setSearch, refresh } =
    useAdminPaginatedCrud<User>(usersApi, extraParams)

  // Keep tab counter in sync when the current-tab totalCount changes
  useEffect(() => {
    if (tab === 'active') setActiveCount(totalCount)
    else setDeletedCount(totalCount)
  }, [tab, totalCount])

  // Fetch the OTHER tab's count once on mount (and after any mutation via refresh)
  useEffect(() => {
    const other = tab === 'active' ? 'true' : 'false'
    api.get('/api/admin/users/', { params: { is_deleted: other, page: 1, page_size: 1 } })
      .then(r => {
        const count = (r.data && typeof r.data === 'object' && 'count' in r.data) ? r.data.count : 0
        if (tab === 'active') setDeletedCount(count)
        else setActiveCount(count)
      })
      .catch(() => { /* silent — non-critical */ })
  }, [tab])

  // ── Modals state ──────────────────────────────────────────────────
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [form, setForm] = useState<EditForm>({ name: '', phone: '', avatar_url: '', credits: 0 })
  const [saving, setSaving] = useState(false)
  const [planUser, setPlanUser] = useState<User | null>(null)
  const [detailsUser, setDetailsUser] = useState<User | null>(null)
  const [deleteUser, setDeleteUser] = useState<User | null>(null)
  const [deleting, setDeleting] = useState(false)

  const openEditModal = (user: User) => {
    setEditingUser(user)
    setForm({
      name: user.name || '',
      phone: user.phone || '',
      avatar_url: user.avatar_url || '',
      credits: (user as unknown as { credits?: number }).credits || 0,
    })
  }

  const handleSave = async () => {
    if (!editingUser) return
    setSaving(true)
    try {
      await usersApi.update(editingUser.id, form)
      refresh()
      setEditingUser(null)
      addToast('User updated successfully')
    } catch {
      addToast('Failed to update user', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSoftDelete = async () => {
    if (!deleteUser) return
    setDeleting(true)
    try {
      await usersApi.delete(deleteUser.id)
      addToast('User deleted')
      refresh()
      // Cross-tab count update
      setActiveCount(c => (c != null ? Math.max(0, c - 1) : c))
      setDeletedCount(c => (c != null ? c + 1 : c))
      setDeleteUser(null)
    } catch {
      addToast('Delete failed', 'error')
    } finally { setDeleting(false) }
  }

  const handleRestore = async (u: User) => {
    try {
      await usersApi.restore(u.id)
      addToast('User restored')
      refresh()
      setActiveCount(c => (c != null ? c + 1 : c))
      setDeletedCount(c => (c != null ? Math.max(0, c - 1) : c))
    } catch {
      addToast('Restore failed', 'error')
    }
  }

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const switchTab = (t: Tab) => {
    if (t === tab) return
    setTab(t)
    setPage(1)
    setPlanFilter('')
    setPremiumFilter('')
    setSearch('')
    setSortKey('joined_at')
    setSortDir('desc')
  }

  const isDeletedTab = tab === 'deleted'

  // ── Columns ───────────────────────────────────────────────────────
  const columns: Column<User>[] = [
    {
      key: 'avatar_url',
      title: 'Avatar',
      className: 'w-16 text-center',
      render: (u) => (
        <Avatar
          src={u.avatar_url}
          name={u.name}
          id={u.id}
          size={36}
          dimmed={u.is_deleted}
          onClick={() => !u.is_deleted && openEditModal(u)}
        />
      ),
    },
    {
      key: 'name',
      title: 'Name',
      sortable: true,
      className: 'min-w-[180px]',
      render: (u) => (
        <div className="flex items-center gap-2">
          <span className={u.name ? '' : 'italic text-brand-text-muted'}>
            {u.name || '— Unnamed —'}
          </span>
          {u.is_deleted && (
            <span className="inline-block text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-red-900/40 text-red-300 border border-red-700/50">
              Deleted
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'phone',
      title: 'Phone',
      sortable: true,
      className: 'w-[160px]',
      render: (u) => u.phone || <span className="text-brand-text-muted">—</span>,
    },
    {
      key: 'plan',
      title: 'Plan',
      sortable: true,
      className: 'w-[110px]',
      render: (u) => <StatusBadge status={(u as unknown as { plan?: string }).plan || 'free'} />,
    },
    {
      key: 'credits',
      title: 'Credits',
      sortable: true,
      className: 'w-[100px] text-right',
      render: (u) => (
        <span className="tabular-nums" title="AI credits">
          {(u as unknown as { credits?: number }).credits ?? 0}
        </span>
      ),
    },
    {
      key: 'is_premium',
      title: 'Premium',
      className: 'w-[100px] text-center',
      render: (u) => u.is_premium ? (
        <span className="inline-flex items-center gap-1 text-brand-gold text-xs font-medium">
          <span>★</span> Premium
        </span>
      ) : (
        <span className="text-xs text-brand-text-muted">Free</span>
      ),
    },
    {
      key: 'joined_at',
      title: 'Joined',
      sortable: true,
      className: 'w-[120px]',
      render: (u) => <span className="text-sm text-brand-text-muted">{formatDate(u.joined_at as string)}</span>,
    },
    {
      key: 'actions',
      title: 'Actions',
      className: 'w-[180px] text-left',
      render: (u) => {
        const items: ActionMenuItem[] = u.is_deleted
          ? [
              { label: 'Restore', variant: 'success', onClick: () => handleRestore(u) },
            ]
          : [
              { label: 'Edit', onClick: () => openEditModal(u) },
              { label: 'Plan Active', variant: 'success', onClick: () => setPlanUser(u) },
              { label: 'Delete', variant: 'danger', onClick: () => setDeleteUser(u) },
            ]
        return (
          <ActionMenu
            primary={{ label: 'View Details', onClick: () => setDetailsUser(u) }}
            items={items}
          />
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-brand-text">Users</h1>

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-brand-dark-border">
        {(['active', 'deleted'] as Tab[]).map(t => {
          const c = t === 'active' ? activeCount : deletedCount
          const active = tab === t
          return (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ' +
                (active
                  ? 'text-brand-gold border-brand-gold'
                  : 'text-brand-text-muted border-transparent hover:text-brand-text')
              }
            >
              {t === 'active' ? 'Active' : 'Deleted'}
              {c != null && (
                <span className={'ml-2 text-xs ' + (active ? 'text-brand-gold' : 'text-brand-text-muted')}>
                  ({c})
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Filter row ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            label="Plan"
            value={planFilter}
            onChange={(v) => { setPlanFilter(v as PlanFilter); setPage(1) }}
            options={[
              { value: '', label: 'All Plans' },
              { value: 'free', label: 'Free' },
              { value: 'basic', label: 'Basic' },
              { value: 'pro', label: 'Pro' },
              { value: 'enterprise', label: 'Enterprise' },
            ]}
          />
          <FilterSelect
            label="Premium"
            value={premiumFilter}
            onChange={(v) => { setPremiumFilter(v as PremiumFilter); setPage(1) }}
            options={[
              { value: '', label: 'All' },
              { value: 'true', label: 'Premium only' },
              { value: 'false', label: 'Free only' },
            ]}
          />
          {(planFilter || premiumFilter || search) && (
            <button
              onClick={() => { setPlanFilter(''); setPremiumFilter(''); setSearch(''); setPage(1) }}
              className="text-xs px-2 py-1.5 text-brand-text-muted hover:text-brand-text underline"
            >Clear</button>
          )}
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search users..." className="w-64" />
      </div>

      {/* ── Table ────────────────────────────────────────────────── */}
      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          keyExtractor={(u) => u.id}
        />
        <Pagination currentPage={page} totalPages={totalPages} totalCount={totalCount} onPageChange={setPage} />
      </div>

      {/* ── Edit Modal ──────────────────────────────────────────── */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1e1e2e] rounded-2xl p-6 w-full max-w-lg border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-1">Edit User</h2>
            <p className="text-sm text-gray-400 mb-4">{editingUser.email}</p>

            <div className="flex justify-center mb-4">
              <Avatar src={form.avatar_url} name={form.name} id={editingUser.id} size={64} />
            </div>

            <div className="space-y-3">
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
              <label className="block">
                <span className="text-xs text-gray-400">Avatar URL</span>
                <input type="text" className="mt-1 block w-full bg-[#2a2a3e] border border-gray-600 rounded-lg px-3 py-2 text-sm text-white"
                  value={form.avatar_url} onChange={e => setForm({ ...form, avatar_url: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-xs text-gray-400">AI Credits</span>
                <input type="number" className="mt-1 block w-full bg-[#2a2a3e] border border-gray-600 rounded-lg px-3 py-2 text-sm text-white"
                  value={form.credits} onChange={e => setForm({ ...form, credits: +e.target.value })} />
              </label>
              <div className="text-xs text-gray-500 bg-[#2a2a3e]/50 rounded px-3 py-2">
                ℹ️ Plan &amp; premium status are managed via the <span className="text-green-400">Plan Active</span> button.
              </div>
            </div>

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

      {planUser && (
        <PlanActivationModal user={planUser} onClose={() => setPlanUser(null)} onActivated={refresh} />
      )}

      {detailsUser && (
        <UserDetailsModal user={detailsUser} onClose={() => setDetailsUser(null)} />
      )}

      {deleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1e1e2e] rounded-2xl p-6 w-full max-w-md border border-red-500/30 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-2">Delete user?</h2>
            <p className="text-sm text-gray-300 mb-1">
              <span className="font-medium text-white">{deleteUser.name || deleteUser.email}</span> will be soft-deleted.
            </p>
            <ul className="text-xs text-gray-400 list-disc list-inside mb-4 space-y-0.5">
              <li>Row moves to the <span className="text-brand-text">Deleted</span> tab</li>
              <li>Active subscription will be cancelled</li>
              <li>You can restore from the Deleted tab anytime</li>
            </ul>
            <div className="flex gap-3">
              <button onClick={handleSoftDelete} disabled={deleting}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 disabled:opacity-50">
                {deleting ? 'Deleting...' : 'Soft-delete'}
              </button>
              <button onClick={() => setDeleteUser(null)}
                className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg text-sm hover:bg-gray-800">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── FilterSelect ─────────────────────────────────────────────────────
function FilterSelect({ label, value, onChange, options }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <label className="flex items-center gap-2 bg-brand-dark-card border border-brand-dark-border/50 rounded-lg px-3 py-1.5 text-sm">
      <span className="text-xs text-brand-text-muted">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-transparent outline-none text-brand-text cursor-pointer"
      >
        {options.map(o => <option key={o.value} value={o.value} className="bg-[#1e1e2e]">{o.label}</option>)}
      </select>
    </label>
  )
}
