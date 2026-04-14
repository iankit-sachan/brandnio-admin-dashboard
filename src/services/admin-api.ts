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

export const usersApi = crud('users')
export const businessProfilesApi = crud('business-profiles')

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
export const posterFramesApi = crud('poster-frames')
export const festivalsApi = crud('festivals')
export const autoPostersApi = crud('auto-posters')
export const festivalPostersApi = crud('festival-posters')

export const plansApi = crud('plans')
export const subscriptionsApi = crud('subscriptions')

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

