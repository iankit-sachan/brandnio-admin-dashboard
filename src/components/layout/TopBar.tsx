import { useAuth } from '../../context/AuthContext'
import { SearchInput } from '../ui/SearchInput'
import { LogOut, User } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function TopBar() {
  const { user, logout } = useAuth()
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="h-16 bg-brand-dark-card border-b border-brand-dark-border flex items-center justify-between px-6 shrink-0">
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search (coming soon)..."
        className="w-80"
      />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-brand-gold/20 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-brand-gold" />
          </div>
          <span className="text-sm text-brand-text font-medium">{user?.username || 'Admin'}</span>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 text-brand-text-muted hover:text-status-error rounded-lg hover:bg-brand-dark-hover transition-colors"
          title="Logout"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
