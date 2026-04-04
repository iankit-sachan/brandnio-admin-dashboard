import { useState, useEffect } from 'react'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { useToast } from '../../context/ToastContext'
import { watermarkSettingsApi } from '../../services/admin-api'

type Position = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
type WatermarkSize = 'small' | 'medium' | 'large'

interface WatermarkSettings {
  id: number
  image_url: string | null
  position: Position
  opacity: number
  size: WatermarkSize
  free_users_only: boolean
}

export default function WatermarkPage() {
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [settingsId, setSettingsId] = useState<number | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [position, setPosition] = useState<Position>('bottom-right')
  const [opacity, setOpacity] = useState(70)
  const [size, setSize] = useState<WatermarkSize>('medium')
  const [freeUsersOnly, setFreeUsersOnly] = useState(true)

  useEffect(() => {
    watermarkSettingsApi.list().then((result: unknown) => {
      const items = result as WatermarkSettings[]
      if (items.length > 0) {
        const s = items[0]
        setSettingsId(s.id)
        setImageUrl(s.image_url)
        setPosition(s.position)
        setOpacity(s.opacity)
        setSize(s.size)
        setFreeUsersOnly(s.free_users_only)
      }
    }).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    try {
      const payload = { image_url: imageUrl, position, opacity, size, free_users_only: freeUsersOnly }
      if (settingsId) {
        await watermarkSettingsApi.update(settingsId, payload)
      } else {
        const created = await watermarkSettingsApi.create(payload) as WatermarkSettings
        setSettingsId(created.id)
      }
      addToast('Watermark settings saved successfully')
    } catch {
      addToast('Failed to save watermark settings', 'error')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-brand-text">Watermark Settings</h1>
        <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-brand-text">Watermark Settings</h1>

      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 p-6 space-y-6 max-w-3xl">
        <ImageUpload label="Watermark Image" value={imageUrl} onChange={v => setImageUrl(v)} />

        <div>
          <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Watermark Position</label>
          <select value={position} onChange={e => setPosition(e.target.value as Position)} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
            <option value="top-left">Top Left</option>
            <option value="top-right">Top Right</option>
            <option value="bottom-left">Bottom Left</option>
            <option value="bottom-right">Bottom Right</option>
            <option value="center">Center</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-text-muted mb-1.5">
            Watermark Opacity: <span className="text-brand-gold">{opacity}%</span>
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={opacity}
            onChange={e => setOpacity(parseInt(e.target.value))}
            className="w-full h-2 bg-brand-dark rounded-lg appearance-none cursor-pointer accent-brand-gold"
          />
          <div className="flex justify-between text-xs text-brand-text-muted mt-1">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Watermark Size</label>
          <select value={size} onChange={e => setSize(e.target.value as WatermarkSize)} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" checked={freeUsersOnly} onChange={e => setFreeUsersOnly(e.target.checked)} className="rounded" />
          <label className="text-sm text-brand-text-muted">Apply to free users only</label>
        </div>

        <button onClick={handleSave} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">Save Settings</button>
      </div>
    </div>
  )
}
