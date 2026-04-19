/**
 * Shared constants for the Frame Designer.
 *
 * All field names below mirror what Android's ``FrameRenderer.resolveOverlayField``
 * expects. If you add a field here, also add a case there and in
 * ``BusinessDetailsSheet.kt``.
 */

// ── Upload limits (MUST stay in sync with backend + nginx) ──────────
//  backend/admin_api/serializers.py → AdminUserCustomFrameSerializer.MAX_BYTES etc.
//  nginx /etc/nginx/sites-enabled/jigs-admin → client_max_body_size 50M
//  Web Brandnio/src/pages/users/UserDetailsModal.tsx → FRAME_MAX_BYTES
export const FRAME_MAX_BYTES = 50 * 1024 * 1024 // 50 MB
export const FRAME_MIN_DIM = 500
export const FRAME_MAX_DIM = 8000
export const FRAME_INFO_BANNER =
  'PNG only • Min 500×500 • Max 8000×8000 • 50MB limit'
export const FRAME_TIP =
  'Recommended: 1080×1080 • Keep the center empty for the user\u2019s photo'

// ── Field picker options (2×4 grid as per PDF proposal) ─────────────
export interface FieldOption {
  /** Stable id used as ``layer.name`` in the saved config_json.layers.
   *  MUST match Android FrameRenderer.resolveOverlayField cases. */
  key: string
  /** Label shown in the picker grid + sidebar chip. */
  label: string
  /** Icon shown next to the label. Emoji is fine — matches PDF screenshot. */
  icon: string
  /** Default placeholder text shown on the canvas until the user fills in
   *  their real profile — also stored as ``layer.text``. */
  placeholder: string
  /** Default layer size relative to canvas (0..1). Used when the admin first
   *  drops the placeholder on the canvas. Admin can resize from there. */
  defaultWidth: number
  defaultHeight: number
  /** Default font size (in canvas px at the design resolution). */
  defaultFontSize: number
  /** "text" — rendered with Android's drawOverlayText.
   *  "image" — rendered by drawOverlayImage; for Logo, FrameRenderer substitutes
   *            the user's logoBitmap in place of the layer URL. */
  type: 'text' | 'image'
}

export const FIELD_OPTIONS: FieldOption[] = [
  { key: 'business_name', label: 'Name', icon: '👤', placeholder: 'Your Business', defaultWidth: 0.7, defaultHeight: 0.06, defaultFontSize: 48, type: 'text' },
  { key: 'phone',         label: 'Phone', icon: '📞', placeholder: '+91 12345 67890', defaultWidth: 0.4, defaultHeight: 0.04, defaultFontSize: 28, type: 'text' },
  { key: 'email',         label: 'Email', icon: '✉️', placeholder: 'you@example.com', defaultWidth: 0.5, defaultHeight: 0.04, defaultFontSize: 26, type: 'text' },
  { key: 'address',       label: 'Address', icon: '📍', placeholder: 'City, Country', defaultWidth: 0.6, defaultHeight: 0.04, defaultFontSize: 26, type: 'text' },
  { key: 'website',       label: 'Website', icon: '🌐', placeholder: 'www.example.com', defaultWidth: 0.45, defaultHeight: 0.04, defaultFontSize: 24, type: 'text' },
  { key: 'logo',          label: 'Logo', icon: '🎯', placeholder: '',            defaultWidth: 0.12, defaultHeight: 0.12, defaultFontSize: 0, type: 'image' },
  { key: 'designation',   label: 'Designation', icon: '💼', placeholder: 'CEO',   defaultWidth: 0.3,  defaultHeight: 0.04, defaultFontSize: 24, type: 'text' },
  { key: 'constituency',  label: 'Constituency', icon: '🗳️', placeholder: 'Mumbai North', defaultWidth: 0.45, defaultHeight: 0.04, defaultFontSize: 26, type: 'text' },
]

export function fieldOption(key: string): FieldOption | undefined {
  return FIELD_OPTIONS.find(f => f.key === key)
}

// ── Frame metadata dropdowns ────────────────────────────────────────
// CATEGORY — must match posters.models.PosterFrame.CATEGORY_CHOICES (8 values).
export const FRAME_CATEGORIES = [
  { value: 'business',    label: 'Business' },
  { value: 'restaurant',  label: 'Restaurant' },
  { value: 'salon',       label: 'Salon' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'education',   label: 'Education' },
  { value: 'creative',    label: 'Creative' },
  { value: 'political',   label: 'Political' },
  { value: 'festival',    label: 'Festival' },
] as const

// FRAME TYPE — must match posters.models.PosterFrame.FRAME_TYPE_CHOICES.
export const FRAME_TYPES = [
  { value: 'portrait',  label: 'Portrait' },
  { value: 'landscape', label: 'Landscape' },
  { value: 'square',    label: 'Square' },
  { value: 'circular',  label: 'Circular' },
  { value: 'story',     label: 'Story' },
  { value: 'banner',    label: 'Banner' },
] as const

// Aspect ratio → (canvas_w, canvas_h) at design resolution. Android scales
// from these dims down to runtime pixel dims.
export const ASPECT_RATIO_DIMS: Record<string, { w: number; h: number }> = {
  '1:1':  { w: 1080, h: 1080 },
  '4:5':  { w: 1080, h: 1350 },
  '9:16': { w: 1080, h: 1920 },
  '16:9': { w: 1920, h: 1080 },
}

// Map a visual frame_type → reasonable default aspect_ratio. Admin can
// override in the form after PNG upload.
export const FRAME_TYPE_TO_RATIO: Record<string, string> = {
  portrait: '4:5',
  landscape: '16:9',
  square: '1:1',
  circular: '1:1',
  story: '9:16',
  banner: '16:9',
}

// Safe zone — the central rectangle where the user's poster image will sit.
// We warn the admin when they drop a text area inside this region.
export const SAFE_ZONE_INSET = 0.08   // 8% inset from each edge
