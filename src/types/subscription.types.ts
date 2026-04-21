export type SubscriptionDuration = 'monthly' | 'quarterly' | 'yearly'
export type SubscriptionStatus = 'created' | 'authorized' | 'captured' | 'active' | 'expired' | 'cancelled' | 'failed'

export type AudioLevel = 'none' | 'limited' | 'unlimited'
export type LogoLevel = 'none' | 'limited' | 'unlimited'

export interface SubscriptionPlan {
  id: number
  name: string
  slug: string
  description: string
  price: number
  price_original: number
  duration: SubscriptionDuration
  duration_days: number
  credits_included: number
  remove_bg_credits: number
  image_video_credits: number
  frames_count: number
  has_whatsapp_stickers: boolean
  has_digital_business_cards: boolean
  audio_jingles: AudioLevel
  has_desktop_access: boolean
  free_logos: LogoLevel
  has_social_captions: boolean
  has_dedicated_support: boolean
  is_unlimited_content: boolean
  price_per_image_text: string
  countdown_end_datetime: string | null
  gift_description: string
  features: string[]
  is_trial: boolean
  is_active: boolean
  sort_order: number
  created_at: string
  subscriber_count?: number  // from AdminSubscriptionPlanSerializer
}

export interface Subscription {
  id: number
  user: number
  user_email: string
  plan: number
  plan_name: string
  plan_slug: string
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
  amount: number
  status: SubscriptionStatus
  starts_at: string | null
  expires_at: string | null
  is_active_subscription: boolean

  // 2026-04 admin action audit fields
  cancelled_at: string | null
  cancelled_by: string
  cancellation_reason: string
  refunded_at: string | null
  refunded_by: string
  refund_amount: number
  refund_razorpay_id: string
  refund_status: string
  refund_reason: string
  admin_extension_days: number

  created_at: string
  updated_at: string
}

export interface SubscriptionStats {
  range: string
  mrr_trend: Array<{ month: string; revenue: number; count: number }>
  totals: {
    mrr: number
    arr: number
    active: number
    cancelled: number
    refunded_count: number
    total_refund_amount: number
  }
  by_plan: Array<{
    plan_slug: string
    plan_name: string
    active: number
    revenue: number
  }>
  churn: {
    current_month_cancelled: number
    active_start_of_month: number
    churn_rate: number
  }
}
