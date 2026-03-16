import { Search } from 'lucide-react'
import { cn } from '../../utils/cn'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchInput({ value, onChange, placeholder = 'Search...', className }: Props) {
  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-text-muted" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-brand-dark border border-brand-dark-border rounded-lg pl-10 pr-4 py-2 text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-gold/50 transition-colors"
      />
    </div>
  )
}
