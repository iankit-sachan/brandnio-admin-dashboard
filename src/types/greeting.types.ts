export interface GreetingCategory {
  id: number
  name: string
  slug: string
  icon_url: string | null
  sort_order: number
  is_active: boolean
  template_count: number
  default_caption: string
  accent_color: string
  banner_text: string
}

export interface GreetingTemplate {
  id: number
  category: number
  category_name: string
  title: string
  thumbnail_url: string
  image_url: string
  template_data: Record<string, unknown>
  is_premium: boolean
  tags: string[]
  download_count: number
  created_at: string
  section_type: 'send' | 'exclusive' | 'browse'
  canvas_width: number
  canvas_height: number
  language?: string
  has_editable_frame?: boolean
  status?: 'active' | 'draft' | 'archived'
}

export interface Customer {
  id: number
  name: string
  phone: string
  dob: string | null
  anniversary: string | null
  notes: string
  created_at: string
  updated_at: string
}

export interface GreetingConfig {
  canvas_width: number
  canvas_height: number
  upcoming_event_days: number
  grid_columns: number
  page_size: number
  supported_languages: string[]
  date_format: string
}
