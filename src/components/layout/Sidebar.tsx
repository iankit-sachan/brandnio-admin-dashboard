import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, CreditCard, XCircle, Briefcase, Landmark,
  Image, PartyPopper, Frame, Building2, FolderOpen,
  Grid3X3, Vote, ImagePlus,
  Smile, Wrench, Sticker, List, Layers,
  MessageSquare,
  Type, Droplets, Palette, FileText, Trash2,
  LogOut, PanelLeftClose, PanelLeft,
  CalendarDays, Crown, ListOrdered,
  Tags, LayoutTemplate,
  Package,
  FolderCog, ClipboardList,
  Film, Music,
  Wand2,
  Send, History,
  Megaphone, PenTool,
  BookOpen, Mail, Handshake, FileCheck, Store,
  IdCard, GalleryHorizontalEnd
} from 'lucide-react'
import { cn } from '../../utils/cn'
import { useAuth } from '../../context/AuthContext'

interface NavItem {
  label: string
  path: string
  icon: React.ElementType
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    title: 'MAIN',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    ],
  },
  {
    title: 'USER MANAGEMENT',
    items: [
      { label: 'All Users', icon: Users, path: '/users' },
      { label: 'Active Plans', icon: CreditCard, path: '/users/active-plans' },
      { label: 'Expired Plans', icon: XCircle, path: '/users/expired-plans' },
      { label: 'Business Profiles', icon: Briefcase, path: '/users/business-profiles' },
      { label: 'Political Profiles', icon: Landmark, path: '/users/political-profiles' },
    ],
  },
  {
    title: 'CONTENT MANAGEMENT',
    items: [
      { label: 'All Posters', icon: Image, path: '/posters' },
      { label: 'Festival Posters', icon: PartyPopper, path: '/posters/festival' },
      { label: 'Frame Posters', icon: Frame, path: '/posters/frames' },
      { label: 'Business Posters', icon: Building2, path: '/posters/business' },
      { label: 'Business Category', icon: FolderOpen, path: '/posters/business-category' },
    ],
  },
  {
    title: 'CATEGORY MANAGEMENT',
    items: [
      { label: 'General Category', icon: Grid3X3, path: '/categories/general' },
      { label: 'Politician Category', icon: Vote, path: '/categories/politician' },
      { label: 'Politician Image', icon: ImagePlus, path: '/categories/politician-image' },
    ],
  },
  {
    title: 'FESTIVALS',
    items: [
      { label: 'Festival List', icon: CalendarDays, path: '/festivals' },
    ],
  },
  {
    title: 'SUBSCRIPTIONS',
    items: [
      { label: 'Subscriptions', icon: Crown, path: '/subscriptions' },
      { label: 'Plans', icon: ListOrdered, path: '/subscriptions/plans' },
    ],
  },
  {
    title: 'GREETINGS',
    items: [
      { label: 'Categories', icon: Tags, path: '/greetings/categories' },
      { label: 'Templates', icon: LayoutTemplate, path: '/greetings/templates' },
    ],
  },
  {
    title: 'STICKERS',
    items: [
      { label: 'Sticker Packs', icon: Package, path: '/stickers' },
    ],
  },
  {
    title: 'SERVICES',
    items: [
      { label: 'Service Categories', icon: FolderCog, path: '/services/categories' },
      { label: 'Service List', icon: ClipboardList, path: '/services' },
    ],
  },
  {
    title: 'REELS',
    items: [
      { label: 'Reel Monitor', icon: Film, path: '/reels' },
      { label: 'Music Tracks', icon: Music, path: '/reels/music' },
    ],
  },
  {
    title: 'AI TOOLS',
    items: [
      { label: 'AI Dashboard', icon: Wand2, path: '/ai-tools' },
    ],
  },
  {
    title: 'NOTIFICATIONS',
    items: [
      { label: 'Send Notification', icon: Send, path: '/notifications/send' },
      { label: 'History', icon: History, path: '/notifications/history' },
    ],
  },
  {
    title: 'PRODUCT ADS',
    items: [
      { label: 'Ad Templates', icon: PenTool, path: '/product-ads/templates' },
      { label: 'Generated Ads', icon: Megaphone, path: '/product-ads' },
    ],
  },
  {
    title: 'CONTENT',
    items: [
      { label: 'Tutorials', icon: BookOpen, path: '/content/tutorials' },
      { label: 'Contact Inbox', icon: Mail, path: '/content/contact' },
      { label: 'Partner Inbox', icon: Handshake, path: '/content/partners' },
      { label: 'Policies', icon: FileCheck, path: '/content/policies' },
      { label: 'Mall Moderation', icon: Store, path: '/content/mall' },
    ],
  },
  {
    title: 'CONTENT TYPES',
    items: [
      { label: 'Greeting Posters', icon: Smile, path: '/content-types/greetings' },
      { label: 'Service Posters', icon: Wrench, path: '/content-types/services' },
      { label: 'Stickers', icon: Sticker, path: '/content-types/stickers' },
      { label: 'Service List', icon: List, path: '/content-types/service-list' },
      { label: 'Pop-up Posters', icon: Layers, path: '/content-types/popups' },
    ],
  },
  {
    title: 'VBIZ CARD',
    items: [
      { label: 'VC Categories', icon: IdCard, path: '/vbizcard/categories' },
      { label: 'VC Templates', icon: GalleryHorizontalEnd, path: '/vbizcard/templates' },
    ],
  },
  {
    title: 'COMMUNICATION',
    items: [
      { label: 'Communication Center', icon: MessageSquare, path: '/communication' },
    ],
  },
  {
    title: 'SETTINGS',
    items: [
      { label: 'Taglines', icon: Type, path: '/settings/taglines' },
      { label: 'Payment Plans', icon: CreditCard, path: '/settings/payment-plans' },
      { label: 'Watermark Options', icon: Droplets, path: '/settings/watermark' },
      { label: 'Design Settings', icon: Palette, path: '/settings/design' },
      { label: 'Policies', icon: FileText, path: '/settings/policies' },
      { label: 'Delete Requests', icon: Trash2, path: '/settings/delete-requests' },
    ],
  },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
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
        {navSections.map((section) => (
          <div key={section.title}>
            {/* Section header */}
            {!collapsed && (
              <div className="text-xs uppercase tracking-wider text-brand-gold font-semibold px-4 mt-4 mb-1">
                {section.title}
              </div>
            )}

            {/* Nav items */}
            {section.items.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end
                  className={({ isActive }) => cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors',
                    collapsed && 'justify-center',
                    isActive
                      ? 'text-brand-gold bg-brand-gold/10'
                      : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-dark-hover/50'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon style={{ width: '18px', height: '18px' }} className="shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              )
            })}
          </div>
        ))}

        {/* Logout */}
        <div className={cn(!collapsed && 'mt-4')}>
          {!collapsed && (
            <div className="border-t border-brand-dark-border my-2" />
          )}
          <button
            onClick={handleLogout}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-brand-text-muted hover:text-status-error hover:bg-status-error/10',
              collapsed && 'justify-center'
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
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-12 border-t border-brand-dark-border text-brand-text-muted hover:text-brand-text transition-colors"
      >
        {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
      </button>
    </aside>
  )
}
