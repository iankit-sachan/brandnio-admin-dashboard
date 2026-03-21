export interface CreateTool {
  id: number
  name: string
  icon_url: string
  route: string
  badge: string
  tab: 'poster' | 'video'
  sort_order: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}
