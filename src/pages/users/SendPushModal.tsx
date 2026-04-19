import { useState } from 'react'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../context/ToastContext'
import { usersAdminApi } from '../../services/admin-api'
import { Send, Bell } from 'lucide-react'

/**
 * Pillar 3 — admin push notification composer.
 *
 * Three modes (driven by props):
 *   - 'single'      → push to ONE user (UserDetailsModal "Send Push" button)
 *   - 'multi'       → push to a hand-picked set of user_ids (table multi-select)
 *   - 'filter'      → push to all users matching a filter set (audience push)
 *
 * Always shows a confirmation dialog with the resolved target count BEFORE
 * actually firing FCM — prevents accidental "send to 5000 users" disasters.
 */

export interface SendPushFilter {
  is_premium?: boolean
  plan?: 'free' | 'basic' | 'pro' | 'enterprise'
  last_seen_days_min?: number   // active in last N days
  last_seen_days_max?: number   // inactive for N+ days
}

interface BaseProps {
  isOpen: boolean
  onClose: () => void
  onSent?: () => void
}

interface SingleProps extends BaseProps {
  mode: 'single'
  userId: number
  userName?: string
}

interface MultiProps extends BaseProps {
  mode: 'multi'
  userIds: number[]
}

interface FilterProps extends BaseProps {
  mode: 'filter'
  filters: SendPushFilter
  estimatedCount?: number   // optional pre-computed count for confirmation
}

type Props = SingleProps | MultiProps | FilterProps

export default function SendPushModal(props: Props) {
  const { addToast } = useToast()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [deepLink, setDeepLink] = useState('')
  const [saveToInbox, setSaveToInbox] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const targetLabel = (() => {
    if (props.mode === 'single') return props.userName ? `to ${props.userName}` : 'to 1 user'
    if (props.mode === 'multi') return `to ${props.userIds.length} selected user${props.userIds.length === 1 ? '' : 's'}`
    return props.estimatedCount != null
      ? `to ${props.estimatedCount} matching user${props.estimatedCount === 1 ? '' : 's'}`
      : 'to all matching users'
  })()

  const reset = () => {
    setTitle(''); setBody(''); setImageUrl(null); setDeepLink('')
    setSaveToInbox(true); setSubmitting(false); setConfirming(false); setResult(null)
  }
  const close = () => { reset(); props.onClose() }

  const validate = (): string | null => {
    const t = title.trim(); const b = body.trim()
    if (!t) return 'Title is required'
    if (t.length > 50) return 'Title must be ≤ 50 characters'
    if (!b) return 'Body is required'
    if (b.length > 200) return 'Body must be ≤ 200 characters'
    return null
  }

  const onSendClick = () => {
    const err = validate()
    if (err) { addToast(err, 'error'); return }
    setConfirming(true)
  }

  const doSend = async () => {
    setSubmitting(true)
    setResult(null)
    try {
      if (props.mode === 'single') {
        const r = await usersAdminApi.sendPush(props.userId, {
          title: title.trim(), body: body.trim(),
          image_url: imageUrl || undefined,
          deep_link: deepLink.trim() || undefined,
          save_to_inbox: saveToInbox,
        })
        const msg = r.device_count === 0
          ? `User has no registered devices — saved to inbox only.`
          : `Sent to ${r.sent_count}/${r.device_count} device${r.device_count === 1 ? '' : 's'}` +
            (r.failed_count > 0 ? ` · ${r.failed_count} failed` : '')
        addToast(msg, r.sent_count > 0 || r.device_count === 0 ? 'success' : 'error')
        setResult(msg)
      } else {
        const payload: Parameters<typeof usersAdminApi.sendPushBulk>[0] = {
          title: title.trim(), body: body.trim(),
          image_url: imageUrl || undefined,
          deep_link: deepLink.trim() || undefined,
          save_to_inbox: saveToInbox,
        }
        if (props.mode === 'multi') payload.user_ids = props.userIds
        else payload.filters = props.filters
        const r = await usersAdminApi.sendPushBulk(payload)
        const msg = `Reached ${r.target_count} user${r.target_count === 1 ? '' : 's'} · ${r.sent_count} push${r.sent_count === 1 ? '' : 'es'} sent` +
          (r.failed_count > 0 ? ` · ${r.failed_count} failed` : '')
        addToast(msg, 'success')
        setResult(msg)
      }
      props.onSent?.()
      // Auto-close after 1.5s so admin sees the result
      setTimeout(close, 1800)
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { detail?: string } } }
      if (err.response?.status === 429) {
        addToast(err.response.data?.detail || 'Rate limit exceeded — try again in 1 hour.', 'error')
      } else {
        addToast(err.response?.data?.detail || 'Send failed', 'error')
      }
      setConfirming(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Modal isOpen={props.isOpen && !confirming} onClose={close} title="Send Push Notification">
        <div className="space-y-4">
          <div className="px-3 py-2 rounded-lg bg-brand-dark-hover border border-brand-dark-border text-sm">
            <Bell className="inline-block h-4 w-4 mr-1.5 text-brand-gold" />
            <span className="text-brand-text-muted">Sending </span>
            <span className="font-semibold text-brand-text">{targetLabel}</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">
              Title <span className="text-status-error">*</span>
              <span className="ml-2 text-xs text-brand-text-muted/60">{title.length}/50</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={50}
              placeholder="e.g. Premium 50% off today!"
              className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">
              Body <span className="text-status-error">*</span>
              <span className="ml-2 text-xs text-brand-text-muted/60">{body.length}/200</span>
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={200}
              rows={3}
              placeholder="Tap to claim your discount."
              className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50 resize-none"
            />
          </div>

          <ImageUpload
            label="Image (optional)"
            value={imageUrl}
            onChange={setImageUrl}
            aspectHint="Notification large image, 16:9 recommended"
          />

          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">
              Deep Link (optional)
            </label>
            <input
              value={deepLink}
              onChange={(e) => setDeepLink(e.target.value)}
              placeholder="e.g. screen=subscription   or   https://brandnio.com/promo"
              className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50"
            />
            <div className="text-xs text-brand-text-muted/70 mt-1">
              Where tapping the notification takes the user.
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={saveToInbox}
              onChange={(e) => setSaveToInbox(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-brand-text-muted">
              Also save to user's in-app notification inbox (recommended)
            </span>
          </label>

          {/* Live preview */}
          {(title || body) && (
            <div className="rounded-lg border border-brand-dark-border bg-brand-dark p-3">
              <div className="text-xs text-brand-text-muted mb-1.5">Preview:</div>
              <div className="bg-brand-dark-hover rounded-md p-3 flex gap-3">
                <div className="w-10 h-10 rounded-md bg-brand-gold/20 flex items-center justify-center text-brand-gold text-xs font-bold shrink-0">
                  B
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-brand-text truncate">{title || 'Title'}</div>
                  <div className="text-xs text-brand-text-muted line-clamp-2">{body || 'Body text'}</div>
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="p-3 rounded-lg bg-status-success/10 border border-status-success/40 text-sm text-status-success">
              ✓ {result}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-brand-dark-border/50">
            <button
              onClick={close}
              disabled={submitting}
              className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border"
            >
              Cancel
            </button>
            <button
              onClick={onSendClick}
              disabled={submitting || !title.trim() || !body.trim()}
              className="px-5 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark disabled:opacity-50 inline-flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              Send Push
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirmation dialog — shown before actually firing FCM */}
      {confirming && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="bg-brand-dark-card rounded-xl w-full max-w-sm border border-brand-dark-border shadow-2xl p-5">
            <h3 className="text-base font-semibold text-brand-text mb-2">Send this push?</h3>
            <p className="text-sm text-brand-text-muted mb-3">
              This will deliver the notification {targetLabel}. This cannot be undone.
            </p>
            <div className="px-3 py-2 rounded-md bg-brand-dark-hover text-xs text-brand-text-muted mb-4">
              <div className="font-semibold text-brand-text">{title.trim()}</div>
              <div className="line-clamp-2">{body.trim()}</div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirming(false)}
                disabled={submitting}
                className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={doSend}
                disabled={submitting}
                className="px-4 py-2 text-sm rounded-lg bg-brand-gold text-gray-900 font-semibold hover:bg-brand-gold-dark disabled:opacity-50 inline-flex items-center gap-2"
              >
                <Send className="h-3.5 w-3.5" />
                {submitting ? 'Sending…' : 'Yes, Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
