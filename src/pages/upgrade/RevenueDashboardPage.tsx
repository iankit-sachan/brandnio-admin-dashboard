import { BarChart3 } from 'lucide-react'
import { ComingSoonStub } from './ComingSoonStub'

export default function RevenueDashboardPage() {
  return (
    <ComingSoonStub
      icon={BarChart3}
      title="Revenue Dashboard"
      description="MRR / ARR trends, active subscribers, churn, top plans by revenue — everything the finance team needs in one view."
      plannedFeatures={[
        'MRR + ARR charts with month-over-month comparisons',
        'Active subscriber count with new vs churn breakdown',
        'Revenue by plan tier (Basic / Pro / Premium)',
        'Revenue by acquisition source (organic / referral / promo)',
        'Refunds and chargebacks timeline',
        'Export to CSV + scheduled email reports',
      ]}
    />
  )
}
