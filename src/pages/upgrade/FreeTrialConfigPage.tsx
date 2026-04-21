import { Gift } from 'lucide-react'
import { ComingSoonStub } from './ComingSoonStub'

export default function FreeTrialConfigPage() {
  return (
    <ComingSoonStub
      icon={Gift}
      title="Free Trial Config"
      description="Configure which plans offer a free trial, trial duration, required payment method upfront, and auto-convert behavior."
      plannedFeatures={[
        'Toggle free trial per plan tier',
        'Trial length in days (3 / 7 / 14 / 30 / custom)',
        'Require card upfront vs no-card trial',
        'Auto-convert to paid at end vs opt-in to continue',
        'Trial reminder notification config (day N before expiry)',
        'Trial-abuse guard (one trial per user / per device / per email)',
      ]}
    />
  )
}
