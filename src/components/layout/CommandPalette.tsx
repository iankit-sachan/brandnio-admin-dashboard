/**
 * Cmd+K / Ctrl+K / "/" command palette.
 *
 * Mounted once at the layout level. A global keyboard listener opens it
 * from anywhere in the admin. Filters all 125+ sidebar nav items by label
 * and section, arrow keys to navigate, Enter to go, Esc to close.
 *
 * Implementation notes:
 *   - No third-party dep — we keep the admin bundle small.
 *   - The global handler ignores shortcuts while the user is typing in
 *     an input/textarea/contenteditable so Cmd+K doesn't hijack form input.
 *   - Uses React state only; no refs shared upwards. Parent mounts this
 *     with a boolean state pair.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { flatNav, type FlatNavItem } from './navConfig'

interface Props {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: Props) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Reset query + focus input when the palette opens.
  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIdx(0)
      // Next frame so the input is actually in the DOM before .focus()
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  // Filter. Matches label OR section name, case-insensitive. Scored so
  // that label-starts-with > label-contains > section-contains.
  const results: FlatNavItem[] = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return flatNav
    const scored = flatNav
      .map(item => {
        const label = item.label.toLowerCase()
        const section = item.section.toLowerCase()
        let score = 0
        if (label.startsWith(q)) score = 3
        else if (label.includes(q)) score = 2
        else if (section.includes(q)) score = 1
        return { item, score }
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label))
    return scored.map(x => x.item)
  }, [query])

  // Clamp active index when results shrink as the user types.
  useEffect(() => {
    if (activeIdx >= results.length) setActiveIdx(Math.max(0, results.length - 1))
  }, [results.length, activeIdx])

  // Scroll the active row into view.
  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  // Keyboard inside the palette.
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx(i => Math.min(results.length - 1, i + 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx(i => Math.max(0, i - 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const pick = results[activeIdx]
        if (pick) {
          navigate(pick.path)
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, results, activeIdx, navigate, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="w-full max-w-xl bg-brand-dark-deep border border-brand-dark-border rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-brand-dark-border">
          <Search className="h-4 w-4 text-brand-text-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search admin… (type to filter, ↑↓ to pick, Enter to go)"
            className="flex-1 bg-transparent text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded text-brand-text-muted hover:text-brand-text hover:bg-brand-dark-hover"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-1">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-brand-text-muted">
              No match for <span className="text-brand-text">"{query}"</span>
            </div>
          ) : (
            results.map((item, idx) => {
              const Icon = item.icon
              const isActive = idx === activeIdx
              return (
                <button
                  key={`${item.section}:${item.path}`}
                  data-idx={idx}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => { navigate(item.path); onClose() }}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
                    isActive
                      ? 'bg-brand-gold/10 text-brand-gold'
                      : 'text-brand-text hover:bg-brand-dark-hover/60'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  <span className="text-[10px] uppercase tracking-wider text-brand-text-muted shrink-0">
                    {item.section}
                  </span>
                </button>
              )
            })
          )}
        </div>

        {/* Hint bar */}
        <div className="flex items-center justify-between px-4 py-2 text-[10px] text-brand-text-muted border-t border-brand-dark-border bg-brand-dark/40">
          <span>
            <kbd className="px-1.5 py-0.5 bg-brand-dark-hover rounded">↑</kbd>{' '}
            <kbd className="px-1.5 py-0.5 bg-brand-dark-hover rounded">↓</kbd> navigate{' '}
            <kbd className="px-1.5 py-0.5 bg-brand-dark-hover rounded ml-2">↵</kbd> open{' '}
            <kbd className="px-1.5 py-0.5 bg-brand-dark-hover rounded ml-2">esc</kbd> close
          </span>
          <span>{results.length} result{results.length === 1 ? '' : 's'}</span>
        </div>
      </div>
    </div>
  )
}
