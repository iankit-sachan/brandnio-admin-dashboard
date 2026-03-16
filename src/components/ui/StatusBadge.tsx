import { cn } from '../../utils/cn'
import { STATUS_COLORS } from '../../utils/constants'

interface Props {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: Props) {
  const colorClass = STATUS_COLORS[status] || 'bg-brand-dark-hover text-brand-text-muted'
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', colorClass, className)}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}
