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
  // Tier 2a — added to dedupe in-section icon collisions.
  Settings2, Cog, LayoutGrid, Wallet, Hash, ImagePlus,
} from 'lucide-react'

export interface NavItem {
  label: string
  path: string
  icon: React.ElementType
  /**
   * If set, the sidebar fetches /api/admin/sidebar-badges/ every 60s and
   * shows a red pill with the matching count. Key must exactly match a
   * key in the backend `sidebar_badges` view response.
   */
  badgeKey?: 'contact_inbox' | 'partner_inbox' | 'delete_requests'
  /**
   * If set, a tiny uppercase label is rendered ABOVE this item as a
   * sub-heading within its section (e.g. "── Logo Maker ──"). Useful
   * for chunking long sections. Only needs to be set on the FIRST
   * item of each sub-group; the heading renders once and subsequent
   * items without a subheading flow under it until the next one.
   */
  subheading?: string
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
  // ─── OVERVIEW ───────────────────────────────────────────
  {
    title: 'DASHBOARD',
    group: 'OVERVIEW',
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
      // 2026-04 Home-Tools reshuffle: Explore Features chip list + the
      // 3 Feed pages previously lived here. Moved to the new EXPLORE
      // TOOLS section below so the tools chip-bar on Home and all its
      // admin surfaces are managed in one place.
      { path: '/posters/home-banners', label: 'Home Banners', icon: Image },
      { path: '/posters/home-cards', label: 'Home Cards', icon: CreditCard },
      { path: '/posters/home-card-sections', label: 'Card Sections', icon: Layers },
      { path: '/posters/promo-announcements', label: 'Promo Announcements', icon: Megaphone },
    ],
  },

  // 2026-04 reshuffle: dedicated section for the 6 tools admin sees on
  // the Home screen's "Explore Features" chip row. Groups every admin
  // page that controls those tools under one collapsible section with
  // per-tool subheadings — matches the product mental model (admin
  // thinks "Birthday tool", finds one block, not three scattered
  // sections). AI TOOLS TAB retains only the generic AI infrastructure
  // pages (Tool List, Dashboard, AI Config, Credit Transactions); the
  // BG-specific subset moved here into Remove Background.
  {
    title: 'EXPLORE TOOLS',
    group: 'APP TABS',
    icon: Compass,
    color: '#E11D48',
    defaultOpen: false,
    items: [
      // Meta-control for the chip row on Home.
      { path: '/misc/explore-features', label: 'Chip Order & Visibility', icon: Compass, subheading: 'Master' },

      // 1. WhatsApp Sticker (was under CREATE TAB > Banners & Tools).
      { path: '/stickers', label: 'Sticker Packs', icon: Smile, subheading: 'WhatsApp Sticker' },
      { path: '/sticker-banners', label: 'Sticker Banners', icon: ImagePlus },

      // 2. Auto Product Ad (was under AI TOOLS TAB > Product Ads).
      { path: '/product-ads/categories', label: 'Ad Categories', icon: Tag, subheading: 'Auto Product Ad' },
      { path: '/product-ads/templates', label: 'Ad Templates', icon: FileText },
      { path: '/product-ads/products', label: 'Products', icon: Package },
      { path: '/product-ads', label: 'Generated Ads', icon: Zap },
      { path: '/product-ads/config', label: 'Ad Config', icon: Cog },

      // 3. Remove Background — only the BG-specific pages move here.
      // The generic AI admin (Tool List, Dashboard, AI Config, Credit
      // Transactions) stays in AI TOOLS TAB because it manages all 13
      // AI tools, not just BG removal.
      { path: '/ai-tools/bg-credits', label: 'BG Credits', icon: CreditCard, subheading: 'Remove Background' },
      { path: '/ai-tools/faqs', label: 'BG FAQs', icon: HelpCircle },
      { path: '/ai-tools/testimonials', label: 'BG Testimonials', icon: MessageSquare },

      // 4. Free Status (was under CATEGORY TAB).
      { path: '/statuses/categories', label: 'Status Categories', icon: MessageSquare, subheading: 'Free Status' },
      { path: '/statuses/quotes', label: 'Status Quotes', icon: Quote },

      // 5. Birthday & Anniversary (was under CREATE TAB > Greetings
      // + Customers from CONTENT > Customers).
      { path: '/greetings/categories', label: 'Greeting Categories', icon: Gift, subheading: 'Birthday & Anniversary' },
      { path: '/greetings/templates', label: 'Greeting Templates', icon: FileText },
      { path: '/greetings/customers', label: 'Customers', icon: Users },
      { path: '/greetings/config', label: 'Greeting Config', icon: Settings },

      // 6. Feeds (was under HOME TAB).
      { path: '/feeds/items', label: 'Feed Items', icon: Rss, subheading: 'Feeds' },
      { path: '/feeds/banners', label: 'Feed Banners', icon: ImagePlus },
      { path: '/feeds/config', label: 'Feed Config', icon: Settings },

      // Shared CMS surfaces that serve multiple tools — UI Strings
      // lives here since it is exclusively the editable string store
      // for the 6 Explore Features tools.
      { path: '/misc/ui-strings', label: 'UI Strings', icon: Type, subheading: 'Shared' },
    ],
  },
  {
    title: 'CATEGORY TAB',
    group: 'APP TABS',
    icon: Grid,
    color: '#F5A623',
    defaultOpen: false,
    items: [
      // 2026-04 reshuffle: Status Categories + Quotes moved to
      // EXPLORE TOOLS > Free Status. Paths unchanged — existing
      // bookmarks still work; only the sidebar grouping changed.
      { path: '/categories/general', label: 'Poster Categories', icon: FolderTree },
      { path: '/posters', label: 'Poster Templates', icon: Image },
      { path: '/posters/tags', label: 'Tag Manager', icon: Tag },
      { path: '/posters/category-banners', label: 'Category Banners', icon: ImagePlus },
      { path: '/posters/home-sections', label: 'Home Sections', icon: Compass },
      { path: '/categories/recycle-bin', label: 'Recycle Bin', icon: Trash },
    ],
  },
  {
    title: 'CREATE TAB',
    group: 'APP TABS',
    icon: PlusCircle,
    color: '#3F5F92',
    defaultOpen: false,
    items: [
      // 2026-04 reshuffle: Sticker Packs + Sticker Banners + all 3
      // Greetings pages moved to EXPLORE TOOLS. CREATE TAB keeps
      // editor-adjacent builders (video / collage / logo / slideshow)
      // which are creation pipelines, not Explore chips.
      { path: '/posters/create-banners', label: 'Screen Banners', icon: Image, subheading: 'Banners & Tools' },
      { path: '/posters/create-tools', label: 'Create Tools', icon: Wrench },
      { path: '/posters/video-categories', label: 'Video Categories', icon: Video, subheading: 'Video' },
      { path: '/posters/video-templates', label: 'Video Templates', icon: Film },
      { path: '/collage/layouts', label: 'Collage Layouts', icon: Layout, subheading: 'Collage' },
      { path: '/collage/config', label: 'Collage Config', icon: Cog },
      { path: '/logo-maker/industries', label: 'Logo Industries', icon: Palette, subheading: 'Logo Maker' },
      { path: '/logo-maker/styles', label: 'Logo Styles', icon: Paintbrush },
      { path: '/logo-maker/configs', label: 'Logo Config', icon: Settings2 },
      { path: '/slideshow/config', label: 'Slideshow Config', icon: PlayCircle, subheading: 'Slideshow' },
    ],
  },
  {
    title: 'BUSINESS TAB',
    group: 'APP TABS',
    icon: Briefcase,
    color: '#745B3B',
    defaultOpen: false,
    items: [
      { path: '/posters/business', label: 'Business Posters', icon: Image, subheading: 'Business Content' },
      { path: '/posters/business-category', label: 'Business Categories', icon: Layout },
      { path: '/vbizcard/categories', label: 'Card Categories', icon: CreditCard, subheading: 'VBiz Card' },
      { path: '/vbizcard/templates', label: 'Card Templates', icon: FileText },
      { path: '/vbizcard/home-sections', label: 'Card Home Sections', icon: LayoutGrid },
      { path: '/vbizcard/promo-banners', label: 'Card Promo Banners', icon: ImagePlus },
      { path: '/vbizcard/testimonials', label: 'Card Testimonials', icon: MessageSquare },
      { path: '/card-wizard/configs', label: 'Wizard Config', icon: Settings, subheading: 'Card Wizard' },
      { path: '/card-wizard/features', label: 'Wizard Features', icon: Star },
      { path: '/card-wizard/form-fields', label: 'Wizard Fields', icon: Hash },
      { path: '/card-wizard/social-channels', label: 'Wizard Socials', icon: Share2 },
      { path: '/card-wizard/payment-gateways', label: 'Wizard Payments', icon: Wallet },
    ],
  },
  {
    title: 'AI TOOLS TAB',
    group: 'APP TABS',
    icon: Sparkles,
    color: '#22C55E',
    defaultOpen: false,
    items: [
      // 2026-04 reshuffle: section scope narrowed to GENERIC AI
      // admin (covers all 13 AI tools in AITool). BG-specific pages
      // (bg-credits, faqs, testimonials) moved to EXPLORE TOOLS >
      // Remove Background. Product Ads × 5 moved to EXPLORE TOOLS >
      // Auto Product Ad. The "BG Remover" subheading was dropped
      // because every remaining item is tool-agnostic.
      { path: '/ai-tools/manage', label: 'Tool List', icon: Wrench },
      { path: '/ai-tools', label: 'Dashboard', icon: BarChart3 },
      { path: '/ai-tools/config', label: 'AI Config', icon: Settings },
      { path: '/ai-tools/credit-transactions', label: 'Credit Transactions', icon: DollarSign },
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
      { path: '/misc/editor-sticker-categories', label: 'Editor Sticker Cats', icon: LayoutGrid },
      { path: '/editor-stickers', label: 'Editor Stickers', icon: Star },
      { path: '/settings/watermark', label: 'Watermark', icon: Droplets },
      { path: '/settings/design', label: 'Design Settings', icon: Palette },
    ],
  },

  // ─── FESTIVALS ──────────────────────────────────────────
  {
    title: 'FESTIVALS',
    // Same 'TOOLS' group as POST EDITOR above — festival posters + calendar
    // are editor-adjacent content the admin works WITH, not user-facing tabs.
    group: 'TOOLS',
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
    group: 'MANAGEMENT',
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
    group: 'MANAGEMENT',
    icon: FileText,
    defaultOpen: false,
    items: [
      { path: '/content/tutorials', label: 'Tutorials', icon: BookOpen, subheading: 'Help & Inbox' },
      { path: '/notifications/send', label: 'Send Notification', icon: Bell },
      { path: '/notifications/history', label: 'Notification History', icon: Bell },
      { path: '/content/contact', label: 'Contact Inbox', icon: Mail, badgeKey: 'contact_inbox' },
      { path: '/content/partners', label: 'Partner Inbox', icon: Handshake, badgeKey: 'partner_inbox' },
      { path: '/content/policies', label: 'Policies', icon: Shield },
      { path: '/misc/mall-categories', label: 'Mall Categories', icon: ShoppingBag, subheading: 'Brand Mall' },
      { path: '/content/mall', label: 'Mall Listings', icon: Store },
      { path: '/brand-mall/config', label: 'Mall Config', icon: Settings },
      { path: '/brand-mall/spotlight', label: 'Mall Spotlight', icon: ShoppingBag },
      { path: '/categories/politician', label: 'Politician Cats', icon: User, subheading: 'Politicians' },
      { path: '/categories/politician-image', label: 'Politician Images', icon: Image },
      { path: '/reels', label: 'Reels', icon: Film, subheading: 'Reels & Services' },
      { path: '/services/categories', label: 'Service Categories', icon: Grid },
      { path: '/services', label: 'Services', icon: Wrench },
      { path: '/reels/music', label: 'Music Tracks', icon: Music },
      // 2026-04 reshuffle: Customers (/greetings/customers) moved to
      // EXPLORE TOOLS > Birthday & Anniversary — it's a tool-specific
      // surface, not generic content. Previously isolated under a
      // "Customers" subheading with no siblings.
    ],
  },
  {
    title: 'SETTINGS',
    group: 'MANAGEMENT',
    icon: Settings,
    defaultOpen: false,
    items: [
      // 2026-04 reshuffle: UI Strings moved to EXPLORE TOOLS > Shared
      // where its primary use case lives (CMS for the 6 tool chips).
      { path: '/misc/languages', label: 'Languages', icon: Globe },
      { path: '/misc/contact-config', label: 'Contact Config', icon: Phone },
      { path: '/settings/taglines', label: 'Taglines', icon: Type },
      { path: '/settings/policies', label: 'Policy Pages', icon: Shield },
      { path: '/business/setup-config', label: 'Business Setup', icon: Building },
      { path: '/settings/delete-requests', label: 'Delete Requests', icon: Trash, badgeKey: 'delete_requests' },
    ],
  },

  // ─── UPGRADE / MONETIZATION ─────────────────────────────
  {
    title: 'UPGRADE',
    group: 'REVENUE',
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
