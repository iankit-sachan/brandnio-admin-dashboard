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

  const inputCls = 'w-full bg-brand-dark-deep border border-brand-dark-border rounded px-2 py-1.5 text-xs text-brand-text focus:outline-none focus:border-brand-gold/50'
  const selectCls = 'w-full bg-brand-dark-deep border border-brand-dark-border rounded px-2 py-1.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50'
  const labelCls = 'text-xs font-semibold text-brand-text-muted mb-1.5'

  return (
    <div className="bg-brand-dark-card border border-brand-dark-border rounded-2xl p-4 w-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-xl">{f?.icon ?? '•'}</div>
          <div>
            <div className="text-sm font-semibold text-brand-text">{f?.label ?? layer.name}</div>
            <div className="text-xs text-brand-text-muted">#{layer.id.slice(0, 6)}</div>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            className="px-2 py-1 text-xs rounded bg-brand-dark border border-brand-dark-border text-brand-text hover:bg-brand-dark-hover"
            onClick={onDuplicate}
            title="Duplicate (Ctrl+D)"
          >⎘ Dup</button>
          <button
            className="px-2 py-1 text-xs rounded bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/25"
            onClick={onDelete}
            title="Delete"
          >🗑</button>
        </div>
      </div>

      {/* Position / size — numeric inputs, bidirectional with drag */}
      <div>
        <div className={labelCls}>Position &amp; Size</div>
        <div className="grid grid-cols-4 gap-2">
          {(['x', 'y', 'width', 'height'] as const).map(k => (
            <div key={k}>
              <div className="text-[10px] uppercase text-brand-text-muted mb-0.5">{k}</div>
              <input
                type="number"
                value={Math.round(layer[k] as number)}
                onChange={e => onChange({ [k]: Number(e.target.value) })}
                className={inputCls}
              />
            </div>
          ))}
        </div>
      </div>

      {isText && (
        <>
          {/* Placeholder text */}
          <div>
            <div className={labelCls}>Default / Placeholder Text</div>
            <input
              value={layer.text ?? ''}
              onChange={e => onChange({ text: e.target.value })}
              placeholder="Shown if user profile is empty"
              className="w-full bg-brand-dark-deep border border-brand-dark-border rounded px-2 py-1.5 text-sm text-brand-text placeholder-brand-text-muted focus:outline-none focus:border-brand-gold/50"
            />
          </div>

          {/* Font family + size */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className={labelCls}>Font</div>
              <select
                value={layer.font ?? 'Inter'}
                onChange={e => onChange({ font: e.target.value })}
                className={selectCls}
              >
                {GOOGLE_FONTS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <div className={labelCls}>Size (px)</div>
              <input
                type="number"
                min={8}
                max={200}
                value={layer.size ?? 24}
                onChange={e => onChange({ size: Number(e.target.value) })}
                className="w-full bg-brand-dark-deep border border-brand-dark-border rounded px-2 py-1.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50"
              />
            </div>
          </div>

          {/* Color + weight + alignment */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className={labelCls}>Color</div>
              <div className="flex items-center gap-1">
                <input
                  type="color"
                  value={layer.color ?? '#ffffff'}
                  onChange={e => onChange({ color: e.target.value })}
                  className="w-8 h-8 border border-brand-dark-border bg-brand-dark-deep cursor-pointer rounded"
                />
                <input
                  value={layer.color ?? '#ffffff'}
                  onChange={e => onChange({ color: e.target.value })}
                  className="flex-1 min-w-0 bg-brand-dark-deep border border-brand-dark-border rounded px-1.5 py-1 text-xs font-mono text-brand-text focus:outline-none focus:border-brand-gold/50"
                />
              </div>
            </div>
            <div>
              <div className={labelCls}>Weight</div>
              <select
                value={layer.weight ?? 'normal'}
                onChange={e => onChange({ weight: e.target.value as 'normal' | 'bold' })}
                className={selectCls}
              >
                <option value="normal">Normal</option>
                <option value="bold">Bold</option>
              </select>
            </div>
            <div>
              <div className={labelCls}>Align</div>
              <select
                value={layer.justification ?? 'left'}
                onChange={e => onChange({ justification: e.target.value as 'left' | 'center' | 'right' })}
                className={selectCls}
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
        <div className="text-xs text-brand-text-muted bg-brand-gold/10 border border-brand-gold/30 rounded p-2">
          {layer.name === 'logo' ? (
            <>At render time the user&apos;s business logo fills this box (center-fit). If the user hasn&apos;t uploaded a logo yet, this box stays empty on their poster.</>
          ) : (
            <>Image placeholder. Source set to <code className="text-brand-gold">{layer.url || 'user-provided'}</code>.</>
          )}
        </div>
      )}
    </div>
  )
}
