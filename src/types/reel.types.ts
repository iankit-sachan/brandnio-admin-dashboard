export type ReelStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type AnimationType = 'zoom_in' | 'pan_left' | 'pan_right' | 'fade' | 'slide_up' | 'ken_burns' | 'rotate'
export type MusicCategory = 'business' | 'festive' | 'motivational' | 'trending'

export interface MusicTrack {
  id: number
  name: string
  file_url: string
  duration: number
  category: MusicCategory
  is_premium: boolean
  created_at: string
}

export interface Reel {
  id: number
  user: number
  user_name: string
  title: string
  source_poster: number | null
  video_url: string | null
  thumbnail_url: string | null
  duration: number
  resolution: string
  animation_type: AnimationType
  music_track: number | null
  music_track_name: string
  status: ReelStatus
  credits_charged: number
  created_at: string
}
