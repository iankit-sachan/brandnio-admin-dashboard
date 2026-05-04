import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
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
import WebFont from 'webfontloader'
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
 * Resolve canvas preview dimensions. Priority:
 *
 *   1. **Real pixel dimensions** (image_width/image_height from the
 *      uploaded file). The backend captures these on upload via
 *      Pillow. Using the actual aspect avoids the coarse `1:1` /
 *      `4:5` / `9:16` / `16:9` bucket-rounding that historically
 *      distorted non-standard uploads (e.g. a 1080×1200 image
 *      stored as `aspect_ratio='1:1'` — admin would render at 1:1
 *      but Android would render at the true 9:10, putting layers
 *      at different visual positions in each renderer).
 *   2. **Aspect ratio lookup** for the 11 supported strings.
 *   3. **Parsed "W:H" fraction** for any other ratio string.
 *   4. **1:1 fallback** when nothing parses.
 *
 * Output is anchored at 600px on the longer side so the preview fits
 * comfortably in the modal regardless of source resolution.
 */
function resolveCanvasDims(
  aspectRatio: string,
  imageWidth?: number | null,
  imageHeight?: number | null,
): { w: number; h: number } {
  // 1. Prefer real dims when both are present and positive.
  if (imageWidth && imageHeight && imageWidth > 0 && imageHeight > 0) {
    if (imageWidth >= imageHeight) {
      return { w: 600, h: Math.round((600 * imageHeight) / imageWidth) }
    }
    return { w: Math.round((600 * imageWidth) / imageHeight), h: 600 }
  }
  // 2. Lookup table.
  if (ASPECT_RATIOS[aspectRatio]) return ASPECT_RATIOS[aspectRatio]
  // 3. Parse arbitrary "W:H" strings.
  const m = /^([\d.]+):([\d.]+)$/.exec(aspectRatio || '')
  if (m) {
    const a = parseFloat(m[1])
    const b = parseFloat(m[2])
    if (a > 0 && b > 0) {
      if (a >= b) return { w: 600, h: Math.round((600 * b) / a) }
      return { w: Math.round((600 * a) / b), h: 600 }
    }
  }
  // 4. Final fallback.
  return ASPECT_RATIOS['1:1']
}

// Fonts available in both renderers. System fonts render natively in
// the browser; Google fonts get dynamically loaded by useGoogleFonts()
// below (and Android downloads the same families via FontManager.kt).
//
// Keep in sync with `android/app/src/main/java/com/brandnio/app/util/
// FontManager.kt` so a poster designed in admin always renders the
// same family on device.
const SYSTEM_FONTS = [
  'sans-serif', 'serif', 'monospace', 'cursive',
  'Arial', 'Georgia', 'Verdana', 'Times New Roman',
]
const GOOGLE_FONTS = [
  'Inter', 'Poppins', 'Roboto', 'Montserrat', 'Open Sans',
  'Lato', 'Oswald', 'Raleway', 'Bebas Neue', 'Playfair Display',
  'Khand', 'Mukta', 'Noto Sans Gujarati', 'Noto Sans Devanagari',
  'Hind', 'Tiro Devanagari Hindi',
]
const FONT_FAMILIES = [...SYSTEM_FONTS, ...GOOGLE_FONTS]

/** Convert an Android ARGB hex (#AARRGGBB) into a CSS-compatible rgba()
 *  string. CSS color hex doesn't support a leading alpha byte; the
 *  Android `shadowColor` default '#40000000' would otherwise parse as
 *  '#40000000' = colour `#40000000` truncated to first 6 chars. */
function argbToCssColor(argbOrHex: string): string {
  if (!argbOrHex) return 'rgba(0,0,0,0.25)'
  const m = /^#([0-9a-fA-F]{8})$/.exec(argbOrHex.trim())
  if (!m) return argbOrHex   // already CSS-friendly (#RRGGBB or rgba())
  const aa = parseInt(m[1].slice(0, 2), 16)
  const rr = parseInt(m[1].slice(2, 4), 16)
  const gg = parseInt(m[1].slice(4, 6), 16)
  const bb = parseInt(m[1].slice(6, 8), 16)
  return `rgba(${rr},${gg},${bb},${(aa / 255).toFixed(3)})`
}

/** Return a CSS clip-path or border-radius for a given shape_type.
 *  Hexagon is pointy-top (vertices at 12/6 o'clock) — Phase 4 will
 *  match Android's renderer to this orientation. */
function shapeStyle(shape: string): { borderRadius?: string; clipPath?: string } {
  switch (shape) {
    case 'circle':
    case 'oval':
      return { borderRadius: '50%' }
    case 'rounded_rect':
      return { borderRadius: '8px' }
    case 'hexagon':
      // Pointy-top hex: 12-o'clock vertex, 6-o'clock vertex, four sides.
      return { clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }
    case 'line_horizontal':
      return { borderRadius: '0' }
    default:
      return { borderRadius: '0' }
  }
}

/** Build a CSS `linear-gradient` from layer gradient props.
 *  Returns null when gradient disabled or any colour missing. */
function gradientCss(layer: TemplateLayer): string | null {
  if (!layer.shape_gradient_enabled) return null
  const start = layer.shape_gradient_start
  const end = layer.shape_gradient_end
  if (!start || !end) return null
  const angle = layer.shape_gradient_angle || 0
  return `linear-gradient(${angle}deg, ${start}, ${end})`
}

/** Map Android `scale_type` values to CSS `objectFit` + `objectPosition`. */
function scaleTypeStyle(scale: string): { objectFit: 'cover' | 'contain' | 'fill' | 'none'; objectPosition: string } {
  switch (scale) {
    case 'fitCenter': return { objectFit: 'contain', objectPosition: 'center' }
    case 'fitXY':     return { objectFit: 'fill', objectPosition: 'center' }     // stretch
    case 'centerInside': return { objectFit: 'none', objectPosition: 'center' }  // no scale-up
    case 'centerCrop':
    default:           return { objectFit: 'cover', objectPosition: 'center' }
  }
}

/** Hook: dynamically load any Google Fonts referenced by [layers].
 *  Uses webfontloader so Android-side `FontManager` parity is achievable
 *  without bundling 50+ font files into the admin SPA. Idempotent: re-
 *  triggered loads of the same family are deduped by webfontloader. */
function useGoogleFonts(layers: TemplateLayer[]) {
  const families = useMemo(() => {
    const out = new Set<string>()
    for (const l of layers) {
      const f = (l.font_family || '').trim()
      if (f && (GOOGLE_FONTS as readonly string[]).includes(f)) out.add(f)
    }
    return Array.from(out)
  }, [layers])

  useEffect(() => {
    if (families.length === 0) return
    WebFont.load({
      google: {
        // webfontloader expects 'Family:weights' — request 400+700 for each.
        families: families.map(f => `${f}:400,700`),
      },
      // Defensive: a network error mustn't break the editor; let the
      // browser fall back to the next font in the CSS stack.
      timeout: 5000,
    })
  }, [families])
}

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

// Drag-to-edit support. Eight handle positions plus a 'move' mode for
// the body grab. Names follow CSS resize-direction conventions so the
// cursor mapping is straightforward.
type DragMode = 'move' | 'nw' | 'n' | 'ne' | 'w' | 'e' | 'sw' | 's' | 'se'

interface DragState {
  layerId: string
  mode: DragMode
  pointerId: number
  startMouseX: number
  startMouseY: number
  startX: number
  startY: number
  startW: number
  startH: number
  moved: boolean   // true once cursor has moved past the click-threshold
}

const CLICK_THRESHOLD_PX = 3
const SNAP_PCT = 0.5    // snap drag updates to half-percent steps
const MIN_DIM_PCT = 2

function CanvasPreview({
  layers, selectedLayerId, posterImageUrl, aspectRatio,
  imageWidth, imageHeight, onSelectLayer, onUpdateLayer,
}: {
  layers: TemplateLayer[]
  selectedLayerId: string | null
  posterImageUrl: string
  aspectRatio: string
  imageWidth?: number | null
  imageHeight?: number | null
  onSelectLayer: (id: string | null) => void
  onUpdateLayer: (id: string, patch: Partial<TemplateLayer>) => void
}) {
  const ratio = resolveCanvasDims(aspectRatio, imageWidth, imageHeight)
  const sortedLayers = [...layers].sort((a, b) => a.z_index - b.z_index)

  // Lazy-load any Google fonts referenced by these layers so the canvas
  // shows the correct typeface, matching Android's FontManager.
  useGoogleFonts(layers)

  // Drag-to-edit state. The canvas rect is captured in `canvasRef` so
  // pointer deltas convert to canvas-percentage units regardless of the
  // window scroll position or the modal's flex layout. `useRef` keeps
  // the drag state across pointer events without re-rendering on every
  // mousemove (we re-render via onUpdateLayer, which propagates the
  // change to layer state).
  const canvasRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)

  const beginDrag = (
    e: React.PointerEvent<HTMLDivElement>,
    layerId: string,
    mode: DragMode,
  ) => {
    const layer = layers.find(l => l.id === layerId)
    if (!layer || layer.is_locked) return
    e.stopPropagation()
    e.preventDefault()
    // Capture the pointer so subsequent moves go to the same target
    // even if the cursor leaves the handle's bounding box.
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    dragRef.current = {
      layerId, mode,
      pointerId: e.pointerId,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: layer.x, startY: layer.y,
      startW: layer.width, startH: layer.height,
      moved: false,
    }
    onSelectLayer(layerId)
  }

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return

    const dxAbs = e.clientX - drag.startMouseX
    const dyAbs = e.clientY - drag.startMouseY
    if (!drag.moved &&
        Math.abs(dxAbs) <= CLICK_THRESHOLD_PX &&
        Math.abs(dyAbs) <= CLICK_THRESHOLD_PX) {
      return  // still potentially a click, don't mutate the layer yet
    }
    drag.moved = true

    const dxPct = (dxAbs / rect.width) * 100
    const dyPct = (dyAbs / rect.height) * 100

    let nx = drag.startX
    let ny = drag.startY
    let nw = drag.startW
    let nh = drag.startH

    if (drag.mode === 'move') {
      nx = drag.startX + dxPct
      ny = drag.startY + dyPct
    } else {
      const m = drag.mode
      // West edges move x AND adjust width inversely.
      if (m.includes('w')) { nx = drag.startX + dxPct; nw = drag.startW - dxPct }
      if (m.includes('e')) { nw = drag.startW + dxPct }
      if (m.includes('n')) { ny = drag.startY + dyPct; nh = drag.startH - dyPct }
      if (m.includes('s')) { nh = drag.startH + dyPct }
    }

    // Snap + constrain.
    nw = Math.max(MIN_DIM_PCT, Math.min(100, Math.round(nw / SNAP_PCT) * SNAP_PCT))
    nh = Math.max(MIN_DIM_PCT, Math.min(100, Math.round(nh / SNAP_PCT) * SNAP_PCT))
    nx = Math.max(-20, Math.min(100 - nw, Math.round(nx / SNAP_PCT) * SNAP_PCT))
    ny = Math.max(-20, Math.min(100 - nh, Math.round(ny / SNAP_PCT) * SNAP_PCT))

    onUpdateLayer(drag.layerId, { x: nx, y: ny, width: nw, height: nh })
  }

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    dragRef.current = null
    // If the pointer never moved past CLICK_THRESHOLD, treat as a plain
    // click (selection only — the body-grab path does that anyway).
    // No special handling needed; we just clear drag state.
  }

  return (
    <div
      ref={canvasRef}
      className="relative bg-[#1a1a2e] rounded-lg overflow-hidden border border-brand-dark-border mx-auto"
      style={{
        width: ratio.w,
        height: ratio.h,
        backgroundImage: posterImageUrl ? `url(${posterImageUrl})` : undefined,
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        // touchAction:none lets us preventDefault on pointer events so
        // mobile drag of resize handles doesn't trigger the page scroll.
        touchAction: 'none',
      }}
      onClick={() => onSelectLayer(null)}
      onPointerMove={handleMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {!posterImageUrl && (
        <div className="absolute inset-0 flex items-center justify-center text-brand-text-muted text-xs">
          No background image
        </div>
      )}

      {sortedLayers.filter(l => l.is_visible).map(layer => {
        // shapeStyle returns either border-radius (circle/oval/rounded_rect)
        // or clip-path (hexagon) — both work as masks on the layer container
        // and any nested image / placeholder. This is what makes a circular
        // photo zone show as a circle (not a square gray box) in the editor.
        const shape = shapeStyle(layer.shape_type)

        // Layer container style — geometry, rotation, opacity, z-index,
        // shape mask, and blend mode (Phase 4 will mirror this on Android).
        const containerStyle: React.CSSProperties = {
          left: `${layer.x}%`,
          top: `${layer.y}%`,
          width: `${layer.width}%`,
          height: `${layer.height}%`,
          opacity: layer.opacity,
          transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
          zIndex: layer.z_index,
          ...shape,
          // Blend mode: 'normal' is the default (omit to avoid `mix-blend-mode: normal`
          // which would create a stacking context unnecessarily).
          ...(layer.blend_mode && layer.blend_mode !== 'normal'
            ? { mixBlendMode: layer.blend_mode as React.CSSProperties['mixBlendMode'] }
            : {}),
        }

        const isSelected = selectedLayerId === layer.id
        return (
        <div
          key={layer.id}
          onClick={e => { e.stopPropagation(); onSelectLayer(layer.id) }}
          onPointerDown={e => {
            // Body grab — drag to move. Skip when locked (admin can't
            // accidentally move a locked detector layer like the bg).
            // Right-click / middle-click pass through.
            if (e.button !== 0 || layer.is_locked) return
            beginDrag(e, layer.id, 'move')
          }}
          className={`absolute transition-shadow ${
            isSelected ? 'ring-2 ring-brand-gold ring-offset-1 ring-offset-transparent' : ''
          }`}
          style={{
            ...containerStyle,
            cursor: layer.is_locked ? 'pointer' : 'move',
          }}
        >
          {layer.type === 'text' && (() => {
            // Build the text-effect style additively so missing/empty
            // properties don't generate stray CSS.
            const effects: React.CSSProperties = {}

            // Stroke (CSS `-webkit-text-stroke`). Android renders this via
            // a 2-pass STROKE→FILL paint; the CSS spec uses a single
            // property and is widely supported in modern browsers.
            if (layer.text_stroke_width > 0) {
              const strokePx = Math.max(0, layer.text_stroke_width * (ratio.w / 1080))
              effects.WebkitTextStroke = `${strokePx}px ${layer.text_stroke_color || '#000000'}`
            }

            // Drop shadow (CSS `text-shadow`). Android writes ARGB hex
            // (e.g. '#40000000'); CSS only understands #RRGGBB or rgba()
            // so argbToCssColor rewrites the leading alpha byte.
            if (layer.shadow_enabled) {
              const ox = layer.shadow_offset_x * (ratio.w / 1080)
              const oy = layer.shadow_offset_y * (ratio.w / 1080)
              const blur = layer.shadow_radius * (ratio.w / 1080)
              effects.textShadow =
                `${ox}px ${oy}px ${blur}px ${argbToCssColor(layer.shadow_color)}`
            }

            // Underline (CSS `textDecoration`).
            if (layer.is_underline) {
              effects.textDecoration = 'underline'
            }

            // Letter spacing — Android applies `paint.letterSpacing = ls/10f`
            // (em-relative). Match the same scale here so a poster designed
            // with letter_spacing=5 looks the same in both renderers.
            if (layer.letter_spacing) {
              effects.letterSpacing = `${layer.letter_spacing / 10}em`
            }

            return (
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
                  ...effects,
                }}
              >
                <span className="w-full">{layer.content || 'Empty text'}</span>
              </div>
            )
          })()}
          {layer.type === 'shape' && (() => {
            // Gradient fill (CSS `linear-gradient`). When disabled or any
            // colour missing, fall back to solid `shape_color`.
            const gradient = gradientCss(layer)
            return (
              <div
                className="w-full h-full"
                style={
                  gradient
                    ? { background: gradient, ...shape }
                    : { backgroundColor: layer.shape_color, ...shape }
                }
              />
            )
          })()}
          {['image', 'logo', 'sticker', 'frame'].includes(layer.type) && (() => {
            const fit = scaleTypeStyle(layer.scale_type)
            return (
              <div className="w-full h-full relative" style={shape}>
                {layer.image_url ? (
                  <img
                    src={layer.image_url}
                    alt={layer.type}
                    className="w-full h-full"
                    style={{
                      objectFit: fit.objectFit,
                      objectPosition: fit.objectPosition,
                      ...shape,
                    }}
                  />
                ) : (
                  // Empty image zone — transparent dashed outline so the
                  // admin sees the underlying poster design through the
                  // placeholder. (The previous bg-gray-600/50 fill smothered
                  // the design, hiding the cloud/hill area behind a gray box.)
                  <div
                    className="w-full h-full flex items-center justify-center border-2 border-dashed border-brand-gold/70 bg-brand-gold/5"
                    style={shape}
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
            )
          })()}

          {/* Resize handles — only show on the selected layer, only when
              not locked. 8 handles + 1 invisible body-grab (the layer's
              own onPointerDown handles 'move'). Handles render OUTSIDE
              the shape clip so they're never hidden by hexagon /
              circular masks. */}
          {isSelected && !layer.is_locked && (
            <>
              {(['nw','n','ne','w','e','sw','s','se'] as const).map(mode => {
                // Position is the centre of each handle, in % of the
                // layer (0=left/top, 50=middle, 100=right/bottom).
                const pos: Record<DragMode, { left: string; top: string; cursor: string }> = {
                  move: { left: '50%', top: '50%', cursor: 'move' },
                  nw:   { left: '0%',  top: '0%',  cursor: 'nwse-resize' },
                  n:    { left: '50%', top: '0%',  cursor: 'ns-resize' },
                  ne:   { left: '100%',top: '0%',  cursor: 'nesw-resize' },
                  w:    { left: '0%',  top: '50%', cursor: 'ew-resize' },
                  e:    { left: '100%',top: '50%', cursor: 'ew-resize' },
                  sw:   { left: '0%',  top: '100%',cursor: 'nesw-resize' },
                  s:    { left: '50%', top: '100%',cursor: 'ns-resize' },
                  se:   { left: '100%',top: '100%',cursor: 'nwse-resize' },
                }
                const p = pos[mode]
                return (
                  <div
                    key={mode}
                    onPointerDown={e => beginDrag(e, layer.id, mode)}
                    style={{
                      position: 'absolute',
                      left: p.left,
                      top: p.top,
                      width: 12,
                      height: 12,
                      transform: 'translate(-50%, -50%)',
                      background: '#FFD700',
                      border: '2px solid #1a1a2e',
                      borderRadius: '50%',
                      cursor: p.cursor,
                      // The handle MUST escape the parent clip-path /
                      // border-radius — `clip-path` clips children, but
                      // setting `clip-path: none` on the handle itself
                      // doesn't unclip it from the parent. The trick is
                      // `pointer-events:auto` so the handle stays
                      // interactive, plus a high z-index so it renders
                      // above shape masks.
                      zIndex: 9999,
                      pointerEvents: 'auto',
                      // Belt & braces: explicit cursor wins over
                      // parent's `move` cursor.
                      touchAction: 'none',
                    }}
                  />
                )
              })}
            </>
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
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-1.5 text-xs text-brand-text-muted">
              <input type="checkbox" checked={layer.is_bold} onChange={e => onChange({ is_bold: e.target.checked })} className="rounded" />
              Bold
            </label>
            <label className="flex items-center gap-1.5 text-xs text-brand-text-muted">
              <input type="checkbox" checked={layer.is_italic} onChange={e => onChange({ is_italic: e.target.checked })} className="rounded" />
              Italic
            </label>
            <label className="flex items-center gap-1.5 text-xs text-brand-text-muted">
              <input type="checkbox" checked={layer.is_underline} onChange={e => onChange({ is_underline: e.target.checked })} className="rounded" />
              Underline
            </label>
          </div>
          <div>
            {numInput('Letter Spacing', 'letter_spacing', -10, 50, 0.5)}
          </div>

          {/* Stroke (CSS -webkit-text-stroke ~ Android OutlineTextView) */}
          <p className={sectionTitle}>Stroke / Outline</p>
          <div className="grid grid-cols-2 gap-2">
            {numInput('Stroke Width', 'text_stroke_width', 0, 20, 0.5)}
            <div>
              <label className={labelClass}>Stroke Color</label>
              <div className="flex gap-1">
                <input
                  type="color"
                  value={layer.text_stroke_color}
                  onChange={e => onChange({ text_stroke_color: e.target.value })}
                  className="w-9 h-8 rounded border border-brand-dark-border cursor-pointer bg-transparent"
                />
                <input
                  value={layer.text_stroke_color}
                  onChange={e => onChange({ text_stroke_color: e.target.value })}
                  className={inputClass}
                  maxLength={7}
                />
              </div>
            </div>
          </div>

          {/* Shadow (CSS text-shadow ~ Android setShadowLayer) */}
          <p className={sectionTitle}>Shadow</p>
          <label className="flex items-center gap-1.5 text-xs text-brand-text-muted">
            <input
              type="checkbox"
              checked={layer.shadow_enabled}
              onChange={e => onChange({ shadow_enabled: e.target.checked })}
              className="rounded"
            />
            Enable shadow
          </label>
          {layer.shadow_enabled && (
            <>
              <div className="grid grid-cols-3 gap-2">
                {numInput('Radius', 'shadow_radius', 0, 100, 1)}
                {numInput('Offset X', 'shadow_offset_x', -50, 50, 1)}
                {numInput('Offset Y', 'shadow_offset_y', -50, 50, 1)}
              </div>
              <div>
                <label className={labelClass}>Color (#AARRGGBB or #RRGGBB)</label>
                <input
                  value={layer.shadow_color}
                  onChange={e => onChange({ shadow_color: e.target.value })}
                  className={inputClass}
                  maxLength={9}
                  placeholder="#40000000"
                />
              </div>
            </>
          )}
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
              <option value="oval">Oval</option>
              <option value="rounded_rect">Rounded Rectangle</option>
              <option value="hexagon">Hexagon</option>
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

          {/* Gradient (CSS linear-gradient ~ Android GradientDrawable) */}
          <p className={sectionTitle}>Gradient</p>
          <label className="flex items-center gap-1.5 text-xs text-brand-text-muted">
            <input
              type="checkbox"
              checked={layer.shape_gradient_enabled}
              onChange={e => onChange({ shape_gradient_enabled: e.target.checked })}
              className="rounded"
            />
            Enable gradient
          </label>
          {layer.shape_gradient_enabled && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>Start</label>
                  <div className="flex gap-1">
                    <input type="color" value={layer.shape_gradient_start || '#000000'} onChange={e => onChange({ shape_gradient_start: e.target.value })} className="w-9 h-8 rounded border border-brand-dark-border cursor-pointer bg-transparent" />
                    <input value={layer.shape_gradient_start} onChange={e => onChange({ shape_gradient_start: e.target.value })} className={inputClass} maxLength={7} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>End</label>
                  <div className="flex gap-1">
                    <input type="color" value={layer.shape_gradient_end || '#FFFFFF'} onChange={e => onChange({ shape_gradient_end: e.target.value })} className="w-9 h-8 rounded border border-brand-dark-border cursor-pointer bg-transparent" />
                    <input value={layer.shape_gradient_end} onChange={e => onChange({ shape_gradient_end: e.target.value })} className={inputClass} maxLength={7} />
                  </div>
                </div>
              </div>
              {numInput('Angle (deg)', 'shape_gradient_angle', 0, 360, 1)}
              <p className="text-[10px] text-brand-text-muted">
                Android currently snaps angles to 0/90/180/270; Phase 4 unlocks arbitrary angles.
              </p>
            </>
          )}
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
              <option value="centerInside">Center Inside (no upscale)</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Shape (mask)</label>
            <select value={layer.shape_type} onChange={e => onChange({ shape_type: e.target.value })} className={inputClass}>
              <option value="rectangle">Rectangle</option>
              <option value="circle">Circle</option>
              <option value="oval">Oval</option>
              <option value="rounded_rect">Rounded Rectangle</option>
              <option value="hexagon">Hexagon</option>
            </select>
          </div>
        </>
      )}

      {/* Blend mode (CSS mix-blend-mode ~ Android RenderNode.setBlendMode API 29+) */}
      <p className={sectionTitle}>Blend Mode</p>
      <select
        value={layer.blend_mode}
        onChange={e => onChange({ blend_mode: e.target.value })}
        className={inputClass}
      >
        <option value="normal">Normal</option>
        <option value="multiply">Multiply</option>
        <option value="screen">Screen</option>
        <option value="overlay">Overlay</option>
        <option value="darken">Darken</option>
        <option value="lighten">Lighten</option>
        <option value="color-dodge">Color Dodge</option>
        <option value="color-burn">Color Burn</option>
      </select>
      {layer.blend_mode !== 'normal' && (
        <p className="text-[10px] text-brand-text-muted">
          Android requires API 29+ to honour blend modes; older devices fall back to normal.
        </p>
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
                imageWidth={poster.image_width}
                imageHeight={poster.image_height}
                onSelectLayer={setSelectedLayerId}
                onUpdateLayer={updateLayer}
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
