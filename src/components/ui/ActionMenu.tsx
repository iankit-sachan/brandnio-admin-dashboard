import { useEffect, useRef, useState } from 'react'
import { cn } from '../../utils/cn'

export interface ActionMenuItem {
  label: string
  onClick: () => void
  variant?: 'default' | 'danger' | 'success'
  icon?: React.ReactNode
}

interface Props {
  primary?: { label: string; onClick: () => void }
  items: ActionMenuItem[]
  className?: string
}

/**
 * Actions cell: one primary button + a kebab (⋮) dropdown for secondary actions.
 * Dropdown closes on outside click or Escape.
 */
export function ActionMenu({ primary, items, className }: Props) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const variantClass = (v: ActionMenuItem['variant']) => {
    switch (v) {
      case 'danger': return 'text-red-400 hover:bg-red-900/30'
      case 'success': return 'text-green-400 hover:bg-green-900/30'
      default: return 'text-brand-text hover:bg-brand-dark-hover'
    }
  }

  return (
    <div ref={wrapRef} className={cn('relative inline-flex items-center gap-1', className)}>
      {primary && (
        <button
          onClick={primary.onClick}
          className="text-xs px-3 py-1.5 rounded-md bg-indigo-600/90 text-white font-medium hover:bg-indigo-500 transition-colors"
        >
          {primary.label}
        </button>
      )}
      {items.length > 0 && (
        <button
          onClick={() => setOpen(o => !o)}
          aria-label="More actions"
          aria-haspopup="menu"
          aria-expanded={open}
          className={cn(
            'w-8 h-8 flex items-center justify-center rounded-md text-brand-text-muted transition-colors',
            open ? 'bg-brand-dark-hover text-brand-text' : 'hover:bg-brand-dark-hover hover:text-brand-text',
          )}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <circle cx="12" cy="5" r="1.75" />
            <circle cx="12" cy="12" r="1.75" />
            <circle cx="12" cy="19" r="1.75" />
          </svg>
        </button>
      )}
      {open && items.length > 0 && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-20 min-w-[160px] rounded-lg border border-brand-dark-border/60 bg-[#1e1e2e] shadow-xl py-1"
        >
          {items.map((it, i) => (
            <button
              key={i}
              role="menuitem"
              onClick={() => { setOpen(false); it.onClick() }}
              className={cn(
                'w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors',
                variantClass(it.variant),
              )}
            >
              {it.icon && <span className="w-4 flex justify-center">{it.icon}</span>}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
