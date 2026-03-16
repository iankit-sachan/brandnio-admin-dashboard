export interface StickerPack {
  id: number
  name: string
  slug: string
  cover_image_url: string | null
  category: string
  is_premium: boolean
  download_count: number
  sort_order: number
  sticker_count: number
  is_active: boolean
  created_at: string
}

export interface Sticker {
  id: number
  pack: number
  image_url: string
  emoji: string
  sort_order: number
}
