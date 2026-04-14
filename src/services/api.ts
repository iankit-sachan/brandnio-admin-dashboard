import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  withCredentials: false,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000, // 30s timeout — prevents hanging requests
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
  // Add token auth header (memoized)
  const token = getAuthToken()
  if (token) {
    config.headers['Authorization'] = `Token ${token}`
  }
  // CSRF for session-based fallback
  const csrfToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1]
  if (csrfToken) {
    config.headers['X-CSRFToken'] = csrfToken
  }
  // Let browser set Content-Type with boundary for FormData
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

// Auto-retry on network errors and 5xx server errors (max 2 retries)
const MAX_RETRIES = 2
const RETRY_DELAY = 1000 // 1 second

api.interceptors.response.use(
  response => response,
  async error => {
    const config = error.config
    if (!config) return Promise.reject(error)

    // Don't retry on 401 (auth) — redirect to login
    if (error.response?.status === 401) {
      if (!isRedirecting) {
        isRedirecting = true
        _cachedToken = null
        _tokenSource = null
        localStorage.removeItem('admin_auth')
        window.location.href = import.meta.env.BASE_URL + 'login'
      }
      return Promise.reject(error)
    }

    // Don't retry on 4xx client errors (bad request, validation, not found)
    if (error.response && error.response.status >= 400 && error.response.status < 500) {
      return Promise.reject(error)
    }

    // Retry on: network error, timeout, 5xx server errors
    config._retryCount = config._retryCount || 0
    if (config._retryCount < MAX_RETRIES) {
      config._retryCount++
      console.warn(`[API Retry ${config._retryCount}/${MAX_RETRIES}] ${config.method?.toUpperCase()} ${config.url}`)
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * config._retryCount))
      return api(config)
    }

    return Promise.reject(error)
  }
)

let isRedirecting = false

export default api
