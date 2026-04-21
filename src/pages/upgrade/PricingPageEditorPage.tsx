import { useState, useEffect } from 'react'
import {
  Layout, Save, Loader2, AlertCircle, Star, StarOff,
  Gift, Sparkles, Check, ImageIcon,
} from 'lucide-react'
import { pricingPageApi, plansApi, type PricingPageConfig } from '../../services/admin-api'
import { useToast } from '../../context/ToastContext'
import type { SubscriptionPlan } from '../../types'

/**
 * R1 (2026-04) — Admin edits the in-app plan-picker chrome.
 *
 * Two concerns on this page:
 *   1. PricingPageConfig singleton — headline / sub / footer CTA /
 *      comparison-toggle / guarantee / hero banner.
 *   2. Which SubscriptionPlan gets the "Most Popular" badge — a
 *      per-plan boolean that only one plan should hold at a time.
 *      Handled by the dedicated set-most-popular endpoint so the
 *      swap is atomic and the admin can't accidentally flag two
 *      plans simultaneously.
 *
 * The page stays on a single scroll — form above, plan cards below —
 * because there's no interaction between them. Editing one doesn't
 * require the other.
 */
export default function PricingPageEditorPage() {
  const { addToast } = useToast()
  const [config, setConfig] = useState<PricingPageConfig | null>(null)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [cfg, planList] = await Promise.all([
        pricingPageApi.current(),
        plansApi.list({ page_size: 200 }),
      ])
      setConfig(cfg)
      setPlans(planList as unknown as SubscriptionPlan[])
      setDirty(false)
    } catch {
      addToast('Failed to load pricing page config', 'error')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  const patch = <K extends keyof PricingPageConfig>(k: K, v: PricingPageConfig[K]) => {
    setConfig(c => c ? { ...c, [k]: v } : c)
    setDirty(true)
  }

  const saveConfig = async () => {
    if (!config) return
    setSaving(true)
    try {
      const { id, updated_at, updated_by, ...body } = config
      void updated_at; void updated_by  // unused — stripped from request
      const updated = await pricingPageApi.update(id, body)
      setConfig(updated)
      setDirty(false)
      addToast('Pricing page saved')
    } catch { addToast('Save failed', 'error') }
    finally { setSaving(false) }
  }

  const toggleMostPopular = async (planId: number, currentlyFlagged: boolean) => {
    try {
      if (currentlyFlagged) {
        await pricingPageApi.clearMostPopular()
        addToast('Most Popular cleared')
      } else {
        await pricingPageApi.setMostPopular(planId)
        addToast('Most Popular updated')
      }
      // Reload plans so the flag changes are visible
      const freshPlans = await plansApi.list({ page_size: 200 })
      setPlans(freshPlans as unknown as SubscriptionPlan[])
    } catch { addToast('Operation failed', 'error') }
  }

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center py-20 text-brand-text-muted">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading pricing page…
      </div>
    )
  }

  const activePlans = plans.filter(p => p.is_active).sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-text flex items-center gap-2">
            <Layout className="w-6 h-6 text-brand-gold" />
            Pricing Page Editor
          </h1>
          <p className="text-sm text-brand-text-muted mt-0.5">
            Controls the "Choose a plan" screen in the Android app.
          </p>
        </div>
        {dirty && (
          <button onClick={saveConfig} disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-brand-gold text-gray-900 text-sm font-medium rounded-lg hover:bg-brand-gold-dark disabled:opacity-60">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        )}
      </div>

      {/* Page chrome form */}
      <div className="grid md:grid-cols-[1fr,360px] gap-6">
        {/* LEFT — fields */}
        <div className="space-y-4">
          <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 p-5 space-y-4">
            <SectionHeader icon={Sparkles} title="Hero copy" />
            <Field label="Headline">
              <input value={config.headline}
                     onChange={e => patch('headline', e.target.value)}
                     className={inputCls} />
            </Field>
            <Field label="Sub-headline">
              <textarea value={config.subheadline}
                        onChange={e => patch('subheadline', e.target.value)}
                        rows={2} className={`${inputCls} min-h-[60px]`} />
            </Field>
            <Field label={<span className="flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5 text-brand-gold" />Hero banner image URL (optional)</span>}>
              <input value={config.hero_banner_url}
                     onChange={e => patch('hero_banner_url', e.target.value)}
                     placeholder="https://…/banner.png"
                     className={inputCls} />
            </Field>
          </div>

          <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 p-5 space-y-4">
            <SectionHeader icon={Gift} title="Trust + footer" />
            <Field label="Guarantee text (shown under CTA)">
              <input value={config.guarantee_text}
                     onChange={e => patch('guarantee_text', e.target.value)}
                     className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Footer CTA text">
                <input value={config.footer_cta_text}
                       onChange={e => patch('footer_cta_text', e.target.value)}
                       className={inputCls} />
              </Field>
              <Field label="Footer deep link">
                <input value={config.footer_cta_deep_link}
                       onChange={e => patch('footer_cta_deep_link', e.target.value)}
                       placeholder="brandnio://contact"
                       className={inputCls} />
              </Field>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={config.show_comparison_table}
                     onChange={e => patch('show_comparison_table', e.target.checked)}
                     className="rounded accent-brand-gold" />
              <span className="text-sm text-brand-text">Show detailed plan-vs-plan comparison table below cards</span>
            </label>
          </div>

          <div className="text-[11px] text-brand-text-muted">
            Last updated {config.updated_at ? new Date(config.updated_at).toLocaleString() : '—'}
            {config.updated_by && ` by ${config.updated_by}`}
          </div>
        </div>

        {/* RIGHT — live preview */}
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-brand-text-muted mb-2">
            Live preview
          </div>
          <div className="rounded-xl border border-brand-dark-border overflow-hidden bg-gradient-to-b from-brand-dark to-brand-dark-card p-5">
            {config.hero_banner_url && (
              <img src={config.hero_banner_url} alt=""
                   className="w-full h-28 object-cover rounded-lg mb-3" />
            )}
            <div className="text-xl font-bold text-brand-text text-center">
              {config.headline || 'Your headline'}
            </div>
            <div className="text-xs text-brand-text-muted text-center mt-1.5">
              {config.subheadline}
            </div>
            <div className="text-[10px] text-center text-emerald-400 mt-4 font-medium">
              {config.guarantee_text}
            </div>
            <button className="w-full mt-3 py-2.5 rounded-lg bg-brand-gold text-gray-900 text-sm font-semibold">
              {config.footer_cta_text || 'Button'}
            </button>
          </div>
        </div>
      </div>

      {/* Plan cards with Most Popular toggles */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-brand-text flex items-center gap-2">
            <Star className="w-5 h-5 text-brand-gold" />
            Plan highlighting
          </h2>
          <span className="text-xs text-brand-text-muted">
            Click ★ to mark a plan as "Most Popular" — clears automatically on others
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {activePlans.map(p => (
            <div key={p.id}
                 className={`relative rounded-xl border p-5 transition-all ${
                   p.is_most_popular
                     ? 'border-brand-gold bg-brand-gold/5 shadow-[0_0_0_1px_rgba(245,197,24,0.2)]'
                     : 'border-brand-dark-border/50 bg-brand-dark-card'
                 }`}>
              {p.is_most_popular && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-gold text-gray-900 text-[10px] font-bold uppercase tracking-wider">
                  <Star className="w-3 h-3 fill-current" /> Most Popular
                </span>
              )}
              <div className="text-sm font-medium text-brand-text">{p.name}</div>
              <div className="text-xs text-brand-text-muted font-mono mt-0.5">{p.slug}</div>
              <div className="mt-3 text-xl font-bold text-brand-gold">
                ₹{p.price}
                <span className="text-[11px] text-brand-text-muted font-normal ml-1">
                  / {p.duration}
                </span>
              </div>
              {p.is_trial && <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-medium">TRIAL</span>}
              <button onClick={() => toggleMostPopular(p.id, p.is_most_popular)}
                      className={`w-full mt-4 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                        p.is_most_popular
                          ? 'bg-brand-gold/20 text-brand-gold hover:bg-brand-gold/30'
                          : 'bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border'
                      }`}>
                {p.is_most_popular
                  ? <><StarOff className="w-3.5 h-3.5" /> Remove highlight</>
                  : <><Star className="w-3.5 h-3.5" /> Mark Most Popular</>}
              </button>
            </div>
          ))}
        </div>
        {activePlans.length === 0 && (
          <div className="text-center py-10 text-sm text-brand-text-muted">
            No active plans. Add plans on /subscriptions/plans first.
          </div>
        )}
      </div>
    </div>
  )
}

// ── Helpers ─────────────────────────────────────────────

const inputCls = 'w-full bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50'

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-brand-text-muted mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 pb-2 border-b border-brand-dark-border">
      <Icon className="w-3.5 h-3.5 text-brand-gold" />
      <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-text-muted">{title}</span>
    </div>
  )
}

// unused guards
void Check; void AlertCircle
