import { useEffect, useMemo } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LogOut, PanelLeftClose, PanelLeft,
  ChevronRight, ChevronDown,
  Star,
  Search,
} from 'lucide-react'
import { cn } from '../../utils/cn'
import { useAuth } from '../../context/AuthContext'
import { navSections, sectionContainsPath, type NavItem } from './navConfig'
import { useSidebarPrefs } from '../../hooks/useSidebarPrefs'

interface Props {
  /** Open the Cmd+K command palette. Wired from AdminLayout. */
  onOpenPalette: () => void
}

const PINNED_SECTION = 'PINNED'

function computeInitialOpen(pathname: string): string[] {
  const open: string[] = []
  for (const section of navSections) {
    if (section.defaultOpen || sectionContainsPath(section, pathname)) {
      open.push(section.title)
    }
  }
  return open
}

export function Sidebar({ onOpenPalette }: Props) {
  const location = useLocation()
  const {
    collapsed, setCollapsed,
    openSections, toggleSection, openSection,
    pinned, togglePin,
  } = useSidebarPrefs(computeInitialOpen(location.pathname))
  const { logout } = useAuth()
  const navigate = useNavigate()

  // Resolve pinned paths to their full NavItem (with icon + section) so we
  // can render a real row. A pinned path that no longer exists (page got
  // deleted or renamed) is silently skipped rather than showing a ghost row.
  const pinnedItems: NavItem[] = useMemo(() => {
    const byPath = new Map<string, NavItem>()
    for (const section of navSections) {
      for (const item of section.items) byPath.set(item.path, item)
    }
    return [...pinned].map(p => byPath.get(p)).filter((x): x is NavItem => !!x)
  }, [pinned])

  // Auto-expand the section containing the current route.
  useEffect(() => {
    for (const section of navSections) {
      if (sectionContainsPath(section, location.pathname)) {
        openSection(section.title)
        break
      }
    }
    // openSection is memoized with useCallback in the hook
  }, [location.pathname, openSection])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const renderStar = (path: string) => {
    const isPinned = pinned.has(path)
    return (
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); togglePin(path) }}
        className={cn(
          'shrink-0 p-0.5 rounded transition-opacity',
          isPinned
            ? 'text-brand-gold opacity-100'
            : 'text-brand-text-muted opacity-0 group-hover:opacity-100 hover:text-brand-gold',
        )}
        title={isPinned ? 'Unpin from top' : 'Pin to top'}
        aria-label={isPinned ? 'Unpin' : 'Pin'}
      >
        <Star
          style={{ width: '14px', height: '14px' }}
          fill={isPinned ? 'currentColor' : 'none'}
        />
      </button>
    )
  }

  return (
    <aside className={cn(
      'h-screen bg-brand-dark-deep border-r border-brand-dark-border flex flex-col transition-all duration-200 shrink-0',
      collapsed ? 'w-16' : 'w-64',
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-brand-dark-border shrink-0">
        <div className="h-8 w-8 bg-brand-gold rounded-lg flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-gray-900">B</span>
        </div>
        {!collapsed && <span className="text-lg font-bold text-brand-text">Brandnio</span>}
      </div>

      {/* Cmd+K search trigger (hidden when collapsed, styled as a button+kbd hint) */}
      {!collapsed && (
        <button
          onClick={onOpenPalette}
          className="mx-3 mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-dark border border-brand-dark-border text-sm text-brand-text-muted hover:border-brand-gold/40 hover:text-brand-text transition-colors"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="text-[10px] px-1.5 py-0.5 bg-brand-dark-hover rounded">Ctrl K</kbd>
        </button>
      )}
      {collapsed && (
        <button
          onClick={onOpenPalette}
          title="Search (Ctrl+K)"
          className="mx-auto mt-3 flex items-center justify-center h-9 w-9 rounded-lg bg-brand-dark border border-brand-dark-border text-brand-text-muted hover:border-brand-gold/40 hover:text-brand-text transition-colors"
        >
          <Search className="h-4 w-4" />
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {/* ─── Pinned section (only shown if admin has pinned items) ─── */}
        {pinnedItems.length > 0 && (
          <div>
            {!collapsed ? (
              <div className="flex items-center gap-2 px-4 mt-1 mb-2">
                <div className="flex-1 h-px bg-brand-dark-border" />
                <span className="text-[10px] uppercase tracking-widest text-brand-gold font-medium flex items-center gap-1">
                  <Star className="h-2.5 w-2.5 fill-current" /> PINNED
                </span>
                <div className="flex-1 h-px bg-brand-dark-border" />
              </div>
            ) : (
              <div className="border-t border-brand-gold/40 my-2 mx-2" />
            )}
            {pinnedItems.map(item => {
              const Icon = item.icon
              return (
                <div key={`pinned:${item.path}`} className="group relative">
                  <NavLink
                    to={item.path}
                    end
                    className={({ isActive }) => cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors',
                      collapsed && 'justify-center',
                      isActive
                        ? 'text-brand-gold bg-brand-gold/10'
                        : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-dark-hover/50',
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon style={{ width: '18px', height: '18px' }} className="shrink-0" />
                    {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                    {!collapsed && renderStar(item.path)}
                  </NavLink>
                </div>
              )
            })}
          </div>
        )}

        {/* ─── Regular sections ─── */}
        {navSections.map((section) => {
          const isOpen = openSections.has(section.title)
          return (
            <div key={section.title}>
              {section.group && !collapsed && (
                <div className="flex items-center gap-2 px-4 mt-5 mb-2">
                  <div className="flex-1 h-px bg-brand-dark-border" />
                  <span className="text-[10px] uppercase tracking-widest text-brand-text-muted font-medium">{section.group}</span>
                  <div className="flex-1 h-px bg-brand-dark-border" />
                </div>
              )}
              {section.group && collapsed && (
                <div className="border-t border-brand-gold/30 my-3 mx-2" />
              )}
              {!collapsed ? (
                <button
                  onClick={() => toggleSection(section.title)}
                  className="w-full flex items-center justify-between text-xs uppercase tracking-wider text-brand-gold font-semibold px-4 mt-4 mb-1 hover:text-brand-gold/80 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    {section.color && (
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: section.color }} />
                    )}
                    {section.title}
                  </span>
                  {isOpen
                    ? <ChevronDown className="h-3 w-3" />
                    : <ChevronRight className="h-3 w-3" />}
                </button>
              ) : (
                <div className="border-t border-brand-dark-border/30 my-2 mx-2" />
              )}

              {(isOpen || collapsed) && section.items.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.path} className="group relative">
                    <NavLink
                      to={item.path}
                      end
                      className={({ isActive }) => cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors',
                        collapsed && 'justify-center',
                        isActive
                          ? 'text-brand-gold bg-brand-gold/10'
                          : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-dark-hover/50',
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon style={{ width: '18px', height: '18px' }} className="shrink-0" />
                      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                      {!collapsed && renderStar(item.path)}
                    </NavLink>
                  </div>
                )
              })}
            </div>
          )
        })}

        {/* Logout */}
        <div className={cn(!collapsed && 'mt-4')}>
          {!collapsed && (
            <div className="border-t border-brand-dark-border my-2" />
          )}
          <button
            onClick={handleLogout}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-brand-text-muted hover:text-status-error hover:bg-status-error/10',
              collapsed && 'justify-center',
            )}
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut style={{ width: '18px', height: '18px' }} className="shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(v => !v)}
        className="flex items-center justify-center h-12 border-t border-brand-dark-border text-brand-text-muted hover:text-brand-text transition-colors"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
      </button>
    </aside>
  )
}
