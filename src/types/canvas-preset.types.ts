export interface CanvasPreset {
  id: number
  name: string
  width: number
  height: number
  platform_icons: string[]
  tab: 'poster' | 'video'
  sort_order: number
  is_active: boolean
  created_at?: string
}
