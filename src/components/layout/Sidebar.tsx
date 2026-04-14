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
  Paintbrush, PenSquare,
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
  group?: string  // Group label shown as divider above this section
}

const navSections: NavSection[] = [
  // ─── ADMIN ──────────────────────────────────────────────
  {
    title: 'DASHBOARD',
    icon: LayoutDashboard,
    defaultOpen: true,
    items: [
      { path: '/', label: 'Overview', icon: BarChart3 },
    ],
  },

  // ─── APP TABS (matches 5 bottom nav tabs in the app) ────
  {
    title: 'HOME TAB',
    group: 'APP TABS',
    icon: Home,
    color: '#6637D9',
    defaultOpen: false,
    items: [
      { path: '/posters/home-banners', label: 'Home Banners', icon: Image },
      { path: '/posters/home-cards', label: 'Home Cards', icon: CreditCard },
      { path: '/posters/home-card-sections', label: 'Card Sections', icon: Layers },
      { path: '/posters/promo-announcements', label: 'Promo Announcements', icon: Megaphone },
      { path: '/misc/explore-features', label: 'Explore Features', icon: Compass },
      { path: '/feeds/items', label: 'Feed Items', icon: Rss },
      { path: '/feeds/banners', label: 'Feed Banners', icon: Image },
      { path: '/feeds/config', label: 'Feed Config', icon: Settings },
    ],
  },
  {
    title: 'CATEGORY TAB',
    icon: Grid,
    color: '#F5A623',
    defaultOpen: false,
    items: [
      { path: '/categories/general', label: 'All Categories', icon: FolderTree },
      { path: '/posters', label: 'Poster Templates', icon: Image },
      { path: '/posters/tags', label: 'Tag Manager', icon: Tag },
      { path: '/posters/home-sections', label: 'Home Sections', icon: Compass },
      { path: '/categories/recycle-bin', label: 'Recycle Bin', icon: Trash },
      { path: '/statuses/categories', label: 'Status Categories', icon: MessageSquare },
      { path: '/statuses/quotes', label: 'Status Quotes', icon: Quote },
    ],
  },
  {
    title: 'CREATE TAB',
    icon: PlusCircle,
    color: '#3F5F92',
    defaultOpen: false,
    items: [
      { path: '/posters/create-banners', label: 'Screen Banners', icon: Image },
      { path: '/posters/create-tools', label: 'Create Tools', icon: Wrench },
      { path: '/stickers', label: 'Sticker Packs', icon: Smile },
      { path: '/sticker-banners', label: 'Sticker Banners', icon: Image },
      { path: '/greetings/categories', label: 'Greeting Categories', icon: Gift },
      { path: '/greetings/templates', label: 'Greeting Templates', icon: FileText },
      { path: '/greetings/config', label: 'Greeting Config', icon: Settings },
      { path: '/posters/video-categories', label: 'Video Categories', icon: Video },
      { path: '/posters/video-templates', label: 'Video Templates', icon: Film },
      { path: '/collage/layouts', label: 'Collage Layouts', icon: Layout },
      { path: '/collage/config', label: 'Collage Config', icon: Settings },
      { path: '/logo-maker/industries', label: 'Logo Industries', icon: Palette },
      { path: '/logo-maker/styles', label: 'Logo Styles', icon: Paintbrush },
      { path: '/logo-maker/configs', label: 'Logo Config', icon: Settings },
      { path: '/slideshow/config', label: 'Slideshow Config', icon: PlayCircle },
    ],
  },
  {
    title: 'BUSINESS TAB',
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
      { path: '/card-wizard/form-fields', label: 'Wizard Fields', icon: FileText },
      { path: '/card-wizard/social-channels', label: 'Wizard Socials', icon: Share2 },
      { path: '/card-wizard/payment-gateways', label: 'Wizard Payments', icon: CreditCard },
    ],
  },
  {
    title: 'AI TOOLS TAB',
    icon: Sparkles,
    color: '#22C55E',
    defaultOpen: false,
    items: [
      { path: '/ai-tools/manage', label: 'Tool List', icon: Wrench },
      { path: '/ai-tools', label: 'Dashboard', icon: BarChart3 },
      { path: '/ai-tools/bg-credits', label: 'BG Credits', icon: CreditCard },
      { path: '/ai-tools/config', label: 'AI Config', icon: Settings },
      { path: '/ai-tools/faqs', label: 'BG FAQs', icon: HelpCircle },
      { path: '/ai-tools/testimonials', label: 'BG Testimonials', icon: MessageSquare },
      { path: '/ai-tools/credit-transactions', label: 'Credit Transactions', icon: DollarSign },
      { path: '/product-ads/categories', label: 'Ad Categories', icon: Tag },
      { path: '/product-ads/templates', label: 'Ad Templates', icon: FileText },
      { path: '/product-ads/products', label: 'Products', icon: Package },
      { path: '/product-ads', label: 'Generated Ads', icon: Zap },
      { path: '/product-ads/config', label: 'Ad Config', icon: Settings },
    ],
  },

  // ─── POSTER EDITOR ──────────────────────────────────────
  {
    title: 'POST EDITOR',
    group: 'TOOLS',
    icon: PenSquare,
    color: '#0EA5E9',
    defaultOpen: false,
    items: [
      { path: '/posters/frames', label: 'Poster Frames', icon: Frame },
      { path: '/posters/canvas-presets', label: 'Canvas Presets', icon: Layout },
      { path: '/misc/format-categories', label: 'Format Categories', icon: Grid },
      { path: '/misc/editor-sticker-categories', label: 'Editor Sticker Cats', icon: Grid },
      { path: '/editor-stickers', label: 'Editor Stickers', icon: Star },
      { path: '/settings/watermark', label: 'Watermark', icon: Droplets },
      { path: '/settings/design', label: 'Design Settings', icon: Palette },
    ],
  },

  // ─── FESTIVALS ──────────────────────────────────────────
  {
    title: 'FESTIVALS',
    icon: Calendar,
    color: '#E91E63',
    defaultOpen: false,
    items: [
      { path: '/festivals', label: 'Festival Calendar', icon: Calendar },
      { path: '/posters/festival', label: 'Festival Posters', icon: Image },
    ],
  },

  // ─── ADMIN MANAGEMENT ───────────────────────────────────
  {
    title: 'USERS',
    group: 'ADMIN',
    icon: Users,
    defaultOpen: false,
    items: [
      { path: '/users', label: 'All Users', icon: Users },
      { path: '/users/business-profiles', label: 'Business Profiles', icon: Building },
      { path: '/users/political-profiles', label: 'Political Profiles', icon: User },
      { path: '/subscriptions', label: 'Subscriptions', icon: CreditCard },
      { path: '/subscriptions/plans', label: 'Plans', icon: FileText },
      { path: '/users/active-plans', label: 'Active Plans', icon: CreditCard },
      { path: '/users/expired-plans', label: 'Expired Plans', icon: CreditCard },
      { path: '/business/industries', label: 'Business Industries', icon: Building },
      { path: '/business/social-platforms', label: 'Social Platforms', icon: Share2 },
    ],
  },
  {
    title: 'CONTENT',
    icon: FileText,
    defaultOpen: false,
    items: [
      { path: '/content/tutorials', label: 'Tutorials', icon: BookOpen },
      { path: '/notifications/send', label: 'Send Notification', icon: Bell },
      { path: '/notifications/history', label: 'Notification History', icon: Bell },
      { path: '/content/contact', label: 'Contact Inbox', icon: Mail },
      { path: '/content/partners', label: 'Partner Inbox', icon: Handshake },
      { path: '/content/policies', label: 'Policies', icon: Shield },
      { path: '/misc/mall-categories', label: 'Mall Categories', icon: ShoppingBag },
      { path: '/content/mall', label: 'Mall Listings', icon: Store },
      { path: '/brand-mall/config', label: 'Mall Config', icon: Settings },
      { path: '/brand-mall/spotlight', label: 'Mall Spotlight', icon: ShoppingBag },
      { path: '/categories/politician', label: 'Politician Cats', icon: User },
      { path: '/categories/politician-image', label: 'Politician Images', icon: Image },
      { path: '/reels', label: 'Reels', icon: Film },
      { path: '/services/categories', label: 'Service Categories', icon: Grid },
      { path: '/services', label: 'Services', icon: Wrench },
      { path: '/reels/music', label: 'Music Tracks', icon: Music },
      { path: '/greetings/customers', label: 'Customers', icon: Users },
    ],
  },
  {
    title: 'SETTINGS',
    icon: Settings,
    defaultOpen: false,
    items: [
      { path: '/misc/languages', label: 'Languages', icon: Globe },
      { path: '/misc/contact-config', label: 'Contact Config', icon: Phone },
      { path: '/settings/taglines', label: 'Taglines', icon: Type },
      { path: '/settings/payment-plans', label: 'Payment Plans', icon: CreditCard },
      { path: '/settings/policies', label: 'Policy Pages', icon: Shield },
      { path: '/business/setup-config', label: 'Business Setup', icon: Building },
      { path: '/settings/delete-requests', label: 'Delete Requests', icon: Trash },
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
              {/* Group divider label */}
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
