import { useEffect, useState } from 'react'
import { festivalCalendarApi, languagesApi } from '../../services/admin-api'
import { useToast } from '../../context/ToastContext'
import type { Language, PosterAspectRatio, PosterMediaType } from '../../types/festival.types'
import type { Festival } from '../../types/festival.types'

interface Props {
  date: string                // YYYY-MM-DD
  festivals: Festival[]       // all festivals on this date
  onClose: () => void
  onUploaded: () => void
}

const RATIOS: PosterAspectRatio[] = ['1:1', '4:5', '9:16']
const RATIO_LABEL: Record<PosterAspectRatio, string> = {
  '1:1': '1:1', '4:5': '4:5', '9:16': 'Story', '16:9': '16:9',
}

const IMG_MAX = 20 * 1024 * 1024
const VID_MAX = 100 * 1024 * 1024

function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export default function BulkFestivalPosterUploadModal({ date, festivals, onClose, onUploaded }: Props) {
  const { addToast } = useToast()
  const [languages, setLanguages] = useState<Language[]>([])
  const [festivalId, setFestivalId] = useState<number>(festivals[0]?.id ?? 0)
  const [languageId, setLanguageId] = useState<number | null>(null)
  const [aspectRatio, setAspectRatio] = useState<PosterAspectRatio>('1:1')
  const [mediaType, setMediaType] = useState<PosterMediaType>('image')
  const [files, setFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    languagesApi.list({ is_active: 'true' }).then((rows) => {
      const list = rows as Language[]
      setLanguages(list)
      if (list.length && languageId == null) setLanguageId(list[0].id)
    })
  }, [])

  const maxBytes = mediaType === 'video' ? VID_MAX : IMG_MAX
  const oversized = files.filter(f => f.size > maxBytes)
  const wrongType = files.filter(f => {
    if (mediaType === 'image') return !f.type.startsWith('image/')
    return !f.type.startsWith('video/')
  })

  const pickFiles = (list: FileList | null) => {
    if (!list) return
    setFiles([...files, ...Array.from(list)])
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    pickFiles(e.dataTransfer.files)
  }

  const removeFile = (i: number) => setFiles(files.filter((_, idx) => idx !== i))

  const canUpload = festivalId && files.length > 0 && oversized.length === 0 && wrongType.length === 0 && !uploading

  const doUpload = async () => {
    if (!canUpload) return
    setUploading(true)
    try {
      const res = await festivalCalendarApi.bulkUpload({
        festival: festivalId,
        language: languageId,
        aspect_ratio: aspectRatio,
        media_type: mediaType,
        files,
      })
      addToast(`Uploaded ${res.created_count} poster${res.created_count === 1 ? '' : 's'}`)
      onUploaded()
      onClose()
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { detail?: string } } }
      const status = err.response?.status
      if (status === 413) addToast('File(s) too large for server.', 'error')
      else addToast('Upload failed: ' + (err.response?.data?.detail || 'unknown error'), 'error')
    } finally { setUploading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1e1e2e] rounded-2xl w-full max-w-2xl border border-gray-700 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white">Bulk Poster Upload</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white w-8 h-8 rounded hover:bg-gray-800">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Festival + Date */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-gray-400">Festival</span>
              <select value={festivalId} onChange={e => setFestivalId(+e.target.value)}
                className="mt-1 block w-full bg-[#2a2a3e] border border-gray-600 rounded-lg px-3 py-2 text-sm text-white">
                {festivals.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-400">Date</span>
              <input type="text" value={date} readOnly
                className="mt-1 block w-full bg-[#2a2a3e] border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-400" />
            </label>
          </div>

          {/* Language — radio (single-select per batch, per system design) */}
          <div>
            <div className="text-xs text-gray-400 mb-1.5">Language</div>
            <div className="flex gap-2 flex-wrap">
              {languages.map(l => (
                <label key={l.id} className={
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-sm transition-colors ' +
                  (languageId === l.id
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-[#2a2a3e] border-gray-600 text-gray-300 hover:border-gray-400')
                }>
                  <input type="radio" name="lang" checked={languageId === l.id}
                    onChange={() => setLanguageId(l.id)} className="sr-only" />
                  <span>{l.name}</span>
                </label>
              ))}
              <label className={
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-sm transition-colors ' +
                (languageId === null
                  ? 'bg-gray-500/20 border-gray-400 text-gray-200'
                  : 'bg-[#2a2a3e] border-gray-600 text-gray-300 hover:border-gray-400')
              } title="No language — visible to all users">
                <input type="radio" name="lang" checked={languageId === null}
                  onChange={() => setLanguageId(null)} className="sr-only" />
                <span>Universal</span>
              </label>
            </div>
          </div>

          {/* Size — radio */}
          <div>
            <div className="text-xs text-gray-400 mb-1.5">Size</div>
            <div className="flex gap-2 flex-wrap">
              {RATIOS.map(r => (
                <label key={r} className={
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-sm transition-colors ' +
                  (aspectRatio === r
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-[#2a2a3e] border-gray-600 text-gray-300 hover:border-gray-400')
                }>
                  <input type="radio" name="ratio" checked={aspectRatio === r}
                    onChange={() => setAspectRatio(r)} className="sr-only" />
                  <span>{RATIO_LABEL[r]}</span>
                </label>
              ))}
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
                    : 'bg-[#2a2a3e] border-gray-600 text-gray-300 hover:border-gray-400')
                }>
                  <input type="radio" name="media" checked={mediaType === m}
                    onChange={() => { setMediaType(m); setFiles([]) }} className="sr-only" />
                  <span>{m}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Drag & drop */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={
              'border-2 border-dashed rounded-lg p-6 text-center transition-colors ' +
              (dragging ? 'bg-indigo-500/10 border-indigo-500' : 'bg-[#2a2a3e] border-gray-600 hover:border-gray-400')
            }
          >
            <div className="text-3xl mb-2">📤</div>
            <div className="text-sm text-gray-300 mb-2">Drag &amp; Drop or</div>
            <label className="inline-block px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm cursor-pointer hover:bg-indigo-500">
              Browse
              <input type="file" multiple className="hidden"
                accept={mediaType === 'image' ? 'image/*' : 'video/mp4,video/*'}
                onChange={e => pickFiles(e.target.files)} />
            </label>
            <div className="text-xs text-gray-500 mt-3">
              {mediaType === 'image' ? 'PNG/JPEG · Max 20 MB each' : 'MP4 · Max 100 MB each'}
            </div>
          </div>

          {files.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs text-gray-400">Selected files ({files.length})</div>
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {files.map((f, i) => {
                  const bad = f.size > maxBytes || (mediaType === 'image' ? !f.type.startsWith('image/') : !f.type.startsWith('video/'))
                  return (
                    <li key={i} className={
                      'flex items-center justify-between text-xs px-3 py-1.5 rounded-lg border ' +
                      (bad ? 'bg-red-900/30 border-red-700 text-red-300' : 'bg-[#2a2a3e] border-gray-700 text-gray-300')
                    }>
                      <span className="truncate flex-1">{f.name}</span>
                      <span className="mx-3 text-gray-500">{formatBytes(f.size)}</span>
                      <button onClick={() => removeFile(i)} className="text-red-400 hover:text-red-200">✕</button>
                    </li>
                  )
                })}
              </ul>
              {oversized.length > 0 && (
                <div className="text-xs text-red-400">⚠ {oversized.length} file(s) exceed the size limit and will be rejected.</div>
              )}
              {wrongType.length > 0 && (
                <div className="text-xs text-red-400">⚠ {wrongType.length} file(s) have the wrong type for {mediaType}.</div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-700">
          <button onClick={onClose} className="text-gray-400 hover:text-white px-4 py-2">Cancel</button>
          <button onClick={doUpload} disabled={!canUpload}
            className="px-5 py-2 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed">
            {uploading ? 'Uploading…' : `⬆ Upload ${files.length || ''} Poster${files.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  )
}
