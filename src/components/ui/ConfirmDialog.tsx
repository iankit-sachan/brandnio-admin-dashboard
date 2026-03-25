import { useState, useEffect } from 'react'
import { Modal } from './Modal'

interface Props {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  variant?: 'danger' | 'warning'
  children?: React.ReactNode
}

export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', variant = 'danger', children }: Props) {
  const [confirming, setConfirming] = useState(false)

  // Reset confirming state when dialog opens/closes
  useEffect(() => {
    if (!isOpen) setConfirming(false)
  }, [isOpen])

  const handleConfirm = () => {
    if (confirming) return
    setConfirming(true)
    onConfirm()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-brand-text-muted text-sm mb-2">{message}</p>
      {children && <div className="mb-4">{children}</div>}
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={confirming}
          className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors disabled:opacity-50 ${
            variant === 'danger'
              ? 'bg-status-error/20 text-status-error hover:bg-status-error/30'
              : 'bg-status-warning/20 text-status-warning hover:bg-status-warning/30'
          }`}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  )
}
