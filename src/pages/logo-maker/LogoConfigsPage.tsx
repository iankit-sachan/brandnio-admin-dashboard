import { useState, useEffect } from 'react'
import { useToast } from '../../context/ToastContext'
import { logoConfigsSingletonApi } from '../../services/admin-api'

interface LogoConfig {
  id?: number
  hero_title: string
  hero_description: string
  generate_button_text: string
  footer_text: string
  palette_label: string
  direction_label: string
  credit_cost: number
  default_prompt_suffix: string
  is_active: boolean
  updated_at?: string
}

const defaultConfig: LogoConfig = {
  hero_title: '',
  hero_description: '',
  generate_button_text: '',
  footer_text: '',
  palette_label: '',
  direction_label: '',
  credit_cost: 3,
  default_prompt_suffix: '',
  is_active: true,
}

export default function LogoConfigsPage() {
  const { addToast } = useToast()
  const [config, setConfig] = useState<LogoConfig>(defaultConfig)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const loadConfig = () => {
    setLoading(true)
    setLoadError(false)
    logoConfigsSingletonApi.get()
      .then((data: LogoConfig) => setConfig(data))
      .catch(() => {
        setLoadError(true)
        addToast('Failed to load logo config', 'error')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadConfig() }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await logoConfigsSingletonApi.update(config)
      setConfig(updated)
      addToast('Logo config updated successfully')
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
      <h1 className="text-2xl font-bold text-brand-text">Logo Config</h1>

      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Hero Title</label>
            <input type="text" value={config.hero_title} onChange={e => setConfig(c => ({ ...c, hero_title: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Generate Button Text</label>
            <input type="text" value={config.generate_button_text} onChange={e => setConfig(c => ({ ...c, generate_button_text: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Hero Description</label>
          <textarea value={config.hero_description} onChange={e => setConfig(c => ({ ...c, hero_description: e.target.value }))} rows={2} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Footer Text</label>
            <input type="text" value={config.footer_text} onChange={e => setConfig(c => ({ ...c, footer_text: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Credit Cost</label>
            <input type="number" value={config.credit_cost} onChange={e => setConfig(c => ({ ...c, credit_cost: Number(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Palette Label</label>
            <input type="text" value={config.palette_label} onChange={e => setConfig(c => ({ ...c, palette_label: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Direction Label</label>
            <input type="text" value={config.direction_label} onChange={e => setConfig(c => ({ ...c, direction_label: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Default Prompt Suffix</label>
          <textarea value={config.default_prompt_suffix} onChange={e => setConfig(c => ({ ...c, default_prompt_suffix: e.target.value }))} rows={3} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" checked={config.is_active} onChange={e => setConfig(c => ({ ...c, is_active: e.target.checked }))} className="rounded" />
          <label className="text-sm text-brand-text-muted">Active</label>
        </div>

        {config.updated_at && (
          <p className="text-xs text-brand-text-muted/60">Last updated: {new Date(config.updated_at).toLocaleString()}</p>
        )}

        <div className="flex justify-end pt-2">
          <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Config'}
          </button>
        </div>
      </div>
    </div>
  )
}
