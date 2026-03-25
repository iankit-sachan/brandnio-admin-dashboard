export interface VideoCategory {
  id: number
  name: string
  icon_url: string
  sort_order: number
  is_active: boolean
  created_at?: string
}

export interface VideoTemplate {
  id: number
  category: number
  title: string
  thumbnail_url: string
  video_url: string
  duration: number
  is_premium: boolean
  is_active: boolean
  sort_order: number
  view_count: number
  share_count: number
  created_at?: string
}
