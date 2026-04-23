import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Menu, Users, Image, RotateCw, ChevronDown, LogOut } from 'lucide-react'
import { cn } from '../../utils/cn'
import ClearCacheButton from '../ui/ClearCacheButton'
import { dashboardApi } from '../../services/admin-api'

interface Props {
  /** Open the mobile sidebar drawer (rendered below lg:). */
  onOpenDrawer?: () => void
}

export function TopBar({ onOpenDrawer }: Props = {}) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [userCount, setUserCount] = useState<number | null>(null)
  const [posterCount, setPosterCount] = useState<number | null>(null)

  useEffect(() => {
    dashboardApi.stats()
      .then(data => {
        setUserCount(data.totalUsers ?? 0)
        setPosterCount(data.totalPosters ?? 0)
      })
      .catch(() => {})
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const handleRefresh = () => {
    // Show a simple toast-style notification
    const toast = document.createElement('div')
    toast.textContent = 'Dashboard refreshed'
    toast.className =
      'fixed top-4 right-4 z-50 bg-brand-dark-card text-brand-text text-sm px-4 py-2 rounded-lg border border-brand-dark-border shadow-lg'
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), 2000)
  }

  return (
    <header className="h-16 bg-brand-dark-card border-b border-brand-dark-border flex items-center justify-between px-6 shrink-0">
      {/* Left: Hamburger for mobile */}
      <div className="flex items-center">
        <button
          onClick={onOpenDrawer}
          aria-label="Open navigation"
          className="lg:hidden p-2 text-brand-text-muted hover:text-brand-text rounded-lg hover:bg-brand-dark-hover transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Center: Stats badges */}
      <div className="flex items-center gap-3">
        <div className="bg-status-info/10 text-status-info rounded-full px-3 py-1 flex items-center gap-1.5 text-xs font-medium">
          <Users style={{ width: '14px', height: '14px' }} />
          <span>Users: {userCount !== null ? userCount.toLocaleString() : '...'}</span>
        </div>
        <div className="bg-status-success/10 text-status-success rounded-full px-3 py-1 flex items-center gap-1.5 text-xs font-medium">
          <Image style={{ width: '14px', height: '14px' }} />
          <span>Posters: {posterCount !== null ? posterCount.toLocaleString() : '...'}</span>
        </div>
      </div>

      {/* Right: Publish + Refresh + Admin profile */}
      <div className="flex items-center gap-3">
        <ClearCacheButton />
        <button
          onClick={handleRefresh}
          className="p-2 text-brand-text-muted hover:text-brand-text rounded-lg hover:bg-brand-dark-hover transition-colors"
          title="Refresh"
        >
          <RotateCw className="h-4 w-4" />
        </button>

        {/* Admin profile dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 hover:bg-brand-dark-hover rounded-lg px-2 py-1.5 transition-colors"
          >
            <div className="h-8 w-8 bg-brand-gold rounded-full flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-gray-900">A</span>
            </div>
            <span className="text-sm text-brand-text font-medium hidden sm:inline">Admin</span>
            <ChevronDown className={cn(
              'h-3.5 w-3.5 text-brand-text-muted transition-transform hidden sm:block',
              dropdownOpen && 'rotate-180'
            )} />
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-brand-dark-card border border-brand-dark-border rounded-lg shadow-lg py-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-brand-text-muted hover:text-status-error hover:bg-brand-dark-hover transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
