import { useEffect, useState } from 'react'
import { plansApi, usersApi } from '../../services/admin-api'
import { useToast } from '../../context/ToastContext'
import type { User } from '../../types'

interface Plan {
  id: number
  name: string
  slug: string
  price: string
  duration_days: number
  description: string
  is_active: boolean
}

interface Props {
  user: User
  onClose: () => void
  onActivated: () => void
}

export default function PlanActivationModal({ user, onClose, onActivated }: Props) {
  const { addToast } = useToast()
  const [plans, setPlans] = useState<Plan[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    plansApi.list({ is_active: 'true' }).then((rows) => {
      const list = rows as Plan[]
      setPlans(list)
      if (list.length) setSelected(list[0].id)
    }).finally(() => setLoading(false))
  }, [])

  const handleActivate = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await usersApi.activatePremium(user.id, selected)
      addToast('Premium activated')
      onActivated()
      onClose()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      addToast(err.response?.data?.detail || 'Activation failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#f5efe0] rounded-2xl p-6 w-full max-w-lg shadow-2xl">
        <h2 className="text-lg font-bold text-gray-900 mb-1">
          Activate Premium for {user.name || user.email || 'Guest'}
        </h2>
        <p className="text-sm text-gray-600 mb-4">Select a subscription plan:</p>

        {loading ? (
          <div className="py-8 text-center text-gray-600">Loading plans...</div>
        ) : plans.length === 0 ? (
          <div className="py-8 text-center text-gray-600">No active plans configured.</div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {plans.map(p => (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                className={`w-full text-left rounded-xl p-4 border transition-all ${
                  selected === p.id
                    ? 'bg-green-600 text-white border-green-700'
                    : 'bg-white text-gray-900 border-gray-200 hover:border-green-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xl font-bold">
                      ₹{p.price} <span className="text-sm font-normal opacity-70">/ {p.duration_days}d</span>
                    </div>
                    <div className="text-sm opacity-80 mt-1 flex items-center gap-1">
                      <span className="inline-block w-4 h-4 rounded-full bg-green-600 text-white flex items-center justify-center text-[10px]">✓</span>
                      {p.name}
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 ${
                    selected === p.id ? 'bg-white border-white' : 'border-gray-300'
                  }`}>
                    {selected === p.id && <span className="flex items-center justify-center text-green-600 text-sm">✓</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-900 flex items-center gap-2">
          <span>ℹ️</span>
          <span>This will grant admin-activated premium access to the user.</span>
        </div>

        <div className="flex items-center justify-end gap-3 mt-5">
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900 px-4 py-2">
            Cancel
          </button>
          <button
            onClick={handleActivate}
            disabled={saving || !selected}
            className="px-5 py-2 rounded-full bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? 'Activating...' : 'Activate Premium'}
          </button>
        </div>
      </div>
    </div>
  )
}
