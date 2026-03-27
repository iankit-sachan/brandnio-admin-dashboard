import { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { cn } from '../../utils/cn'
import { uploadApi } from '../../services/admin-api'

interface Props {
  label: string
  value: string | null
  onChange: (url: string | null) => void
  accept?: string
  className?: string
  aspectHint?: string
}

export function ImageUpload({ label, value, onChange, accept = 'image/*', className, aspectHint }: Props) {
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB — matches backend limit

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed')
      return
    }
    if (file.type === 'image/svg+xml') {
      setError('SVG files are not allowed')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 10 MB.`)
      return
    }
    setUploading(true)
    setError(null)
    try {
      const url = await uploadApi.upload(file)
      onChange(url)
    } catch {
      setError('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-brand-text-muted mb-1.5">{label}</label>
      {value ? (
        <div className="relative group">
          <img
            src={value}
            alt={label}
            className="w-full h-40 object-contain bg-neutral-900 rounded-lg border border-brand-dark-border"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="p-2 bg-brand-dark-card rounded-lg text-brand-text hover:text-brand-gold transition-colors"
            >
              <Upload className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="p-2 bg-brand-dark-card rounded-lg text-brand-text hover:text-status-error transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !uploading && fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            'flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
            uploading
              ? 'border-brand-gold bg-brand-gold/5 cursor-wait'
              : dragOver
                ? 'border-brand-gold bg-brand-gold/5'
                : 'border-brand-dark-border hover:border-brand-gold/50 bg-brand-dark',
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 text-brand-gold mb-2 animate-spin" />
              <p className="text-sm text-brand-text-muted">Uploading...</p>
            </>
          ) : (
            <>
              <ImageIcon className="h-8 w-8 text-brand-text-muted mb-2" />
              <p className="text-sm text-brand-text-muted">Click or drag to upload</p>
              {aspectHint && <p className="text-xs text-brand-text-muted/60 mt-1">{aspectHint}</p>}
              {error && <p className="text-xs text-status-error mt-1">{error}</p>}
            </>
          )}
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}
