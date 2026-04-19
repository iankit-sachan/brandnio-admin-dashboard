/**
 * The Text Area Designer — the big piece of the 2026-04 redesign.
 *
 * Opens after a frame is uploaded (or when admin clicks "Edit" on an existing
 * frame). Composes:
 *   - FrameCanvas        — PNG + text-area overlays + safe zone + snap guides
 *   - FieldPickerDialog  — 2×4 grid of field types
 *   - StylePanel         — per-selected-area styling
 *   - VersionHistoryDrawer — rollback
 *   - Sidebar list       — mirrors PDF screenshot 3 right column
 *   - Toolbar            — Undo/Redo/Duplicate/SafeZone toggle/Version history/Preview-as-user/Save
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { posterFramesApi } from '../../../services/admin-api'
import { useToast } from '../../../context/ToastContext'
import { ASPECT_RATIO_DIMS, FIELD_OPTIONS, FieldOption, fieldOption } from './constants'
import { FieldPickerDialog } from './FieldPickerDialog'
import { FrameCanvas } from './FrameCanvas'
import { StylePanel, TextAreaLayer } from './StylePanel'
import { useUndoRedo } from './useUndoRedo'
import { VersionHistoryDrawer } from './VersionHistoryDrawer'

/** Shape of the frame row returned by the unified admin API. */
export interface PosterFrameRow {
  id: number
  name: string
  type: string
  frame_type: string
  category: string
  aspect_ratio: string
  tags: string[]
  is_premium: boolean
  is_featured: boolean
  is_active: boolean
  show_frame_name: boolean
  sort_order: number
  usage_count: number
  thumbnail_url: string
  overlay_image_url: string
  config_json: {
    type?: string
    canvasSize?: number
    canvasHeight?: number
    layers?: Array<Record<string, unknown>>
  }
  assigned_user: number | null
}

function uuid() {
  return (crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
}

/** Build a fresh TextAreaLayer from a field option, centered on the canvas. */
function layerFromField(field: FieldOption, canvasW: number, canvasH: number): TextAreaLayer {
  const w = Math.round(canvasW * field.defaultWidth)
  const h = Math.round(canvasH * field.defaultHeight)
  return {
    id: uuid(),
    name: field.key,
    type: field.type,
    x: Math.round((canvasW - w) / 2),
    y: Math.round((canvasH - h) / 2),
    width: w,
    height: h,
    text: field.placeholder,
    size: field.defaultFontSize,
    font: 'Inter',
    color: '#ffffff',
    weight: 'normal',
    justification: 'center',
    ...(field.type === 'image' ? { url: '' } : {}),
  }
}

/** Convert ``config_json.layers`` to the designer's in-memory TextAreaLayer.
 *
 *  Layers that represent the FRAME BACKDROP — not user-editable placeholders —
 *  are filtered out so they don't show up as draggable rectangles:
 *    - ``name === 'bg'``    — legacy convention (dimension marker)
 *    - ``name === 'frame'`` — current convention, produced by PosterFrame.save()
 *                             when admin uploads a PNG; it renders the overlay PNG
 */
function hydrateLayers(rawLayers: Array<Record<string, unknown>>): TextAreaLayer[] {
  return rawLayers
    .filter(l => {
      const n = (l.name as string) ?? ''
      return n !== 'bg' && n !== 'frame'
    })
    .map(l => ({
      id: (l.id as string) ?? uuid(),
      name: (l.name as string) ?? 'custom',
      type: ((l.type as string) === 'image' ? 'image' : 'text') as 'image' | 'text',
      x: Number(l.x ?? 0),
      y: Number(l.y ?? 0),
      width: Number(l.width ?? 200),
      height: Number(l.height ?? 40),
      text: (l.text as string) ?? '',
      size: Number(l.size ?? 24),
      font: (l.font as string) ?? 'Inter',
      color: (l.color as string) ?? '#ffffff',
      weight: ((l.weight as string) === 'bold' ? 'bold' : 'normal') as 'bold' | 'normal',
      justification: ((l.justification as string) ?? 'left') as 'left' | 'center' | 'right',
      url: (l.url as string) ?? '',
    }))
}

/** Convert the designer's in-memory layers back to ``config_json.layers``.
 *
 *  We emit TWO backdrop entries so both old and new Android renderer paths work:
 *    - ``name='bg'``    — legacy dimension marker (skipped on draw)
 *    - ``name='frame'`` — actual PNG overlay, drawn full-canvas via drawOverlayImage
 *
 *  Without the 'frame' entry, the FrameRenderer's multi-layer path would only
 *  draw text/logo placeholders on a transparent bitmap — the frame image itself
 *  would be MISSING on the final rendered poster.
 */
function dehydrateLayers(layers: TextAreaLayer[], canvasW: number, canvasH: number, bgUrl: string) {
  const bgMarker = {
    type: 'image', name: 'bg',
    x: 0, y: 0, width: canvasW, height: canvasH,
    url: bgUrl,
  }
  const frameBackdrop = {
    type: 'image', name: 'frame',
    x: 0, y: 0, width: canvasW, height: canvasH,
    url: bgUrl,
  }
  const rest = layers.map(l => {
    if (l.type === 'image') {
      return {
        type: 'image', name: l.name,
        x: l.x, y: l.y, width: l.width, height: l.height,
        url: l.url ?? '',
      }
    }
    return {
      type: 'text', name: l.name,
      x: l.x, y: l.y, width: l.width, height: l.height,
      text: l.text ?? '',
      size: l.size ?? 24,
      font: l.font ?? 'Inter',
      color: l.color ?? '#ffffff',
      weight: l.weight ?? 'normal',
      justification: l.justification ?? 'left',
    }
  })
  return [bgMarker, frameBackdrop, ...rest]
}

export function FrameDesigner({
  open,
  frame,
  onClose,
  onSaved,
}: {
  open: boolean
  frame: PosterFrameRow | null
  onClose: () => void
  onSaved: (updated: PosterFrameRow) => void
}) {
  const { addToast } = useToast()

  const dims = ASPECT_RATIO_DIMS[frame?.aspect_ratio ?? '1:1'] ?? { w: 1080, h: 1080 }
  const canvasW = (frame?.config_json?.canvasSize as number) ?? dims.w
  const canvasH = (frame?.config_json?.canvasHeight as number) ?? dims.h
  const backgroundUrl = frame?.overlay_image_url || frame?.thumbnail_url || ''

  const initialLayers = useMemo(
    () => hydrateLayers(frame?.config_json?.layers ?? []),
    [frame?.id, frame?.config_json],
  )

  // Detect "first-edit": true if the stored frame has never been designed
  // (no user layers — only the auto-generated bg / frame backdrops). Used to
  // decide whether to auto-insert the frame_name watermark. After the admin
  // saves once, subsequent opens respect their deletions (we don't re-add it).
  const isFirstEdit = useMemo(() => {
    const raw = frame?.config_json?.layers ?? []
    return raw.every(l => {
      const n = ((l as Record<string, unknown>).name as string) ?? ''
      return n === 'bg' || n === 'frame'
    })
  }, [frame?.id, frame?.config_json])

  const undo = useUndoRedo<TextAreaLayer[]>(initialLayers)
  useEffect(() => { undo.reset(initialLayers) }, [frame?.id])  // eslint-disable-line react-hooks/exhaustive-deps

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [safeZoneOn, setSafeZoneOn] = useState(true)
  const [saving, setSaving] = useState(false)

  // Auto-insert frame_name watermark on FIRST edit only (brand-new frame with
  // no user layers yet). After admin saves even once, this effect stops
  // re-adding the layer — deletions are preserved.
  useEffect(() => {
    if (!frame || !open) return
    if (!frame.show_frame_name) return
    if (!isFirstEdit) return
    if (undo.state.some(l => l.name === 'frame_name')) return
    const labelLayer: TextAreaLayer = {
      id: uuid(), name: 'frame_name', type: 'text',
      x: Math.round(canvasW * 0.1),
      y: Math.round(canvasH * 0.9),
      width: Math.round(canvasW * 0.8),
      height: Math.round(canvasH * 0.05),
      text: frame.name,
      size: 24, font: 'Inter', color: '#ffffff',
      weight: 'normal', justification: 'center',
    }
    undo.set([...undo.state, labelLayer])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame?.id, open, isFirstEdit])

  // Keyboard: Ctrl+Z/Y/D + Delete
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) undo.redo(); else undo.undo()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault(); undo.redo(); return
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        if (selectedId) {
          const src = undo.state.find(l => l.id === selectedId)
          if (src) {
            const copy = { ...src, id: uuid(), x: src.x + 10, y: src.y + 10 }
            undo.set([...undo.state, copy])
            setSelectedId(copy.id)
          }
        }
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) {
          e.preventDefault()
          undo.set(undo.state.filter(l => l.id !== selectedId))
          setSelectedId(null)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, selectedId, undo])

  const addField = (f: FieldOption) => {
    setPickerOpen(false)
    const layer = layerFromField(f, canvasW, canvasH)
    undo.set([...undo.state, layer])
    setSelectedId(layer.id)
  }

  const patchLayer = useCallback((id: string, patch: Partial<TextAreaLayer>) => {
    // Live update — SILENT (does not push an undo step). One full drag gesture
    // becomes ONE step at commitLayer time.
    const idx = undo.state.findIndex(l => l.id === id)
    if (idx < 0) return
    const next = undo.state.slice()
    next[idx] = { ...next[idx], ...patch }
    undo.setSilent(next)
  }, [undo])

  const commitLayer = useCallback(() => {
    // Called on pointer-up after a drag. Records one undo step spanning the
    // entire silent-update streak.
    undo.commit()
  }, [undo])

  const patchAndCommit = (id: string, patch: Partial<TextAreaLayer>) => {
    const next = undo.state.map(l => l.id === id ? { ...l, ...patch } : l)
    undo.set(next)
  }

  const deleteSelected = () => {
    if (!selectedId) return
    undo.set(undo.state.filter(l => l.id !== selectedId))
    setSelectedId(null)
  }

  const duplicateSelected = () => {
    if (!selectedId) return
    const src = undo.state.find(l => l.id === selectedId)
    if (!src) return
    const copy = { ...src, id: uuid(), x: src.x + 10, y: src.y + 10 }
    undo.set([...undo.state, copy])
    setSelectedId(copy.id)
  }

  const onSave = async () => {
    if (!frame) return
    setSaving(true)
    try {
      const layers = dehydrateLayers(undo.state, canvasW, canvasH, backgroundUrl)
      const updated = await posterFramesApi.updateConfig(frame.id, {
        config_json: {
          type: 'image_overlay',
          canvasSize: canvasW,
          canvasHeight: canvasH,
          layers,
        },
      }) as PosterFrameRow
      onSaved(updated)
      addToast('Text areas saved')
      onClose()
    } catch (err: unknown) {
      const e = err as { response?: { data?: unknown } }
      addToast(`Save failed: ${JSON.stringify(e.response?.data ?? err)}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!open || !frame) return null

  const selectedLayer = undo.state.find(l => l.id === selectedId) || null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl w-[1200px] max-w-[98vw] h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <div>
            <div className="font-semibold text-gray-900">Design Text Areas — {frame.name}</div>
            <div className="text-[11px] text-gray-500">
              {frame.aspect_ratio} · {frame.frame_type} · {frame.category}
              {frame.assigned_user && ` · user=${frame.assigned_user}`}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-2.5 py-1.5 text-xs rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40"
              onClick={undo.undo} disabled={!undo.canUndo} title="Undo (Ctrl+Z)"
            >↶ Undo</button>
            <button
              className="px-2.5 py-1.5 text-xs rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40"
              onClick={undo.redo} disabled={!undo.canRedo} title="Redo (Ctrl+Shift+Z)"
            >↷ Redo</button>
            <button
              className="px-2.5 py-1.5 text-xs rounded bg-gray-100 hover:bg-gray-200"
              onClick={() => setSafeZoneOn(v => !v)}
            >{safeZoneOn ? 'Hide' : 'Show'} Safe Zone</button>
            <button
              className="px-2.5 py-1.5 text-xs rounded bg-gray-100 hover:bg-gray-200"
              onClick={() => setVersionsOpen(true)}
            >⌛ History</button>
            <button
              className="px-3 py-1.5 text-sm rounded text-gray-600 hover:bg-gray-100"
              onClick={onClose}
            >Cancel</button>
            <button
              className="px-4 py-1.5 text-sm rounded bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-60"
              onClick={onSave} disabled={saving}
            >{saving ? 'Saving…' : '💾 Save Text Areas'}</button>
          </div>
        </div>

        {/* Body: canvas + sidebar */}
        <div className="flex-1 flex min-h-0">
          {/* Canvas */}
          <div className="flex-1 min-w-0 relative">
            <FrameCanvas
              backgroundUrl={backgroundUrl}
              canvasW={canvasW}
              canvasH={canvasH}
              layers={undo.state}
              selectedId={selectedId}
              safeZoneVisible={safeZoneOn}
              onSelect={setSelectedId}
              onLayerChange={(id, patch) => patchLayer(id, patch)}
              onLayerCommit={commitLayer}
            />
          </div>

          {/* Sidebar */}
          <div className="w-[340px] flex-shrink-0 border-l border-gray-200 flex flex-col min-h-0">
            <div className="p-3 border-b border-gray-200">
              <button
                className="w-full px-3 py-2 text-sm rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 flex items-center justify-center gap-1"
                onClick={() => setPickerOpen(true)}
              >＋ Add Text Area</button>
            </div>

            <div className="p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Text Areas ({undo.state.length})
            </div>

            <div className="flex-1 overflow-y-auto px-3 space-y-2 pb-3">
              {undo.state.map(l => {
                const f = fieldOption(l.name)
                const preview = l.type === 'image'
                  ? (f?.label ?? l.name)
                  : (l.text || f?.placeholder || l.name)
                return (
                  <div
                    key={l.id}
                    className={`flex items-center gap-2 border rounded-lg px-2 py-2 cursor-pointer ${
                      selectedId === l.id ? 'border-cyan-400 bg-cyan-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedId(l.id)}
                  >
                    <div className="text-lg">{f?.icon ?? '•'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-500">{f?.label ?? l.name}</div>
                      <div className="text-sm truncate">{preview}</div>
                    </div>
                    <button
                      className="text-gray-400 hover:text-red-600"
                      onClick={e => { e.stopPropagation(); undo.set(undo.state.filter(x => x.id !== l.id)); if (selectedId === l.id) setSelectedId(null) }}
                      title="Delete"
                    >🗑</button>
                  </div>
                )
              })}

              {undo.state.length === 0 && (
                <div className="text-xs text-gray-500 text-center py-6 border border-dashed rounded-lg">
                  No text areas yet. Click “＋ Add Text Area”.
                </div>
              )}
            </div>

            {selectedLayer && (
              <div className="border-t border-gray-200 p-3 max-h-[50%] overflow-y-auto">
                <StylePanel
                  layer={selectedLayer}
                  onChange={p => patchAndCommit(selectedLayer.id, p)}
                  onDelete={deleteSelected}
                  onDuplicate={duplicateSelected}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <FieldPickerDialog
        open={pickerOpen}
        onPick={addField}
        onClose={() => setPickerOpen(false)}
      />
      <VersionHistoryDrawer
        open={versionsOpen}
        frameId={frame.id}
        onClose={() => setVersionsOpen(false)}
        onRestored={() => {
          // Re-fetch the frame and reset layers
          posterFramesApi.get(frame.id).then(data => {
            const row = data as unknown as PosterFrameRow
            undo.reset(hydrateLayers(row.config_json?.layers ?? []))
            onSaved(row)
          })
        }}
      />

      {/* Tiny style-helper — prevents the FIELD_OPTIONS import being tree-shaken unused. */}
      <div className="hidden">{FIELD_OPTIONS.length}</div>
    </div>
  )
}
