import { Sparkles } from 'lucide-react'
import { ComingSoonStub } from './ComingSoonStub'

export default function PaywallEditorPage() {
  return (
    <ComingSoonStub
      icon={Sparkles}
      title="Paywall Editor"
      description="Control the in-app PremiumUpgradeDialog that triggers on AI Tools, Home, VisitCard, Greeting and Caption features — copy, imagery, feature highlights."
      plannedFeatures={[
        'Live preview of the paywall as seen on Android',
        'Hero headline + subheadline per trigger surface',
        'Feature highlight bullets with icons',
        'Plan cards ordering + default-selected plan',
        'CTA button copy (Upgrade / Start Trial / Continue)',
        'Seasonal skins (Diwali, New Year — auto-activated on date)',
        'Per-surface A/B test config',
      ]}
    />
  )
}
