export type CreditTransactionType = 'purchase' | 'usage' | 'referral' | 'subscription' | 'refund' | 'bonus'

export interface CreditTransaction {
  id: number
  user: number
  user_name: string
  transaction_type: CreditTransactionType
  amount: number
  balance_after: number
  description: string
  created_at: string
}
