export interface CreateScreenBanner {
  id: number
  title: string
  subtitle: string
  image_url: string
  gradient_color: string
  redirect_slug: string
  tab: 'poster' | 'video'
  sort_order: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}
