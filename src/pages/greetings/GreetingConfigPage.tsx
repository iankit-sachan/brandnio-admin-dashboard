import { useState, useEffect } from 'react'
import { useToast } from '../../context/ToastContext'
import { greetingConfigApi } from '../../services/admin-api'
import type { GreetingConfig } from '../../types'

const defaultConfig: GreetingConfig = {
  canvas_width: 1080,
  canvas_height: 1080,
  upcoming_event_days: 7,
  grid_columns: 3,
  page_size: 20,
  supported_languages: [],
  date_format: 'DD/MM/YYYY',
}

export default function GreetingConfigPage() {
  const { addToast } = useToast()
  const [config, setConfig] = useState<GreetingConfig>(defaultConfig)
  const [languagesText, setLanguagesText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    greetingConfigApi.get()
      .then((data: GreetingConfig) => {
        setConfig(data)
        setLanguagesText((data.supported_languages || []).join(', '))
      })
      .catch(() => addToast('Failed to load greeting config', 'error'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        ...config,
        supported_languages: languagesText.split(',').map(l => l.trim()).filter(Boolean),
      }
      const updated = await greetingConfigApi.update(payload)
      setConfig(updated)
      setLanguagesText((updated.supported_languages || []).join(', '))
      addToast('Greeting config updated successfully')
    } catch {
      addToast('Failed to save config. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-brand-text-muted">Loading...</div>
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-brand-text">Greeting Config</h1>

      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Canvas Width</label>
            <input type="number" value={config.canvas_width} onChange={e => setConfig(c => ({ ...c, canvas_width: Number(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Canvas Height</label>
            <input type="number" value={config.canvas_height} onChange={e => setConfig(c => ({ ...c, canvas_height: Number(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Upcoming Event Days</label>
            <input type="number" value={config.upcoming_event_days} onChange={e => setConfig(c => ({ ...c, upcoming_event_days: Number(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Grid Columns</label>
            <input type="number" value={config.grid_columns} onChange={e => setConfig(c => ({ ...c, grid_columns: Number(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Page Size</label>
            <input type="number" value={config.page_size} onChange={e => setConfig(c => ({ ...c, page_size: Number(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Date Format</label>
            <input value={config.date_format} onChange={e => setConfig(c => ({ ...c, date_format: e.target.value }))} placeholder="DD/MM/YYYY" className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Supported Languages (comma-separated)</label>
          <input value={languagesText} onChange={e => setLanguagesText(e.target.value)} placeholder="e.g. English, Hindi, Gujarati, Marathi" className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
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
