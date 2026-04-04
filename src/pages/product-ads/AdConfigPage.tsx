import { useState, useEffect } from 'react'
import { useToast } from '../../context/ToastContext'
import { adConfigApi } from '../../services/admin-api'
import type { ProductAdConfig } from '../../types'

const defaultConfig: ProductAdConfig = {
  max_image_size_mb: 10,
  supported_formats: ['PNG', 'JPG', 'WEBP'],
  poll_timeout_seconds: 30,
  poll_interval_seconds: 2,
  grid_columns: 2,
  max_recent_count: 6,
  credits_per_ad: 1,
  currency_symbol: '₹',
  download_folder: 'Pictures/Brandnio',
  filename_prefix: 'Brandnio_ProductAd_',
  aspect_ratio_choices: ['1:1', '4:5', '9:16', '16:9'],
  updated_at: '',
}

export default function AdConfigPage() {
  const { addToast } = useToast()
  const [config, setConfig] = useState<ProductAdConfig>(defaultConfig)
  const [formatsText, setFormatsText] = useState('')
  const [aspectRatioText, setAspectRatioText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const loadConfig = () => {
    setLoading(true)
    setLoadError(false)
    adConfigApi.get()
      .then((data: ProductAdConfig) => {
        setConfig(data)
        setFormatsText((data.supported_formats || []).join(', '))
        setAspectRatioText((data.aspect_ratio_choices || []).join(', '))
      })
      .catch(() => {
        setLoadError(true)
        addToast('Failed to load ad config', 'error')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadConfig()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        ...config,
        supported_formats: formatsText.split(',').map(l => l.trim()).filter(Boolean),
        aspect_ratio_choices: aspectRatioText.split(',').map(s => s.trim()).filter(Boolean),
      }
      const updated = await adConfigApi.update(payload)
      setConfig(updated)
      setFormatsText((updated.supported_formats || []).join(', '))
      setAspectRatioText((updated.aspect_ratio_choices || []).join(', '))
      addToast('Ad config updated successfully')
    } catch {
      addToast('Failed to save config. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-brand-text-muted">Loading configuration...</div>
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-status-error">Failed to load configuration</p>
        <button onClick={loadConfig} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-brand-text">Ad Config</h1>

      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Max Image Size (MB)</label>
            <input type="number" value={config.max_image_size_mb} onChange={e => setConfig(c => ({ ...c, max_image_size_mb: Number(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Credits Per Ad</label>
            <input type="number" value={config.credits_per_ad} onChange={e => setConfig(c => ({ ...c, credits_per_ad: Number(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Poll Timeout (seconds)</label>
            <input type="number" value={config.poll_timeout_seconds} onChange={e => setConfig(c => ({ ...c, poll_timeout_seconds: Number(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Poll Interval (seconds)</label>
            <input type="number" value={config.poll_interval_seconds} onChange={e => setConfig(c => ({ ...c, poll_interval_seconds: Number(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Grid Columns</label>
            <input type="number" value={config.grid_columns} onChange={e => setConfig(c => ({ ...c, grid_columns: Number(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Max Recent Count</label>
            <input type="number" value={config.max_recent_count} onChange={e => setConfig(c => ({ ...c, max_recent_count: Number(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Currency Symbol</label>
            <input value={config.currency_symbol} onChange={e => setConfig(c => ({ ...c, currency_symbol: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Filename Prefix</label>
            <input value={config.filename_prefix} onChange={e => setConfig(c => ({ ...c, filename_prefix: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Download Folder</label>
          <input value={config.download_folder} onChange={e => setConfig(c => ({ ...c, download_folder: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Supported Formats (comma-separated)</label>
          <input value={formatsText} onChange={e => setFormatsText(e.target.value)} placeholder="e.g. jpg, png, webp" className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Aspect Ratio Choices (comma-separated)</label>
          <input value={aspectRatioText} onChange={e => setAspectRatioText(e.target.value)} placeholder="e.g. 1:1, 4:5, 9:16, 16:9" className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          <p className="text-xs text-brand-text-muted/60 mt-1">Comma-separated aspect ratios for ad templates</p>
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Config'}
          </button>
        </div>
      </div>
    </div>
  )
}
