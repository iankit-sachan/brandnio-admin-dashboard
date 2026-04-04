import { useState } from 'react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { useToast } from '../../context/ToastContext'
import { Send, Bell, Megaphone, Settings, Search } from 'lucide-react'
import { notificationSendApi, notificationsApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'

type NotifType = 'general' | 'promo' | 'system'
type TargetType = 'all' | 'active_subscribers' | 'free_users' | 'specific_user'

interface Notification {
  id: number
  title: string
  type: NotifType
  target: string
  sent_date: string
  read_count: number
  status: 'delivered' | 'pending' | 'failed'
}

const typeIcons: Record<NotifType, React.ReactNode> = {
  general: <Bell className="h-3.5 w-3.5" />,
  promo: <Megaphone className="h-3.5 w-3.5" />,
  system: <Settings className="h-3.5 w-3.5" />,
}

const typeColors: Record<NotifType, string> = {
  general: 'bg-status-info/20 text-status-info',
  promo: 'bg-brand-gold/20 text-brand-gold',
  system: 'bg-status-error/20 text-status-error',
}

export default function CommunicationCenterPage() {
  const { addToast } = useToast()
  const [activeTab, setActiveTab] = useState<'send' | 'history'>('send')

  // Send form state
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [type, setType] = useState<NotifType>('general')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [target, setTarget] = useState<TargetType>('all')
  const [userSearch, setUserSearch] = useState('')
  const [sending, setSending] = useState(false)

  // History state
  const { data: notifications, loading } = useAdminCrud<Notification>(notificationsApi)

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { addToast('Title is required', 'error'); return }
    if (!body.trim()) { addToast('Body is required', 'error'); return }
    if (target === 'specific_user' && !userSearch.trim()) { addToast('Please enter a user to search', 'error'); return }
    setSending(true)
    try {
      await notificationSendApi.send({ title, body, notification_type: type, image_url: imageUrl || undefined, target })
      addToast('Notification sent successfully!', 'success')
      setTitle('')
      setBody('')
      setType('general')
      setImageUrl(null)
      setTarget('all')
      setUserSearch('')
    } catch {
      addToast('Failed to send notification', 'error')
    } finally {
      setSending(false)
    }
  }

  const columns: Column<Notification>[] = [
    { key: 'title', title: 'Title', sortable: true },
    {
      key: 'type', title: 'Type', sortable: true, render: (item) => (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${typeColors[item.type]}`}>
          {typeIcons[item.type]} {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
        </span>
      )
    },
    { key: 'target', title: 'Target', sortable: true },
    { key: 'sent_date', title: 'Sent Date', sortable: true },
    { key: 'read_count', title: 'Read Count', sortable: true, render: (item) => <span className="text-brand-text">{item.read_count.toLocaleString()}</span> },
    {
      key: 'status', title: 'Status', render: (item) => (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${item.status === 'delivered' ? 'bg-status-success/20 text-status-success' : item.status === 'pending' ? 'bg-brand-gold/20 text-brand-gold' : 'bg-status-error/20 text-status-error'}`}>
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </span>
      )
    },
  ]

  const tabs = [
    { id: 'send' as const, label: 'Send Notification', icon: <Send className="h-4 w-4" /> },
    { id: 'history' as const, label: 'Notification History', icon: <Bell className="h-4 w-4" /> },
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-brand-text">Communication Center</h1>

      <div className="flex gap-1 bg-brand-dark-card rounded-xl border border-brand-dark-border/50 p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-brand-gold text-gray-900' : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-dark-hover'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'send' && (
        <form onSubmit={handleSend} className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 p-6 space-y-4 max-w-3xl">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Notification title..." className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Body</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} placeholder="Notification body..." className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Type</label>
            <select value={type} onChange={e => setType(e.target.value as NotifType)} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
              <option value="general">General</option>
              <option value="promo">Promo</option>
              <option value="system">System</option>
            </select>
          </div>
          <ImageUpload label="Notification Image (optional)" value={imageUrl} onChange={v => setImageUrl(v)} />
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Target Audience</label>
            <select value={target} onChange={e => setTarget(e.target.value as TargetType)} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
              <option value="all">All Users</option>
              <option value="active_subscribers">Active Subscribers</option>
              <option value="free_users">Free Users</option>
              <option value="specific_user">Specific User</option>
            </select>
          </div>
          {target === 'specific_user' && (
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Search User</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-text-muted" />
                <input type="text" value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search by name or email..." className="w-full bg-brand-dark border border-brand-dark-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
              </div>
            </div>
          )}
          <button type="submit" disabled={sending} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors inline-flex items-center gap-2 disabled:opacity-50">
            <Send className="h-4 w-4" /> {sending ? 'Sending...' : 'Send Notification'}
          </button>
        </form>
      )}

      {activeTab === 'history' && (
        <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
          {loading ? <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div> : <DataTable columns={columns} data={notifications} />}
        </div>
      )}
    </div>
  )
}
