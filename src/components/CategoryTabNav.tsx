import { NavLink } from 'react-router-dom'
import { FolderTree, Image, Trash2, MessageSquare, Quote, Tag } from 'lucide-react'

const tabs = [
  { path: '/categories/general', label: 'Categories', icon: FolderTree },
  { path: '/posters', label: 'Poster Templates', icon: Image },
  { path: '/categories/recycle-bin', label: 'Recycle Bin', icon: Trash2 },
  { path: '/statuses/categories', label: 'Status Categories', icon: MessageSquare },
  { path: '/statuses/quotes', label: 'Status Quotes', icon: Quote },
  { path: '/posters/tags', label: 'Tag Manager', icon: Tag },
]

export function CategoryTabNav() {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1 mb-2 border-b border-brand-dark-border/30">
      {tabs.map(tab => (
        <NavLink
          key={tab.path}
          to={tab.path}
          end={tab.path === '/posters'}
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-brand-gold/10 text-brand-gold'
                : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-dark-hover/50'
            }`
          }
        >
          <tab.icon className="h-3.5 w-3.5" />
          {tab.label}
        </NavLink>
      ))}
    </div>
  )
}
