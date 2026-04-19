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
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-4 grid grid-cols-2 gap-3 w-[340px]"
        onClick={e => e.stopPropagation()}
      >
        {FIELD_OPTIONS.map(f => (
          <button
            key={f.key}
            className="flex flex-col items-center gap-1.5 py-4 rounded-xl bg-amber-50 hover:bg-amber-100 transition-colors border border-amber-200"
            onClick={() => onPick(f)}
            title={`Add ${f.label}`}
          >
            <div className="text-2xl">{f.icon}</div>
            <div className="text-sm font-semibold text-gray-800">{f.label}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
