export interface StickerPack {
  id: number
  name: string
  slug: string
  description: string
  cover_image_url: string | null
  icon_url: string | null
  category: string
  tabs: string
  is_premium: boolean
  download_count: number
  sort_order: number
  sticker_count: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Sticker {
  id: number
  pack: number
  image_url: string
  thumbnail_url: string
  emoji: string
  sort_order: number
  is_active: boolean
  is_premium: boolean
  language: string
  usage_count: number
  has_text_region: boolean
  has_logo_region: boolean
  text_region: Record<string, unknown> | null
  logo_region: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface StickerBanner {
  id: number
  title: string
  subtitle: string
  image_url: string | null
  link_action: string
  display_order: number
  is_active: boolean
  created_at: string
}

export interface EditorStickerCategory {
  id: number
  name: string
  slug: string
  sort_order: number
  is_active: boolean
  sticker_count?: number
  created_at: string
}

export interface EditorStickerItem {
  id: number
  category: number
  name: string
  image_url: string
  sort_order: number
  is_active: boolean
  created_at: string
}
