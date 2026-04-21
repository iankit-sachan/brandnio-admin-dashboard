import { PenSquare } from 'lucide-react'
import { ComingSoonStub } from './ComingSoonStub'

export default function RefundManagerPage() {
  return (
    <ComingSoonStub
      icon={PenSquare}
      title="Refund Manager"
      description="Process refund requests end-to-end — review user's reason, trigger Razorpay refund API, auto-revert subscription, notify user."
      plannedFeatures={[
        'Incoming refund request queue (pending / approved / rejected)',
        'One-click Razorpay refund trigger',
        'Full / partial refund with reason dropdown',
        'Auto-revert user\'s active subscription on successful refund',
        'Email + push notification to user on status change',
        'Audit trail: admin who approved, timestamp, linked Razorpay txn ID',
      ]}
    />
  )
}
