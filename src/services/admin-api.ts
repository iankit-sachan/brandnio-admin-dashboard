/**
 * Admin API service — typed wrappers for all admin CRUD endpoints.
 * Base: /api/admin/ (DRF Router auto-generates list/create/retrieve/update/destroy)
 */
import api from './api'

// ── Generic CRUD helper ──────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function crud<T = any>(resource: string) {
  const base = `/api/admin/${resource}/`
  return {
    list:   (params?: Record<string, string>) => api.get(base, { params }).then(r => {
      const d = r.data
      // Handle both plain arrays and DRF paginated responses
      if (Array.isArray(d)) return d as T[]
      if (d && typeof d === 'object' && 'results' in d && Array.isArray(d.results)) return d.results as T[]
      return [] as T[]
    }),
    get:    (id: number) => api.get<T>(`${base}${id}/`).then(r => r.data),
    create: (data: Partial<T>) => api.post<T>(base, data).then(r => r.data),
    update: (id: number, data: Partial<T>) => api.patch<T>(`${base}${id}/`, data).then(r => r.data),
    delete: (id: number) => api.delete(`${base}${id}/`).then(r => r.data),
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
}

// ── Auth ─────────────────────────────────────────────────────────

export const authApi = {
  login:  (username: string, password: string) =>
    api.post<{ username: string; email: string }>('/api/admin/login/', { username, password }).then(r => r.data),
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
  get: () => api.get('/api/admin/greeting-config/1/').then(r => r.data),
  update: (data: any) => api.patch('/api/admin/greeting-config/1/', data).then(r => r.data),
}

export const stickerPacksApi = crud('sticker-packs')
export const stickersApi = crud('stickers')
export const stickerBannersApi = crud('sticker-banners')

export const adTemplatesApi = crud('ad-templates')
export const productsApi = crud('products')
export const generatedAdsApi = crud('generated-ads')
export const adCategoriesApi = crud('ad-categories')
export const adConfigApi = {
  get: () => api.get('/api/admin/ad-config/1/').then(r => r.data),
  update: (data: any) => api.patch('/api/admin/ad-config/1/', data).then(r => r.data),
}

export const tutorialsApi = crud('tutorials')
export const contactSubmissionsApi = crud('contact-submissions')
export const partnerInquiriesApi = crud('partner-inquiries')
export const policiesApi = crud('policies')
export const mallCategoriesApi = crud('mall-categories')
export const mallListingsApi = crud('mall-listings')
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
export const bgRemovalCreditsApi = crud('bg-credit-plans')
export const bgRemovalFaqsApi = crud('bg-faqs')
export const bgRemovalBannersApi = crud('bg-removal-banners')
export const bgRemovalTestimonialsApi = crud('bg-testimonials')

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
