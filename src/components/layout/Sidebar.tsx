import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, CreditCard, Briefcase,
  Image, Frame, Building,
  Grid, Smile, Wrench, Layers,
  MessageSquare,
  Type, Droplets, Palette, FileText, Trash,
  LogOut, PanelLeftClose, PanelLeft,
  Calendar, Tag,
  Package,
  Film, Music, Video,
  Settings,
  Megaphone,
  BookOpen, Mail, Handshake, Store,
  ChevronRight, ChevronDown, Home, Rss,
  Share2,
  Paintbrush,
  Globe,
  BarChart3, Compass, FolderTree, Quote,
  PlusCircle, Layout, Star, Gift,
  PlayCircle, Shield, Bell,
  ShoppingBag, User,
  Sparkles, HelpCircle, Zap,
  DollarSign, Phone,
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
  icon: React.ElementType
  color?: string
  items: NavItem[]
  defaultOpen?: boolean
}

const navSections: NavSection[] = [
  {
    title: 'DASHBOARD',
    icon: LayoutDashboard,
    defaultOpen: true,
    items: [
      { path: '/', label: 'Overview', icon: BarChart3 },
    ],
  },
  {
    title: 'HOME',
    icon: Home,
    color: '#6637D9',
    defaultOpen: false,
    items: [
      { path: '/home-banners', label: 'Home Banners', icon: Image },
      { path: '/home-cards', label: 'Home Cards', icon: CreditCard },
      { path: '/home-card-sections', label: 'Card Sections', icon: Layers },
      { path: '/promo-announcements', label: 'Promo Announcements', icon: Megaphone },
      { path: '/festivals', label: 'Festival Calendar', icon: Calendar },
      { path: '/festival-posters', label: 'Festival Posters', icon: Image },
      { path: '/feeds', label: 'Feed Items', icon: Rss },
      { path: '/feed-banners', label: 'Feed Banners', icon: Image },
      { path: '/feed-config', label: 'Feed Config', icon: Settings },
      { path: '/explore-features', label: 'Explore Features', icon: Compass },
    ],
  },
  {
    title: 'CATEGORY',
    icon: Grid,
    color: '#F5A623',
    defaultOpen: false,
    items: [
      { path: '/categories/general', label: 'All Categories', icon: FolderTree },
      { path: '/posters', label: 'All Posters', icon: Image },
      { path: '/poster-frames', label: 'Poster Frames', icon: Frame },
      { path: '/statuses', label: 'Status Categories', icon: MessageSquare },
      { path: '/status-quotes', label: 'Status Quotes', icon: Quote },
    ],
  },
  {
    title: 'CREATE',
    icon: PlusCircle,
    color: '#3F5F92',
    defaultOpen: false,
    items: [
      { path: '/create-tools', label: 'Create Tools', icon: Wrench },
      { path: '/canvas-presets', label: 'Canvas Presets', icon: Layout },
      { path: '/misc/format-categories', label: 'Format Categories', icon: Grid },
      { path: '/create-screen-banners', label: 'Screen Banners', icon: Image },
      { path: '/sticker-packs', label: 'Sticker Packs', icon: Smile },
      { path: '/stickers', label: 'Stickers', icon: Star },
      { path: '/editor-sticker-categories', label: 'Editor Sticker Cats', icon: Grid },
      { path: '/editor-stickers', label: 'Editor Stickers', icon: Star },
      { path: '/greetings/categories', label: 'Greeting Categories', icon: Gift },
      { path: '/greetings/templates', label: 'Greeting Templates', icon: FileText },
      { path: '/video-categories', label: 'Video Categories', icon: Video },
      { path: '/video-templates', label: 'Video Templates', icon: Film },
      { path: '/collage/layouts', label: 'Collage Layouts', icon: Layout },
      { path: '/logo-maker/industries', label: 'Logo Industries', icon: Palette },
      { path: '/logo-maker/styles', label: 'Logo Styles', icon: Paintbrush },
      { path: '/slideshow/config', label: 'Slideshow Config', icon: PlayCircle },
    ],
  },
  {
    title: 'BUSINESS',
    icon: Briefcase,
    color: '#745B3B',
    defaultOpen: false,
    items: [
      { path: '/vbizcard/categories', label: 'Card Categories', icon: CreditCard },
      { path: '/vbizcard/templates', label: 'Card Templates', icon: FileText },
      { path: '/vbizcard/home-sections', label: 'Card Home Sections', icon: Layout },
      { path: '/vbizcard/promo-banners', label: 'Card Promo Banners', icon: Image },
      { path: '/vbizcard/testimonials', label: 'Card Testimonials', icon: MessageSquare },
      { path: '/card-wizard/configs', label: 'Wizard Config', icon: Settings },
      { path: '/card-wizard/features', label: 'Wizard Features', icon: Star },
      { path: '/business/industries', label: 'Business Industries', icon: Building },
      { path: '/business/social-platforms', label: 'Social Platforms', icon: Share2 },
    ],
  },
  {
    title: 'AI TOOLS',
    icon: Sparkles,
    color: '#22C55E',
    defaultOpen: false,
    items: [
      { path: '/ai-tools', label: 'Tool List', icon: Wrench },
      { path: '/ai-usage', label: 'Usage Analytics', icon: BarChart3 },
      { path: '/bg-removal/credits', label: 'BG Credits', icon: CreditCard },
      { path: '/bg-removal/config', label: 'BG Config', icon: Settings },
      { path: '/bg-removal/faqs', label: 'BG FAQs', icon: HelpCircle },
      { path: '/bg-removal/testimonials', label: 'BG Testimonials', icon: MessageSquare },
      { path: '/bg-removal/banners', label: 'BG Banners', icon: Image },
      { path: '/product-ads/categories', label: 'Ad Categories', icon: Tag },
      { path: '/product-ads/templates', label: 'Ad Templates', icon: FileText },
      { path: '/product-ads/products', label: 'Products', icon: Package },
      { path: '/product-ads/generated', label: 'Generated Ads', icon: Zap },
      { path: '/product-ads/config', label: 'Ad Config', icon: Settings },
    ],
  },
  {
    title: 'USERS',
    icon: Users,
    defaultOpen: false,
    items: [
      { path: '/users', label: 'All Users', icon: Users },
      { path: '/business-profiles', label: 'Business Profiles', icon: Building },
      { path: '/subscriptions', label: 'Subscriptions', icon: CreditCard },
      { path: '/plans', label: 'Plans', icon: FileText },
      { path: '/credit-transactions', label: 'Credit Transactions', icon: DollarSign },
    ],
  },
  {
    title: 'CONTENT',
    icon: FileText,
    defaultOpen: false,
    items: [
      { path: '/tutorials', label: 'Tutorials', icon: BookOpen },
      { path: '/notifications/send', label: 'Send Notification', icon: Bell },
      { path: '/contact-submissions', label: 'Contact Inbox', icon: Mail },
      { path: '/partner-inquiries', label: 'Partner Inbox', icon: Handshake },
      { path: '/policies', label: 'Policies', icon: Shield },
      { path: '/brand-mall/categories', label: 'Mall Categories', icon: ShoppingBag },
      { path: '/brand-mall/listings', label: 'Mall Listings', icon: Store },
      { path: '/brand-mall/config', label: 'Mall Config', icon: Settings },
      { path: '/politicians', label: 'Politicians', icon: User },
      { path: '/reels', label: 'Reels', icon: Film },
      { path: '/music-tracks', label: 'Music Tracks', icon: Music },
      { path: '/greetings/customers', label: 'Customers', icon: Users },
      { path: '/delete-requests', label: 'Delete Requests', icon: Trash },
    ],
  },
  {
    title: 'SETTINGS',
    icon: Settings,
    defaultOpen: false,
    items: [
      { path: '/settings/watermark', label: 'Watermark', icon: Droplets },
      { path: '/settings/design', label: 'Design Settings', icon: Palette },
      { path: '/misc/language-options', label: 'Languages', icon: Globe },
      { path: '/misc/contact-config', label: 'Contact Config', icon: Phone },
      { path: '/taglines', label: 'Taglines', icon: Type },
      { path: '/popup-posters', label: 'Popup Posters', icon: Image },
    ],
  },
]

/** Check if a section contains a link matching the current path */
function sectionContainsPath(section: NavSection, pathname: string): boolean {
  return section.items.some(item =>
    item.path === '/'
      ? pathname === '/'
      : pathname === item.path || pathname.startsWith(item.path + '/')
  )
}

function computeOpenSections(pathname: string): Set<string> {
  const open = new Set<string>()
  for (const section of navSections) {
    if (section.defaultOpen || sectionContainsPath(section, pathname)) {
      open.add(section.title)
    }
  }
  return open
}

export function Sidebar() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [openSections, setOpenSections] = useState<Set<string>>(() =>
    computeOpenSections(location.pathname)
  )
  const { logout } = useAuth()
  const navigate = useNavigate()

  // Auto-expand section when navigating to a link inside a collapsed section
  useEffect(() => {
    for (const section of navSections) {
      if (sectionContainsPath(section, location.pathname) && !openSections.has(section.title)) {
        setOpenSections(prev => {
          const next = new Set(prev)
          next.add(section.title)
          return next
        })
        break
      }
    }
  }, [location.pathname])

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
                  <span className="flex items-center gap-2">
                    {section.color && (
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: section.color }} />
                    )}
                    {section.title}
                  </span>
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
