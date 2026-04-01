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
  Film, Music, Video,
  Wand2, Settings2, Settings,
  Send, History,
  Megaphone, PenTool,
  BookOpen, Mail, Handshake, FileCheck, Store,
  IdCard, GalleryHorizontalEnd, LayoutList, Maximize2,
  ChevronRight, ChevronDown, Home, Rss,
  Receipt,
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
  defaultOpen?: boolean
}

const navSections: NavSection[] = [
  {
    title: 'MAIN',
    defaultOpen: true,
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    ],
  },
  {
    title: 'USERS',
    defaultOpen: false,
    items: [
      { label: 'All Users', icon: Users, path: '/users' },
      { label: 'Active Plans', icon: CreditCard, path: '/users/active-plans' },
      { label: 'Expired Plans', icon: XCircle, path: '/users/expired-plans' },
      { label: 'Business Profiles', icon: Briefcase, path: '/users/business-profiles' },
      { label: 'Political Profiles', icon: Landmark, path: '/users/political-profiles' },
    ],
  },
  {
    title: 'POSTERS & CATEGORIES',
    defaultOpen: true,
    items: [
      { label: 'Home Sections', icon: Home, path: '/posters/home-sections' },
      { label: 'Home Banners', icon: Megaphone, path: '/posters/home-banners' },
      { label: 'Promo Announcements', icon: Megaphone, path: '/posters/promo-announcements' },
      { label: 'Home Cards', icon: Image, path: '/posters/home-cards' },
      { label: 'Home Card Sections', icon: Grid3X3, path: '/posters/home-card-sections' },
      { label: 'All Posters', icon: Image, path: '/posters' },
      { label: 'Festival Posters', icon: PartyPopper, path: '/posters/festival' },
      { label: 'Frame Posters', icon: Frame, path: '/posters/frames' },
      { label: 'Business Posters', icon: Building2, path: '/posters/business' },
      { label: 'Business Category', icon: FolderOpen, path: '/posters/business-category' },
      { label: 'Create Tools', icon: PenTool, path: '/posters/create-tools' },
      { label: 'Canvas Presets', icon: Maximize2, path: '/posters/canvas-presets' },
      { label: 'Create Banners', icon: Megaphone, path: '/posters/create-banners' },
      { label: 'Video Categories', icon: Film, path: '/posters/video-categories' },
      { label: 'Video Templates', icon: Video, path: '/posters/video-templates' },
      { label: 'General Category', icon: Grid3X3, path: '/categories/general' },
      { label: 'Recycle Bin', icon: Trash2, path: '/categories/recycle-bin' },
      { label: 'Politician Category', icon: Vote, path: '/categories/politician' },
      { label: 'Politician Image', icon: ImagePlus, path: '/categories/politician-image' },
    ],
  },
  {
    title: 'FESTIVALS & GREETINGS',
    defaultOpen: false,
    items: [
      { label: 'Festival List', icon: CalendarDays, path: '/festivals' },
      { label: 'Greeting Categories', icon: Tags, path: '/greetings/categories' },
      { label: 'Greeting Templates', icon: LayoutTemplate, path: '/greetings/templates' },
      { label: 'Greeting Config', icon: Settings, path: '/greetings/config' },
      { label: 'Customers', icon: Users, path: '/greetings/customers' },
    ],
  },
  {
    title: 'VBIZ CARD',
    defaultOpen: true,
    items: [
      { label: 'VC Categories', icon: IdCard, path: '/vbizcard/categories' },
      { label: 'VC Templates', icon: GalleryHorizontalEnd, path: '/vbizcard/templates' },
      { label: 'VC Home Sections', icon: LayoutList, path: '/vbizcard/home-sections' },
      { label: 'VC Promo Banners', icon: Megaphone, path: '/vbizcard/promo-banners' },
      { label: 'VC Testimonials', icon: MessageSquare, path: '/vbizcard/testimonials' },
    ],
  },
  {
    title: 'FREE STATUS',
    defaultOpen: false,
    items: [
      { label: 'Status Categories', icon: Tags, path: '/statuses/categories' },
      { label: 'Status Quotes', icon: Type, path: '/statuses/quotes' },
    ],
  },
  {
    title: 'FEEDS',
    defaultOpen: false,
    items: [
      { label: 'Feed Items', icon: Rss, path: '/feeds/items' },
      { label: 'Feed Banners', icon: Image, path: '/feeds/banners' },
      { label: 'Feed Config', icon: Settings, path: '/feeds/config' },
    ],
  },
  {
    title: 'MEDIA & ADS',
    defaultOpen: false,
    items: [
      { label: 'Reel Monitor', icon: Film, path: '/reels' },
      { label: 'Music Tracks', icon: Music, path: '/reels/music' },
      { label: 'Ad Templates', icon: PenTool, path: '/product-ads/templates' },
      { label: 'Generated Ads', icon: Megaphone, path: '/product-ads' },
      { label: 'Ad Categories', icon: Tags, path: '/product-ads/categories' },
      { label: 'Ad Config', icon: Settings, path: '/product-ads/config' },
      { label: 'Slideshow Config', icon: Settings, path: '/slideshow/config' },
      { label: 'Products', icon: Package, path: '/product-ads/products' },
      { label: 'Sticker Packs', icon: Package, path: '/stickers' },
      { label: 'Editor Stickers', icon: Palette, path: '/editor-stickers' },
    ],
  },
  {
    title: 'COMMUNICATION',
    defaultOpen: false,
    items: [
      { label: 'Communication Center', icon: MessageSquare, path: '/communication' },
      { label: 'Send Notification', icon: Send, path: '/notifications/send' },
      { label: 'Notification History', icon: History, path: '/notifications/history' },
    ],
  },
  {
    title: 'CONTENT',
    defaultOpen: false,
    items: [
      { label: 'Tutorials', icon: BookOpen, path: '/content/tutorials' },
      { label: 'Contact Inbox', icon: Mail, path: '/content/contact' },
      { label: 'Partner Inbox', icon: Handshake, path: '/content/partners' },
      { label: 'Policies', icon: FileCheck, path: '/content/policies' },
      { label: 'Mall Moderation', icon: Store, path: '/content/mall' },
      { label: 'Greeting Posters', icon: Smile, path: '/content-types/greetings' },
      { label: 'Service Posters', icon: Wrench, path: '/content-types/services' },
      { label: 'Stickers', icon: Sticker, path: '/content-types/stickers' },
      { label: 'Service List', icon: List, path: '/content-types/service-list' },
      { label: 'Pop-up Posters', icon: Layers, path: '/content-types/popups' },
      { label: 'Service Categories', icon: FolderCog, path: '/services/categories' },
      { label: 'Service Directory', icon: ClipboardList, path: '/services' },
    ],
  },
  {
    title: 'BG REMOVAL',
    defaultOpen: false,
    items: [
      { label: 'Credit Plans', icon: CreditCard, path: '/ai-tools/bg-credits' },
      { label: 'FAQs', icon: FileText, path: '/ai-tools/faqs' },
      { label: 'Testimonials', icon: MessageSquare, path: '/ai-tools/testimonials' },
      { label: 'Credit Transactions', icon: Receipt, path: '/ai-tools/credit-transactions' },
    ],
  },
  {
    title: 'AI TOOLS',
    defaultOpen: false,
    items: [
      { label: 'Manage AI Tools', icon: Wrench, path: '/ai-tools/manage' },
    ],
  },
  {
    title: 'SETTINGS',
    defaultOpen: false,
    items: [
      { label: 'AI Dashboard', icon: Wand2, path: '/ai-tools' },
      { label: 'Tool Config', icon: Settings2, path: '/ai-tools/config' },
      { label: 'Subscriptions', icon: Crown, path: '/subscriptions' },
      { label: 'Plans', icon: ListOrdered, path: '/subscriptions/plans' },
      { label: 'Taglines', icon: Type, path: '/settings/taglines' },
      { label: 'Payment Plans', icon: CreditCard, path: '/settings/payment-plans' },
      { label: 'Watermark Options', icon: Droplets, path: '/settings/watermark' },
      { label: 'Design Settings', icon: Palette, path: '/settings/design' },
      { label: 'Policies', icon: FileText, path: '/settings/policies' },
      { label: 'Delete Requests', icon: Trash2, path: '/settings/delete-requests' },
    ],
  },
]

const DEFAULT_OPEN = new Set(
  navSections.filter(s => s.defaultOpen).map(s => s.title)
)

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [openSections, setOpenSections] = useState<Set<string>>(DEFAULT_OPEN)
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const toggleSection = (title: string) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(title)) next.delete(title)
      else next.add(title)
      return next
    })
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
        {navSections.map((section) => {
          const isOpen = openSections.has(section.title)
          return (
            <div key={section.title}>
              {/* Section header — clickable to toggle */}
              {!collapsed ? (
                <button
                  onClick={() => toggleSection(section.title)}
                  className="w-full flex items-center justify-between text-xs uppercase tracking-wider text-brand-gold font-semibold px-4 mt-4 mb-1 hover:text-brand-gold/80 transition-colors"
                >
                  <span>{section.title}</span>
                  {isOpen
                    ? <ChevronDown className="h-3 w-3" />
                    : <ChevronRight className="h-3 w-3" />
                  }
                </button>
              ) : (
                <div className="border-t border-brand-dark-border/30 my-2 mx-2" />
              )}

              {/* Nav items — collapsed sections only show when sidebar is collapsed (icon-only mode) */}
              {(isOpen || collapsed) && section.items.map((item) => {
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
