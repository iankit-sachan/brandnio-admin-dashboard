export type GeneratedAdStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface AdTemplate {
  id: number
  title: string
  image_url: string
  template_data: Record<string, unknown>
  aspect_ratio: string
  category: string
  is_premium: boolean
  is_active: boolean
  created_at: string
}

export interface Product {
  id: number
  user: number
  user_name: string
  name: string
  description: string
  price: number
  discount_price: number | null
  image_url: string | null
  category: string
  is_active: boolean
  created_at: string
}

export interface GeneratedAd {
  id: number
  user: number
  user_name: string
  product: number
  product_name: string
  template: number
  output_image_url: string | null
  ad_text: string
  status: GeneratedAdStatus
  credits_charged: number
  created_at: string
}

export interface ProductAdCategory {
  id: number
  name: string
  slug: string
  icon_url: string
  description: string
  sort_order: number
  is_active: boolean
  template_count: number
  created_at?: string
}

export interface ProductAdConfig {
  max_image_size_mb: number
  supported_formats: string[]
  poll_timeout_seconds: number
  poll_interval_seconds: number
  grid_columns: number
  max_recent_count: number
  credits_per_ad: number
  currency_symbol: string
  download_folder: string
  filename_prefix: string
  aspect_ratio_choices: string[]
  updated_at: string
}
