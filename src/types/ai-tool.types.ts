export type AIToolType = 'background_remove' | 'caption_generate' | 'hashtag_generate' | 'face_swap' | 'photo_enhance' | 'poster_generate' | 'photo_generate'
export type AIToolStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface AIToolUsage {
  id: number
  user: number
  user_name: string
  tool_type: AIToolType
  status: AIToolStatus
  credits_used: number
  processing_time_ms: number | null
  created_at: string
}

export interface AITool {
  id: number
  tool_id: string
  name: string
  description: string
  icon: string
  credit_cost: number
  category: string
  navigation_target: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}
