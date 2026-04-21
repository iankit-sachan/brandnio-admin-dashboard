import { Tag } from 'lucide-react'
import { ComingSoonStub } from './ComingSoonStub'

export default function PromoCodesPage() {
  return (
    <ComingSoonStub
      icon={Tag}
      title="Promo Codes"
      description="Create and manage discount codes for subscription upgrades — percentage off, flat off, first-month free, and more."
      plannedFeatures={[
        'Create codes with percentage or flat-amount discount',
        'Limit by plan (applies to Pro only), quantity cap, expiry date',
        'Single-use vs multi-use, per-user redemption limit',
        'Redemption analytics: code performance + revenue attribution',
        'Bulk generator for campaigns (e.g. 1000 unique codes)',
        'Campaign tagging for UTM-style tracking',
      ]}
    />
  )
}
