/**
 * Sidebar user preferences persisted to localStorage.
 *
 * Three separate prefs, each with its own setter so React only re-renders
 * the pieces that changed:
 *   - collapsed:     boolean              — is the sidebar in icon-only mode?
 *   - openSections:  Set<string>          — which section titles are expanded
 *   - pinned:        Set<string>          — paths the admin has starred
 *
 * All three survive page refresh. Reading a corrupted value falls back
 * silently to the default so a bad localStorage entry never bricks the UI.
 */
import { useCallback, useEffect, useState } from 'react'

const K_COLLAPSED = 'sidebar.collapsed'
const K_OPEN_SECTIONS = 'sidebar.openSections'
const K_PINNED = 'sidebar.pinned'

function readBool(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key)
    if (v === null) return fallback
    return v === 'true'
  } catch {
    return fallback
  }
}

function readStringSet(key: string, fallback: string[]): Set<string> {
  try {
    const v = localStorage.getItem(key)
    if (!v) return new Set(fallback)
    const parsed = JSON.parse(v)
    if (!Array.isArray(parsed)) return new Set(fallback)
    return new Set(parsed.filter(x => typeof x === 'string'))
  } catch {
    return new Set(fallback)
  }
}

function writeBool(key: string, value: boolean) {
  try { localStorage.setItem(key, String(value)) } catch { /* quota / private mode */ }
}

function writeStringSet(key: string, value: Set<string>) {
  try { localStorage.setItem(key, JSON.stringify([...value])) } catch { /* quota */ }
}

export function useSidebarPrefs(initialOpenSections: string[]) {
  // Collapsed ───────────────────────────────────────────────
  const [collapsed, setCollapsedState] = useState<boolean>(() =>
    readBool(K_COLLAPSED, false),
  )
  const setCollapsed = useCallback((v: boolean | ((p: boolean) => boolean)) => {
    setCollapsedState(prev => {
      const next = typeof v === 'function' ? v(prev) : v
      writeBool(K_COLLAPSED, next)
      return next
    })
  }, [])

  // Open sections ───────────────────────────────────────────
  // First visit: seed with initialOpenSections (defaults + sections that
  // match the current route). Subsequent visits: whatever was stored.
  const [openSections, setOpenSectionsState] = useState<Set<string>>(() => {
    try {
      const v = localStorage.getItem(K_OPEN_SECTIONS)
      if (v === null) return new Set(initialOpenSections)
      return readStringSet(K_OPEN_SECTIONS, initialOpenSections)
    } catch {
      return new Set(initialOpenSections)
    }
  })

  const toggleSection = useCallback((title: string) => {
    setOpenSectionsState(prev => {
      const next = new Set(prev)
      if (next.has(title)) next.delete(title)
      else next.add(title)
      writeStringSet(K_OPEN_SECTIONS, next)
      return next
    })
  }, [])

  const openSection = useCallback((title: string) => {
    setOpenSectionsState(prev => {
      if (prev.has(title)) return prev
      const next = new Set(prev)
      next.add(title)
      writeStringSet(K_OPEN_SECTIONS, next)
      return next
    })
  }, [])

  // Pinned paths ────────────────────────────────────────────
  const [pinned, setPinnedState] = useState<Set<string>>(() =>
    readStringSet(K_PINNED, []),
  )

  const togglePin = useCallback((path: string) => {
    setPinnedState(prev => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      writeStringSet(K_PINNED, next)
      return next
    })
  }, [])

  // Keep localStorage in sync if another tab changes prefs.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === K_COLLAPSED) setCollapsedState(readBool(K_COLLAPSED, false))
      if (e.key === K_OPEN_SECTIONS) setOpenSectionsState(readStringSet(K_OPEN_SECTIONS, []))
      if (e.key === K_PINNED) setPinnedState(readStringSet(K_PINNED, []))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return {
    collapsed, setCollapsed,
    openSections, toggleSection, openSection,
    pinned, togglePin,
  }
}
