import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const { login, loading, isAuthenticated } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login(username, password)
      addToast('Welcome to Brandnio Admin!', 'success')
      navigate('/', { replace: true })
    } catch {
      addToast('Invalid credentials. Please try again.', 'error')
    }
  }

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="h-14 w-14 bg-brand-gold rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-gray-900">B</span>
          </div>
          <h1 className="text-2xl font-bold text-brand-text">Brandnio Admin</h1>
          <p className="text-brand-text-muted text-sm mt-1">Sign in to your dashboard</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-brand-dark-card border border-brand-dark-border rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Email</label>
            <input
              type="email"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-gold/50"
              placeholder="admin@brandnio.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-gold/50"
              placeholder="Password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-gold text-gray-900 font-semibold py-2.5 rounded-lg hover:bg-brand-gold-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <LoadingSpinner size="sm" /> : 'Sign In'}
          </button>
          <p className="text-xs text-brand-text-muted text-center">Brandnio Admin Dashboard</p>
        </form>
      </div>
    </div>
  )
}
