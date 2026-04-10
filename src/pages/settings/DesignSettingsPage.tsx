import { useState, useEffect } from 'react'
import { useToast } from '../../context/ToastContext'
import { designSettingsApi } from '../../services/admin-api'

interface DesignSettings {
  id: number
  primary_color: string
  background_color: string
  font_family: string
  poster_quality: string
  enable_animations: boolean
  updated_at: string
}

export default function DesignSettingsPage() {
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [settingsId, setSettingsId] = useState<number | null>(null)
  const [primaryColor, setPrimaryColor] = useState('#FFC107')
  const [bgColor, setBgColor] = useState('#2F2F2F')
  const [font, setFont] = useState('Inter')
  const [posterQuality, setPosterQuality] = useState('HD')
  const [enableAnimations, setEnableAnimations] = useState(true)

  useEffect(() => {
    designSettingsApi.list().then((result: unknown) => {
      const items = result as DesignSettings[]
      if (items.length > 0) {
        const s = items[0]
        setSettingsId(s.id)
        setPrimaryColor(s.primary_color)
        setBgColor(s.background_color)
        setFont(s.font_family)
        setPosterQuality(s.poster_quality)
        setEnableAnimations(s.enable_animations)
      }
    }).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    try {
      const payload = { primary_color: primaryColor, background_color: bgColor, font_family: font, poster_quality: posterQuality, enable_animations: enableAnimations }
      if (settingsId) {
        await designSettingsApi.update(settingsId, payload)
      } else {
        const created = await designSettingsApi.create(payload) as DesignSettings
        setSettingsId(created.id)
      }
      addToast('Design settings saved successfully')
    } catch {
      addToast('Failed to save design settings', 'error')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-brand-text">Design Settings</h1>
        <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-brand-text">Design Settings</h1>

      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 p-6 space-y-6 max-w-3xl">
        <div>
          <label className="block text-sm font-medium text-brand-text-muted mb-1.5">App Primary Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={primaryColor}
              onChange={e => setPrimaryColor(e.target.value)}
              className="w-12 h-10 rounded-lg border border-brand-dark-border cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={primaryColor}
              onChange={e => setPrimaryColor(e.target.value)}
              className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-text-muted mb-1.5">App Background Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={bgColor}
              onChange={e => setBgColor(e.target.value)}
              className="w-12 h-10 rounded-lg border border-brand-dark-border cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={bgColor}
              onChange={e => setBgColor(e.target.value)}
              className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Default Font</label>
          <select value={font} onChange={e => setFont(e.target.value)} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
            <option value="Inter">Inter</option>
            <option value="Roboto">Roboto</option>
            <option value="Poppins">Poppins</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Default Poster Quality</label>
          <select value={posterQuality} onChange={e => setPosterQuality(e.target.value)} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
            <option value="Standard">Standard</option>
            <option value="HD">HD</option>
            <option value="Ultra HD">Ultra HD</option>
          </select>
        </div>

        <div className="flex items-center justify-between p-4 bg-brand-dark rounded-lg border border-brand-dark-border">
          <div>
            <p className="text-sm font-medium text-brand-text">Enable Animations</p>
            <p className="text-xs text-brand-text-muted mt-0.5">Toggle app-wide animations and transitions</p>
          </div>
          <button
            onClick={() => setEnableAnimations(!enableAnimations)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enableAnimations ? 'bg-brand-gold' : 'bg-brand-dark-border'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enableAnimations ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        <button onClick={handleSave} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">Save Settings</button>
      </div>
    </div>
  )
}
