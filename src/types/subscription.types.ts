export type SubscriptionDuration = 'monthly' | 'quarterly' | 'yearly'
export type SubscriptionStatus = 'created' | 'authorized' | 'captured' | 'active' | 'expired' | 'cancelled' | 'failed'

export interface SubscriptionPlan {
  id: number
  name: string
  slug: string
  description: string
  price: number
  duration: SubscriptionDuration
  duration_days: number
  credits_included: number
  features: string[]
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface Subscription {
  id: number
  user: number
  user_name: string
  user_phone: string
  plan: number
  plan_name: string
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
  amount: number
  status: SubscriptionStatus
  starts_at: string | null
  expires_at: string | null
  is_active_subscription: boolean
  created_at: string
}
