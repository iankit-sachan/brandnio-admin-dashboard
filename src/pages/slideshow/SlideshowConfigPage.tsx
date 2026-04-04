import { useState, useEffect } from 'react'
import { useToast } from '../../context/ToastContext'
import { slideshowConfigApi } from '../../services/admin-api'
import type { SlideshowConfig, TransitionDef } from '../../types/slideshow.types'

const defaultConfig: SlideshowConfig = {
  output_width: 1080,
  output_height: 1080,
  fps: 30,
  bitrate: 4000000,
  iframe_interval: 1,
  transition_duration_frames: 15,
  quality_label: '1080p HD • 30fps • H.264',
  min_duration_seconds: 0.5,
  max_duration_seconds: 5.0,
  default_duration_seconds: 2.0,
  duration_step_seconds: 0.5,
  duration_presets: [0.5, 1.5, 2.0, 3.5, 5.0],
  transitions: [
    { id: 'fade', name: 'Fade', icon: 'blur_on', sort_order: 0 },
    { id: 'slide', name: 'Slide', icon: 'trending_flat', sort_order: 1 },
    { id: 'zoom', name: 'Zoom', icon: 'zoom_in', sort_order: 2 },
  ],
  default_transition: 'fade',
  max_images: 12,
  min_images: 2,
  max_image_dimension: 1080,
  thumbnail_size: 192,
  download_folder: 'Movies/Brandnio',
  filename_prefix: 'Brandnio_Cinematic_',
  credits_per_video: 0,
  updated_at: '',
}

export default function SlideshowConfigPage() {
  const { addToast } = useToast()
  const [config, setConfig] = useState<SlideshowConfig>(defaultConfig)
  const [presetsText, setPresetsText] = useState('')
  const [transitionsText, setTransitionsText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const loadConfig = () => {
    setLoading(true)
    setLoadError(false)
    slideshowConfigApi.get()
      .then((data: SlideshowConfig) => {
        setConfig(data)
        setPresetsText((data.duration_presets || []).join(', '))
        setTransitionsText(JSON.stringify(data.transitions || [], null, 2))
      })
      .catch(() => {
        setLoadError(true)
        addToast('Failed to load slideshow config', 'error')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadConfig() }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      let parsedTransitions: TransitionDef[]
      try {
        parsedTransitions = JSON.parse(transitionsText)
      } catch {
        addToast('Invalid transitions JSON format', 'error')
        setSaving(false)
        return
      }

      const payload = {
        ...config,
        duration_presets: presetsText.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n)),
        transitions: parsedTransitions,
      }

      const updated = await slideshowConfigApi.update(payload)
      setConfig(updated)
      setPresetsText((updated.duration_presets || []).join(', '))
      setTransitionsText(JSON.stringify(updated.transitions || [], null, 2))
      addToast('Slideshow config updated successfully')
    } catch {
      addToast('Failed to save config. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading config...</div>
  if (loadError) return (
    <div className="p-8 text-center">
      <p className="text-red-500 mb-4">Failed to load config</p>
      <button onClick={loadConfig} className="px-4 py-2 bg-blue-600 text-white rounded">Retry</button>
    </div>
  )

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Slideshow Config (Image to Video)</h1>
      <p className="text-sm text-gray-500">Controls the Cinematic Studio feature in the Android app. Changes take effect on next app launch.</p>

      {/* Video Encoding */}
      <fieldset className="border border-gray-200 rounded-lg p-4 space-y-3">
        <legend className="text-sm font-semibold text-gray-700 px-2">Video Encoding</legend>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-gray-600">Output Width (px)</span>
            <input type="number" className="mt-1 block w-full border rounded px-3 py-2 text-sm" value={config.output_width}
              onChange={e => setConfig({ ...config, output_width: +e.target.value })} />
          </label>
          <label className="block">
            <span className="text-xs text-gray-600">Output Height (px)</span>
            <input type="number" className="mt-1 block w-full border rounded px-3 py-2 text-sm" value={config.output_height}
              onChange={e => setConfig({ ...config, output_height: +e.target.value })} />
          </label>
          <label className="block">
            <span className="text-xs text-gray-600">FPS</span>
            <input type="number" className="mt-1 block w-full border rounded px-3 py-2 text-sm" value={config.fps}
              onChange={e => setConfig({ ...config, fps: +e.target.value })} />
          </label>
          <label className="block">
            <span className="text-xs text-gray-600">Bitrate (bps)</span>
            <input type="number" className="mt-1 block w-full border rounded px-3 py-2 text-sm" value={config.bitrate}
              onChange={e => setConfig({ ...config, bitrate: +e.target.value })} />
          </label>
          <label className="block">
            <span className="text-xs text-gray-600">I-Frame Interval</span>
            <input type="number" className="mt-1 block w-full border rounded px-3 py-2 text-sm" value={config.iframe_interval}
              onChange={e => setConfig({ ...config, iframe_interval: +e.target.value })} />
          </label>
          <label className="block">
            <span className="text-xs text-gray-600">Transition Duration (frames)</span>
            <input type="number" className="mt-1 block w-full border rounded px-3 py-2 text-sm" value={config.transition_duration_frames}
              onChange={e => setConfig({ ...config, transition_duration_frames: +e.target.value })} />
          </label>
        </div>
        <label className="block">
          <span className="text-xs text-gray-600">Quality Label (shown in app)</span>
          <input type="text" className="mt-1 block w-full border rounded px-3 py-2 text-sm" value={config.quality_label}
            onChange={e => setConfig({ ...config, quality_label: e.target.value })} />
        </label>
      </fieldset>

      {/* Duration Settings */}
      <fieldset className="border border-gray-200 rounded-lg p-4 space-y-3">
        <legend className="text-sm font-semibold text-gray-700 px-2">Duration Settings</legend>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-gray-600">Min Duration (seconds)</span>
            <input type="number" step="0.1" className="mt-1 block w-full border rounded px-3 py-2 text-sm" value={config.min_duration_seconds}
              onChange={e => setConfig({ ...config, min_duration_seconds: +e.target.value })} />
          </label>
          <label className="block">
            <span className="text-xs text-gray-600">Max Duration (seconds)</span>
            <input type="number" step="0.1" className="mt-1 block w-full border rounded px-3 py-2 text-sm" value={config.max_duration_seconds}
              onChange={e => setConfig({ ...config, max_duration_seconds: +e.target.value })} />
          </label>
          <label className="block">
            <span className="text-xs text-gray-600">Default Duration (seconds)</span>
            <input type="number" step="0.1" className="mt-1 block w-full border rounded px-3 py-2 text-sm" value={config.default_duration_seconds}
              onChange={e => setConfig({ ...config, default_duration_seconds: +e.target.value })} />
          </label>
          <label className="block">
            <span className="text-xs text-gray-600">Step (seconds)</span>
            <input type="number" step="0.1" className="mt-1 block w-full border rounded px-3 py-2 text-sm" value={config.duration_step_seconds}
              onChange={e => setConfig({ ...config, duration_step_seconds: +e.target.value })} />
          </label>
        </div>
        <label className="block">
          <span className="text-xs text-gray-600">Preset Markers (comma-separated)</span>
          <input type="text" className="mt-1 block w-full border rounded px-3 py-2 text-sm" value={presetsText}
            onChange={e => setPresetsText(e.target.value)} placeholder="0.5, 1.5, 2.0, 3.5, 5.0" />
        </label>
      </fieldset>

      {/* Transitions */}
      <fieldset className="border border-gray-200 rounded-lg p-4 space-y-3">
        <legend className="text-sm font-semibold text-gray-700 px-2">Transitions</legend>
        <label className="block">
          <span className="text-xs text-gray-600">Default Transition ID</span>
          <input type="text" className="mt-1 block w-full border rounded px-3 py-2 text-sm" value={config.default_transition}
            onChange={e => setConfig({ ...config, default_transition: e.target.value })} />
        </label>
        <label className="block">
          <span className="text-xs text-gray-600">Transitions JSON</span>
          <textarea rows={8} className="mt-1 block w-full border rounded px-3 py-2 text-sm font-mono" value={transitionsText}
            onChange={e => setTransitionsText(e.target.value)} />
        </label>
      </fieldset>

      {/* Image Limits */}
      <fieldset className="border border-gray-200 rounded-lg p-4 space-y-3">
        <legend className="text-sm font-semibold text-gray-700 px-2">Image Limits</legend>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-gray-600">Max Images</span>
            <input type="number" className="mt-1 block w-full border rounded px-3 py-2 text-sm" value={config.max_images}
              onChange={e => setConfig({ ...config, max_images: +e.target.value })} />
          </label>
          <label className="block">
            <span className="text-xs text-gray-600">Min Images</span>
            <input type="number" className="mt-1 block w-full border rounded px-3 py-2 text-sm" value={config.min_images}
              onChange={e => setConfig({ ...config, min_images: +e.target.value })} />
          </label>
          <label className="block">
            <span className="text-xs text-gray-600">Max Image Dimension (px)</span>
            <input type="number" className="mt-1 block w-full border rounded px-3 py-2 text-sm" value={config.max_image_dimension}
              onChange={e => setConfig({ ...config, max_image_dimension: +e.target.value })} />
          </label>
          <label className="block">
            <span className="text-xs text-gray-600">Thumbnail Size (px)</span>
            <input type="number" className="mt-1 block w-full border rounded px-3 py-2 text-sm" value={config.thumbnail_size}
              onChange={e => setConfig({ ...config, thumbnail_size: +e.target.value })} />
          </label>
        </div>
      </fieldset>

      {/* Output Settings */}
      <fieldset className="border border-gray-200 rounded-lg p-4 space-y-3">
        <legend className="text-sm font-semibold text-gray-700 px-2">Output Settings</legend>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-gray-600">Download Folder</span>
            <input type="text" className="mt-1 block w-full border rounded px-3 py-2 text-sm" value={config.download_folder}
              onChange={e => setConfig({ ...config, download_folder: e.target.value })} />
          </label>
          <label className="block">
            <span className="text-xs text-gray-600">Filename Prefix</span>
            <input type="text" className="mt-1 block w-full border rounded px-3 py-2 text-sm" value={config.filename_prefix}
              onChange={e => setConfig({ ...config, filename_prefix: e.target.value })} />
          </label>
        </div>
        <label className="block">
          <span className="text-xs text-gray-600">Credits Per Video (0 = free)</span>
          <input type="number" className="mt-1 block w-full border rounded px-3 py-2 text-sm" value={config.credits_per_video}
            onChange={e => setConfig({ ...config, credits_per_video: +e.target.value })} />
        </label>
      </fieldset>

      {/* Save Button */}
      <div className="flex gap-3">
        <button onClick={handleSave} disabled={saving}
          className="px-6 py-2 bg-amber-700 text-white rounded-lg font-medium hover:bg-amber-800 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Config'}
        </button>
        <button onClick={loadConfig}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
          Reset
        </button>
      </div>

      {config.updated_at && (
        <p className="text-xs text-gray-400">Last updated: {new Date(config.updated_at).toLocaleString()}</p>
      )}
    </div>
  )
}
