/**
 * Slide-out drawer showing the last 5 version snapshots of the current frame.
 * Pulls from GET /api/admin/poster-frames/{id}/versions/.
 *
 * Clicking "Restore" fires POST .../rollback/ with the chosen version id.
 */
import { useEffect, useState } from 'react'
import { posterFramesApi } from '../../../services/admin-api'

type Version = {
  id: number
  name: string
  tags: string[]
  config_json: Record<string, unknown>
  edited_by: string | null
  edited_at: string
}

export function VersionHistoryDrawer({
  open,
  frameId,
  onClose,
  onRestored,
}: {
  open: boolean
  frameId: number | null
  onClose: () => void
  onRestored: () => void
}) {
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !frameId) return
    setLoading(true)
    posterFramesApi.versions(frameId)
      .then(data => setVersions(data as Version[]))
      .catch(() => setVersions([]))
      .finally(() => setLoading(false))
  }, [open, frameId])

  const onRestore = async (versionId: number) => {
    if (!frameId) return
    if (!confirm('Restore this version? Current changes will be overwritten (new version snapshot is kept).')) return
    await posterFramesApi.rollback(frameId, versionId)
    onRestored()
    onClose()
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[70] bg-black/30" onClick={onClose}>
      <div
        className="absolute right-0 top-0 h-full w-[360px] bg-white shadow-2xl p-4 overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Version History</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900">✕</button>
        </div>
        {loading && <div className="text-sm text-gray-500">Loading…</div>}
        {!loading && versions.length === 0 && (
          <div className="text-sm text-gray-500">No prior versions for this frame.</div>
        )}
        <ul className="space-y-2">
          {versions.map((v, i) => (
            <li key={v.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <div className="flex items-center justify-between mb-1">
                <div className="font-medium text-sm">
                  {i === 0 ? '🟢 Current' : `#${versions.length - i}`} — {v.name}
                </div>
                {i > 0 && (
                  <button
                    onClick={() => onRestore(v.id)}
                    className="text-xs px-2 py-1 rounded bg-indigo-500 text-white hover:bg-indigo-600"
                  >Restore</button>
                )}
              </div>
              <div className="text-[11px] text-gray-500">
                {new Date(v.edited_at).toLocaleString()}
                {v.edited_by && <> · {v.edited_by}</>}
              </div>
              <div className="text-[11px] text-gray-600 mt-1">
                {v.tags.length > 0 && <>Tags: {v.tags.join(', ')}</>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
