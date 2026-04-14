import { useState, useEffect, useRef } from 'react'
import { X, Tag } from 'lucide-react'
import { posterTagsApi } from '../../services/admin-api'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

export function TagInput({ value, onChange, placeholder = 'Type tag and press Enter' }: TagInputProps) {
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<{ tag: string; count: number }[]>([])
  const [allTags, setAllTags] = useState<{ tag: string; count: number }[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    posterTagsApi.list().then(setAllTags).catch(() => {})
  }, [])

  useEffect(() => {
    if (input.trim().length > 0) {
      const q = input.trim().toLowerCase()
      const filtered = allTags
        .filter(t => t.tag.includes(q) && !value.includes(t.tag))
        .slice(0, 8)
      setSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
      setSelectedIndex(-1)
    } else {
      setShowSuggestions(false)
    }
  }, [input, allTags, value])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const addTag = (tag: string) => {
    const t = tag.trim().toLowerCase()
    if (t && !value.includes(t)) {
      onChange([...value, t])
    }
    setInput('')
    setShowSuggestions(false)
  }

  const removeTag = (tag: string) => {
    onChange(value.filter(t => t !== tag))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        addTag(suggestions[selectedIndex].tag)
      } else if (input.trim()) {
        addTag(input)
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, -1))
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      removeTag(value[value.length - 1])
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-indigo-500/15 text-indigo-400">
              {tag}
              <button type="button" onClick={() => removeTag(tag)} className="hover:text-status-error"><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (input.trim() && suggestions.length) setShowSuggestions(true) }}
          placeholder={placeholder}
          className="flex-1 bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50"
        />
        <button type="button" onClick={() => addTag(input)} className="px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
          <Tag className="h-4 w-4" />
        </button>
      </div>
      {showSuggestions && (
        <div className="absolute z-50 mt-1 w-full bg-brand-dark-card border border-brand-dark-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={s.tag}
              type="button"
              onClick={() => addTag(s.tag)}
              className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors ${i === selectedIndex ? 'bg-brand-gold/10 text-brand-gold' : 'text-brand-text hover:bg-brand-dark-hover'}`}
            >
              <span>{s.tag}</span>
              <span className="text-xs text-brand-text-muted">{s.count} posters</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
