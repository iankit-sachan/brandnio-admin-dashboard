import { LucideIcon, Construction } from 'lucide-react'

/**
 * Shared scaffold for UPGRADE section pages that haven't been built yet.
 *
 * The sidebar advertises these 8 routes so the admin can see where the
 * product is going + click through to a placeholder instead of hitting
 * a 404. Each real page replaces its stub route in a follow-up session.
 */
export function ComingSoonStub({
  title,
  description,
  icon: Icon,
  plannedFeatures,
}: {
  title: string
  description: string
  icon: LucideIcon
  plannedFeatures: string[]
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      <div className="max-w-2xl w-full bg-brand-dark-card border border-brand-dark-border rounded-2xl p-10 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-gold/10 border border-brand-gold/30 mb-6">
          <Icon className="w-8 h-8 text-brand-gold" />
        </div>

        <h1 className="text-2xl font-semibold text-brand-text mb-2">{title}</h1>
        <p className="text-brand-text-muted mb-8">{description}</p>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium mb-8">
          <Construction className="w-3.5 h-3.5" />
          Under construction
        </div>

        {plannedFeatures.length > 0 && (
          <div className="text-left bg-brand-dark/50 border border-brand-dark-border rounded-xl p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-brand-text-muted mb-3">
              Planned capabilities
            </div>
            <ul className="space-y-2">
              {plannedFeatures.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-brand-text">
                  <span className="text-brand-gold mt-0.5">•</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
