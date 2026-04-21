/**
 * Admin API service — typed wrappers for all admin CRUD endpoints.
 * Base: /api/admin/ (DRF Router auto-generates list/create/retrieve/update/destroy)
 */
import api from './api'

// ── Generic CRUD helper ──────────────────────────────────────────

// Paginated response shape from DRF
export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function crud<T = any>(resource: string) {
  const base = `/api/admin/${resource}/`
  return {
    _resource: resource,
    list:   (params?: Record<string, string | number | undefined>) => api.get(base, { params }).then(r => {
      const d = r.data
      // Handle both plain arrays and DRF paginated responses
      if (Array.isArray(d)) return d as T[]
      if (d && typeof d === 'object' && 'results' in d && Array.isArray(d.results)) return d.results as T[]
      return [] as T[]
    }),
    listPaginated: (params?: Record<string, string | number | undefined>) => api.get(base, { params }).then(r => {
      const d = r.data
      // Return full paginated response for pages that need pagination
      if (d && typeof d === 'object' && 'results' in d) {
        return d as PaginatedResponse<T>
      }
      // Wrap plain array in paginated shape
      const arr = Array.isArray(d) ? d : []
      return { count: arr.length, next: null, previous: null, results: arr as T[] }
    }),
    get:    (id: number) => api.get<T>(`${base}${id}/`).then(r => r.data),
    create: (data: Partial<T>) => api.post<T>(base, data).then(r => r.data),
    update: (id: number, data: Partial<T>) => api.patch<T>(`${base}${id}/`, data).then(r => r.data),
    delete: (id: number) => api.delete(`${base}${id}/`).then(r => r.data ?? null),
    bulkDelete: (ids: number[]) => Promise.all(ids.map(id => api.delete(`${base}${id}/`).then(r => r.data ?? null))),
  }
}

// ── File Upload ──────────────────────────────────────────────────

export const uploadApi = {
  upload: async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await api.post<{ url: string }>('/api/admin/upload/', formData)
    return res.data.url
  },
  uploadWithThumbnail: async (file: File): Promise<{ url: string; thumbnail_url: string | null; width: number | null; height: number | null; detected_ratio: string | null }> => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await api.post<{ url: string; thumbnail_url?: string; width?: string; height?: string; detected_ratio?: string }>('/api/admin/upload/', formData)
    return {
      url: res.data.url,
      thumbnail_url: res.data.thumbnail_url ?? null,
      width: res.data.width ? Number(res.data.width) : null,
      height: res.data.height ? Number(res.data.height) : null,
      detected_ratio: res.data.detected_ratio ?? null,
    }
  },
}

// ── Auth ─────────────────────────────────────────────────────────

export const authApi = {
  login:  (username: string, password: string) =>
    api.post<{ username: string; email: string; token?: string }>('/api/admin/login/', { username, password }).then(r => r.data),
  logout: () => api.post('/api/admin/logout/').then(r => r.data),
  me:     () => api.get<{ username: string; email: string }>('/api/admin/me/').then(r => r.data),
}

// ── Dashboard ────────────────────────────────────────────────────

export const dashboardApi = {
  stats: () => api.get('/api/admin/dashboard/').then(r => r.data),
}

// ── Resource CRUD APIs ───────────────────────────────────────────

export const usersApi = {
  ...crud('users'),
  activatePremium: (id: number, plan_id: number) =>
    api.post(`/api/admin/users/${id}/activate-premium/`, { plan_id }).then(r => r.data),
  details: (id: number) =>
    api.get(`/api/admin/users/${id}/details/`).then(r => r.data),
  restore: (id: number) =>
    api.post(`/api/admin/users/${id}/restore/`).then(r => r.data),
}
// crud('business-profiles') gives standard CRUD; we extend it with the
// admin-side WebP logo upload (Gap 2 fix) — same pipeline as the user-side
// /api/auth/business-profile/upload-logo/ endpoint, but addressed by user pk.
export const businessProfilesApi = {
  ...crud('business-profiles'),
  uploadLogo: async (businessProfileId: number, file: File) => {
    const fd = new FormData()
    fd.append('logo', file)
    const res = await api.post(
      `/api/admin/business-profiles/${businessProfileId}/upload-logo/`,
      fd,
    )
    return res.data as Record<string, unknown>  // returns updated AdminBusinessProfile
  },
  /** Phase 3 (G11): last 30 audit rows for a business profile. */
  audit: (businessProfileId: number) =>
    api.get<Array<{
      id: number
      edited_by_email: string | null
      edited_by_role: 'user' | 'admin' | 'system'
      edited_at: string
      changed_fields: Record<string, { from: unknown; to: unknown }>
    }>>(`/api/admin/business-profiles/${businessProfileId}/audit/`).then(r => r.data),
}

export const userCustomFramesApi = {
  ...crud('user-custom-frames'),
  listForUser: (user: number) =>
    api.get('/api/admin/user-custom-frames/', { params: { user } }).then(r => {
      const d = r.data
      if (Array.isArray(d)) return d
      if (d && typeof d === 'object' && 'results' in d) return d.results
      return []
    }),
  uploadForUser: async (payload: {
    user: number
    name: string
    category: string
    frame_type: string
    frame_image: File
  }) => {
    const fd = new FormData()
    fd.append('user', String(payload.user))
    fd.append('name', payload.name)
    fd.append('category', payload.category)
    fd.append('frame_type', payload.frame_type)
    fd.append('frame_image', payload.frame_image)
    const res = await api.post('/api/admin/user-custom-frames/', fd)
    return res.data
  },
}

export const posterCategoriesApi = crud('poster-categories')
export const categoryRecycleBinApi = {
  list: () => api.get('/api/admin/poster-categories/recycle_bin/').then(r => r.data),
  restore: (id: number) => api.post(`/api/admin/poster-categories/${id}/restore/`).then(r => r.data),
  permanentDelete: (id: number) => api.post(`/api/admin/poster-categories/${id}/permanent_delete/`).then(r => r.data),
}
export const postersApi = crud('posters')
export const posterRecycleBinApi = {
  list: () => api.get('/api/admin/posters/recycle_bin/').then(r => {
    const d = r.data
    if (d && typeof d === 'object' && 'results' in d) return d.results
    return Array.isArray(d) ? d : []
  }),
  restore: (id: number) => api.post(`/api/admin/posters/${id}/restore/`).then(r => r.data),
  permanentDelete: (id: number) => api.post(`/api/admin/posters/${id}/permanent_delete/`).then(r => r.data),
}
export const posterAnalyticsApi = {
  get: () => api.get('/api/admin/posters/analytics/').then(r => r.data),
}
export const posterBulkApi = {
  bulkMove: (ids: number[], category: number) =>
    api.post('/api/admin/posters/bulk_move/', { ids, category }).then(r => r.data),
}
export const posterTagsApi = {
  list: (): Promise<{ tag: string; count: number }[]> =>
    api.get('/api/admin/posters/tags/').then(r => r.data),
  rename: (oldTag: string, newTag: string) =>
    api.post('/api/admin/posters/rename_tag/', { old_tag: oldTag, new_tag: newTag }).then(r => r.data),
  delete: (tag: string) =>
    api.post('/api/admin/posters/delete_tag/', { tag }).then(r => r.data),
}
/**
 * Unified poster-frames API. After the 2026-04 redesign, ``PosterFrame`` is
 * the single table for both global and per-user frames. Per-user frames are
 * filtered via ``?assigned_user=<id>``.
 *
 * The legacy ``userCustomFramesApi`` above is kept as a thin alias so an
 * older admin build (deployed in-flight) doesn't 404. New code should use
 * ``posterFramesApi`` everywhere.
 */
export const posterFramesApi = {
  ...crud('poster-frames'),

  /** Per-user frames: ?assigned_user=<id>. */
  listForUser: (userId: number) =>
    api.get('/api/admin/poster-frames/', { params: { assigned_user: userId } }).then(r => {
      const d = r.data
      if (Array.isArray(d)) return d
      if (d && typeof d === 'object' && 'results' in d) return d.results
      return []
    }),

  /** Multipart upload — create a frame with an attached PNG + structured payload. */
  createWithFile: async (payload: {
    name: string
    category: string
    frame_type: string
    aspect_ratio: string
    tags?: string[]
    is_premium?: boolean
    is_featured?: boolean
    is_active?: boolean
    show_frame_name?: boolean
    sort_order?: number
    assigned_user?: number | null
    frame_image: File
  }) => {
    const fd = new FormData()
    fd.append('name', payload.name)
    fd.append('category', payload.category)
    fd.append('frame_type', payload.frame_type)
    fd.append('aspect_ratio', payload.aspect_ratio)
    fd.append('type', 'image_overlay')
    // tags must be JSON-encoded for DRF's JSONField
    fd.append('tags', JSON.stringify(payload.tags ?? []))
    fd.append('is_premium', String(payload.is_premium ?? false))
    fd.append('is_featured', String(payload.is_featured ?? false))
    fd.append('is_active', String(payload.is_active ?? true))
    fd.append('show_frame_name', String(payload.show_frame_name ?? true))
    fd.append('sort_order', String(payload.sort_order ?? 0))
    if (payload.assigned_user != null) {
      fd.append('assigned_user', String(payload.assigned_user))
    }
    fd.append('frame_image', payload.frame_image)
    const res = await api.post('/api/admin/poster-frames/', fd)
    return res.data
  },

  /** Update config_json + metadata (JSON body — used by the text-area designer Save). */
  updateConfig: (id: number, data: {
    name?: string
    tags?: string[]
    config_json?: Record<string, unknown>
    show_frame_name?: boolean
    is_featured?: boolean
    is_premium?: boolean
    is_active?: boolean
    category?: string
    frame_type?: string
    sort_order?: number
  }) => api.patch(`/api/admin/poster-frames/${id}/`, data).then(r => r.data),

  /** Version history actions. */
  versions: (id: number) =>
    api.get<Array<{
      id: number
      name: string
      tags: string[]
      config_json: Record<string, unknown>
      edited_by: string | null
      edited_at: string
    }>>(`/api/admin/poster-frames/${id}/versions/`).then(r => r.data),

  rollback: (id: number, versionId: number) =>
    api.post(`/api/admin/poster-frames/${id}/rollback/`, { version_id: versionId }).then(r => r.data),

  duplicate: (id: number, opts?: { aspect_ratio?: string; assigned_user?: number | null }) =>
    api.post(`/api/admin/poster-frames/${id}/duplicate/`, opts || {}).then(r => r.data),

  previewAsUser: (id: number, userId: number) =>
    api.post<{
      user_id: number
      name: string
      phone: string
      email: string
      address: string
      website: string
      tagline: string
      designation: string
      constituency: string
      logo_url: string
    }>(`/api/admin/poster-frames/${id}/preview_as_user/`, { user_id: userId }).then(r => r.data),

  incrementUsage: (id: number) =>
    api.post(`/api/admin/poster-frames/${id}/increment_usage/`).then(r => r.data),
}
export const festivalsApi = {
  ...crud('festivals'),
  byMonth: (year: number, month: number) =>
    api.get('/api/admin/festivals/by-month/', { params: { year, month } }).then(r => r.data as { year: number; month: number; dates: Record<string, Array<{ id: number; name: string; slug: string; date: string; banner_url: string | null; icon_url: string | null }>> }),
}
export const languagesApi = crud('languages')
export const festivalCalendarApi = {
  /**
   * Bulk upload posters tagged to a festival. Supports progress tracking and
   * cancellation. Returns BOTH succeeded and failed file lists so the admin
   * can retry only the failures (the backend no longer rolls back the whole
   * batch on a single bad file — see BulkFestivalPosterUploadView).
   *
   * @param opts.onProgress  fired repeatedly during upload with bytes uploaded
   * @param opts.signal      AbortSignal — call .abort() to cancel mid-upload
   */
  bulkUpload: async (
    payload: {
      festival: number
      language?: number | null
      aspect_ratio: '1:1' | '4:5' | '9:16' | '16:9'
      media_type: 'image' | 'video'
      files: File[]
    },
    opts?: {
      onProgress?: (loaded: number, total: number, percent: number) => void
      signal?: AbortSignal
    },
  ) => {
    const fd = new FormData()
    fd.append('festival', String(payload.festival))
    if (payload.language != null) fd.append('language', String(payload.language))
    fd.append('aspect_ratio', payload.aspect_ratio)
    fd.append('media_type', payload.media_type)
    for (const f of payload.files) fd.append('files', f)
    const res = await api.post('/api/admin/festival-calendar/bulk-upload/', fd, {
      onUploadProgress: (e) => {
        if (!opts?.onProgress) return
        const total = e.total || payload.files.reduce((s, f) => s + f.size, 0)
        const loaded = e.loaded ?? 0
        const percent = total > 0 ? Math.round((loaded / total) * 100) : 0
        opts.onProgress(loaded, total, percent)
      },
      signal: opts?.signal,
    })
    // Backend returns both created + failed (per-file try/catch). Fields are
    // optional for forward-compat with older backends that only sent created_count.
    return res.data as {
      created_count: number
      poster_ids: number[]
      failed_count?: number
      failed?: Array<{ filename: string; reason: string }>
      skipped_count?: number
      skipped?: Array<{ filename: string; reason: string }>
    }
  },

  /**
   * Convenience wrapper: split a heterogeneous file list into ratio-grouped
   * batches and upload them sequentially behind a single progress bar.
   *
   * Each `batch` carries its own aspect_ratio (auto-detected client-side from
   * image dimensions). Per-file `language` overrides are merged at the call
   * site by partitioning into language buckets first if needed.
   *
   * Aggregates progress across all batches into one weighted percent so the
   * UI shows a single moving bar to the admin.
   */
  bulkUploadBatches: async (
    batches: Array<{
      aspect_ratio: '1:1' | '4:5' | '9:16' | '16:9'
      files: File[]
      // Optional per-batch language override (Phase B Q4: per-file lang picker).
      // If unset, falls back to common.language.
      language?: number | null
    }>,
    common: {
      festival: number
      language?: number | null
      media_type: 'image' | 'video'
    },
    opts?: {
      onProgress?: (loaded: number, total: number, percent: number) => void
      signal?: AbortSignal
    },
  ) => {
    const totalBytes = batches.reduce(
      (s, b) => s + b.files.reduce((ss, f) => ss + f.size, 0),
      0,
    )
    let bytesDoneInPriorBatches = 0
    const results: Array<Awaited<ReturnType<typeof festivalCalendarApi.bulkUpload>>> = []

    for (const batch of batches) {
      const batchTotal = batch.files.reduce((s, f) => s + f.size, 0)
      const res = await festivalCalendarApi.bulkUpload(
        {
          festival: common.festival,
          // Per-batch override wins over the common fallback.
          language: batch.language !== undefined ? batch.language : common.language,
          aspect_ratio: batch.aspect_ratio,
          media_type: common.media_type,
          files: batch.files,
        },
        {
          signal: opts?.signal,
          onProgress: (loaded, _total, _percent) => {
            const aggregateLoaded = bytesDoneInPriorBatches + loaded
            const aggregatePercent = totalBytes > 0
              ? Math.round((aggregateLoaded / totalBytes) * 100)
              : 0
            opts?.onProgress?.(aggregateLoaded, totalBytes, aggregatePercent)
          },
        },
      )
      results.push(res)
      bytesDoneInPriorBatches += batchTotal
    }

    // Merge per-batch results into one summary the UI can render.
    return {
      created_count: results.reduce((s, r) => s + (r.created_count ?? 0), 0),
      poster_ids: results.flatMap(r => r.poster_ids ?? []),
      failed_count: results.reduce((s, r) => s + (r.failed_count ?? 0), 0),
      failed: results.flatMap(r => r.failed ?? []),
      skipped_count: results.reduce((s, r) => s + (r.skipped_count ?? 0), 0),
      skipped: results.flatMap(r => r.skipped ?? []),
      batch_count: batches.length,
    }
  },
}

/** Mark a poster as the festival card cover. Backend clears `is_cover` on
 *  every other poster of the same festival in a single transaction. */
export const postersAdminApi = {
  setCover: async (posterId: number) => {
    const res = await api.post(`/api/admin/posters/${posterId}/set-cover/`)
    return res.data as { poster_id: number; festival_id: number; is_cover: boolean }
  },
}

// ─── Types for the User Details modal aux endpoints ─────────────────
export interface UserNotificationRow {
  id: number
  title: string
  body: string
  notification_type: string
  image_url: string
  action_url: string
  is_read: boolean
  data: Record<string, unknown>
  created_at: string
}

export interface UserSubscriptionRow {
  id: number
  plan_id: number
  plan_name: string
  plan_slug: string
  price: string
  duration_days: number
  status: 'created' | 'authorized' | 'captured' | 'active' | 'expired' | 'cancelled' | 'failed'
  starts_at: string | null
  expires_at: string | null
  created_at: string
  razorpay_order_id: string
  is_admin_grant: boolean
}

export interface UserDeviceRow {
  id: number
  platform: 'android' | 'ios' | 'web'
  device_name: string
  is_active: boolean
  token_preview: string
  created_at: string
  updated_at: string
}

export interface UserReferralInfo {
  referral_code: string
  referred_by: { id: number; name: string; email: string; phone: string; referral_code: string } | null
  referrals_count: number
  referred_users: Array<{ id: number; name: string; email: string; phone: string; joined_at: string }>
}

// ─── BusinessCategoryChoice (Gap 1 fix) ─────────────────────────────
export interface BusinessCategoryChoice {
  id: number
  slug: string
  name: string
  icon_url?: string | null
  is_active: boolean
  sort_order: number
  created_at?: string
}

/** Public list (used by both admin "Edit Business" form and the user app). */
export const publicBusinessCategoryChoicesApi = {
  list: async () => {
    const res = await api.get('/api/auth/business-category-choices/')
    return res.data as Array<{ slug: string; name: string; icon_url?: string; sort_order: number }>
  },
}

/** Admin CRUD for managing the BusinessCategoryChoice table. */
export const businessCategoryChoicesApi = crud('business-category-choices')

/** Pillar 3 — admin push notification methods (single + bulk). */
export const usersAdminApi = {
  /** Send a manual push to a single user (e.g. from User Details modal). */
  sendPush: async (
    userId: number,
    payload: {
      title: string
      body: string
      image_url?: string | null
      deep_link?: string
      save_to_inbox?: boolean
    },
  ) => {
    const res = await api.post(`/api/admin/users/${userId}/send-push/`, payload)
    return res.data as {
      sent_count: number
      failed_count: number
      device_count: number
      inbox_notification_id: number | null
    }
  },

  // ─── User Details modal endpoints ────────────────────────────────
  listNotifications: async (userId: number) => {
    const res = await api.get(`/api/admin/users/${userId}/notifications/`)
    return res.data as { count: number; results: UserNotificationRow[] }
  },
  listSubscriptions: async (userId: number) => {
    const res = await api.get(`/api/admin/users/${userId}/subscriptions/`)
    return res.data as { count: number; results: UserSubscriptionRow[] }
  },
  cancelSubscription: async (userId: number) => {
    const res = await api.post(`/api/admin/users/${userId}/cancel-subscription/`)
    return res.data as { cancelled_subscription_id: number; plan_slug: string; is_premium: boolean }
  },
  listDevices: async (userId: number) => {
    const res = await api.get(`/api/admin/users/${userId}/devices/`)
    return res.data as { count: number; results: UserDeviceRow[] }
  },
  deactivateDevice: async (userId: number, deviceId: number) => {
    const res = await api.post(`/api/admin/users/${userId}/deactivate-device/`, { device_id: deviceId })
    return res.data as { device_id: number; is_active: boolean }
  },
  referralInfo: async (userId: number) => {
    const res = await api.get(`/api/admin/users/${userId}/referral-info/`)
    return res.data as UserReferralInfo
  },
  /** GDPR JSON export — triggers a file download in the browser. */
  gdprExportUrl: (userId: number) => `${api.defaults.baseURL || ''}/api/admin/users/${userId}/gdpr-export/`,

  /** Gap 4 — fire silent FCM to wake user's app + force re-fetch. */
  forceRefreshApp: async (userId: number) => {
    const res = await api.post(`/api/admin/users/${userId}/force-refresh-app/`)
    return res.data as { sent_count: number; device_count: number }
  },

  /** Send a bulk push by user_ids (multi-select) OR by filters. */
  sendPushBulk: async (payload: {
    title: string
    body: string
    image_url?: string | null
    deep_link?: string
    save_to_inbox?: boolean
    user_ids?: number[]                      // multi-select mode
    filters?: {                              // filter mode
      is_premium?: boolean
      plan?: 'free' | 'basic' | 'pro' | 'enterprise'
      last_seen_days_min?: number            // active in last N days
      last_seen_days_max?: number            // inactive for N+ days
    }
  }) => {
    const res = await api.post('/api/admin/users/send-push-bulk/', payload)
    return res.data as {
      target_count: number
      sent_count: number
      failed_count: number
    }
  },
}
export const autoPostersApi = crud('auto-posters')
export const festivalPostersApi = crud('festival-posters')

export const plansApi = {
  ...crud('plans'),
  // duplicate(): copies a plan by POSTing a stripped-down version of it
  // under a new slug. Used by the Plans page's "Duplicate" row action to
  // create yearly-from-monthly variants etc.
  duplicate: async (id: number): Promise<{ id: number }> => {
    const { data: src } = await api.get(`/api/admin/plans/${id}/`)
    const copy = { ...src }
    delete copy.id
    delete copy.created_at
    delete copy.subscriber_count
    copy.name = `${src.name} (copy)`
    copy.slug = `${src.slug}-copy-${Date.now().toString(36)}`
    copy.is_active = false  // safer — admin toggles on when ready
    const { data } = await api.post('/api/admin/plans/', copy)
    return data
  },
}

export const subscriptionsApi = {
  ...crud('subscriptions'),

  // Admin actions — match the @action endpoints on SubscriptionViewSet.
  // All return the updated subscription row on success; throw on failure
  // (axios rejects non-2xx, so callers .catch() to show toast).
  cancel: (id: number, reason?: string) =>
    api.post(`/api/admin/subscriptions/${id}/cancel/`, { reason: reason ?? '' })
      .then(r => r.data),

  refund: (id: number, opts: {
    amount?: number | string | null
    reason?: string
    speed?: 'normal' | 'optimum'
  }) =>
    api.post(`/api/admin/subscriptions/${id}/refund/`, {
      amount: opts.amount ?? null,
      reason: opts.reason ?? '',
      speed: opts.speed ?? 'normal',
    }).then(r => r.data),

  extend: (id: number, days: number, reason?: string) =>
    api.post(`/api/admin/subscriptions/${id}/extend/`, {
      days, reason: reason ?? '',
    }).then(r => r.data),

  activateManually: (id: number) =>
    api.post(`/api/admin/subscriptions/${id}/activate/`).then(r => r.data),

  // Revenue Dashboard data source — aggregated MRR / churn / plan split.
  stats: (range: '12m' | '3m' | '1m' | 'all' = '12m') =>
    api.get('/api/admin/subscriptions/stats/', { params: { range } })
      .then(r => r.data),

  // Returns a blob URL for the generated CSV so the caller can trigger
  // a browser download. Respects the current filter/search state that
  // the caller passes in via params.
  exportCsv: async (params?: Record<string, string | number | undefined>): Promise<string> => {
    const r = await api.get('/api/admin/subscriptions/export/', {
      params,
      responseType: 'blob',
    })
    return URL.createObjectURL(r.data as Blob)
  },
}

// ── Feature Matrix (Phase 3A) ────────────────────────────────
export interface FeatureMatrixPayload {
  plans: Array<{ id: number; slug: string; name: string; sort_order: number; is_active: boolean }>
  features: Array<{
    id: number; slug: string; name: string; category: string; category_display: string
    description: string; icon: string; sort_order: number; is_active: boolean
  }>
  cells: Array<{
    plan_id: number; feature_id: number
    enabled: boolean; quota: number | null; note: string
  }>
}

export const featuresApi = {
  ...crud('features'),
  getMatrix: () =>
    api.get<FeatureMatrixPayload>('/api/admin/features/matrix/').then(r => r.data),
  bulkUpdate: (cells: Array<{
    plan_id: number; feature_id: number
    enabled: boolean; quota?: number | null; note?: string
  }>) =>
    api.post<{ created: number; updated: number }>(
      '/api/admin/features/matrix/bulk-update/',
      { cells },
    ).then(r => r.data),
}

export const planFeaturesApi = crud('plan-features')

// ── Promo Codes (Phase 3B) ──────────────────────────────────
export interface PromoCode {
  id: number
  code: string
  description: string
  discount_type: 'percent' | 'flat'
  discount_value: number
  max_discount_amount: number
  applicable_plans: number[]
  applicable_plan_slugs: string[]
  total_usage_limit: number
  per_user_limit: number
  usage_count: number
  valid_from: string | null
  valid_until: string | null
  campaign_tag: string
  is_active: boolean
  created_at: string
  created_by: string
  redemption_revenue: number
}

export const promoCodesApi = {
  ...crud<PromoCode>('promo-codes'),
  bulkGenerate: (payload: {
    prefix?: string
    count: number
    length?: number
    discount_type: 'percent' | 'flat'
    discount_value: number
    max_discount_amount?: number
    description?: string
    total_usage_limit?: number
    per_user_limit?: number
    valid_from?: string | null
    valid_until?: string | null
    campaign_tag?: string
    is_active?: boolean
    applicable_plan_ids?: number[]
  }) =>
    api.post<{ created: number; sample: string[] }>(
      '/api/admin/promo-codes/bulk-generate/', payload,
    ).then(r => r.data),
  redemptions: (id: number) =>
    api.get(`/api/admin/promo-codes/${id}/redemptions/`).then(r => r.data),
}

export const promoRedemptionsApi = crud('promo-redemptions')

export const creditTransactionsApi = crud('credit-transactions')
export const aiUsageApi = crud('ai-usage')

export const musicTracksApi = crud('music-tracks')
export const reelsApi = crud('reels')

export const notificationsApi = crud('notifications')
export const notificationSendApi = {
  send: (data: { title: string; body: string; notification_type: string; image_url?: string; target: string }) =>
    api.post('/api/notifications/admin-send/', data).then(r => r.data),
}

export const serviceCategoriesApi = crud('service-categories')
export const servicesApi = crud('services')

export const greetingCategoriesApi = crud('greeting-categories')
export const greetingTemplatesApi = crud('greeting-templates')
export const customersApi = crud('customers')
export const greetingConfigApi = {
  get: () => api.get('/api/admin/greeting-config/').then(r => {
    const items = Array.isArray(r.data) ? r.data : r.data.results || [r.data]
    return items[0] || {}
  }),
  update: (data: any) => api.get('/api/admin/greeting-config/').then(r => {
    const items = Array.isArray(r.data) ? r.data : r.data.results || [r.data]
    const id = items[0]?.id || 1
    return api.patch(`/api/admin/greeting-config/${id}/`, data).then(r => r.data)
  }),
}

export const stickerPacksApi = crud('sticker-packs')
export const stickersApi = crud('stickers')
export const stickerBannersApi = crud('sticker-banners')
export const editorStickerCategoriesApi = crud('editor-sticker-categories')
export const editorStickersApi = crud('editor-stickers')

export const adTemplatesApi = crud('ad-templates')
export const productsApi = crud('products')
export const generatedAdsApi = crud('generated-ads')
export const adCategoriesApi = crud('ad-categories')
export const adConfigApi = {
  get: () => api.get('/api/admin/ad-config/').then(r => {
    const items = Array.isArray(r.data) ? r.data : r.data.results || [r.data]
    return items[0] || {}
  }),
  update: (data: any) => api.get('/api/admin/ad-config/').then(r => {
    const items = Array.isArray(r.data) ? r.data : r.data.results || [r.data]
    const id = items[0]?.id || 1
    return api.patch(`/api/admin/ad-config/${id}/`, data).then(r => r.data)
  }),
}

export const slideshowConfigApi = {
  get: () => api.get('/api/admin/slideshow-config/').then(r => {
    const items = Array.isArray(r.data) ? r.data : r.data.results || [r.data]
    return items[0] || {}
  }),
  update: (data: any) => api.get('/api/admin/slideshow-config/').then(r => {
    const items = Array.isArray(r.data) ? r.data : r.data.results || [r.data]
    const id = items[0]?.id || 1
    return api.patch(`/api/admin/slideshow-config/${id}/`, data).then(r => r.data)
  }),
}

export const tutorialsApi = crud('tutorials')
export const contactSubmissionsApi = crud('contact-submissions')
export const partnerInquiriesApi = crud('partner-inquiries')
export const policiesApi = crud('policies')
export const mallCategoriesApi = crud('mall-categories')
export const mallListingsApi = crud('mall-listings')
export const mallSpotlightApi = crud('mall-spotlight')
export const mallConfigApi = {
  get: () => api.get('/api/admin/mall-config/').then(r => {
    const items = Array.isArray(r.data) ? r.data : r.data.results || [r.data]
    return items[0] || {}
  }),
  update: (data: any) => api.get('/api/admin/mall-config/').then(r => {
    const items = Array.isArray(r.data) ? r.data : r.data.results || [r.data]
    const id = items[0]?.id || 1
    return api.patch(`/api/admin/mall-config/${id}/`, data).then(r => r.data)
  }),
}
export const politicianProfilesApi = crud('politician-profiles')
export const politicianCategoriesApi = crud('politician-categories')
export const politicianPositionsApi = crud('politician-positions')
export const popupPostersApi = crud('popup-posters')
export const taglinesApi = crud('taglines')
export const watermarkSettingsApi = crud('watermark-settings')
export const designSettingsApi = crud('design-settings')
export const deleteRequestsApi = {
  ...crud('delete-requests'),
  approve: (id: number, admin_notes?: string) =>
    api.post(`/api/admin/delete-requests/${id}/approve/`, { admin_notes }).then(r => r.data),
  reject: (id: number, admin_notes?: string) =>
    api.post(`/api/admin/delete-requests/${id}/reject/`, { admin_notes }).then(r => r.data),
}

// ── VbizCard ─────────────────────────────────────────────────────
export const vbizCardCategoriesApi = crud('vbizcard-categories')
export const vbizCardTemplatesApi = crud('vbizcard-templates')
export const vbizCardHomeSectionsApi = crud('vbizcard-home-sections')
export const vbizCardPromoBannersApi = crud('vbizcard-promo-banners')
export const vbizCardTestimonialsApi = crud('vbizcard-testimonials')

// ── Home Banners ────────────────────────────────────────────────
export const homeBannersApi = crud('home-banners')

// ── Home Cards ──────────────────────────────────────────────────
export const homeCardsApi = crud<any>('home-cards')
export const homeCardSectionsApi = crud<any>('home-card-sections')

// ── Promo Announcements ────────────────────────────────────────
export const promoAnnouncementsApi = crud<any>('promo-announcements')

// ── BG Removal ───────────────────────────────────────────────────
export const bgRemovalCreditsApi = crud('credit-plans')
export const bgRemovalFaqsApi = crud('bg-removal-faqs')
export const bgRemovalBannersApi = crud('bg-removal-banners')
export const bgRemovalTestimonialsApi = crud('bg-removal-testimonials')

// ── Create Tools ────────────────────────────────────────────────
export const createToolsApi = crud('create-tools')

// ── Create Screen Banners ─────────────────────────────────────
export const createScreenBannersApi = crud('create-screen-banners')

// ── Canvas Presets ─────────────────────────────────────────────
export const canvasPresetsApi = crud('canvas-presets')

// ── Video Categories & Templates ──────────────────────────
export const videoCategoriesApi = crud('video-categories')
export const videoTemplatesApi = crud('video-templates')

// ── AI Tool Config ──────────────────────────────────────────
export const aiToolConfigApi = crud('ai-tools/config')
export const aiToolsApi = crud('ai-tools')

// ── Free Status ─────────────────────────────────────────────
export const statusCategoriesApi = crud('status-categories')
export const statusQuotesApi = crud('status-quotes')

// ── Feed Management ─────────────────────────────────────────
export const feedItemsApi = crud('feed-items')
export const feedBannersApi = crud('feed-banners')
export const feedConfigApi = {
  get: () => api.get('/api/admin/feed-config/').then(r => {
    const items = Array.isArray(r.data) ? r.data : r.data.results || [r.data]
    return items[0] || {}
  }),
  update: (data: any) => api.get('/api/admin/feed-config/').then(r => {
    const items = Array.isArray(r.data) ? r.data : r.data.results || [r.data]
    const id = items[0]?.id || 1
    return api.patch(`/api/admin/feed-config/${id}/`, data).then(r => r.data)
  }),
}

// ── Card Wizard ─────────────────────────────────────────────
export const wizardConfigsApi = crud('wizard-configs')
export const wizardFeaturesApi = crud('wizard-features')
export const wizardFormFieldsApi = crud('wizard-form-fields')
export const wizardSocialChannelsApi = crud('wizard-social-channels')
export const wizardPaymentGatewaysApi = crud('wizard-payment-gateways')
export const userCardDataApi = crud('user-card-data')

// ── Logo Maker ──────────────────────────────────────────────
export const logoConfigsApi = crud('logo-configs')
export const logoConfigsSingletonApi = {
  get: () => api.get('/api/admin/logo-configs/').then(r => {
    const items = Array.isArray(r.data) ? r.data : r.data.results || [r.data]
    return items[0] || {}
  }),
  update: (data: any) => api.get('/api/admin/logo-configs/').then(r => {
    const items = Array.isArray(r.data) ? r.data : r.data.results || [r.data]
    const id = items[0]?.id || 1
    return api.patch(`/api/admin/logo-configs/${id}/`, data).then(r => r.data)
  }),
}
export const logoIndustriesApi = crud('logo-industries')
export const logoStylesApi = crud('logo-styles')
export const logoColorsApi = crud('logo-colors')
export const userLogosApi = crud('user-logos')

// ── Collage ─────────────────────────────────────────────────
export const collageConfigApi = crud('collage-config')
export const collageConfigSingletonApi = {
  get: () => api.get('/api/admin/collage-config/').then(r => {
    const items = Array.isArray(r.data) ? r.data : r.data.results || [r.data]
    return items[0] || {}
  }),
  update: (data: any) => api.get('/api/admin/collage-config/').then(r => {
    const items = Array.isArray(r.data) ? r.data : r.data.results || [r.data]
    const id = items[0]?.id || 1
    return api.patch(`/api/admin/collage-config/${id}/`, data).then(r => r.data)
  }),
}
export const collageLayoutsApi = crud('collage-layouts')
export const collageAspectRatiosApi = crud('collage-aspect-ratios')
export const collageEditorTabsApi = crud('collage-editor-tabs')

// ── Business & Misc ─────────────────────────────────────────
export const businessIndustriesApi = crud('business-industries')
export const socialPlatformsApi = crud('social-platforms')
export const businessSetupConfigApi = crud('business-setup-config')
export const businessSetupConfigSingletonApi = {
  get: () => api.get('/api/admin/business-setup-config/').then(r => {
    const items = Array.isArray(r.data) ? r.data : r.data.results || [r.data]
    return items[0] || {}
  }),
  update: (data: any) => api.get('/api/admin/business-setup-config/').then(r => {
    const items = Array.isArray(r.data) ? r.data : r.data.results || [r.data]
    const id = items[0]?.id || 1
    return api.patch(`/api/admin/business-setup-config/${id}/`, data).then(r => r.data)
  }),
}
export const contactConfigApi = crud('contact-config')
export const contactConfigSingletonApi = {
  get: () => api.get('/api/admin/contact-config/').then(r => {
    const items = Array.isArray(r.data) ? r.data : r.data.results || [r.data]
    return items[0] || {}
  }),
  update: (data: any) => api.get('/api/admin/contact-config/').then(r => {
    const items = Array.isArray(r.data) ? r.data : r.data.results || [r.data]
    const id = items[0]?.id || 1
    return api.patch(`/api/admin/contact-config/${id}/`, data).then(r => r.data)
  }),
}
export const languageOptionsApi = crud('language-options')
export const formatCategoriesApi = crud('format-categories')

// ── Explore Features ───────────────────────────────────────
export const exploreFeaturesApi = crud('explore-features')

// ── BG Removal Config ──────────────────────────────────────
export const bgRemovalConfigApi = {
  get: () => api.get('/api/admin/bg-removal-config/').then(r => r.data),
  update: (id: number, data: any) => api.patch(`/api/admin/bg-removal-config/${id}/`, data).then(r => r.data),
  list: () => api.get('/api/admin/bg-removal-config/').then(r => r.data),
}

