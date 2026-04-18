import { useState } from 'react'
import { cn } from '../../utils/cn'

const PALETTE = [
  'bg-rose-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-cyan-500',
  'bg-indigo-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-teal-500',
]

function hashId(seed: number | string): number {
  const s = String(seed)
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

interface Props {
  src?: string | null
  name?: string
  id?: number | string
  size?: number
  className?: string
  onClick?: () => void
  dimmed?: boolean
}

export function Avatar({ src, name = '', id = 0, size = 36, className, onClick, dimmed }: Props) {
  const [failed, setFailed] = useState(false)
  const showImage = !!src && !failed
  const initial = (name.trim()[0] || '?').toUpperCase()
  const bg = PALETTE[hashId(id) % PALETTE.length]
  const style = { width: size, height: size, fontSize: Math.round(size * 0.42) }

  const classes = cn(
    'inline-flex items-center justify-center rounded-full border border-brand-dark-border/50 select-none overflow-hidden font-semibold text-white',
    onClick && 'cursor-pointer hover:ring-2 hover:ring-amber-500 transition-all',
    dimmed && 'opacity-50 grayscale',
    !showImage && bg,
    className,
  )

  if (showImage) {
    return (
      <img
        src={src!}
        alt={name || 'avatar'}
        style={style}
        className={cn(classes, 'object-cover')}
        onClick={onClick}
        onError={() => setFailed(true)}
      />
    )
  }
  return (
    <span style={style} className={classes} onClick={onClick}>{initial}</span>
  )
}
