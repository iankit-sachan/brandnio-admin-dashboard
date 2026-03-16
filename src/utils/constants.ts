export const PLAN_CHOICES = [
  { value: 'free', label: 'Free' },
  { value: 'basic', label: 'Basic' },
  { value: 'pro', label: 'Pro' },
  { value: 'enterprise', label: 'Enterprise' },
]

export const SUBSCRIPTION_STATUS_MAP: Record<string, { label: string; color: string }> = {
  created: { label: 'Created', color: 'text-brand-text-muted' },
  authorized: { label: 'Authorized', color: 'text-status-info' },
  captured: { label: 'Captured', color: 'text-status-info' },
  active: { label: 'Active', color: 'text-status-success' },
  expired: { label: 'Expired', color: 'text-status-warning' },
  cancelled: { label: 'Cancelled', color: 'text-status-error' },
  failed: { label: 'Failed', color: 'text-status-error' },
}

export const AI_TOOL_LABELS: Record<string, string> = {
  background_remove: 'Background Remove',
  caption_generate: 'Caption Generate',
  hashtag_generate: 'Hashtag Generate',
  face_swap: 'Face Swap',
  photo_enhance: 'Photo Enhance',
  poster_generate: 'Poster Generate',
  photo_generate: 'Photo Generate',
}

export const STATUS_COLORS: Record<string, string> = {
  active: 'bg-status-success/20 text-status-success',
  completed: 'bg-status-success/20 text-status-success',
  generated: 'bg-status-success/20 text-status-success',
  accepted: 'bg-status-success/20 text-status-success',
  sent: 'bg-status-success/20 text-status-success',
  pending: 'bg-status-warning/20 text-status-warning',
  scheduled: 'bg-status-warning/20 text-status-warning',
  created: 'bg-status-warning/20 text-status-warning',
  processing: 'bg-status-info/20 text-status-info',
  authorized: 'bg-status-info/20 text-status-info',
  captured: 'bg-status-info/20 text-status-info',
  failed: 'bg-status-error/20 text-status-error',
  cancelled: 'bg-status-error/20 text-status-error',
  expired: 'bg-brand-text-muted/20 text-brand-text-muted',
}
