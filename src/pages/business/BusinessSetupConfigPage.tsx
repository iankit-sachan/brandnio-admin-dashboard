import { useState, useEffect } from 'react'
import { useToast } from '../../context/ToastContext'
import { businessSetupConfigSingletonApi } from '../../services/admin-api'

interface BusinessSetupConfig {
  id?: number
  hero_title: string
  hero_subtitle: string
  badge_text: string
  visibility_label: string
  visibility_description: string
  html_enabled: boolean
  updated_at?: string
}

const defaultConfig: BusinessSetupConfig = {
  hero_title: '',
  hero_subtitle: '',
  badge_text: '',
  visibility_label: '',
  visibility_description: '',
  html_enabled: false,
}

export default function BusinessSetupConfigPage() {
  const { addToast } = useToast()
  const [config, setConfig] = useState<BusinessSetupConfig>(defaultConfig)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const loadConfig = () => {
    setLoading(true)
    setLoadError(false)
    businessSetupConfigSingletonApi.get()
      .then((data: BusinessSetupConfig) => setConfig(data))
      .catch(() => {
        setLoadError(true)
        addToast('Failed to load business setup config', 'error')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadConfig() }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await businessSetupConfigSingletonApi.update(config)
      setConfig(updated)
      addToast('Business setup config updated successfully')
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
      <h1 className="text-2xl font-bold text-brand-text">Business Setup Config</h1>

      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Hero Title</label>
          <input type="text" value={config.hero_title} onChange={e => setConfig(c => ({ ...c, hero_title: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Hero Subtitle</label>
          <textarea value={config.hero_subtitle} onChange={e => setConfig(c => ({ ...c, hero_subtitle: e.target.value }))} rows={2} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Badge Text</label>
          <input type="text" value={config.badge_text} onChange={e => setConfig(c => ({ ...c, badge_text: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Visibility Label</label>
            <input type="text" value={config.visibility_label} onChange={e => setConfig(c => ({ ...c, visibility_label: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Visibility Description</label>
            <input type="text" value={config.visibility_description} onChange={e => setConfig(c => ({ ...c, visibility_description: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" checked={config.html_enabled} onChange={e => setConfig(c => ({ ...c, html_enabled: e.target.checked }))} className="rounded" />
          <label className="text-sm text-brand-text-muted">HTML Enabled</label>
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
