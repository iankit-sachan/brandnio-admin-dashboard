import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { authApi } from '../services/admin-api'

interface AuthState {
  isAuthenticated: boolean
  user: { username: string; email: string } | null
  loading: boolean
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: !!localStorage.getItem('admin_auth'),
    user: !!localStorage.getItem('admin_auth')
      ? { username: localStorage.getItem('admin_user') || 'admin', email: localStorage.getItem('admin_email') || '' }
      : null,
    loading: false,
  })

  // Verify session is still valid on mount
  useEffect(() => {
    if (state.isAuthenticated) {
      authApi.me().catch(() => {
        localStorage.removeItem('admin_auth')
        localStorage.removeItem('admin_user')
        localStorage.removeItem('admin_email')
        setState({ isAuthenticated: false, user: null, loading: false })
      })
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    setState(prev => ({ ...prev, loading: true }))
    try {
      const user = await authApi.login(username, password)
      localStorage.setItem('admin_auth', JSON.stringify({ token: user.token || 'session' }))
      localStorage.setItem('admin_user', user.username)
      localStorage.setItem('admin_email', user.email)
      setState({
        isAuthenticated: true,
        user: { username: user.username, email: user.email },
        loading: false,
      })
    } catch {
      setState(prev => ({ ...prev, loading: false }))
      throw new Error('Invalid credentials or not an admin')
    }
  }, [])

  const logout = useCallback(async () => {
    try { await authApi.logout() } catch { /* ignore */ }
    localStorage.removeItem('admin_auth')
    localStorage.removeItem('admin_user')
    localStorage.removeItem('admin_email')
    setState({ isAuthenticated: false, user: null, loading: false })
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
