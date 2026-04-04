import { useState, useEffect } from 'react'
import { useToast } from '../../context/ToastContext'
import { feedConfigApi } from '../../services/admin-api'
import type { FeedConfig } from '../../types'

const defaultConfig: FeedConfig = {
  max_trending_items: 10,
  max_inspiration_items: 10,
  trending_grid_columns: 2,
  categories: [],
  enable_search: true,
  enable_favorites: true,
  enable_editors_choice: true,
  updated_at: '',
}

export default function FeedConfigPage() {
  const { addToast } = useToast()
  const [config, setConfig] = useState<FeedConfig>(defaultConfig)
  const [categoriesText, setCategoriesText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const loadConfig = () => {
    setLoading(true)
    setLoadError(false)
    feedConfigApi.get()
      .then((data: FeedConfig) => {
        setConfig(data)
        setCategoriesText((data.categories || []).join(', '))
      })
      .catch(() => {
        setLoadError(true)
        addToast('Failed to load feed config', 'error')
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
        categories: categoriesText.split(',').map(s => s.trim()).filter(Boolean),
      }
      const updated = await feedConfigApi.update(payload)
      setConfig(updated)
      setCategoriesText((updated.categories || []).join(', '))
      addToast('Feed config updated successfully')
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
      <h1 className="text-2xl font-bold text-brand-text">Feed Config</h1>

      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Max Trending Items</label>
            <input type="number" value={config.max_trending_items} onChange={e => setConfig(c => ({ ...c, max_trending_items: Number(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Max Inspiration Items</label>
            <input type="number" value={config.max_inspiration_items} onChange={e => setConfig(c => ({ ...c, max_inspiration_items: Number(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Trending Grid Columns</label>
          <input type="number" value={config.trending_grid_columns} onChange={e => setConfig(c => ({ ...c, trending_grid_columns: Number(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Categories (comma-separated)</label>
          <input value={categoriesText} onChange={e => setCategoriesText(e.target.value)} placeholder="e.g. Business, Festival, Social" className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          <p className="text-xs text-brand-text-muted/60 mt-1">Comma-separated list of feed categories</p>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-brand-text-muted">Feature Toggles</label>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={config.enable_search} onChange={e => setConfig(c => ({ ...c, enable_search: e.target.checked }))} className="rounded" />
            <label className="text-sm text-brand-text-muted">Enable Search</label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={config.enable_favorites} onChange={e => setConfig(c => ({ ...c, enable_favorites: e.target.checked }))} className="rounded" />
            <label className="text-sm text-brand-text-muted">Enable Favorites</label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={config.enable_editors_choice} onChange={e => setConfig(c => ({ ...c, enable_editors_choice: e.target.checked }))} className="rounded" />
            <label className="text-sm text-brand-text-muted">Enable Editor's Choice</label>
          </div>
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
