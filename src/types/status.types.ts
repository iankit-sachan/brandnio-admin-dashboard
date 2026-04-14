export interface StatusCategory {
  id: number
  name: string
  slug: string
  icon_url: string
  sort_order: number
  is_active: boolean
  quote_count: number
  created_at: string
}

export interface StatusQuote {
  id: number
  category: number | null
  category_name: string | null
  text: string
  author: string
  gradient_start_color: string
  gradient_end_color: string
  is_active: boolean
  sort_order: number
  created_at: string
}
