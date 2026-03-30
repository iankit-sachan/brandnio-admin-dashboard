export interface VbizCardCategory {
  id: number
  name: string
  slug: string
  category_type: 'section' | 'industry' | 'party' | 'card_type'
  icon_url: string | null
  description: string
  sort_order: number
  is_active: boolean
  template_count: number
  created_at: string
}

export interface VbizCardTemplate {
  id: number
  category: number
  category_name: string
  title: string
  thumbnail_url: string
  image_url: string
  price: string
  original_price: string
  discount_percent: number
  is_premium: boolean
  is_active: boolean
  sort_order: number
  tags: string[]
  created_at: string
}

export interface VbizCardHomeSection {
  id: number
  title: string
  category_slug: string
  display_type: 'small' | 'large' | 'below_industry' | 'below_occasion'
  is_trending: boolean
  preview_count: number
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface VbizCardPromoBanner {
  id: number
  title: string
  subtitle: string
  cta_text: string
  badge_text: string
  badge_subtitle: string
  background_color: string
  background_image_url: string
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface VbizCardTestimonial {
  id: number
  business_name: string
  category: string
  quote: string
  logo_url: string
  is_active: boolean
  sort_order: number
  created_at: string
}
