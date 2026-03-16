import { cn } from '../../utils/cn'
import { LucideIcon } from 'lucide-react'

interface Props {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: { value: number; isUp: boolean }
  className?: string
}

export function KPICard({ title, value, icon: Icon, trend, className }: Props) {
  return (
    <div className={cn('bg-brand-dark-card rounded-xl p-5 border border-brand-dark-border/50', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-brand-text-muted text-sm">{title}</p>
          <p className="text-2xl font-bold text-brand-text mt-1">{value}</p>
          {trend && (
            <p className={cn('text-xs mt-1', trend.isUp ? 'text-status-success' : 'text-status-error')}>
              {trend.isUp ? '↑' : '↓'} {Math.abs(trend.value)}% vs last month
            </p>
          )}
        </div>
        <div className="bg-brand-gold/10 p-3 rounded-lg">
          <Icon className="h-6 w-6 text-brand-gold" />
        </div>
      </div>
    </div>
  )
}
