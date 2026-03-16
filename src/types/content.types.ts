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
  user_name: string
  category: number
  category_name: string
  title: string
  description: string
  price: number
  discount_price: number | null
  images: string[]
  contact_phone: string
  contact_whatsapp: string
  city: string
  is_featured: boolean
  is_active: boolean
  view_count: number
  created_at: string
}

export interface PoliticianProfile {
  id: number
  user: number
  user_name: string
  party_name: string
  party_logo_url: string | null
  designation: string
  constituency: string
  state: string
  bio: string
  achievements: string[]
  social_links: Record<string, string>
  is_verified: boolean
  created_at: string
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
