import { useEffect, useRef, useState } from 'react'
import { festivalCalendarApi, languagesApi } from '../../services/admin-api'
import { useToast } from '../../context/ToastContext'
import type { Language, PosterMediaType } from '../../types/festival.types'
import type { Festival } from '../../types/festival.types'
import { detectImageRatio, groupFilesByRatio, formatBytes, type DetectedRatio } from './uploadHelpers'

interface Props {
  date: string                // YYYY-MM-DD
  festivals: Festival[]       // all festivals on this date
  onClose: () => void
  onUploaded: () => void
}

const IMG_MAX = 20 * 1024 * 1024
const VID_MAX = 100 * 1024 * 1024

// One file in the staging area: original + detected ratio + preview URL.
// `ratio` is null for non-image files (videos) until admin manually picks it
// in the videoFallbackRatio dropdown.
interface StagedFile {
  file: File
  ratio: DetectedRatio | null
  previewUrl: string | null
  detecting: boolean
}

export default function BulkFestivalPosterUploadModal({ date, festivals, onClose, onUploaded }: Props) {
  const { addToast } = useToast()
  const [languages, setLanguages] = useState<Language[]>([])
  const [festivalId, setFestivalId] = useState<number>(festivals[0]?.id ?? 0)
  const [languageId, setLanguageId] = useState<number | null>(null)
  const [mediaType, setMediaType] = useState<PosterMediaType>('image')
  // Videos can't be ratio-detected in browser cheaply — admin picks one.
  const [videoFallbackRatio, setVideoFallbackRatio] = useState<DetectedRatio>('1:1')

  const [staged, setStaged] = useState<StagedFile[]>([])
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<{ loaded: number; total: number; percent: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<{
    created_count: number
    failed_count: number
    failed: Array<{ filename: string; reason: string }>
    batch_count?: number
  } | null>(null)

  const [pendingMediaType, setPendingMediaType] = useState<PosterMediaType | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    languagesApi.list({ is_active: 'true' }).then((rows) => {
      const list = rows as Language[]
      setLanguages(list)
      if (list.length && languageId == null) setLanguageId(list[0].id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Revoke all preview URLs when modal closes (prevents memory leak).
  useEffect(() => {
    return () => {
      staged.forEach(s => { if (s.previewUrl) URL.revokeObjectURL(s.previewUrl) })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const maxBytes = mediaType === 'video' ? VID_MAX : IMG_MAX

  // Async file pick: stage immediately with `detecting=true`, then resolve
  // each file's ratio in parallel and patch state when done.
  const pickFiles = (list: FileList | null) => {
    if (!list) return
    setError(null)
    setLastResult(null)
    const newOnes: StagedFile[] = Array.from(list).map(file => ({
      file,
      ratio: null,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      detecting: file.type.startsWith('image/'),  // only images need detection
    }))
    setStaged(prev => [...prev, ...newOnes])

    // Run detection in parallel (each file independent — no need to await).
    newOnes.forEach((s) => {
      detectImageRatio(s.file).then(r => {
        setStaged(prev => prev.map(item =>
          item.file === s.file ? { ...item, ratio: r, detecting: false } : item
        ))
      })
    })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    pickFiles(e.dataTransfer.files)
  }

  const removeStaged = (i: number) => {
    setStaged(prev => {
      const target = prev[i]
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((_, idx) => idx !== i)
    })
  }

  const requestMediaTypeChange = (newType: PosterMediaType) => {
    if (newType === mediaType) return
    if (staged.length === 0) { setMediaType(newType); return }
    setPendingMediaType(newType)
  }
  const confirmMediaTypeChange = () => {
    if (pendingMediaType) {
      // Revoke previews before clearing.
      staged.forEach(s => { if (s.previewUrl) URL.revokeObjectURL(s.previewUrl) })
      setMediaType(pendingMediaType)
      setStaged([])
      setPendingMediaType(null)
    }
  }
  const cancelMediaTypeChange = () => setPendingMediaType(null)

  // Validation buckets
  const oversized = staged.filter(s => s.file.size > maxBytes)
  const wrongType = staged.filter(s => {
    if (mediaType === 'image') return !s.file.type.startsWith('image/')
    return !s.file.type.startsWith('video/')
  })
  const stillDetecting = staged.filter(s => s.detecting)
  const filesValid = oversized.length === 0 && wrongType.length === 0 && stillDetecting.length === 0
  const canUpload = festivalId && staged.length > 0 && filesValid && !uploading

  const cancelUpload = () => {
    abortRef.current?.abort()
    abortRef.current = null
    setUploading(false)
    setProgress(null)
    addToast('Upload cancelled', 'success')
  }

  const doUpload = async () => {
    if (!canUpload) return
    setUploading(true)
    setError(null)
    setLastResult(null)
    setProgress({ loaded: 0, total: staged.reduce((s, x) => s + x.file.size, 0), percent: 0 })
    abortRef.current = new AbortController()
    try {
      // Group images by detected ratio; videos all share videoFallbackRatio.
      const batches = mediaType === 'video'
        ? [{ aspect_ratio: videoFallbackRatio, files: staged.map(s => s.file) }]
        : groupFilesByRatio(staged, '1:1')

      const result = await festivalCalendarApi.bulkUploadBatches(
        batches,
        { festival: festivalId, language: languageId, media_type: mediaType },
        {
          signal: abortRef.current.signal,
          onProgress: (loaded, total, percent) => setProgress({ loaded, total, percent }),
        },
      )

      setLastResult(result)
      if (result.failed_count === 0) {
        addToast(
          `Uploaded ${result.created_count} poster${result.created_count === 1 ? '' : 's'}` +
          (batches.length > 1 ? ` (${batches.length} ratios auto-detected)` : ''),
        )
        onUploaded()
        onClose()
      } else {
        // Partial success — keep modal open so admin can see failures + retry.
        addToast(
          `${result.created_count} uploaded · ${result.failed_count} failed`,
          'error',
        )
        // Trim staged to only the failed files so retry only sends those.
        const failedNames = new Set(result.failed.map(f => f.filename))
        setStaged(prev => prev.filter(s => failedNames.has(s.file.name)))
        // Refresh parent grid so the successful ones appear.
        onUploaded()
      }
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { detail?: string } }; message?: string; code?: string }
      if (err.code === 'ERR_CANCELED' || err.message === 'canceled') return
      const status = err.response?.status
      let msg = 'Upload failed'
      if (status === 413) msg = 'File(s) too large for server.'
      else if (err.response?.data?.detail) msg = `Upload failed: ${err.response.data.detail}`
      else if (err.message) msg = `Upload failed: ${err.message}`
      setError(msg)
    } finally {
      setUploading(false)
      abortRef.current = null
    }
  }

  // Ratio summary for the badge above the file list ("3 ratios detected").
  const ratioSummary = (() => {
    if (mediaType !== 'image' || staged.length === 0) return null
    const counts = new Map<DetectedRatio, number>()
    staged.forEach(s => {
      if (!s.ratio) return
      counts.set(s.ratio, (counts.get(s.ratio) ?? 0) + 1)
    })
    return Array.from(counts.entries())
  })()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1e1e2e] rounded-2xl w-full max-w-3xl border border-gray-700 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white">Bulk Poster Upload</h2>
          <button onClick={onClose} disabled={uploading} className="text-gray-400 hover:text-white w-8 h-8 rounded hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Festival + Date */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-gray-400">Festival</span>
              <select value={festivalId} onChange={e => setFestivalId(+e.target.value)}
                disabled={uploading || festivals.length === 1}
                className="mt-1 block w-full bg-[#2a2a3e] border border-gray-600 rounded-lg px-3 py-2 text-sm text-white disabled:opacity-60">
                {festivals.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-400">Date</span>
              <input type="text" value={date} readOnly
                className="mt-1 block w-full bg-[#2a2a3e] border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-400" />
            </label>
          </div>

          {/* Language */}
          <div>
            <div className="text-xs text-gray-400 mb-1.5">Language (applies to all files)</div>
            <div className="flex gap-2 flex-wrap">
              {languages.map(l => (
                <label key={l.id} className={
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-sm transition-colors ' +
                  (languageId === l.id
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-[#2a2a3e] border-gray-600 text-gray-300 hover:border-gray-400') +
                  (uploading ? ' opacity-60 pointer-events-none' : '')
                }>
                  <input type="radio" name="lang" checked={languageId === l.id} disabled={uploading} onChange={() => setLanguageId(l.id)} className="sr-only" />
                  <span>{l.name}</span>
                </label>
              ))}
              <label className={
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-sm transition-colors ' +
                (languageId === null
                  ? 'bg-gray-500/20 border-gray-400 text-gray-200'
                  : 'bg-[#2a2a3e] border-gray-600 text-gray-300 hover:border-gray-400') +
                (uploading ? ' opacity-60 pointer-events-none' : '')
              } title="No language tag — visible to all users">
                <input type="radio" name="lang" checked={languageId === null} disabled={uploading} onChange={() => setLanguageId(null)} className="sr-only" />
                <span>Universal</span>
              </label>
            </div>
          </div>

          {/* Media type */}
          <div>
            <div className="text-xs text-gray-400 mb-1.5">Media Type</div>
            <div className="flex gap-2">
              {(['image', 'video'] as PosterMediaType[]).map(m => (
                <label key={m} className={
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-sm transition-colors capitalize ' +
                  (mediaType === m
                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                    : 'bg-[#2a2a3e] border-gray-600 text-gray-300 hover:border-gray-400') +
                  (uploading ? ' opacity-60 pointer-events-none' : '')
                }>
                  <input type="radio" name="media" checked={mediaType === m} disabled={uploading} onChange={() => requestMediaTypeChange(m)} className="sr-only" />
                  <span>{m}</span>
                </label>
              ))}
            </div>
            {mediaType === 'image' && (
              <div className="mt-1.5 text-xs text-gray-500">
                ✨ Aspect ratio auto-detected from each image — mixed ratios upload in separate batches automatically.
              </div>
            )}
          </div>

          {/* Video-only ratio fallback (videos can't be auto-detected in browser cheaply) */}
          {mediaType === 'video' && (
            <div>
              <div className="text-xs text-gray-400 mb-1.5">Video Ratio (admin-set, applies to all videos in this batch)</div>
              <div className="flex gap-2 flex-wrap">
                {(['1:1', '4:5', '9:16', '16:9'] as DetectedRatio[]).map(r => (
                  <label key={r} className={
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-sm transition-colors ' +
                    (videoFallbackRatio === r
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-[#2a2a3e] border-gray-600 text-gray-300 hover:border-gray-400') +
                    (uploading ? ' opacity-60 pointer-events-none' : '')
                  }>
                    <input type="radio" name="vratio" checked={videoFallbackRatio === r} disabled={uploading} onChange={() => setVideoFallbackRatio(r)} className="sr-only" />
                    <span>{r === '9:16' ? 'Story (9:16)' : r}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Drag & drop */}
          <div
            onDragOver={e => { if (!uploading) { e.preventDefault(); setDragging(true) } }}
            onDragLeave={() => setDragging(false)}
            onDrop={uploading ? undefined : handleDrop}
            className={
              'border-2 border-dashed rounded-lg p-6 text-center transition-colors ' +
              (uploading
                ? 'bg-[#2a2a3e] border-gray-700 opacity-60'
                : dragging
                  ? 'bg-indigo-500/10 border-indigo-500'
                  : 'bg-[#2a2a3e] border-gray-600 hover:border-gray-400')
            }
          >
            <div className="text-3xl mb-2">📤</div>
            <div className="text-sm text-gray-300 mb-2">Drag &amp; Drop or</div>
            <label className={'inline-block px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-500 ' + (uploading ? 'pointer-events-none opacity-60' : 'cursor-pointer')}>
              Browse
              <input type="file" multiple className="hidden" disabled={uploading}
                accept={mediaType === 'image' ? 'image/*' : 'video/mp4,video/*'}
                onChange={e => pickFiles(e.target.files)} />
            </label>
            <div className="text-xs text-gray-500 mt-3">
              {mediaType === 'image' ? 'PNG/JPEG · Max 20 MB each' : 'MP4 · Max 100 MB each'}
            </div>
          </div>

          {/* Ratio summary chips (image batches will be auto-split per ratio) */}
          {ratioSummary && ratioSummary.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-gray-400">Auto-detected:</span>
              {ratioSummary.map(([r, n]) => (
                <span key={r} className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {n} × {r === '9:16' ? 'Story' : r}
                </span>
              ))}
              {ratioSummary.length > 1 && (
                <span className="text-gray-500">→ will upload as {ratioSummary.length} batches</span>
              )}
            </div>
          )}

          {/* Selected files — image grid with thumbnails OR video list */}
          {staged.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-gray-400">
                Selected files ({staged.length}) · {formatBytes(staged.reduce((s, x) => s + x.file.size, 0))}
              </div>
              {mediaType === 'image' ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-72 overflow-y-auto p-1">
                  {staged.map((s, i) => {
                    const bad = s.file.size > maxBytes || !s.file.type.startsWith('image/')
                    return (
                      <div key={i} className={
                        'relative rounded-lg overflow-hidden border ' +
                        (bad ? 'border-red-600' : 'border-gray-700')
                      }>
                        {s.previewUrl ? (
                          <img src={s.previewUrl} alt={s.file.name} className="w-full aspect-square object-cover bg-black/20" />
                        ) : (
                          <div className="w-full aspect-square bg-gray-800 flex items-center justify-center text-gray-500 text-xs">no preview</div>
                        )}
                        {/* Ratio badge (top-left) */}
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-bold text-amber-300">
                          {s.detecting ? '…' : (s.ratio ?? '?')}
                        </div>
                        {/* Remove button (top-right) */}
                        <button onClick={() => removeStaged(i)} disabled={uploading}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-red-400 hover:text-red-200 text-xs disabled:opacity-30 disabled:cursor-not-allowed">✕</button>
                        {/* Filename + size (bottom) */}
                        <div className="absolute bottom-0 left-0 right-0 px-1.5 py-0.5 bg-black/70 text-[10px] text-gray-300 truncate" title={s.file.name}>
                          {s.file.name}
                        </div>
                        {bad && (
                          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-1 py-0.5 bg-red-700/80 text-white text-[9px] text-center">
                            {s.file.size > maxBytes ? 'too large' : 'wrong type'}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <ul className="space-y-1 max-h-40 overflow-y-auto">
                  {staged.map((s, i) => {
                    const bad = s.file.size > maxBytes || !s.file.type.startsWith('video/')
                    return (
                      <li key={i} className={
                        'flex items-center justify-between text-xs px-3 py-1.5 rounded-lg border ' +
                        (bad ? 'bg-red-900/30 border-red-700 text-red-300' : 'bg-[#2a2a3e] border-gray-700 text-gray-300')
                      }>
                        <span className="truncate flex-1">🎬 {s.file.name}</span>
                        <span className="mx-3 text-gray-500">{formatBytes(s.file.size)}</span>
                        <button onClick={() => removeStaged(i)} disabled={uploading}
                          className="text-red-400 hover:text-red-200 disabled:opacity-30 disabled:cursor-not-allowed">✕</button>
                      </li>
                    )
                  })}
                </ul>
              )}
              {oversized.length > 0 && (
                <div className="text-xs text-red-400">⚠ {oversized.length} file(s) exceed the size limit and will be rejected.</div>
              )}
              {wrongType.length > 0 && (
                <div className="text-xs text-red-400">⚠ {wrongType.length} file(s) have the wrong type for {mediaType}.</div>
              )}
              {stillDetecting.length > 0 && (
                <div className="text-xs text-gray-400">…detecting {stillDetecting.length} image dimension{stillDetecting.length === 1 ? '' : 's'}…</div>
              )}
            </div>
          )}

          {/* Progress bar */}
          {uploading && progress && (
            <div className="space-y-1.5 p-3 rounded-lg bg-indigo-900/20 border border-indigo-700/40">
              <div className="flex items-center justify-between text-xs text-indigo-200">
                <span>Uploading {staged.length} file{staged.length === 1 ? '' : 's'}…</span>
                <span className="font-semibold">{progress.percent}%</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all duration-150" style={{ width: `${progress.percent}%` }} />
              </div>
              <div className="text-xs text-indigo-200/70">
                {formatBytes(progress.loaded)} of {formatBytes(progress.total)}
              </div>
            </div>
          )}

          {/* Per-file failed list (only after a partial success) */}
          {lastResult && lastResult.failed_count > 0 && !uploading && (
            <div className="p-3 rounded-lg bg-amber-900/20 border border-amber-700/40">
              <div className="text-sm font-semibold text-amber-300">
                {lastResult.created_count} uploaded · {lastResult.failed_count} failed
              </div>
              <ul className="mt-2 space-y-0.5 max-h-32 overflow-y-auto">
                {lastResult.failed.map((f, i) => (
                  <li key={i} className="text-xs text-amber-200/80 truncate" title={f.reason}>
                    ✕ <span className="font-mono">{f.filename}</span> — {f.reason}
                  </li>
                ))}
              </ul>
              <div className="text-xs text-amber-300/70 mt-2">
                The failed files are kept in the list above. Click <strong>Retry</strong> to try again.
              </div>
            </div>
          )}

          {/* Network/server error banner (full failure, no partial success) */}
          {error && !uploading && (
            <div className="p-3 rounded-lg bg-red-900/20 border border-red-700/40">
              <div className="flex items-start gap-2">
                <span className="text-red-400 text-lg leading-none">⚠</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-red-300">Upload failed</div>
                  <div className="text-xs text-red-300/80 mt-0.5 break-words">{error}</div>
                  <div className="text-xs text-red-300/70 mt-1">Your {staged.length} file{staged.length === 1 ? '' : 's'} are still selected. Click Retry below.</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-700">
          {uploading ? (
            <button onClick={cancelUpload} className="px-5 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-500">
              ✕ Cancel Upload
            </button>
          ) : (
            <>
              <button onClick={onClose} className="text-gray-400 hover:text-white px-4 py-2">Cancel</button>
              <button onClick={doUpload} disabled={!canUpload}
                className="px-5 py-2 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed">
                {(error || (lastResult && lastResult.failed_count > 0))
                  ? '🔁 Retry Upload'
                  : `⬆ Upload ${staged.length || ''} ${mediaType}${staged.length === 1 ? '' : 's'}`}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Confirm dialog — appears when admin toggles media type while files are selected */}
      {pendingMediaType && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="bg-[#1e1e2e] rounded-xl w-full max-w-sm border border-gray-700 shadow-2xl p-5">
            <h3 className="text-base font-semibold text-white mb-2">Switch to {pendingMediaType}?</h3>
            <p className="text-sm text-gray-300 mb-4">
              You have <span className="font-semibold text-amber-300">{staged.length}</span> {mediaType} file{staged.length === 1 ? '' : 's'} selected.
              Switching to <span className="font-semibold capitalize">{pendingMediaType}</span> will clear them. Continue?
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={cancelMediaTypeChange} className="px-4 py-2 text-sm rounded-lg bg-gray-700 text-white hover:bg-gray-600">Cancel</button>
              <button onClick={confirmMediaTypeChange} className="px-4 py-2 text-sm rounded-lg bg-amber-600 text-white hover:bg-amber-500">Yes, Switch</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
