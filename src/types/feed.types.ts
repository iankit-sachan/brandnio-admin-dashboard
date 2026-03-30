export interface FeedItem {
  id: number
  title: string
  subtitle: string
  thumbnail_url: string
  image_url: string
  description: string
  category: string
  template_count: number
  is_trending: boolean
  is_editors_choice: boolean
  section_type: 'trending' | 'inspiration' | 'category'
  favorite_count: number
  cta_text: string
  cta_url: string
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface FeedBanner {
  id: number
  title: string
  subtitle: string
  image_url: string
  cta_text: string
  cta_url: string
  gradient_start: string
  gradient_end: string
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface FeedConfig {
  max_trending_items: number
  max_inspiration_items: number
  trending_grid_columns: number
  categories: string[]
  enable_search: boolean
  enable_favorites: boolean
  enable_editors_choice: boolean
  updated_at: string
}
