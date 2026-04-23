import { useCallback, useEffect, useState } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { CommandPalette } from './CommandPalette'
import { useAuth } from '../../context/AuthContext'

/**
 * Returns true when the event originated inside an input where the user is
 * actively typing. We don't want Cmd+K to hijack text input, but we DO want
 * it to open the palette from anywhere else.
 */
function isTypingTarget(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null
  if (!t) return false
  const tag = t.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (t.isContentEditable) return true
  return false
}

export function AdminLayout() {
  const { isAuthenticated } = useAuth()
  const [paletteOpen, setPaletteOpen] = useState(false)

  const openPalette = useCallback(() => setPaletteOpen(true), [])
  const closePalette = useCallback(() => setPaletteOpen(false), [])

  // Global shortcut: Cmd+K (mac) / Ctrl+K (win) from anywhere opens the
  // palette. "/" from outside a typing target also opens it (common pattern
  // from GitHub, Linear, etc.).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isK = (e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')
      const isSlash = e.key === '/' && !isTypingTarget(e)
      if (isK || isSlash) {
        e.preventDefault()
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar onOpenPalette={openPalette} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6 bg-brand-dark">
          <Outlet />
        </main>
      </div>
      <CommandPalette open={paletteOpen} onClose={closePalette} />
    </div>
  )
}
