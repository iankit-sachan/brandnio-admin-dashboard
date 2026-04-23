import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { uiStringsApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'
import { useToast } from '../../context/ToastContext'

/**
 * Home-Tools CMS v1 (2026-04-23): admin page for editing the UI strings
 * that were previously hardcoded in the Android APK for the 6 Explore
 * Features tools. Rows are grouped by `tool_key` with per-group
 * expand/collapse since editors usually work on one tool at a time.
 *
 * The `value` column uses a textarea for long values (JSON blobs like
 * the Birthday Excel column mapping live here too — the admin sees
 * the JSON and edits it directly; the Android client parses it).
 */

interface UiString {
  id: number
  tool_key: string
  string_key: string
  value: string
  description: string
  created_at: string
  updated_at: string
}

const TOOL_LABELS: Record<string, string> = {
  whatsapp_sticker: 'WhatsApp Sticker',
  auto_product_ad: 'Auto Product Ad',
  remove_background: 'Remove Background',
  free_status: 'Free Status',
  bday_anniversary: 'Birthday & Anniversary',
  feeds: 'Feeds',
}

export default function UiStringsPage() {
  const { addToast } = useToast()
  const { data, loading, error, update, refresh } = useAdminCrud<UiString>(uiStringsApi)

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<UiString | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)

  const grouped = useMemo(() => {
    const map = new Map<string, UiString[]>()
    for (const row of data) {
      const list = map.get(row.tool_key) ?? []
      list.push(row)
      map.set(row.tool_key, list)
    }
    // Sort strings within each group by key so UI doesn't reshuffle
    // on refresh + stable visual order for editors.
    for (const arr of map.values()) {
      arr.sort((a, b) => a.string_key.localeCompare(b.string_key))
    }
    // Return ordered entries — keep the tool order stable and matching
    // the home-screen order.
    const order = [
      'whatsapp_sticker', 'auto_product_ad', 'remove_background',
      'free_status', 'bday_anniversary', 'feeds',
    ]
    const result: [string, UiString[]][] = []
    for (const key of order) {
      const arr = map.get(key)
      if (arr) result.push([key, arr])
    }
    // Any ad-hoc tool_keys the admin has added show up last.
    for (const [key, arr] of map.entries()) {
      if (!order.includes(key)) result.push([key, arr])
    }
    return result
  }, [data])

  const toggle = (key: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  const openEdit = (row: UiString) => {
    setEditing(row)
    setEditValue(row.value)
  }

  const handleSave = async () => {
    if (!editing) return
    setSaving(true)
    try {
      await update(editing.id, { value: editValue } as unknown as Partial<UiString>)
      addToast('String updated')
      setEditing(null)
      refresh()
    } catch {
      addToast('Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">UI Strings</h1>
        <p className="text-xs text-brand-text-muted mt-1">
          Admin-editable labels, placeholders, error messages and JSON blobs
          for the 6 Home &quot;Explore Features&quot; tools. Android fetches the
          latest values on every cold start.
        </p>
      </div>

      {loading ? (
        <div className="py-10 text-center text-brand-text-muted text-sm">Loading…</div>
      ) : error ? (
        <div className="py-10 text-center text-status-error text-sm">{error}</div>
      ) : data.length === 0 ? (
        <div className="py-10 text-center text-brand-text-muted text-sm">
          No strings configured. Run the <code>0012_uistring</code> migration
          on the backend to seed the defaults.
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(([toolKey, rows]) => {
            const isOpen = !collapsed.has(toolKey)
            const label = TOOL_LABELS[toolKey] ?? toolKey
            return (
              <div
                key={toolKey}
                className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 overflow-hidden"
              >
                <button
                  onClick={() => toggle(toolKey)}
                  className="w-full flex items-center gap-2 px-4 py-3 hover:bg-brand-dark-hover/40 transition-colors"
                >
                  {isOpen
                    ? <ChevronDown className="h-4 w-4 text-brand-text-muted" />
                    : <ChevronRight className="h-4 w-4 text-brand-text-muted" />}
                  <span className="font-semibold text-brand-text">{label}</span>
                  <span className="text-xs text-brand-text-muted">
                    {rows.length} string{rows.length === 1 ? '' : 's'}
                  </span>
                  <code className="text-[10px] text-brand-text-muted/60 ml-auto">
                    {toolKey}
                  </code>
                </button>
                {isOpen && (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-t border-brand-dark-border/30 bg-brand-dark/40">
                        <th className="text-left px-4 py-2 text-xs font-medium text-brand-text-muted w-[25%]">Key</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-brand-text-muted">Value</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-brand-text-muted w-[25%]">Description</th>
                        <th className="px-4 py-2 w-16" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(row => (
                        <tr key={row.id} className="border-t border-brand-dark-border/30 hover:bg-brand-dark-hover/30">
                          <td className="px-4 py-2 align-top">
                            <code className="text-[11px] text-brand-text-muted font-mono">
                              {row.string_key}
                            </code>
                          </td>
                          <td className="px-4 py-2 align-top">
                            <div className="text-brand-text text-xs font-mono max-w-xl truncate" title={row.value}>
                              {row.value || <span className="text-brand-text-muted/60">(empty)</span>}
                            </div>
                          </td>
                          <td className="px-4 py-2 align-top">
                            <span className="text-xs text-brand-text-muted">
                              {row.description || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-2 align-top text-right">
                            <button
                              onClick={() => openEdit(row)}
                              className="px-3 py-1 text-xs rounded-lg bg-brand-dark-hover hover:bg-brand-gold/20 hover:text-brand-gold text-brand-text transition-colors"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Modal
        isOpen={!!editing}
        onClose={() => !saving && setEditing(null)}
        title={editing ? `Edit ${editing.tool_key}.${editing.string_key}` : ''}
      >
        {editing && (
          <div className="space-y-4">
            {editing.description && (
              <p className="text-xs text-brand-text-muted">{editing.description}</p>
            )}
            <div>
              <label className="block text-xs font-medium text-brand-text-muted mb-1.5">
                Value
              </label>
              <textarea
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                rows={8}
                className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text font-mono focus:outline-none focus:border-brand-gold/50"
                disabled={saving}
              />
              <p className="text-[11px] text-brand-text-muted mt-1">
                For structured data (JSON), preserve valid JSON syntax or the
                Android client will fall back to its built-in default.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setEditing(null)}
                disabled={saving}
                className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
