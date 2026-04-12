import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Pencil, Trash2, Plus, Eye, Copy, ChevronDown, ChevronUp, Layers, Palette, Type, Smartphone, Star, ToggleLeft, ToggleRight } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { posterFramesApi } from '../../services/admin-api'
import api from '../../services/api'
import { useAdminCrud } from '../../hooks/useAdminCrud'

// ── Types matching Django PosterFrame model ────────────────────

interface FrameStyle {
  height: number
  background: string
  colors: string[]
  gradientAngle: number
  borderRadius: number[]
  opacity: number
  imageUrl?: string
  padding?: number
  dividerEnabled?: boolean
  dividerColor?: string
  dividerThickness?: number
  dividerY?: number
}

interface FrameElement {
  type: string
  field?: string
  x: number | string
  y: number
  fontSize?: number
  fontWeight?: string
  fontStyle?: string
  color?: string
  maxWidth?: number
  icon?: string
  size?: number
  text?: string
  textAlign?: string
  letterSpacing?: number
  socialIcons?: string[]
  iconSpacing?: number
}

interface FrameConfig {
  type: string
  style: FrameStyle
  elements: FrameElement[]
}

interface PosterFrame {
  id: number
  name: string
  type: string
  config_json: FrameConfig | any
  thumbnail_url: string
  overlay_image_url: string
  category: string
  color_preset: string[]
  is_premium: boolean
  is_active: boolean
  sort_order: number
  aspect_ratio: string
  created_at: string
}

interface FormState {
  name: string
  type: string
  category: string
  is_premium: boolean
  is_active: boolean
  sort_order: number
  color_preset: string[]
  config_json: FrameConfig
  aspect_ratio: string
  thumbnail_url: string
  overlay_image_url: string
}

// ── Constants ──────────────────────────────────────────────────

const frameTypes = [
  { value: 'bottom_strip', label: 'Bottom Strip', desc: 'Business bar at bottom' },
  { value: 'top_strip', label: 'Top Strip', desc: 'Banner at top' },
  { value: 'side_strip', label: 'Side Strip', desc: 'Vertical sidebar' },
  { value: 'full', label: 'Full Frame', desc: 'Border around entire poster' },
  { value: 'image_overlay', label: 'Image Overlay', desc: 'PNG layers from FramePack' },
]

const aspectRatios = [
  { value: '1:1', label: '1:1 Square' },
  { value: '4:5', label: '4:5 Portrait' },
  { value: '9:16', label: '9:16 Story' },
  { value: '16:9', label: '16:9 Landscape' },
]

const frameCategories = [
  { value: 'business', label: 'Business' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'salon', label: 'Salon' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'education', label: 'Education' },
  { value: 'creative', label: 'Creative' },
  { value: 'political', label: 'Political' },
]

const colorThemes = [
  { name: 'Maroon', colors: ['#5E030C', '#8B0000'], text: '#FFFFFF' },
  { name: 'Navy', colors: ['#1a237e', '#283593'], text: '#FFFFFF' },
  { name: 'Gold', colors: ['#F5A623', '#D4941D'], text: '#1A1A2E' },
  { name: 'Forest', colors: ['#1b5e20', '#2e7d32'], text: '#FFFFFF' },
  { name: 'Purple', colors: ['#4a148c', '#6a1b9a'], text: '#FFFFFF' },
  { name: 'Orange', colors: ['#e65100', '#f57c00'], text: '#FFFFFF' },
  { name: 'Black', colors: ['#212121', '#424242'], text: '#FFFFFF' },
  { name: 'White', colors: ['#FAFAFA', '#F5F5F5'], text: '#1A1A2E' },
  { name: 'Teal', colors: ['#004d40', '#00695c'], text: '#FFFFFF' },
  { name: 'Rose', colors: ['#880e4f', '#ad1457'], text: '#FFFFFF' },
]

const elementTypes = [
  { value: 'text', label: 'Text' },
  { value: 'icon', label: 'Icon' },
  { value: 'logo', label: 'Logo' },
  { value: 'social_row', label: 'Social Row' },
  { value: 'divider', label: 'Divider' },
]

const fieldOptions = ['business_name', 'phone', 'address', 'email', 'website', 'tagline', 'custom']
const iconOptions = ['phone', 'location', 'email', 'web', 'facebook', 'instagram', 'twitter', 'youtube', 'linkedin', 'whatsapp', 'star', 'heart', 'clock']

const defaultStyle: FrameStyle = {
  height: 120,
  background: 'gradient',
  colors: ['#6637D9', '#e040fb'],
  gradientAngle: 0,
  borderRadius: [16, 16, 0, 0],
  opacity: 1.0,
}

const defaultElement: FrameElement = {
  type: 'text',
  field: 'business_name',
  x: 'center',
  y: 25,
  fontSize: 20,
  fontWeight: 'bold',
  color: '#ffffff',
  maxWidth: 80,
  textAlign: 'center',
}

const emptyConfig: FrameConfig = {
  type: 'bottom_strip',
  style: { ...defaultStyle },
  elements: [{ ...defaultElement }],
}

const emptyForm: FormState = {
  name: '',
  type: 'bottom_strip',
  category: 'business',
  is_premium: false,
  is_active: true,
  sort_order: 0,
  color_preset: [],
  config_json: { ...emptyConfig },
  aspect_ratio: '1:1',
  thumbnail_url: '',
  overlay_image_url: '',
}

const inputClass = 'w-full bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50'
const labelClass = 'block text-xs font-medium text-brand-text-muted mb-1'
const sectionTitle = 'text-sm font-semibold text-brand-text flex items-center gap-2 mb-3'

// ── Helper: Canvas Preview ─────────────────────────────────────

function FramePreview({ config, width = 240, height = 300 }: { config: FrameConfig; width?: number; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isImageOverlay = config?.type === 'image_overlay' || !config?.style

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear with a realistic poster-like gradient background
    ctx.clearRect(0, 0, width, height)
    const bgGrad = ctx.createLinearGradient(0, 0, width, height)
    bgGrad.addColorStop(0, '#a8c0d8')
    bgGrad.addColorStop(0.5, '#7a9bb5')
    bgGrad.addColorStop(1, '#5a7a94')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, width, height)

    // Draw subtle poster content placeholder
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Poster Content', width / 2, height / 2 - 10)

    // Image overlay frames don't have style — show label instead
    if (isImageOverlay) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'
      ctx.fillRect(0, height - 50, width, 50)
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 12px sans-serif'
      ctx.fillText('Image Overlay Frame', width / 2, height - 22)
      return
    }

    const style = config.style
    // Scale strip height: config.style.height is in px (e.g., 130), map to preview proportionally
    // Use at least 20% of canvas height so strips are clearly visible in preview
    const stripH = Math.max(height * 0.2, height * style.height / 600)

    let top = 0
    if (config.type === 'bottom_strip') top = height - stripH
    else if (config.type === 'top_strip') top = 0

    // Draw background
    if (config.type === 'full') {
      const padding = (style.padding || 8) * 1
      ctx.strokeStyle = style.colors?.[0] || '#000'
      ctx.lineWidth = padding
      ctx.globalAlpha = style.opacity
      ctx.strokeRect(padding / 2, padding / 2, width - padding, height - padding)
      ctx.globalAlpha = 1
    } else {
      ctx.globalAlpha = style.opacity
      if (style.background === 'gradient' && style.colors.length >= 2) {
        const grad = ctx.createLinearGradient(0, top, width, top + stripH)
        style.colors.forEach((c, i) => grad.addColorStop(i / (style.colors.length - 1), c))
        ctx.fillStyle = grad
      } else {
        ctx.fillStyle = style.colors?.[0] || '#000'
      }

      // Rounded rect
      const r = style.borderRadius?.[0] || 0
      ctx.beginPath()
      if (config.type === 'bottom_strip') {
        ctx.moveTo(0, top + r)
        ctx.quadraticCurveTo(0, top, r, top)
        ctx.lineTo(width - r, top)
        ctx.quadraticCurveTo(width, top, width, top + r)
        ctx.lineTo(width, top + stripH)
        ctx.lineTo(0, top + stripH)
      } else {
        ctx.moveTo(0, 0)
        ctx.lineTo(width, 0)
        ctx.lineTo(width, stripH - r)
        ctx.quadraticCurveTo(width, stripH, width - r, stripH)
        ctx.lineTo(r, stripH)
        ctx.quadraticCurveTo(0, stripH, 0, stripH - r)
      }
      ctx.closePath()
      ctx.fill()
      ctx.globalAlpha = 1

      // Draw divider
      if (style.dividerEnabled) {
        ctx.strokeStyle = style.dividerColor || '#40FFFFFF'
        ctx.lineWidth = style.dividerThickness || 1
        const dy = top + stripH * (style.dividerY || 50) / 100
        ctx.beginPath()
        ctx.moveTo(10, dy)
        ctx.lineTo(width - 10, dy)
        ctx.stroke()
      }

      // Draw element labels
      config.elements.forEach(el => {
        const ey = top + stripH * el.y / 100
        ctx.fillStyle = el.color || '#fff'
        ctx.font = `${el.fontWeight === 'bold' ? 'bold ' : ''}${Math.max(8, (el.fontSize || 14) * 0.6)}px sans-serif`
        ctx.textAlign = el.x === 'center' ? 'center' : 'left'
        const ex = el.x === 'center' ? width / 2 : width * (Number(el.x) || 0) / 100

        if (el.type === 'text') {
          const label = el.field === 'business_name' ? 'Your Business' : el.field === 'phone' ? '+91 98765' : el.field === 'address' ? 'City, India' : el.field || el.text || ''
          ctx.fillText(label, ex, ey + (el.fontSize || 14) * 0.5)
        } else if (el.type === 'icon') {
          ctx.fillText(el.icon === 'phone' ? '✆' : el.icon === 'location' ? '◉' : el.icon === 'email' ? '✉' : '●', ex, ey + (el.size || 14) * 0.5)
        } else if (el.type === 'social_row') {
          ctx.textAlign = 'center'
          ctx.fillText('f  ◎  𝕏', width / 2, ey + (el.size || 14) * 0.5)
        }
      })
    }
  }, [config, width, height, isImageOverlay])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded-lg border border-brand-dark-border"
      style={{ width, height }}
    />
  )
}

// ── Element Editor Row ─────────────────────────────────────────

function ElementEditor({
  element,
  index,
  onChange,
  onRemove,
}: {
  element: FrameElement
  index: number
  onChange: (el: FrameElement) => void
  onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-brand-dark rounded-lg border border-brand-dark-border p-3 mb-2">
      <div className="flex items-center justify-between">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 text-sm text-brand-text">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          <span className="font-medium">#{index + 1} {element.type}</span>
          <span className="text-brand-text-muted text-xs">
            {element.field || element.icon || element.text || ''}
          </span>
        </button>
        <button onClick={onRemove} className="text-status-error hover:text-red-400 transition-colors">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {expanded && (
        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Type</label>
            <select value={element.type} onChange={e => onChange({ ...element, type: e.target.value })} className={inputClass}>
              {elementTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {element.type === 'text' && (
            <div>
              <label className={labelClass}>Field</label>
              <select value={element.field || ''} onChange={e => onChange({ ...element, field: e.target.value })} className={inputClass}>
                <option value="">—</option>
                {fieldOptions.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          )}

          {element.type === 'icon' && (
            <div>
              <label className={labelClass}>Icon</label>
              <select value={element.icon || ''} onChange={e => onChange({ ...element, icon: e.target.value })} className={inputClass}>
                {iconOptions.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className={labelClass}>X Position</label>
            <input value={String(element.x)} onChange={e => {
              const v = e.target.value
              onChange({ ...element, x: v === 'center' ? 'center' : Number(v) || 0 })
            }} className={inputClass} placeholder="center or 0-100" />
          </div>

          <div>
            <label className={labelClass}>Y Position (%)</label>
            <input type="number" value={element.y} onChange={e => onChange({ ...element, y: Number(e.target.value) })} className={inputClass} min={0} max={100} />
          </div>

          {(element.type === 'text') && (
            <>
              <div>
                <label className={labelClass}>Font Size</label>
                <input type="number" value={element.fontSize || 16} onChange={e => onChange({ ...element, fontSize: Number(e.target.value) })} className={inputClass} min={8} max={48} />
              </div>
              <div>
                <label className={labelClass}>Font Weight</label>
                <select value={element.fontWeight || 'normal'} onChange={e => onChange({ ...element, fontWeight: e.target.value })} className={inputClass}>
                  <option value="normal">Normal</option>
                  <option value="bold">Bold</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Text Align</label>
                <select value={element.textAlign || 'left'} onChange={e => onChange({ ...element, textAlign: e.target.value })} className={inputClass}>
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Max Width (%)</label>
                <input type="number" value={element.maxWidth || 100} onChange={e => onChange({ ...element, maxWidth: Number(e.target.value) })} className={inputClass} min={10} max={100} />
              </div>
              <div>
                <label className={labelClass}>Letter Spacing</label>
                <input type="number" value={element.letterSpacing || 0} onChange={e => onChange({ ...element, letterSpacing: Number(e.target.value) })} className={inputClass} min={-0.1} max={0.5} step={0.01} />
              </div>
              {element.field === 'custom' && (
                <div className="col-span-2">
                  <label className={labelClass}>Custom Text</label>
                  <input value={element.text || ''} onChange={e => onChange({ ...element, text: e.target.value })} className={inputClass} placeholder="Enter custom text..." />
                </div>
              )}
            </>
          )}

          {(element.type === 'icon' || element.type === 'logo') && (
            <div>
              <label className={labelClass}>Size</label>
              <input type="number" value={element.size || 16} onChange={e => onChange({ ...element, size: Number(e.target.value) })} className={inputClass} min={8} max={48} />
            </div>
          )}

          {element.type === 'social_row' && (
            <>
              <div className="col-span-2">
                <label className={labelClass}>Social Icons (comma separated)</label>
                <input
                  value={(element.socialIcons || []).join(', ')}
                  onChange={e => onChange({ ...element, socialIcons: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  className={inputClass}
                  placeholder="facebook, instagram, twitter"
                />
              </div>
              <div>
                <label className={labelClass}>Icon Spacing</label>
                <input type="number" value={element.iconSpacing || 12} onChange={e => onChange({ ...element, iconSpacing: Number(e.target.value) })} className={inputClass} min={4} max={32} />
              </div>
            </>
          )}

          <div>
            <label className={labelClass}>Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={element.color || '#ffffff'} onChange={e => onChange({ ...element, color: e.target.value })} className="w-8 h-8 rounded cursor-pointer border-0" />
              <input value={element.color || '#ffffff'} onChange={e => onChange({ ...element, color: e.target.value })} className={inputClass} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────

export default function FramePosterPage() {
  const { addToast } = useToast()
  const { data, loading, create, update, remove } = useAdminCrud<PosterFrame>(posterFramesApi)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<PosterFrame | null>(null)
  const [form, setForm] = useState<FormState>({ ...emptyForm })
  const [deleteItem, setDeleteItem] = useState<PosterFrame | null>(null)
  const [jsonMode, setJsonMode] = useState(false)
  const [jsonText, setJsonText] = useState('')
  const [frameFile, setFrameFile] = useState<File | null>(null)
  const [framePreviewUrl, setFramePreviewUrl] = useState<string>('')
  const [selectedFrames, setSelectedFrames] = useState<Set<number>>(new Set())
  const [dupDropdown, setDupDropdown] = useState<number | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [ratioFilter, setRatioFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('active')
  const [sizeFilter, setSizeFilter] = useState('')

  // Extract unique canvas sizes from frame configs
  const availableSizes = useMemo(() => {
    const sizes = new Set<string>()
    data.forEach(f => {
      const config = f.config_json as any
      const w = config?.canvasSize || config?.layers?.[0]?.width
      const h = config?.canvasHeight || config?.layers?.[0]?.height
      if (w && h) sizes.add(`${w}x${h}`)
    })
    return Array.from(sizes).sort()
  }, [data])

  const filteredData = useMemo(() => {
    return data.filter(f => {
      if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false
      if (categoryFilter && f.category !== categoryFilter) return false
      if (typeFilter && (f.type || '') !== typeFilter) return false
      if (ratioFilter && f.aspect_ratio !== ratioFilter) return false
      if (statusFilter === 'active' && !f.is_active) return false
      if (statusFilter === 'inactive' && f.is_active) return false
      if (sizeFilter) {
        const config = f.config_json as any
        const w = config?.canvasSize || config?.layers?.[0]?.width
        const h = config?.canvasHeight || config?.layers?.[0]?.height
        if (`${w}x${h}` !== sizeFilter) return false
      }
      return true
    })
  }, [data, search, categoryFilter, typeFilter, ratioFilter, statusFilter, sizeFilter])

  const openAdd = () => {
    setEditingItem(null)
    setForm({ ...emptyForm })
    setJsonMode(false)
    setFrameFile(null)
    setFramePreviewUrl('')
    setModalOpen(true)
  }

  const openEdit = (item: PosterFrame) => {
    setEditingItem(item)
    setForm({
      name: item.name,
      type: item.type,
      category: item.category,
      is_premium: item.is_premium,
      is_active: item.is_active,
      sort_order: item.sort_order,
      color_preset: item.color_preset || [],
      config_json: {
        ...emptyConfig,
        ...item.config_json,
        style: { ...defaultStyle, ...(item.config_json?.style || {}) },
        elements: item.config_json?.elements || [{ ...defaultElement }],
      },
      aspect_ratio: item.aspect_ratio || '1:1',
      thumbnail_url: item.thumbnail_url || '',
      overlay_image_url: item.overlay_image_url || '',
    })
    setJsonMode(false)
    setFrameFile(null)
    setFramePreviewUrl('')
    setModalOpen(true)
  }

  const duplicateFrame = async (item: PosterFrame) => {
    try {
      await create({
        name: `${item.name} (Copy)`,
        type: item.type,
        category: item.category,
        is_premium: item.is_premium,
        is_active: true,
        sort_order: item.sort_order + 1,
        color_preset: item.color_preset,
        config_json: item.config_json,
        aspect_ratio: item.aspect_ratio,
        thumbnail_url: item.thumbnail_url,
        overlay_image_url: item.overlay_image_url,
      } as Partial<PosterFrame>)
      addToast('Frame duplicated!')
    } catch {
      addToast('Duplicate failed', 'error')
    }
  }

  const duplicateToRatio = async (sourceFrame: PosterFrame, targetRatio: string) => {
    try {
      const ratioSuffix = targetRatio.replace(':', '_')
      const newName = `${sourceFrame.name.replace(/_\d+_\d+$/, '')}_${ratioSuffix}`

      const baseDims: Record<string, { w: number; h: number }> = {
        '1:1': { w: 1024, h: 1024 },
        '4:5': { w: 1080, h: 1350 },
        '9:16': { w: 1080, h: 1920 },
        '16:9': { w: 1920, h: 1080 },
      }
      const dims = baseDims[targetRatio] || baseDims['1:1']

      const newConfig = JSON.parse(JSON.stringify(sourceFrame.config_json))
      if (newConfig.canvasSize) newConfig.canvasSize = dims.w
      if (newConfig.canvasHeight) newConfig.canvasHeight = dims.h
      if (newConfig.layers) {
        for (const layer of newConfig.layers) {
          if (layer.name === 'bg') {
            layer.width = dims.w
            layer.height = dims.h
          }
        }
      }

      await create({
        name: newName,
        type: sourceFrame.type,
        category: sourceFrame.category,
        aspect_ratio: targetRatio,
        is_active: false,
        is_premium: sourceFrame.is_premium,
        sort_order: sourceFrame.sort_order,
        color_preset: sourceFrame.color_preset,
        config_json: newConfig,
        thumbnail_url: sourceFrame.thumbnail_url,
        overlay_image_url: sourceFrame.overlay_image_url || '',
      } as any)
      addToast(`Duplicated to ${targetRatio}`)
    } catch {
      addToast('Duplicate to ratio failed', 'error')
    }
  }

  const toggleActive = async (item: PosterFrame) => {
    try {
      await update(item.id, { is_active: !item.is_active } as Partial<PosterFrame>)
      addToast(item.is_active ? 'Frame deactivated' : 'Frame activated')
    } catch {
      addToast('Toggle failed', 'error')
    }
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) { addToast('Name is required', 'error'); return }

    if (frameFile) {
      // File upload: use FormData
      const fd = new FormData()
      fd.append('frame_image', frameFile)
      fd.append('name', form.name)
      fd.append('type', form.type)
      fd.append('category', form.category)
      fd.append('aspect_ratio', form.aspect_ratio)
      fd.append('is_premium', String(form.is_premium))
      fd.append('is_active', String(form.is_active))
      fd.append('sort_order', String(form.sort_order))

      try {
        if (editingItem) {
          await api.patch(`/api/admin/poster-frames/${editingItem.id}/`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
        } else {
          await api.post('/api/admin/poster-frames/', fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
        }
        addToast(editingItem ? 'Frame updated' : 'Frame created')
        setModalOpen(false)
        setEditingItem(null)
        setFrameFile(null)
        setFramePreviewUrl('')
        // Refresh data
        window.location.reload()
      } catch (err: any) {
        addToast(err?.response?.data?.detail || 'Save failed', 'error')
      }
      return
    }

    // If JSON mode, parse JSON
    let configToSave = form.config_json
    if (jsonMode) {
      try {
        configToSave = JSON.parse(jsonText)
      } catch {
        addToast('Invalid JSON config', 'error')
        return
      }
    }

    // Sync config type with form type
    configToSave = { ...configToSave, type: form.type }

    const payload: Partial<PosterFrame> = {
      name: form.name,
      type: form.type,
      category: form.category,
      is_premium: form.is_premium,
      is_active: form.is_active,
      sort_order: form.sort_order,
      color_preset: form.color_preset,
      config_json: configToSave,
      aspect_ratio: form.aspect_ratio,
      thumbnail_url: form.thumbnail_url,
      overlay_image_url: form.overlay_image_url,
    }

    try {
      if (editingItem) {
        await update(editingItem.id, payload)
        addToast('Frame updated successfully')
      } else {
        await create(payload)
        addToast('Frame created successfully')
      }
      setModalOpen(false)
      setEditingItem(null)
    } catch {
      addToast('Save failed', 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    try {
      await remove(deleteItem.id)
      addToast('Frame deleted')
      setDeleteItem(null)
    } catch {
      addToast('Delete failed', 'error')
    }
  }

  const handleBulkActivate = async () => {
    for (const id of selectedFrames) { await update(id, { is_active: true } as Partial<PosterFrame>) }
    addToast(`${selectedFrames.size} frames activated`)
    setSelectedFrames(new Set())
  }
  const handleBulkDeactivate = async () => {
    for (const id of selectedFrames) { await update(id, { is_active: false } as Partial<PosterFrame>) }
    addToast(`${selectedFrames.size} frames deactivated`)
    setSelectedFrames(new Set())
  }

  // Update style helper
  const updateStyle = useCallback((patch: Partial<FrameStyle>) => {
    setForm(f => ({
      ...f,
      config_json: {
        ...f.config_json,
        style: { ...f.config_json.style, ...patch },
      },
    }))
  }, [])

  // Update element helper
  const updateElement = useCallback((index: number, el: FrameElement) => {
    setForm(f => {
      const elements = [...f.config_json.elements]
      elements[index] = el
      return { ...f, config_json: { ...f.config_json, elements } }
    })
  }, [])

  const removeElement = useCallback((index: number) => {
    setForm(f => ({
      ...f,
      config_json: {
        ...f.config_json,
        elements: f.config_json.elements.filter((_, i) => i !== index),
      },
    }))
  }, [])

  const addElement = useCallback(() => {
    setForm(f => ({
      ...f,
      config_json: {
        ...f.config_json,
        elements: [...f.config_json.elements, { ...defaultElement, field: 'phone', fontWeight: 'normal', fontSize: 13, y: 60, x: 10 }],
      },
    }))
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading frames...</div>
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Frame Studio</h1>
          <p className="text-sm text-brand-text-muted mt-1">Manage customizable poster frames with JSON config</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-brand-text-muted">
          <span className="px-2 py-1 rounded bg-brand-dark-card">{data.length} frames</span>
          <span className="px-2 py-1 rounded bg-status-success/10 text-status-success">{data.filter(f => f.is_active).length} active</span>
          {filteredData.length !== data.length && (
            <span className="px-2 py-1 rounded bg-brand-gold/10 text-brand-gold">Showing {filteredData.length}</span>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3">
        <input
          placeholder="Search frames..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2 text-sm text-brand-text w-64 focus:outline-none focus:border-brand-gold/50"
        />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
          <option value="">All Types</option>
          {frameTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
          <option value="">All Categories</option>
          {frameCategories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select value={ratioFilter} onChange={e => setRatioFilter(e.target.value)} className="bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
          <option value="">All Ratios</option>
          {aspectRatios.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
          <option value="">All Status</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
        <select value={sizeFilter} onChange={e => setSizeFilter(e.target.value)} className="bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
          <option value="">All Sizes</option>
          {availableSizes.map(s => <option key={s} value={s}>{s}px</option>)}
        </select>
      </div>

      {/* Bulk Action Bar */}
      {selectedFrames.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-brand-dark-card rounded-xl border border-brand-gold/30">
          <span className="text-sm text-brand-text">{selectedFrames.size} selected</span>
          <button onClick={handleBulkActivate} className="px-3 py-1.5 bg-status-success text-white text-sm rounded-lg">Activate All</button>
          <button onClick={handleBulkDeactivate} className="px-3 py-1.5 bg-status-error text-white text-sm rounded-lg">Deactivate All</button>
          <button onClick={() => setSelectedFrames(new Set())} className="px-3 py-1.5 bg-brand-dark-hover text-brand-text text-sm rounded-lg ml-auto">Clear</button>
        </div>
      )}

      {/* Frame Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredData.map(frame => (
          <div key={frame.id} className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 overflow-hidden group relative">
            <input
              type="checkbox"
              checked={selectedFrames.has(frame.id)}
              onChange={(e) => { e.stopPropagation(); setSelectedFrames(prev => { const next = new Set(prev); if (next.has(frame.id)) next.delete(frame.id); else next.add(frame.id); return next }) }}
              className="absolute top-2 left-2 z-10 rounded cursor-pointer"
            />
            {/* Preview — show thumbnail for image_overlay, canvas preview for legacy */}
            <div className="aspect-[4/5] bg-neutral-800 relative overflow-hidden flex items-center justify-center p-2">
              {frame.thumbnail_url ? (
                <img src={frame.thumbnail_url} alt={frame.name} className="w-full h-full object-contain rounded-lg" />
              ) : (
                <FramePreview config={frame.config_json} width={240} height={300} />
              )}

              {/* Hover actions */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button onClick={() => openEdit(frame)} className="p-2 bg-brand-gold rounded-lg text-gray-900" title="Edit">
                  <Pencil className="h-4 w-4" />
                </button>
                <div className="relative">
                  <button onClick={(e) => { e.stopPropagation(); setDupDropdown(dupDropdown === frame.id ? null : frame.id) }} className="p-2 bg-blue-500 rounded-lg text-white" title="Duplicate">
                    <Copy className="h-4 w-4" />
                  </button>
                  {dupDropdown === frame.id && (
                    <div className="absolute top-full left-0 mt-1 bg-brand-dark-card border border-brand-dark-border rounded-lg shadow-xl z-50 py-1 min-w-[140px]">
                      <button onClick={() => { duplicateFrame(frame); setDupDropdown(null) }} className="w-full text-left px-3 py-1.5 text-xs text-brand-text hover:bg-brand-dark-hover">Same Ratio</button>
                      {['1:1', '4:5', '9:16', '16:9'].filter(r => r !== frame.aspect_ratio).map(r => (
                        <button key={r} onClick={() => { duplicateToRatio(frame, r); setDupDropdown(null) }} className="w-full text-left px-3 py-1.5 text-xs text-brand-text hover:bg-brand-dark-hover">To {r}</button>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => toggleActive(frame)} className="p-2 bg-green-600 rounded-lg text-white" title={frame.is_active ? 'Deactivate' : 'Activate'}>
                  {frame.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                </button>
                <button onClick={() => setDeleteItem(frame)} className="p-2 bg-status-error rounded-lg text-white" title="Delete">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Badges */}
              <div className="absolute top-2 right-2 flex flex-col gap-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${frame.is_active ? 'bg-status-success/20 text-status-success' : 'bg-brand-dark-hover text-brand-text-muted'}`}>
                  {frame.is_active ? 'Active' : 'Inactive'}
                </span>
                {frame.is_premium && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-brand-gold/20 text-brand-gold flex items-center gap-1">
                    <Star className="h-3 w-3" /> Premium
                  </span>
                )}
              </div>

              {/* Type + ratio badges */}
              <div className="absolute top-8 left-2 flex flex-col gap-1">
                <span className="px-2 py-0.5 rounded-full text-xs bg-brand-dark/80 text-brand-text-muted">
                  {(frame.type || 'unknown').replace('_', ' ')}
                </span>
                {frame.aspect_ratio && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${
                    frame.aspect_ratio === '1:1' ? 'bg-purple-600/80' :
                    frame.aspect_ratio === '4:5' ? 'bg-green-600/80' :
                    frame.aspect_ratio === '9:16' ? 'bg-red-600/80' : 'bg-gray-600/80'
                  }`}>
                    {frame.aspect_ratio}
                  </span>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="p-3">
              <h3 className="text-sm font-medium text-brand-text truncate">{frame.name}</h3>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs px-2 py-0.5 rounded-full bg-brand-gold/10 text-brand-gold capitalize">{frame.category}</span>
                <span className="text-xs text-brand-text-muted">{frame.config_json?.elements?.length || 0} elements</span>
                <span className="text-xs text-brand-text-muted">#{frame.sort_order}</span>
              </div>
              {/* Color preview */}
              <div className="flex gap-1 mt-2">
                {(frame.config_json?.style?.colors || []).slice(0, 5).map((c: string, i: number) => (
                  <div key={i} className="w-4 h-4 rounded-full border border-brand-dark-border" style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredData.length === 0 && (
        <div className="text-center py-16">
          <Layers className="h-12 w-12 text-brand-text-muted/30 mx-auto mb-3" />
          <p className="text-brand-text-muted">No frames found matching your filters.</p>
        </div>
      )}

      {/* Floating Add Button */}
      <button onClick={openAdd} className="fixed bottom-6 right-6 w-14 h-14 bg-brand-gold rounded-full shadow-lg flex items-center justify-center text-gray-900 hover:bg-brand-gold-dark transition-colors z-40">
        <Plus className="h-6 w-6" />
      </button>

      {/* ═══ Add/Edit Modal (Full Config Editor) ═══ */}
      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditingItem(null) }} title={editingItem ? `Edit: ${editingItem.name}` : 'Create New Frame'} size="xl">
        <div className="flex gap-6 max-h-[75vh] overflow-hidden">
          {/* Left: Form */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-5">

            {/* Basic Info */}
            <div>
              <h3 className={sectionTitle}><Layers className="h-4 w-4 text-brand-gold" /> Basic Info</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className={labelClass}>Frame Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputClass} placeholder="e.g., Red Gradient Pro" />
                </div>
                <div>
                  <label className={labelClass}>Frame Type</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, config_json: { ...f.config_json, type: e.target.value } }))} className={inputClass}>
                    {frameTypes.map(t => <option key={t.value} value={t.value}>{t.label} — {t.desc}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputClass}>
                    {frameCategories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Aspect Ratio</label>
                  <select value={form.aspect_ratio} onChange={e => setForm(f => ({ ...f, aspect_ratio: e.target.value }))} className={inputClass}>
                    {aspectRatios.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Sort Order</label>
                  <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Thumbnail URL</label>
                  <input value={form.thumbnail_url} onChange={e => setForm(f => ({ ...f, thumbnail_url: e.target.value }))} className={inputClass} placeholder="http://13.203.77.238/media/frames/..." />
                  {form.thumbnail_url && (
                    <img src={form.thumbnail_url} alt="Preview" className="mt-2 h-20 rounded border border-brand-dark-border object-contain" />
                  )}
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Overlay Image URL <span className="text-brand-text-muted font-normal">(single transparent PNG rendered on top of poster)</span></label>
                  <input value={form.overlay_image_url} onChange={e => setForm(f => ({ ...f, overlay_image_url: e.target.value }))} className={inputClass} placeholder="http://13.203.77.238/media/frames/..." />
                  {form.overlay_image_url && (
                    <img src={form.overlay_image_url} alt="Overlay" className="mt-2 h-24 rounded border border-brand-dark-border object-contain bg-neutral-700" />
                  )}
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Upload Frame PNG</label>
                  <input
                    type="file"
                    accept="image/png"
                    onChange={e => {
                      const file = e.target.files?.[0] || null
                      setFrameFile(file)
                      if (file) {
                        setFramePreviewUrl(URL.createObjectURL(file))
                      }
                    }}
                    className={inputClass}
                  />
                  {framePreviewUrl && (
                    <img src={framePreviewUrl} alt="Frame preview" className="mt-2 h-32 rounded border border-brand-dark-border object-contain" />
                  )}
                  <p className="text-xs text-brand-text-muted mt-1">Upload PNG overlay. Config will be auto-generated from image dimensions.</p>
                </div>
                <div className="flex items-center gap-4 pt-5">
                  <label className="flex items-center gap-2 text-sm text-brand-text cursor-pointer">
                    <input type="checkbox" checked={form.is_premium} onChange={e => setForm(f => ({ ...f, is_premium: e.target.checked }))} className="rounded" />
                    <Star className="h-4 w-4 text-brand-gold" /> Premium
                  </label>
                  <label className="flex items-center gap-2 text-sm text-brand-text cursor-pointer">
                    <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
                    Active
                  </label>
                </div>
              </div>
            </div>

            {/* Style Config */}
            <div>
              <h3 className={sectionTitle}><Palette className="h-4 w-4 text-brand-gold" /> Style Configuration</h3>
              <div className="mb-3">
                <label className="block text-xs font-medium text-brand-text-muted mb-2">Quick Themes</label>
                <div className="flex flex-wrap gap-2">
                  {colorThemes.map(theme => (
                    <button
                      key={theme.name}
                      onClick={() => updateStyle({ colors: theme.colors, background: 'gradient' })}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-brand-dark-border text-xs hover:border-brand-gold/50 transition-colors"
                      title={theme.name}
                    >
                      <div className="flex">
                        {theme.colors.map((c, i) => (
                          <div key={i} className="w-4 h-4 rounded-sm" style={{ backgroundColor: c, marginLeft: i > 0 ? -4 : 0 }} />
                        ))}
                      </div>
                      <span className="text-brand-text-muted">{theme.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Background</label>
                  <select value={form.config_json.style.background} onChange={e => updateStyle({ background: e.target.value })} className={inputClass}>
                    <option value="solid">Solid Color</option>
                    <option value="gradient">Gradient</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Height (/1000)</label>
                  <input type="number" value={form.config_json.style.height} onChange={e => updateStyle({ height: Number(e.target.value) })} className={inputClass} min={40} max={400} />
                </div>
                <div>
                  <label className={labelClass}>Color 1</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.config_json.style.colors[0] || '#000000'} onChange={e => {
                      const colors = [...(form.config_json.style.colors || [])]
                      colors[0] = e.target.value
                      updateStyle({ colors })
                    }} className="w-8 h-8 rounded cursor-pointer border-0" />
                    <input value={form.config_json.style.colors[0] || ''} onChange={e => {
                      const colors = [...(form.config_json.style.colors || [])]
                      colors[0] = e.target.value
                      updateStyle({ colors })
                    }} className={inputClass} />
                  </div>
                </div>
                {form.config_json.style.background === 'gradient' && (
                  <>
                    <div>
                      <label className={labelClass}>Color 2</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={form.config_json.style.colors[1] || '#ffffff'} onChange={e => {
                          const colors = [...(form.config_json.style.colors || [])]
                          colors[1] = e.target.value
                          updateStyle({ colors })
                        }} className="w-8 h-8 rounded cursor-pointer border-0" />
                        <input value={form.config_json.style.colors[1] || ''} onChange={e => {
                          const colors = [...(form.config_json.style.colors || [])]
                          colors[1] = e.target.value
                          updateStyle({ colors })
                        }} className={inputClass} />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Gradient Angle (0-360)</label>
                      <input type="number" value={form.config_json.style.gradientAngle} onChange={e => updateStyle({ gradientAngle: Number(e.target.value) })} className={inputClass} min={0} max={360} step={45} />
                    </div>
                  </>
                )}
                <div>
                  <label className={labelClass}>Opacity (0.0 - 1.0)</label>
                  <input type="number" value={form.config_json.style.opacity} onChange={e => updateStyle({ opacity: Number(e.target.value) })} className={inputClass} min={0} max={1} step={0.05} />
                </div>
                <div>
                  <label className={labelClass}>Corner Radius (TL, TR, BR, BL)</label>
                  <input
                    value={(form.config_json.style.borderRadius || []).join(', ')}
                    onChange={e => updateStyle({ borderRadius: e.target.value.split(',').map(v => Number(v.trim()) || 0) })}
                    className={inputClass}
                    placeholder="16, 16, 0, 0"
                  />
                </div>
                <div className="col-span-2 flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-brand-text cursor-pointer">
                    <input type="checkbox" checked={form.config_json.style.dividerEnabled || false} onChange={e => updateStyle({ dividerEnabled: e.target.checked })} className="rounded" />
                    Enable Divider
                  </label>
                  {form.config_json.style.dividerEnabled && (
                    <>
                      <div className="flex items-center gap-1">
                        <input type="color" value={form.config_json.style.dividerColor || '#40FFFFFF'} onChange={e => updateStyle({ dividerColor: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-0" />
                      </div>
                      <input type="number" value={form.config_json.style.dividerY || 50} onChange={e => updateStyle({ dividerY: Number(e.target.value) })} className="w-16 bg-brand-dark border border-brand-dark-border rounded px-2 py-1 text-xs text-brand-text" placeholder="Y%" min={0} max={100} />
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Elements */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className={sectionTitle + ' mb-0'}><Type className="h-4 w-4 text-brand-gold" /> Elements ({form.config_json.elements.length})</h3>
                <button onClick={addElement} className="flex items-center gap-1 text-xs text-brand-gold hover:text-brand-gold-dark transition-colors">
                  <Plus className="h-3 w-3" /> Add Element
                </button>
              </div>
              {form.config_json.elements.map((el, i) => (
                <ElementEditor
                  key={i}
                  element={el}
                  index={i}
                  onChange={updated => updateElement(i, updated)}
                  onRemove={() => removeElement(i)}
                />
              ))}
            </div>

            {/* JSON Toggle */}
            <div>
              <button
                onClick={() => {
                  setJsonMode(!jsonMode)
                  if (!jsonMode) setJsonText(JSON.stringify(form.config_json, null, 2))
                }}
                className="text-xs text-brand-text-muted hover:text-brand-gold transition-colors"
              >
                {jsonMode ? '← Back to Visual Editor' : 'Edit Raw JSON →'}
              </button>
              {jsonMode && (
                <textarea
                  value={jsonText}
                  onChange={e => setJsonText(e.target.value)}
                  className="w-full h-64 mt-2 bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-xs text-brand-text font-mono focus:outline-none focus:border-brand-gold/50"
                  spellCheck={false}
                />
              )}
            </div>
          </div>

          {/* Right: Live Preview */}
          <div className="w-64 flex-shrink-0 flex flex-col items-center gap-4 pt-2">
            <h3 className={sectionTitle}><Smartphone className="h-4 w-4 text-brand-gold" /> Live Preview</h3>
            <FramePreview config={form.config_json} width={220} height={280} />
            <p className="text-xs text-brand-text-muted text-center">Preview updates in real-time as you edit config</p>

            {/* Color Preset Editor */}
            <div className="w-full">
              <label className={labelClass}>Color Presets (for user palette)</label>
              <input
                value={(form.color_preset || []).join(', ')}
                onChange={e => setForm(f => ({ ...f, color_preset: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                className={inputClass}
                placeholder="#ff3b30, #ff9500"
              />
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {(form.color_preset || []).map((c, i) => (
                  <div key={i} className="w-5 h-5 rounded-full border border-brand-dark-border" style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-brand-dark-border">
          <button onClick={() => { setModalOpen(false); setEditingItem(null) }} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} className="px-6 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">
            {editingItem ? 'Update Frame' : 'Create Frame'}
          </button>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        title="Delete Frame"
        message={`Are you sure you want to delete "${deleteItem?.name}"? This will remove it from all users.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  )
}
