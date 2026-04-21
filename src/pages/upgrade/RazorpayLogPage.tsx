import { FileText } from 'lucide-react'
import { ComingSoonStub } from './ComingSoonStub'

export default function RazorpayLogPage() {
  return (
    <ComingSoonStub
      icon={FileText}
      title="Razorpay Log"
      description="Full audit trail of every Razorpay payment attempt — successful captures, failures, webhook events, reconciliation status."
      plannedFeatures={[
        'Filter by user, plan, date range, status (success / failed / pending)',
        'Webhook event stream with retry + replay',
        'Reconciliation against subscription records',
        'Drill-down: payment ID → Razorpay dashboard deep link',
        'Manual sync for stuck / out-of-band payments',
        'Export to CSV for accounting',
      ]}
    />
  )
}
