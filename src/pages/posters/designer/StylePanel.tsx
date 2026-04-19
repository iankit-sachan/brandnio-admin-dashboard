/**
 * Per-text-area styling panel. Opens when the admin selects a text area on
 * the canvas. Changes are committed via onChange (undo-able).
 *
 * Fields here mirror ``EditorLayer`` keys that Android's ``FrameRenderer``
 * understands:
 *   - size        → font size (design px)
 *   - font        → Google Font name loaded by FontManager at render time
 *   - color       → hex string
 *   - weight      → "normal" | "bold"
 *   - justification → "left" | "center" | "right"
 *   - text        → placeholder text (used when user profile field is empty)
 */
import { FieldOption, fieldOption } from './constants'

export interface TextAreaLayer {
  /** Stable layer id (UUID assigned when created). */
  id: string
  /** Field key (matches FieldOption.key). */
  name: string
  type: 'text' | 'image'
  x: number
  y: number
  width: number
  height: number
  /** Text-only */
  text?: string
  size?: number
  font?: string
  color?: string
  weight?: 'normal' | 'bold'
  italic?: boolean
  justification?: 'left' | 'center' | 'right'
  letterSpacing?: number
  /** Image-only */
  url?: string
}

const GOOGLE_FONTS = [
  'Inter', 'Poppins', 'Roboto', 'Montserrat', 'Lato', 'Open Sans',
  'Raleway', 'Oswald', 'Playfair Display', 'Merriweather', 'Work Sans',
]

export function StylePanel({
  layer,
  onChange,
  onDelete,
  onDuplicate,
}: {
  layer: TextAreaLayer
  onChange: (patch: Partial<TextAreaLayer>) => void
  onDelete: () => void
  onDuplicate: () => void
}) {
  const f: FieldOption | undefined = fieldOption(layer.name)
  const isText = layer.type === 'text'

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 w-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-xl">{f?.icon ?? '•'}</div>
          <div>
            <div className="text-sm font-semibold text-gray-900">{f?.label ?? layer.name}</div>
            <div className="text-xs text-gray-500">#{layer.id.slice(0, 6)}</div>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200"
            onClick={onDuplicate}
            title="Duplicate (Ctrl+D)"
          >⎘ Dup</button>
          <button
            className="px-2 py-1 text-xs rounded bg-red-50 hover:bg-red-100 text-red-700"
            onClick={onDelete}
            title="Delete"
          >🗑</button>
        </div>
      </div>

      {/* Position / size — numeric inputs, bidirectional with drag */}
      <div>
        <div className="text-xs font-semibold text-gray-700 mb-1.5">Position &amp; Size</div>
        <div className="grid grid-cols-4 gap-2">
          {(['x', 'y', 'width', 'height'] as const).map(k => (
            <div key={k}>
              <div className="text-[10px] uppercase text-gray-500 mb-0.5">{k}</div>
              <input
                type="number"
                value={Math.round(layer[k] as number)}
                onChange={e => onChange({ [k]: Number(e.target.value) })}
                className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs"
              />
            </div>
          ))}
        </div>
      </div>

      {isText && (
        <>
          {/* Placeholder text */}
          <div>
            <div className="text-xs font-semibold text-gray-700 mb-1.5">Default / Placeholder Text</div>
            <input
              value={layer.text ?? ''}
              onChange={e => onChange({ text: e.target.value })}
              placeholder="Shown if user profile is empty"
              className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-sm"
            />
          </div>

          {/* Font family + size */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1.5">Font</div>
              <select
                value={layer.font ?? 'Inter'}
                onChange={e => onChange({ font: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-sm"
              >
                {GOOGLE_FONTS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1.5">Size (px)</div>
              <input
                type="number"
                min={8}
                max={200}
                value={layer.size ?? 24}
                onChange={e => onChange({ size: Number(e.target.value) })}
                className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-sm"
              />
            </div>
          </div>

          {/* Color + weight + alignment */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1.5">Color</div>
              <div className="flex items-center gap-1">
                <input
                  type="color"
                  value={layer.color ?? '#ffffff'}
                  onChange={e => onChange({ color: e.target.value })}
                  className="w-8 h-8 border-0 cursor-pointer rounded"
                />
                <input
                  value={layer.color ?? '#ffffff'}
                  onChange={e => onChange({ color: e.target.value })}
                  className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded px-1.5 py-1 text-xs font-mono"
                />
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1.5">Weight</div>
              <select
                value={layer.weight ?? 'normal'}
                onChange={e => onChange({ weight: e.target.value as 'normal' | 'bold' })}
                className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-sm"
              >
                <option value="normal">Normal</option>
                <option value="bold">Bold</option>
              </select>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1.5">Align</div>
              <select
                value={layer.justification ?? 'left'}
                onChange={e => onChange({ justification: e.target.value as 'left' | 'center' | 'right' })}
                className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-sm"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
          </div>
        </>
      )}

      {!isText && (
        <div className="text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded p-2">
          {layer.name === 'logo' ? (
            <>At render time the user\u2019s business logo fills this box (center-fit). If the user hasn\u2019t uploaded a logo yet, this box stays empty on their poster.</>
          ) : (
            <>Image placeholder. Source set to ``{layer.url || 'user-provided'}``.</>
          )}
        </div>
      )}
    </div>
  )
}
