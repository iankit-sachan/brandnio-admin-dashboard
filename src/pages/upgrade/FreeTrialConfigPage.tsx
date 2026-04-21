import { useEffect, useState } from 'react'
import {
  Gift, Shield, CreditCard, Bell, Check, X as XIcon,
  Save, Loader2, AlertCircle, Sparkles,
} from 'lucide-react'
import { trialConfigsApi, plansApi, type TrialConfig } from '../../services/admin-api'
import { useToast } from '../../context/ToastContext'
import type { SubscriptionPlan } from '../../types'

/** One card per active plan. Loads all trial configs + all plans, then
 *  renders one editor card per plan. POSTs a new config if the plan
 *  doesn't have one yet; PATCHes existing. */
export default function FreeTrialConfigPage() {
  const { addToast } = useToast()
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [configs, setConfigs] = useState<TrialConfig[]>([])
  const [loading, setLoading] = useState(true)

  const reload = async () => {
    setLoading(true)
    try {
      const [planList, configList] = await Promise.all([
        plansApi.list({ page_size: 200 }),
        trialConfigsApi.list({ page_size: 200 }),
      ])
      setPlans(planList as unknown as SubscriptionPlan[])
      setConfigs(configList as unknown as TrialConfig[])
    } catch {
      addToast('Failed to load trial configs', 'error')
    } finally { setLoading(false) }
  }

  useEffect(() => { reload() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-brand-text-muted">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading trial configs…
      </div>
    )
  }

  const activePlans = plans.filter(p => p.is_active)
  const configByPlan = new Map<number, TrialConfig>()
  configs.forEach(c => configByPlan.set(c.plan, c))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-brand-text flex items-center gap-2">
          <Gift className="w-6 h-6 text-brand-gold" />
          Free Trial Config
        </h1>
        <p className="text-sm text-brand-text-muted mt-0.5">
          Per-plan trial settings — duration, card requirements, abuse guards.
        </p>
      </div>

      {activePlans.length === 0 ? (
        <div className="py-16 text-center">
          <Gift className="w-10 h-10 text-brand-text-muted/40 mx-auto mb-3" />
          <div className="text-sm text-brand-text-muted">
            No active plans. Add or activate plans first.
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {activePlans.map(p => (
            <TrialConfigCard
              key={p.id}
              plan={p}
              existing={configByPlan.get(p.id) ?? null}
              onSaved={reload}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TrialConfigCard({
  plan, existing, onSaved,
}: {
  plan: SubscriptionPlan
  existing: TrialConfig | null
  onSaved: () => void
}) {
  const { addToast } = useToast()
  const [form, setForm] = useState({
    is_enabled: existing?.is_enabled ?? false,
    trial_days: existing?.trial_days ?? 7,
    require_card_upfront: existing?.require_card_upfront ?? false,
    auto_convert_to_paid: existing?.auto_convert_to_paid ?? true,
    reminder_days_before_end: existing?.reminder_days_before_end ?? 2,
    one_trial_per_email: existing?.one_trial_per_email ?? true,
    one_trial_per_device: existing?.one_trial_per_device ?? true,
    one_trial_per_phone: existing?.one_trial_per_phone ?? false,
    note: existing?.note ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  // Sync form when existing changes (after save → reload)
  useEffect(() => {
    setForm({
      is_enabled: existing?.is_enabled ?? false,
      trial_days: existing?.trial_days ?? 7,
      require_card_upfront: existing?.require_card_upfront ?? false,
      auto_convert_to_paid: existing?.auto_convert_to_paid ?? true,
      reminder_days_before_end: existing?.reminder_days_before_end ?? 2,
      one_trial_per_email: existing?.one_trial_per_email ?? true,
      one_trial_per_device: existing?.one_trial_per_device ?? true,
      one_trial_per_phone: existing?.one_trial_per_phone ?? false,
      note: existing?.note ?? '',
    })
    setDirty(false)
  }, [existing?.id, existing?.updated_at])  // eslint-disable-line react-hooks/exhaustive-deps

  const patch = <K extends keyof typeof form>(k: K, v: typeof form[K]) => {
    setForm(f => ({ ...f, [k]: v }))
    setDirty(true)
  }

  const save = async () => {
    if (form.trial_days < 1 || form.trial_days > 90) {
      addToast('Trial days must be 1-90', 'error'); return
    }
    if (form.auto_convert_to_paid && !form.require_card_upfront) {
      addToast('Auto-convert requires card upfront', 'error'); return
    }
    setSaving(true)
    try {
      const payload = { plan: plan.id, ...form }
      if (existing) {
        await trialConfigsApi.update(existing.id, payload)
      } else {
        await trialConfigsApi.create(payload)
      }
      addToast(`${plan.name} trial config saved`)
      setDirty(false)
      onSaved()
    } catch {
      addToast('Save failed', 'error')
    } finally { setSaving(false) }
  }

  const isTrialActive = form.is_enabled

  return (
    <div className={`rounded-xl border bg-brand-dark-card transition-colors ${
      isTrialActive
        ? 'border-brand-gold/40 shadow-[0_0_0_1px_rgba(245,197,24,0.08)]'
        : 'border-brand-dark-border/50'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-brand-dark-border/50">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isTrialActive ? 'bg-brand-gold/15 text-brand-gold' : 'bg-brand-dark-hover text-brand-text-muted'
          }`}>
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-brand-text">{plan.name}</h2>
            <div className="text-xs text-brand-text-muted font-mono">{plan.slug}</div>
          </div>
        </div>

        {/* Master toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <span className={`text-sm font-medium ${isTrialActive ? 'text-emerald-400' : 'text-brand-text-muted'}`}>
            {isTrialActive ? 'Trial enabled' : 'Trial disabled'}
          </span>
          <button onClick={() => patch('is_enabled', !form.is_enabled)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    form.is_enabled ? 'bg-emerald-500' : 'bg-neutral-600'
                  }`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
              form.is_enabled ? 'translate-x-5' : 'translate-x-0.5'
            }`} />
          </button>
        </label>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {/* Trial duration + reminder */}
        <div className="grid grid-cols-2 gap-4">
          <NumberField icon={Sparkles} label="Trial duration (days)"
                       value={form.trial_days} min={1} max={90}
                       onChange={v => patch('trial_days', v)} />
          <NumberField icon={Bell} label="Reminder before end (days)"
                       value={form.reminder_days_before_end} min={0} max={30}
                       onChange={v => patch('reminder_days_before_end', v)} />
        </div>

        {/* Card / conversion section */}
        <div className="p-4 rounded-lg bg-brand-dark/50 border border-brand-dark-border/50 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-3.5 h-3.5 text-brand-gold" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-text-muted">
              Payment requirements
            </span>
          </div>
          <ToggleRow label="Require card on file before trial starts"
                     description="Reduces abuse but lowers conversion. Needed for auto-convert."
                     checked={form.require_card_upfront}
                     onChange={v => patch('require_card_upfront', v)} />
          <ToggleRow label="Auto-convert to paid at trial end"
                     description={form.require_card_upfront
                       ? 'Card charged automatically when trial expires.'
                       : '⚠ Disabled — enable "card on file" first.'}
                     checked={form.auto_convert_to_paid}
                     onChange={v => patch('auto_convert_to_paid', v)}
                     disabled={!form.require_card_upfront} />
        </div>

        {/* Abuse guards */}
        <div className="p-4 rounded-lg bg-brand-dark/50 border border-brand-dark-border/50 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-3.5 h-3.5 text-brand-gold" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-text-muted">
              Abuse guards — one trial per…
            </span>
          </div>
          <ToggleRow label="Email address" description="Default on — blocks trial for emails that already started one."
                     checked={form.one_trial_per_email}
                     onChange={v => patch('one_trial_per_email', v)} />
          <ToggleRow label="Device" description="Blocks sockpuppet accounts on the same installation."
                     checked={form.one_trial_per_device}
                     onChange={v => patch('one_trial_per_device', v)} />
          <ToggleRow label="Phone number" description="Some legitimate users share phones — disabled by default."
                     checked={form.one_trial_per_phone}
                     onChange={v => patch('one_trial_per_phone', v)} />
        </div>

        {/* Internal note */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-brand-text-muted mb-1.5">
            Internal note (optional)
          </label>
          <textarea value={form.note}
                    onChange={e => patch('note', e.target.value)}
                    rows={2}
                    placeholder="e.g. Decision rationale, campaign link, expected conversion rate"
                    className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
        </div>

        {/* Warnings */}
        {form.auto_convert_to_paid && !form.require_card_upfront && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200">
              Auto-convert is enabled but no card is required. Save will fail — toggle one of them.
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-5 border-t border-brand-dark-border/50">
        <div className="text-[11px] text-brand-text-muted">
          {existing
            ? `Last updated ${new Date(existing.updated_at).toLocaleDateString()}`
            : 'No config yet — click Save to create one.'}
        </div>
        <button onClick={save}
                disabled={!dirty || saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-brand-gold text-gray-900 text-sm font-medium rounded-lg hover:bg-brand-gold-dark disabled:opacity-50 disabled:cursor-not-allowed">
          {saving
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Save className="w-3.5 h-3.5" />}
          {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
        </button>
      </div>
    </div>
  )
}

function NumberField({
  icon: Icon, label, value, min, max, onChange,
}: {
  icon: React.ElementType
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand-text-muted mb-1.5">
        <Icon className="w-3 h-3" /> {label}
      </label>
      <input type="number" value={value} min={min} max={max}
             onChange={e => onChange(Number(e.target.value))}
             className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
    </div>
  )
}

function ToggleRow({
  label, description, checked, onChange, disabled,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className={`flex items-start gap-3 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
      <button type="button" onClick={() => !disabled && onChange(!checked)}
              disabled={disabled}
              className={`shrink-0 w-5 h-5 rounded flex items-center justify-center mt-0.5 transition-colors ${
                checked
                  ? 'bg-brand-gold text-gray-900'
                  : 'bg-brand-dark border border-brand-dark-border'
              }`}>
        {checked ? <Check className="w-3.5 h-3.5" /> : <XIcon className="w-3 h-3 text-transparent" />}
      </button>
      <div>
        <div className="text-sm text-brand-text">{label}</div>
        <div className="text-[11px] text-brand-text-muted">{description}</div>
      </div>
    </label>
  )
}
