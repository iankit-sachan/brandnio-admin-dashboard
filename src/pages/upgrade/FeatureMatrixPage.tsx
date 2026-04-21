import { Grid } from 'lucide-react'
import { ComingSoonStub } from './ComingSoonStub'

export default function FeatureMatrixPage() {
  return (
    <ComingSoonStub
      icon={Grid}
      title="Feature Matrix"
      description="Define which plan unlocks which feature — the single source of truth for paywall gating across the Android app and admin."
      plannedFeatures={[
        'Grid: rows = features, columns = plans (Free / Basic / Pro / Premium)',
        'Checkbox per cell, quota fields (e.g. 10 posters/month on Basic)',
        'Feature groups: Editor tools, AI tools, Export quality, Frames, Storage',
        'Preview: see plan card as user will see it in the app paywall',
        'Changes trigger entitlement sync to all active devices',
        'Change log: who changed what, when, why',
      ]}
    />
  )
}
