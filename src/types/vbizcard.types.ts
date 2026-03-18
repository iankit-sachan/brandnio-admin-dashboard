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
  display_type: 'small' | 'large'
  is_active: boolean
  sort_order: number
  created_at: string
}
