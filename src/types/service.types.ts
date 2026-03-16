export interface ServiceCategory {
  id: number
  name: string
  slug: string
  icon_url: string | null
  description: string
  sort_order: number
  is_active: boolean
  service_count: number
}

export interface NearbyService {
  id: number
  owner: number
  owner_name: string
  category: number
  category_name: string
  name: string
  description: string
  phone: string
  email: string
  website: string
  address: string
  city: string
  state: string
  pincode: string
  latitude: number | null
  longitude: number | null
  images: string[]
  average_rating: number
  review_count: number
  is_verified: boolean
  is_active: boolean
  created_at: string
}

export interface ServiceReview {
  id: number
  service: number
  service_name: string
  user: number
  user_name: string
  rating: number
  comment: string
  created_at: string
}
