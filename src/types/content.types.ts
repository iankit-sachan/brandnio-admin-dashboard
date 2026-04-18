export type ContactSubject = 'general' | 'bug' | 'feature' | 'billing' | 'other'
export type PartnerType = 'reseller' | 'affiliate' | 'agency' | 'enterprise' | 'other'
export type PolicyType = 'terms' | 'privacy' | 'refund' | 'cancellation' | 'disclaimer'

export interface Tutorial {
  id: number
  title: string
  slug: string
  description: string
  content: string
  thumbnail_url: string | null
  video_url: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface PolicyPage {
  id: number
  title: string
  slug: string
  policy_type: PolicyType
  content: string
  version: string
  is_active: boolean
  updated_at: string
}

export interface ContactSubmission {
  id: number
  user: number | null
  user_name: string
  name: string
  email: string
  phone: string
  subject: ContactSubject
  message: string
  is_resolved: boolean
  admin_notes: string
  created_at: string
}

export interface PartnerInquiry {
  id: number
  user: number | null
  user_name: string
  name: string
  email: string
  phone: string
  company_name: string
  partner_type: PartnerType
  message: string
  is_reviewed: boolean
  admin_notes: string
  created_at: string
}

export interface MallCategory {
  id: number
  name: string
  slug: string
  icon_url: string | null
  sort_order: number
  is_active: boolean
  listing_count: number
}

export interface MallListing {
  id: number
  user: number
  user_email: string
  category: number
  title: string
  subtitle: string
  description: string
  price: string
  discount_price: string | null
  images: string[]
  contact_phone: string
  contact_whatsapp: string
  city: string
  turnaround_hours: number
  service_highlight_badge: string
  inclusions: Array<{ icon: string; title: string; description: string }>
  feature_tags: Array<{ icon: string; label: string }>
  is_featured: boolean
  is_active: boolean
  view_count: number
  created_at: string
  updated_at: string
}

export interface PoliticianProfile {
  id: number
  user: number
  user_name?: string
  party_name: string
  party_logo_url?: string | null
  designation: string
  constituency: string
  state: string
  bio?: string
  achievements?: string[]
  social_links?: Record<string, string>
  is_verified?: boolean
  created_at?: string
  // Admin "All Users" form extensions
  full_name: string
  position_role: string
  campaign_slogan: string
  phone: string
  show_phone_number: boolean
  email: string
  website: string
  facebook: string
  twitter: string
  instagram: string
  youtube: string
  office_address: string
  city: string
  pincode: string
}

export interface UserSettings {
  id: number
  user: number
  language: string
  notification_enabled: boolean
  daily_poster_enabled: boolean
  festival_reminder_enabled: boolean
  whatsapp_auto_share: boolean
  dark_mode: boolean
}
