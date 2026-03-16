export type NotificationType = 'general' | 'brand_match' | 'follow' | 'promo' | 'system'
export type DevicePlatform = 'android' | 'ios' | 'web'

export interface Notification {
  id: number
  user: number | null
  user_name: string
  title: string
  body: string
  type: NotificationType
  image_url: string | null
  action_url: string | null
  is_read: boolean
  data: Record<string, unknown>
  created_at: string
}

export interface DeviceRegistration {
  id: number
  user: number
  user_name: string
  fcm_token: string
  platform: DevicePlatform
  device_name: string
  is_active: boolean
  created_at: string
}
