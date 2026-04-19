/**
 * Draggable / resizable text-area overlay.
 *
 * Self-contained: uses pointer events directly (no external dep) so we don't
 * bloat the admin bundle. Supports drag, 8 resize handles, snap guides via
 * the shared ``snapEngine``, and keyboard nudge (arrows = 1px, Shift+arrows = 10px).
 */
import { useCallback, useEffect, useRef } from 'react'
import { fieldOption } from './constants'
import { snapRect, SnapGuide } from './snapEngine'
import type { TextAreaLayer } from './StylePanel'

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'move'

export function TextAreaOverlay({
  layer,
  isSelected,
  canvasW,
  canvasH,
  screenScale,
  siblings,
  onSelect,
  onChange,
  onCommit,
  onGuidesChange,
}: {
  layer: TextAreaLayer
  isSelected: boolean
  canvasW: number
  canvasH: number
  /** DOM pixels per design pixel (for translating pointer deltas). */
  screenScale: number
  /** Rects of other text areas used by snap engine. */
  siblings: { x: number; y: number; w: number; h: number }[]
  onSelect: () => void
  /** Called during drag with live coords (no undo). */
  onChange: (patch: Partial<TextAreaLayer>) => void
  /** Called on pointer-up to record an undo step. */
  onCommit: () => void
  onGuidesChange: (g: SnapGuide[]) => void
}) {
  const dragState = useRef<{
    handle: Handle
    startX: number
    startY: number
    startRect: { x: number; y: number; w: number; h: number }
  } | null>(null)

  const startDrag = useCallback((handle: Handle, e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    e.preventDefault()
    onSelect()
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
    dragState.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startRect: { x: layer.x, y: layer.y, w: layer.width, h: layer.height },
    }
  }, [layer, onSelect])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const s = dragState.current
    if (!s) return
    const dxDesign = (e.clientX - s.startX) / screenScale
    const dyDesign = (e.clientY - s.startY) / screenScale
    let { x, y, w, h } = s.startRect

    switch (s.handle) {
      case 'move': x += dxDesign; y += dyDesign; break
      case 'n':    y += dyDesign; h -= dyDesign; break
      case 's':    h += dyDesign; break
      case 'w':    x += dxDesign; w -= dxDesign; break
      case 'e':    w += dxDesign; break
      case 'nw':   x += dxDesign; y += dyDesign; w -= dxDesign; h -= dyDesign; break
      case 'ne':   y += dyDesign; w += dxDesign; h -= dyDesign; break
      case 'sw':   x += dxDesign; w -= dxDesign; h += dyDesign; break
      case 'se':   w += dxDesign; h += dyDesign; break
    }

    // Minimum size guard
    w = Math.max(20, w)
    h = Math.max(20, h)

    // Snap against canvas + siblings
    const snap = snapRect({ x, y, w, h }, canvasW, canvasH, siblings)
    onChange({ x: snap.rect.x, y: snap.rect.y, width: snap.rect.w, height: snap.rect.h })
    onGuidesChange(snap.guides)
  }, [canvasW, canvasH, onChange, onGuidesChange, screenScale, siblings])

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current) return
    ;(e.currentTarget as Element).releasePointerCapture?.(e.pointerId)
    dragState.current = null
    onGuidesChange([])
    onCommit()
  }, [onCommit, onGuidesChange])

  // Keyboard nudge while selected
  useEffect(() => {
    if (!isSelected) return
    const handler = (e: KeyboardEvent) => {
      // Only react to arrow keys
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return
      // Ignore when user is typing in an input
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      e.preventDefault()
      const step = e.shiftKey ? 10 : 1
      const patch: Partial<TextAreaLayer> = {}
      if (e.key === 'ArrowLeft')  patch.x = layer.x - step
      if (e.key === 'ArrowRight') patch.x = layer.x + step
      if (e.key === 'ArrowUp')    patch.y = layer.y - step
      if (e.key === 'ArrowDown')  patch.y = layer.y + step
      onChange(patch)
      onCommit()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isSelected, layer.x, layer.y, onChange, onCommit])

  const f = fieldOption(layer.name)
  const displayText = (layer.type === 'text' ? (layer.text || f?.placeholder || layer.name) : '')

  return (
    <div
      className="absolute cursor-move"
      style={{
        left: layer.x,
        top: layer.y,
        width: layer.width,
        height: layer.height,
        outline: isSelected ? '2px solid #06b6d4' : '1px dashed rgba(255,255,255,0.7)',
        outlineOffset: isSelected ? '0' : '0',
        boxShadow: isSelected ? '0 0 0 3px rgba(6,182,212,0.25)' : 'none',
        background: layer.type === 'image'
          ? 'rgba(255,255,255,0.15)'
          : 'rgba(0,0,0,0.25)',
      }}
      onPointerDown={e => startDrag('move', e)}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClick={e => { e.stopPropagation(); onSelect() }}
    >
      {/* Label */}
      <div
        className="absolute inset-0 flex items-center pointer-events-none px-1 truncate"
        style={{
          color: layer.color ?? '#ffffff',
          fontFamily: layer.font ?? 'Inter',
          fontWeight: layer.weight ?? 'normal',
          fontStyle: layer.italic ? 'italic' : 'normal',
          fontSize: (layer.size ?? 24),
          justifyContent: layer.justification === 'center'
            ? 'center'
            : layer.justification === 'right' ? 'flex-end' : 'flex-start',
          textShadow: '0 0 2px rgba(0,0,0,0.6)',
        }}
      >
        {layer.type === 'image' ? (
          <span className="text-white/90 text-xs bg-black/40 px-1 rounded">{f?.icon} {f?.label}</span>
        ) : displayText}
      </div>

      {/* Resize handles — only when selected */}
      {isSelected && (
        <>
          {(['nw','n','ne','e','se','s','sw','w'] as Handle[]).map(h => (
            <div
              key={h}
              className="absolute w-2.5 h-2.5 bg-cyan-400 border border-white rounded-sm"
              style={{
                ...handlePosition(h),
                cursor: handleCursor(h),
                pointerEvents: 'auto',
              }}
              onPointerDown={e => startDrag(h, e)}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            />
          ))}
        </>
      )}
    </div>
  )
}

function handlePosition(h: Handle): React.CSSProperties {
  // -5px offset so the 10px handle centers on the edge
  const a = -5
  switch (h) {
    case 'nw': return { left: a, top: a }
    case 'n':  return { left: '50%', top: a, marginLeft: a }
    case 'ne': return { right: a, top: a }
    case 'e':  return { right: a, top: '50%', marginTop: a }
    case 'se': return { right: a, bottom: a }
    case 's':  return { left: '50%', bottom: a, marginLeft: a }
    case 'sw': return { left: a, bottom: a }
    case 'w':  return { left: a, top: '50%', marginTop: a }
    default:   return {}
  }
}

function handleCursor(h: Handle): string {
  return {
    n: 'ns-resize', s: 'ns-resize',
    e: 'ew-resize', w: 'ew-resize',
    nw: 'nwse-resize', se: 'nwse-resize',
    ne: 'nesw-resize', sw: 'nesw-resize',
    move: 'move',
  }[h]
}
