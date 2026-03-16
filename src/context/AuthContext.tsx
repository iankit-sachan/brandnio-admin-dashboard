import React, { createContext, useContext, useState, useCallback } from 'react'

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
    isAuthenticated: localStorage.getItem('admin_auth') === 'true',
    user: localStorage.getItem('admin_auth') === 'true'
      ? { username: localStorage.getItem('admin_user') || 'admin', email: 'admin@brandnio.com' }
      : null,
    loading: false,
  })

  const login = useCallback(async (username: string, password: string) => {
    setState(prev => ({ ...prev, loading: true }))
    // Mock login - accepts admin/admin123
    await new Promise(resolve => setTimeout(resolve, 800))
    if (username === 'admin' && password === 'admin123') {
      localStorage.setItem('admin_auth', 'true')
      localStorage.setItem('admin_user', username)
      setState({
        isAuthenticated: true,
        user: { username, email: 'admin@brandnio.com' },
        loading: false,
      })
    } else {
      setState(prev => ({ ...prev, loading: false }))
      throw new Error('Invalid credentials')
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('admin_auth')
    localStorage.removeItem('admin_user')
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
