import { useState, useEffect } from 'react'
import { useToast } from '../../context/ToastContext'
import { collageConfigSingletonApi } from '../../services/admin-api'

interface CollageConfig {
  id?: number
  default_spacing: number
  min_spacing: number
  max_spacing: number
  spacing_step: number
  cell_corner_radius: number
  export_quality: number
  export_format: string
  canvas_bg_color: string
  cell_empty_color: string
  cell_border_color: string
  plus_icon_color: string
  cell_border_width: number
  plus_icon_size: number
  max_layouts_shown: number
  grid_columns: number
  updated_at?: string
}

const defaultConfig: CollageConfig = {
  default_spacing: 4,
  min_spacing: 0,
  max_spacing: 20,
  spacing_step: 1,
  cell_corner_radius: 8,
  export_quality: 95,
  export_format: 'JPEG',
  canvas_bg_color: '#E6E3D3',
  cell_empty_color: '#DEDAD0',
  cell_border_color: '#D0CBB8',
  plus_icon_color: '#8A7E6E',
  cell_border_width: 1.5,
  plus_icon_size: 14.0,
  max_layouts_shown: 4,
  grid_columns: 4,
}

export default function CollageConfigPage() {
  const { addToast } = useToast()
  const [config, setConfig] = useState<CollageConfig>(defaultConfig)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const loadConfig = () => {
    setLoading(true)
    setLoadError(false)
    collageConfigSingletonApi.get()
      .then((data: CollageConfig) => setConfig(data))
      .catch(() => {
        setLoadError(true)
        addToast('Failed to load collage config', 'error')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadConfig() }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await collageConfigSingletonApi.update(config)
      setConfig(updated)
      addToast('Collage config updated successfully')
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

  const numField = (label: string, key: keyof CollageConfig, step?: number) => (
    <div>
      <label className="block text-sm font-medium text-brand-text-muted mb-1.5">{label}</label>
      <input type="number" step={step} value={config[key] as number} onChange={e => setConfig(c => ({ ...c, [key]: Number(e.target.value) }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
    </div>
  )

  const colorField = (label: string, key: keyof CollageConfig) => (
    <div>
      <label className="block text-sm font-medium text-brand-text-muted mb-1.5">{label}</label>
      <div className="flex items-center gap-3">
        <input type="color" value={config[key] as string} onChange={e => setConfig(c => ({ ...c, [key]: e.target.value }))} className="w-10 h-10 rounded border border-brand-dark-border cursor-pointer" />
        <input type="text" value={config[key] as string} onChange={e => setConfig(c => ({ ...c, [key]: e.target.value }))} className="flex-1 bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
      </div>
    </div>
  )

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-brand-text">Collage Config</h1>

      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 p-6 space-y-5">
        {/* Spacing */}
        <h2 className="text-sm font-semibold text-brand-gold uppercase tracking-wider">Spacing</h2>
        <div className="grid grid-cols-4 gap-4">
          {numField('Default Spacing', 'default_spacing')}
          {numField('Min Spacing', 'min_spacing')}
          {numField('Max Spacing', 'max_spacing')}
          {numField('Spacing Step', 'spacing_step')}
        </div>

        {/* Layout & Export */}
        <h2 className="text-sm font-semibold text-brand-gold uppercase tracking-wider pt-2">Layout & Export</h2>
        <div className="grid grid-cols-4 gap-4">
          {numField('Cell Corner Radius', 'cell_corner_radius')}
          {numField('Export Quality', 'export_quality')}
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Export Format</label>
            <select value={config.export_format} onChange={e => setConfig(c => ({ ...c, export_format: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
              <option value="JPEG">JPEG</option>
              <option value="PNG">PNG</option>
              <option value="WEBP">WEBP</option>
            </select>
          </div>
          {numField('Grid Columns', 'grid_columns')}
        </div>

        <div className="grid grid-cols-3 gap-4">
          {numField('Cell Border Width', 'cell_border_width', 0.5)}
          {numField('Plus Icon Size', 'plus_icon_size', 0.5)}
          {numField('Max Layouts Shown', 'max_layouts_shown')}
        </div>

        {/* Colors */}
        <h2 className="text-sm font-semibold text-brand-gold uppercase tracking-wider pt-2">Colors</h2>
        <div className="grid grid-cols-2 gap-4">
          {colorField('Canvas Background', 'canvas_bg_color')}
          {colorField('Cell Empty Color', 'cell_empty_color')}
          {colorField('Cell Border Color', 'cell_border_color')}
          {colorField('Plus Icon Color', 'plus_icon_color')}
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
