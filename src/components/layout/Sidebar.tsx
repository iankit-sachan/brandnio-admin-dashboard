import { useEffect, useMemo } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LogOut, PanelLeftClose, PanelLeft,
  ChevronRight, ChevronDown,
  Star,
  Search,
  Clock,
  X,
} from 'lucide-react'
import { cn } from '../../utils/cn'
import { useAuth } from '../../context/AuthContext'
import { navSections, sectionContainsPath, type NavItem } from './navConfig'
import { useSidebarPrefs } from '../../hooks/useSidebarPrefs'
import { useSidebarBadges } from '../../hooks/useSidebarBadges'

interface Props {
  /** Open the Cmd+K command palette. Wired from AdminLayout. */
  onOpenPalette: () => void
  /**
   * Below the lg: breakpoint the sidebar behaves as a slide-in drawer.
   * AdminLayout controls the open state; TopBar's hamburger opens it,
   * and it auto-closes on every route change + backdrop click.
   */
  mobileOpen: boolean
  onMobileClose: () => void
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

export function Sidebar({ onOpenPalette, mobileOpen, onMobileClose }: Props) {
  const location = useLocation()
  const {
    collapsed, setCollapsed,
    openSections, toggleSection, openSection,
    pinned, togglePin,
    recent, visitPath,
  } = useSidebarPrefs(computeInitialOpen(location.pathname))
  const { logout } = useAuth()
  const navigate = useNavigate()
  const badges = useSidebarBadges()

  // One map we reuse to resolve both pinned AND recent paths to their
  // full NavItem (icon, label, badgeKey). Built once per nav mutation.
  const byPath = useMemo(() => {
    const m = new Map<string, NavItem>()
    for (const section of navSections) {
      for (const item of section.items) m.set(item.path, item)
    }
    return m
  }, [])

  const pinnedItems: NavItem[] = useMemo(
    () => [...pinned].map(p => byPath.get(p)).filter((x): x is NavItem => !!x),
    [pinned, byPath],
  )

  // Recent excludes anything currently pinned — no reason to show the
  // same row twice. Auto-drops paths that no longer resolve to a real
  // nav item.
  const recentItems: NavItem[] = useMemo(
    () => recent
      .filter(p => !pinned.has(p))
      .map(p => byPath.get(p))
      .filter((x): x is NavItem => !!x),
    [recent, pinned, byPath],
  )

  // Auto-expand the section containing the current route + record the
  // visit into the RECENT list. Only records when the path actually
  // resolves to a known nav item (avoids junk like /oops paths).
  useEffect(() => {
    for (const section of navSections) {
      if (sectionContainsPath(section, location.pathname)) {
        openSection(section.title)
        break
      }
    }
    if (byPath.has(location.pathname)) {
      visitPath(location.pathname)
    }
  }, [location.pathname, openSection, visitPath, byPath])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  /**
   * Red pill next to inbox-style items. Returns null when the item has
   * no badgeKey or the count is zero (nothing to nag the admin about).
   */
  const renderBadge = (item: NavItem) => {
    if (!item.badgeKey) return null
    const count = badges[item.badgeKey]
    if (!count || count <= 0) return null
    return (
      <span
        className="shrink-0 min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-status-error/90 text-white text-[10px] font-semibold leading-none"
        aria-label={`${count} pending`}
      >
        {count > 99 ? '99+' : count}
      </span>
    )
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
    <>
      {/* Mobile backdrop — only visible below lg: when drawer is open */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}
      <aside className={cn(
        'bg-brand-dark-deep border-r border-brand-dark-border flex flex-col h-screen transition-transform duration-200',
        // Mobile — fixed drawer, full w-64, slides in from the left.
        // The `collapsed` pref is ignored on mobile; a narrow drawer is
        // worse than no drawer there.
        'fixed top-0 left-0 z-50 w-64',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
        // Desktop — in-flow, respects collapsed state, always visible.
        'lg:relative lg:translate-x-0 lg:shrink-0',
        collapsed ? 'lg:w-16' : 'lg:w-64',
      )}>
        {/* Logo + mobile close button */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-brand-dark-border shrink-0">
          <div className="h-8 w-8 bg-brand-gold rounded-lg flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-gray-900">B</span>
          </div>
          {!collapsed && <span className="text-lg font-bold text-brand-text">Brandnio</span>}
          {/* Mobile-only close button — lets admin dismiss the drawer
              without needing to tap outside it. */}
          <button
            onClick={onMobileClose}
            aria-label="Close navigation"
            className="lg:hidden ml-auto p-1 text-brand-text-muted hover:text-brand-text rounded hover:bg-brand-dark-hover transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
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
                    {!collapsed && renderBadge(item)}
                    {!collapsed && renderStar(item.path)}
                  </NavLink>
                </div>
              )
            })}
          </div>
        )}

        {/* ─── Recently visited (auto-tracked, max 5, excludes pinned) ─── */}
        {recentItems.length > 0 && (
          <div>
            {!collapsed ? (
              <div className="flex items-center gap-2 px-4 mt-4 mb-2">
                <div className="flex-1 h-px bg-brand-dark-border" />
                <span className="text-[10px] uppercase tracking-widest text-brand-text-muted font-medium flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" /> RECENT
                </span>
                <div className="flex-1 h-px bg-brand-dark-border" />
              </div>
            ) : (
              <div className="border-t border-brand-dark-border/40 my-2 mx-2" />
            )}
            {recentItems.map(item => {
              const Icon = item.icon
              return (
                <div key={`recent:${item.path}`} className="group relative">
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
                    {!collapsed && renderBadge(item)}
                    {!collapsed && renderStar(item.path)}
                  </NavLink>
                </div>
              )
            })}
          </div>
        )}

        {/* ─── Regular sections ─── */}
        {navSections.map((section, sIdx) => {
          const isOpen = openSections.has(section.title)
          // Only show the group divider when the group label actually
          // CHANGES from the previous section — otherwise contiguous
          // sections in the same group (e.g. POST EDITOR + FESTIVALS in
          // TOOLS) would render the divider twice in a row.
          const prevGroup = sIdx > 0 ? navSections[sIdx - 1].group : undefined
          const showGroupDivider = !!section.group && section.group !== prevGroup
          return (
            <div key={section.title}>
              {showGroupDivider && !collapsed && (
                <div className="flex items-center gap-2 px-4 mt-5 mb-2">
                  <div className="flex-1 h-px bg-brand-dark-border" />
                  <span className="text-[10px] uppercase tracking-widest text-brand-text-muted font-medium">{section.group}</span>
                  <div className="flex-1 h-px bg-brand-dark-border" />
                </div>
              )}
              {showGroupDivider && collapsed && (
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
                  <div key={item.path}>
                    {/* Optional sub-heading inside a long section. The first
                        item of each sub-group carries `subheading`; the
                        heading renders once above it. Hidden in collapsed
                        mode since icon-only rows already feel dense. */}
                    {item.subheading && !collapsed && (
                      <div className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-wider text-brand-text-muted/70 font-medium">
                        {item.subheading}
                      </div>
                    )}
                    <div className="group relative">
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
                        {!collapsed && renderBadge(item)}
                        {!collapsed && renderStar(item.path)}
                      </NavLink>
                    </div>
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

      {/* Collapse toggle — desktop only. On mobile the drawer dismisses
          via the X button or tapping the backdrop, so no need. */}
      <button
        onClick={() => setCollapsed(v => !v)}
        className="hidden lg:flex items-center justify-center h-12 border-t border-brand-dark-border text-brand-text-muted hover:text-brand-text transition-colors"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
      </button>
      </aside>
    </>
  )
}
