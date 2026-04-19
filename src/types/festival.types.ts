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

export interface Language {
  id: number
  name: string
  code: string        // ISO 639-1
  is_active: boolean
  sort_order: number
  created_at: string
}

export type PosterAspectRatio = '1:1' | '4:5' | '9:16' | '16:9'
export type PosterMediaType = 'image' | 'video'

export interface FestivalCalendarPoster {
  id: number
  title: string
  thumbnail_url: string
  image_url: string
  video_url: string
  media_type: PosterMediaType
  aspect_ratio: PosterAspectRatio
  language: number | null
  language_code: string | null
  festival: number
  festival_name: string
  /** True when admin marked this poster as the festival card cover (Phase B Q2: B). */
  is_cover?: boolean
  created_at: string
}
