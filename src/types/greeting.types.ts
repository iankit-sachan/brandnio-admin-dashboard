export interface GreetingCategory {
  id: number
  name: string
  slug: string
  icon_url: string | null
  sort_order: number
  is_active: boolean
  template_count: number
}

export interface GreetingTemplate {
  id: number
  category: number
  category_name: string
  title: string
  thumbnail_url: string
  image_url: string
  template_data: Record<string, unknown>
  is_premium: boolean
  tags: string[]
  download_count: number
  created_at: string
}
