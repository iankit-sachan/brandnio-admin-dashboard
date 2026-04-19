import { useEffect, useState } from 'react'
import {
  usersApi, businessProfilesApi, politicianProfilesApi, userCustomFramesApi,
  businessIndustriesApi, politicianCategoriesApi, politicianPositionsApi,
  usersAdminApi, publicBusinessCategoryChoicesApi,
  type UserNotificationRow, type UserSubscriptionRow,
  type UserDeviceRow, type UserReferralInfo,
} from '../../services/admin-api'
import { useToast } from '../../context/ToastContext'
import type { User, UserDetails, BusinessProfile, PoliticianProfile } from '../../types'
import { formatDate } from '../../utils/formatters'
import SendPushModal from './SendPushModal'
import { ImageUpload } from '../../components/ui/ImageUpload'

interface LookupRow { id: number; name: string; slug: string; is_active?: boolean }

type Tab = 'subscription' | 'business' | 'political' | 'frames' | 'notifications' | 'devices'

/** Inline relative-time badge for `last_seen_at`. Mirrors the column on the users list. */
function LastSeenInline({ value }: { value: string | null }) {
  if (!value) return <span className="text-xs text-white/70">Never seen</span>
  const seenMs = new Date(value).getTime()
  if (isNaN(seenMs)) return <span className="text-xs text-white/70">—</span>
  const diffMin = Math.floor((Date.now() - seenMs) / 60000)
  if (diffMin < 5) {
    return (
      <span className="inline-flex items-center gap-1 text-xs">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-green-300 font-medium">Online</span>
      </span>
    )
  }
  let label: string
  if (diffMin < 60) label = `Active ${diffMin}m ago`
  else if (diffMin < 60 * 24) label = `Active ${Math.floor(diffMin / 60)}h ago`
  else if (diffMin < 60 * 24 * 30) label = `Active ${Math.floor(diffMin / (60 * 24))}d ago`
  else label = `Active ${Math.floor(diffMin / (60 * 24 * 30))}mo ago`
  return <span className="text-xs text-white/80">{label}</span>
}

// Must match backend posters/models.py UserCustomFrame.CATEGORY_CHOICES (per 2ndprompt.txt).
const FRAME_CATEGORIES = ['festival', 'business', 'political']
const FRAME_TYPES = ['portrait','landscape','square','circular','story','banner']

interface Props {
  user: User
  onClose: () => void
}

export default function UserDetailsModal({ user, onClose }: Props) {
  const { addToast } = useToast()
  const [tab, setTab] = useState<Tab>('subscription')
  const [details, setDetails] = useState<UserDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [pushOpen, setPushOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const reload = async () => {
    setLoading(true)
    try {
      const d = await usersApi.details(user.id)
      setDetails(d)
    } catch {
      addToast('Failed to load details', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload() }, [user.id])

  // GDPR export — opens the JSON download in a new tab. Browser handles download
  // because backend sets Content-Disposition: attachment on the response.
  const downloadGdpr = () => {
    window.open(usersAdminApi.gdprExportUrl(user.id), '_blank')
  }

  // Gap 4: silent FCM ping that wakes the user's app + forces re-fetch.
  const forceRefreshUserApp = async () => {
    setRefreshing(true)
    try {
      const r = await usersAdminApi.forceRefreshApp(user.id)
      const msg = r.device_count === 0
        ? 'User has no registered devices.'
        : `Refresh signal sent to ${r.sent_count}/${r.device_count} device${r.device_count === 1 ? '' : 's'}`
      addToast(msg, r.device_count > 0 ? 'success' : 'error')
    } catch {
      addToast('Force refresh failed', 'error')
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Gradient header — name + Last Seen + action buttons */}
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-purple-600 p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-400 flex items-center justify-center text-white text-2xl font-bold">
            🏅
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-semibold text-lg truncate">{user.name || 'Guest'}</div>
            <div className="flex items-center gap-3 text-white/80 text-sm">
              <span className="truncate">{user.phone || user.email || 'NA'}</span>
              <span className="text-white/40">·</span>
              <LastSeenInline value={user.last_seen_at} />
            </div>
          </div>
          {/* Pillar 3 integration: open SendPushModal in single mode for this user */}
          <button
            onClick={() => setPushOpen(true)}
            title="Send a push notification to this user"
            className="px-3 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-sm font-medium inline-flex items-center gap-1.5"
          >
            📤 Send Push
          </button>
          <button onClick={onClose} className="text-white/80 hover:text-white w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/10">✕</button>
        </div>

        {/* Tabs (6 total: existing 4 + 2 new).
            flex-shrink-0 prevents the row from collapsing inside flex-col parent
            (the bug we hit when the row was squeezed to ~5px tall).
            overflow-x-auto wraps the inner button row only, NOT the whole div,
            so the row keeps its intrinsic height. */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-white">
          <div className="flex px-4 overflow-x-auto">
            {(['subscription','business','political','frames','notifications','devices'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-3 text-sm font-medium capitalize whitespace-nowrap transition-colors border-b-2 ${
                  tab === t
                    ? 'text-indigo-600 border-indigo-600'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
          {loading ? (
            <div className="py-12 text-center text-gray-500">Loading...</div>
          ) : !details ? (
            <div className="py-12 text-center text-red-500">Failed to load.</div>
          ) : tab === 'subscription' ? (
            <SubscriptionTab details={details} userId={user.id} onChanged={reload} />
          ) : tab === 'business' ? (
            <BusinessTab details={details} userId={user.id} onChanged={reload} />
          ) : tab === 'political' ? (
            <PoliticalTab details={details} userId={user.id} onChanged={reload} />
          ) : tab === 'frames' ? (
            <FramesTab details={details} userId={user.id} onChanged={reload} />
          ) : tab === 'notifications' ? (
            <NotificationsTab userId={user.id} />
          ) : (
            <DevicesTab userId={user.id} />
          )}
        </div>

        {/* Footer — GDPR export */}
        <div className="border-t border-gray-200 bg-white px-4 py-2.5 flex items-center justify-between">
          <button
            onClick={downloadGdpr}
            title="Download a JSON dump of all data we hold about this user (GDPR / data portability)"
            className="text-xs text-gray-500 hover:text-indigo-600 inline-flex items-center gap-1"
          >
            ⬇ Export user data (JSON)
          </button>
          <span className="text-xs text-gray-400">Last loaded: {details ? formatDate(new Date().toISOString()) : '—'}</span>
        </div>
      </div>

      {/* Pillar 3: single-user push modal launched from header button */}
      {pushOpen && (
        <SendPushModal
          isOpen={true}
          mode="single"
          userId={user.id}
          userName={user.name || user.phone || user.email}
          onClose={() => setPushOpen(false)}
        />
      )}
    </div>
  )
}

// ── Subscription Tab ────────────────────────────────────────────────
function SubscriptionTab({ details, userId, onChanged }: {
  details: UserDetails; userId: number; onChanged: () => void
}) {
  const { addToast } = useToast()
  const sub = details.active_subscription
  const isActive = sub && sub.status === 'active'

  const [history, setHistory] = useState<UserSubscriptionRow[] | null>(null)
  const [referral, setReferral] = useState<UserReferralInfo | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)

  // Fetch sub history + referral info in parallel on mount.
  useEffect(() => {
    usersAdminApi.listSubscriptions(userId).then(r => setHistory(r.results)).catch(() => setHistory([]))
    usersAdminApi.referralInfo(userId).then(setReferral).catch(() => setReferral(null))
  }, [userId])

  const doCancel = async () => {
    setCancelling(true)
    try {
      await usersAdminApi.cancelSubscription(userId)
      addToast('Subscription cancelled — user notified via push', 'success')
      setConfirmCancel(false)
      onChanged()
      // Refresh history list too
      usersAdminApi.listSubscriptions(userId).then(r => setHistory(r.results)).catch(() => {})
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      addToast(err.response?.data?.detail || 'Cancel failed', 'error')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        {isActive ? (
          <span className="inline-flex items-center gap-2 bg-green-500 text-white px-4 py-1.5 rounded-full text-sm font-medium">
            <span className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center">✓</span>
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 bg-gray-400 text-white px-4 py-1.5 rounded-full text-sm font-medium">
            Expired
          </span>
        )}
      </div>

      <Card title="User Information" icon="👤">
        <Row label="User ID" value={details.user.phone || String(details.user.id)} />
        <Row label="Name" value={details.user.name || 'Guest'} />
        <Row label="Email" value={details.user.email || 'NA'} />
      </Card>

      <Card title="Plan Details" icon="💳">
        <Row label="Plan Name" value={sub?.plan_name || '—'} />
        <Row label="Price" value={sub ? `₹${sub.price}` : '—'} valueClass="text-indigo-600 font-medium" />
        <Row label="Duration" value={sub ? `${sub.duration_days} days` : '—'} />
      </Card>

      <Card title="Timeline" icon="🕒">
        <Row label="Start Date" value={sub?.starts_at ? formatDate(sub.starts_at) : '—'} />
        <Row label="Expiry Date" value={sub?.expires_at ? formatDate(sub.expires_at) : '—'} />
        <Row label="Days Remaining" value={String(sub?.days_remaining ?? 0)} />
      </Card>

      {/* Cancel button — only when there's an active subscription */}
      {isActive && (
        <div className="flex justify-end">
          <button
            onClick={() => setConfirmCancel(true)}
            className="px-4 py-2 text-sm rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 inline-flex items-center gap-1.5"
          >
            ✕ Cancel Subscription
          </button>
        </div>
      )}

      {/* Subscription history (TIER 2-D) — shows everything ever, with [CURRENT] badge */}
      <Card title="Subscription History" icon="📜">
        {history === null ? (
          <div className="text-xs text-gray-400 py-2">Loading…</div>
        ) : history.length === 0 ? (
          <div className="text-xs text-gray-400 py-2 text-center">No subscription history</div>
        ) : (
          <ul className="space-y-1.5 max-h-64 overflow-y-auto">
            {history.map(s => {
              const isCurrent = s.id === sub?.id
              const statusColor = {
                active: 'bg-green-100 text-green-700',
                cancelled: 'bg-red-100 text-red-700',
                expired: 'bg-gray-100 text-gray-600',
              }[s.status] || 'bg-blue-100 text-blue-700'
              return (
                <li key={s.id} className={'flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-xs ' +
                  (isCurrent ? 'bg-indigo-50 border border-indigo-200' : 'bg-gray-50 border border-gray-100')}>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800 truncate">
                      {s.plan_name} {isCurrent && <span className="text-indigo-600 ml-1">[CURRENT]</span>}
                      {s.is_admin_grant && <span className="text-amber-600 ml-1">[ADMIN GRANT]</span>}
                    </div>
                    <div className="text-gray-500">
                      ₹{s.price} · {s.expires_at ? `until ${formatDate(s.expires_at)}` : 'no expiry'}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColor}`}>
                    {s.status}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {/* Usage counters (TIER 3-G — scoped to aggregated counts) */}
      <Card title="Activity Counters" icon="📊">
        <Row label="Total Downloads" value={String(details.user.total_downloads ?? 0)} />
        <Row label="Total Shares" value={String(details.user.total_shares ?? 0)} />
        <Row label="Credits Balance" value={String((details.user as unknown as { credits?: number }).credits ?? 0)} />
        <div className="text-[11px] text-gray-400 pt-1.5 italic">Per-poster history is not tracked — only aggregates.</div>
      </Card>

      {/* Referral info (TIER 3-H) */}
      <Card title="Referral" icon="🎁">
        {referral === null ? (
          <div className="text-xs text-gray-400">Loading…</div>
        ) : (
          <>
            <Row label="Their referral code" value={referral.referral_code || '—'} valueClass="font-mono text-indigo-600" />
            <Row label="Referred by" value={referral.referred_by ? `${referral.referred_by.name || referral.referred_by.phone} (${referral.referred_by.referral_code})` : '—'} />
            <Row label="Total referrals" value={String(referral.referrals_count)} />
            {referral.referred_users.length > 0 && (
              <details className="text-xs mt-1.5">
                <summary className="cursor-pointer text-indigo-600 hover:text-indigo-700">
                  See {referral.referred_users.length} referred user{referral.referred_users.length === 1 ? '' : 's'}
                </summary>
                <ul className="mt-1.5 space-y-0.5 max-h-40 overflow-y-auto">
                  {referral.referred_users.map(u => (
                    <li key={u.id} className="text-gray-600 truncate">
                      • {u.name || u.phone || u.email} <span className="text-gray-400">({formatDate(u.joined_at)})</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </Card>

      {/* Cancel confirmation dialog */}
      {confirmCancel && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Cancel this subscription?</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will mark the subscription as cancelled, set the user back to Free, and
              <strong> push a notification to their app</strong> letting them know.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmCancel(false)}
                disabled={cancelling}
                className="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
              >Back</button>
              <button
                onClick={doCancel}
                disabled={cancelling}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50"
              >{cancelling ? 'Cancelling…' : 'Yes, Cancel & Notify'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Notifications Tab (TIER 1-C — push history sent to this user) ───
function NotificationsTab({ userId }: { userId: number }) {
  const [rows, setRows] = useState<UserNotificationRow[] | null>(null)
  useEffect(() => {
    usersAdminApi.listNotifications(userId).then(r => setRows(r.results)).catch(() => setRows([]))
  }, [userId])

  if (rows === null) return <div className="py-12 text-center text-gray-500">Loading…</div>
  if (rows.length === 0) {
    return (
      <div className="py-16 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
        <div className="text-5xl mb-2 opacity-30">🔔</div>
        <div className="font-semibold text-gray-700">No notifications yet</div>
        <div className="text-sm">Push notifications + system events will appear here.</div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-500 mb-2">{rows.length} notification{rows.length === 1 ? '' : 's'} (most recent first)</div>
      {rows.map(n => (
        <div key={n.id} className={'bg-white rounded-lg p-3 border ' +
          (n.is_read ? 'border-gray-200' : 'border-indigo-200 ring-1 ring-indigo-100')}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-gray-900 truncate">{n.title}</div>
              {n.body && <div className="text-xs text-gray-600 mt-0.5 line-clamp-2">{n.body}</div>}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="px-1.5 py-0.5 rounded bg-gray-100 text-[10px] text-gray-600 capitalize">
                  {n.notification_type}
                </span>
                {!n.is_read && (
                  <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-[10px] text-indigo-700 font-bold">UNREAD</span>
                )}
                {n.action_url && (
                  <span className="text-[10px] text-gray-500 truncate">→ {n.action_url}</span>
                )}
              </div>
            </div>
            <div className="text-[10px] text-gray-400 whitespace-nowrap">
              {formatDate(n.created_at)}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Devices Tab (TIER 2-F — FCM device registrations + deactivate) ──
function DevicesTab({ userId }: { userId: number }) {
  const { addToast } = useToast()
  const [rows, setRows] = useState<UserDeviceRow[] | null>(null)
  const [acting, setActing] = useState<number | null>(null)

  const reload = () => {
    usersAdminApi.listDevices(userId).then(r => setRows(r.results)).catch(() => setRows([]))
  }
  useEffect(() => { reload() }, [userId])

  const deactivate = async (deviceId: number) => {
    if (!confirm('Revoke this device? It will stop receiving push notifications.')) return
    setActing(deviceId)
    try {
      await usersAdminApi.deactivateDevice(userId, deviceId)
      addToast('Device deactivated', 'success')
      reload()
    } catch {
      addToast('Failed to deactivate device', 'error')
    } finally {
      setActing(null)
    }
  }

  if (rows === null) return <div className="py-12 text-center text-gray-500">Loading…</div>
  if (rows.length === 0) {
    return (
      <div className="py-16 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
        <div className="text-5xl mb-2 opacity-30">📱</div>
        <div className="font-semibold text-gray-700">No registered devices</div>
        <div className="text-sm">User has not signed in on any device with FCM enabled.</div>
      </div>
    )
  }

  const platformIcon = (p: string) => p === 'ios' ? '🍎' : p === 'web' ? '🌐' : '🤖'

  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-500 mb-2">{rows.length} device{rows.length === 1 ? '' : 's'} registered</div>
      {rows.map(d => (
        <div key={d.id} className="bg-white rounded-lg p-3 border border-gray-200 flex items-center gap-3">
          <div className="text-2xl">{platformIcon(d.platform)}</div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-gray-900 capitalize truncate">
              {d.device_name || d.platform}
              {d.is_active ? (
                <span className="ml-2 px-1.5 py-0.5 rounded bg-green-100 text-[10px] text-green-700 font-bold">ACTIVE</span>
              ) : (
                <span className="ml-2 px-1.5 py-0.5 rounded bg-gray-100 text-[10px] text-gray-500 font-bold">REVOKED</span>
              )}
            </div>
            <div className="text-xs text-gray-500">
              Token: <span className="font-mono">{d.token_preview}</span> · Last refresh: {formatDate(d.updated_at)}
            </div>
          </div>
          {d.is_active && (
            <button
              onClick={() => deactivate(d.id)}
              disabled={acting === d.id}
              className="text-xs px-3 py-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 disabled:opacity-50"
            >
              {acting === d.id ? 'Revoking…' : 'Revoke'}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <div className="flex items-center gap-2 text-gray-900 font-semibold mb-3">
        <span>{icon}</span>{title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}
function Row({ label, value, valueClass = '' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={`text-gray-900 ${valueClass}`}>{value}</span>
    </div>
  )
}

// ── Business Tab ────────────────────────────────────────────────────
function BusinessTab({ details, userId, onChanged }: { details: UserDetails; userId: number; onChanged: () => void }) {
  const [editing, setEditing] = useState(false)
  const bp = details.business_profile
  if (editing) {
    return <BusinessForm existing={bp} userId={userId} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); onChanged() }} />
  }
  if (!bp) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-600 flex items-center gap-2">🏢 No Business Added</div>
          <button onClick={() => setEditing(true)} className="px-3 py-1.5 text-sm rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 flex items-center gap-1">
            + Add Business
          </button>
        </div>
        <div className="py-16 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
          <div className="text-5xl mb-2 opacity-30">🏢</div>
          <div className="font-semibold text-gray-700">No Business Details</div>
          <div className="text-sm">Click "Add Business" above to create business profile for this user.</div>
        </div>
      </div>
    )
  }
  // Helper for compact "—" rendering of empty strings
  const v = (s: string | null | undefined) => s && s.trim() ? s : '—'
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-gray-600 flex items-center gap-2">🏢 {bp.business_name || 'Business'}</div>
        <button onClick={() => setEditing(true)} className="px-3 py-1.5 text-sm rounded-lg bg-indigo-500 text-white hover:bg-indigo-600">
          Edit Business
        </button>
      </div>
      {/* Logo preview at top — visible whenever logo_url is populated */}
      {bp.logo_url && (
        <div className="bg-white rounded-xl p-3 border border-gray-200 mb-3 flex items-center gap-3">
          <img
            src={bp.logo_thumb_url || bp.logo_url}
            alt="Logo"
            className="w-16 h-16 rounded-lg object-cover bg-gray-100 border border-gray-200"
          />
          <div className="text-xs">
            <div className="font-semibold text-gray-900">Business Logo</div>
            <div className="text-gray-500">Click "Edit Business" to change.</div>
          </div>
        </div>
      )}
      {/* Basics card */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-2 text-sm mb-3">
        <Row label="Name" value={v(bp.business_name)} />
        <Row label="Tagline" value={v(bp.tagline)} />
        <Row label="Username" value={v(bp.username)} />
        <Row label="Category" value={v(bp.category)} />
        <Row label="Industries" value={v(bp.industries_m2m?.join(', ') || bp.industries)} />
      </div>
      {/* Contact card */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-2 text-sm mb-3">
        <Row label="Email" value={v(bp.email)} />
        <Row label="Phone" value={`${v(bp.phone)}${bp.show_phone_number ? ' (public)' : ''}`} />
        <Row label="WhatsApp" value={v(bp.whatsapp)} />
        <Row label="Website" value={v(bp.website)} />
      </div>
      {/* Social card */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-2 text-sm mb-3">
        <Row label="Instagram" value={v(bp.instagram)} />
        <Row label="Facebook" value={v(bp.facebook)} />
        <Row label="Twitter / X" value={v(bp.twitter)} />
        <Row label="YouTube" value={v(bp.youtube)} />
        <Row label="LinkedIn" value={v(bp.linkedin)} />
        <Row label="Selected icons" value={v(bp.selected_social_icons)} />
      </div>
      {/* Address card */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-2 text-sm mb-3">
        <Row label="Address" value={v(bp.address)} />
        <Row label="City" value={v(bp.city)} />
        <Row label="State" value={v(bp.state)} />
        <Row label="Pincode" value={v(bp.pincode)} />
      </div>
      {/* Extended */}
      {(bp.products_and_services || bp.extra_element_url) && (
        <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-2 text-sm">
          <Row label="Products & Services" value={v(bp.products_and_services)} />
          <Row label="Extra Element URL" value={v(bp.extra_element_url)} />
        </div>
      )}
    </div>
  )
}

// (BUSINESS_CATEGORIES hardcoded list removed in Gap 1 fix.
//  Categories are now fetched live from /api/auth/business-category-choices/
//  which is admin-managed via the BusinessCategoryChoicesPage.
//  Fallback: if the API call fails, keep a safe single-option list with the
//  current category so admin doesn't see an empty dropdown.)

const SOCIAL_ICON_KEYS = ['facebook', 'instagram', 'whatsapp', 'youtube', 'x', 'linkedin', 'pinterest']

function BusinessForm({ existing, userId, onCancel, onSaved }: {
  existing: BusinessProfile | null; userId: number; onCancel: () => void; onSaved: () => void
}) {
  const { addToast } = useToast()

  // Form shape — every editable backend field, including the 7 that were missing
  // before this rewrite (category, products_and_services, extra_element_url,
  // selected_social_icons, twitter, youtube, whatsapp).
  type BPFormShape = Partial<BusinessProfile>
  const [form, setForm] = useState<BPFormShape>({
    business_name: existing?.business_name || '',
    tagline: existing?.tagline || '',
    username: existing?.username || '',
    category: existing?.category || 'other',
    industries_m2m: existing?.industries_m2m || (existing?.industries ? existing.industries.split(',').filter(Boolean) : []),
    email: existing?.email || '',
    phone: existing?.phone || '',
    show_phone_number: existing?.show_phone_number || false,
    whatsapp: existing?.whatsapp || '',
    website: existing?.website || '',
    instagram: existing?.instagram || '',
    facebook: existing?.facebook || '',
    twitter: existing?.twitter || '',
    youtube: existing?.youtube || '',
    linkedin: existing?.linkedin || '',
    address: existing?.address || '',
    city: existing?.city || '',
    state: existing?.state || '',
    pincode: existing?.pincode || '',
    logo_url: existing?.logo_url || '',
    products_and_services: existing?.products_and_services || '',
    extra_element_url: existing?.extra_element_url || '',
    selected_social_icons: existing?.selected_social_icons || '',
  })
  const [saving, setSaving] = useState(false)
  const [industries, setIndustries] = useState<LookupRow[]>([])
  const [categoryChoices, setCategoryChoices] = useState<Array<{ value: string; label: string }>>([])
  const [lookupLoading, setLookupLoading] = useState(true)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  useEffect(() => {
    Promise.all([
      businessIndustriesApi.list({ is_active: 'true' })
        .then(rows => setIndustries(rows as LookupRow[]))
        .catch(() => setIndustries([])),
      // Gap 1: load admin-managed category choices instead of hardcoded list
      publicBusinessCategoryChoicesApi.list()
        .then(rows => setCategoryChoices(rows.map(r => ({ value: r.slug, label: r.name }))))
        .catch(() => {
          // Fallback: keep current category as a single option so the dropdown
          // doesn't render blank if the API call fails.
          setCategoryChoices(form.category ? [{ value: form.category, label: form.category }] : [])
        }),
    ]).finally(() => setLookupLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Gap 2: admin logo upload via the new admin endpoint that runs the WebP pipeline.
  // Uploads file → backend resizes to 512px + generates WebP → returns updated profile.
  const handleLogoFileUpload = async (file: File) => {
    if (!existing?.id) {
      addToast('Save the business profile first, then upload the logo.', 'error')
      return
    }
    setUploadingLogo(true)
    try {
      const updated = await businessProfilesApi.uploadLogo(existing.id, file)
      // Sync form state to the new URLs so the preview updates immediately
      update('logo_url', (updated.logo_url as string) || '')
      addToast('Logo uploaded — WebP thumbnail generated, user notified via push')
    } catch {
      addToast('Logo upload failed', 'error')
    } finally {
      setUploadingLogo(false)
    }
  }

  const update = <K extends keyof BPFormShape>(k: K, v: BPFormShape[K]) => setForm({ ...form, [k]: v })

  // Multi-select toggle for industries (M2M) — store as array of slug strings
  const toggleIndustry = (slug: string) => {
    const current = form.industries_m2m || []
    update('industries_m2m', current.includes(slug)
      ? current.filter(s => s !== slug)
      : [...current, slug],
    )
  }
  const toggleSocialIcon = (key: string) => {
    const current = (form.selected_social_icons || '').split(',').map(s => s.trim()).filter(Boolean)
    const next = current.includes(key)
      ? current.filter(k => k !== key)
      : [...current, key]
    update('selected_social_icons', next.join(','))
  }
  const isSocialIconOn = (key: string) =>
    (form.selected_social_icons || '').split(',').map(s => s.trim()).includes(key)

  const handleSubmit = async () => {
    if (!form.business_name || !form.username) {
      addToast('Business Name and Username are required', 'error'); return
    }
    setSaving(true)
    try {
      const payload = { ...form, user: userId }
      if (existing?.id) await businessProfilesApi.update(existing.id, payload)
      else await businessProfilesApi.create(payload)
      addToast(existing ? 'Business updated — user notified via push' : 'Business created — user notified via push')
      onSaved()
    } catch (e: unknown) {
      const err = e as { response?: { data?: unknown } }
      addToast('Failed: ' + JSON.stringify(err.response?.data || 'error'), 'error')
    } finally { setSaving(false) }
  }

  return (
    <div className="bg-[#f5efe0] rounded-xl p-4">
      <h3 className="text-sm font-bold text-gray-900 mb-3">🏢 {existing ? 'Edit' : 'Add'} Business Details</h3>
      <div className="bg-blue-100 text-blue-800 text-xs rounded-lg p-2 mb-3">👤 Creating for: user #{userId}</div>

      {/* ── Logo upload (Gap 2 fix — uses admin WebP endpoint) ─────── */}
      <div className="text-xs font-semibold text-gray-700 mb-1">Logo</div>
      <div className="bg-white rounded-lg p-3 border border-gray-200 mb-3">
        <div className="flex items-center gap-3">
          {form.logo_url ? (
            <img
              src={form.logo_url}
              alt="Logo"
              className="w-16 h-16 rounded-lg object-cover bg-gray-100 border border-gray-200"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 text-2xl">
              🏢
            </div>
          )}
          <div className="flex-1">
            <label className={
              'inline-block px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ' +
              (uploadingLogo
                ? 'bg-gray-200 text-gray-400 cursor-wait'
                : existing?.id
                  ? 'bg-indigo-500 text-white hover:bg-indigo-600 cursor-pointer'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              )
            }>
              {uploadingLogo ? 'Uploading…' : (form.logo_url ? '🔄 Change Logo' : '📤 Upload Logo')}
              <input
                type="file"
                accept="image/*"
                disabled={uploadingLogo || !existing?.id}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleLogoFileUpload(f)
                  e.target.value = ''
                }}
                className="hidden"
              />
            </label>
            <div className="text-[11px] text-gray-500 mt-1.5">
              {existing?.id
                ? '✨ Auto-resized to 512×512 with WebP thumbnail. Max 5 MB.'
                : 'Save the business profile first, then upload the logo.'}
            </div>
          </div>
        </div>
      </div>

      <div className="text-xs font-semibold text-gray-700 mb-1">Basic Information</div>
      <div className="space-y-2 mb-3">
        <TextInput icon="🏢" placeholder="Business Name *" value={form.business_name || ''} onChange={v => update('business_name', v)} />
        <TextInput icon="💬" placeholder="Tagline" value={form.tagline || ''} onChange={v => update('tagline', v)} />
        <TextInput icon="@" placeholder="Username *" value={form.username || ''} onChange={v => update('username', v)} />
        <DropdownInput
          icon="📂"
          label="Category"
          value={form.category || ''}
          onChange={v => update('category', v)}
          // Gap 1: now sourced from admin-managed BusinessCategoryChoice table
          // (was previously a hardcoded list in the frontend that drifted from backend)
          options={categoryChoices}
          loading={lookupLoading}
        />
        {/* Industries — multi-select M2M chip picker (Q3=b: replaces single CSV field) */}
        <div className="bg-white rounded-lg px-3 py-2 border border-gray-200">
          <div className="text-xs text-gray-700 mb-1.5">🏭 Industries (multi-select)</div>
          {lookupLoading ? (
            <div className="text-xs text-gray-400">Loading…</div>
          ) : industries.length === 0 ? (
            <div className="text-xs text-gray-400">No industries available</div>
          ) : (
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {industries.map(i => {
                const on = (form.industries_m2m || []).includes(i.slug)
                return (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => toggleIndustry(i.slug)}
                    className={
                      'px-2.5 py-1 rounded-full text-xs border transition-colors ' +
                      (on
                        ? 'bg-indigo-500 text-white border-indigo-500'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-indigo-400')
                    }
                  >
                    {i.name}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="text-xs font-semibold text-gray-700 mb-1">Contact Information</div>
      <div className="space-y-2 mb-3">
        <TextInput icon="✉" placeholder="Email" value={form.email || ''} onChange={v => update('email', v)} />
        <TextInput icon="📞" placeholder="Phone (e.g. +91 9876543210)" value={form.phone || ''} onChange={v => update('phone', v)} />
        <label className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <input type="checkbox" checked={!!form.show_phone_number} onChange={e => update('show_phone_number', e.target.checked)} />
          <span className="text-gray-900">Show Phone Number</span>
          <span className="text-xs text-gray-500">Display phone on business card</span>
        </label>
        <TextInput icon="💬" placeholder="WhatsApp (e.g. +91 9876543210)" value={form.whatsapp || ''} onChange={v => update('whatsapp', v)} />
        <TextInput icon="🌐" placeholder="Website" value={form.website || ''} onChange={v => update('website', v)} />
      </div>

      <div className="text-xs font-semibold text-gray-700 mb-1">Social Links</div>
      <div className="space-y-2 mb-3">
        <TextInput icon="📷" placeholder="Instagram URL" value={form.instagram || ''} onChange={v => update('instagram', v)} />
        <TextInput icon="f" placeholder="Facebook URL" value={form.facebook || ''} onChange={v => update('facebook', v)} />
        <TextInput icon="X" placeholder="Twitter / X URL" value={form.twitter || ''} onChange={v => update('twitter', v)} />
        <TextInput icon="▶" placeholder="YouTube URL" value={form.youtube || ''} onChange={v => update('youtube', v)} />
        <TextInput icon="in" placeholder="LinkedIn URL" value={form.linkedin || ''} onChange={v => update('linkedin', v)} />
        {/* Social-icon visibility toggles — controls which icons render on the business card */}
        <div className="bg-white rounded-lg px-3 py-2 border border-gray-200">
          <div className="text-xs text-gray-700 mb-1.5">🎨 Show social icons on business card</div>
          <div className="flex flex-wrap gap-1.5">
            {SOCIAL_ICON_KEYS.map(k => {
              const on = isSocialIconOn(k)
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => toggleSocialIcon(k)}
                  className={
                    'px-2.5 py-1 rounded-full text-xs border capitalize transition-colors ' +
                    (on
                      ? 'bg-indigo-500 text-white border-indigo-500'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-indigo-400')
                  }
                >
                  {k}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="text-xs font-semibold text-gray-700 mb-1">Address</div>
      <div className="space-y-2 mb-3">
        <TextInput icon="🏠" placeholder="Street Address" value={form.address || ''} onChange={v => update('address', v)} />
        <div className="grid grid-cols-2 gap-2">
          <TextInput icon="🏙" placeholder="City" value={form.city || ''} onChange={v => update('city', v)} />
          <TextInput icon="🗺" placeholder="State" value={form.state || ''} onChange={v => update('state', v)} />
        </div>
        <TextInput icon="📍" placeholder="Pincode (5–10 digits)" value={form.pincode || ''} onChange={v => update('pincode', v)} />
      </div>

      {/* Extended brand fields (NEW) */}
      <div className="text-xs font-semibold text-gray-700 mb-1">Extended Brand</div>
      <div className="space-y-2 mb-3">
        <div className="bg-white rounded-lg px-3 py-2 border border-gray-200">
          <div className="text-xs text-gray-700 mb-1">📦 Products & Services</div>
          <textarea
            value={form.products_and_services || ''}
            onChange={e => update('products_and_services', e.target.value)}
            rows={3}
            placeholder="Free-form description of what this business offers"
            className="w-full text-sm bg-transparent focus:outline-none resize-none"
          />
        </div>
        <TextInput icon="🔗" placeholder="Extra Element URL (custom CTA / promo link)" value={form.extra_element_url || ''} onChange={v => update('extra_element_url', v)} />
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="text-gray-600 px-3 py-1.5 text-sm">Cancel</button>
        <button onClick={handleSubmit} disabled={saving} className="px-4 py-1.5 rounded-full bg-indigo-500 text-white text-sm hover:bg-indigo-600 disabled:opacity-50">
          {saving ? 'Saving...' : (existing ? '💾 Save Business' : '💾 Create Business')}
        </button>
      </div>
    </div>
  )
}

// ── Political Tab ───────────────────────────────────────────────────
function PoliticalTab({ details, userId, onChanged }: { details: UserDetails; userId: number; onChanged: () => void }) {
  const [editing, setEditing] = useState(false)
  const pp = details.political_profile
  if (editing) {
    return <PoliticianForm existing={pp} userId={userId} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); onChanged() }} />
  }
  if (!pp) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-600 flex items-center gap-2">+ No Political Details Added</div>
          <button onClick={() => setEditing(true)} className="px-3 py-1.5 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 flex items-center gap-1">
            + Add Political
          </button>
        </div>
        <div className="py-16 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
          <div className="text-5xl mb-2 opacity-30">🗳</div>
          <div className="font-semibold text-gray-700">No Political Details</div>
          <div className="text-sm">Click "Add Political" above to create political profile for this user.</div>
        </div>
      </div>
    )
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-gray-600 flex items-center gap-2">🗳 {pp.full_name || pp.party_name}</div>
        <button onClick={() => setEditing(true)} className="px-3 py-1.5 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600">
          Edit Political
        </button>
      </div>
      <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-2 text-sm">
        <Row label="Full Name" value={pp.full_name} />
        <Row label="Designation" value={pp.designation} />
        <Row label="Party" value={pp.party_name} />
        <Row label="Position / Role" value={pp.position_role} />
        <Row label="Constituency" value={pp.constituency} />
        <Row label="Campaign Slogan" value={pp.campaign_slogan} />
        <Row label="Phone" value={`${pp.phone}${pp.show_phone_number ? ' (public)' : ''}`} />
        <Row label="Email" value={pp.email} />
        <Row label="Website" value={pp.website} />
        <Row label="Facebook / Twitter" value={`${pp.facebook} / ${pp.twitter}`} />
        <Row label="Instagram / YouTube" value={`${pp.instagram} / ${pp.youtube}`} />
        <Row label="Office Address" value={pp.office_address} />
        <Row label="City / State" value={`${pp.city}, ${pp.state}`} />
        <Row label="Pincode" value={pp.pincode} />
      </div>
    </div>
  )
}

function PoliticianForm({ existing, userId, onCancel, onSaved }: {
  existing: PoliticianProfile | null; userId: number; onCancel: () => void; onSaved: () => void
}) {
  const { addToast } = useToast()
  const [form, setForm] = useState<Partial<PoliticianProfile>>({
    full_name: existing?.full_name || '',
    designation: existing?.designation || '',
    party_name: existing?.party_name || '',
    position_role: existing?.position_role || '',
    constituency: existing?.constituency || '',
    campaign_slogan: existing?.campaign_slogan || '',
    phone: existing?.phone || '',
    show_phone_number: existing?.show_phone_number || false,
    email: existing?.email || '',
    website: existing?.website || '',
    facebook: existing?.facebook || '',
    twitter: existing?.twitter || '',
    instagram: existing?.instagram || '',
    youtube: existing?.youtube || '',
    office_address: existing?.office_address || '',
    city: existing?.city || '',
    state: existing?.state || '',
    pincode: existing?.pincode || '',
  })
  const [saving, setSaving] = useState(false)
  const [parties, setParties] = useState<LookupRow[]>([])
  const [positions, setPositions] = useState<LookupRow[]>([])
  const [lookupLoading, setLookupLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      politicianCategoriesApi.list({ is_active: 'true' }),
      politicianPositionsApi.list({ is_active: 'true' }),
    ]).then(([p, r]) => {
      setParties(p as LookupRow[])
      setPositions(r as LookupRow[])
    }).finally(() => setLookupLoading(false))
  }, [])

  const update = <K extends keyof PoliticianProfile>(k: K, v: PoliticianProfile[K]) => setForm({ ...form, [k]: v })

  const handleSubmit = async () => {
    if (!form.full_name || !form.party_name || !form.position_role || !form.constituency) {
      addToast('Full Name, Party, Position and Constituency are required', 'error'); return
    }
    setSaving(true)
    try {
      const payload = { ...form, user: userId }
      if (existing?.id) await politicianProfilesApi.update(existing.id, payload)
      else await politicianProfilesApi.create(payload)
      addToast(existing ? 'Political profile updated' : 'Political profile created')
      onSaved()
    } catch (e: unknown) {
      const err = e as { response?: { data?: unknown } }
      addToast('Failed: ' + JSON.stringify(err.response?.data || 'error'), 'error')
    } finally { setSaving(false) }
  }

  return (
    <div className="bg-[#f5efe0] rounded-xl p-4">
      <h3 className="text-sm font-bold text-gray-900 mb-3">🗳 {existing ? 'Edit' : 'Add'} Political Details</h3>
      <div className="bg-blue-100 text-blue-800 text-xs rounded-lg p-2 mb-3">👤 Creating for: user #{userId}</div>
      <div className="text-xs font-semibold text-gray-700 mb-1">Personal Information</div>
      <div className="space-y-2 mb-3">
        <TextInput icon="👤" placeholder="Full Name *" value={form.full_name || ''} onChange={v => update('full_name', v)} />
        <TextInput icon="🏷" placeholder="Designation / Title" value={form.designation || ''} onChange={v => update('designation', v)} />
        <DropdownInput
          icon="🚩"
          label="Political Party *"
          value={form.party_name || ''}
          onChange={v => update('party_name', v)}
          options={parties.map(p => ({ value: p.name, label: p.name }))}
          loading={lookupLoading}
        />
        <DropdownInput
          icon="👥"
          label="Position / Role *"
          value={form.position_role || ''}
          onChange={v => update('position_role', v)}
          options={positions.map(p => ({ value: p.name, label: p.name }))}
          loading={lookupLoading}
        />
        <TextInput icon="📍" placeholder="Constituency / Area *" value={form.constituency || ''} onChange={v => update('constituency', v)} />
        <TextInput icon="📢" placeholder="Campaign Slogan" value={form.campaign_slogan || ''} onChange={v => update('campaign_slogan', v)} />
      </div>
      <div className="text-xs font-semibold text-gray-700 mb-1">Contact Information</div>
      <div className="space-y-2 mb-3">
        <TextInput icon="📞" placeholder="Phone" value={form.phone || ''} onChange={v => update('phone', v)} />
        <label className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <input type="checkbox" checked={!!form.show_phone_number} onChange={e => update('show_phone_number', e.target.checked)} />
          <span className="text-gray-900">Show Phone Number</span>
          <span className="text-xs text-gray-500">Display phone on political card</span>
        </label>
        <TextInput icon="@" placeholder="Email Address" value={form.email || ''} onChange={v => update('email', v)} />
      </div>
      <div className="text-xs font-semibold text-gray-700 mb-1">Social Media & Web</div>
      <div className="space-y-2 mb-3">
        <TextInput icon="🌐" placeholder="Website" value={form.website || ''} onChange={v => update('website', v)} />
        <TextInput icon="f" placeholder="Facebook" value={form.facebook || ''} onChange={v => update('facebook', v)} />
        <TextInput icon="𝕏" placeholder="Twitter / X" value={form.twitter || ''} onChange={v => update('twitter', v)} />
        <TextInput icon="📷" placeholder="Instagram" value={form.instagram || ''} onChange={v => update('instagram', v)} />
        <TextInput icon="▶" placeholder="YouTube" value={form.youtube || ''} onChange={v => update('youtube', v)} />
      </div>
      <div className="text-xs font-semibold text-gray-700 mb-1">Office Address</div>
      <div className="space-y-2 mb-3">
        <TextInput icon="🏠" placeholder="Office Address" value={form.office_address || ''} onChange={v => update('office_address', v)} />
        <div className="grid grid-cols-2 gap-2">
          <TextInput icon="🏙" placeholder="City" value={form.city || ''} onChange={v => update('city', v)} />
          <TextInput icon="🗺" placeholder="State" value={form.state || ''} onChange={v => update('state', v)} />
        </div>
        <TextInput icon="📍" placeholder="Pincode" value={form.pincode || ''} onChange={v => update('pincode', v)} />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="text-gray-600 px-3 py-1.5 text-sm">Cancel</button>
        <button onClick={handleSubmit} disabled={saving} className="px-4 py-1.5 rounded-full bg-red-500 text-white text-sm hover:bg-red-600 disabled:opacity-50">
          {saving ? 'Saving...' : (existing ? '💾 Save Political' : '💾 Create Political')}
        </button>
      </div>
    </div>
  )
}

function TextInput({ icon, placeholder, value, onChange }: {
  icon: string; placeholder: string; value: string; onChange: (v: string) => void
}) {
  return (
    <label className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm">
      <span className="text-gray-500 w-5 text-center">{icon}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="flex-1 outline-none bg-transparent text-gray-900 placeholder:text-gray-400"
      />
    </label>
  )
}

function DropdownInput({ icon, label, value, onChange, options, loading }: {
  icon: string; label: string; value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]; loading?: boolean
}) {
  return (
    <label className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm">
      <span className="text-gray-500 w-5 text-center">{icon}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="flex-1 outline-none bg-transparent text-gray-900"
      >
        <option value="">{loading ? 'Loading...' : label}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

// ── Frames Tab ──────────────────────────────────────────────────────
function FramesTab({ details, userId, onChanged }: { details: UserDetails; userId: number; onChanged: () => void }) {
  const [uploading, setUploading] = useState(false)
  const frames = details.custom_frames
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-gray-900">Custom Frames for {details.user.name || 'Guest'}</div>
        <button onClick={() => setUploading(true)} className="px-3 py-1.5 text-sm rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 flex items-center gap-1">
          📤 Upload
        </button>
      </div>
      {uploading && <FrameUploadForm userId={userId} onCancel={() => setUploading(false)} onSaved={() => { setUploading(false); onChanged() }} />}
      {frames.length === 0 && !uploading ? (
        <div className="py-16 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
          <div className="text-5xl mb-2 opacity-30">🖼</div>
          <div className="font-semibold text-gray-700">No Custom Frames</div>
          <div className="text-sm">Upload frames specifically for this user.</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
          {frames.map(f => (
            <div key={f.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Checkerboard bg so transparent PNG areas are visible (frames have transparent centres by design). */}
              <div
                className="w-full h-32 flex items-center justify-center"
                style={{
                  backgroundColor: '#f3f4f6',
                  backgroundImage:
                    'linear-gradient(45deg, #d1d5db 25%, transparent 25%), ' +
                    'linear-gradient(-45deg, #d1d5db 25%, transparent 25%), ' +
                    'linear-gradient(45deg, transparent 75%, #d1d5db 75%), ' +
                    'linear-gradient(-45deg, transparent 75%, #d1d5db 75%)',
                  backgroundSize: '14px 14px',
                  backgroundPosition: '0 0, 0 7px, 7px -7px, -7px 0',
                }}
              >
                <img src={f.frame_image_url} alt={f.name} className="w-full h-full object-contain" />
              </div>
              <div className="p-2 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900 truncate">{f.name}</div>
                  <div className="text-xs text-gray-500 capitalize">{f.category} / {f.frame_type}</div>
                </div>
                <button
                  onClick={async () => {
                    if (!confirm(`Delete frame "${f.name}"?`)) return
                    await userCustomFramesApi.delete(f.id)
                    onChanged()
                  }}
                  className="text-red-500 hover:text-red-700 text-sm"
                >🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ┌─────────────────────────────────────────────────────────────────┐
// │ USER CUSTOM FRAME LIMITS — keep in sync across 3 places:         │
// │  1) Here (FRAME_MAX_BYTES + FRAME_INFO banner copy)              │
// │  2) backend/admin_api/serializers.py → AdminUserCustomFrameSeria │
// │     lizer.MAX_BYTES / MIN_DIM / MAX_DIM                          │
// │  3) nginx /etc/nginx/sites-enabled/jigs-admin                    │
// │     → client_max_body_size 50M;                                  │
// └─────────────────────────────────────────────────────────────────┘
const FRAME_MAX_BYTES = 50 * 1024 * 1024 // 50 MB
const FRAME_INFO = 'PNG only • Min 500×500 • Max 8000×8000 • 50MB limit'
const FRAME_TIP = 'Recommended: 1080×1080 • Keep the centre empty for the user\u2019s photo'
const FRAME_MAX_MB_LABEL = '50 MB'

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

function FrameUploadForm({ userId, onCancel, onSaved }: { userId: number; onCancel: () => void; onSaved: () => void }) {
  const { addToast } = useToast()
  const [name, setName] = useState('')
  const [category, setCategory] = useState('festival')
  const [frameType, setFrameType] = useState('square')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  const tooLarge = !!file && file.size > FRAME_MAX_BYTES
  const wrongType = !!file && !file.type.includes('png') && !file.name.toLowerCase().endsWith('.png')

  const handleUpload = async () => {
    if (!name || !file) { addToast('Name and PNG file are required', 'error'); return }
    if (wrongType) { addToast('Only PNG files are allowed.', 'error'); return }
    if (tooLarge) {
      addToast(`File too large (${formatBytes(file.size)}). Max ${FRAME_MAX_MB_LABEL}.`, 'error')
      return
    }
    setSaving(true)
    try {
      await userCustomFramesApi.uploadForUser({ user: userId, name, category, frame_type: frameType, frame_image: file })
      addToast('Frame uploaded')
      onSaved()
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: unknown } }
      const status = err.response?.status
      if (status === 413) {
        addToast(`File too large for server (${formatBytes(file.size)}). Max ${FRAME_MAX_MB_LABEL}.`, 'error')
      } else if (status === 400 && err.response?.data && typeof err.response.data === 'object') {
        // DRF validation error — surface the first field message cleanly
        const data = err.response.data as Record<string, unknown>
        const firstMsg =
          (Array.isArray(data.frame_image) && data.frame_image[0]) ||
          (Array.isArray(data.detail) && data.detail[0]) ||
          data.detail ||
          JSON.stringify(data)
        addToast(`Upload failed: ${String(firstMsg)}`, 'error')
      } else {
        addToast('Upload failed. Please try again.', 'error')
      }
    } finally { setSaving(false) }
  }

  return (
    <div className="bg-[#f5efe0] rounded-xl p-4 mb-3">
      <h3 className="text-sm font-bold text-gray-900 mb-3">Upload Frame</h3>
      <div className="space-y-2">
        <TextInput icon="T" placeholder="Frame Name" value={name} onChange={setName} />
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <span className="text-gray-500">Category</span>
            <select value={category} onChange={e => setCategory(e.target.value)} className="flex-1 bg-transparent outline-none capitalize">
              {FRAME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <span className="text-gray-500">Type</span>
            <select value={frameType} onChange={e => setFrameType(e.target.value)} className="flex-1 bg-transparent outline-none capitalize">
              {FRAME_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        </div>
        <label
          className={
            'block border-dashed rounded-lg px-3 py-3 text-sm text-center cursor-pointer transition-colors ' +
            (tooLarge || wrongType
              ? 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100'
              : 'bg-white border-indigo-300 hover:bg-indigo-50 text-gray-800')
          }
        >
          <input type="file" accept="image/png" onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" />
          {file ? (
            <span>
              📄 {file.name}
              <span className="ml-2 text-xs opacity-80">
                ({formatBytes(file.size)}
                {tooLarge && <span className="text-red-700 font-semibold"> — too large</span>}
                {wrongType && <span className="text-red-700 font-semibold"> — not a PNG</span>}
                )
              </span>
            </span>
          ) : (
            '📄 Select PNG Frame'
          )}
        </label>
        <div className="text-xs text-blue-900 bg-blue-50 rounded-lg p-2 space-y-0.5">
          <div>ℹ️ {FRAME_INFO}</div>
          <div className="text-blue-800/80">💡 {FRAME_TIP}</div>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-3">
        <button onClick={onCancel} className="text-gray-600 px-3 py-1.5 text-sm">Cancel</button>
        <button
          onClick={handleUpload}
          disabled={saving || !file || tooLarge || wrongType}
          className="px-4 py-1.5 rounded-full bg-indigo-500 text-white text-sm hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Uploading...' : '☁ Upload Frame'}
        </button>
      </div>
    </div>
  )
}
