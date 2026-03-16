import { useRef } from 'react'
import { Upload, X, FileAudio, File as FileIcon } from 'lucide-react'

interface Props {
  label: string
  value: string | null
  onChange: (url: string | null) => void
  accept?: string
  fileName?: string
}

export function FileUpload({ label, value, onChange, accept = '*/*', fileName }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Revoke previous object URL to prevent memory leak
      if (value && value.startsWith('blob:')) {
        URL.revokeObjectURL(value)
      }
      const url = URL.createObjectURL(file)
      onChange(url)
    }
  }

  const isAudio = accept.includes('audio')

  return (
    <div>
      <label className="block text-sm font-medium text-brand-text-muted mb-1.5">{label}</label>
      {value ? (
        <div className="flex items-center gap-3 p-3 bg-brand-dark border border-brand-dark-border rounded-lg">
          {isAudio ? <FileAudio className="h-5 w-5 text-brand-gold shrink-0" /> : <FileIcon className="h-5 w-5 text-brand-gold shrink-0" />}
          <span className="text-sm text-brand-text truncate flex-1">{fileName || 'File uploaded'}</span>
          <button type="button" onClick={() => fileRef.current?.click()} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-gold transition-colors">
            <Upload className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => { if (value?.startsWith('blob:')) URL.revokeObjectURL(value); onChange(null) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-status-error transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-brand-dark-border rounded-lg hover:border-brand-gold/50 bg-brand-dark transition-colors cursor-pointer"
        >
          <Upload className="h-5 w-5 text-brand-text-muted" />
          <span className="text-sm text-brand-text-muted">Choose file</span>
        </button>
      )}
      <input ref={fileRef} type="file" accept={accept} onChange={handleFileChange} className="hidden" />
    </div>
  )
}
