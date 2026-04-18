import { useEffect, useState } from 'react'
import {
  usersApi, businessProfilesApi, politicianProfilesApi, userCustomFramesApi,
  businessIndustriesApi, politicianCategoriesApi, politicianPositionsApi,
} from '../../services/admin-api'
import { useToast } from '../../context/ToastContext'
import type { User, UserDetails, BusinessProfile, PoliticianProfile } from '../../types'
import { formatDate } from '../../utils/formatters'

interface LookupRow { id: number; name: string; slug: string; is_active?: boolean }

type Tab = 'subscription' | 'business' | 'political' | 'frames'

const FRAME_CATEGORIES = ['festival','birthday','wedding','business','political','religious','sports','nature']
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Gradient header */}
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-purple-600 p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-400 flex items-center justify-center text-white text-2xl font-bold">
            🏅
          </div>
          <div className="flex-1">
            <div className="text-white font-semibold text-lg">{user.name || 'Guest'}</div>
            <div className="text-white/80 text-sm">{user.email || 'NA'}</div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/10">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-4 bg-white">
          {(['subscription','business','political','frames'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium capitalize transition-colors border-b-2 ${
                tab === t
                  ? 'text-indigo-600 border-indigo-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
          {loading ? (
            <div className="py-12 text-center text-gray-500">Loading...</div>
          ) : !details ? (
            <div className="py-12 text-center text-red-500">Failed to load.</div>
          ) : tab === 'subscription' ? (
            <SubscriptionTab details={details} />
          ) : tab === 'business' ? (
            <BusinessTab details={details} userId={user.id} onChanged={reload} />
          ) : tab === 'political' ? (
            <PoliticalTab details={details} userId={user.id} onChanged={reload} />
          ) : (
            <FramesTab details={details} userId={user.id} onChanged={reload} />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Subscription Tab ────────────────────────────────────────────────
function SubscriptionTab({ details }: { details: UserDetails }) {
  const sub = details.active_subscription
  const isActive = sub && sub.status === 'active'
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
          <div className="text-sm text-gray-600 flex items-center gap-2">🚚 No Business Added</div>
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
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-gray-600 flex items-center gap-2">🚚 {bp.business_name || 'Business'}</div>
        <button onClick={() => setEditing(true)} className="px-3 py-1.5 text-sm rounded-lg bg-indigo-500 text-white hover:bg-indigo-600">
          Edit Business
        </button>
      </div>
      <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-2 text-sm">
        <Row label="Name" value={bp.business_name} />
        <Row label="Tagline" value={bp.tagline} />
        <Row label="Username" value={bp.username || ''} />
        <Row label="Phone" value={`${bp.phone}${bp.show_phone_number ? ' (public)' : ''}`} />
        <Row label="Website" value={bp.website} />
        <Row label="Instagram" value={bp.instagram_url || (bp as unknown as { instagram: string }).instagram || ''} />
        <Row label="Facebook" value={bp.facebook_url || (bp as unknown as { facebook: string }).facebook || ''} />
        <Row label="LinkedIn" value={bp.linkedin || ''} />
        <Row label="City/State" value={`${bp.city}, ${bp.state}`} />
        <Row label="Pincode" value={bp.pincode} />
      </div>
    </div>
  )
}

function BusinessForm({ existing, userId, onCancel, onSaved }: {
  existing: BusinessProfile | null; userId: number; onCancel: () => void; onSaved: () => void
}) {
  const { addToast } = useToast()
  type BPFormShape = Partial<BusinessProfile> & {
    instagram?: string; facebook?: string; youtube?: string; whatsapp?: string
  }
  const [form, setForm] = useState<BPFormShape>({
    business_name: existing?.business_name || '',
    tagline: existing?.tagline || '',
    username: existing?.username || '',
    industries: existing?.industries || '',
    phone: existing?.phone || '',
    show_phone_number: existing?.show_phone_number || false,
    website: existing?.website || '',
    instagram: (existing as unknown as { instagram?: string })?.instagram || '',
    facebook: (existing as unknown as { facebook?: string })?.facebook || '',
    linkedin: existing?.linkedin || '',
    address: existing?.address || '',
    city: existing?.city || '',
    state: existing?.state || '',
    pincode: existing?.pincode || '',
  })
  const [saving, setSaving] = useState(false)
  const [industries, setIndustries] = useState<LookupRow[]>([])
  const [lookupLoading, setLookupLoading] = useState(true)

  useEffect(() => {
    businessIndustriesApi.list({ is_active: 'true' })
      .then(rows => setIndustries(rows as LookupRow[]))
      .finally(() => setLookupLoading(false))
  }, [])

  const update = <K extends keyof BPFormShape>(k: K, v: BPFormShape[K]) => setForm({ ...form, [k]: v })

  const handleSubmit = async () => {
    if (!form.business_name || !form.username) {
      addToast('Business Name and Username are required', 'error'); return
    }
    setSaving(true)
    try {
      const payload = { ...form, user: userId }
      if (existing?.id) await businessProfilesApi.update(existing.id, payload)
      else await businessProfilesApi.create(payload)
      addToast(existing ? 'Business updated' : 'Business created')
      onSaved()
    } catch (e: unknown) {
      const err = e as { response?: { data?: unknown } }
      addToast('Failed: ' + JSON.stringify(err.response?.data || 'error'), 'error')
    } finally { setSaving(false) }
  }

  return (
    <div className="bg-[#f5efe0] rounded-xl p-4">
      <h3 className="text-sm font-bold text-gray-900 mb-3">🚚 {existing ? 'Edit' : 'Add'} Business Details</h3>
      <div className="bg-blue-100 text-blue-800 text-xs rounded-lg p-2 mb-3">👤 Creating for: user #{userId}</div>
      <div className="text-xs font-semibold text-gray-700 mb-1">Basic Information</div>
      <div className="space-y-2 mb-3">
        <TextInput icon="🏢" placeholder="Business Name *" value={form.business_name || ''} onChange={v => update('business_name', v)} />
        <TextInput icon="💬" placeholder="Tagline" value={form.tagline || ''} onChange={v => update('tagline', v)} />
        <TextInput icon="@" placeholder="Username *" value={form.username || ''} onChange={v => update('username', v)} />
        <DropdownInput
          icon="🏭"
          label="Select Industry *"
          value={form.industries || ''}
          onChange={v => update('industries', v)}
          options={industries.map(i => ({ value: i.slug, label: i.name }))}
          loading={lookupLoading}
        />
      </div>
      <div className="text-xs font-semibold text-gray-700 mb-1">Contact Information</div>
      <div className="space-y-2 mb-3">
        <TextInput icon="📞" placeholder="Phone" value={form.phone || ''} onChange={v => update('phone', v)} />
        <label className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <input type="checkbox" checked={!!form.show_phone_number} onChange={e => update('show_phone_number', e.target.checked)} />
          <span className="text-gray-900">Show Phone Number</span>
          <span className="text-xs text-gray-500">Display phone on business card</span>
        </label>
        <TextInput icon="🌐" placeholder="Website" value={form.website || ''} onChange={v => update('website', v)} />
        <TextInput icon="📷" placeholder="Instagram" value={form.instagram || ''} onChange={v => update('instagram', v)} />
        <TextInput icon="f" placeholder="Facebook" value={form.facebook || ''} onChange={v => update('facebook', v)} />
        <TextInput icon="in" placeholder="LinkedIn" value={form.linkedin || ''} onChange={v => update('linkedin', v)} />
      </div>
      <div className="text-xs font-semibold text-gray-700 mb-1">Address</div>
      <div className="space-y-2 mb-3">
        <TextInput icon="🏠" placeholder="Street Address" value={form.address || ''} onChange={v => update('address', v)} />
        <div className="grid grid-cols-2 gap-2">
          <TextInput icon="🏙" placeholder="City" value={form.city || ''} onChange={v => update('city', v)} />
          <TextInput icon="🗺" placeholder="State" value={form.state || ''} onChange={v => update('state', v)} />
        </div>
        <TextInput icon="📍" placeholder="Pincode" value={form.pincode || ''} onChange={v => update('pincode', v)} />
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
              <img src={f.frame_image_url} alt={f.name} className="w-full h-32 object-cover" />
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

const FRAME_MAX_BYTES = 20 * 1024 * 1024 // 20 MB — matches backend serializer + nginx

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
      addToast(`File too large (${formatBytes(file.size)}). Max 20 MB.`, 'error')
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
        addToast(`File too large for server (${formatBytes(file.size)}). Max 20 MB.`, 'error')
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
        <div className="text-xs text-blue-900 bg-blue-50 rounded-lg p-2">
          ℹ️ PNG only • Min 500×500 • Max 4000×4000 • 20MB limit
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
