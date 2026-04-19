/**
 * Translucent inset rectangle that marks where the user's poster content will
 * sit BEHIND the frame PNG. Helps admins avoid putting text areas inside the
 * poster image region (where they'd overlap user photos).
 *
 * Renders as an absolute-positioned div inside the canvas coordinate system.
 * Toggle visibility via the designer toolbar.
 */
import { SAFE_ZONE_INSET } from './constants'

export function SafeZoneOverlay({
  canvasW,
  canvasH,
  visible,
}: {
  canvasW: number
  canvasH: number
  visible: boolean
}) {
  if (!visible) return null
  const insetX = canvasW * SAFE_ZONE_INSET
  const insetY = canvasH * SAFE_ZONE_INSET
  return (
    <div
      className="absolute pointer-events-none border-2 border-dashed border-cyan-400/60"
      style={{
        left: insetX,
        top: insetY,
        width: canvasW - insetX * 2,
        height: canvasH - insetY * 2,
        background: 'rgba(6, 182, 212, 0.05)',
      }}
    >
      <div className="absolute -top-5 left-0 text-[10px] font-semibold text-cyan-600 bg-white/90 px-1.5 py-0.5 rounded">
        Safe Zone (user poster)
      </div>
    </div>
  )
}
