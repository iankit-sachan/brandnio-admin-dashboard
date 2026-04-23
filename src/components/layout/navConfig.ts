/**
 * Sidebar nav data — extracted from Sidebar.tsx so both the sidebar
 * itself and the Cmd+K command palette can consume the same list.
 *
 * If you add/rename/move a page, do it here.
 */
import {
  LayoutDashboard, Users, CreditCard, Briefcase,
  Image, Frame, Building,
  Grid, Smile, Wrench, Layers,
  MessageSquare,
  Type, Droplets, Palette, FileText, Trash,
  Calendar, Tag,
  Package,
  Film, Music, Video,
  Settings,
  Megaphone,
  BookOpen, Mail, Handshake, Store,
  Home, Rss,
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

export interface NavItem {
  label: string
  path: string
  icon: React.ElementType
}

export interface NavSection {
  title: string
  icon: React.ElementType
  color?: string
  items: NavItem[]
  defaultOpen?: boolean
  group?: string
}

export const navSections: NavSection[] = [
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
      { path: '/posters/category-banners', label: 'Category Banners', icon: Image },
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
      { path: '/posters/business', label: 'Business Posters', icon: Image },
      { path: '/posters/business-category', label: 'Business Categories', icon: Layout },
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
      { path: '/festival-calendar', label: 'Festival Calendar', icon: Calendar },
      { path: '/festivals', label: 'Festivals List', icon: Tag },
      { path: '/posters/festival', label: 'Festival Posters', icon: Image },
      { path: '/languages', label: 'Languages', icon: Tag },
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
      { path: '/business/industries', label: 'Business Industries', icon: Building },
      // Renamed from 'Business Categories' — it's industry sub-taxonomy for
      // users, not poster categories. Disambiguates from the identically-
      // named item under BUSINESS TAB (/posters/business-category).
      { path: '/business/categories', label: 'Industry Subcategories', icon: Building },
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
      { path: '/settings/policies', label: 'Policy Pages', icon: Shield },
      { path: '/business/setup-config', label: 'Business Setup', icon: Building },
      { path: '/settings/delete-requests', label: 'Delete Requests', icon: Trash },
    ],
  },

  // ─── UPGRADE / MONETIZATION ─────────────────────────────
  {
    title: 'UPGRADE',
    icon: DollarSign,
    defaultOpen: false,
    items: [
      // ── Existing (moved out of USERS + SETTINGS) ──
      { path: '/subscriptions', label: 'Subscriptions', icon: CreditCard },
      { path: '/subscriptions/plans', label: 'Plans', icon: FileText },
      { path: '/users/active-plans', label: 'Active Plans', icon: CreditCard },
      { path: '/users/expired-plans', label: 'Expired Plans', icon: CreditCard },
      { path: '/settings/payment-plans', label: 'Payment Plans', icon: CreditCard },

      // ── New (stubbed — build out in follow-up sessions) ──
      { path: '/upgrade/revenue', label: 'Revenue Dashboard', icon: BarChart3 },
      { path: '/upgrade/promo-codes', label: 'Promo Codes', icon: Tag },
      { path: '/upgrade/free-trial', label: 'Free Trial Config', icon: Gift },
      { path: '/upgrade/pricing-page', label: 'Pricing Page Editor', icon: Layout },
      { path: '/upgrade/paywall', label: 'Paywall Editor', icon: Sparkles },
      { path: '/upgrade/razorpay-log', label: 'Razorpay Log', icon: FileText },
      { path: '/upgrade/refunds', label: 'Refund Manager', icon: PenSquare },
      { path: '/upgrade/feature-matrix', label: 'Feature Matrix', icon: Grid },
    ],
  },
]

/**
 * Flattened list: every nav item with its parent section title.
 * Used by the command palette for search.
 */
export interface FlatNavItem extends NavItem {
  section: string
}

export const flatNav: FlatNavItem[] = navSections.flatMap(section =>
  section.items.map(item => ({ ...item, section: section.title }))
)

export function sectionContainsPath(section: NavSection, pathname: string): boolean {
  return section.items.some(item =>
    item.path === '/'
      ? pathname === '/'
      : pathname === item.path || pathname.startsWith(item.path + '/'),
  )
}
