/**
 * The design surface. Renders the frame PNG + every text-area overlay +
 * snap guides + safe-zone overlay. The "canvas" is kept in design-pixel
 * coordinates (same as Android's FrameRenderer reads), and a wrapper div
 * CSS-scales it down to fit the modal viewport.
 */
import { useLayoutEffect, useRef, useState } from 'react'
import { SafeZoneOverlay } from './SafeZoneOverlay'
import { SnapGuide } from './snapEngine'
import { TextAreaOverlay } from './TextAreaOverlay'
import type { TextAreaLayer } from './StylePanel'

export function FrameCanvas({
  backgroundUrl,
  canvasW,
  canvasH,
  layers,
  selectedId,
  safeZoneVisible,
  onSelect,
  onLayerChange,
  onLayerCommit,
}: {
  backgroundUrl: string
  canvasW: number
  canvasH: number
  layers: TextAreaLayer[]
  selectedId: string | null
  safeZoneVisible: boolean
  onSelect: (id: string | null) => void
  onLayerChange: (id: string, patch: Partial<TextAreaLayer>) => void
  onLayerCommit: () => void
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [screenScale, setScreenScale] = useState(1)
  const [guides, setGuides] = useState<SnapGuide[]>([])

  // Fit canvas into the wrapper while preserving aspect ratio.
  useLayoutEffect(() => {
    const compute = () => {
      const el = wrapperRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const sx = rect.width / canvasW
      const sy = rect.height / canvasH
      setScreenScale(Math.max(0.01, Math.min(sx, sy)))
    }
    compute()
    const ro = new ResizeObserver(compute)
    if (wrapperRef.current) ro.observe(wrapperRef.current)
    return () => ro.disconnect()
  }, [canvasW, canvasH])

  return (
    <div
      ref={wrapperRef}
      className="relative w-full h-full flex items-center justify-center bg-neutral-900 overflow-hidden"
      onClick={() => onSelect(null)}
    >
      <div
        className="relative bg-white shadow-xl"
        style={{
          width: canvasW * screenScale,
          height: canvasH * screenScale,
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            width: canvasW,
            height: canvasH,
            transform: `scale(${screenScale})`,
            transformOrigin: 'top left',
          }}
        >
          {/* Frame PNG */}
          {backgroundUrl && (
            // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
            <img
              src={backgroundUrl}
              style={{ width: canvasW, height: canvasH, display: 'block' }}
              draggable={false}
              alt=""
            />
          )}

          <SafeZoneOverlay canvasW={canvasW} canvasH={canvasH} visible={safeZoneVisible} />

          {/* Text-area overlays */}
          {layers.map(l => (
            <TextAreaOverlay
              key={l.id}
              layer={l}
              isSelected={l.id === selectedId}
              canvasW={canvasW}
              canvasH={canvasH}
              screenScale={screenScale}
              siblings={layers.filter(s => s.id !== l.id).map(s => ({ x: s.x, y: s.y, w: s.width, h: s.height }))}
              onSelect={() => onSelect(l.id)}
              onChange={patch => onLayerChange(l.id, patch)}
              onCommit={onLayerCommit}
              onGuidesChange={setGuides}
            />
          ))}

          {/* Snap guides */}
          {guides.map((g, i) => (
            <div
              key={i}
              className="absolute bg-cyan-400 pointer-events-none"
              style={{
                ...(g.axis === 'x'
                  ? { left: g.at - 0.5, top: 0, width: 1, height: canvasH }
                  : { top: g.at - 0.5, left: 0, height: 1, width: canvasW }),
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
