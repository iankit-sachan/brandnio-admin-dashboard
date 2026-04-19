/**
 * Snap-to-edge / snap-to-center alignment helpers.
 *
 * Ported semantically from Android's ``ui/editor2/SnapEngine.kt`` with the
 * same 6px hysteresis tolerance. Operates on design-pixel coordinates.
 */

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface SnapGuide {
  axis: 'x' | 'y'
  /** Position in design pixels where the guide line should render. */
  at: number
  /** Optional text label, e.g. "Center". */
  label?: string
}

const SNAP_TOLERANCE = 6 // pixels

/** Snap a rect's position against canvas edges/center AND against siblings.
 *  Returns the (possibly adjusted) rect and any guide lines that triggered.
 */
export function snapRect(
  moving: Rect,
  canvasW: number,
  canvasH: number,
  siblings: Rect[],
): { rect: Rect; guides: SnapGuide[] } {
  const guides: SnapGuide[] = []
  let { x, y } = moving
  const { w, h } = moving

  // X candidates: canvas left, canvas center, canvas right, siblings' edges/center
  const xCandidates: Array<{ target: number; rectX: number; label?: string }> = [
    { target: 0,               rectX: 0,           label: 'Left edge' },
    { target: canvasW / 2,     rectX: canvasW / 2 - w / 2, label: 'Center' },
    { target: canvasW,         rectX: canvasW - w, label: 'Right edge' },
  ]
  for (const s of siblings) {
    xCandidates.push({ target: s.x,               rectX: s.x })
    xCandidates.push({ target: s.x + s.w,         rectX: s.x + s.w - w })
    xCandidates.push({ target: s.x + s.w / 2,     rectX: s.x + s.w / 2 - w / 2 })
  }

  for (const c of xCandidates) {
    if (Math.abs(c.rectX - x) <= SNAP_TOLERANCE) {
      x = c.rectX
      guides.push({ axis: 'x', at: c.target, label: c.label })
      break
    }
  }

  const yCandidates: Array<{ target: number; rectY: number; label?: string }> = [
    { target: 0,               rectY: 0,           label: 'Top edge' },
    { target: canvasH / 2,     rectY: canvasH / 2 - h / 2, label: 'Middle' },
    { target: canvasH,         rectY: canvasH - h, label: 'Bottom edge' },
  ]
  for (const s of siblings) {
    yCandidates.push({ target: s.y,               rectY: s.y })
    yCandidates.push({ target: s.y + s.h,         rectY: s.y + s.h - h })
    yCandidates.push({ target: s.y + s.h / 2,     rectY: s.y + s.h / 2 - h / 2 })
  }

  for (const c of yCandidates) {
    if (Math.abs(c.rectY - y) <= SNAP_TOLERANCE) {
      y = c.rectY
      guides.push({ axis: 'y', at: c.target, label: c.label })
      break
    }
  }

  // Clamp inside canvas
  x = Math.max(0, Math.min(x, canvasW - w))
  y = Math.max(0, Math.min(y, canvasH - h))

  return { rect: { x, y, w, h }, guides }
}
