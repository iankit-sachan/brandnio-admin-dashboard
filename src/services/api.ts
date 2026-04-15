import axios from 'axios'

// ═══ SAFETY CHECK: Detect mixed content misconfiguration at startup ═══
const apiBase = import.meta.env.VITE_API_BASE_URL || ''
if (typeof window !== 'undefined' && window.location.protocol === 'https:' && apiBase.startsWith('http://')) {
  console.error(
    `[CRITICAL] Mixed content detected!\n` +
    `Page: ${window.location.origin} (HTTPS)\n` +
    `API: ${apiBase} (HTTP)\n` +
    `API calls WILL be blocked by the browser.\n` +
    `Fix: Set VITE_API_BASE_URL="" in .env.production and rebuild.`
  )
}

const api = axios.create({
  baseURL: apiBase,
  withCredentials: false,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

// Memoize token to avoid parsing localStorage on every request
let _cachedToken: string | null = null
let _tokenSource: string | null = null
function getAuthToken(): string | null {
  const raw = localStorage.getItem('admin_auth')
  if (raw !== _tokenSource) {
    _tokenSource = raw
    _cachedToken = null
    if (raw) {
      try { _cachedToken = JSON.parse(raw).token || null } catch { /* ignore */ }
    }
  }
  return _cachedToken
}

api.interceptors.request.use(config => {
  const token = getAuthToken()
  if (token) {
    config.headers['Authorization'] = `Token ${token}`
  }
  const csrfToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1]
  if (csrfToken) {
    config.headers['X-CSRFToken'] = csrfToken
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

// Auto-retry on network errors and 5xx server errors (max 2 retries)
const MAX_RETRIES = 2
const RETRY_DELAY = 1000

let isRedirecting = false

api.interceptors.response.use(
  response => response,
  async error => {
    const config = error.config
    if (!config) return Promise.reject(error)

    // Log all API failures for debugging
    const url = config.url || 'unknown'
    const method = (config.method || 'GET').toUpperCase()
    const status = error.response?.status || 'NETWORK_ERROR'
    const message = error.response?.data?.detail || error.message || 'Unknown error'
    console.error(`[API Error] ${method} ${url} → ${status}: ${message}`)

    // 401: redirect to login
    if (error.response?.status === 401) {
      if (!isRedirecting) {
        isRedirecting = true
        console.warn('[Auth] Token expired or invalid — redirecting to login')
        _cachedToken = null
        _tokenSource = null
        localStorage.removeItem('admin_auth')
        window.location.href = import.meta.env.BASE_URL + 'login'
      }
      return Promise.reject(error)
    }

    // 4xx: don't retry (client error)
    if (error.response && error.response.status >= 400 && error.response.status < 500) {
      return Promise.reject(error)
    }

    // Network error / timeout / 5xx: retry up to 2 times
    config._retryCount = config._retryCount || 0
    if (config._retryCount < MAX_RETRIES) {
      config._retryCount++
      console.warn(`[API Retry ${config._retryCount}/${MAX_RETRIES}] ${method} ${url}`)
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * config._retryCount))
      return api(config)
    }

    console.error(`[API Failed] ${method} ${url} — all ${MAX_RETRIES} retries exhausted`)
    return Promise.reject(error)
  }
)

export default api
