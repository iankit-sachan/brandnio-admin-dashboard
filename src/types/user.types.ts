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
  is_active: boolean
  is_deleted: boolean
  joined_at: string
  updated_at: string
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
}
