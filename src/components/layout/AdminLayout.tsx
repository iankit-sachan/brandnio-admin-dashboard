import { useCallback, useEffect, useState } from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
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
  const location = useLocation()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  const openPalette = useCallback(() => setPaletteOpen(true), [])
  const closePalette = useCallback(() => setPaletteOpen(false), [])
  const openDrawer = useCallback(() => setMobileDrawerOpen(true), [])
  const closeDrawer = useCallback(() => setMobileDrawerOpen(false), [])

  // Global shortcut: Cmd+K / Ctrl+K / "/" opens the palette from anywhere.
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

  // Auto-close the mobile drawer whenever the route changes. Without this
  // the drawer would stay open after clicking a link, hiding the page the
  // admin just navigated to.
  useEffect(() => {
    setMobileDrawerOpen(false)
  }, [location.pathname])

  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        onOpenPalette={openPalette}
        mobileOpen={mobileDrawerOpen}
        onMobileClose={closeDrawer}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar onOpenDrawer={openDrawer} />
        <main className="flex-1 overflow-y-auto p-6 bg-brand-dark">
          <Outlet />
        </main>
      </div>
      <CommandPalette open={paletteOpen} onClose={closePalette} />
    </div>
  )
}
