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
  // 2026-04 Tier 3 F#9 — optional promo code the Android share
  // sheet appends to the outgoing greeting. Admin edits both via
  // the /greetings/categories page. Coupon_caption supports the
  // same {name}/{business} placeholders as default_caption.
  coupon_code?: string
  coupon_caption?: string
  // 2026-04 Phase 2 — surfaced by the admin serializer for the
  // new Activity column. Server-written.
  created_at?: string
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
