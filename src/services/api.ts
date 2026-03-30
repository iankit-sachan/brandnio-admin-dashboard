import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  withCredentials: false,
  headers: { 'Content-Type': 'application/json' },
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

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      _cachedToken = null
      _tokenSource = null
      localStorage.removeItem('admin_auth')
      window.location.href = import.meta.env.BASE_URL + 'login'
    }
    return Promise.reject(error)
  }
)

export default api
