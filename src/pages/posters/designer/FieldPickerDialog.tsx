import { FIELD_OPTIONS, FieldOption } from './constants'

/**
 * 2×4 grid of field types (mirrors the PDF screenshot 3 floating dialog).
 * Emits the selected FieldOption via onPick; onClose closes without picking.
 */
export function FieldPickerDialog({
  open,
  onPick,
  onClose,
}: {
  open: boolean
  onPick: (field: FieldOption) => void
  onClose: () => void
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-brand-dark-card border border-brand-dark-border rounded-2xl shadow-2xl p-4 grid grid-cols-2 gap-3 w-[340px]"
        onClick={e => e.stopPropagation()}
      >
        <div className="col-span-2 text-sm font-semibold text-brand-text mb-1">Pick a field type</div>
        {FIELD_OPTIONS.map(f => (
          <button
            key={f.key}
            className="flex flex-col items-center gap-1.5 py-4 rounded-xl bg-brand-dark hover:bg-brand-gold/15 transition-colors border border-brand-dark-border hover:border-brand-gold/60 group"
            onClick={() => onPick(f)}
            title={`Add ${f.label}`}
          >
            <div className="text-2xl">{f.icon}</div>
            <div className="text-sm font-semibold text-brand-text group-hover:text-brand-gold">{f.label}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
