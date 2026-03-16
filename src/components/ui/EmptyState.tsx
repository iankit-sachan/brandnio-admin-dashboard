import { InboxIcon } from 'lucide-react'
import { cn } from '../../utils/cn'

interface Props {
  title?: string
  description?: string
  className?: string
}

export function EmptyState({ title = 'No data found', description = 'There are no items to display.', className }: Props) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      <InboxIcon className="h-12 w-12 text-brand-text-muted/50 mb-3" />
      <p className="text-brand-text font-medium">{title}</p>
      <p className="text-brand-text-muted text-sm mt-1">{description}</p>
    </div>
  )
}
