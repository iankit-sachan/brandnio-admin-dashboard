import { useState, useEffect } from 'react'
import { useToast } from '../../context/ToastContext'
import { mallConfigApi } from '../../services/admin-api'

interface MallConfig {
  hero_badge_text: string
  hero_title: string
  hero_subtitle: string
  hero_image_url: string
  header_title: string
  search_placeholder: string
  info_quote: string
  updated_at: string
}

const defaultConfig: MallConfig = {
  hero_badge_text: 'Curated Excellence',
  hero_title: 'Elevate Your\nBrand Identity',
  hero_subtitle: 'The high-end editorial marketplace for professional design assets and curated brand experiences.',
  hero_image_url: '',
  header_title: 'The Chromatic Editorial',
  search_placeholder: 'Search curated services...',
  info_quote: '',
  updated_at: '',
}

export default function MallConfigPage() {
  const { addToast } = useToast()
  const [config, setConfig] = useState<MallConfig>(defaultConfig)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadConfig = () => {
    setLoading(true)
    mallConfigApi.get()
      .then((data: MallConfig) => setConfig(data))
      .catch(() => addToast('Failed to load mall config', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadConfig() }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await mallConfigApi.update(config)
      setConfig(updated)
      addToast('Brand Mall config updated successfully')
    } catch {
      addToast('Failed to save config', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading config...</div>

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Brand Mall Config</h1>
      <p className="text-sm text-gray-500">Controls the Brand Mall hero banner, header, and global settings. Changes reflect instantly in the app.</p>

      {/* Header */}
      <fieldset className="border border-gray-200 rounded-lg p-4 space-y-3">
        <legend className="text-sm font-semibold text-gray-700 px-2">Header</legend>
        <label className="block">
          <span className="text-xs text-gray-600">Header Title</span>
          <input type="text" className="mt-1 block w-full border rounded px-3 py-2 text-sm" value={config.header_title}
            onChange={e => setConfig({ ...config, header_title: e.target.value })} />
        </label>
      </fieldset>

      {/* Hero Banner */}
      <fieldset className="border border-gray-200 rounded-lg p-4 space-y-3">
        <legend className="text-sm font-semibold text-gray-700 px-2">Hero Banner</legend>
        <label className="block">
          <span className="text-xs text-gray-600">Badge Text</span>
          <input type="text" className="mt-1 block w-full border rounded px-3 py-2 text-sm" value={config.hero_badge_text}
            onChange={e => setConfig({ ...config, hero_badge_text: e.target.value })} />
        </label>
        <label className="block">
          <span className="text-xs text-gray-600">Hero Title (use \n for line break)</span>
          <textarea rows={3} className="mt-1 block w-full border rounded px-3 py-2 text-sm" value={config.hero_title}
            onChange={e => setConfig({ ...config, hero_title: e.target.value })} />
        </label>
        <label className="block">
          <span className="text-xs text-gray-600">Hero Subtitle</span>
          <textarea rows={3} className="mt-1 block w-full border rounded px-3 py-2 text-sm" value={config.hero_subtitle}
            onChange={e => setConfig({ ...config, hero_subtitle: e.target.value })} />
        </label>
        <label className="block">
          <span className="text-xs text-gray-600">Hero Image URL (optional)</span>
          <input type="text" className="mt-1 block w-full border rounded px-3 py-2 text-sm" value={config.hero_image_url}
            onChange={e => setConfig({ ...config, hero_image_url: e.target.value })} />
        </label>
      </fieldset>

      {/* Search */}
      <fieldset className="border border-gray-200 rounded-lg p-4 space-y-3">
        <legend className="text-sm font-semibold text-gray-700 px-2">Search</legend>
        <label className="block">
          <span className="text-xs text-gray-600">Search Placeholder</span>
          <input type="text" className="mt-1 block w-full border rounded px-3 py-2 text-sm" value={config.search_placeholder}
            onChange={e => setConfig({ ...config, search_placeholder: e.target.value })} />
        </label>
      </fieldset>

      {/* Info Quote */}
      <fieldset className="border border-gray-200 rounded-lg p-4 space-y-3">
        <legend className="text-sm font-semibold text-gray-700 px-2">Service Detail</legend>
        <label className="block">
          <span className="text-xs text-gray-600">Info Quote (shown on service detail screen)</span>
          <textarea rows={3} className="mt-1 block w-full border rounded px-3 py-2 text-sm" value={config.info_quote}
            onChange={e => setConfig({ ...config, info_quote: e.target.value })} />
        </label>
      </fieldset>

      <div className="flex gap-3">
        <button onClick={handleSave} disabled={saving}
          className="px-6 py-2 bg-amber-700 text-white rounded-lg font-medium hover:bg-amber-800 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Config'}
        </button>
        <button onClick={loadConfig} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Reset</button>
      </div>

      {config.updated_at && (
        <p className="text-xs text-gray-400">Last updated: {new Date(config.updated_at).toLocaleString()}</p>
      )}
    </div>
  )
}
