import { useState, useEffect } from 'react'
import { useToast } from '../../context/ToastContext'
import { contactConfigSingletonApi } from '../../services/admin-api'

interface ContactConfig {
  id?: number
  hero_title: string
  hero_subtitle: string
  hero_image_url: string
  whatsapp_number: string
  whatsapp_label: string
  whatsapp_desc: string
  email_address: string
  email_label: string
  form_title: string
  form_subtitle: string
  subjects: { key: string; label: string }[]
  updated_at?: string
}

const defaultConfig: ContactConfig = {
  hero_title: '',
  hero_subtitle: '',
  hero_image_url: '',
  whatsapp_number: '',
  whatsapp_label: '',
  whatsapp_desc: '',
  email_address: '',
  email_label: '',
  form_title: '',
  form_subtitle: '',
  subjects: [],
}

export default function ContactConfigPage() {
  const { addToast } = useToast()
  const [config, setConfig] = useState<ContactConfig>(defaultConfig)
  const [subjectsText, setSubjectsText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const loadConfig = () => {
    setLoading(true)
    setLoadError(false)
    contactConfigSingletonApi.get()
      .then((data: ContactConfig) => {
        setConfig(data)
        setSubjectsText((data.subjects || []).map(s => `${s.key}:${s.label}`).join(', '))
      })
      .catch(() => {
        setLoadError(true)
        addToast('Failed to load contact config', 'error')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadConfig() }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const subjects = subjectsText.split(',').map(s => s.trim()).filter(Boolean).map(s => {
        const [key, ...rest] = s.split(':')
        return { key: key.trim(), label: rest.join(':').trim() || key.trim() }
      })
      const payload = { ...config, subjects }
      const updated = await contactConfigSingletonApi.update(payload)
      setConfig(updated)
      setSubjectsText((updated.subjects || []).map((s: any) => `${s.key}:${s.label}`).join(', '))
      addToast('Contact config updated successfully')
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
      <h1 className="text-2xl font-bold text-brand-text">Contact Config</h1>

      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 p-6 space-y-5">
        {/* Hero Section */}
        <h2 className="text-sm font-semibold text-brand-gold uppercase tracking-wider">Hero Section</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Hero Title</label>
            <input type="text" value={config.hero_title} onChange={e => setConfig(c => ({ ...c, hero_title: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Hero Image URL</label>
            <input type="text" value={config.hero_image_url} onChange={e => setConfig(c => ({ ...c, hero_image_url: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Hero Subtitle</label>
          <textarea value={config.hero_subtitle} onChange={e => setConfig(c => ({ ...c, hero_subtitle: e.target.value }))} rows={2} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
        </div>

        {/* WhatsApp */}
        <h2 className="text-sm font-semibold text-brand-gold uppercase tracking-wider pt-2">WhatsApp</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">WhatsApp Number</label>
            <input type="text" value={config.whatsapp_number} onChange={e => setConfig(c => ({ ...c, whatsapp_number: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">WhatsApp Label</label>
            <input type="text" value={config.whatsapp_label} onChange={e => setConfig(c => ({ ...c, whatsapp_label: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">WhatsApp Description</label>
            <input type="text" value={config.whatsapp_desc} onChange={e => setConfig(c => ({ ...c, whatsapp_desc: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
        </div>

        {/* Email */}
        <h2 className="text-sm font-semibold text-brand-gold uppercase tracking-wider pt-2">Email</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Email Address</label>
            <input type="text" value={config.email_address} onChange={e => setConfig(c => ({ ...c, email_address: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Email Label</label>
            <input type="text" value={config.email_label} onChange={e => setConfig(c => ({ ...c, email_label: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
        </div>

        {/* Contact Form */}
        <h2 className="text-sm font-semibold text-brand-gold uppercase tracking-wider pt-2">Contact Form</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Form Title</label>
            <input type="text" value={config.form_title} onChange={e => setConfig(c => ({ ...c, form_title: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Form Subtitle</label>
            <input type="text" value={config.form_subtitle} onChange={e => setConfig(c => ({ ...c, form_subtitle: e.target.value }))} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
        </div>

        {/* Subjects */}
        <div>
          <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Subjects (key:label, comma-separated)</label>
          <input value={subjectsText} onChange={e => setSubjectsText(e.target.value)} placeholder="e.g. general:General Inquiry, bug:Bug Report" className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          <p className="text-xs text-brand-text-muted/60 mt-1">Format: key:label pairs separated by commas</p>
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
