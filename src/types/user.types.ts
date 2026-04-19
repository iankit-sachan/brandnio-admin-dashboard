import type { PoliticianProfile } from './content.types'

export type PlanType = 'free' | 'basic' | 'pro' | 'enterprise'

export interface User {
  id: number
  firebase_uid: string
  email: string
  name: string
  phone: string
  avatar_url: string | null
  is_premium: boolean
  plan: PlanType
  premium_since: string | null
  premium_expiry: string | null
  is_subscription_active: boolean
  referral_code: string
  referred_by: number | null
  credits: number
  total_downloads: number
  total_shares: number
  is_active: boolean
  is_deleted: boolean
  joined_at: string
  updated_at: string
  /** Pillar 2: Last time user made an authenticated API call (debounced 5min).
   *  null = never seen since the feature shipped. */
  last_seen_at: string | null
}

export interface BusinessProfile {
  id: number
  user: number
  business_name: string
  tagline: string
  logo_url: string | null
  category: string
  email: string
  phone: string
  website: string
  address: string
  city: string
  state: string
  pincode: string
  facebook_url: string
  instagram_url: string
  twitter_url: string
  youtube_url: string
  whatsapp_number: string
  username?: string
  show_phone_number?: boolean
  linkedin?: string
  industries?: string
}

export interface UserCustomFrame {
  id: number
  user: number
  user_email: string
  name: string
  category: string
  frame_type: string
  frame_image: string
  frame_image_url: string
  is_active: boolean
  created_by: number | null
  created_by_email: string | null
  created_at: string
  updated_at: string
}

export interface UserSubscriptionSummary {
  id: number
  plan_id: number
  plan_name: string
  plan_slug: string
  price: string
  duration_days: number
  status: string
  starts_at: string | null
  expires_at: string | null
  days_remaining: number
}

export interface UserDetails {
  user: User
  active_subscription: UserSubscriptionSummary | null
  business_profile: BusinessProfile | null
  political_profile: PoliticianProfile | null
  custom_frames: UserCustomFrame[]
}
