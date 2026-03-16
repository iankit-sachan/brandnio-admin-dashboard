import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, CreditCard, Image, PartyPopper, Bot, Film, Bell,
  Store, Cake, Smile, Megaphone, FileText, ChevronDown, ChevronRight,
  PanelLeftClose, PanelLeft
} from 'lucide-react'
import { cn } from '../../utils/cn'

interface NavItem {
  label: string
  path?: string
  icon: React.ElementType
  children?: { label: string; path: string }[]
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Users', path: '/users', icon: Users },
  {
    label: 'Subscriptions', icon: CreditCard, children: [
      { label: 'Plans', path: '/subscriptions/plans' },
      { label: 'Payments', path: '/subscriptions' },
    ]
  },
  {
    label: 'Posters', icon: Image, children: [
      { label: 'Categories', path: '/posters/categories' },
      { label: 'Templates', path: '/posters' },
      { label: 'Auto-Generated', path: '/posters/auto-generated' },
    ]
  },
  { label: 'Festivals', path: '/festivals', icon: PartyPopper },
  { label: 'AI Tools', path: '/ai-tools', icon: Bot },
  {
    label: 'Reels', icon: Film, children: [
      { label: 'Monitor', path: '/reels' },
      { label: 'Music Tracks', path: '/reels/music' },
    ]
  },
  {
    label: 'Notifications', icon: Bell, children: [
      { label: 'Send', path: '/notifications/send' },
      { label: 'History', path: '/notifications/history' },
    ]
  },
  {
    label: 'Services', icon: Store, children: [
      { label: 'Categories', path: '/services/categories' },
      { label: 'Listings', path: '/services' },
    ]
  },
  {
    label: 'Greetings', icon: Cake, children: [
      { label: 'Categories', path: '/greetings/categories' },
      { label: 'Templates', path: '/greetings/templates' },
    ]
  },
  { label: 'Stickers', path: '/stickers', icon: Smile },
  {
    label: 'Product Ads', icon: Megaphone, children: [
      { label: 'Templates', path: '/product-ads/templates' },
      { label: 'Generated Ads', path: '/product-ads' },
    ]
  },
  {
    label: 'Content', icon: FileText, children: [
      { label: 'Tutorials', path: '/content/tutorials' },
      { label: 'Policies', path: '/content/policies' },
      { label: 'Contact Inbox', path: '/content/contact' },
      { label: 'Partner Inbox', path: '/content/partners' },
      { label: 'Brand Mall', path: '/content/mall' },
    ]
  },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [openSections, setOpenSections] = useState<string[]>([])
  const location = useLocation()

  const toggleSection = (label: string) => {
    setOpenSections(prev =>
      prev.includes(label) ? prev.filter(s => s !== label) : [...prev, label]
    )
  }

  const isActive = (path?: string, children?: { path: string }[]) => {
    if (path) return location.pathname === path
    return children?.some(c => location.pathname === c.path) ?? false
  }

  return (
    <aside className={cn(
      'h-screen bg-brand-dark-deep border-r border-brand-dark-border flex flex-col transition-all duration-200 shrink-0',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-brand-dark-border shrink-0">
        <div className="h-8 w-8 bg-brand-gold rounded-lg flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-gray-900">B</span>
        </div>
        {!collapsed && <span className="text-lg font-bold text-brand-text">Brandnio</span>}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navItems.map(item => {
          const Icon = item.icon
          const active = isActive(item.path, item.children)
          const isOpen = openSections.includes(item.label)

          if (item.children && !collapsed) {
            return (
              <div key={item.label} className="mb-0.5">
                <button
                  onClick={() => toggleSection(item.label)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                    active ? 'text-brand-gold bg-brand-gold/10' : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-dark-hover/50'
                  )}
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" style={{width: '18px', height: '18px'}} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </button>
                {isOpen && (
                  <div className="ml-8 mt-0.5 space-y-0.5">
                    {item.children.map(child => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={({ isActive: a }) => cn(
                          'block px-3 py-2 rounded-lg text-sm transition-colors',
                          a ? 'text-brand-gold bg-brand-gold/10' : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-dark-hover/50'
                        )}
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          if (collapsed) {
            const childActive = item.children?.some(c => location.pathname === c.path)
            return (
              <NavLink
                key={item.label}
                to={item.path || (item.children?.[0]?.path ?? '/')}
                className={({ isActive: a }) => cn(
                  'flex items-center justify-center p-2.5 rounded-lg mb-0.5 transition-colors',
                  (a || childActive) ? 'text-brand-gold bg-brand-gold/10' : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-dark-hover/50'
                )}
                title={item.label}
              >
                <Icon style={{width: '18px', height: '18px'}} />
              </NavLink>
            )
          }

          return (
            <NavLink
              key={item.label}
              to={item.path!}
              className={({ isActive: a }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-0.5 transition-colors',
                a ? 'text-brand-gold bg-brand-gold/10' : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-dark-hover/50'
              )}
            >
              <Icon style={{width: '18px', height: '18px'}} />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-12 border-t border-brand-dark-border text-brand-text-muted hover:text-brand-text transition-colors"
      >
        {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
      </button>
    </aside>
  )
}
