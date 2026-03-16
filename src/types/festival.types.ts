export interface Festival {
  id: number
  name: string
  slug: string
  description: string
  date: string
  banner_url: string | null
  icon_url: string | null
  is_active: boolean
  is_upcoming: boolean
  poster_count: number
  created_at: string
}
