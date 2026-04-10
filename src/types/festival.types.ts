export interface Festival {
  id: number
  name: string
  slug: string
  description: string
  date: string
  banner_url: string | null
  icon_url: string | null
  is_active: boolean
  created_at: string
}
