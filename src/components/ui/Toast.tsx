import { useToast } from '../../context/ToastContext'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { cn } from '../../utils/cn'

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
}

const colors = {
  success: 'border-status-success/30 bg-status-success/10',
  error: 'border-status-error/30 bg-status-error/10',
  info: 'border-status-info/30 bg-status-info/10',
  warning: 'border-status-warning/30 bg-status-warning/10',
}

const iconColors = {
  success: 'text-status-success',
  error: 'text-status-error',
  info: 'text-status-info',
  warning: 'text-status-warning',
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast()
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => {
        const Icon = icons[toast.type]
        return (
          <div
            key={toast.id}
            className={cn('flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg animate-in slide-in-from-right', colors[toast.type])}
          >
            <Icon className={cn('h-5 w-5 shrink-0', iconColors[toast.type])} />
            <p className="text-sm text-brand-text flex-1">{toast.message}</p>
            <button onClick={() => removeToast(toast.id)} className="text-brand-text-muted hover:text-brand-text">
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
