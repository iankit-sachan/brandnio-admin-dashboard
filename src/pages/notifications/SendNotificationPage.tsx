import { useState } from 'react'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { useToast } from '../../context/ToastContext'
import { notificationSendApi } from '../../services/admin-api'

export default function SendNotificationPage() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [type, setType] = useState('general')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const { addToast } = useToast()

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    try {
      await notificationSendApi.send({ title, body, notification_type: type, image_url: imageUrl || undefined, target: 'all' })
      addToast('Notification sent successfully!', 'success')
      setTitle('')
      setBody('')
      setType('general')
      setImageUrl(null)
    } catch {
      addToast('Failed to send notification', 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold text-brand-text">Send Notification</h1>
      <form onSubmit={handleSend} className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 p-6 space-y-4">
        <ImageUpload label="Notification Image (optional)" value={imageUrl} onChange={v => setImageUrl(v)} />
        <div>
          <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Title</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Body</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Type</label>
          <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
            <option value="general">General</option>
            <option value="promo">Promo</option>
            <option value="system">System</option>
          </select>
        </div>
        <button type="submit" disabled={sending} className="px-6 py-2.5 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors disabled:opacity-50">
          {sending ? 'Sending...' : 'Send Notification'}
        </button>
      </form>
    </div>
  )
}
