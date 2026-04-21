import { Layout } from 'lucide-react'
import { ComingSoonStub } from './ComingSoonStub'

export default function PricingPageEditorPage() {
  return (
    <ComingSoonStub
      icon={Layout}
      title="Pricing Page Editor"
      description="Visually edit the pricing / plan comparison page shown in the app and on the marketing site — headings, plan cards, highlighted tier, CTA copy."
      plannedFeatures={[
        'WYSIWYG editor for the plan comparison section',
        'Per-plan marketing headline + subheadline',
        'Feature bullet list with icons',
        'Highlighted / Most Popular badge on one plan',
        'CTA button text + target (checkout / app install / custom URL)',
        'A/B test variants with conversion tracking',
      ]}
    />
  )
}
