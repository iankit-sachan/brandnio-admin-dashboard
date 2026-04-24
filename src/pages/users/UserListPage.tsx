import { useEffect, useMemo, useState } from 'react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { SearchInput } from '../../components/ui/SearchInput'
import { Pagination } from '../../components/ui/Pagination'
import { Avatar } from '../../components/ui/Avatar'
import { ActionMenu, type ActionMenuItem } from '../../components/ui/ActionMenu'
import { usersApi, languagesApi } from '../../services/admin-api'
import { useAdminPaginatedCrud } from '../../hooks/useAdminPaginatedCrud'
import { useToast } from '../../context/ToastContext'
import { formatDate } from '../../utils/formatters'
import api from '../../services/api'
import type { User } from '../../types'
import PlanActivationModal from './PlanActivationModal'
import UserDetailsModal from './UserDetailsModal'
import SendPushModal, { type SendPushFilter } from './SendPushModal'
import { Send, X } from 'lucide-react'

type Tab = 'active' | 'deleted'
type PlanFilter = '' | 'free' | 'basic' | 'pro' | 'enterprise'
type PremiumFilter = '' | 'true' | 'false'
// Pillar 2: server-side filter on `last_seen_at`. Uses ISO string params
// `last_seen_after` (active recently) / `last_seen_before` (inactive a while).
// Empty = no filter, 'never' = never seen.
type ActivityFilter = '' | 'online' | '24h' | '7d' | '30d' | 'inactive_30d' | 'never'

/** Returns the ISO timestamp N hours ago — used as `last_seen_after` filter param. */
function isoHoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3600 * 1000).toISOString()
}

/** Renders "Online", "5m ago", "2h ago", "3d ago", or "Never" for a last_seen_at timestamp. */
function LastSeenBadge({ value }: { value: string | null }) {
  if (!value) {
    return <span className="text-xs text-brand-text-muted/60">Never</span>
  }
  const seenMs = new Date(value).getTime()
  if (isNaN(seenMs)) return <span className="text-xs text-brand-text-muted/60">—</span>
  const diffMin = Math.floor((Date.now() - seenMs) / 60000)
  if (diffMin < 5) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs">
        <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
        <span className="text-status-success font-medium">Online</span>
      </span>
    )
  }
  let label: string
  if (diffMin < 60) label = `${diffMin}m ago`
  else if (diffMin < 60 * 24) label = `${Math.floor(diffMin / 60)}h ago`
  else if (diffMin < 60 * 24 * 30) label = `${Math.floor(diffMin / (60 * 24))}d ago`
  else label = `${Math.floor(diffMin / (60 * 24 * 30))}mo ago`
  const stale = diffMin > 60 * 24 * 7  // > 7 days = grey it out
  return (
    <span className={'text-xs ' + (stale ? 'text-brand-text-muted/70' : 'text-brand-text-muted')}>
      {label}
    </span>
  )
}

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
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('')
  // 2026-04-24: filter by user's preferred language. Stores the Language.id
  // as a string (empty string = "all languages"). Backend UserViewSet maps
  // `?languages=<id>` to the M2M exact lookup.
  const [languageFilter, setLanguageFilter] = useState<string>('')
  // Admin-managed Language catalogue — loaded once on mount to feed the
  // filter dropdown and the column's id → display-name lookup. Small
  // dataset (≤ 20 rows), fetched unpaginated.
  const [availableLanguages, setAvailableLanguages] = useState<
    Array<{ id: number; code: string; name: string }>
  >([])
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
    // 2026-04-24: language filter maps to the M2M exact lookup on backend.
    if (languageFilter) p.languages = languageFilter
    // Pillar 2: server-side filter on last_seen_at via Django filter backend.
    // Map UI labels to ISO timestamp ranges that the User queryset will respect
    // (requires `django-filter` `last_seen_at__gte` lookup — added in views).
    switch (activityFilter) {
      case 'online': p.last_seen_at__gte = isoHoursAgo(0.083); break  // 5 min
      case '24h':    p.last_seen_at__gte = isoHoursAgo(24); break
      case '7d':     p.last_seen_at__gte = isoHoursAgo(24 * 7); break
      case '30d':    p.last_seen_at__gte = isoHoursAgo(24 * 30); break
      case 'inactive_30d': p.last_seen_at__lt = isoHoursAgo(24 * 30); break
      case 'never':  p.last_seen_at__isnull = 'true'; break
    }
    return p
  }, [tab, planFilter, premiumFilter, activityFilter, languageFilter, sortKey, sortDir])

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

  // 2026-04-24: load the admin-managed Language catalogue once for the
  // filter dropdown + the Languages column's id→name lookup. Only a
  // handful of rows (< 20) so we fetch them unpaginated. Silent on error
  // — the column falls back to rendering raw codes if the catalogue isn't
  // available. Not in the hot path; does not block initial render.
  useEffect(() => {
    let cancelled = false
    languagesApi.list()
      .then((rows) => {
        if (cancelled) return
        const list = Array.isArray(rows) ? rows : []
        setAvailableLanguages(
          list
            .filter((r): r is { id: number; code: string; name: string } =>
              !!r && typeof r === 'object' &&
              typeof (r as { id?: unknown }).id === 'number' &&
              typeof (r as { code?: unknown }).code === 'string' &&
              typeof (r as { name?: unknown }).name === 'string'
            )
            .map(r => ({ id: r.id, code: r.code, name: r.name }))
        )
      })
      .catch(() => { /* silent — non-critical */ })
    return () => { cancelled = true }
  }, [])

  // ── Modals state ──────────────────────────────────────────────────
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [form, setForm] = useState<EditForm>({ name: '', phone: '', avatar_url: '', credits: 0 })
  const [saving, setSaving] = useState(false)
  const [planUser, setPlanUser] = useState<User | null>(null)
  const [detailsUser, setDetailsUser] = useState<User | null>(null)
  const [deleteUser, setDeleteUser] = useState<User | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Pillar 3 — push notification state
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set())
  // Drives which mode the SendPushModal opens in:
  //   - {mode: 'single', user} → single user push
  //   - {mode: 'multi', userIds} → multi-select push (from selectedUserIds)
  //   - {mode: 'filter', filters} → filter-based broadcast (uses current filters)
  const [pushTarget, setPushTarget] = useState<
    | { mode: 'single'; user: User }
    | { mode: 'multi'; userIds: number[] }
    | { mode: 'filter'; filters: SendPushFilter; estimatedCount: number }
    | null
  >(null)

  // Selection helpers
  const toggleSelect = (id: number) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const selectAllVisible = () => setSelectedUserIds(new Set(data.map((u) => u.id)))
  const clearSelection = () => setSelectedUserIds(new Set())

  // Build filter payload from current UI filters for the broadcast button.
  const currentFiltersAsPayload = (): SendPushFilter => {
    const f: SendPushFilter = {}
    if (premiumFilter === 'true') f.is_premium = true
    if (premiumFilter === 'false') f.is_premium = false
    if (planFilter) f.plan = planFilter as SendPushFilter['plan']
    // Map activity filter to days bounds
    if (activityFilter === 'online') f.last_seen_days_min = 1 / 288   // ~5 min — close enough
    else if (activityFilter === '24h') f.last_seen_days_min = 1
    else if (activityFilter === '7d') f.last_seen_days_min = 7
    else if (activityFilter === '30d') f.last_seen_days_min = 30
    else if (activityFilter === 'inactive_30d') f.last_seen_days_max = 30
    return f
  }

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
  const allVisibleSelected = data.length > 0 && data.every((u) => selectedUserIds.has(u.id))

  const columns: Column<User>[] = [
    // Pillar 3: multi-select checkbox (only on Active tab — deleted users
    // can't receive pushes anyway).
    ...(tab === 'active' ? [{
      key: 'select' as const,
      title: (
        <input
          type="checkbox"
          checked={allVisibleSelected}
          onChange={(e) => e.target.checked ? selectAllVisible() : clearSelection()}
          className="cursor-pointer"
          title="Select all on this page"
        />
      ) as unknown as string,
      className: 'w-10 text-center',
      render: (u: User) => (
        <input
          type="checkbox"
          checked={selectedUserIds.has(u.id)}
          onChange={() => toggleSelect(u.id)}
          onClick={(e) => e.stopPropagation()}
          className="cursor-pointer"
        />
      ),
    } as Column<User>] : []),
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
    /* 2026-04-24: Languages chip column. Reads `languages` (new M2M
       list) first; falls back to `language_code` (legacy single) if the
       backend returned only the legacy shape for some reason. Capped at
       3 chips inline + "+N" overflow counter to avoid the grid ballooning
       horizontally on power-users who picked every language. */
    {
      key: 'languages',
      title: 'Languages',
      className: 'w-[180px]',
      render: (u) => {
        const list = u.languages ?? []
        if (list.length === 0) {
          const fallback = u.language_code
          if (!fallback) {
            return <span className="text-xs text-brand-text-muted">—</span>
          }
          return (
            <span className="inline-block text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-brand-bg-soft text-brand-text-muted border border-brand-border">
              {fallback}
            </span>
          )
        }
        const visible = list.slice(0, 3)
        const overflow = list.length - visible.length
        return (
          <div className="flex flex-wrap gap-1">
            {visible.map(l => (
              <span
                key={l.id}
                title={l.name}
                className="inline-block text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-brand-bg-soft text-brand-text border border-brand-border"
              >
                {l.code}
              </span>
            ))}
            {overflow > 0 && (
              <span
                title={list.slice(3).map(l => l.name).join(', ')}
                className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded text-brand-text-muted"
              >+{overflow}</span>
            )}
          </div>
        )
      },
    },
    {
      key: 'last_seen_at',
      title: 'Last Seen',
      sortable: true,
      className: 'w-[120px]',
      render: (u) => <LastSeenBadge value={(u as User).last_seen_at} />,
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
              { label: 'Send Push', onClick: () => setPushTarget({ mode: 'single', user: u }) },
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
          <FilterSelect
            label="Activity"
            value={activityFilter}
            onChange={(v) => { setActivityFilter(v as ActivityFilter); setPage(1) }}
            options={[
              { value: '', label: 'Any activity' },
              { value: 'online', label: 'Online now (5m)' },
              { value: '24h', label: 'Active 24h' },
              { value: '7d', label: 'Active 7 days' },
              { value: '30d', label: 'Active 30 days' },
              { value: 'inactive_30d', label: 'Inactive 30+ days' },
              { value: 'never', label: 'Never seen' },
            ]}
          />
          {/* 2026-04-24: Languages filter dropdown. Single-select because
              DRF-filter's M2M `exact` lookup takes one id at a time; the
              admin typically wants to slice to ONE language anyway
              ("show me all Hindi users"). Multi-select is a future
              refinement if it becomes a real workflow. */}
          <FilterSelect
            label="Language"
            value={languageFilter}
            onChange={(v) => { setLanguageFilter(v); setPage(1) }}
            options={[
              { value: '', label: 'All languages' },
              ...availableLanguages.map(l => ({
                value: String(l.id),
                label: `${l.name} (${l.code})`,
              })),
            ]}
          />
          {(planFilter || premiumFilter || activityFilter || languageFilter || search) && (
            <button
              onClick={() => {
                setPlanFilter(''); setPremiumFilter(''); setActivityFilter('');
                setLanguageFilter('');
                setSearch(''); setPage(1)
              }}
              className="text-xs px-2 py-1.5 text-brand-text-muted hover:text-brand-text underline"
            >Clear</button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {tab === 'active' && (
            <button
              onClick={() => setPushTarget({
                mode: 'filter',
                filters: currentFiltersAsPayload(),
                estimatedCount: totalCount,
              })}
              title="Send a push notification to all users matching the current filters"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold text-sm font-medium transition-colors"
            >
              <Send className="h-4 w-4" />
              Broadcast
            </button>
          )}
          <SearchInput value={search} onChange={setSearch} placeholder="Search users..." className="w-64" />
        </div>
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

      {/* ── Floating action bar — appears when ≥1 user is selected (Pillar 3) ─ */}
      {selectedUserIds.size > 0 && tab === 'active' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 rounded-xl bg-brand-dark-card border border-brand-gold/40 shadow-2xl backdrop-blur">
          <span className="text-sm font-semibold text-brand-text">
            {selectedUserIds.size} user{selectedUserIds.size === 1 ? '' : 's'} selected
          </span>
          <button
            onClick={selectAllVisible}
            disabled={allVisibleSelected}
            className="text-xs px-3 py-1.5 rounded-lg bg-brand-dark-hover text-brand-text-muted hover:text-brand-text disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Select All on Page ({data.length})
          </button>
          <button
            onClick={clearSelection}
            className="text-xs px-3 py-1.5 rounded-lg bg-brand-dark-hover text-brand-text-muted hover:text-brand-text inline-flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
          <div className="w-px h-6 bg-brand-dark-border" />
          <button
            onClick={() => setPushTarget({ mode: 'multi', userIds: Array.from(selectedUserIds) })}
            className="text-xs px-3 py-1.5 rounded-lg bg-brand-gold text-gray-900 font-semibold hover:bg-brand-gold-dark inline-flex items-center gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            Send Push to Selected
          </button>
        </div>
      )}

      {/* ── Send Push Modal — handles single, multi, and filter modes ────── */}
      {pushTarget?.mode === 'single' && (
        <SendPushModal
          isOpen={true}
          mode="single"
          userId={pushTarget.user.id}
          userName={pushTarget.user.name || pushTarget.user.phone || pushTarget.user.email}
          onClose={() => setPushTarget(null)}
        />
      )}
      {pushTarget?.mode === 'multi' && (
        <SendPushModal
          isOpen={true}
          mode="multi"
          userIds={pushTarget.userIds}
          onClose={() => setPushTarget(null)}
          onSent={clearSelection}
        />
      )}
      {pushTarget?.mode === 'filter' && (
        <SendPushModal
          isOpen={true}
          mode="filter"
          filters={pushTarget.filters}
          estimatedCount={pushTarget.estimatedCount}
          onClose={() => setPushTarget(null)}
        />
      )}

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
