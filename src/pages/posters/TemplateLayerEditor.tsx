import { useState, useCallback, useEffect } from 'react'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../context/ToastContext'
import {
  Type, Image, Square, Eye, EyeOff, Lock, Unlock, Trash2,
  GripVertical, Code, ChevronLeft, Plus
} from 'lucide-react'
import {
  DndContext, closestCenter, type DragEndEvent,
  PointerSensor, useSensor, useSensors
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Poster } from '../../types'

// ─── Types (snake_case matching Android EditorLayer.fromMap) ───────────

/**
 * Mirror of Android's `EditorLayer.toMap()` shape (43 keys) — the
 * canonical wire format for `template_data.layers[*]`. Backend
 * `posters.layer_schema.LAYER_DEFAULTS` is the single source of truth;
 * this interface and `createDefaultLayer()` below MUST stay in sync.
 *
 * 2026-05-04: added 6 keys that previously round-tripped through the
 * editor and got STRIPPED, silently corrupting every poster the admin
 * edited (text_stroke_color → fell back to '#000000', frame_field_name
 * → photo zones became unidentifiable, frame_config_json → frame
 * layers became empty, frame_id, frame_text_tag, schema_version).
 * The backend now back-fills these via `Poster.save()` /
 * `GreetingTemplate.save()` so even if a future edit drops them
 * accidentally, the next save restores the canonical shape.
 */
interface TemplateLayer {
  id: string
  type: 'text' | 'image' | 'shape' | 'logo' | 'sticker' | 'frame'
  content: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  z_index: number
  is_visible: boolean
  is_locked: boolean
  // Text
  font_size: number
  font_family: string
  font_color: string
  is_bold: boolean
  is_italic: boolean
  is_underline: boolean
  letter_spacing: number
  text_align: 'left' | 'center' | 'right'
  line_spacing: number
  text_stroke_width: number
  text_stroke_color: string
  // Shape
  shape_type: string
  shape_color: string
  // Image
  image_url: string
  scale_type: string
  // Effects
  blend_mode: string
  shadow_enabled: boolean
  shadow_radius: number
  shadow_color: string
  shadow_offset_x: number
  shadow_offset_y: number
  // Shape gradient
  shape_gradient_enabled: boolean
  shape_gradient_start: string
  shape_gradient_end: string
  shape_gradient_angle: number
  // Grouping
  group_id: string
  // Frame integration (Android renders these; admin previously stripped them)
  frame_config_json: string
  frame_id: number
  frame_text_tag: boolean
  frame_field_name: string
  // Schema version (1 today; reserved for future migrations)
  schema_version: number
}

interface TemplateData {
  layers: TemplateLayer[]
}

interface TemplateLayerEditorProps {
  isOpen: boolean
  onClose: () => void
  poster: Poster
  onSave: (posterId: number, templateData: TemplateData) => Promise<void>
}

// ─── Constants ─────────────────────────────────────────────────────────

const ASPECT_RATIOS: Record<string, { w: number; h: number }> = {
  '1:1': { w: 400, h: 400 },
  '4:5': { w: 400, h: 500 },
  '9:16': { w: 340, h: 604 },
  '16:9': { w: 540, h: 304 },
  '2:3': { w: 400, h: 600 },
  '3:2': { w: 600, h: 400 },
  '3:4': { w: 400, h: 533 },
  '4:3': { w: 533, h: 400 },
  '2:1': { w: 600, h: 300 },
  '1:2': { w: 300, h: 600 },
  '2.35:1': { w: 600, h: 255 },
}

/**
 * Resolve a "W:H" string to canvas dimensions. Falls back to the lookup
 * above for the common cases, then to a parsed fraction so any ratio the
 * backend stores still gets a faithful preview (instead of being forced
 * into 1:1, which used to distort non-square posters in the layer
 * editor — the user saw rectangular posters squashed into a square
 * canvas with `cover` cropping the artwork).
 */
function resolveCanvasDims(aspectRatio: string): { w: number; h: number } {
  if (ASPECT_RATIOS[aspectRatio]) return ASPECT_RATIOS[aspectRatio]
  const m = /^([\d.]+):([\d.]+)$/.exec(aspectRatio || '')
  if (m) {
    const a = parseFloat(m[1])
    const b = parseFloat(m[2])
    if (a > 0 && b > 0) {
      // Anchor on the longer side at ~600px; preserve the actual ratio.
      if (a >= b) return { w: 600, h: Math.round((600 * b) / a) }
      return { w: Math.round((600 * a) / b), h: 600 }
    }
  }
  return ASPECT_RATIOS['1:1']
}

const FONT_FAMILIES = [
  'sans-serif', 'serif', 'monospace', 'cursive',
  'Arial', 'Georgia', 'Verdana', 'Times New Roman',
]

const inputClass = 'w-full bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-1.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50'
const labelClass = 'block text-xs font-medium text-brand-text-muted mb-1'
const sectionTitle = 'text-xs font-semibold text-brand-text-muted uppercase tracking-wider mb-2'

function createDefaultLayer(type: TemplateLayer['type'], zIndex: number): TemplateLayer {
  // Defaults mirror backend `posters/layer_schema.py::LAYER_DEFAULTS`
  // and Android `EditorLayer.kt`'s primary-constructor defaults. Keep
  // the three in sync — Phase 5 of the parity plan auto-generates this
  // from the JSON Schema.
  const base: TemplateLayer = {
    id: crypto.randomUUID(),
    type,
    content: '',
    x: 20, y: 30, width: 60, height: 12,
    rotation: 0, opacity: 1, z_index: zIndex,
    is_visible: true, is_locked: false,
    font_size: 24, font_family: 'sans-serif', font_color: '#FFFFFF',
    is_bold: false, is_italic: false, is_underline: false,
    letter_spacing: 0, text_align: 'center', line_spacing: 1.2,
    text_stroke_width: 0, text_stroke_color: '#000000',
    shape_type: 'rectangle', shape_color: '#F5A623',
    image_url: '', scale_type: 'centerCrop',
    blend_mode: 'normal',
    shadow_enabled: false, shadow_radius: 8, shadow_color: '#40000000',
    shadow_offset_x: 2, shadow_offset_y: 4,
    shape_gradient_enabled: false, shape_gradient_start: '', shape_gradient_end: '',
    shape_gradient_angle: 0,
    group_id: '',
    frame_config_json: '', frame_id: 0,
    frame_text_tag: false, frame_field_name: '',
    schema_version: 1,
  }
  if (type === 'text') return { ...base, content: 'Tap to edit' }
  if (type === 'image') return { ...base, x: 10, y: 10, width: 80, height: 60 }
  if (type === 'shape') return { ...base, x: 10, y: 10, width: 30, height: 30 }
  if (type === 'logo') return { ...base, x: 5, y: 5, width: 20, height: 20 }
  if (type === 'sticker') return { ...base, x: 10, y: 10, width: 25, height: 25 }
  if (type === 'frame') return { ...base, x: 0, y: 0, width: 100, height: 100 }
  return base
}

function typeIcon(type: string) {
  if (type === 'text') return <Type className="h-3.5 w-3.5" />
  if (type === 'image' || type === 'logo' || type === 'sticker') return <Image className="h-3.5 w-3.5" />
  return <Square className="h-3.5 w-3.5" />
}

// ─── SortableLayerItem ─────────────────────────────────────────────────

function SortableLayerItem({
  layer, isSelected, onSelect, onToggleVisible, onToggleLock, onRemove,
}: {
  layer: TemplateLayer
  isSelected: boolean
  onSelect: () => void
  onToggleVisible: () => void
  onToggleLock: () => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: layer.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      onClick={onSelect}
      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
        isSelected ? 'bg-brand-gold/10 border border-brand-gold/40' : 'bg-brand-dark hover:bg-brand-dark-hover border border-transparent'
      } ${!layer.is_visible ? 'opacity-50' : ''}`}
    >
      <div {...listeners} className="cursor-grab text-brand-text-muted hover:text-brand-text">
        <GripVertical className="h-3.5 w-3.5" />
      </div>
      <span className="text-brand-text-muted">{typeIcon(layer.type)}</span>
      <span className="flex-1 text-xs text-brand-text truncate min-w-0">
        {layer.type === 'text' ? (layer.content || 'Empty text') : layer.type === 'image' ? 'Image layer' : layer.type === 'logo' ? 'Logo' : layer.type === 'sticker' ? 'Sticker' : layer.type === 'frame' ? 'Frame overlay' : `Shape (${layer.shape_type})`}
      </span>
      <button onClick={e => { e.stopPropagation(); onToggleVisible() }} className="p-0.5 text-brand-text-muted hover:text-brand-text">
        {layer.is_visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
      </button>
      <button onClick={e => { e.stopPropagation(); onToggleLock() }} className="p-0.5 text-brand-text-muted hover:text-brand-text">
        {layer.is_locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
      </button>
      <button onClick={e => { e.stopPropagation(); onRemove() }} className="p-0.5 text-brand-text-muted hover:text-status-error">
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  )
}

// ─── CanvasPreview ─────────────────────────────────────────────────────

function CanvasPreview({
  layers, selectedLayerId, posterImageUrl, aspectRatio, onSelectLayer,
}: {
  layers: TemplateLayer[]
  selectedLayerId: string | null
  posterImageUrl: string
  aspectRatio: string
  onSelectLayer: (id: string | null) => void
}) {
  const ratio = resolveCanvasDims(aspectRatio)
  const sortedLayers = [...layers].sort((a, b) => a.z_index - b.z_index)

  return (
    <div
      className="relative bg-[#1a1a2e] rounded-lg overflow-hidden border border-brand-dark-border mx-auto"
      style={{
        width: ratio.w,
        height: ratio.h,
        backgroundImage: posterImageUrl ? `url(${posterImageUrl})` : undefined,
        // 2026-05-04: was `cover`, which CROPPED the poster when the
        // canvas dims didn't match the image's aspect (or when an
        // admin's stored aspect_ratio drifted from the file's actual
        // dimensions). `contain` preserves the upload faithfully —
        // the admin sees their poster as it really is, with the
        // backdrop showing through any letterbox.
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
      onClick={() => onSelectLayer(null)}
    >
      {!posterImageUrl && (
        <div className="absolute inset-0 flex items-center justify-center text-brand-text-muted text-xs">
          No background image
        </div>
      )}

      {sortedLayers.filter(l => l.is_visible).map(layer => {
        // Border-radius for the whole layer container honours `shape_type`
        // so a "circle"/"oval" photo zone shows a CIRCULAR outline /
        // placeholder, not a square one. Without this the gray placeholder
        // blob (and the selected-layer ring) draw a rectangle over circular
        // zones — which is what made the user's Christmas poster look
        // "broken" in the layer editor (a square gray box smothering the
        // circular cloud-and-hill placeholder area in the design).
        const shapeRadius =
          layer.shape_type === 'circle' || layer.shape_type === 'oval' ? '50%'
          : layer.shape_type === 'rounded_rect' ? '8px'
          : '0'
        return (
        <div
          key={layer.id}
          onClick={e => { e.stopPropagation(); onSelectLayer(layer.id) }}
          className={`absolute cursor-pointer transition-shadow ${
            selectedLayerId === layer.id ? 'ring-2 ring-brand-gold ring-offset-1 ring-offset-transparent' : ''
          }`}
          style={{
            left: `${layer.x}%`,
            top: `${layer.y}%`,
            width: `${layer.width}%`,
            height: `${layer.height}%`,
            opacity: layer.opacity,
            transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
            zIndex: layer.z_index,
            borderRadius: shapeRadius,
          }}
        >
          {layer.type === 'text' && (
            <div
              className="w-full h-full flex items-center overflow-hidden"
              style={{
                fontSize: `${Math.max(8, layer.font_size * (ratio.w / 1080))}px`,
                fontFamily: layer.font_family,
                color: layer.font_color,
                fontWeight: layer.is_bold ? 'bold' : 'normal',
                fontStyle: layer.is_italic ? 'italic' : 'normal',
                textAlign: layer.text_align,
                lineHeight: layer.line_spacing,
                justifyContent: layer.text_align === 'center' ? 'center' : layer.text_align === 'right' ? 'flex-end' : 'flex-start',
              }}
            >
              <span className="w-full">{layer.content || 'Empty text'}</span>
            </div>
          )}
          {layer.type === 'shape' && (
            <div
              className="w-full h-full"
              style={{
                backgroundColor: layer.shape_color,
                borderRadius: layer.shape_type === 'circle' ? '50%' : layer.shape_type === 'rounded_rect' ? '8px' : '0',
              }}
            />
          )}
          {['image', 'logo', 'sticker', 'frame'].includes(layer.type) && (
            <div className="w-full h-full relative" style={{ borderRadius: shapeRadius }}>
              {layer.image_url ? (
                <img
                  src={layer.image_url}
                  alt={layer.type}
                  className="w-full h-full"
                  style={{
                    objectFit: layer.scale_type === 'fitCenter' ? 'contain' : 'cover',
                    borderRadius: shapeRadius,
                  }}
                />
              ) : (
                // Empty image zone (the photo placeholder a user will fill
                // on the phone). Show a TRANSPARENT dashed outline + tiny
                // icon so the admin can still see the underlying poster
                // design through the zone. The previous bg-gray-600/50
                // fill smothered the design (circular cloud/hill area was
                // hidden behind a 50%-opacity gray rectangle), and the
                // missing border-radius made circular zones look square.
                <div
                  className="w-full h-full flex items-center justify-center border-2 border-dashed border-brand-gold/70 bg-brand-gold/5"
                  style={{ borderRadius: shapeRadius }}
                >
                  <Image className="h-5 w-5 text-brand-gold/80" />
                </div>
              )}
              {layer.type !== 'image' && (
                <span className="absolute top-0 right-0 bg-brand-gold text-gray-900 text-[8px] font-bold px-1 rounded-bl leading-tight">
                  {layer.type.toUpperCase()}
                </span>
              )}
            </div>
          )}
        </div>
        )
      })}
    </div>
  )
}

// ─── LayerPropertyPanel ────────────────────────────────────────────────

function LayerPropertyPanel({
  layer, onChange,
}: {
  layer: TemplateLayer
  onChange: (patch: Partial<TemplateLayer>) => void
}) {
  const numInput = (label: string, field: keyof TemplateLayer, min?: number, max?: number, step?: number) => (
    <div>
      <label className={labelClass}>{label}</label>
      <input
        type="number"
        value={layer[field] as number}
        onChange={e => onChange({ [field]: parseFloat(e.target.value) || 0 })}
        min={min} max={max} step={step}
        className={inputClass}
      />
    </div>
  )

  return (
    <div className="space-y-3">
      {/* Type */}
      <div>
        <label className={labelClass}>Type</label>
        <select value={layer.type} onChange={e => onChange({ type: e.target.value as TemplateLayer['type'] })} className={inputClass}>
          <option value="text">Text</option>
          <option value="image">Image</option>
          <option value="shape">Shape</option>
          <option value="logo">Logo</option>
          <option value="sticker">Sticker</option>
          <option value="frame">Frame</option>
        </select>
      </div>

      {/* Position & Size */}
      <p className={sectionTitle}>Position & Size</p>
      <div className="grid grid-cols-2 gap-2">
        {numInput('X (%)', 'x', 0, 100, 1)}
        {numInput('Y (%)', 'y', 0, 100, 1)}
        {numInput('Width (%)', 'width', 1, 100, 1)}
        {numInput('Height (%)', 'height', 1, 100, 1)}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {numInput('Rotation', 'rotation', -360, 360, 1)}
        {numInput('Opacity', 'opacity', 0, 1, 0.05)}
      </div>

      {/* Text properties */}
      {layer.type === 'text' && (
        <>
          <p className={sectionTitle}>Text</p>
          <div>
            <label className={labelClass}>Content</label>
            <textarea
              value={layer.content}
              onChange={e => onChange({ content: e.target.value })}
              rows={2}
              className={inputClass + ' resize-none'}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {numInput('Font Size', 'font_size', 6, 200, 1)}
            {numInput('Line Spacing', 'line_spacing', 0.5, 4, 0.1)}
          </div>
          <div>
            <label className={labelClass}>Font Family</label>
            <select value={layer.font_family} onChange={e => onChange({ font_family: e.target.value })} className={inputClass}>
              {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Font Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={layer.font_color}
                onChange={e => onChange({ font_color: e.target.value })}
                className="w-10 h-8 rounded border border-brand-dark-border cursor-pointer bg-transparent"
              />
              <input
                value={layer.font_color}
                onChange={e => onChange({ font_color: e.target.value })}
                className={inputClass}
                maxLength={7}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Align</label>
            <select value={layer.text_align} onChange={e => onChange({ text_align: e.target.value as TemplateLayer['text_align'] })} className={inputClass}>
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-xs text-brand-text-muted">
              <input type="checkbox" checked={layer.is_bold} onChange={e => onChange({ is_bold: e.target.checked })} className="rounded" />
              Bold
            </label>
            <label className="flex items-center gap-1.5 text-xs text-brand-text-muted">
              <input type="checkbox" checked={layer.is_italic} onChange={e => onChange({ is_italic: e.target.checked })} className="rounded" />
              Italic
            </label>
          </div>
        </>
      )}

      {/* Shape properties */}
      {layer.type === 'shape' && (
        <>
          <p className={sectionTitle}>Shape</p>
          <div>
            <label className={labelClass}>Shape Type</label>
            <select value={layer.shape_type} onChange={e => onChange({ shape_type: e.target.value })} className={inputClass}>
              <option value="rectangle">Rectangle</option>
              <option value="circle">Circle</option>
              <option value="rounded_rect">Rounded Rectangle</option>
              <option value="line_horizontal">Line</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Color</label>
            <div className="flex gap-2">
              <input type="color" value={layer.shape_color} onChange={e => onChange({ shape_color: e.target.value })} className="w-10 h-8 rounded border border-brand-dark-border cursor-pointer bg-transparent" />
              <input value={layer.shape_color} onChange={e => onChange({ shape_color: e.target.value })} className={inputClass} maxLength={7} />
            </div>
          </div>
        </>
      )}

      {/* Image properties (also for logo, sticker, frame) */}
      {['image', 'logo', 'sticker', 'frame'].includes(layer.type) && (
        <>
          <p className={sectionTitle}>Image</p>
          <div>
            <label className={labelClass}>Image URL</label>
            <input value={layer.image_url} onChange={e => onChange({ image_url: e.target.value })} className={inputClass} placeholder="https://..." />
          </div>
          <div>
            <label className={labelClass}>Scale Type</label>
            <select value={layer.scale_type} onChange={e => onChange({ scale_type: e.target.value })} className={inputClass}>
              <option value="centerCrop">Cover (Center Crop)</option>
              <option value="fitCenter">Contain (Fit Center)</option>
              <option value="fitXY">Stretch (Fit XY)</option>
            </select>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────

export default function TemplateLayerEditor({ isOpen, onClose, poster, onSave }: TemplateLayerEditorProps) {
  const { addToast } = useToast()
  const [layers, setLayers] = useState<TemplateLayer[]>([])
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)
  const [jsonMode, setJsonMode] = useState(false)
  const [jsonText, setJsonText] = useState('')
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // Initialize layers from poster template_data on open
  useEffect(() => {
    if (isOpen && poster) {
      const td = poster.template_data as Record<string, unknown> | null
      const raw = (td?.layers as TemplateLayer[]) ?? []
      setLayers(raw.map(l => ({ ...createDefaultLayer(l.type || 'text', 0), ...l })))
      setSelectedLayerId(null)
      setJsonMode(false)
    }
  }, [isOpen, poster])

  const selectedLayer = layers.find(l => l.id === selectedLayerId) ?? null

  const addLayer = useCallback((type: TemplateLayer['type']) => {
    const maxZ = layers.reduce((m, l) => Math.max(m, l.z_index), 0)
    const newLayer = createDefaultLayer(type, maxZ + 1)
    setLayers(prev => [...prev, newLayer])
    setSelectedLayerId(newLayer.id)
  }, [layers])

  const updateLayer = useCallback((id: string, patch: Partial<TemplateLayer>) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l))
  }, [])

  const removeLayer = useCallback((id: string) => {
    setLayers(prev => prev.filter(l => l.id !== id))
    setSelectedLayerId(prev => prev === id ? null : prev)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setLayers(prev => {
      const oldIdx = prev.findIndex(l => l.id === active.id)
      const newIdx = prev.findIndex(l => l.id === over.id)
      const reordered = arrayMove(prev, oldIdx, newIdx)
      return reordered.map((l, i) => ({ ...l, z_index: i }))
    })
  }, [])

  const toggleJsonMode = useCallback(() => {
    if (!jsonMode) {
      setJsonText(JSON.stringify({ layers }, null, 2))
      setJsonMode(true)
    } else {
      try {
        const parsed = JSON.parse(jsonText)
        if (!parsed.layers || !Array.isArray(parsed.layers)) {
          addToast('JSON must have a "layers" array', 'error')
          return
        }
        setLayers(parsed.layers.map((l: TemplateLayer) => ({ ...createDefaultLayer(l.type || 'text', 0), ...l })))
        setJsonMode(false)
      } catch {
        addToast('Invalid JSON', 'error')
      }
    }
  }, [jsonMode, jsonText, layers, addToast])

  const handleSave = useCallback(async () => {
    let finalLayers = layers
    if (jsonMode) {
      try {
        const parsed = JSON.parse(jsonText)
        if (!parsed.layers || !Array.isArray(parsed.layers)) {
          addToast('JSON must have a "layers" array', 'error')
          return
        }
        finalLayers = parsed.layers
      } catch {
        addToast('Invalid JSON — fix before saving', 'error')
        return
      }
    }
    setSaving(true)
    try {
      await onSave(poster.id, { layers: finalLayers })
      addToast('Template layers saved successfully')
      onClose()
    } catch {
      addToast('Failed to save layers', 'error')
    } finally {
      setSaving(false)
    }
  }, [layers, jsonMode, jsonText, poster, onSave, onClose, addToast])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Layers: ${poster.title}`} size="2xl">
      {jsonMode ? (
        /* ── JSON Mode ──────────────────────────────────────── */
        <div className="space-y-3">
          <textarea
            value={jsonText}
            onChange={e => setJsonText(e.target.value)}
            rows={22}
            className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-3 text-sm text-brand-text font-mono focus:outline-none focus:border-brand-gold/50 resize-none"
            spellCheck={false}
          />
        </div>
      ) : (
        /* ── Visual Mode ────────────────────────────────────── */
        <div className="flex gap-4" style={{ maxHeight: '72vh' }}>
          {/* Left: Canvas Preview */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex-1 flex items-center justify-center overflow-auto bg-brand-dark rounded-lg p-4">
              <CanvasPreview
                layers={layers}
                selectedLayerId={selectedLayerId}
                posterImageUrl={poster.image_url || poster.thumbnail_url || ''}
                aspectRatio={poster.aspect_ratio}
                onSelectLayer={setSelectedLayerId}
              />
            </div>
            {/* Add layer buttons */}
            <div className="flex gap-2 mt-3">
              <button onClick={() => addLayer('text')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">
                <Plus className="h-3 w-3" /> Text
              </button>
              <button onClick={() => addLayer('image')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">
                <Plus className="h-3 w-3" /> Image
              </button>
              <button onClick={() => addLayer('shape')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">
                <Plus className="h-3 w-3" /> Shape
              </button>
            </div>
          </div>

          {/* Right: Layer List + Properties */}
          <div className="w-72 flex-shrink-0 flex flex-col gap-3 overflow-hidden">
            {/* Layer List */}
            <div className="flex-shrink-0 overflow-y-auto" style={{ maxHeight: '35%' }}>
              <p className={sectionTitle}>Layers ({layers.length})</p>
              {layers.length === 0 ? (
                <p className="text-xs text-brand-text-muted py-4 text-center">No layers yet. Click + to add one.</p>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={layers.map(l => l.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-1">
                      {[...layers].reverse().map(layer => (
                        <SortableLayerItem
                          key={layer.id}
                          layer={layer}
                          isSelected={selectedLayerId === layer.id}
                          onSelect={() => setSelectedLayerId(layer.id)}
                          onToggleVisible={() => updateLayer(layer.id, { is_visible: !layer.is_visible })}
                          onToggleLock={() => updateLayer(layer.id, { is_locked: !layer.is_locked })}
                          onRemove={() => removeLayer(layer.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-brand-dark-border" />

            {/* Property Panel */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {selectedLayer ? (
                <LayerPropertyPanel
                  layer={selectedLayer}
                  onChange={patch => updateLayer(selectedLayer.id, patch)}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-brand-text-muted text-xs">
                  Select a layer to edit its properties
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Bar */}
      <div className="flex items-center justify-between pt-4 mt-4 border-t border-brand-dark-border">
        <button onClick={toggleJsonMode} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">
          {jsonMode ? <><ChevronLeft className="h-3.5 w-3.5" /> Visual Editor</> : <><Code className="h-3.5 w-3.5" /> Edit JSON</>}
        </button>
        <div className="flex gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Layers'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
